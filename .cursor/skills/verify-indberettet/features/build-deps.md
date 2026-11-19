# Byggeafhængigheder

The static build must succeed with only the Python packages named in `requirements.txt`.

## Sub-features

- `clean-venv` builds the site with a new virtualenv on `PATH`.
- `workflow-install` requires Pages and the monthly workflow to install that file and `fonts-dejavu-core`.

## How to get to it (user POV)

There is no page. A missing package shows up as a failed GitHub Pages build.

## Driving it with verify.mjs

Preconditions:

- `npm run verify` creates `.verify/py` with `python3 -m venv --clear` and installs `requirements.txt` before `npm run build`.
- `python3` during that build is the virtualenv, so a package installed only on the machine is invisible.
- Both workflow files contain `pip install -r requirements.txt` and `fonts-dejavu-core`.

## Gotchas

- Fonts are an operating-system package, not a pip package. The image script stops if DejaVu and Liberation are both missing.
