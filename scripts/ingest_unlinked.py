#!/usr/bin/env python3
"""Ingest DKMA overviews that the substance-name match missed.

Approved products often have no active-substance name (vaccines and some
biologics). This pass reads summary.csv for every overview not ingested yet
and links a product only when its brand is unambiguous. A brand that already
belongs to an ingested overview stays there. Download failures are skipped.
"""

from __future__ import annotations

import hashlib
import json
import sys
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from ingest import (
    DATA,
    GENERIC_BRAND_TOKENS,
    fetch,
    load_localisation,
    read_zip_tables,
    slugify,
    source_page,
    validate_and_aggregate,
    zip_url_for,
)
from overview_match import brand_tokens, match_products

ROOT = Path(__file__).resolve().parents[1]
CACHE = Path("/tmp/dkma-overview-zips")


def summary_names(blob: bytes, substance_id: str) -> list[str]:
    import csv
    import io
    import zipfile

    archive = zipfile.ZipFile(io.BytesIO(blob))
    filename = f"{substance_id}_summary.csv"
    if filename not in archive.namelist():
        raise ValueError(f"mangler {filename}")
    text = archive.read(filename).decode("utf-8-sig")
    rows = list(csv.DictReader(io.StringIO(text)))
    if not rows or "PBG" not in rows[0]:
        raise ValueError("summary.csv har ikke kolonnen PBG")
    names: list[str] = []
    for row in rows:
        for part in (row.get("PBG") or "").split(","):
            part = part.strip()
            if part:
                names.append(part)
    return names


def load_known_overviews(data_dir: Path = DATA) -> tuple[dict[str, set[str]], dict[str, str]]:
    tokens: dict[str, set[str]] = {}
    slug_to_id: dict[str, str] = {}
    for path in (data_dir / "substances").glob("*.json"):
        document = json.loads(path.read_text(encoding="utf-8"))
        product_names = document.get("productNames") or {}
        names = [*(product_names.get("single") or []), *(product_names.get("multi") or [])]
        tokens[document["id"]] = brand_tokens(names)
        slug_to_id[document["slug"]] = document["id"]
        slug_to_id[document["id"]] = document["id"]
    return tokens, slug_to_id


def download_overviews(items: list[dict]) -> tuple[dict[str, bytes], list[str]]:
    CACHE.mkdir(parents=True, exist_ok=True)
    blobs: dict[str, bytes] = {}
    failed: list[str] = []

    def load(item: dict) -> tuple[str, bytes | str]:
        substance_id = item["id"]
        cached = CACHE / f"{substance_id}.zip"
        if cached.exists() and cached.stat().st_size > 200:
            blob = cached.read_bytes()
            if blob.startswith(b"PK"):
                return substance_id, blob
        try:
            blob = fetch(item.get("zipUrl") or zip_url_for(substance_id), timeout=180)
        except Exception as exc:  # noqa: BLE001
            return substance_id, str(exc)
        if blob.startswith(b"PK"):
            cached.write_bytes(blob)
            return substance_id, blob
        return substance_id, "ikke en ZIP"

    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = [pool.submit(load, item) for item in items]
        done = 0
        for future in as_completed(futures):
            done += 1
            substance_id, payload = future.result()
            if isinstance(payload, bytes):
                blobs[substance_id] = payload
            else:
                failed.append(substance_id)
            if done % 50 == 0 or done == len(items):
                print(f"  {done}/{len(items)} ZIP-filer set", flush=True)
    return blobs, failed


def main() -> int:
    catalog = json.loads((DATA / "catalog.json").read_text(encoding="utf-8"))["substances"]
    index = json.loads((DATA / "index.json").read_text(encoding="utf-8"))
    products = json.loads((DATA / "products.json").read_text(encoding="utf-8"))
    have = {item["id"] for item in index["substances"]}
    missing = [item for item in catalog if item.get("id") not in have]
    before = len(have)
    print(f"Indeks {len(catalog)}, allerede hentet {before}, mangler {len(missing)}", flush=True)

    known_tokens, slug_to_id = load_known_overviews()
    blobs, failed = download_overviews(missing)
    names_by_id: dict[str, list[str]] = {}
    tokens: dict[str, set[str]] = {}
    for substance_id, blob in blobs.items():
        try:
            names = summary_names(blob, substance_id)
        except Exception:
            failed.append(substance_id)
            continue
        names_by_id[substance_id] = names
        tokens[substance_id] = brand_tokens(names)

    links, matched_ids = match_products(tokens, products, known_tokens, slug_to_id)
    print(
        f"Entydige nye oversigter: {len(matched_ids)}. "
        f"Produktlinks i alt: {sum(len(ids) for ids in links.values())}. "
        f"Downloadfejl: {len(set(failed))}.",
        flush=True,
    )

    phrases = load_localisation()["phrases"]
    catalog_by_id = {item["id"]: item for item in catalog}
    id_to_slug = {item["id"]: item["slug"] for item in index["substances"]}
    used_slugs = set(id_to_slug.values())
    added = []
    for substance_id in sorted(matched_ids, key=lambda item: catalog_by_id[item]["name"].lower()):
        item = catalog_by_id[substance_id]
        try:
            tables = read_zip_tables(blobs[substance_id], substance_id)
            aggregate = validate_and_aggregate(tables, phrases)
        except Exception as exc:  # noqa: BLE001
            print(f"  springer {item['name']} over: {exc}", flush=True)
            continue
        slug = slugify(item["name"])
        if slug in used_slugs:
            slug = f"{slug}-{substance_id[-8:]}"
        used_slugs.add(slug)
        id_to_slug[substance_id] = slug
        brands = [brand for brand in aggregate["brands"] if brand.casefold() not in GENERIC_BRAND_TOKENS]
        document = {
            "slug": slug,
            "id": substance_id,
            "name": item["name"],
            "sourceName": aggregate["sourceName"],
            "showcase": False,
            "zipPath": item.get("zipPath") or f"./DK_EXTERNAL/NONCOMBINED/{substance_id}.zip",
            "zipUrl": item.get("zipUrl") or zip_url_for(substance_id),
            "sourcePage": source_page(substance_id),
            "zipSha256": hashlib.sha256(blobs[substance_id]).hexdigest(),
            "dataExtractionDate": aggregate["dataExtractionDate"],
            "meddraVersion": aggregate["meddraVersion"],
            "reportType": aggregate["reportType"],
            "country": aggregate["country"],
            "extractVersion": aggregate["extractVersion"],
            "views": aggregate["views"],
            "productNames": aggregate["productNames"],
            "brands": brands,
            "approvedProductCount": 0,
        }
        (DATA / "substances" / f"{slug}.json").write_text(
            json.dumps(document, ensure_ascii=False, separators=(",", ":")),
            encoding="utf-8",
        )
        all_view = aggregate["views"]["all"]
        index["substances"].append(
            {
                "slug": slug,
                "id": substance_id,
                "name": item["name"],
                "sourceName": aggregate["sourceName"],
                "showcase": False,
                "stale": False,
                "reports": all_view["reports"],
                "reactions": all_view["reactions"],
                "seriousReports": aggregate["views"]["S"]["reports"],
                "fatalReports": aggregate["views"]["F"]["reports"],
                "dataExtractionDate": aggregate["dataExtractionDate"],
                "topTerm": all_view["terms"][0]["pt"] if all_view["terms"] else None,
                "brands": brands[:8],
                "approvedProductCount": 0,
            }
        )
        added.append((item["name"], slug, all_view["reports"], aggregate["views"]["F"]["reports"], brands[:8]))

    drug_to_overview = {
        drug_id: overview_id for overview_id, drug_ids in links.items() for drug_id in drug_ids
    }
    for product in products:
        overview_id = drug_to_overview.get(product["drugId"])
        slug = id_to_slug.get(overview_id or "")
        if slug:
            product["slugs"] = [slug]
            product["status"] = "covered"

    counts: Counter[str] = Counter()
    for product in products:
        for slug in set(product.get("slugs") or []):
            counts[slug] += 1
    for item in index["substances"]:
        item["approvedProductCount"] = counts.get(item["slug"], 0)
    for path in (DATA / "substances").glob("*.json"):
        document = json.loads(path.read_text(encoding="utf-8"))
        count = counts.get(document["slug"], 0)
        if document.get("approvedProductCount") != count:
            document["approvedProductCount"] = count
            path.write_text(json.dumps(document, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    index["substances"].sort(key=lambda row: (not row["showcase"], row["name"].lower()))
    (DATA / "index.json").write_text(json.dumps(index, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    (DATA / "products.json").write_text(json.dumps(products, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    status = json.loads((DATA / "status.json").read_text(encoding="utf-8"))
    status["succeeded"] = len(index["substances"])
    status["products"] = {
        "rows": len(products),
        "covered": sum(1 for product in products if product["status"] == "covered"),
        "partial": sum(1 for product in products if product["status"] == "partial"),
        "uncovered": sum(1 for product in products if product["status"] == "uncovered"),
    }
    status["overviewBrandPass"] = {
        "catalog": len(catalog),
        "ingestedBefore": before,
        "ingestedAfter": len(index["substances"]),
        "examined": len(missing),
        "downloaded": len(blobs),
        "added": len(added),
        "downloadFailures": len(set(failed)),
    }
    (DATA / "status.json").write_text(json.dumps(status, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"TILFØJET {len(added)}. Indeks nu {len(index['substances'])}.")
    for name, slug, reports, fatal, brands in added:
        print(f"  {reports:6}  {fatal:4} dødsfald  {name}  [{slug}]  {', '.join(brands)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
