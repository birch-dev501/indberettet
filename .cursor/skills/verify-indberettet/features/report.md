# Fejlindberetning

A reader can open a public GitHub issue from the page they are on.

## Sub-features

- `report-page` links `Meld fejl på denne side` to a prefilled issue form.
- `report-footer` links the general footer prompt to the issue chooser.

## How to get to it (user POV)

Open a substance page. The link sits under the page. The footer link is on every page.

## Driving it with verify.mjs

Preconditions:

- The export is served and the doctor check passed.

- Open `/stof/covid-19-vaccines/`. `Meld fejl på denne side` points at `github.com/birch-dev501/indberettet/issues/new` and includes the substance path.
- `Fandt du en fejl? / Foreslå en forbedring` points at `issues/new/choose`.

## Gotchas

- The links leave the site. The check reads the address. It does not open GitHub.
