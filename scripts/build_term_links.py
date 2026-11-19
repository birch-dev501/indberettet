#!/usr/bin/env python3
"""Match MedDRA terms to real Patienthåndbogen articles.

Only an exact Danish title/slug is stored as a direct link. A more specific
disease (for example TTP) is not used for the general finding. Search links are
not written here: an unverified search can be an empty page.
"""

from __future__ import annotations

import json
import re
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from html import unescape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "term-links.json"
UA = "indberettet-data-bot/1.0 (monthly link check)"
STOP = {"en", "et", "og", "af", "i", "paa", "pa", "til", "med", "den", "det", "for", "ved", "eller", "hos"}

# English term -> Danish display name, phrases whose tokens must equal the article slug.
PHRASES: dict[str, tuple[str, list[str]]] = {
    "Headache": ("Hovedpine", ["hovedpine"]),
    "Pyrexia": ("Feber", ["feber"]),
    "Fatigue": ("Træthed", ["traethed", "traethed en oversigt"]),
    "Dizziness": ("Svimmelhed", ["svimmelhed"]),
    "Nausea": ("Kvalme og opkastninger", ["kvalme og opkastninger"]),
    "Vomiting": ("Kvalme og opkastninger", ["kvalme og opkastninger"]),
    "Diarrhoea": ("Diarré", ["diarre akut", "akut diarre"]),
    "Abdominal pain": ("Mavesmerter", ["mavesmerter"]),
    "Pruritus": ("Kløe", ["kloe", "kløe"]),
    "Rash": ("Udslæt", ["udslaet", "udslæt"]),
    "Urticaria": ("Nældefeber", ["naeldefeber"]),
    "Eczema": ("Eksem", ["eksem"]),
    "Alopecia": ("Hårtab", ["haartab"]),
    "Cough": ("Hoste", ["hoste"]),
    "Palpitations": ("Hjertebanken", ["hjertebanken"]),
    "Syncope": ("Besvimelse", ["besvimelse"]),
    "Chest pain": ("Brystsmerter", ["brystsmerter"]),
    "Tremor": ("Rysten", ["rysten"]),
    "Lymphadenopathy": ("Hævede lymfeknuder", ["haevede lymfeknuder"]),
    "Constipation": ("Forstoppelse", ["forstoppelse"]),
    "Insomnia": ("Søvnløshed", ["soevnloeshed", "søvnløshed"]),
    "Depression": ("Depression", ["depression", "depression en oversigt"]),
    "Anxiety": ("Angst", ["angst"]),
    "Asthma": ("Astma", ["astma", "astma en oversigt"]),
    "Pneumonia": ("Lungebetændelse", ["lungebetaendelse"]),
    "Hypertension": ("Forhøjet blodtryk", ["hoejt blodtryk", "forhoejet blodtryk"]),
    "Thrombocytopenia": ("Blodplademangel", ["blodplademangel"]),
    "Thrombotic thrombocytopenic purpura": ("Trombotisk trombocytopenisk purpura", ["trombotisk trombocytopenisk purpura"]),
    "Immune thrombocytopenia": ("Primær immun trombocytopeni", ["primaer immun trombocytopeni"]),
    "Anaemia": ("Blodmangel", ["blodmangel anaemi", "blodmangel"]),
    "Migraine": ("Migræne", ["migraene"]),
    "Oropharyngeal pain": ("Halssmerter", ["halssmerter"]),
    "Tinnitus": ("Øresusen", ["tinnitus oeresusen", "oeresusen"]),
    "Dysphagia": ("Synkebesvær", ["dysfagi"]),
    "Visual impairment": ("Synsnedsættelse", ["synsnedsaettelse"]),
    "Hyperhidrosis": ("Svedtendens", ["svedtendens"]),
    "Heavy menstrual bleeding": ("Kraftige menstruationer", ["kraftige menstruationer"]),
    "Amenorrhoea": ("Manglende menstruation", ["manglende menstruation"]),
    "Gynaecomastia": ("Forstørret bryst hos mænd", ["forstoerret bryst hos maend"]),
    "Hallucination": ("Hallucinationer", ["hallucinationer"]),
    "Myocarditis": ("Hjertemuskelbetændelse", ["hjertemuskelbetaendelse myokardit"]),
    "Pericarditis": ("Hjertehindebetændelse", ["hjertehindebetaendelse perikardit"]),
    "Deep vein thrombosis": ("Dyb venetrombose", ["dyb venetrombose dvt", "dyb venetrombose"]),
    "Pulmonary embolism": ("Blodprop i lungerne", ["blodprop i lungerne lungeemboli"]),
    "Back pain": ("Rygsmerter", ["rygsmerter"]),
    "Arthralgia": ("Ledsmerter", ["ledsmerter"]),
    "Myalgia": ("Muskelsmerter", ["muskelsmerter"]),
    "Dyspnoea": ("Åndenød", ["aandenoed", "aandedraetsbesvaer"]),
    "Malaise": ("Utilpashed", ["utilpashed"]),
    "Pain": ("Smerte", ["smerte hvad er det"]),
    "Chills": ("Kulderystelser", ["kulderystelser"]),
    "Angioedema": ("Angioødem", ["angiooedem"]),
    "Dry mouth": ("Mundtørhed", ["mundtoerhed"]),
    "Decreased appetite": ("Nedsat appetit", ["nedsat appetit"]),
    "Weight increased": ("Vægtøgning", ["vaegtstigning"]),
    "Weight decreased": ("Vægttab", ["vaegttab hos voksne", "vaegttab"]),
    "Oedema": ("Hævelse", ["haevelse", "oedem"]),
    "Asthenia": ("Kraftesløshed", ["kraftesloeshed"]),
    "Paraesthesia": ("Snurren", ["paraeatesi", "foeleforstyrrelse"]),
    "Hypoaesthesia": ("Nedsat følesans", ["nedsat foelesans"]),
    "Muscle spasms": ("Muskelkrampe", ["muskelkrampe"]),
    "Seizure": ("Kramper", ["kramper", "krampeanfald"]),
    "Confusional state": ("Forvirring", ["forvirring"]),
    "Restlessness": ("Uro", ["uro"]),
    "Somnolence": ("Søvnighed", ["soevnighed"]),
    "Vision blurred": ("Sløret syn", ["taagesyn", "uklarheder"]),
    "Erythema": ("Rødme", ["roedme"]),
    "Hypotension": ("Lavt blodtryk", ["lavt blodtryk"]),
    "Heart rate increased": ("Høj puls", ["hoej puls"]),
    "COVID-19": ("COVID-19", ["covid 19 sars cov 2"]),
    "Nasopharyngitis": ("Forkølelse", ["forkoelelse"]),
    "Rash pruritic": ("Udslæt med kløe", ["udslaet med kloee"]),
    "Type 2 diabetes mellitus": ("Type 2-diabetes", ["type 2 diabetes"]),
    "Type 1 diabetes mellitus": ("Type 1-diabetes", ["type 1 diabetes"]),
    "Epilepsy": ("Epilepsi", ["epilepsi oversigt"]),
    "Multiple sclerosis": ("Multipel sklerose", ["multipel sklerose oversigt"]),
    "Parkinson's disease": ("Parkinsons sygdom", ["parkinsons sygdom oversigt"]),
    "Dementia": ("Demens", ["demens oversigt"]),
    "Obesity": ("Overvægt og fedme", ["overvaegt og fedme"]),
    "Cardiac failure": ("Hjertesvigt", ["hjertesvigt"]),
    "Psoriasis": ("Psoriasis", ["psoriasis oversigt"]),
    "Acne": ("Akne", ["akne oversigt"]),
    "Herpes zoster": ("Helvedesild", ["helvedesild"]),
    "Pharyngitis": ("Halsbetændelse", ["halsbetaendelse"]),
    "Nephrolithiasis": ("Nyresten", ["nyresten en oversigt"]),
    "Cholelithiasis": ("Galdesten", ["galdestenssygdom"]),
    "Rheumatoid arthritis": ("Leddegigt", ["leddegigt oversigt"]),
    "Gout": ("Urinsyregigt", ["urinsyre gigt"]),
    "Chronic obstructive pulmonary disease": ("KOL", ["kol"]),
    "Gastrooesophageal reflux disease": ("Refluks", ["refluks"]),
    "Iron deficiency anaemia": ("Jernmangel", ["jernmangel"]),
    "Vitamin B12 deficiency": ("Vitamin B12-mangel", ["vitamin b12 mangel"]),
    "Vitamin D deficiency": ("D-vitaminmangel", ["d vitamin mangel"]),
    "Encephalitis": ("Hjernebetændelse", ["hjernebetaendelse encefalit"]),
    "Panic attack": ("Panikangst", ["panikangst oversigt"]),
    "Hypercholesterolaemia": ("Højt kolesterol", ["hoejt kolesterol hyperlipidaemi"]),
    "Fracture": ("Knoglebrud", ["knoglebrud generelt"]),
    "Attention deficit hyperactivity disorder": ("ADHD", ["adhd oversigt"]),
    "Abdominal pain upper": ("Ubehag i øvre del af maven", ["ubehag i oevre del af maven"]),
    "Dyspepsia": ("Halsbrand", ["halsbrand og sure opstoed", "halsbrand"]),
    "Haematuria": ("Blod i urinen", ["blod i urinen"]),
    "Jaundice": ("Gulsot", ["gulsot"]),
    "Fall": ("Fald", ["fald"]),
}


def norm_tokens(value: str) -> list[str]:
    text = value.lower().replace("æ", "ae").replace("ø", "oe").replace("å", "aa")
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return [part for part in text.split() if part and part not in STOP]


def fetch(url: str) -> tuple[int, str]:
    request = urllib.request.Request(url, headers={"User-Agent": UA, "Accept": "text/html"})
    with urllib.request.urlopen(request, timeout=25) as response:
        body = response.read(60000).decode("utf-8", "replace")
        status = response.status
    match = re.search(r"<title>(.*?)</title>", body, re.I | re.S)
    title = unescape(re.sub(r"\s+", " ", match.group(1))).strip() if match else ""
    return status, title.split(" - ")[0].strip()


def load_locs(url: str) -> list[str]:
    request = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(request, timeout=40) as response:
        text = response.read().decode("utf-8", "replace")
    return re.findall(r"<loc>(.*?)</loc>", text)


def candidates(locs: list[str], phrases: list[str]) -> list[str]:
    wanted = [norm_tokens(phrase) for phrase in phrases]
    wanted_words = [token for phrase in wanted for token in phrase]
    found: list[tuple[int, str]] = []
    for url in locs:
        if any(part in url for part in ("/illustrationer/", "/animationer/", "/billeddiagnostik/", "/kraeft/", "/boern/", "/graviditet/", "/foerstehjaelp/")):
            if not any(word in " ".join(wanted_words) for word in ("kraeft", "boern", "graviditet")):
                continue
        slug = url.rstrip("/").split("/")[-1]
        tokens = norm_tokens(slug)
        if not tokens:
            continue
        if tokens not in wanted and not any(tokens == phrase for phrase in wanted):
            continue
        rank = 0 if "/symptomer/" in url else 1 if "/sygdomme/" in url else 3
        if url.rstrip("/").endswith(slug) and len(url.split("/")) < 7:
            rank -= 0
        found.append((rank, url if url.endswith("/") else url + "/"))
    found.sort()
    seen: list[str] = []
    for _, url in found:
        if url not in seen:
            seen.append(url)
    return seen


def main() -> None:
    previous = json.loads(OUT.read_text(encoding="utf-8"))
    ph = load_locs("https://www.sundhed.dk/sitemap-patienthaandbog.xml")
    lh = [url for url in load_locs("https://www.sundhed.dk/sitemap-laegehaandbog.xml") if "/laegehaandbogen/" in url]
    terms: dict[str, dict] = {}
    checks: list[tuple[str, str, str]] = []
    for english, (danish, phrases) in PHRASES.items():
        ph_urls = candidates(ph, phrases)
        lh_urls = candidates(lh, phrases)
        if ph_urls:
            url = ph_urls[0]
            # Thrombocytopenia must not land on TTP or ITP.
            if english == "Thrombocytopenia" and ("purpura" in url or "immun" in url):
                url = next((item for item in ph_urls if "purpura" not in item and "immun" not in item), "")
            if not url:
                continue
            terms[english] = {
                "danish": danish,
                "url": url,
                "source": "sundhed.dk, Patienthåndbogen",
                "kind": "direct",
                "verified": False,
                "audience": "borger",
                "confidence": "high",
            }
            checks.append((english, url, "ph"))
        elif lh_urls:
            terms[english] = {
                "danish": danish,
                "url": lh_urls[0],
                "source": "sundhed.dk, Lægehåndbogen (for sundhedspersoner)",
                "kind": "direct",
                "verified": False,
                "audience": "fagperson",
                "confidence": "high",
            }
            checks.append((english, lh_urls[0], "lh"))

    def one(item: tuple[str, str, str]):
        english, url, _book = item
        try:
            status, title = fetch(url)
        except Exception as error:  # noqa: BLE001
            return english, False, "", str(error)
        ok = status == 200 and title and "ikke fundet" not in title.lower()
        if english == "Thrombocytopenia" and "purpura" in title.lower():
            ok = False
        return english, ok, title, ""

    with ThreadPoolExecutor(max_workers=6) as pool:
        futures = [pool.submit(one, item) for item in checks]
        for future in as_completed(futures):
            english, ok, title, error = future.result()
            if ok:
                terms[english]["verified"] = True
                terms[english]["pageTitle"] = title[:180]
            else:
                terms.pop(english, None)
                if error:
                    print("dropped", english, error)

    # English pages only where no Danish article was found, and the old URL was already a direct page.
    for english, row in previous["terms"].items():
        if english in terms:
            continue
        if row.get("kind") == "direct" and row.get("verified") and "sundhed.dk" not in row.get("url", ""):
            terms[english] = {
                **row,
                "audience": "engelsk",
                "confidence": "medium",
            }

    document = {
        "note": previous["note"] + " Et direkte link er en artikel, hvis titel er det samme begreb. En tom søgning vises ikke.",
        "checkedAt": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "search": {
            "label": "Søg i Patienthåndbogen",
            "urlTemplate": "https://www.sundhed.dk/borger/patienthaandbogen/soeg/?SearchTerm={q}",
            "source": "sundhed.dk, Patienthåndbogen",
            "verified": False,
            "note": "Skabelonen bruges ikke automatisk. En søgning gemmes kun, når den er tjekket til at have træf.",
        },
        "terms": dict(sorted(terms.items())),
        "socs": {
            key: value
            for key, value in previous["socs"].items()
            if value.get("kind") == "direct" and "patienthaandbogen" in value.get("url", "") and "/soeg/" not in value.get("url", "")
        },
    }
    # Keep every SOC key. Chapters without a citizen article have no link.
    for key, value in previous["socs"].items():
        document["socs"].setdefault(
            key,
            {"danish": value.get("danish", key), "url": "", "source": "", "kind": "direct", "verified": False},
        )
    occurrences = 0
    direct_occurrences = 0
    direct_names = {name for name, row in terms.items() if row.get("kind") == "direct" and row.get("verified") and row.get("audience") == "borger"}
    english_names = {name for name, row in terms.items() if row.get("audience") == "engelsk"}
    professional = {name for name, row in terms.items() if row.get("audience") == "fagperson"}
    english_occurrences = 0
    professional_occurrences = 0
    for path in (ROOT / "data" / "substances").glob("*.json"):
        for term in json.loads(path.read_text(encoding="utf-8"))["views"]["all"]["terms"]:
            count = int(term["reactions"])
            occurrences += count
            if term["pt"] in direct_names:
                direct_occurrences += count
            elif term["pt"] in professional:
                professional_occurrences += count
            elif term["pt"] in english_names:
                english_occurrences += count
    document["coverage"] = {
        "reactionOccurrences": occurrences,
        "directOccurrences": direct_occurrences,
        "directShare": round(direct_occurrences / occurrences, 4) if occurrences else 0,
        "directTerms": len(direct_names),
        "professionalTerms": len(professional),
        "professionalOccurrences": professional_occurrences,
        "englishTerms": len(english_names),
        "englishOccurrences": english_occurrences,
        "mappedTerms": len(terms),
        "unlinkedOccurrences": occurrences - direct_occurrences - professional_occurrences - english_occurrences,
        "socWithDirectLink": sum(1 for row in document["socs"].values() if row.get("verified")),
        "socCount": len(document["socs"]),
    }
    OUT.write_text(json.dumps(document, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(document["coverage"], ensure_ascii=False, indent=2))
    print("Thrombocytopenia", terms.get("Thrombocytopenia", {}).get("url"))


if __name__ == "__main__":
    main()
