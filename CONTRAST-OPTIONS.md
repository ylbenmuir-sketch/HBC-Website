# Two colour decisions — options, not changes

Nothing in this file has been applied. Both tokens are unchanged in
`app/globals.css`.

Every number below is measured the same way the hero was: hide every glyph,
photograph the page, read the composited pixel under the text, compute the WCAG
ratio. The arithmetic and the browser agree to the second decimal on all of
them.

---

## 1. Gold on ivory — 3.24:1 today

`--gold: #a9853f` on `--ivory: #fbf8f1`.

This is one decision covering the header wordmark, every testimonial theme
label, every team member role, every numbered step marker, the location card
city lines, the FAQ `+` marker and the audience labels — all 25 routes, every
width.

### Minimum darkening

Darkened along the colour's own ray in sRGB, which is the smallest move that
leaves the hue where it is.

| | Hex | rgb | vs ivory | vs ivory-2 | vs white |
| --- | --- | --- | --- | --- | --- |
| today | `#a9853f` | 169, 133, 63 | **3.24** | 2.97 | 3.43 |
| **minimum for ivory** | `#8c6e34` | 140, 110, 52 | **4.50** | 4.13 | 4.78 |
| minimum for every light backdrop | `#856831` | 133, 104, 49 | 4.92 | **4.52** | 5.22 |

`#8c6e34` is 82.8% of today's value. Nothing gold currently sits on ivory-2, so
`#8c6e34` clears everything that exists; `#856831` is the value that would also
survive somebody putting a gold label on an ivory-2 band later.

### The catch: this token is not only used on light

Gold is also text **on navy**, and darkening it makes those worse — including
the Trisha role line I fixed this session, which depends on gold reaching
4.69:1 on the deepest navy.

| | homepage step numerals | location step numerals | Trisha role line |
| --- | --- | --- | --- |
| today `#a9853f` | 4.20 | 4.20 | **4.69** |
| `#8c6e34` | **3.02** | **3.02** | **3.37** |
| `#856831` | **2.76** | **2.76** | **3.09** |

So there are really two options:

- **A — darken `--gold` globally.** One line. Fixes every gold-on-light pairing.
  Takes five gold-on-dark pairings from 4.20/4.69 down to ~3.0, and undoes the
  Trisha fix.
- **B — split the token.** Keep `--gold: #a9853f` for dark backgrounds, add a
  second token (`--gold-ink: #8c6e34` or similar) and use it in the ~12 rules
  that put gold on ivory or white. Fixes both directions. Costs a token and a
  rule about which to use where.

`--gold-soft` (`rgba(169,133,63,.35)`) is a border colour only and is unaffected
either way.

### Rendered — the header wordmark at 414px, 3×

| | |
| --- | --- |
| today, 3.24:1 | ![](contrast-opt-gold-wordmark-current.png) |
| `#8c6e34`, 4.50:1 | ![](contrast-opt-gold-wordmark-8c6e34.png) |
| `#856831`, 4.92:1 | ![](contrast-opt-gold-wordmark-856831.png) |

---

## 2. Sage on ivory-2 — 4.43:1 today

`--sage-deep: #5e7360` on `--ivory-2: #f4eee1`.

One decision covering every section eyebrow on the site, plus the inline links
in FAQ answers, breadcrumbs, the founder citation link and the sage note panels.

### Minimum darkening

| | Hex | rgb | vs ivory | vs ivory-2 | vs sage-soft | vs white |
| --- | --- | --- | --- | --- | --- | --- |
| today | `#5e7360` | 94, 115, 96 | 4.83 | **4.43** | **4.23** | 5.13 |
| minimum for ivory-2 | `#5d725f` | 93, 114, 95 | 4.90 | **4.50** | 4.30 | 5.20 |
| **minimum for ivory-2 and sage-soft** | `#5a6f5c` | 90, 111, 92 | 5.13 | **4.70** | **4.49** | 5.44 |

Two things worth knowing:

- The darkest backdrop sage sits on is not ivory-2, it is `--sage-soft`
  (`#e6ebe2`), the fill of the `.note-sage` panels on 11 routes — 4.23:1. Fixing
  ivory-2 alone at `#5d725f` leaves those at 4.30. `#5a6f5c` clears both, at
  4.49 for sage-soft, which rounds to 4.5 and is the honest floor.
- The change is 96.2% of today's value — one to four units per channel. It is
  not visible side by side.
- `--sage-deep` is used as a *background* in exactly one place (`.loc-card .soon`
  badge, ivory text on sage-deep). Darkening it raises that pairing's contrast,
  so nothing breaks in the other direction. Unlike gold, this token has no
  conflict.

### Rendered — the "What could change" eyebrow at 414px, 3×

| | |
| --- | --- |
| today, 4.43:1 | ![](contrast-opt-sage-eyebrow-current.png) |
| `#5d725f`, 4.50:1 | ![](contrast-opt-sage-eyebrow-5d725f.png) |
| `#5a6f5c`, 4.70:1 | ![](contrast-opt-sage-eyebrow-5a6f5c.png) |

---

## What I'd need from you

1. **Gold** — A (one token, gold-on-dark gets worse) or B (split the token)? Or
   leave it.
2. **Sage** — `#5d725f`, `#5a6f5c`, or leave it.

Neither is applied. Say which and it's a one-line change for sage and a
one-or-twelve-line change for gold.
