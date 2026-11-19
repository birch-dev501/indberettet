# Omdirigeringer og 404

Danish spellings and short company names land on the real page. An unknown address explains itself.

## Sub-features

- `alias-substance` opens `/stof/oxycodon/` and `/stof/semaglutid/` on the English slug.
- `alias-company` opens `/firma/novo/` on Novo Nordisk.
- `missing-page` shows a 404 with the word from the address and a search field.

## How to get to it (user POV)

Type the address. A known spelling moves on. An unknown one stays and offers search.

## Driving it with verify.mjs

Preconditions:

- The export is served and the doctor check passed.

- Open the three aliases and wait until the address contains the canonical path.
- Open `/stof/findes-ikke-xyz/`. The response is 404, the heading says the page is missing, and the address word is on the page next to a search box.

## Gotchas

- GitHub Pages has no server redirects. The alias is a small HTML page that sends the browser on.
- The static server used here returns `404.html` for unknown paths, same as Pages.
