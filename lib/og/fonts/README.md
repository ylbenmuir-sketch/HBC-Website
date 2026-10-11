Static instances of the two families the site loads through `next/font`,
for `ImageResponse` in the three `opengraph-image.tsx` routes
(`lib/og/render.tsx`). Satori cannot read the variable fonts `next/font`
downloads, so these are the Google Fonts static builds of the same faces:

- `CormorantGaramond-SemiBold.woff` — Cormorant Garamond 600 (headlines)
- `DMSans-Medium.woff` — DM Sans 500 (eyebrow, wordmark, footer)

Both are SIL Open Font License 1.1, from fonts.gstatic.com.
