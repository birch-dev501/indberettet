# Udtræk

The front page shows the extraction date, and a shrunk extract is rejected.

## Sub-features

- `extract-date` shows a machine-readable date on the front page.
- `extract-guard` accepts the current files and rejects a simulated drop.

## How to get to it (user POV)

The date is in the line `Data opdateret` on the front page. The guard runs in the monthly workflow, not as a button.

## Driving it with verify.mjs

Preconditions:

- The export is served and the doctor check passed.

- The front page has a `time` element whose `dateTime` is `YYYY-MM-DD`.
- `scripts/validate_extract.py` exits 0.
- The same script with `--simulate-drop` exits non-zero.

## Gotchas

- A real download from the medicines agency is not part of this command. The workflow runs that when someone starts it.
