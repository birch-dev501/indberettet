# Usikkerhed

The learning page explains intervals and p-values with numbers already on the trial page.

## Sub-features

- `page` is `/forstaa-usikkerhed/` and the trial page links to it.
- `numbers` include 8 of 18,198, 162 of 18,325, an interval through 0, and an interval through 1.

## How to get to it (user POV)

Open Forsøgstal. Follow «Sådan læses intervallet og p-værdien».

## Driving it with verify.mjs

Preconditions:

- `npm run verify` has served the export.

The check opens `/forstaa-forskning/`, requires a link to `/forstaa-usikkerhed/`, then requires the heading and the published figures 3,70 til 7,39, 0,22, 0,90 til 2,00, and 2,30 til 6,68.

## Gotchas

- The 95,0 % credibility interval from Polack is not labelled as a confidence interval.
- Hazard ratio uses 1 as the null. A risk difference uses 0.
