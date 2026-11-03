Self-hosted web fonts (Ben, 2026-11-03): the build never fetches Google
Fonts, so a flaky font download can't fail a deploy (it failed Vercel and
local Turbopack builds several times — "next/font/google queries have exactly
one entry").

These are the exact latin-subset variable files Google Fonts served on
2026-11-03 (byte-identical, by SHA-256, to the files `next/font/google` put in
`.next/static/media` before the switch), loaded by `next/font/local` in
app/layout.tsx:

- `CormorantGaramond-Latin.woff2`        Cormorant Garamond, upright, wght 300–700 (used 400–600)
- `CormorantGaramond-Italic-Latin.woff2` Cormorant Garamond, italic, wght 300–700 (used 400–600)
- `DMSans-Latin.woff2`                   DM Sans, wght 100–1000 (used 400–600)

Only the latin subset: the site's text has no latin-ext, cyrillic or
vietnamese characters (checked across every prerendered page). The two
characters outside latin it does use, → and ★, are in no Google subset of
either family and come from the system font as before.

Licence: both families are SIL Open Font License 1.1 — free to self-host.
The OG images use the static instances in lib/og/fonts/ (Satori cannot read
variable fonts).

To update: fetch the css2 URL with a modern browser user agent, take the
`/* latin */` block's woff2 URL for each family, and replace the file.
