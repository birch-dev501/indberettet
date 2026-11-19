# Beregner

The research page calculator adds reactions and updates the harm list.

## Sub-features

- `calculator-add` adds two reaction rows.
- `calculator-number` shows the new NNH after a risk is entered.

## How to get to it (user POV)

Open `Sådan læses forsøgstal` and go to the section `nnh`.

## Driving it with verify.mjs

Preconditions:

- The export is served and the doctor check passed.

- Open `/forstaa-forskning/#nnh`. Count `.balance-list li` inside `#nnh`.
- Choose `Tilføj reaktion` twice. The count is two higher.
- In the last reaction row, set `Risikotal` to `1000`. The list shows `1.000`.

## Gotchas

- The example preset already has one reaction. The proof is the increase, not a fixed starting count.
- Danish formatting writes one thousand as `1.000`.
