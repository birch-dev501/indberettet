# Tabeloverskrift

A long table keeps its header visible while the rows scroll.

## Sub-features

- `table-sticky` leaves the header at the top of the scrolling box after the rows move.

## How to get to it (user POV)

Open COVID-19 vaccines and find `Foretrukne termer`.

## Driving it with verify.mjs

Preconditions:

- The export is served and the doctor check passed.

- Open `/stof/covid-19-vaccines/`. Scroll `#foretrukne-termer .table-scroll` down by 240px.
- The first header cell stays within 4px of the box top, and a lower row has moved up.

## Gotchas

- Scroll the table box, not the page. The header sticks inside that box.
