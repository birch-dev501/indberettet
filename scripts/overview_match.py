"""Match DKMA overviews to approved products by brand name, not substance name.

A product with an empty active-substance field can still belong to an overview
when its brand appears in that overview's summary.csv. A brand token that
appears in more than one overview is ambiguous and links nothing, unless the
ATC family agrees with exactly one of those overviews. Products already tied
to an overview that actually lists the brand are left as they are.
"""

from __future__ import annotations

import re
from collections import defaultdict

GENERIC_TOKENS = {
    "acid",
    "capsule",
    "capsules",
    "comp",
    "concentrate",
    "cream",
    "dispersion",
    "dosis",
    "drops",
    "emulsion",
    "forte",
    "human",
    "infusion",
    "injection",
    "influenza",
    "mcg",
    "mikrogram",
    "nasal",
    "nos",
    "ointment",
    "original",
    "pen",
    "powder",
    "prefilled",
    "solution",
    "solvent",
    "spray",
    "suspension",
    "syringe",
    "tablet",
    "tablets",
    "tetra",
    "vaccine",
    "vaccines",
}


def norm_token(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.casefold())


def _keep(token: str) -> bool:
    # Strain codes such as XBB.1.5 become "xbb15" and are shared by unrelated
    # brands. A brand token has to be letters only.
    return len(token) >= 5 and token not in GENERIC_TOKENS and token.isalpha()


def brand_stems(name: str) -> set[str]:
    """Leading brand, including a short first word joined to the next word.

    "BCG VACCINE AJ" has no single word of five letters. The stem is bcgaj,
    which is what both the ZIP and the approved list can share.
    """
    words = [norm_token(word) for word in name.split()]
    words = [word for word in words if word]
    stems: set[str] = set()
    for word in words:
        if word in GENERIC_TOKENS or word.isdigit():
            continue
        if _keep(word):
            stems.add(word)
        break
    acc = ""
    taken = 0
    for word in words:
        if word in GENERIC_TOKENS or word.isdigit():
            if len(acc) >= 5:
                break
            continue
        acc += word
        taken += 1
        if _keep(acc):
            stems.add(acc)
        if taken >= 2 or len(acc) >= 12:
            break
    return stems


def informative_tokens(name: str) -> set[str]:
    tokens: set[str] = set()
    full = norm_token(name)
    if _keep(full):
        tokens.add(full)
    for word in name.split():
        token = norm_token(word)
        if _keep(token):
            tokens.add(token)
    tokens |= brand_stems(name)
    return tokens


def brand_tokens(names: list[str]) -> set[str]:
    tokens: set[str] = set()
    for name in names:
        tokens |= informative_tokens(name)
    return tokens


def product_keys(name: str) -> set[str]:
    return informative_tokens(name)


def atc_family(atc: str) -> str:
    code = (atc or "").upper()
    return code[:5] if len(code) >= 5 else code


def _majority_family(group: list[dict]) -> list[dict]:
    buckets: dict[str, list[dict]] = defaultdict(list)
    for product in group:
        buckets[atc_family(product.get("atc") or "")].append(product)
    labeled = {family: rows for family, rows in buckets.items() if family}
    if len(labeled) <= 1:
        return group
    best = max(len(rows) for rows in labeled.values())
    winners = [family for family, rows in labeled.items() if len(rows) == best]
    if len(winners) != 1:
        return []
    return labeled[winners[0]]


def match_products(
    overview_tokens: dict[str, set[str]],
    products: list[dict],
    known_tokens: dict[str, set[str]] | None = None,
    slug_to_id: dict[str, str] | None = None,
) -> tuple[dict[str, list[str]], set[str]]:
    """Return overview id → drug ids, and which *new* overviews gained a link.

    `known_tokens` are brands already published in an ingested overview. They
    count as owners, so a brand that also appears there is not unique to a
    file we have not ingested yet. `slug_to_id` maps a product slug (or an
    internal substance id) back to that overview.
    """
    known_tokens = known_tokens or {}
    slug_to_id = slug_to_id or {}
    all_tokens: dict[str, set[str]] = {}
    for overview_id, tokens in [*known_tokens.items(), *overview_tokens.items()]:
        all_tokens.setdefault(overview_id, set()).update(tokens)

    token_owner: dict[str, set[str]] = {}
    for overview_id, tokens in all_tokens.items():
        for token in tokens:
            token_owner.setdefault(token, set()).add(overview_id)
    unique_tokens = {token: next(iter(owners)) for token, owners in token_owner.items() if len(owners) == 1}

    def supported(product: dict) -> str | None:
        keys = product_keys(product.get("name") or "")
        for slug in product.get("slugs") or []:
            overview_id = slug_to_id.get(slug)
            if overview_id and keys & all_tokens.get(overview_id, set()):
                return overview_id
        return None

    grouped: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for product in products:
        if supported(product):
            continue
        keys = product_keys(product.get("name") or "")
        owners = {key: unique_tokens[key] for key in keys if key in unique_tokens}
        owner_ids = set(owners.values())
        if len(owner_ids) != 1:
            continue
        overview_id = next(iter(owner_ids))
        primary = max(owners, key=len)
        grouped[(overview_id, primary)].append(product)

    chosen: list[tuple[str, dict]] = []
    for (overview_id, _primary), group in grouped.items():
        chosen.extend((overview_id, product) for product in _majority_family(group))

    families: dict[str, set[str]] = defaultdict(set)
    for product in products:
        overview_id = supported(product)
        family = atc_family(product.get("atc") or "")
        if overview_id and family:
            families[overview_id].add(family)
    for overview_id, product in chosen:
        family = atc_family(product.get("atc") or "")
        if family:
            families[overview_id].add(family)

    linked_ids = {product["drugId"] for _overview_id, product in chosen}
    extra: list[tuple[str, dict]] = []
    for product in products:
        if product.get("drugId") in linked_ids or supported(product):
            continue
        keys = product_keys(product.get("name") or "")
        owners: set[str] = set()
        for key in keys:
            owners |= token_owner.get(key, set())
        family = atc_family(product.get("atc") or "")
        agreeing = [overview_id for overview_id in owners if family and family in families.get(overview_id, set())]
        if len(agreeing) == 1:
            extra.append((agreeing[0], product))

    links: dict[str, list[str]] = defaultdict(list)
    for overview_id, product in [*chosen, *extra]:
        links[overview_id].append(product["drugId"])
    matched = {overview_id for overview_id in overview_tokens if links.get(overview_id)}
    return dict(links), matched
