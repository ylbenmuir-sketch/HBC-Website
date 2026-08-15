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

- [Rowney ] Founder last name (`FOUNDER_LAST_NAME`) — until then the site shows "Sheri"
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
- [ ] Hours for Nashville & Murfreesboro (`lib/locations.ts`)

## Statistics

- [ ] 140,000+ sessions (`STAT_SESSIONS`)
- [ ] Founding year 2016 (`ESTABLISHED_YEAR`)
- [ ] Google rating & review count (`REVIEWS`) — block hidden until verified
- [ ] Canonical domain (`SITE_URL`)

## Locations

- [ ] Nashville street address & ZIP (`lib/locations.ts`) — hidden until confirmed
- [ ] Murfreesboro street address & ZIP — hidden until confirmed
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
- [ ] **Harmonized Brain Map — heat-map render** (homepage Brain Map section).
      Ship the corrected legend from Phase 7.5, not the current one.

## Articles

- [ ] Finish the five draft resource articles (`lib/resources.ts`) — drafts
      are excluded from production builds and the sitemap
- [ ] Confirm byline & review date on "Homework battles"

## Legal

- [ ] Footer disclaimer reviewed by counsel (`DISCLAIMER` — preserve verbatim)
- [ ] Individual-experiences disclaimer present wherever testimonials render
