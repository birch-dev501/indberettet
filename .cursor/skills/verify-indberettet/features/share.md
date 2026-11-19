# Delingsbillede

A shared link carries a 1200 by 630 image.

## Sub-features

- `share-home` sets og:image on the front page.
- `share-substance` and `share-company` set an image for semaglutide and MSD.

## How to get to it (user POV)

View the page source. The image is not something a reader clicks.

## Driving it with verify.mjs

Preconditions:

- The export is served and the doctor check passed.

- `/`, `/stof/semaglutide/` and `/firma/msd/` have an absolute `og:image` under the site and `twitter:card` `summary_large_image`.
- Each image returns 200 and its PNG header is 1200 by 630.

## Gotchas

- The image text says the numbers are suspected reactions, not proof of cause.
