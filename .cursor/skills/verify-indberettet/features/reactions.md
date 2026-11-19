# Reaktionstyper

A substance page can open an organ class and link a reaction to a Danish article.

## Sub-features

- `reaction-open` expands the first organ class.
- `reaction-link` does not use a `?q=` search URL.
- `reaction-platelets` links Thrombocytopenia to the low-platelet article.

## How to get to it (user POV)

Open COVID-19 vaccines. The section is `Typer af reaktioner`. The term table is `Foretrukne termer`.

## Driving it with verify.mjs

Preconditions:

- The export is served and the doctor check passed.

- Open `/stof/covid-19-vaccines/`. Choose the first button in `#reaktionstyper`. Its `aria-expanded` becomes `true`, and the detail contains a link whose address does not include `?q=`.
- No `a.term-link` on the page uses `?q=`.
- Filter the term table with `Thrombocytopenia`. The Blodplademangel row links to `blodplademangel` and not `purpura`.

## Gotchas

- The term filter only shows matching rows. Wait for the Blodplademangel row.
