---
name: verify-indberettet
description: "Build the Indberettet static export, serve it under /indberettet, and drive it with Playwright. Use for /verify-indberettet or before calling a site change done."
---

# Verify Indberettet

[VISION.md](../../../VISION.md) is the north star. A check that only proves a behavior the vision rejects is not done.

The surface is the static Next.js site. One command builds it, serves it, and runs every feature below at 1280px and 390px. A second copy cannot share the port.

## Launch

From the repository root:

```
npm run verify
```

That runs `.cursor/skills/verify-indberettet/verify.mjs`. It builds with `npm run build`, serves `out/` at `http://127.0.0.1:39241/indberettet/`, then drives the site. Ready means the front page returns 200 and contains the site name. Override the port with `VERIFY_PORT` only when 39241 is already taken. Do not point the command at the dev server.

## Doctor

The script requests the front page before the first drive. A non-200 response or a page without the site name stops the run. If a drive fails halfway, stop the server the script started and run `npm run verify` again. Do not reuse a server left from a failed run.

## Drive

Playwright launches headless Chromium. The header search is `search[data-search=header] input[role=searchbox]`. Results are `.result-groups`. Type filters on the results page are the tablist named `Afgræns typen`.

The feature files in `features/` are the map. The script runs every feature. A journey that cannot meet its precondition fails. Do not loosen the assertion.

## Evidence

Screenshots and the pass or fail lines go to `.verify/evidence/`. That directory is gitignored. A passing run prints `Indberettet bestod.` and exits 0. Any failed assertion prints the reason and exits 1.

## Cleanup

The script closes the browser and the server it opened. It does not delete `.verify/evidence/`. Do not kill other processes by name.

## Helpers

`npm run verify` is the only check. The older Playwright scripts are folded into this command.
