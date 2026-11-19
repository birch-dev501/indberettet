#!/usr/bin/env python3
"""Refresh cached Violation Tracker parent pages.

The live site often answers with a bot check. If a page cannot be read, the
previous data/violations.json is left unchanged and this script exits 0.
"""

from __future__ import annotations

import json
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from html import unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "violations.json"
UA = "Mozilla/5.0 (compatible; indberettet-research; +https://github.com/birch-dev501/indberettet)"
# Violation Tracker parent slug -> firm slug on this site.
PARENTS = {
    "pfizer": "pfizer",
    "novo-holdings-as": "novo-nordisk",
    "eli-lilly": "eli-lilly",
    "merck": "msd",
    "merck-kgaa-emd": "merck",
    "astrazeneca": "astrazeneca",
    "gsk-plc": "glaxosmithkline",
    "sanofi": "sanofi",
    "novartis": "novartis",
    "johnson-and-johnson": "janssen-cilag",
    "teva-pharmaceutical-industries": "teva",
}


def fetch(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html"})
    with urllib.request.urlopen(request, timeout=30) as response:
        body = response.read(2_500_000).decode("utf-8", "replace")
        if response.status != 200 or "Just a moment" in body or "Penalty total since 2000" not in body:
            raise RuntimeError(f"ikke en forældreside ({response.status})")
        return body


def money(value: str) -> int:
    return int(re.sub(r"[^0-9]", "", value) or "0")


def text_of(fragment: str) -> str:
    cleaned = re.sub(r"<[^>]+>", " ", fragment)
    return unescape(re.sub(r"\s+", " ", cleaned)).strip()


def cases_from(html: str, limit: int) -> list[dict]:
    rows = []
    for row in re.findall(r"<tr>\s*<td>(.*?)</tr>", html, re.S):
        cells = re.findall(r"<td[^>]*>(.*?)</td>", "<td>" + row, re.S)
        if len(cells) < 5:
            continue
        link = re.search(
            r'href="(//violationtracker\.goodjobsfirst\.org/violation-tracker/[^"]+)"',
            cells[4],
        ) or re.search(
            r'href="(//violationtracker\.goodjobsfirst\.org/violation-tracker/[^"]+)"',
            cells[0],
        )
        amount = re.search(r"\$\s*(?:<[^>]+>\s*)?([0-9,]+)", cells[4])
        year = re.search(r"\b(19|20)\d{2}\b", text_of(cells[2]))
        if not link or not amount or not year:
            continue
        href = "https:" + link.group(1)
        duplicate = "*" in text_of(cells[4])
        item = {
            "company": text_of(cells[0]),
            "offense": text_of(cells[1]),
            "year": int(year.group(0)),
            "agency": text_of(cells[3]),
            "amountUsd": money(amount.group(1)),
            "url": href,
        }
        if duplicate:
            item["duplicate"] = True
        rows.append(item)
        if len(rows) >= limit:
            break
    return rows


def parse(html: str, url: str) -> dict | None:
    total = re.search(r"Penalty total since 2000.{0,240}?\$([0-9,]+)", html, re.S)
    count = re.search(r"Number of records.{0,80}?([0-9,]+)", html, re.S)
    name = re.search(r"Current Parent Company Name.{0,160}?>([^<]+)", html, re.S)
    if not total or not count:
        return None
    offenses = []
    primary = html.split("Top 5 Primary Offense Types", 1)
    offense_html = primary[1] if len(primary) > 1 else ""
    for offense, amount, records in re.findall(
        r"<td>([^<]{6,160})</td>\s*<td[^>]*>\s*\$([0-9,]+)</td>\s*<td[^>]*>\s*([0-9,]+)",
        offense_html,
    ):
        offenses.append({"type": unescape(offense.strip()), "totalUsd": money(amount), "count": money(records)})
        if len(offenses) == 5:
            break
    largest = [row for row in cases_from(html, 12) if not row.get("duplicate")][:8]
    if not largest:
        return None
    return {
        "parentName": re.sub(r"^[\s:]+", "", unescape(name.group(1))).strip() if name else url.rsplit("/", 1)[-1],
        "parentUrl": url.split("?", 1)[0],
        "penaltyTotalUsd": money(total.group(1)),
        "recordCount": money(count.group(1)),
        "topOffenseTypes": offenses,
        "largest": largest,
    }


def main() -> int:
    if not OUT.exists():
        print("Mangler data/violations.json", file=sys.stderr)
        return 0
    try:
        document = json.loads(OUT.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        print(f"Beholder filen. Kan ikke læses: {error}", file=sys.stderr)
        return 0
    updated = 0
    for parent, firm in PARENTS.items():
        url = f"https://violationtracker.goodjobsfirst.org/parent/{parent}"
        try:
            parsed = parse(fetch(url), url)
            time.sleep(0.6)
            try:
                recent_html = fetch(f"https://violationtracker.goodjobsfirst.org/?parent={parent}&order=pen_year&sort=desc")
                recent = [row for row in cases_from(recent_html, 8) if not row.get("duplicate")][:5]
                if parsed and recent:
                    parsed["recent"] = recent
            except (urllib.error.URLError, TimeoutError, RuntimeError, OSError):
                pass
        except (urllib.error.URLError, TimeoutError, RuntimeError, OSError) as error:
            print(f"beholdt {firm}: {error}", file=sys.stderr)
            time.sleep(0.6)
            continue
        if not parsed or not parsed.get("largest"):
            print(f"beholdt {firm}: siden kunne ikke læses", file=sys.stderr)
            continue
        document.setdefault("firms", {})[firm] = parsed
        updated += 1
        time.sleep(0.6)
    if updated:
        document["fetchedAt"] = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        OUT.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Opdaterede {updated} af {len(PARENTS)} moderselskaber. Resten beholdt den gemte fil.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
