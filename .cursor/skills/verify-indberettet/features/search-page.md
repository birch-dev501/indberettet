# Resultatside

`/soeg/?q=` lists every group and can hide all but one type.

## Sub-features

- `search-page-filters` shows a tablist named `Afgræns typen`.
- `search-page-cases` keeps Bextra when only Bødesager is selected.

## How to get to it (user POV)

Search, then follow `Vis alle resultater`. Or open `/soeg/?q=Pfizer`.

## Driving it with verify.mjs

Preconditions:

- The export is served and the doctor check passed.

- Open `/soeg/?q=Pfizer`. The tablist contains `Bødesager`.
- Choose the Bødesager button. The result text contains `Bextra` and no longer contains a Stoffer count.

## Gotchas

- The type buttons stay on the page after a filter. Assert against `.result-groups`, not the whole page.
