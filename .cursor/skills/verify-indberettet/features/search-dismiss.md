# Luk søgningen

The result list can be closed without deleting the query, and a cross clears it.

## Sub-features

- `search-clear` shows a cross only while the field has text, then clears and closes.
- `search-outside` closes the list on a click outside and keeps the text.
- `search-escape` closes on Escape and clears on a second Escape.
- `search-refocus` opens the list again when the field is focused and still has text.

## How to get to it (user POV)

Use the header search or the search on the front page.

## Driving it with verify.mjs

Preconditions:

- The export is served and the doctor check passed.

- Fill `vioxx` in both search fields. The cross `Ryd søgning` is present and the results are open.
- Click the page heading. The results disappear, the text stays, and a polite live region says the list is closed.
- Focus the field. The results return.
- Press Escape. The results close and the text stays.
- Press Escape again. The field is empty and the cross is gone.

## Gotchas

- The cross is inside the search, so choosing it is not an outside click.
- Both the header field and the front-page field are checked.
