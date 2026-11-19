#!/usr/bin/env python3
"""Sammenlign et nyt udtræk med det forrige. Stop ved store afvigelser."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REQUIRED = {"slug", "name", "reports", "seriousReports", "fatalReports", "dataExtractionDate"}


def fail(message: str) -> None:
    print(f"FEJL: {message}", file=sys.stderr)
    raise SystemExit(1)


def load(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as error:
        fail(f"{path} er ikke gyldig JSON: {error}")
    return {}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--before", type=Path, help="Tidligere data/index.json")
    parser.add_argument("--simulate-drop", action="store_true", help="Efterlign et udtræk der er blevet for lille")
    args = parser.parse_args()
    if args.simulate_drop:
        fail("Simuleret afvigelse: et stof mister mere end 20 procent af indberetningerne.")

    current = load(ROOT / "data" / "index.json")
    substances = current.get("substances") or []
    if not substances:
        fail("index.json har ingen stoffer.")
    for item in substances:
        missing = REQUIRED - set(item)
        if missing:
            fail(f"{item.get('slug', '?')} mangler felter: {', '.join(sorted(missing))}")
        sample = ROOT / "data" / "substances" / f"{item['slug']}.json"
        if not sample.exists():
            fail(f"ZIP-resultat mangler for {item['slug']}")
            continue
        document = load(sample)
        columns = set((document.get("views") or {}).get("all") or {})
        if not {"reports", "terms", "sex"} <= columns:
            fail(f"{item['slug']} har ikke de ventede kolonner i views.all")

    if args.before:
        previous = {item["slug"]: int(item["reports"]) for item in load(args.before).get("substances") or []}
        for item in substances:
            before = previous.get(item["slug"])
            if before is None or before < 50:
                continue
            after = int(item["reports"])
            if after < before * 0.8:
                fail(f"{item['slug']} faldt fra {before} til {after} indberetninger")
    print(f"Udtrækket hænger sammen ({len(substances)} stoffer).")


if __name__ == "__main__":
    main()
