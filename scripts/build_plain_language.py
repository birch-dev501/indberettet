#!/usr/bin/env python3
"""Fill plain-Danish labels for every ingested substance.

Brands come from the approved-medicines list. The class name and the use line
come from the official ATC group name in data/atc-everyday.json. Nothing here
is an approved indication. Fields with needsReview false are left as a person
wrote them.
"""

from __future__ import annotations

import json
import re
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
OUT = DATA / "plain-language.json"
GENERIC = {
    "solution",
    "suspension",
    "tablet",
    "tablets",
    "injection",
    "infusion",
    "cream",
    "ointment",
    "vaccine",
    "vaccines",
    "human",
    "nos",
    "forte",
    "comp",
    "original",
    "hard",
    "soft",
}


def norm(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.casefold())


def brand_token(name: str) -> str:
    name = name.strip()
    quoted = re.search(r'"([^"]+)"', name)
    if quoted and len(quoted.group(1)) >= 3:
        return quoted.group(1).strip()
    return name.split()[0].strip(" .,;") if name.split() else ""


def keep_brand(token: str) -> bool:
    folded = token.casefold()
    return len(token) >= 3 and folded not in GENERIC and not token.isdigit()


def longest_group(code: str, groups: list[dict]) -> dict | None:
    code = code.upper()
    best = None
    for group in groups:
        prefix = group["atc"].upper()
        if code.startswith(prefix) and (best is None or len(prefix) > len(best["atc"])):
            best = group
    return best


def field(value: str, source: str, needs_review: bool = True) -> dict:
    return {"value": value, "source": source, "needsReview": needs_review}


def locked(existing: dict | None) -> dict | None:
    if not existing:
        return None
    if existing.get("needsReview") is False and str(existing.get("value") or "").strip():
        return existing
    return None


def main() -> int:
    index = json.loads((DATA / "index.json").read_text(encoding="utf-8"))["substances"]
    products = json.loads((DATA / "products.json").read_text(encoding="utf-8"))
    groups = json.loads((DATA / "atc-everyday.json").read_text(encoding="utf-8"))["groups"]
    usage_path = DATA / "usage" / "persons.json"
    usage = json.loads(usage_path.read_text(encoding="utf-8")) if usage_path.exists() else {"byAtc": {}}
    previous = {}
    if OUT.exists():
        previous = json.loads(OUT.read_text(encoding="utf-8")).get("substances") or {}

    by_slug_products: dict[str, list] = defaultdict(list)
    for product in products:
        for slug in product.get("slugs") or []:
            by_slug_products[slug].append(product)

    substances = {}
    specific = anatomical = 0
    for item in index:
        slug = item["slug"]
        old = previous.get(slug) or {}
        rows = by_slug_products.get(slug, [])
        counts: Counter[str] = Counter()
        atcs = []
        for product in rows:
            token = brand_token(product.get("name") or "")
            if keep_brand(token):
                counts[token] += 1
            code = (product.get("atc") or "").upper().replace(" ", "")
            if code:
                atcs.append(code)
        zip_brands = {norm(brand) for brand in item.get("brands") or []}
        ranked = sorted(counts, key=lambda token: (norm(token) not in zip_brands, -counts[token], token.casefold()))
        brands = ranked[:4]
        brand_source = (
            "Liste over godkendte lægemidler. Handelsnavne, der også står i bivirkningsoversigten, står først. "
            "Derefter flest præparatrækker. Medstat opgør købende personer pr. ATC-kode, ikke pr. handelsnavn."
        )
        level5 = {code[:7] for code in atcs if re.fullmatch(r"[A-Z]\d{2}[A-Z]{2}\d{2}", code[:7] or "")}
        if len(level5) == 1:
            code = next(iter(level5))
            users = (usage.get("byAtc") or {}).get(code) or {}
            latest = users.get("2025") or users.get("2024")
            if latest:
                brand_source += f" ATC {code} havde {latest} købende personer i det seneste hele år i primærsektoren."
        group = None
        for code in sorted(atcs, key=len, reverse=True):
            group = longest_group(code, groups)
            if group:
                break
        if group is None:
            everyday = "lægemiddel uden ATC-gruppe i den godkendte liste"
            official = ""
            atc = ""
            specific_match = False
        else:
            everyday = group["everyday"]
            official = group["officialName"]
            atc = group["atc"]
            specific_match = len(atc) > 1
        if specific_match:
            specific += 1
        else:
            anatomical += 1
        use_value = (
            f"Hører til gruppen {everyday}. "
            + (f"Det officielle ATC-navn er {official} ({atc}). " if official else "")
            + "Gruppenavnet er ikke en godkendt indikation for det enkelte præparat."
        )
        use_source = f"ATC-gruppenavn {atc}" if atc else "Ingen ATC-kode på de tilknyttede præparater"
        substances[slug] = {
            "needsReview": True,
            "brands": locked((old.get("brands") or {})) or field(", ".join(brands), brand_source),
            "className": locked((old.get("className") or {})) or field(everyday, use_source),
            "use": locked((old.get("use") or {})) or field(use_value, use_source),
            "indication": locked((old.get("indication") or {}))
            or field("", "Ikke udfyldt. Godkendt indikation skal hentes fra produktresume eller EMA og må ikke opfindes."),
        }
        if all(not substances[slug][key]["needsReview"] for key in ("brands", "className", "use", "indication")):
            substances[slug]["needsReview"] = False

    document = {
        "note": "Ret teksten her. Et felt med needsReview false bliver stående, når scriptet køres igen. Tom indication betyder, at der ikke er indsat en godkendt indikation.",
        "generatedBy": "scripts/build_plain_language.py",
        "substances": substances,
    }
    OUT.write_text(json.dumps(document, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"{len(substances)} stoffer. Specifik ATC-gruppe: {specific}. Kun hovedgruppe eller ingen ATC: {anatomical}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
