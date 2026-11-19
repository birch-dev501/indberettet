#!/usr/bin/env python3
"""Match Lægemiddelstyrelsen news to ingested substances.

The news archive at /da/nyheder/ is a paged HTML list (tab_p, tab_psz) with
title, date, a short lead and a link. This script downloads that list, keeps
only laegemiddelstyrelsen.dk news URLs, and attaches an item to a substance
when the substance name, its Danish spelling, or a distinctive brand appears
as a whole word in the title or lead. Full article text is never stored.

If the archive cannot be read, the previous news/ directory is left in place.
"""

from __future__ import annotations

import json
import os
import re
import shutil
import sys
import time
import traceback
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from html import unescape
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
DATA_INDEX = ROOT / "data" / "index.json"
NEWS = ROOT / "news"
ARCHIVE = "https://laegemiddelstyrelsen.dk/da/nyheder/"
USER_AGENT = "indberettet-news-bot/1.0 (links only; monthly refresh)"
PAGE_SIZE = 100
MAX_PER_SUBSTANCE = 8
EXCERPT_LIMIT = 220

# Tokens that would match unrelated stories. COVID-19 alone is one of them:
# vaccine news is picked up via brand names and the phrases below.
GENERIC = {
    "covid-19",
    "covid",
    "vaccine",
    "vaccines",
    "vaccin",
    "vacciner",
    "human",
    "insulin",
    "tablet",
    "tablets",
    "solution",
    "injection",
    "nos",
    "acid",
    "sodium",
    "forte",
    "comp",
    "oral",
    "nasal",
    "vitamin",
    "water",
    "oil",
    "cream",
    "spray",
    "syrup",
    "drops",
    "flex",
    "flex touch",
    "unknown",
    "other",
    "original",
}

COVID_PHRASES = (
    "covid-19-vaccine",
    "covid-19 vaccine",
    "covid-19-vaccin",
    "covid-19 vaccin",
)

MONTHS = {
    "januar": 1,
    "februar": 2,
    "marts": 3,
    "april": 4,
    "maj": 5,
    "juni": 6,
    "juli": 7,
    "august": 8,
    "september": 9,
    "oktober": 10,
    "november": 11,
    "december": 12,
}

ITEM_RE = re.compile(
    r"<h3><a href='([^']+)'>.*?<span class=\"ellipsis_text\">\s*(.*?)\s*</span>"
    r".*?<span class='date'>(.*?)</span>"
    r".*?<p><span class=\"ellipsis_text\">\s*(.*?)\s*</span>",
    re.S,
)
TAG_RE = re.compile(r"<[^>]+>")
COUNT_RE = re.compile(r"(\d+)\s*-\s*(\d+)\s+af\s+(\d+)\s+nyheder")


class NewsFetchError(Exception):
    pass


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def fetch(url: str) -> str:
    last: Exception | None = None
    for attempt in range(4):
        request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "text/html"})
        try:
            with urlopen(request, timeout=60) as response:
                return response.read().decode("utf-8", "replace")
        except (HTTPError, URLError, TimeoutError, ConnectionError) as exc:
            last = exc
            if isinstance(exc, HTTPError) and exc.code in {400, 403, 404}:
                raise NewsFetchError(f"Nyhedsarkivet svarede {exc.code} på {url}") from exc
            time.sleep(1.2 * (attempt + 1))
    raise NewsFetchError(f"Kunne ikke hente {url}: {last}")


def clean_text(value: str) -> str:
    text = unescape(TAG_RE.sub(" ", value))
    return re.sub(r"\s+", " ", text).strip()


def parse_date(label: str) -> str | None:
    match = re.fullmatch(r"(\d{1,2})\. ([a-zæøå]+) (\d{4})", label.strip().lower())
    if not match:
        return None
    day, month_name, year = match.groups()
    month = MONTHS.get(month_name)
    if not month:
        return None
    return f"{int(year):04d}-{month:02d}-{int(day):02d}"


def shorten(text: str) -> str:
    if len(text) <= EXCERPT_LIMIT:
        return text
    cut = text[: EXCERPT_LIMIT - 1]
    if " " in cut:
        cut = cut.rsplit(" ", 1)[0]
    return cut.rstrip(" ,.;:") + "…"


def parse_page(html: str) -> tuple[list[dict], int]:
    count = COUNT_RE.search(html)
    total = int(count.group(3)) if count else 0
    items = []
    for href, title, date_label, excerpt in ITEM_RE.findall(html):
        url = unescape(href).strip()
        if not url.startswith("https://laegemiddelstyrelsen.dk/") or "/nyheder/" not in url:
            continue
        title_text = clean_text(title)
        excerpt_text = clean_text(excerpt)
        iso = parse_date(clean_text(date_label))
        if not title_text or not iso:
            continue
        if excerpt_text.lower() == title_text.lower():
            excerpt_text = ""
        items.append(
            {
                "title": title_text,
                "date": iso,
                "dateLabel": clean_text(date_label),
                "excerpt": shorten(excerpt_text),
                "url": url,
            }
        )
    return items, total


def whole_word(term: str) -> re.Pattern[str]:
    return re.compile(r"(?<!\w)" + re.escape(term) + r"(?!\w)", re.IGNORECASE)


def alias_keys(raw: str) -> list[str]:
    text = raw.strip()
    if not text:
        return []
    keys = [text]
    folded = text.casefold()
    if " " not in text and "-" not in text:
        if folded.endswith("e") and len(folded) > 6:
            keys.append(text[:-1])
        if folded.endswith("um") and len(folded) > 8:
            keys.append(text[:-2])
    return keys


def substance_aliases(substance: dict) -> list[str]:
    keys: list[str] = []
    for raw in (substance.get("name") or "", substance.get("sourceName") or ""):
        keys.extend(alias_keys(raw))
    if substance.get("slug") == "covid-19-vaccines":
        keys.extend(COVID_PHRASES)
    for brand in substance.get("brands") or []:
        token = str(brand).split()[0].strip()
        if token:
            keys.append(token)
    unique: list[str] = []
    seen = set()
    for key in keys:
        folded = key.casefold()
        compact = re.sub(r"[^0-9a-zæøå]", "", folded)
        if folded in GENERIC or compact in GENERIC or len(compact) < 5:
            continue
        if folded in seen:
            continue
        seen.add(folded)
        unique.append(key)
    return unique


def load_archive() -> list[dict]:
    first_html = fetch(f"{ARCHIVE}?tab_psz={PAGE_SIZE}")
    first_items, total = parse_page(first_html)
    if total < 500 or len(first_items) < 20:
        raise NewsFetchError(
            f"Nyhedslisten ligner ikke det kendte arkiv (siden viste {len(first_items)} af {total})."
        )
    pages = (total + PAGE_SIZE - 1) // PAGE_SIZE
    by_url = {item["url"]: item for item in first_items}

    def load(page: int) -> list[dict]:
        html = fetch(f"{ARCHIVE}?tab_psz={PAGE_SIZE}&tab_p={page}")
        items, _total = parse_page(html)
        return items

    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = [pool.submit(load, page) for page in range(2, pages + 1)]
        for future in as_completed(futures):
            for item in future.result():
                by_url[item["url"]] = item
    if len(by_url) < total * 0.9:
        raise NewsFetchError(
            f"Hentede kun {len(by_url)} af {total} nyheder. Arkivet beholdes uændret."
        )
    return list(by_url.values())


def match(substances: list[dict], articles: list[dict]) -> dict[str, list[dict]]:
    prepared = []
    owner: dict[str, set[str]] = {}
    for substance in substances:
        aliases = substance_aliases(substance)
        prepared.append((substance["slug"], aliases))
        for alias in aliases:
            owner.setdefault(alias.casefold(), set()).add(substance["slug"])
    shared = {alias for alias, slugs in owner.items() if len(slugs) > 1}

    compiled: list[tuple[str, list[re.Pattern[str]]]] = []
    for slug, aliases in prepared:
        patterns = [whole_word(alias) for alias in aliases if alias.casefold() not in shared]
        compiled.append((slug, patterns))

    found: dict[str, list[dict]] = {slug: [] for slug, _patterns in compiled}
    for article in articles:
        haystack = f"{article['title']} {article['excerpt']}"
        for slug, patterns in compiled:
            if any(pattern.search(haystack) for pattern in patterns):
                found[slug].append(article)
    for slug, items in found.items():
        items.sort(key=lambda item: item["date"], reverse=True)
        deduped = []
        seen = set()
        for item in items:
            if item["url"] in seen:
                continue
            seen.add(item["url"])
            deduped.append(item)
            if len(deduped) == MAX_PER_SUBSTANCE:
                break
        found[slug] = deduped
    return found


def publish(matched: dict[str, list[dict]], article_count: int) -> None:
    staging = ROOT / ".news-staging"
    if staging.exists():
        shutil.rmtree(staging)
    items_dir = staging / "items"
    items_dir.mkdir(parents=True)
    with_news = 0
    for slug, items in matched.items():
        if not items:
            continue
        with_news += 1
        (items_dir / f"{slug}.json").write_text(
            json.dumps(items, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
    status = {
        "ok": True,
        "fetchedAt": utc_now(),
        "source": ARCHIVE,
        "articleCount": article_count,
        "substancesWithNews": with_news,
        "maxPerSubstance": MAX_PER_SUBSTANCE,
    }
    (staging / "status.json").write_text(json.dumps(status, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    backup = ROOT / ".news-backup"
    if backup.exists():
        shutil.rmtree(backup)
    if NEWS.exists():
        os.replace(NEWS, backup)
    try:
        os.replace(staging, NEWS)
    except Exception:
        if backup.exists() and not NEWS.exists():
            os.replace(backup, NEWS)
        raise
    if backup.exists():
        shutil.rmtree(backup)
    print(
        f"Nyheder: {article_count} artikler, {with_news} stoffer med mindst én nyhed.",
        flush=True,
    )


def main() -> int:
    if not DATA_INDEX.exists():
        print("FEJL: data/index.json mangler. Kør ingest først.", file=sys.stderr)
        return 1
    substances = json.loads(DATA_INDEX.read_text(encoding="utf-8"))["substances"]
    try:
        articles = load_archive()
        matched = match(substances, articles)
        publish(matched, len(articles))
    except Exception as exc:  # noqa: BLE001
        print(f"NYHEDER BEHOLDT: {exc}", file=sys.stderr)
        if not isinstance(exc, NewsFetchError):
            traceback.print_exc()
        if NEWS.exists():
            print("Sidste gyldige nyheder er beholdt.", file=sys.stderr)
            return 0
        print("Der var ingen tidligere nyheder at falde tilbage på.", file=sys.stderr)
        return 0
    return 0


if __name__ == "__main__":
    sys.exit(main())
