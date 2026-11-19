# Kort og bredde

Card text stays away from the rounded edge, and a phone does not scroll sideways.

## Sub-features

- `layout-padding` keeps visible card text at least 12px from the card border.
- `layout-overflow` has no horizontal page scroll at 360px and 390px.

## How to get to it (user POV)

Open the front page, a substance, MSD, the catalogue, the research page, and the scandals page.

## Driving it with verify.mjs

Preconditions:

- The export is served and the doctor check passed.

- At 360, 390, and 1280, open `/`, `/stof/covid-19-vaccines/`, `/firma/msd/`, `/katalog/`, `/forstaa-forskning/`, and `/boedesager/`.
- No visible text node in `.card` or `.caveat` is closer than 12px to that box. Skip screen-reader-only text and closed details.
- At 360 and 390, `scrollWidth` does not exceed `clientWidth` by more than 1px.

## Gotchas

- Text inside a nested scrolling box is clipped to that box before the gap is measured.
