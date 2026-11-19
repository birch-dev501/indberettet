# Sitemap

Search engines get every public page and a pointer from robots.txt.

## Sub-features

- `sitemap-robots` names the sitemap from robots.txt.
- `sitemap-sample` requests 50 sitemap addresses and expects 200.

## How to get to it (user POV)

Open `/robots.txt` and `/sitemap.xml`.

## Driving it with verify.mjs

Preconditions:

- The export is served and the doctor check passed.

- robots.txt contains the absolute sitemap address.
- The sitemap is an `urlset` with more than 1000 addresses.
- Fifty evenly spaced addresses return 200 on the local server.

## Gotchas

- Sitemap addresses use the public host. The check swaps that host for the local server.
