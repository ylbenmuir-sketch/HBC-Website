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

- [x] Primary phone number (`PHONE`) — (615) 331-8762. Confirmed by Ben. The
      phone UI (header tel link, call buttons, the sticky bar's dial button)
      renders everywhere as a result.
- [ ] Response-time claim "within one business day" (`RESPONSE_TIME`)
- [x] Same-day callback (`SAME_DAY_CALLBACK`) — Confirmed by Ben. This is what
      puts "A real person calls you back **today**" in the hero and in the
      end-of-page CTA band, and it is an operational promise rather than a
      tagline: it can only stay while the centers can actually keep it.
      Narrower than `RESPONSE_TIME` above, which is the wording interior pages
      use and is still open. Unverifying it drops the timeframe and the copy
      falls back to "A real person calls you back."
- [ ] "Most new clients start within a week" (`START_TIMING`)
- [x] First-visit duration (`FIRST_VISIT_DURATION`) — 60 minutes. Confirmed by Ben.
- [x] Typical session length (`SESSION_LENGTH`) — 30 minutes. Confirmed by Ben.
- [x] Pricing — `$125` per session, `$1,300` for 12 (`$200` less than paying
      per session), Brain Map `$150` separate. Confirmed by Ben. `PACKAGE_NOTE`
      carries the two caveats — the Brain Map is required before regular
      sessions begin and does not count toward the twelve — and must appear
      wherever the package price does.
- [x] Insurance & HSA/FSA (`INSURANCE_POLICY`) — self-pay, HSA/FSA accepted,
      superbill on request. Confirmed by Ben, verbatim; do not reword.
- [x] Practitioner training (`TRAINING_CLAIM`) — OchsLabs certification plus
      in-house certification over three months. Confirmed by Ben, verbatim;
      **no superlative or ranking claim** is to be added to it. Two
      certifications, and the word appears twice on purpose: the in-house step
      is a certification in its own right, not a training period before one.
- [x] **Session count disagreement — resolved.** `TRAINING_CLAIM` briefly said
      "more than 150,000 sessions" (written in error) against `STAT_SESSIONS`'s
      "140,000+", with `/about` rendering both. Fixed by removing the figure
      rather than correcting it: the sentence now reads "Every session we've
      delivered has shaped how we train" and the count is stated once, in the
      proof band. `STAT_SESSIONS` is unchanged at 140,000+ and is the single
      source — `/about`'s meta description and the build-log label now
      interpolate it instead of repeating it.
- [ ] Concierge service area & pricing (`CONCIERGE_TAG`)
- [ ] Community lists per center (`planning.communitiesTag` in `lib/locations.ts`
      — Nashville and Murfreesboro). Also drives schema `areaServed`, and is
      the only thing the assistant's `confirmTag` gate still excludes.
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

- [x] 140,000+ sessions (`STAT_SESSIONS`) — Confirmed by Ben. The **only**
      source for this figure. Anything that needs it reads it from here;
      nothing restates it.
- [x] Founding year 2016 (`ESTABLISHED_YEAR`) — Confirmed by Ben.
- [x] Google rating (`REVIEWS`) — 5.0 at both open centers, with no rating
      below five at either. Confirmed by Ben. `SHOW_REVIEWS` gates every review
      surface off this one flag: the homepage band, the /stories band, and the
      line in each open center's hero.
- [x] Review counts (`reviewCount`, `lib/locations.ts`) — Nashville 144,
      Murfreesboro 15. Confirmed by Ben. Per center, like the hours: the
      sitewide 159 the two bands print is `combinedReviewCount()` summing
      these, so no total is typed anywhere and the band cannot drift from the
      pages it adds up. Franklin has none and renders none.
- [ ] Link the live Google profiles — the bands name Google ("Read them
      unfiltered on Google") and link nowhere. **Blocked on a usable read
      link, not on a decision.** Ben supplied two `share.google` shorteners;
      both resolve to a Google *Search* results page for the business
      (`/search?…&q=Harmonized+Brain+Centers+-+Nashville&kgmid=/g/11cs29xsgj`
      and `…kgmid=/g/11l68g9yns`) — a knowledge panel, not a review listing —
      and the resolved URLs carry per-session junk (`sxsrf` with a timestamp,
      `sca_esv`, `biw`/`bih` viewport dimensions, `client`, `utm_source`) that
      must not be hardcoded into a page. Neither opens a write dialog.
      Candidates that resolve clean and token-free, both HTTP 200 and
      unverified visually because Maps renders client-side:
      `https://www.google.com/maps?cid=690359003920868215` (Nashville) and
      `…cid=978389547119317468` (Murfreesboro) for the profile, or the same
      CIDs' `data=!4m6!3m5!1s…!9m1!1b1` form for the reviews tab. CIDs were
      read out of Ben's own `g.page` links, so they are the right businesses.
      Pick one form, click both, then wire.
- [x] Google "write a review" links (`reviewWriteUrl`, `lib/locations.ts`) —
      stored per center, rendered nowhere. Post-visit follow-up only; see the
      field's own note for why they stay off the public site.
- [ ] **Do not add `AggregateRating` to the JSON-LD.** Deliberate, not an
      oversight. Self-serving review markup on the reviewed business's own
      site is a manual-action risk, and these figures are hand-entered rather
      than machine-sourced from Google — the markup would assert a precision
      the data doesn't have. Revisit only if the counts become automated
      *and* the markup is confirmed to be eligible.
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

- [x] Homepage and `/stories` quotes (`TESTIMONIALS` in `lib/site-config.ts`)
      — all three are real, permissioned, and `verified: true`. Quoted
      verbatim; do not tighten or paraphrase permissioned copy.
- [ ] **Location-page quotes** (`quote` on each entry in `lib/locations.ts`) —
      still sample copy. They are gated behind draft mode and do **not** ship,
      so production shows the "Good to know" block instead. Franklin's is the
      `FOUNDER_QUOTE` wording typed in as a plain string, which means it is
      not gated by that `Verifiable` — replace it rather than confirming it
      here.
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
