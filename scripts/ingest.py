#!/usr/bin/env python3
"""Download and clean Lægemiddelstyrelsen interactive ADR overviews.

The pipeline:

1. Download the official list of approved medicines (Liste over godkendte
   lægemidler).
2. Scrape the interactive-overview index (substance name → ZIP path).
3. Map every active substance on the product list to an overview ZIP.
4. Always include the two showcase substances, even if a name match fails.
5. Download each ZIP, validate the CSV schema, and write a cleaned dataset.
6. Publish only after the showcase files validate. A global failure leaves the
   previous data directory in place. An individual substance failure keeps
   that substance's last good file when one exists.

Manual run:  python scripts/ingest.py
Match only:  python scripts/ingest.py --dry-run
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import html
import io
import json
import os
import re
import shutil
import sys
import time
import traceback
import zipfile
from collections import Counter, defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from decimal import Decimal
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
LIST_URL = (
    "https://laegemiddelstyrelsen.dk/LinkArchive.ashx"
    "?id=0BD4960F0D7744E3BABC951431681ECC&lang=da"
)
INDEX_URL = (
    "https://laegemiddelstyrelsen.dk/bivirkninger/"
    "bivirkninger-ved-medicin/interaktive-bivirkningsoversigter/.aspx"
)
DAP_BASE = "https://laegemiddelstyrelsen.dk/upload/dap/"
LOC_URL = DAP_BASE + "DKMA_dap_localization.json"
USER_AGENT = "indberettet-data-bot/1.0 (open ADR explainer; monthly refresh)"
NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"

SHOWCASES = [
    {
        "id": "DK_NON_63f396b8-bc22-eb11-a951-0050569f2779",
        "fallback_name": "Semaglutide",
    },
    {
        "id": "DK_NON_b4f3563a-46af-f011-a98b-0050569f2779",
        "fallback_name": "COVID-19 Vaccines",
    },
]

# Overviews whose active-substance name never appears on the approved-product list.
# Include them when a marketed product name and ATC code identify the group.
GROUP_OVERVIEWS = [
    {
        "name": "Influenza Vaccines",
        "atc_prefixes": ("J07BB",),
        "name_prefixes": (
            "agrippal",
            "efluelda",
            "fluad",
            "fluarix",
            "flucelvax",
            "fluenz",
            "fluvirin",
            "fluzone",
            "inflexal",
            "influvac",
            "pandemrix",
            "vaxigrip",
        ),
    }
]
GENERIC_BRAND_TOKENS = {
    "pre-filled",
    "syringe",
    "suspension",
    "injection",
    "solution",
    "vaccine",
    "vaccines",
    "nasal",
    "tetra",
    "nos",
    "original",
    "influenza",
}

CASE_HEADER = [
    "ADR",
    "SEX",
    "AGE_10",
    "RECVD_YEAR",
    "CONSUMER_YN",
    "HCP_YN",
    "NONSERIOUS_SERIOUS_FATAL_NSF",
]
DRUG_HEADER = ["ADR", "SEQ", "ROUTE", "MULTICONST", "NONSERIOUS_SERIOUS_FATAL_NSF"]
EVENT_HEADER = ["ADR", "SEQ", "PT", "HLT", "HLGT", "SOC_ABBREV", "FATAL_YN"]
SUMMARY_HEADER = ["MULTI_CONSTITUENT_YN", "PBG"]
INFO_KEYS = [
    "DRUG_NAME",
    "DATA_EXTRACT_VERSION",
    "DATA_EXTRACTION_DATE",
    "MEDDRA_VERSION",
    "REPORT_TYPE",
    "COUNTRY",
]
SEX_VALUES = {"Male", "Female", "Unknown"}
NSF_VALUES = {"N", "S", "F"}
YN_VALUES = {"Y", "N"}
KNOWN_SOCS = {
    "Blood",
    "Card",
    "Cong",
    "Ear",
    "Endo",
    "Eye",
    "Gastr",
    "Genrl",
    "Hepat",
    "Immun",
    "Infec",
    "Inj&P",
    "Inv",
    "Metab",
    "Musc",
    "Neopl",
    "Nerv",
    "Preg",
    "Prod",
    "Psych",
    "Renal",
    "Repro",
    "Resp",
    "Skin",
    "SocCi",
    "Surg",
    "Vasc",
}

# Longest first. Applied to a normalised alphanumeric stem.
SALT_SUFFIXES = [
    "dihydrochlorid",
    "hydrochlorid",
    "hydroklorid",
    "hydrochloride",
    "hydrogensulfat",
    "hydrogensulfate",
    "hemipentahydrat",
    "anhydrat",
    "anhydrate",
    "propylenglycolat",
    "propylenglycolate",
    "hydrobromid",
    "hemisulfat",
    "sulfat",
    "sulphate",
    "sulfate",
    "hemihydrat",
    "monohydrat",
    "dihydrat",
    "trihydrat",
    "sesquihydrat",
    "hydrat",
    "hemihydrate",
    "monohydrate",
    "dihydrate",
    "trihydrate",
    "hydrate",
    "natrium",
    "kalium",
    "calcium",
    "magnesium",
    "sodium",
    "potassium",
    "mesilat",
    "mesylat",
    "mesylate",
    "besylat",
    "besilat",
    "besylate",
    "maleat",
    "maleate",
    "fumarat",
    "fumarate",
    "tartrat",
    "tartrate",
    "acetat",
    "acetate",
    "citrat",
    "citrate",
    "phosphat",
    "fosfat",
    "phosphate",
    "bromid",
    "bromide",
    "chlorid",
    "klorid",
    "chloride",
    "nitrat",
    "nitrate",
    "succinat",
    "succinate",
    "benzoat",
    "benzoate",
    "lactat",
    "laktat",
    "lactate",
    "valerat",
    "propionat",
    "decanoat",
    "enantat",
    "palmitat",
    "stearat",
    "tosylat",
    "esylat",
    "edisylat",
    "gluconat",
    "orotat",
    "oxalat",
    "carbonat",
    "carbonate",
    "bicarbonat",
    "bicarbonate",
    "esilat",
    "esilate",
    "hyclat",
    "hyclate",
    "butyrat",
    "butyrate",
    "dinatrium",
    "hydroxid",
    "acetonid",
    "dipropionat",
    "hexahydrat",
    "pentahydrat",
    "tetrahydrat",
    "dimesilat",
    "dimesylate",
    "xinafoat",
    "xinafoate",
    "etexilat",
    "etexilate",
    "olamin",
    "olamine",
    "furoat",
    "furoate",
    "tosilat",
    "tosilate",
    "hydrogentartrat",
    "hydrogentartrate",
    "propandiolmonohydrat",
    "propandiol",
    "hcl",
]

# Qualifiers and excipients that are not themselves an ADR overview.
QUALIFIER_TOKENS = {
    "vandfrit",
    "vandfri",
    "renset",
    "soyaolie",
    "sojaolie",
    "vandig",
}

# Names that do not share a stem with the overview, checked only if the
# target key exists in the catalogue. Never used to invent a substance.
EXPLICIT_SYNONYMS = {
    "mycophenolatmofetil": "mycophenolicacid",
    "menotropin": "menotrophin",
    "pankreaspulver": "pancreatin",
    "olivenolierenset": "oliveoil",
    "triglyceridermiddelkaedelaengde": "triglycerides",
}


class IngestError(Exception):
    """A failure that should be reported for one substance or the whole run."""


class SchemaError(IngestError):
    """The ZIP does not match the documented CSV contract."""


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def fetch(url: str, data: bytes | None = None, timeout: int = 90, retries: int = 4) -> bytes:
    last: Exception | None = None
    for attempt in range(retries):
        req = Request(
            url,
            data=data,
            method="POST" if data is not None else "GET",
            headers={
                "User-Agent": USER_AGENT,
                "Accept": "*/*",
            },
        )
        try:
            with urlopen(req, timeout=timeout) as response:
                return response.read()
        except (HTTPError, URLError, TimeoutError, ConnectionError) as exc:
            last = exc
            if isinstance(exc, HTTPError) and exc.code in {400, 401, 403, 404}:
                raise
            time.sleep(1.5 * (attempt + 1))
    raise IngestError(f"Kunne ikke hente {url}: {last}")


def ba(value: str) -> str:
    """Reproduce the DAP viewer's localisation-key encoder."""
    replaced = []
    for char in value:
        allowed = (
            ("A" <= char <= "Z")
            or ("a" <= char <= "z")
            or ("0" <= char <= "9")
            or char in "_-,^"
        )
        replaced.append(char if allowed and not char.isspace() else "_")
    encoded = []
    for original, swapped in zip(value, replaced):
        if original != swapped:
            encoded.append(f"_{ord(original)}_")
        else:
            encoded.append(original)
    return "".join(encoded)


def fold(value: str) -> str:
    return value.lower().replace("æ", "ae").replace("ø", "oe").replace("å", "aa")


def norm(value: str) -> str:
    """Alphanumeric key that keeps text inside parentheses (isotopes, variants)."""
    return re.sub(r"[^a-z0-9]+", "", fold(value))


def norm_without_parens(value: str) -> str:
    return norm(re.sub(r"\([^)]*\)", " ", value))


ION_STEMS = {
    "chlorid",
    "chloride",
    "hydroxid",
    "hydroxide",
    "carbonat",
    "carbonate",
    "hydrogencarbonat",
    "bicarbonat",
    "bicarbonate",
    "acetat",
    "acetate",
    "lactat",
    "lactate",
    "fluorid",
    "fluoride",
    "iodid",
    "iodide",
    "sulfat",
    "sulfate",
    "phosphat",
    "phosphate",
    "citrat",
    "citrate",
}


def salt_stems(stem: str) -> set[str]:
    """Every way of peeling known salt suffixes, longest or shorter."""
    seen = {stem}
    queue = [stem]
    while queue:
        current = queue.pop()
        for salt in SALT_SUFFIXES:
            if current.endswith(salt) and len(current) > len(salt) + 3:
                nxt = current[: -len(salt)]
                if nxt not in seen:
                    seen.add(nxt)
                    queue.append(nxt)
        for cation in ("natrium", "kalium", "calcium", "magnesium"):
            if current.startswith(cation) and len(current) > len(cation) + 3:
                rest = current[len(cation) :]
                if rest in ION_STEMS or rest.rstrip("e") in ION_STEMS:
                    continue
                if rest not in seen:
                    seen.add(rest)
                    queue.append(rest)
        if current.endswith("ium") and len(current) > 8:
            short = current[:-3]
            if short not in seen:
                seen.add(short)
                queue.append(short)
        digits = current.rstrip("0123456789")
        if digits != current and len(digits) > 4 and digits not in seen:
            seen.add(digits)
            queue.append(digits)
    return seen


def match_candidates(raw: str) -> list[str]:
    """Ordered, increasingly loose keys. The first unique catalog hit wins."""
    ordered: list[str] = []

    def add(value: str) -> None:
        if value and value not in ordered and len(value) > 2:
            ordered.append(value)

    def expand(stem: str) -> None:
        variants = set(salt_stems(stem))
        for current in list(variants):
            if "humant" in current:
                variants.add(current.replace("humant", "human"))
            if "isophan" in current:
                variants.add(current.replace("isophan", "isophane"))
            if "metason" in current:
                variants.add(current.replace("metason", "methason"))
            if "clavulanat" in current or current.endswith("clavulanate"):
                variants.add("clavulanicacid")
            if "botulinum" in current:
                variants.add("botulinumtoxins")
        for current in list(variants):
            if "humant" in current or "human" in current:
                variants.add(current.replace("humant", "").replace("human", ""))
        for current in sorted(variants, key=len, reverse=True):
            add(current)
            if current.endswith("syre") and len(current) > 5:
                root = current[:-4]
                add(root + "icacid")
                if root.endswith("in") and len(root) > 4:
                    add(root[:-2] + "icacid")
            if current.endswith("onat") and len(current) > 6:
                add(current[:-4] + "onicacid")
            if not current.endswith("e"):
                add(current + "e")
            if not current.endswith("um"):
                add(current + "um")
            if "oe" in current:
                add(current.replace("oe", "e"))

    expand(norm(raw))
    without = norm_without_parens(raw)
    if without != norm(raw):
        expand(without)
    return ordered


def split_active_substances(field: str) -> list[str]:
    """Split a product's active-substance cell.

    DKMA separates substances with a comma. A comma that continues the same
    name is followed by a lowercase word, as in "Insulin, humant (rDNA)".
    """
    if not field or not field.strip():
        return []
    parts = [part.strip() for part in field.split(",")]
    merged: list[str] = []
    for part in parts:
        if not part:
            continue
        if merged and part[:1].islower():
            merged[-1] = f"{merged[-1]}, {part}"
        else:
            merged.append(part)
    return merged


def slugify(name: str) -> str:
    text = name.lower().replace("æ", "ae").replace("ø", "oe").replace("å", "aa")
    text = re.sub(r"[^a-z0-9]+", "-", text).strip("-")
    return text or "stof"


def excel_column(cell_ref: str) -> str:
    return "".join(char for char in cell_ref if char.isalpha())


def parse_drug_id(raw: str) -> str:
    text = raw.strip()
    if re.fullmatch(r"\d+", text):
        return text
    if re.fullmatch(r"\d+(\.\d+)?[eE][+-]?\d+", text):
        return str(int(Decimal(text)))
    return text


def load_shared_strings(archive: zipfile.ZipFile) -> list[str]:
    root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    strings: list[str] = []
    for item in root.findall(f"{NS}si"):
        strings.append("".join((node.text or "") for node in item.iter(f"{NS}t")))
    return strings


def parse_product_sheet(blob: bytes) -> tuple[list[dict], dict]:
    archive = zipfile.ZipFile(io.BytesIO(blob))
    strings = load_shared_strings(archive)
    core = archive.read("docProps/core.xml").decode("utf-8", "replace")
    created = ""
    match = re.search(r"created[^>]*>([^<]+)", core)
    if match:
        created = match.group(1)

    products: list[dict] = []
    with archive.open("xl/worksheets/sheet1.xml") as handle:
        for _event, element in ET.iterparse(handle, events=("end",)):
            if element.tag != f"{NS}row":
                continue
            row_number = int(element.attrib.get("r", "0"))
            values: dict[str, str] = {}
            for cell in element.findall(f"{NS}c"):
                ref = cell.attrib.get("r", "")
                column = excel_column(ref)
                node = cell.find(f"{NS}v")
                if node is None or node.text is None:
                    continue
                text = node.text
                if cell.attrib.get("t") == "s":
                    text = strings[int(text)]
                values[column] = text
            element.clear()
            if row_number == 1:
                continue
            name = values.get("B", "").strip()
            if not name:
                continue
            products.append(
                {
                    "drugId": parse_drug_id(values.get("A", "")),
                    "name": name,
                    "form": values.get("C", "").strip(),
                    "strength": values.get("D", "").strip(),
                    "activeSubstances": values.get("E", "").strip(),
                    "tokens": split_active_substances(values.get("E", "")),
                    "holder": values.get("F", "").strip(),
                    "atc": values.get("G", "").strip(),
                }
            )
    if len(products) < 100:
        raise IngestError(
            f"Produktlisten har kun {len(products)} rækker. Filen ligner ikke den kendte liste."
        )
    return products, {"spreadsheetCreated": created, "productRows": len(products)}


def accept_index() -> str:
    """Return the ASP.NET session cookie that unlocks the substance index."""
    request = Request(
        INDEX_URL,
        data=b"",
        method="POST",
        headers={
            "User-Agent": USER_AGENT,
            "Content-Type": "application/x-www-form-urlencoded",
            "Referer": INDEX_URL,
        },
    )
    with urlopen(request, timeout=60) as response:
        cookie = response.headers.get("Set-Cookie", "")
        response.read()
    match = re.search(r"ASP\.NET_SessionId=([^;]+)", cookie)
    if not match:
        raise IngestError("Indekset bad ikke om en session. Accept af vilkår fejlede.")
    return match.group(1)


def fetch_index_page(session: str, letter: str, subletter: str | None) -> str:
    params = {"letter": letter}
    if subletter:
        params["subletter"] = subletter
    url = INDEX_URL + "?" + urlencode(params, encoding="utf-8")
    last: Exception | None = None
    for attempt in range(4):
        request = Request(
            url,
            headers={"User-Agent": USER_AGENT, "Cookie": f"ASP.NET_SessionId={session}"},
        )
        try:
            with urlopen(request, timeout=45) as response:
                return response.read().decode("utf-8", "replace")
        except (HTTPError, URLError, TimeoutError, ConnectionError) as exc:
            last = exc
            if isinstance(exc, HTTPError) and exc.code in {400, 401, 403, 404}:
                raise
            time.sleep(1.2 * (attempt + 1))
    raise IngestError(f"Indekssiden {letter}/{subletter} fejlede: {last}")


DRUG_LINK = re.compile(
    r'href="\?drug=(\./DK_EXTERNAL/[^"&]+\.zip)&amp;agency=DKMA|&agency=DKMA[^"]*"'
    r'[^>]*>([^<]+)</a>',
    re.IGNORECASE,
)
DRUG_LINK_LOOSE = re.compile(
    r'href="\?drug=(\./DK_EXTERNAL/[^"&]+\.zip)&(?:amp;)?agency=DKMA(?:&amp;|&)lang=Danish"[^>]*>([^<]+)</a>',
    re.IGNORECASE,
)
SUBLETTER_LINK = re.compile(r'href="\?letter=([^"&]+)&(?:amp;)?subletter=([^"&]+)"')


def parse_drug_links(page: str) -> list[tuple[str, str]]:
    found = []
    for path, name in DRUG_LINK_LOOSE.findall(page):
        found.append((html.unescape(path), html.unescape(name).strip()))
    return found


def scrape_catalog(session: str) -> dict[str, dict]:
    letters = [chr(code) for code in range(ord("A"), ord("Z") + 1)] + ["Æ", "Ø", "Å", "numeric"]
    catalog: dict[str, dict] = {}

    def absorb(page: str) -> None:
        for path, name in parse_drug_links(page):
            filename = path.rsplit("/", 1)[-1]
            substance_id = filename[: -len(".zip")]
            if not substance_id.startswith("DK_NON_"):
                continue
            catalog[substance_id] = {
                "id": substance_id,
                "name": name,
                "zipPath": path,
                "zipUrl": DAP_BASE + "data/" + path[2:],
            }

    # The index only renders one subletter at a time. Discover subletters, then fetch each.
    jobs: list[tuple[str, str | None]] = []
    with ThreadPoolExecutor(max_workers=6) as pool:
        letter_pages = list(pool.map(lambda letter: (letter, fetch_index_page(session, letter, None)), letters))
    for letter, page in letter_pages:
        absorb(page)
        subs = []
        seen = set()
        for found_letter, sub in SUBLETTER_LINK.findall(page):
            found_letter = html.unescape(found_letter)
            sub = html.unescape(sub)
            if found_letter.lower() != letter.lower():
                continue
            if sub in seen:
                continue
            seen.add(sub)
            subs.append(sub)
        for sub in subs:
            jobs.append((letter, sub))

    def load(job: tuple[str, str | None]) -> str:
        return fetch_index_page(session, job[0], job[1])

    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = [pool.submit(load, job) for job in jobs]
        for future in as_completed(futures):
            absorb(future.result())
    if len(catalog) < 100:
        raise IngestError(
            f"Stofindekset indeholder kun {len(catalog)} stoffer. Scraperen ramte sandsynligvis forkert."
        )
    return catalog


def load_localisation() -> dict:
    blob = fetch(LOC_URL)
    data = json.loads(blob.decode("utf-8-sig"))
    phrases = data.get("phrases")
    if not isinstance(phrases, dict) or "soc_String_Gastr" not in phrases:
        raise IngestError("Lokaliseringsfilen fra DKMA har ikke de kendte organklasse-nøgler.")
    return data


def danish_phrase(phrases: dict, key: str) -> str | None:
    entry = phrases.get(key)
    if isinstance(entry, dict):
        value = entry.get("Danish") or entry.get("English")
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def route_label(phrases: dict, route: str) -> str:
    encoded = ba(route)
    for key in (f"route_String_{encoded}", f"route_String_{encoded.upper()}"):
        label = danish_phrase(phrases, key)
        if label:
            return label
    return route


def soc_label(phrases: dict, abbrev: str) -> str:
    label = danish_phrase(phrases, f"soc_String_{ba(abbrev)}")
    if label:
        return label
    if abbrev not in KNOWN_SOCS:
        raise SchemaError(f"Ukendt MedDRA-organklasse: {abbrev}")
    return abbrev


def build_catalog_index(catalog: dict[str, dict]) -> dict[str, list[str]]:
    index: dict[str, list[str]] = defaultdict(list)
    for substance_id, item in catalog.items():
        index[norm(item["name"])].append(substance_id)
    # A key that points at two overviews is not safe to use.
    return {key: ids for key, ids in index.items() if len(set(ids)) == 1}


def match_token(token: str, index: dict[str, list[str]]) -> tuple[str | None, str]:
    """Return (substance id, reason). Ambiguous matches are refused."""
    explicit = EXPLICIT_SYNONYMS.get(norm(token))
    if explicit and explicit in index and len(index[explicit]) == 1:
        return index[explicit][0], "match"
    hits: list[tuple[str, str]] = []
    for candidate in match_candidates(token):
        ids = index.get(candidate, [])
        if len(ids) == 1:
            return ids[0], "match"
        if len(ids) > 1:
            hits.append((candidate, "flertydig"))
    if hits:
        return None, "flertydig"
    return None, "ingen oversigt"


def age_label(band: str) -> str:
    if band == "":
        return "Ukendt"
    number = int(band)
    if number >= 100:
        return "100 år eller ældre"
    return f"{number}–{number + 9} år"


def require_header(reader_fieldnames: list[str] | None, expected: list[str], label: str) -> None:
    if list(reader_fieldnames or []) != expected:
        raise SchemaError(
            f"{label} har headere {list(reader_fieldnames or [])}, forventede {expected}"
        )


def read_zip_tables(blob: bytes, substance_id: str) -> dict[str, list[dict] | str]:
    try:
        archive = zipfile.ZipFile(io.BytesIO(blob))
    except zipfile.BadZipFile as exc:
        raise SchemaError(f"ZIP-filen er ikke et gyldigt arkiv: {exc}") from exc
    names = set(archive.namelist())
    expected = {
        f"{substance_id}_case.csv": "case",
        f"{substance_id}_drug.csv": "drug",
        f"{substance_id}_event.csv": "event",
        f"{substance_id}_info.csv": "info",
        f"{substance_id}_summary.csv": "summary",
    }
    help_name = next((name for name in names if name.lower().endswith("idap_csv_help.txt")), None)
    missing = [name for name in expected if name not in names]
    if missing or help_name is None:
        raise SchemaError(
            f"ZIP mangler filer: {missing or ['*_idap_csv_help.txt']}. Faktiske filer: {sorted(names)}"
        )
    tables: dict[str, list[dict] | str] = {}
    for filename, key in expected.items():
        text = archive.read(filename).decode("utf-8-sig")
        tables[key] = list(csv.DictReader(io.StringIO(text)))
        # DictReader consumes fieldnames from the first row; re-read header explicitly.
        header = next(csv.reader(io.StringIO(text)))
        expected_header = {
            "case": CASE_HEADER,
            "drug": DRUG_HEADER,
            "event": EVENT_HEADER,
            "summary": SUMMARY_HEADER,
            "info": ["ITEM", "VALUE"],
        }[key]
        require_header(header, expected_header, filename)
    help_text = archive.read(help_name).decode("utf-8-sig")
    if "suspected" not in help_text.lower() or len(help_text) < 500:
        raise SchemaError("Hjælpeteksten i ZIP-filen ligner ikke DKMA's forklaring.")
    tables["help"] = help_text
    return tables


def validate_and_aggregate(tables: dict, phrases: dict) -> dict:
    cases = tables["case"]
    drugs = tables["drug"]
    events = tables["event"]
    if not cases:
        raise SchemaError("case.csv har ingen indberetninger.")
    seen = set()
    for row in cases:
        adr = row["ADR"]
        if not adr.isdigit() or adr in seen:
            raise SchemaError(f"Ugyldigt eller gentaget ADR-nummer: {adr!r}")
        seen.add(adr)
        if row["SEX"] not in SEX_VALUES:
            raise SchemaError(f"Ukendt køn: {row['SEX']!r}")
        if row["NONSERIOUS_SERIOUS_FATAL_NSF"] not in NSF_VALUES:
            raise SchemaError(f"Ukendt alvorlighed: {row['NONSERIOUS_SERIOUS_FATAL_NSF']!r}")
        if row["CONSUMER_YN"] not in YN_VALUES or row["HCP_YN"] not in YN_VALUES:
            raise SchemaError(f"CONSUMER_YN/HCP_YN er ikke Y/N i indberetning {adr}")
        age = row["AGE_10"]
        if age != "" and not re.fullmatch(r"\d{1,3}", age):
            raise SchemaError(f"Ugyldig aldersgruppe: {age!r}")
        if not re.fullmatch(r"(19|20)\d{2}", row["RECVD_YEAR"]):
            raise SchemaError(f"Ugyldigt år: {row['RECVD_YEAR']!r}")
    case_by_id = {row["ADR"]: row for row in cases}
    for row in drugs:
        if row["ADR"] not in case_by_id:
            raise SchemaError(f"drug.csv henviser til ukendt ADR {row['ADR']}")
        if row["MULTICONST"] not in YN_VALUES:
            raise SchemaError(f"Ukendt MULTICONST: {row['MULTICONST']!r}")
        if row["NONSERIOUS_SERIOUS_FATAL_NSF"] not in NSF_VALUES:
            raise SchemaError("drug.csv har en ukendt alvorlighedskode")
        if not row["ROUTE"]:
            raise SchemaError(f"Tom administrationsvej i ADR {row['ADR']}")
    for row in events:
        if row["ADR"] not in case_by_id:
            raise SchemaError(f"event.csv henviser til ukendt ADR {row['ADR']}")
        if row["FATAL_YN"] not in YN_VALUES:
            raise SchemaError(f"Ukendt FATAL_YN: {row['FATAL_YN']!r}")
        if not row["PT"] or not row["SOC_ABBREV"]:
            raise SchemaError(f"Tom PT eller organklasse i ADR {row['ADR']}")
        if row["SOC_ABBREV"] not in KNOWN_SOCS:
            raise SchemaError(f"Ukendt MedDRA-organklasse: {row['SOC_ABBREV']!r}")

    info = {row["ITEM"]: row["VALUE"] for row in tables["info"]}
    missing = [key for key in INFO_KEYS if key not in info or not str(info[key]).strip()]
    if missing:
        raise SchemaError(f"info.csv mangler: {missing}")
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", info["DATA_EXTRACTION_DATE"]):
        raise SchemaError(f"Ugyldig udtræksdato: {info['DATA_EXTRACTION_DATE']!r}")

    products = {"single": [], "multi": []}
    for row in tables["summary"]:
        flag = row["MULTI_CONSTITUENT_YN"]
        if flag not in YN_VALUES:
            raise SchemaError(f"Ukendt MULTI_CONSTITUENT_YN: {flag!r}")
        names = [part.strip() for part in row["PBG"].split(",") if part.strip()]
        products["multi" if flag == "Y" else "single"] = names

    views = {key: new_bucket() for key in ("all", "N", "S", "F")}
    routes_by_case: dict[str, list[str]] = defaultdict(list)
    for row in drugs:
        routes_by_case[row["ADR"]].append(row["ROUTE"])

    for case in cases:
        targets = ("all", case["NONSERIOUS_SERIOUS_FATAL_NSF"])
        for key in targets:
            bucket = views[key]
            bucket["reports"] += 1
            bucket["sex"][case["SEX"]] += 1
            bucket["age"][case["AGE_10"]] += 1
            bucket["years"][case["RECVD_YEAR"]][case["NONSERIOUS_SERIOUS_FATAL_NSF"]] += 1
            consumer = case["CONSUMER_YN"] == "Y"
            professional = case["HCP_YN"] == "Y"
            if consumer and professional:
                reporter = "both"
            elif consumer:
                reporter = "consumer"
            elif professional:
                reporter = "hcp"
            else:
                reporter = "neither"
            bucket["reporters"][reporter] += 1
            seen_routes = set(routes_by_case.get(case["ADR"], []))
            for route in seen_routes:
                bucket["route_reports"][route].add(case["ADR"])
        for route in routes_by_case.get(case["ADR"], []):
            for key in targets:
                views[key]["route_admins"][route] += 1

    for event in events:
        case = case_by_id[event["ADR"]]
        targets = ("all", case["NONSERIOUS_SERIOUS_FATAL_NSF"])
        fatal = event["FATAL_YN"] == "Y"
        for key in targets:
            bucket = views[key]
            bucket["reactions"] += 1
            if fatal:
                bucket["fatal_reactions"] += 1
            soc = bucket["soc"][event["SOC_ABBREV"]]
            soc["reactions"] += 1
            soc["reports"].add(event["ADR"])
            if fatal:
                soc["fatal"] += 1
            term = bucket["terms"][event["PT"]]
            term["reactions"] += 1
            term["reports"].add(event["ADR"])
            term["soc"] = event["SOC_ABBREV"]
            if fatal:
                term["fatal"] += 1

    if views["all"]["reports"] != len(cases) or views["all"]["reactions"] != len(events):
        raise SchemaError("Aggregeringen stemmer ikke med antallet af rækker i CSV-filerne.")

    route_labels = {}
    for route in views["all"]["route_admins"]:
        route_labels[route] = route_label(phrases, route)
    soc_labels = {abbrev: soc_label(phrases, abbrev) for abbrev in views["all"]["soc"]}

    def freeze(bucket: dict) -> dict:
        sex_order = ["Female", "Male", "Unknown"]
        sex_da = {"Female": "Kvinde", "Male": "Mand", "Unknown": "Ukendt"}
        reporter_order = ["consumer", "hcp", "both", "neither"]
        reporter_da = {
            "consumer": "Kun patient/pårørende",
            "hcp": "Kun sundhedspersonale",
            "both": "Både patient/pårørende og sundhedspersonale",
            "neither": "Ikke oplyst",
        }
        years = []
        for year in sorted(bucket["years"]):
            counts = bucket["years"][year]
            years.append(
                {
                    "year": int(year),
                    "nonserious": counts["N"],
                    "serious": counts["S"],
                    "fatal": counts["F"],
                    "reports": counts["N"] + counts["S"] + counts["F"],
                }
            )
        ages = []
        for band in sorted(bucket["age"], key=lambda item: (item == "", int(item) if item else -1)):
            ages.append(
                {
                    "band": band if band != "" else None,
                    "label": age_label(band),
                    "reports": bucket["age"][band],
                }
            )
        return {
            "reports": bucket["reports"],
            "reactions": bucket["reactions"],
            "fatalReactions": bucket["fatal_reactions"],
            "sex": [
                {"key": key, "label": sex_da[key], "reports": bucket["sex"][key]}
                for key in sex_order
                if bucket["sex"][key]
            ],
            "age": ages,
            "years": years,
            "reporters": [
                {"key": key, "label": reporter_da[key], "reports": bucket["reporters"][key]}
                for key in reporter_order
                if bucket["reporters"][key]
            ],
            "routes": sorted(
                [
                    {
                        "key": route,
                        "label": route_labels.get(route, route),
                        "administrations": bucket["route_admins"][route],
                        "reports": len(bucket["route_reports"][route]),
                    }
                    for route in bucket["route_admins"]
                ],
                key=lambda item: (-item["reports"], item["label"]),
            ),
            "soc": sorted(
                [
                    {
                        "abbrev": abbrev,
                        "label": soc_labels.get(abbrev, abbrev),
                        "reactions": values["reactions"],
                        "reports": len(values["reports"]),
                        "fatalReactions": values["fatal"],
                    }
                    for abbrev, values in bucket["soc"].items()
                ],
                key=lambda item: (-item["reactions"], item["label"]),
            ),
            "terms": sorted(
                [
                    {
                        "pt": term,
                        "soc": values["soc"],
                        "reactions": values["reactions"],
                        "reports": len(values["reports"]),
                        "fatalReactions": values["fatal"],
                    }
                    for term, values in bucket["terms"].items()
                ],
                key=lambda item: (-item["reactions"], item["pt"]),
            ),
        }

    leading = []
    seen_brands = set()
    for name in products["single"] + products["multi"]:
        brand = name.split()[0]
        if brand not in seen_brands:
            seen_brands.add(brand)
            leading.append(brand)
    return {
        "sourceName": info["DRUG_NAME"],
        "dataExtractionDate": info["DATA_EXTRACTION_DATE"],
        "meddraVersion": info["MEDDRA_VERSION"],
        "reportType": info["REPORT_TYPE"],
        "country": info["COUNTRY"],
        "extractVersion": info["DATA_EXTRACT_VERSION"],
        "views": {key: freeze(value) for key, value in views.items()},
        "productNames": products,
        "brands": leading,
    }


def new_bucket() -> dict:
    return {
        "reports": 0,
        "reactions": 0,
        "fatal_reactions": 0,
        "sex": Counter(),
        "age": Counter(),
        "years": defaultdict(lambda: Counter()),
        "reporters": Counter(),
        "route_admins": Counter(),
        "route_reports": defaultdict(set),
        "soc": defaultdict(lambda: {"reactions": 0, "reports": set(), "fatal": 0}),
        "terms": defaultdict(lambda: {"reactions": 0, "reports": set(), "fatal": 0, "soc": ""}),
    }


def zip_url_for(substance_id: str) -> str:
    return (
        f"{DAP_BASE}data/DK_EXTERNAL/NONCOMBINED/{substance_id}.zip"
    )


def source_page(substance_id: str) -> str:
    drug = f"./DK_EXTERNAL/NONCOMBINED/{substance_id}.zip"
    return (
        "https://laegemiddelstyrelsen.dk/da/bivirkninger/bivirkninger-ved-medicin/"
        "interaktive-bivirkningsoversigter/Drug%20Details/?drug="
        + quote(drug, safe="")
        + "&agency=DKMA&lang=Danish"
    )


def display_name(catalog_name: str | None, source_name: str) -> str:
    if catalog_name:
        return catalog_name
    if source_name.isupper():
        return source_name.title()
    return source_name


def download_one(item: dict) -> dict:
    substance_id = item["id"]
    url = item["zipUrl"]
    try:
        blob = fetch(url, timeout=180, retries=4)
    except Exception as exc:  # noqa: BLE001 - recorded per substance
        return {"id": substance_id, "error": f"Download fejlede: {exc}", "kind": "download"}
    if not blob.startswith(b"PK"):
        return {"id": substance_id, "error": "Svaret var ikke en ZIP-fil", "kind": "download"}
    return {"id": substance_id, "blob": blob, "sha256": hashlib.sha256(blob).hexdigest()}


def previous_substance(substance_id_slug: str) -> dict | None:
    path = DATA / "substances" / f"{substance_id_slug}.json"
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def publish(staging: Path) -> None:
    backup = ROOT / ".data-backup"
    if backup.exists():
        shutil.rmtree(backup)
    if DATA.exists():
        os.replace(DATA, backup)
    try:
        os.replace(staging, DATA)
    except Exception:
        if backup.exists() and not DATA.exists():
            os.replace(backup, DATA)
        raise
    if backup.exists():
        shutil.rmtree(backup)


def run(dry_run: bool, workers: int, limit: int | None) -> int:
    print("Henter produktlisten …", flush=True)
    list_blob = fetch(LIST_URL, timeout=180)
    products, list_meta = parse_product_sheet(list_blob)
    print(f"  {list_meta['productRows']} præparatrækker", flush=True)

    print("Henter stofindekset …", flush=True)
    session = accept_index()
    catalog = scrape_catalog(session)
    print(f"  {len(catalog)} stoffer i indekset", flush=True)
    index = build_catalog_index(catalog)

    token_counts: Counter[str] = Counter()
    for product in products:
        for token in product["tokens"]:
            token_counts[token] += 1
    if not token_counts:
        raise IngestError("Ingen aktive stoffer kunne læses ud af produktlisten.")

    token_match: dict[str, dict] = {}
    for token in token_counts:
        folded = norm(token)
        if folded in QUALIFIER_TOKENS:
            token_match[token] = {"id": None, "reason": "hjælpestof"}
            continue
        substance_id, reason = match_token(token, index)
        token_match[token] = {"id": substance_id, "reason": reason}

    showcase_ids = {item["id"] for item in SHOWCASES}
    for showcase in SHOWCASES:
        if showcase["id"] not in catalog:
            catalog[showcase["id"]] = {
                "id": showcase["id"],
                "name": showcase["fallback_name"],
                "zipPath": f"./DK_EXTERNAL/NONCOMBINED/{showcase['id']}.zip",
                "zipUrl": zip_url_for(showcase["id"]),
                "forced": True,
            }

    wanted: dict[str, dict] = {}
    for token, match in token_match.items():
        if match["id"]:
            wanted[match["id"]] = catalog[match["id"]]
    for showcase in SHOWCASES:
        wanted[showcase["id"]] = catalog[showcase["id"]]
    by_catalog_name = {item["name"].casefold(): item for item in catalog.values()}
    for spec in GROUP_OVERVIEWS:
        item = by_catalog_name.get(spec["name"].casefold())
        if not item:
            continue
        for product in products:
            atc = (product.get("atc") or "").upper()
            first = product["name"].split()[0].casefold() if product.get("name") else ""
            if any(atc.startswith(prefix) for prefix in spec["atc_prefixes"]) and any(
                first.startswith(prefix) for prefix in spec["name_prefixes"]
            ):
                wanted[item["id"]] = item
                break

    matched_tokens = sum(1 for item in token_match.values() if item["id"])
    ambiguous = sorted(token for token, item in token_match.items() if item["reason"] == "flertydig")
    unmatched = sorted(
        token_counts,
        key=lambda token: (-token_counts[token], token.lower()),
    )
    unmatched = [token for token in unmatched if token_match[token]["reason"] != "match"]
    print(
        f"  {len(token_counts)} stofnavne, {matched_tokens} matchet, "
        f"{len(unmatched)} uden oversigt/flertydige, {len(wanted)} ZIP-filer",
        flush=True,
    )

    for product in products:
        slugs_ready = []
        missing = []
        for token in product["tokens"]:
            match = token_match[token]
            if match["reason"] == "hjælpestof":
                continue
            if match["id"]:
                slugs_ready.append(match["id"])
            else:
                missing.append({"token": token, "reason": match["reason"]})
        product["substanceIds"] = slugs_ready
        product["unmatched"] = missing

    if not dry_run:
        from ingest_unlinked import download_overviews, load_known_overviews, summary_names
        from overview_match import brand_tokens, match_products

        missing_items = [item for item in catalog.values() if item["id"] not in wanted]
        print(f"Tjekker {len(missing_items)} oversigter uden stofnavn-match …", flush=True)
        known_tokens, slug_to_id = load_known_overviews(DATA)
        for substance_id in wanted:
            slug_to_id.setdefault(substance_id, substance_id)
        blobs, _failed = download_overviews(missing_items)
        overview_tokens: dict[str, set[str]] = {}
        for substance_id, blob in blobs.items():
            try:
                overview_tokens[substance_id] = brand_tokens(summary_names(blob, substance_id))
            except Exception:
                continue
        shaped = [
            {
                "drugId": product["drugId"],
                "name": product["name"],
                "atc": product.get("atc") or "",
                "slugs": list(product.get("substanceIds") or []),
            }
            for product in products
        ]
        brand_links, brand_matched = match_products(overview_tokens, shaped, known_tokens, slug_to_id)
        for substance_id in brand_matched:
            if substance_id in catalog:
                wanted[substance_id] = catalog[substance_id]
        drug_to_overview = {
            drug_id: substance_id for substance_id, drug_ids in brand_links.items() for drug_id in drug_ids
        }
        for product in products:
            overview_id = drug_to_overview.get(product["drugId"])
            if not overview_id:
                continue
            atc = (product.get("atc") or "").upper()
            if atc.startswith("J07") or not product["substanceIds"]:
                product["substanceIds"] = [overview_id]
                product["unmatched"] = []
            elif overview_id not in product["substanceIds"]:
                product["substanceIds"].append(overview_id)
        print(f"  {len(brand_matched)} oversigter matchet på produktnavn", flush=True)

    if dry_run:
        report = {
            "productRows": len(products),
            "uniqueTokens": len(token_counts),
            "matchedTokens": matched_tokens,
            "zipFiles": len(wanted),
            "ambiguous": ambiguous[:50],
            "unmatchedTop": [
                {"token": token, "products": token_counts[token], "reason": token_match[token]["reason"]}
                for token in unmatched[:40]
            ],
        }
        print(json.dumps(report, ensure_ascii=False, indent=2))
        return 0

    print("Henter danske betegnelser …", flush=True)
    phrases = load_localisation()["phrases"]

    queue = list(wanted.values())
    if limit is not None:
        showcase_queue = [item for item in queue if item["id"] in showcase_ids]
        rest = [item for item in queue if item["id"] not in showcase_ids][:limit]
        queue = showcase_queue + rest
    print(f"Downloader {len(queue)} ZIP-filer …", flush=True)

    downloaded: dict[str, dict] = {}
    failures: list[dict] = []
    with ThreadPoolExecutor(max_workers=workers) as pool:
        futures = {pool.submit(download_one, item): item for item in queue}
        done = 0
        for future in as_completed(futures):
            done += 1
            result = future.result()
            item = futures[future]
            if "error" in result:
                failures.append(
                    {
                        "id": item["id"],
                        "name": item["name"],
                        "reason": result["error"],
                        "kind": result["kind"],
                    }
                )
            else:
                downloaded[item["id"]] = result
            if done % 50 == 0 or done == len(queue):
                print(f"  {done}/{len(queue)} hentet", flush=True)

    # Schema-check showcases before spending time on the long tail's aggregation
    # is already done below; abort the publish if a showcase is unusable.
    print("Validerer og aggregerer …", flush=True)
    cleaned: dict[str, dict] = {}
    help_text = ""
    raw_blobs: dict[str, tuple[bytes, str]] = {}
    for item in queue:
        substance_id = item["id"]
        if substance_id not in downloaded:
            continue
        payload = downloaded[substance_id]
        try:
            tables = read_zip_tables(payload["blob"], substance_id)
            aggregate = validate_and_aggregate(tables, phrases)
        except SchemaError as exc:
            failures.append(
                {"id": substance_id, "name": item["name"], "reason": str(exc), "kind": "schema"}
            )
            continue
        slug = slugify(item["name"] or aggregate["sourceName"])
        aggregate_slug = slug
        cleaned[substance_id] = {
            "item": item,
            "slug": aggregate_slug,
            "aggregate": aggregate,
            "sha256": payload["sha256"],
            "help": tables["help"],
        }
        if not help_text:
            help_text = str(tables["help"])
        if substance_id in showcase_ids:
            raw_blobs[substance_id] = (payload["blob"], str(tables["help"]))

    # Resolve slug collisions after every success is known.
    used_slugs: dict[str, str] = {}
    for substance_id, record in cleaned.items():
        slug = record["slug"]
        if slug in used_slugs and used_slugs[slug] != substance_id:
            slug = f"{slug}-{substance_id[-8:]}"
            record["slug"] = slug
        used_slugs[slug] = substance_id

    failed_ids = {item["id"] for item in failures}
    for showcase in SHOWCASES:
        if showcase["id"] in failed_ids or showcase["id"] not in cleaned:
            reasons = [item["reason"] for item in failures if item["id"] == showcase["id"]]
            raise IngestError(
                "Showcase-stoffet "
                f"{showcase['fallback_name']} kunne ikke valideres ({reasons or 'mangler'}). "
                "Intet datasæt bliver udskiftet."
            )
    schema_failures = [item for item in failures if item["kind"] == "schema"]
    if cleaned and len(schema_failures) > max(10, len(queue) * 0.25):
        sample = "; ".join(f"{item['name']}: {item['reason']}" for item in schema_failures[:5])
        raise IngestError(
            "For mange filer bryder CSV-formatet. Det ligner en ændring hos DKMA, "
            f"så sidste gyldige datasæt beholdes. Eksempler: {sample}"
        )

    id_to_slug = {substance_id: record["slug"] for substance_id, record in cleaned.items()}
    # Retain last good file for substances that failed and were published before.
    retained = 0
    if DATA.exists():
        for failure in failures:
            previous_files = list((DATA / "substances").glob("*.json")) if (DATA / "substances").exists() else []
            for path in previous_files:
                try:
                    previous = json.loads(path.read_text(encoding="utf-8"))
                except json.JSONDecodeError:
                    continue
                if previous.get("id") == failure["id"]:
                    failure["retainedPrevious"] = True
                    retained += 1
                    cleaned[failure["id"]] = {
                        "item": catalog.get(failure["id"], {"id": failure["id"], "name": previous["name"]}),
                        "slug": previous["slug"],
                        "aggregate": None,
                        "previous": previous,
                        "sha256": previous.get("zipSha256"),
                        "help": "",
                    }
                    id_to_slug[failure["id"]] = previous["slug"]
                    break

    staging = ROOT / ".data-staging"
    if staging.exists():
        shutil.rmtree(staging)
    staging.mkdir(parents=True)

    substances_index = []
    extraction_dates = []
    for substance_id, record in cleaned.items():
        if record.get("previous"):
            document = record["previous"]
            document["stale"] = True
            document["staleReason"] = next(
                item["reason"] for item in failures if item["id"] == substance_id
            )
        else:
            item = record["item"]
            aggregate = record["aggregate"]
            slug = record["slug"]
            document = {
                "slug": slug,
                "id": substance_id,
                "name": item["name"],
                "sourceName": aggregate["sourceName"],
                "showcase": substance_id in showcase_ids,
                "zipPath": item.get("zipPath") or f"./DK_EXTERNAL/NONCOMBINED/{substance_id}.zip",
                "zipUrl": item.get("zipUrl") or zip_url_for(substance_id),
                "sourcePage": source_page(substance_id),
                "zipSha256": record["sha256"],
                "dataExtractionDate": aggregate["dataExtractionDate"],
                "meddraVersion": aggregate["meddraVersion"],
                "reportType": aggregate["reportType"],
                "country": aggregate["country"],
                "extractVersion": aggregate["extractVersion"],
                "views": aggregate["views"],
                "productNames": aggregate["productNames"],
                "brands": aggregate["brands"],
            }
        write_json(staging / "substances" / f"{document['slug']}.json", document)
        all_view = document["views"]["all"]
        extraction_dates.append(document["dataExtractionDate"])
        substances_index.append(
            {
                "slug": document["slug"],
                "id": document["id"],
                "name": document["name"],
                "sourceName": document["sourceName"],
                "showcase": document["showcase"],
                "stale": bool(document.get("stale")),
                "reports": all_view["reports"],
                "reactions": all_view["reactions"],
                "seriousReports": document["views"]["S"]["reports"],
                "fatalReports": document["views"]["F"]["reports"],
                "dataExtractionDate": document["dataExtractionDate"],
                "topTerm": all_view["terms"][0]["pt"] if all_view["terms"] else None,
                "brands": document["brands"][:8],
            }
        )
        if substance_id in raw_blobs and not record.get("previous"):
            blob, _help = raw_blobs[substance_id]
            raw_dir = staging / "raw" / document["slug"]
            raw_dir.mkdir(parents=True, exist_ok=True)
            with zipfile.ZipFile(io.BytesIO(blob)) as archive:
                for name in archive.namelist():
                    target = raw_dir / Path(name).name
                    if target.name != name and "/" in name.replace("\\", "/"):
                        raise IngestError(f"Uventet sti i ZIP: {name}")
                    target.write_bytes(archive.read(name))

    substances_index.sort(key=lambda item: (-int(item["showcase"]), item["name"].lower()))

    covered = partial = uncovered = 0
    public_products = []
    for product in products:
        mapped = []
        failed = []
        unmatched_tokens = product["unmatched"]
        for substance_id in product["substanceIds"]:
            slug = id_to_slug.get(substance_id)
            if slug:
                mapped.append(slug)
            elif substance_id in failed_ids:
                failed.append(substance_id)
        if product["tokens"] and mapped and not unmatched_tokens and not failed:
            status = "covered"
            covered += 1
        elif mapped:
            status = "partial"
            partial += 1
        else:
            status = "uncovered"
            uncovered += 1
        public_products.append(
            {
                "drugId": product["drugId"],
                "name": product["name"],
                "form": product["form"],
                "strength": product["strength"],
                "atc": product["atc"],
                "holder": product["holder"],
                "slugs": mapped,
                "status": status,
            }
        )

    # Count linked approved products per substance.
    links: dict[str, int] = Counter()
    for product in public_products:
        for slug in set(product["slugs"]):
            links[slug] += 1
    for path in (staging / "substances").glob("*.json"):
        document = json.loads(path.read_text(encoding="utf-8"))
        document["approvedProductCount"] = links.get(document["slug"], 0)
        write_json(path, document)
    for item in substances_index:
        item["approvedProductCount"] = links.get(item["slug"], 0)

    if help_text:
        (staging / "reference").mkdir(parents=True, exist_ok=True)
        (staging / "reference" / "dkma_idap_csv_help.txt").write_text(help_text, encoding="utf-8")

    status = {
        "ok": True,
        "generatedAt": utc_now(),
        "listUrl": LIST_URL,
        "indexUrl": "https://laegemiddelstyrelsen.dk/da/bivirkninger/bivirkninger-ved-medicin/interaktive-bivirkningsoversigter/",
        "list": list_meta,
        "catalogCount": len(catalog),
        "uniqueSubstanceTokens": len(token_counts),
        "matchedTokens": matched_tokens,
        "unmatchedTokens": len(token_counts) - matched_tokens,
        "ambiguousTokens": ambiguous,
        "attemptedZips": len(queue),
        "succeeded": len([item for item in substances_index if not item["stale"]]),
        "failed": failures,
        "retainedPrevious": retained,
        "products": {
            "rows": len(products),
            "covered": covered,
            "partial": partial,
            "uncovered": uncovered,
        },
        "dataExtractionDateMin": min(extraction_dates) if extraction_dates else None,
        "dataExtractionDateMax": max(extraction_dates) if extraction_dates else None,
        "showcases": [id_to_slug[item["id"]] for item in SHOWCASES],
    }
    write_json(staging / "status.json", status)
    write_json(
        staging / "index.json",
        {
            "generatedAt": status["generatedAt"],
            "dataExtractionDateMin": status["dataExtractionDateMin"],
            "dataExtractionDateMax": status["dataExtractionDateMax"],
            "substances": substances_index,
        },
    )
    write_json(staging / "products.json", public_products)
    write_json(
        staging / "unmatched.json",
        [
            {
                "token": token,
                "products": token_counts[token],
                "reason": token_match[token]["reason"],
            }
            for token in unmatched
        ],
    )
    write_json(
        staging / "catalog.json",
        {
            "fetchedAt": utc_now(),
            "count": len(catalog),
            "substances": sorted(catalog.values(), key=lambda item: item["name"].lower()),
        },
    )

    print(
        f"Publicerer {status['succeeded']} stoffer. "
        f"Præparater dækket: {covered}, delvist: {partial}, uden data: {uncovered}. "
        f"Fejl: {len(failures)}.",
        flush=True,
    )
    publish(staging)
    print("Færdig.", flush=True)
    return 0


def main() -> None:
    parser = argparse.ArgumentParser(description="Hent og rens bivirkningsdata fra Lægemiddelstyrelsen")
    parser.add_argument("--dry-run", action="store_true", help="Match listen mod indekset uden at hente ZIP-filer")
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--limit", type=int, default=None, help="Hent kun N ikke-showcase-stoffer (fejlfinding)")
    args = parser.parse_args()
    try:
        code = run(args.dry_run, args.workers, args.limit)
    except Exception as exc:  # noqa: BLE001
        print(f"FEJL: {exc}", file=sys.stderr)
        if not isinstance(exc, IngestError):
            traceback.print_exc()
        sys.exit(1)
    sys.exit(code)


if __name__ == "__main__":
    main()
