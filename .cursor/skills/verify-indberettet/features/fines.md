# Bøder

The MSD company page lists the Vioxx cases.

## Sub-features

- `fines-vioxx` shows Vioxx inside the fines section.

## How to get to it (user POV)

Open Firmaer, then MSD. The section heading is `Overtrædelser og bøder`.

## Driving it with verify.mjs

Preconditions:

- The export is served and the doctor check passed.

- Open `/firma/msd/`. The text of `#boeder` contains `Vioxx`.

## Gotchas

- The section is below the product table. Scroll is not required for the text assertion.
