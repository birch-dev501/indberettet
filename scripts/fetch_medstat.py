#!/usr/bin/env python3
"""Fetch primary-sector user counts by ATC code and year.

Medstat.dk closed on 5 November 2026. Sundhedsdatastyrelsen now publishes the
same Lægemiddelstatistikregisteret figures as the public Power BI report
"Medicinsalg i primærsektoren" on sundhedsdatabank.dk. This script reads that
report's embed, asks for "Antal brugere" at ATC level 5, and keeps the previous
file if the download fails.
"""

from __future__ import annotations

import json
import re
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
OUT = DATA / "usage" / "persons.json"
STATUS = DATA / "usage" / "status.json"
PAGE = "https://sundhedsdatabank.dk/medicin/medicinsalg-og-udgifter-menu/medicinsalg"
MEDSTAT = "https://medstat.dk/"
EMBED_ORIGIN = "https://appsds.silver.extension.gopublic.dk"
QUERY_URL = (
    "https://wabi-west-europe-g-primary-redirect.analysis.windows.net/explore/querydata?synchronous=true"
)
LEVEL5 = re.compile(r"^[A-Z]\d{2}[A-Z]{2}\d{2}$")
MONTHS = {
    "jan": 1,
    "feb": 2,
    "mar": 3,
    "apr": 4,
    "maj": 5,
    "may": 5,
    "jun": 6,
    "jul": 7,
    "aug": 8,
    "sep": 9,
    "okt": 10,
    "oct": 10,
    "nov": 11,
    "dec": 12,
}


def fetch(url: str, data: bytes | None = None, headers: dict | None = None, timeout: int = 90) -> bytes:
    request = urllib.request.Request(url, data=data, headers=headers or {})
    with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read()


def primary_module_id() -> str:
    html = fetch(PAGE, headers={"User-Agent": "indberettet-usage-fetch"}).decode("utf-8", "replace")
    match = re.search(r'<iframe[^>]*title="([0-9a-f-]{36})"', html)
    if not match:
        raise RuntimeError("Fandt ikke rapporten Medicinsalg i primærsektoren")
    return match.group(1)


def embed(module_id: str) -> dict:
    url = f"{EMBED_ORIGIN}/api/{module_id}/powerbi/config"
    payload = json.loads(
        fetch(
            url,
            headers={
                "Origin": EMBED_ORIGIN,
                "Referer": EMBED_ORIGIN + "/",
                "Accept": "application/json",
                "User-Agent": "indberettet-usage-fetch",
            },
        )
    )
    power = payload.get("powerBI") or {}
    if not power.get("embedToken") or not power.get("reportId"):
        raise RuntimeError("Power BI-konfigurationen manglede token eller rapport-id")
    return power


def needed_codes() -> list[str]:
    products = json.loads((DATA / "products.json").read_text(encoding="utf-8"))
    codes = set()
    for product in products:
        if not product.get("slugs"):
            continue
        code = (product.get("atc") or "").upper().replace(" ", "")[:7]
        if LEVEL5.match(code) and not code.startswith("J07"):
            codes.add(code)
    return sorted(codes)


def literal(value: str) -> dict:
    return {"Literal": {"Value": f"'{value}'"}}


def model_id(power: dict) -> int:
    url = (
        "https://wabi-west-europe-g-primary-redirect.analysis.windows.net/explore/reports/"
        f"{power['reportId']}/conceptualschema?userPreferredLocale=da-DK"
    )
    payload = json.loads(
        fetch(
            url,
            headers={
                "Authorization": f"EmbedToken {power['embedToken']}",
                "Accept": "application/json",
                "Origin": "https://app.powerbi.com",
                "Referer": "https://app.powerbi.com/",
            },
        ).decode("utf-8-sig")
    )
    if not payload.get("modelId"):
        raise RuntimeError("Rapporten havde intet model-id")
    return int(payload["modelId"])


def query(power: dict, select: list, where: list | None = None, count: int = 30000) -> dict:
    command = {
        "SemanticQueryDataShapeCommand": {
            "Query": {
                "Version": 2,
                "From": [
                    {"Name": "d", "Entity": "DimDato", "Type": 0},
                    {"Name": "l", "Entity": "DimLaegemiddel", "Type": 0},
                    {"Name": "m", "Entity": "# Measures", "Type": 0},
                ],
                "Select": select,
            },
            "Binding": {
                "Primary": {"Groupings": [{"Projections": list(range(len(select)))}]},
                "DataReduction": {"DataVolume": 3, "Primary": {"Window": {"Count": count}}},
                "Version": 1,
            },
        }
    }
    if where:
        command["SemanticQueryDataShapeCommand"]["Query"]["Where"] = where
    body = {
        "version": "1.0.0",
        "queries": [
            {
                "Query": {"Commands": [command]},
                "QueryId": "",
                "ApplicationContext": {"DatasetId": "", "Sources": [{"ReportId": power["reportId"]}]},
            }
        ],
        "cancelQueries": [],
        "modelId": power["modelId"],
    }
    raw = fetch(
        QUERY_URL,
        data=json.dumps(body).encode(),
        headers={
            "Authorization": f"EmbedToken {power['embedToken']}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Origin": "https://app.powerbi.com",
            "Referer": "https://app.powerbi.com/",
        },
        timeout=180,
    )
    return json.loads(raw.decode("utf-8-sig"))


def cell_value(value, dictionary: dict | None):
    if isinstance(value, str) and value.endswith("L") and value[:-1].lstrip("-").isdigit():
        return int(value[:-1])
    if isinstance(value, str) and value.startswith("'") and value.endswith("'"):
        return value[1:-1]
    if isinstance(value, int) and dictionary is not None:
        return dictionary[value]
    return value


def decode_rows(result: dict) -> list[dict]:
    data = result["results"][0]["result"]["data"]
    dsr = data.get("dsr") or {}
    frames = dsr.get("DS") or []
    if not frames:
        return []
    frame = frames[0]
    sections = frame.get("PH") or []
    rows = sections[0].get("DM0") if sections else []
    if not rows or "S" not in rows[0]:
        return []
    schema = rows[0]["S"]
    dictionaries = frame.get("ValueDicts") or {}
    decoded = []
    previous = [None] * len(schema)
    for row in rows:
        nulls = row.get("Ø", 0)
        repeat = row.get("R", 0)
        values = list(row.get("C", []))
        cursor = 0
        current = []
        for index in range(len(schema)):
            bit = 1 << index
            if nulls & bit:
                current.append(None)
            elif repeat & bit:
                current.append(previous[index])
            else:
                if cursor >= len(values):
                    raise RuntimeError("Power BI-svaret kunne ikke pakkes ud")
                dictionary = dictionaries.get(schema[index].get("DN"))
                current.append(cell_value(values[cursor], dictionary))
                cursor += 1
        if cursor != len(values):
            raise RuntimeError("Power BI-svaret havde ekstra celler")
        previous = current
        if all(item is None for item in current[: len(schema) - 1]):
            continue
        decoded.append({schema[index]["N"]: current[index] for index in range(len(schema))})
    return decoded


def latest_month(power: dict) -> str:
    select = [{"Measure": {"Expression": {"SourceRef": {"Source": "m"}}, "Property": "ÅrMåned_MaxDato"}, "Name": "Max"}]
    rows = decode_rows(query(power, select, count=5))
    text = str(rows[0].get("M0") if rows else "")
    parts = text.replace("'", "").split()
    if len(parts) != 2 or parts[0][:3].lower() not in MONTHS:
        raise RuntimeError(f"Ukendt slutmåned i registret: {text!r}")
    return f"{int(parts[1]):04d}-{MONTHS[parts[0][:3].lower()]:02d}"


def users_by_atc(power: dict, codes: list[str]) -> dict[str, dict[str, int]]:
    select = [
        {"Column": {"Expression": {"SourceRef": {"Source": "d"}}, "Property": "År"}, "Name": "G0"},
        {"Column": {"Expression": {"SourceRef": {"Source": "l"}}, "Property": "ATC_niveau5_kode"}, "Name": "G1"},
        {"Measure": {"Expression": {"SourceRef": {"Source": "m"}}, "Property": "Antal brugere"}, "Name": "M0"},
    ]
    found: dict[str, dict[str, int]] = {}
    batch = 40
    for start in range(0, len(codes), batch):
        chunk = codes[start : start + batch]
        where = [
            {
                "Condition": {
                    "In": {
                        "Expressions": [
                            {"Column": {"Expression": {"SourceRef": {"Source": "l"}}, "Property": "ATC_niveau5_kode"}}
                        ],
                        "Values": [[literal(code)] for code in chunk],
                    }
                }
            }
        ]
        rows = decode_rows(query(power, select, where, count=20000))
        kept = 0
        for row in rows:
            code = str(row.get("G1") or "")
            year = row.get("G0")
            users = row.get("M0")
            if not LEVEL5.match(code) or not isinstance(year, str) or not isinstance(users, int):
                continue
            if users <= 0:
                continue
            found.setdefault(code, {})[year] = users
            kept += 1
        print(f"  {min(start + batch, len(codes))}/{len(codes)} ATC-koder, {kept} rækker i denne portion", flush=True)
    return found


def write_status(payload: dict) -> None:
    STATUS.parent.mkdir(parents=True, exist_ok=True)
    STATUS.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> int:
    try:
        module_id = primary_module_id()
        power = embed(module_id)
        power["modelId"] = model_id(power)
        codes = needed_codes()
        if not codes:
            raise RuntimeError("Ingen ATC-koder at hente")
        print(f"Henter antal brugere for {len(codes)} ATC-koder …", flush=True)
        period = latest_month(power)
        by_atc = users_by_atc(power, codes)
        document = {
            "ok": True,
            "fetchedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
            "latestMonth": period,
            "sourceName": "Medicinsalg i primærsektoren",
            "sourceUrl": PAGE,
            "medstatUrl": MEDSTAT,
            "register": "Lægemiddelstatistikregisteret, primærsektor",
            "measure": "Antal brugere",
            "moduleId": module_id,
            "reportId": power["reportId"],
            "atcCount": len(by_atc),
            "byAtc": by_atc,
        }
        OUT.parent.mkdir(parents=True, exist_ok=True)
        temporary = OUT.with_suffix(".json.tmp")
        temporary.write_text(json.dumps(document, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
        temporary.replace(OUT)
        write_status(
            {
                "ok": True,
                "fetchedAt": document["fetchedAt"],
                "latestMonth": period,
                "atcCount": len(by_atc),
                "sourceUrl": PAGE,
                "medstatUrl": MEDSTAT,
                "error": None,
            }
        )
        sample = by_atc.get("A10BJ06", {})
        print(f"Færdig. {len(by_atc)} koder, data til {period}. Semaglutid A10BJ06: {sample}", flush=True)
        return 0
    except Exception as exc:  # noqa: BLE001
        kept = OUT.exists()
        write_status(
            {
                "ok": False,
                "fetchedAt": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
                "keptPrevious": kept,
                "sourceUrl": PAGE,
                "medstatUrl": MEDSTAT,
                "error": str(exc),
            }
        )
        print(f"Hentning fejlede, tidligere fil beholdes: {exc}", flush=True)
        return 0


if __name__ == "__main__":
    sys.exit(main())
