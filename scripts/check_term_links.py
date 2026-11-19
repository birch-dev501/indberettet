#!/usr/bin/env python3
"""Re-check the reviewed reaction links and refresh coverage.

data/term-links.json is the reviewed map (Danish name, URL, source, direct or
search). This script does not add terms. It only updates verified, pageTitle,
checkedAt and coverage. A dead URL is marked unverified so the site falls back
to a search link. If the network is down, the previous file is left as it is.
"""

from __future__ import annotations

import json
import re
import sys
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from html import unescape
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "term-links.json"
SUBSTANCES = ROOT / "data" / "substances"
UA = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
)
ALLOWED_HOSTS = {
    "sundhed.dk",
    "www.sundhed.dk",
    "medlineplus.gov",
    "www.medlineplus.gov",
    "nhs.uk",
    "www.nhs.uk",
}
SOFT_404 = (
    "page not found",
    "siden er ikke blevet fundet",
    "siden blev ikke fundet",
    "ikke fundet",
)


def fetch(url: str) -> tuple[bool, str, str]:
    """Return (ok, page title, reason). Network errors are not treated as 404s."""
    host = urlparse(url).hostname or ""
    if urlparse(url).scheme != "https" or host not in ALLOWED_HOSTS:
        return False, "", f"værten er ikke på listen ({host or 'tom'})"
    request = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html"})
    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            final = urlparse(response.geturl())
            status = response.status
            body = response.read(80000).decode("utf-8", "replace")
    except urllib.error.HTTPError as error:
        if error.code in {404, 410, 400}:
            return False, "", f"HTTP {error.code}"
        raise
    if final.scheme != "https" or (final.hostname or "") not in ALLOWED_HOSTS:
        return False, "", f"viderestilling til {final.hostname or 'ukendt vært'}"
    if status < 200 or status >= 400:
        return False, "", f"HTTP {status}"
    match = re.search(r"<title>(.*?)</title>", body, re.I | re.S)
    title = unescape(re.sub(r"\s+", " ", match.group(1))).strip() if match else ""
    lowered = title.lower()
    if any(phrase in lowered for phrase in SOFT_404):
        return False, title, "siden siger, at den ikke findes"
    if status != 200:
        return False, title, f"HTTP {status}"
    return True, title[:180], ""


def coverage(terms: dict) -> dict:
    direct = {
        name
        for name, row in terms.items()
        if row.get("kind") == "direct" and row.get("verified") and row.get("url")
    }
    occurrences = 0
    direct_occurrences = 0
    for path in SUBSTANCES.glob("*.json"):
        view = json.loads(path.read_text(encoding="utf-8"))["views"]["all"]
        for term in view["terms"]:
            count = int(term["reactions"])
            occurrences += count
            if term["pt"] in direct:
                direct_occurrences += count
    share = round(direct_occurrences / occurrences, 4) if occurrences else 0
    return {
        "reactionOccurrences": occurrences,
        "directOccurrences": direct_occurrences,
        "directShare": share,
        "directTerms": len(direct),
        "mappedTerms": len(terms),
    }


def main() -> int:
    if not OUT.exists():
        print(f"Mangler {OUT}", file=sys.stderr)
        return 1
    try:
        document = json.loads(OUT.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        print(f"term-links.json kan ikke læses: {error}", file=sys.stderr)
        return 1

    targets: list[tuple[str, dict]] = [("search", document["search"])]
    targets.extend(("terms", row) for row in document["terms"].values())
    targets.extend(("socs", row) for row in document["socs"].values())
    unique_urls = sorted({row["url"] for _, row in targets if row.get("url")})
    results: dict[str, tuple[bool, str, str] | Exception] = {}

    def one(url: str):
        try:
            return url, fetch(url)
        except Exception as error:  # noqa: BLE001 - network failure must not wipe the file
            return url, error

    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = [pool.submit(one, url) for url in unique_urls]
        for future in as_completed(futures):
            url, result = future.result()
            results[url] = result

    successes = sum(1 for result in results.values() if not isinstance(result, Exception) and result[0])
    network_errors = sum(1 for result in results.values() if isinstance(result, Exception))
    if unique_urls and successes == 0:
        print(
            f"Ingen links svarede ({network_errors} netværksfejl). Beholder den forrige fil.",
            file=sys.stderr,
        )
        return 0

    broken: list[str] = []
    for url, result in results.items():
        if isinstance(result, Exception):
            print(f"beholdt (netværk) {url}: {result}", file=sys.stderr)
            continue
        ok, title, reason = result
        for row in (entry for _, entry in targets if entry.get("url") == url):
            if ok:
                row["verified"] = True
                if title:
                    row["pageTitle"] = title
            else:
                row["verified"] = False
                broken.append(f"{reason}: {url}")

    document["checkedAt"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    counts = coverage(document["terms"])
    soc_direct = sum(
        1 for row in document["socs"].values() if row.get("kind") == "direct" and row.get("verified")
    )
    document["coverage"] = {
        **counts,
        "socWithDirectLink": soc_direct,
        "socCount": len(document["socs"]),
    }
    OUT.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    share = counts["directShare"] * 100
    print(
        f"Tjekkede {len(unique_urls)} adresser. "
        f"{counts['directTerms']} termer har et direkte link "
        f"({counts['directOccurrences']} af {counts['reactionOccurrences']} reaktioner, {share:.1f} %). "
        f"{soc_direct} af {len(document['socs'])} organklasser har et direkte link."
    )
    for line in broken:
        print(f"afvist {line}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
