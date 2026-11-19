# App

The exported site exposes a manifest and registers a service worker.

## Sub-features

- `pwa-manifest` names the site and uses a standalone display.
- `pwa-worker` registers the worker under the site path.

## How to get to it (user POV)

Open the front page. The browser reads the manifest link. No install button has to be pressed.

## Driving it with verify.mjs

Preconditions:

- The export is served and the doctor check passed.

- Open `/`. The manifest link resolves to JSON whose `name` is `Indberettet`, whose `start_url` contains `/indberettet/`, and whose `display` is `standalone`.
- A service worker registration for `/indberettet/` has a script URL containing `/indberettet/sw.js`.

## Gotchas

- The worker may still be installing when the check reads it. Accept active, installing, or waiting.
