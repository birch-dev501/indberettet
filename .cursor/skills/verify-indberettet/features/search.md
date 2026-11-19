# Søgning

The header search returns mixed groups for a query.

## Sub-features

- `search-cases` shows a Bødesager group for vioxx, viox, bextra, pfizer, and oxycodon.
- `search-merck` shows MSD and German Merck KGaA, with the two labels.
- `search-msd` shows MSD and does not show the German label.

## How to get to it (user POV)

Open the front page. Use the search field in the header.

## Driving it with verify.mjs

Preconditions:

- `npm run verify` has served the export and the doctor check passed.

- **Cases.** Fill the header search with `vioxx`, then `viox`, `bextra`, `pfizer`, and `oxycodon`. Each result list contains `Bødesager` and the drug name.
- **Both Mercks.** Fill `merck`. The list contains `MSD (Merck Sharp & Dohme)`, `USA og Canada`, `Merck (Merck KGaA)`, and `Tysk Merck`.
- **MSD only.** Fill `MSD`. The list contains MSD and does not contain `Tysk Merck`.

## Gotchas

- The catalogue and company pages keep their own filters. This journey uses the header field.
- Results are the visible text of `.result-groups`, including groups below the first screen of the dropdown.
