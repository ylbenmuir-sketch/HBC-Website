# Content verification checklist

Every unverified fact lives in `lib/site-config.ts` (or is marked with
`[bracketed]` notes in `lib/locations.ts`, `lib/team.ts`, `lib/resources.ts`).

**How the gating works**

- **Draft mode** (`npm run dev`, or `NEXT_PUBLIC_SHOW_DRAFT_CONTENT=true`):
  unverified values render with visible gold tags so nothing hides.
- **Production build**: unverified values do **not** render — the blocks that
  depend on them are hidden. No `[bracketed]` note, fake phone number, sample
  testimonial, or unapproved celebrity content can ship.
- `REQUIRE_VERIFIED_CONTENT=true npm run build` makes the launch build **fail**
  while any required fact below is unverified (see `lib/content-validation.ts`).

To verify a fact: replace its `value` in `lib/site-config.ts` and set
`verified: true` (or replace the `[bracketed]` string in the data file).

## Identity & people

- [x] Founder last name (`FOUNDER_LAST_NAME`) — "Rowney". Confirmed by Ben.
      `FOUNDER_DISPLAY_NAME` now resolves to "Sheri Rowney" everywhere, and
      the `Person` node in the Organization schema carries the full name.
- [ ] Founder quote wording personally approved (`FOUNDER_QUOTE`)
- [ ] Founder story page copy (drafted with Sheri) — `app/about/founder/page.tsx`
- [ ] Real founder photograph approved (no AI likeness) — `/images/founder.jpg`
- [ ] Practitioner names, roles, bios, certifications (`lib/team.ts`)
- [ ] Client care coordinator name (`lib/team.ts`)

## Contact & operations

- [ ] Primary phone number (`PHONE`) — phone UI is hidden everywhere until verified
- [ ] Response-time claim "within one business day" (`RESPONSE_TIME`)
- [ ] "Most new clients start within a week" (`START_TIMING`)
- [ ] First-visit duration (`FIRST_VISIT_DURATION`)
- [ ] Typical session length (`SESSION_LENGTH_TAG`)
- [ ] Pricing (`PRICING_TAG`) / HSA-FSA policy (`HSA_FSA_TAG`) / insurance wording (`INSURANCE_TAG`)
- [ ] Concierge service area & pricing (`CONCIERGE_TAG`)
- [ ] Practitioner training & progress-review process wording (`TRAINING_CLAIM_TAG`)
- [ ] Brain Map differentiator claim (`BRAIN_MAP_CLAIM`) — the hedged "as far as
      we know" wording ships only once verified. Do **not** replace it with
      "the first in the country" without a documented basis.
- [x] Hours for Nashville & Murfreesboro (`hours` in `lib/locations.ts`) —
      Confirmed by Ben. Nashville: Tue–Fri 9:00–18:00, Sat 8:00–15:00, closed
      Sun & Mon. Murfreesboro: Tue–Thu 9:00–18:00, closed Fri–Mon. Held as
      structured data per center, not display strings, so the location page,
      the cards, and the `openingHoursSpecification` in each LocalBusiness all
      read one source. Franklin records no hours until it has an opening date.

## Statistics

- [ ] 140,000+ sessions (`STAT_SESSIONS`)
- [ ] Founding year 2016 (`ESTABLISHED_YEAR`)
- [ ] Google rating & review count (`REVIEWS`) — block hidden until verified
- [x] Canonical domain (`SITE_URL`) — `https://harmonizedbraincenterstn.com`,
      apex canonical (`www` 301s to it). Confirmed by Ben.

## Locations

- [x] Nashville street address & ZIP (`lib/locations.ts`) — 197 Thompson Ln,
      Suite S, Nashville, TN 37211. Confirmed by Ben. Renders on-page and in
      the `PostalAddress` schema, with `geo` + `hasMap` alongside it.
- [x] Murfreesboro street address & ZIP — 206 W Chestnut St, Murfreesboro, TN
      37130. Confirmed by Ben. Same rendering and schema as Nashville.
- [ ] Franklin street address & ZIP — still `[placeholders]`; the page stays a
      coming-soon waitlist and ships no LocalBusiness until it opens
- [ ] Murfreesboro parking note
- [ ] Franklin opening date (`FRANKLIN_OPENING`) — shows "Coming soon" until verified
- [ ] Communities-served lists per location
- [ ] Directions / arrival details per location
- [ ] Embedded maps (currently a styled placeholder, dev-labeled only)

## Testimonials & celebrity

- [ ] Replace all sample quotes with verified client quotes
      (`TESTIMONIALS` in `lib/site-config.ts`, set `verified: true`;
      location-page quotes in `lib/locations.ts`) — samples never ship
- [ ] Film/collect video testimonials (optional)
- [ ] **Trisha Yearwood — launch blocker.** Enable only with written permission
      for: name · likeness · image/video · quote · "Grammy-winning artist"
      credit · commercial website use. Then set
      `NEXT_PUBLIC_FEATURE_CELEBRITY=true`. The site is complete without it.

## Photography (replace PlaceholderPlate / weak images)

Needed shots — real, documentary, naturally lit, multi-location, not one person:

- [ ] Practitioner with adult client · practitioner with child
- [ ] Parent consultation · adult session · child session
- [ ] Founder candid · team collaboration
- [ ] Nashville: exterior · waiting room · session room (current room photo
      should be reshot professionally)
- [ ] Murfreesboro: exterior · waiting room · session room
- [ ] Franklin: exterior or architectural concept
- [ ] Equipment detail · welcoming arrival experience
- [x] **Harmonized Brain Map — heat-map render** (homepage Brain Map section)
      — `/images/brain-map-heat.png`, shipped with the corrected Phase 7.5
      legend ("Lower amplitude / Typical range / Higher amplitude")
- [ ] **Brain lobe function diagram** (`/how-lens-works`) — still a
      `PlaceholderPlate`. Fix the F3/F8 mislabel, the empty Frontal Lobe
      bullet, and the diagnostic electrode labels first — see Phase 7.5.
- [ ] **Open Graph image** — `/images/og-default.jpg` needs a properly
      designed 1200×630 version. What ships today is a stopgap composited in
      code: `hero.jpg` under a navy scrim with the logo lockup and service
      area, set in Georgia/Helvetica because the brand faces (Cormorant
      Garamond, DM Sans) were not available to the compositor. It is the one
      image most people see before they ever reach the site — every link
      shared to Facebook, LinkedIn, iMessage, or Slack renders it. Replace the
      file at the same path and no code changes are needed; the dimensions and
      `alt` in `app/layout.tsx` already match. Per-location and per-article
      images are a later step (SEO-AUDIT.md §6.3 item 33).

## Articles

- [ ] Finish the five draft resource articles (`lib/resources.ts`) — drafts
      are excluded from production builds and the sitemap
- [ ] Confirm byline & review date on "Homework battles"

## Legal

- [ ] Footer disclaimer reviewed by counsel (`DISCLAIMER` — preserve verbatim)
- [ ] Individual-experiences disclaimer present wherever testimonials render
