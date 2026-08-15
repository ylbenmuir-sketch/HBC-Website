# SITE-AUDIT-INPUT

Factual state of the Harmonized Brain Centers website, prepared as input for an
external messaging and conversion audit. Reconnaissance only — no analysis, no
recommendations, no critique. All copy is verbatim from files opened directly.

Project root: `hbc-website-v2_4/` (inside `HBC Website - 7.14.26/`)
Report compiled: 2026-08-14

**Note on typography:** the source JSX uses HTML entities (`&mdash;`,
`&rsquo;`, `&ldquo;`, `&middot;`, `&amp;`). This report renders them as the
characters a visitor sees (— ’ “ · &). Where copy lives in `.ts` data files it
is already written as literal characters. No wording has been altered.

---

# 1. READ THIS FIRST — the draft-content flag

**The single most consequential fact about this site: a large share of the copy
in the codebase does not render to real visitors.**

## The mechanism

`lib/site-config.ts:22-24`:

```ts
export const SHOW_DRAFT_CONTENT =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_SHOW_DRAFT_CONTENT === "true";
```

## Current value in production

**`false`.**

In a production build `NODE_ENV === "production"`, so the first clause is false.
The second clause depends on `NEXT_PUBLIC_SHOW_DRAFT_CONTENT`, which is present
only as a **commented-out line** in `.env.example:14`. There is no `.env.local`
or any other `.env` file in the project, and no `vercel.json`, `netlify.toml`,
or `.vercel` directory. Nothing in the repository sets that variable to `true`.

A second flag, `FEATURE_CELEBRITY` (`lib/site-config.ts:77-78`), is
`NEXT_PUBLIC_FEATURE_CELEBRITY === "true" || SHOW_DRAFT_CONTENT` — also
commented out in `.env.example:19`, therefore also **`false`** in production.

## What a real visitor does NOT currently see

Every item below exists in the codebase and renders in `npm run dev`, but is
withheld from the production render:

- **Phone number and all phone UI.** `PHONE` is `verified: false`, so
  `SHOW_PHONE` is false. This removes: the header `tel:` link, the "or call
  **(615) 000-0000**" line in the end-of-page CTA band on every page, the call
  button in the mobile menu drawer, the phone icon button in the sticky mobile
  CTA bar, the "Call (615) 000-0000" button on all three location pages, the
  "Prefer to talk now?" note on `/contact`, and the phone line on the locations
  index cards.
- **The Trisha Yearwood band** on the homepage — entire section, including the
  quote "I feel like I am in my thirties again.", the "Watch her story" link,
  and the video thumbnail.
- **All testimonials.** `VERIFIED_TESTIMONIALS` is empty (both entries are
  `verified: false`), so the homepage "Client stories" section does not render
  at all. On `/stories` the six quote cards are replaced by a two-sentence
  holding paragraph. On location pages the client quote is replaced by a
  generic "Good to know" panel.
- **The Google review band** (rating, review count, "Video stories") on both
  the homepage and `/stories`.
- **Street addresses and ZIPs** for all three centers — on the locations index
  cards and in the location-page hero fact list. `addressLocality` and
  `addressRegion` (e.g. "Nashville, TN") still render; street and ZIP do not,
  and are also omitted from the `LocalBusiness` JSON-LD.
- **Draft team profiles.** All three `/about/team/[slug]` profile pages carry
  `[Practitioner name]` placeholders, so they are excluded from
  `generateStaticParams`, return `notFound()`, and are dropped from the
  sitemap. The `/about/team` grid filters those members out, and the location
  pages filter placeholder team members out of their team grids.
- **Five of six resource articles.** Only `homework-battles` is close to
  publishable; the other five have `[Draft…]` ledes and bodies, so they 404,
  are excluded from the sitemap, and do not appear on `/resources`.
- **Founder story paragraphs.** `/about/founder` shows four bracketed draft
  blocks in dev; in production the entire article body is replaced by a single
  fallback paragraph ending "Her full story is coming to this page soon."
- **All `[CONFIRM]` / `[Insert …]` gold tags** (the `ConfirmTag` component
  returns `null` in production).
- **`PlaceholderPlate` shot specs.** The sage-gradient plates still render as
  a plain gradient block; the "Photography needed" caption inside them does not.
- **Additional gated lines:** the founder's drafted quote on the homepage
  (replaced by a shorter fallback), the "Most new clients start within a week
  of their first call." line in the homepage journey section, the response-time
  line "A real person responds within one business day" in every end-of-page
  CTA band, the "usually within one business day" clause on `/contact`, the
  "Plan for about [60–90] minutes" line on `/first-visit`, the Murfreesboro
  parking note, per-location "Getting here" directions (replaced by "We'll send
  simple directions and arrival details when you book."), and the practitioner
  name lists on the locations index.

## Does the deployed production build reflect this?

**There is no deployed build to inspect, and I cannot determine the live site's
state from the codebase alone.** Specifically:

- The git repository has **no remotes configured** (`git remote -v` is empty),
  so there is no deploy target recorded here.
- There is no `vercel.json`, `netlify.toml`, `.vercel` directory, or CI config.
- `SITE_URL` defaults to `https://www.harmonizedbraincenters.com`, but that
  string is annotated `// [CONFIRM domain]` in `lib/site-config.ts:47`. I did
  not fetch the live site.

**What I can confirm** is a local production build in `.next/`, dated
**2026-07-14 13:02**. Its prerendered homepage
(`.next/server/app/index.html`) contains **zero** occurrences of `CONFIRM`,
`todo-tag`, `Trisha`, `615) 000-0000`, `Photography needed`, or the sample
testimonial text — and the homepage "Client stories" section heading is absent
entirely. It does contain `140,000+`, `Since 2016`, `Two centers`, and seven
instances of `Talk With Our Team`. **That build was produced with
`SHOW_DRAFT_CONTENT = false`**, and demonstrates the production behavior
described above.

**Caveat on staleness:** exactly two source files have been modified since that
build — `app/page.tsx` and `app/globals.css`, both at 2026-08-14 20:45. Every
other source file predates the build, including `lib/site-config.ts` (Jul 14
12:47), so **the gating logic itself is unchanged** and the flag-state evidence
holds. The homepage's current copy may differ from the prerendered HTML.

**One nuance worth stating precisely:** the flag hides *unverified notes*, not
always the *values* they annotate. The homepage proof band renders
"**140,000+** LENS sessions provided across our centers" and "**Since 2016**"
to real visitors — only the `[Verify session count]` and `[Confirm founding
year]` tags beside them are suppressed. The same applies to the "Sheri" founder
name (surname hidden, first name shown).

## Working-tree state

The git working tree is **not clean**. 34 tracked files are modified and 9 are
untracked (`CONTENT-CHECKLIST.md`, `components/ConcernRail.tsx`,
`components/FooterGroup.tsx`, `components/MobileCtaBar.tsx`,
`lib/content-validation.ts`, and four `prod-*.png` screenshots). The last commit
is `c1b52d3 Make the site mobile-friendly (the mockups were desktop-first)`.
Five commits total, single branch `main`.

---

# 2. Structure

## 2.1 Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js **15.5.20**, App Router, Turbopack (`dev` and `build`) |
| Runtime | React 19.1.0, React DOM 19.1.0 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 via `@tailwindcss/postcss`. Brand tokens declared in an `@theme` block; the entire ported design system is hand-written CSS in one file, `app/globals.css` (702 lines). Utility classes are barely used — layout is `.wrap`, `.sec`, `.split`, `.duo` etc. plus inline `style={{}}` objects. |
| Fonts | `next/font/google` — Cormorant Garamond (display, weights 400/500/600 + italic) and DM Sans (body, 400/500/600) |
| CMS | **None.** No headless CMS, no MDX, no markdown content pipeline. |
| Forms | Custom React form → own API route → **Supabase** (`@supabase/supabase-js` 2.110.3). No third-party form service. |
| Database | Supabase Postgres, one table: `public.consultation_requests` |
| Analytics | **None found.** No GA, GTM, Meta Pixel, Segment, PostHog, or any tracking script anywhere in the codebase. |
| Scheduling | **None.** No Calendly, Acuity, or any booking embed. |
| Image handling | `next/image` with `fill` + `sizes`, wrapped in a `PhotoFrame` component |
| Deployment config | None present in repo (README documents a manual Vercel setup) |

## 2.2 Every route

All routes are static/prerendered. Status key: **Complete** = fully written
copy; **Data-gated** = page shell is complete but content depends on unverified
data; **Placeholder** = renders only bracketed draft copy in dev and 404s or
falls back in production.

### Static routes

| Route | File | Status |
| --- | --- | --- |
| `/` | `app/page.tsx` | Complete (two sections draft-gated) |
| `/what-we-help-with` | `app/what-we-help-with/page.tsx` | Complete |
| `/adults` | `app/adults/page.tsx` | Complete |
| `/children-families` | `app/children-families/page.tsx` | Complete |
| `/how-lens-works` | `app/how-lens-works/page.tsx` | Complete |
| `/first-visit` | `app/first-visit/page.tsx` | Complete (pricing/duration gated) |
| `/about` | `app/about/page.tsx` | Complete |
| `/about/founder` | `app/about/founder/page.tsx` | **Placeholder** — body is 4 bracketed draft blocks; production shows a 1-paragraph fallback |
| `/about/team` | `app/about/team/page.tsx` | **Data-gated** — 5 of 6 roster entries are `[placeholders]`; production renders 1 member (Sheri) |
| `/locations` | `app/locations/page.tsx` | Complete (addresses gated) |
| `/stories` | `app/stories/page.tsx` | **Data-gated** — all 6 quotes are sample copy; production shows a holding paragraph |
| `/faq` | `app/faq/page.tsx` | Complete (3 answers carry gated tags) |
| `/contact` | `app/contact/page.tsx` | Complete |
| `/resources` | `app/resources/page.tsx` | **Data-gated** — production lists 1 of 6 articles |

### Dynamic routes

| Route | File | Slugs | Status |
| --- | --- | --- | --- |
| `/concerns/[slug]` | `app/concerns/[slug]/page.tsx` | `anxiety`, `focus-adhd`, `sleep`, `emotional-regulation`, `brain-fog`, `stress-resilience`, `children-school`, `trauma` | **All 8 complete.** Data from `lib/concerns.ts`; no placeholders in any of the 8. |
| `/locations/[slug]` | `app/locations/[slug]/page.tsx` | `nashville`, `murfreesboro`, `franklin` | Nashville: complete but address/directions gated. Murfreesboro: complete, all 3 photos are placeholder plates, both practitioners are `[placeholders]`. Franklin: "coming soon" variant, complete. |
| `/about/team/[slug]` | `app/about/team/[slug]/page.tsx` | `practitioner-children-teens`, `practitioner-murfreesboro`, `practitioner-nashville` | **All 3 placeholder.** Every profile field is bracketed. All three 404 in production. |
| `/resources/[slug]` | `app/resources/[slug]/page.tsx` | `homework-battles`, `exhausted-after-eight-hours`, `lens-vs-traditional-neurofeedback`, `bad-at-school`, `brain-fog-after-55`, `what-the-equipment-does` | `homework-battles`: lede/quote written, **2 body paragraphs still `[Body copy…]`** — note it is therefore *not* publishable either. Other 5: **placeholder**, lede + body both `[Draft…]`. **In production all 6 currently 404.** |

### Non-page routes

| Route | File | Notes |
| --- | --- | --- |
| `POST /api/consultation` | `app/api/consultation/route.ts` | Node runtime; contact-form handler |
| `/sitemap.xml` | `app/sitemap.ts` | 14 static + dynamic paths, draft entries filtered |
| `/robots.txt` | `app/robots.ts` | Allow `/`, disallow `/api/` |

### Pages that do not exist

No `/privacy`, `/terms`, `/accessibility`, `/careers`, `/blog`, or `/pricing`
route exists. None is linked from anywhere, so these are absences, not dead
links. There is no custom `not-found.tsx`, `error.tsx`, or `loading.tsx` — Next.js
defaults apply.

## 2.3 `design-reference/` status

**Answer: superseded source material from an earlier phase, retained as
reference. Not a backlog of unbuilt pages.** The codebase settles this:

- **It was the first thing committed.** Commit `293c527` — "Add design
  reference: 18 HTML mockups, main.css, site.js, brand photography, build.py" —
  is the *initial* commit. The Next.js scaffold arrives in `64f5a66`, and the
  port in `6782c27` ("Port design system: … global CSS, shared components,
  homepage").
- **All files date 2026-07-13 14:21**, ahead of every application file
  (2026-07-13 14:29 through 2026-08-14 20:45).
- **Every mockup has a corresponding built route.** The 18 files are: `index`,
  `what-we-help-with`, `concern-anxiety`, `adults`, `children-families`,
  `how-lens-works`, `first-visit`, `about`, `founder`, `team`, `practitioner`,
  `locations`, `location-nashville`, `stories`, `faq`, `contact`, `resources`,
  `article`. Each maps to an existing route — the three "template" mockups
  (`concern-anxiety`, `location-nashville`, `practitioner`, `article`) became
  the data-driven dynamic routes. **Nothing in the mockup set is unbuilt.**
- **Nothing imports or serves them.** They are referenced only in two code
  comments — `app/globals.css:5` ("ported from design-reference/css/main.css —
  keep in sync with mockups") and `components/RevealOnScroll.tsx:7` ("ported
  from design-reference/js/site.js"). They are outside `public/`, so they are
  not served. `build.py` is a self-contained Python generator that emits the
  mockups; it is not part of the npm build.
- **README states the intent explicitly** (`README.md:7-10`): "Built from the
  finished design system in `/design-reference` — 18 HTML mockups… **Those files
  are the source of truth for design, copy, and interaction; leave them
  untouched.**"

**The one genuine ambiguity:** the README calls them the ongoing "source of
truth for design, copy, and interaction," while `README.md:12-17` records that
the mockups are desktop-only and that phone art direction was added afterward in
`globals.css` (commit `c1b52d3`, "the mockups were desktop-first"). So the
mockups are authoritative for desktop only and are already out of date for
mobile. `CONTENT-CHECKLIST.md` does not mention them at all. Whether the team
still intends to keep them in sync is not determinable from the codebase.

## 2.4 Homepage component hierarchy, in render order

From `app/layout.tsx` outward. `RevealOnScroll` renders `null` (it is a
scroll-observer side effect only).

```
<html lang="en">                                 app/layout.tsx
  <body>
    <RevealOnScroll />                           components/RevealOnScroll.tsx  (no DOM)
    <Header />                                   components/Header.tsx          ["use client"]
      ├─ Link.logo → LogoMark + LogoName         components/Logo.tsx
      ├─ nav.nav-links (desktop, hidden ≤1060px)
      │   ├─ "What We Help With" + .mega panel (2 columns)
      │   └─ 5 top-level links
      ├─ a.nav-tel                               [DRAFT-GATED]
      ├─ Link.nav-cta → /contact
      ├─ button.nav-burger (shown ≤1060px)
      └─ #mobile-drawer                          (shown ≤1060px)
    <main>
      <div className="home">                     app/page.tsx
        1.  section.hero.wrap
              ├─ div.hero-copy (eyebrow, h1, sub, hero-ctas, micro)
              │    ├─ <TalkCta />                components/Buttons.tsx
              │    └─ <Btn variant="ghost">      components/Buttons.tsx
              └─ div.hero-media
                   ├─ <PhotoFrame />             components/PhotoFrame.tsx
                   └─ span.hero-scrim            (mobile only)
        2.  <ProofBand />                        components/ProofBand.tsx   (4 stats)
        3.  section.sec-navy.celeb-band          [DRAFT-GATED — FEATURE_CELEBRITY]
              ├─ div.celeb-copy (+ <ConfirmTag />)
              └─ a.celeb-video → YouTube (Image + play icon)
        4.  section.sec.home-concerns
              ├─ div.sec-head.split (eyebrow, h2, <Btn ghost>)
              ├─ <ConcernRail count={6}>         components/ConcernRail.tsx ["use client"]
              │    └─ <ConcernCard /> × 6        components/ConcernCard.tsx
              │    └─ div.rail-cue (dots + "Swipe", mobile only)
              └─ div.family-row (eyebrow, h3, p, <Btn invert>, <PhotoFrame />)
        5.  section.sec.sec-ivory2.home-goals
              ├─ col A: eyebrow, h2, div.note-sage
              └─ col B: ul.goals-list × 6, <Btn ghost>
        6.  section.sec.home-lens
              ├─ col A: eyebrow, h2, 2× p, inline <svg class="wave">, <Btn ghost>
              └─ col B: div.lens-seq → 4 × div.row (n, h4, p)
        7.  section.sec.sec-navy.home-journey
              ├─ div.sec-head (eyebrow, h2, sub)
              ├─ div.journey → 5 × div.jstep (n, h3, p)
              └─ <Btn invert> + gated timing line + <ConfirmTag />
        8.  section.sec.home-care
              ├─ div.sec-head (eyebrow, h2)
              ├─ div.care-list → 4 × div.care (care-n, h4, p, optional <ConfirmTag />)
              └─ div.founder-note (<PhotoFrame />, blockquote, cite → /about/founder)
        9.  section.sec.sec-ivory2.home-stories  [DRAFT-GATED — showStories]
              ├─ div.sec-head.split (eyebrow, h2, <Btn ghost>)
              ├─ div.quote-grid → <Quote /> × 2  components/Quote.tsx
              ├─ div.review-band (3 cells + <ConfirmTag />)
              └─ p.sample-note
        10. section.sec.home-locations
              ├─ div.sec-head.split (eyebrow, h2, <Btn ghost>)
              └─ div.loc-grid → <LocationCard /> × 3   components/LocationCard.tsx
                     └─ <PhotoFrame /> or <PlaceholderPlate />
        11. section.sec.sec-tight.home-faq
              ├─ div.sec-head (eyebrow, h2)
              ├─ <FAQAccordion items={3} openFirst />  components/FAQAccordion.tsx
              └─ <Btn ghost> → /faq
        12. <FinalCTA />                         components/FinalCTA.tsx
        13. <MobileCtaBar />                     components/MobileCtaBar.tsx ["use client"]
      </div>
    </main>
    <Footer />                                   components/Footer.tsx
      └─ <FooterGroup /> × 4                     components/FooterGroup.tsx  ["use client"]
```

**At ≤760px the visual order changes** — `.home` becomes a flex column and CSS
`order` moves the Trisha band from position 3 to position 2, directly under the
hero. DOM order is unchanged. See §9.

## 2.5 Where copy lives

**A mix**, roughly 60/40 hardcoded to data-file.

**Hardcoded directly in JSX** (page-specific prose, headings, CTA labels):

- `app/page.tsx` — homepage prose plus three local arrays (`homeConcerns`,
  `homeGoals`, `homeFaqs`)
- `app/how-lens-works/page.tsx` — `sessionSteps`, `lensIsNot` arrays
- `app/first-visit/page.tsx` — `fiveParts` array
- `app/faq/page.tsx` — the full 14-item `faqs` array
- `app/adults/page.tsx` — `adultConcerns` array
- `app/stories/page.tsx` — `storyQuotes` array (6 sample quotes)
- `app/locations/[slug]/page.tsx` — `firstVisitSteps` array
- `app/about/page.tsx`, `app/about/founder/page.tsx`,
  `app/children-families/page.tsx`, `app/what-we-help-with/page.tsx`,
  `app/contact/page.tsx`, `app/resources/page.tsx` — prose inline
- `components/ContactForm.tsx` — all form labels, option arrays, the
  `WhatHappensNext` steps, the success-state copy, the micro-copy
- `components/Header.tsx` — `megaAdults`, `megaChildren`, `topLinks`
- `components/Footer.tsx` — the four `groups` link arrays and the tagline
- `components/FinalCTA.tsx` — `DEFAULT_HEADING`, `DEFAULT_SUB`

**Data files in `lib/`:**

| File | Drives |
| --- | --- |
| `lib/site-config.ts` | Site name/URL, phone, founder name + quote, session-count and founding-year stats, review stats, all testimonials, response-time and start-timing claims, every `[CONFIRM]`/`[Insert]` tag string, the legal `DISCLAIMER`, both feature flags, and the `Verifiable`/`verifiedOr`/`isDraftText`/`draftText` helpers |
| `lib/concerns.ts` | All 8 concern pages *and* the `/what-we-help-with` entry rows — titles, hero subs, symptom lists, "how LENS may help" copy, goal cards, per-concern FAQs, images, meta |
| `lib/locations.ts` | All 3 location pages, homepage + index location cards, hours, addresses (feeding JSON-LD), hero copy, space photos, per-location team, quote, planning details, final CTA heading, meta |
| `lib/team.ts` | `/about/team` grid + the 3 `/about/team/[slug]` profiles |
| `lib/resources.ts` | `/resources` cards + all 6 article bodies (typed block array: `p`/`h2`/`blockquote`/`note`) |
| `lib/content-validation.ts` | No copy — build-time verification that logs/fails on unverified facts |

**Governance doc:** `CONTENT-CHECKLIST.md` (untracked) is the human checklist
of every unverified fact.

---

# 3. Homepage — full copy dump, in document order

Source: `app/page.tsx`. Sections numbered as they appear in the DOM.

---

## 3.0 Header (from `app/layout.tsx` → `components/Header.tsx`)

Rendered above the homepage on every page. Full inventory in §5.

---

## 3.1 Hero — `app/page.tsx:139-195`

**Eyebrow** (two variants; desktop `.d-only`, mobile `.m-only`):

- Desktop: `LENS Neurofeedback · Adults & Children · Middle Tennessee`
- Mobile: `LENS Neurofeedback`

**H1:**

> Feel like *yourself* again.

(`yourself` is `<em class="sage">`. Mobile inserts `<br>` after "Feel like" and
after "yourself".)

**Paragraph `.sub`** — two variants:

- Desktop (`.d-only`):
  > Gentle, noninvasive neurofeedback support for **anxiety**, **focus and ADHD**, **sleep**, **emotional regulation**, **brain fog**, and **stress** — delivered by trained practitioners at centers across Middle Tennessee.

- Mobile (`.m-only`):
  > Gentle, noninvasive neurofeedback for **anxiety**, **focus & ADHD**, **sleep**, and **stress** — for adults and children across Middle Tennessee.

(Bolded terms are `<b class="kw">`.)

**Buttons:**

| Label | Component | Destination |
| --- | --- | --- |
| `Talk With Our Team` | `<TalkCta />`, `.btn-primary` | `/contact` |
| `See how LENS works →` | `<Btn variant="ghost" arrow>` | `/how-lens-works` |

**Micro-copy below buttons:**

> A free, no-pressure conversation. Ask anything — including the skeptical questions.

**Media:** `<PhotoFrame src="/images/hero.jpg">`, height 620,
`priority`, `sizes="(max-width: 1060px) 100vw, 47vw"`,
position `46% 24%` desktop / `48% 18%` mobile.

- **alt:** `A calm LENS neurofeedback session at Harmonized Brain Centers`

Plus `<span class="hero-scrim" aria-hidden="true">` — mobile-only gradient overlay.

---

## 3.2 Proof band — `app/page.tsx:197-218` (`components/ProofBand.tsx`)

Four cells. Each renders `<strong>` (stat) + `<span>` (label). **No heading
tags.** Two carry `[CONFIRM]` tags that are draft-gated; **the stat values
themselves render in production.**

| Stat | Label | Gated tag |
| --- | --- | --- |
| `140,000+` | `LENS sessions provided across our centers` | `[Verify session count]` |
| `Two centers` | `Nashville & Murfreesboro — Franklin coming soon` | — |
| `All ages` | `Adults, teens, and children welcome` | — |
| `Since 2016` | `Serving Middle Tennessee families` | `[Confirm founding year]` |

---

## 3.3 Trisha Yearwood band — `app/page.tsx:225-303`

### `[DRAFT-GATED — NOT CURRENTLY VISIBLE]`

Gated on `FEATURE_CELEBRITY`. The in-code comment (`app/page.tsx:220-224`)
states: "Renders only while FEATURE_CELEBRITY is true… Embedding is disabled for
this video: always a thumbnail linking out, never an iframe. The page is
designed to feel complete without this band."

Copy waiting in the wings:

**Eyebrow:** `In her own words`

**Name** (a `<div class="celeb-name">`, not a heading): `Trisha Yearwood`

**Role** (`<div class="celeb-role">`): `Grammy®-winning artist · on her experience at Harmonized`

**Quote** (`<div class="celeb-quote">`):

> “I feel like I am in my thirties again.”

**Button:** `Watch her story →` → `https://www.youtube.com/shorts/fhmoa68_uHY`
(`target="_blank" rel="noopener"`)

**Adjacent line:** `Individual experiences vary · ` + `[Confirm approval: name · likeness · image · quote · Grammy credit · commercial use]`

**Video thumbnail:** `<a class="celeb-video">` → same YouTube URL,
`aria-label="Watch Trisha Yearwood's story on YouTube"`, containing
`<Image src="/images/trisha.jpg" alt="" />` (**empty alt — decorative**) and an
inline play-triangle SVG.

**Mobile-only overlay** (`.celeb-id`):
- `Trisha Yearwood`
- `Grammy®-winning artist · her experience at Harmonized`

*(Note: on mobile `.celeb-name` and `.celeb-role` are `display:none` and this
overlay replaces them.)*

---

## 3.4 Concerns — `app/page.tsx:305-353`

**Eyebrow:** `What brings people to us`

**H2:**

> If any of this describes your daily life, you’re in the right place.

**Button (section head):** `Explore every concern →` → `/what-we-help-with`

### The six concern cards (`components/ConcernCard.tsx`)

Each card: **H3** title, `.aud` audience line, `<ul>` of points, and a link
reading `Read more →`.

**Card 1** — H3: `Anxiety & nervous-system overload`
Audience: `Adults & children`
- Thoughts that won't quiet down
- Feeling constantly on edge
- Unable to relax even when life is calm

Link: `Read more →` → `/concerns/anxiety`

**Card 2** — H3: `Focus, ADHD & follow-through`
Audience: `Adults & children`
- Struggling to stay on task
- Overwhelmed by multi-step responsibilities
- Work or schoolwork that stalls at 90%

Link: `Read more →` → `/concerns/focus-adhd`

**Card 3** — H3: `Sleep difficulties`
Audience: `Adults & children`
- A mind that won't shut off at night
- Waking frequently
- Eight hours that feel like four

Link: `Read more →` → `/concerns/sleep`

**Card 4** — H3: `Emotional regulation`
Audience: `Often children — and their parents`
- Becoming overwhelmed quickly
- Struggling with transitions
- Staying upset long after the moment

Link: `Read more →` → `/concerns/emotional-regulation`

**Card 5** — H3: `Brain fog, memory & mental fatigue`
Audience: `Most often adults`
- Thinking that feels slow or cloudy
- Losing words mid-sentence
- Exhausted by normal responsibilities

Link: `Read more →` → `/concerns/brain-fog`

**Card 6** — H3: `Stress & resilience`
Audience: `Most often adults`
- Functioning, but close to burnout
- Unable to recover after hard days
- Carrying stress physically

Link: `Read more →` → `/concerns/stress-resilience`

**Rail affordance (mobile only, `components/ConcernRail.tsx`):** container
`aria-label="Concerns we help with — swipe or scroll to browse"`; progress dots
plus the hint text `Swipe`.

### Children & families row (`.family-row`)

**Eyebrow:** `Children & families`

**H3:**

> Bright kids who are trying hard — and still struggling.

**Paragraph:**

> Homework battles. Meltdowns over transitions. Teacher emails. Sensory overwhelm. A child starting to believe they’re bad at school. There’s nothing your child has to get right in a LENS session — and you’re part of every check-in.

**Button:** `How we work with children` (`.btn-invert`) → `/children-families`

**Image:** `/images/child-session.jpg`, position `60% 30%` / mobile `68% 24%`
- **alt:** `A child relaxing during a LENS session`

---

## 3.5 Goals — `app/page.tsx:355-386`

**Eyebrow:** `What could change`

**H2:**

> The goals our clients name most often are small, concrete, and worth everything.

**Note block (`.note-sage`):**

> These are goals, not guarantees — every nervous system responds differently. Changes are reviewed at every visit, so progress is tracked consistently instead of relying on memory alone.

**List (`ul.goals-list`, 6 items):**

- Calmer mornings, fewer standoffs
- Falling asleep more easily
- Greater focus at school or work
- Recovering from frustration faster
- More patience with the people you love
- Feeling more like yourself again

**Button:** `See what clients work toward, by concern →` → `/what-we-help-with`

---

## 3.6 How LENS works — `app/page.tsx:388-465`

**Eyebrow:** `How LENS works`

**H2:**

> Feedback, not force.

**Paragraph 1:**

> LENS — the Low Energy Neurofeedback System — uses small sensors to observe the brain’s electrical activity, then returns a very low-energy feedback signal, far weaker than the everyday signals already around you. You simply sit comfortably — there’s nothing to watch, practice, or perform.

**Paragraph 2 (`.sub`):**

> LENS is a wellness service, not a medical treatment. Nothing is promised: your experience is reviewed over time, and your plan follows it.

**Media:** inline `<svg class="wave">`, 360×44, `aria-hidden="true"` — two
decorative EEG-style paths (sage `#5E7360`, gold `#A9853F`). No alt text needed.

**Button:** `The full explanation →` → `/how-lens-works`

**Four-step sequence (`.lens-seq`, numbered rows with H4 headings):**

| # | H4 | Paragraph |
| --- | --- | --- |
| 1 | `Sit back` | A comfortable chair, a quiet room, small sensors placed gently on the scalp. |
| 2 | `Nothing to perform` | No screens, tasks, or concentrating. Children don't have to sit perfectly still. |
| 3 | `Brief by design` | Most visits fit inside a lunch break or a school pickup. |
| 4 | `Reviewed with you` | Sleep, mood, focus, and energy are checked at every visit — and your plan adjusts. |

---

## 3.7 The client journey — `app/page.tsx:467-532` (navy section)

**Eyebrow:** `The client journey`

**H2:**

> One clear path, the same at every center.

**Sub:**

> No referral needed, nothing to prepare, and you’ll always know what comes next.

**Five steps (`.journey`, each with H3):**

| # | H3 | Paragraph |
| --- | --- | --- |
| 1 | `Talk with us` | A free conversation — phone or in person. Ask anything. |
| 2 | `Consult & baseline` | A consultation plus a baseline recording of brain activity to guide your starting plan. |
| 3 | `Begin sessions` | A personalized series of short, comfortable LENS visits. |
| 4 | `Track what matters` | Sleep, focus, mood, and energy reviewed at every check-in. |
| 5 | `Adjust as needed` | Your plan follows your experience — never a template. |

**Button:** `See what the first visit is like` (`.btn-invert`) → `/first-visit`

**Adjacent line:** `[DRAFT-GATED — NOT CURRENTLY VISIBLE]`

> Most new clients start within a week of their first call.

plus tag `[Confirm typical start timing]`. Gated via `verifiedOr(START_TIMING)`.

---

## 3.8 The Harmonized care model — `app/page.tsx:534-617`

**Eyebrow:** `The Harmonized care model`

**H2:**

> The same standard of care, at every center, from every practitioner.

**Four numbered rows (`.care-list`, each with H4). Numbers are `aria-hidden`.**

**01 — H4:** `Trained to one standard`
> Every practitioner completes the same Harmonized LENS training and follows the same session structure — your experience doesn't depend on which center you walk into.

*Carries gated tag `[Confirm training & review process]`.*

**02 — H4:** `Progress reviewed at every visit`
> A structured check-in on sleep, mood, focus, and energy opens each session, and your plan is adjusted from what you report.

**03 — H4:** `A plan that travels with you`
> Your plan and progress are documented at every step, so your care stays consistent across visits — and across centers.

**04 — H4:** `Honest by policy`
> No promised outcomes, clear recommendations, and a plain answer if we think LENS isn't the right fit for you.

### Founder note (`.founder-note`)

**Image:** `/images/founder.jpg`, height 230, position `center 22%`
- **alt:** `Sheri, Founder & Clinical Director of Harmonized Brain Centers`
  (template-built from `FOUNDER_DISPLAY_NAME`; becomes `Sheri [Surname], Founder & Clinical Director…` once the surname is verified)

**Blockquote — what visitors see today:**

> Harmonized began with one practitioner and a simple promise: honest guidance, and a gentle option for every family.

**`[DRAFT-GATED — NOT CURRENTLY VISIBLE]`** — the drafted alternative that
replaces it when `FOUNDER_QUOTE` is verified or in dev:

> “We built Harmonized so that every family gets what my first clients got: someone who truly listens, honest guidance, and a gentle option that never asks them to push through.”

plus tag `[Founder to approve final wording]`.

**Citation (`<cite>`):**

`Sheri` + `[Last name — confirm]` (gated) + ` · Founder & Clinical Director · ` +
link `Her story →` → `/about/founder`

---

## 3.9 Client stories — `app/page.tsx:619-679`

### `[DRAFT-GATED — NOT CURRENTLY VISIBLE]` — entire section

Gated on `showStories = homeQuotes.length > 0`. In production `homeQuotes` is
`VERIFIED_TESTIMONIALS`, which is empty, so **the whole `<section>` is omitted**
— confirmed absent from the prerendered build. Copy waiting in the wings:

**Eyebrow:** `Client stories`

**H2:**

> The changes people mention first are small — and unmistakable.

**Button:** `More client stories →` → `/stories`

**Quote card 1** (`components/Quote.tsx`)
- Theme: `Focus · Children`
- Text: “For the first time in two years, homework isn't a fight. He sits down, does it, and moves on. I didn't realize how much tension had left the house until it was gone.”
- Attribution: `Parent of a 9-year-old` · `Nashville`

**Quote card 2**
- Theme: `Sleep · Adults`
- Text: “I came in exhausted and skeptical. What sold me was that nobody oversold anything — they just kept asking how I was sleeping. By week four: better than I had in years.”
- Attribution: `Adult client` · `Murfreesboro`

**Review band (3 cells, additionally gated on `REVIEWS.verified`):**

| Strong | Span | Tag |
| --- | --- | --- |
| `[4.x] ★` | `Google rating across locations` | `[Insert verified rating & count, link live profiles]` |
| `[N] reviews` | `From Nashville & Murfreesboro clients` | — |
| `Video stories` | `Client interviews, in their own words` | `Film 2–3 short testimonials` |

**Sample note (`p.sample-note`)** — one of two strings:
- dev: `Sample copy for design review — will not render in production. Replace with verified client quotes.`
- once real quotes exist: `Individual experiences vary.`

---

## 3.10 Locations — `app/page.tsx:681-733`

**Eyebrow:** `Locations`

**H2:**

> One organization. Convenient centers across Middle Tennessee.

**Button:** `All locations →` → `/locations`

### Three location cards (`components/LocationCard.tsx`)

Each: image or placeholder plate, **H3** name, `.city` county line, `.meta`
block, and a `.go` link.

**Card 1 — H3:** `Nashville`
- City line: `Davidson County`
- Meta: **`Open — welcoming new clients`** / `A calm, comfortable center serving Davidson County.`
- Image: `/images/session-room.jpg`, position `center 55%`, height 240
  - **alt:** `Nashville center`
- Link: `Explore this location →` → `/locations/nashville`

**Card 2 — H3:** `Murfreesboro`
- City line: `Rutherford County`
- Meta: **`Open — welcoming new clients`** / `The same standard of care, closer to home in Rutherford County.`
- **No photo** — renders `<PlaceholderPlate>` (sage gradient). Spec (dev-only
  caption): `Murfreesboro interior — reception or session room, natural light`.
  Plate is `aria-hidden="true"`.
- Link: `Explore this location →` → `/locations/murfreesboro`

**Card 3 — H3:** `Franklin` + badge `Coming soon`
- City line: `Williamson County`
- Meta: **`Coming soon`** + gated tag `[Opening date — confirm]` / `Join the waitlist for founding-client openings.`
- **No photo** — `<PlaceholderPlate>`. Spec: `Franklin exterior — storefront at golden hour`.
- Link: **`Join the Franklin waitlist →` → `/contact`** (not to the Franklin
  location page — `LocationCard` redirects `comingSoon` locations to `/contact`)

---

## 3.11 FAQ — `app/page.tsx:735-746`

**Eyebrow:** `Before you call`

**H2:**

> The three questions everyone asks first.

**Accordion (`components/FAQAccordion.tsx`, native `<details>`/`<summary>`,
first item open by default). Questions are `<summary>` elements, not headings.**

**Q1:** `Is LENS safe? Does it hurt?`
> LENS is gentle and noninvasive — nothing enters the body, and the feedback signal is far weaker than the everyday signals already around you. Most people, including young children, feel nothing at all during a session.

**Q2:** `Is this therapy or medical treatment?`
> Neither. We're a wellness practice. LENS doesn't diagnose or treat medical conditions, and it works alongside — never in place of — your doctor, therapist, or school supports.

**Q3:** `How many sessions will I need?`
> It genuinely varies. We check in on how you're doing at every visit, review progress together, and never ask you to commit to a long program up front.

**Button:** `All questions, answered plainly →` → `/faq`

---

## 3.12 Final CTA — `components/FinalCTA.tsx`

Navy band. Appears on **every page except `/contact`**, with the heading and sub
overridable per page. Homepage uses the defaults.

**Eyebrow:** `Talk with our team`

**H2:**

> The next step is a conversation, not a commitment.

**Sub:**

> Tell us what’s going on. We’ll listen, answer honestly, and help you decide whether LENS is a fit — free, and with no obligation.

**Button:** `Talk With Our Team` (`.btn-invert`) → `/contact`

**Phone line:** `[DRAFT-GATED — NOT CURRENTLY VISIBLE]`
> or call **(615) 000-0000**

**After-line (`p.after`):**
- `[DRAFT-GATED]` prefix: `A real person responds within one business day` + tag `[Confirm response time]` + ` · `
- Always visible: `Consultations are free · No referral needed`

---

## 3.13 Mobile CTA bar — `components/MobileCtaBar.tsx`

Phones only (≤760px). See §4.5.

- Button: `Talk With Our Team` → `/contact`
- Phone icon button → `tel:` — `[DRAFT-GATED — NOT CURRENTLY VISIBLE]`,
  `aria-label="Call (615) 000-0000"`

---

## 3.14 Footer — `components/Footer.tsx`

Full link inventory in §5.2.

**Tagline:**

> Gentle LENS neurofeedback for adults, children, and families across Middle Tennessee.

**Disclaimer (`p.disclaimer`)** — from `lib/site-config.ts`, marked "preserve
verbatim; never soften or remove":

> Harmonized Brain Centers is a wellness practice, not a medical clinic. LENS neurofeedback is offered as a wellness service and is not intended to diagnose, treat, cure, or prevent any medical or psychological condition. Information on this site is educational and is not a substitute for advice from a qualified healthcare provider. Individual experiences vary.

Followed by: `© {current year} Harmonized Brain Centers · Nashville · Murfreesboro · Franklin (coming soon)`

---

# 4. Conversion mechanics

## 4.1 Forms

**There is exactly one form on the entire site.**

### Consultation request — `components/ContactForm.tsx`

- **Location:** `/contact` only. Not embedded on any other page.
- **Submits to:** `POST /api/consultation` (`app/api/consultation/route.ts`)
- **Storage:** Supabase table `public.consultation_requests`
  (`supabase/migrations/0001_consultation_requests.sql`)
- **Form-level:** `noValidate` — browser validation is suppressed; validation is
  manual in `handleSubmit`.

**Eyebrow above the form:** `Request a conversation`

| # | Field | Type | Label | Options / placeholder | Required? |
| --- | --- | --- | --- | --- | --- |
| 1 | `helpingWho` | Chip radiogroup | `Who are we helping?` | `My child` (default), `Myself`, `Someone else` | Effectively yes — defaults to `My child`, cannot be cleared. Server rejects values outside the set. |
| 2 | `selectedConcerns` | Chip multi-select | `What’s bringing you in?` *(choose any)* | `Focus & ADHD`, `Anxiety & stress`, `Sleep`, `Emotional regulation`, `School struggles`, `Brain fog`, `Something else` | **No** — defaults to empty |
| 3 | `firstName` | `<input>` | `Your first name` | placeholder `Sarah`, `autoComplete="given-name"` | **Yes** (`required` attr + client check + server check) |
| 4 | `phone` | `<input type="tel">` | `Phone` | placeholder `(615) 555-0134`, `autoComplete="tel"` | **Yes** (`required` attr + client check + server check) |
| 5 | `preferredCenter` | `<select>` | `Preferred center` | `Nashville` (default), `Murfreesboro`, `Franklin waitlist`, `Concierge / at home` | No — always submits a value |
| 6 | `bestTime` | `<select>` | `Best time to call` | `Mornings` (default), `Afternoons`, `Evenings` | No — always submits a value |
| 7 | `note` | `<textarea>` | `In your own words` *(optional)* | placeholder: `Mornings are hard, homework is a battle, and he's starting to say he's 'just bad at school'…` | **No** |

**No email field. No last name. No address. No payment field.**

A hidden 8th value is captured: `source_page` — read at submit time from
`?from=` in the URL, falling back to `usePathname()`. **No link anywhere on the
site appends a `?from=` parameter**, so in practice this always records
`/contact`.

**Submit button:** `Request my conversation` (full width). While in flight the
label becomes `Sending…` and the button is `disabled`.

**Micro-copy under the button:**

> No payment details, no intake forms today. We never share your information, and there’s no obligation after we talk.

**Client-side validation:** only `firstName` and `phone` non-empty. Error text:

> Please add your first name and phone number so we can reach you.

**Server-side validation** (`app/api/consultation/route.ts`):
- `first_name` (≤100 chars), `phone` (≤40), `helping_who` (≤40, must be in the
  allow-list) — all required → else `400`
- `concerns` — array of strings, each ≤60 chars, capped at 10
- `preferred_center` ≤60, `best_time` ≤40, `note` ≤2000, `source_page` ≤200
- Missing Supabase env vars → `500` with: `The form isn't configured yet. Please call us instead.`
- Insert failure → `500` with: `We couldn't save your request. Please try again, or call us.`
- Success → `201 { ok: true }`

**No rate limiting, no CAPTCHA, no honeypot, no CSRF token.**

**No email notification is sent.** The row is written to Supabase and nothing
else happens — there is no transactional email, webhook, Slack notification, or
autoresponder anywhere in the codebase. Whoever handles leads must watch the
database.

### What happens after submit

The form is replaced in place (no redirect, no new URL, so **no thank-you page
exists and conversion cannot be tracked by URL**).

**Success state:**

- Eyebrow: `Request received`
- **H3:** `Thank you, {firstName}. Here’s what happens next.`
- Then the `WhatHappensNext` block (below)
- `.note-sage` — **`[DRAFT-GATED]`** (contains the unverified phone):
  > Prefer to talk sooner? Call **(615) 000-0000** — a real person answers during business hours.

**`WhatHappensNext`** (shared component — also rendered beside the form in its
idle state, so these three steps appear twice on `/contact` at different times):

| # | H4 | Paragraph |
| --- | --- | --- |
| 1 | `We call you` | A real person from your nearest center, at the time you chose. |
| 2 | `We listen, then answer` | What’s going on, what you’ve tried, and every question you have — including the skeptical ones. |
| 3 | `You decide` | Book a first visit, think it over, or decide it’s not for you. The conversation is free either way. |

**Error state:** a `role="alert"` paragraph above the button, in dark red
(`#9a3b2e`), showing either the validation message, the server message, or the
network fallback:

> We couldn't send your request. Please try again, or call us.

## 4.2 Every CTA site-wide

The codebase enforces a single primary CTA. `components/Buttons.tsx:49` states:
"Primary CTA — the only booking CTA sitewide. Always 'Talk With Our Team' →
`/contact`." `README.md:142-143` repeats it: "Don't introduce competing CTAs."

**Destination counts across the whole site** (from a full `href` sweep):
`/what-we-help-with` ×8, `/contact` ×6 literal + `<TalkCta>` instances,
`/how-lens-works` ×4, `/first-visit` ×4, `/children-families` ×4, `/adults` ×3,
`/about/team` ×3, `/about/founder` ×3, `/about` ×3, `/locations` ×2,
`/stories` ×1, `/resources` ×1, `/faq` ×1, `/` ×1, plus `tel:` ×4 (all gated)
and 4 template hrefs.

### Homepage CTAs in scroll order

| # | Label | Position | Destination | Style |
| --- | --- | --- | --- | --- |
| 1 | `Talk With Our Team` | Header, top right (hidden ≤640px) | `/contact` | Navy button |
| 2 | `(615) 000-0000` | Header | `tel:` | **Gated** |
| 3 | `Talk With Our Team` | Hero, primary | `/contact` | Navy button (ivory on mobile) |
| 4 | `See how LENS works →` | Hero, secondary | `/how-lens-works` | Ghost |
| 5 | `Watch her story →` | Trisha band | YouTube (external) | **Gated** |
| 6 | Video thumbnail | Trisha band | YouTube (external) | **Gated** |
| 7 | `Explore every concern →` | Concerns section head | `/what-we-help-with` | Ghost |
| 8–13 | `Read more →` ×6 | Each concern card | `/concerns/{anxiety, focus-adhd, sleep, emotional-regulation, brain-fog, stress-resilience}` | Card link |
| 14 | `How we work with children` | Family row | `/children-families` | Invert button |
| 15 | `See what clients work toward, by concern →` | Goals section | `/what-we-help-with` | Ghost |
| 16 | `The full explanation →` | LENS section | `/how-lens-works` | Ghost |
| 17 | `See what the first visit is like` | Journey section | `/first-visit` | Invert button |
| 18 | `Her story →` | Founder note citation | `/about/founder` | Inline link |
| 19 | `More client stories →` | Stories section | `/stories` | **Gated** |
| 20 | `All locations →` | Locations section head | `/locations` | Ghost |
| 21 | `Explore this location →` | Nashville card | `/locations/nashville` | Card link |
| 22 | `Explore this location →` | Murfreesboro card | `/locations/murfreesboro` | Card link |
| 23 | `Join the Franklin waitlist →` | Franklin card | `/contact` | Card link |
| 24 | `All questions, answered plainly →` | FAQ section | `/faq` | Ghost |
| 25 | `Talk With Our Team` | Final CTA band | `/contact` | Invert button |
| 26 | `or call (615) 000-0000` | Final CTA band | (text, not a link) | **Gated** |
| 27 | `Talk With Our Team` | Sticky mobile bar | `/contact` | Navy, ≤760px |
| 28 | Phone icon | Sticky mobile bar | `tel:` | **Gated**, ≤760px |
| 29–47 | 19 footer links | Footer | see §5.2 | Footer links |

### Interior-page CTA variants

Every page except `/contact` ends with the `FinalCTA` band → `/contact`. Six
pages override its heading:

| Page | Overridden heading | Sub override |
| --- | --- | --- |
| `/what-we-help-with` | `Not sure which of these is you? That's what the first conversation is for.` | default |
| `/how-lens-works` | `The best way to understand LENS is to talk with someone who does it every day.` | default |
| `/first-visit` | `Still have a question about the first visit? Just ask.` | `Call or send a note — a real person will answer it plainly.` |
| `/locations` | `Not sure which center is closest? Tell us where you are.` | `We’ll match you with the nearest center — or the concierge service — in one quick conversation.` |
| `/locations/[slug]` | Nashville & Murfreesboro: `Come see the space, meet the team, and ask us anything.` Franklin: `Join the Franklin waitlist — founding-client openings are limited.` | default |
| `/resources/[slug]` | per-article (`finalHeading`) | per-article (`finalSub`) |

Other interior CTAs: `Call (615) 000-0000` (location pages, gated),
`Request [First name]` (practitioner profiles → `/contact`, gated pages),
`The founder’s story →`, `Meet the team →`, `Meet the whole team →`,
`What the first visit looks like →`, `A child’s first visit →`,
`How the check-ins work →`, `In depth →` ×8, `Read →` on resource cards,
`Profile →` / `Her story →` on team cards, and the two split links
`For adults` / `For children` on `/what-we-help-with`.

## 4.3 Email capture, lead magnets, downloads, newsletter

**None of these exist.**

- No email field anywhere — the one form collects a phone number only.
- No newsletter signup, no mailing-list block, no footer subscribe field.
- No lead magnet, gated PDF, checklist, quiz, assessment, or download.
- No exit-intent modal, popup, banner, or interstitial.
- The `/resources` section is ungated: articles are plain pages with no
  email-for-content exchange.

## 4.4 Phone numbers, booking links, scheduling embeds

- **Phone:** a single number, `(615) 000-0000` / `tel:+16150000000`, defined in
  `lib/site-config.ts:54-58` with `verified: false`. **It is a placeholder, and
  every phone affordance on the site is hidden in production.** It appears in
  six UI locations (header, mobile drawer, final CTA band, sticky mobile bar,
  location page hero, `/contact` sidebar + form success state), all gated.
- **Booking links:** none. There is no online booking of any kind.
- **Third-party scheduling embeds:** none. No Calendly, Acuity, Cal.com,
  SimplePractice, or similar.
- **Only external link on the site:** the YouTube Shorts URL in the Trisha band
  (gated). `components/Buttons.tsx:28-40` auto-applies
  `target="_blank" rel="noopener"` to any `http` href.
- **No maps embed.** Location pages render a hand-styled sage gradient div with
  a gold dot as a map stand-in (`app/locations/[slug]/page.tsx:343-382`), labeled
  `Embedded map — muted sage style` in dev only.
- No live chat, chatbot, SMS widget, or callback widget.

## 4.5 Sticky, floating, and persistent elements

**Desktop:**

1. **Header** — `position: sticky; top: 0; z-index: 50`, with
   `backdrop-filter: blur(10px)` and a 95%-opacity ivory background. Always
   visible; gains a `.scrolled` class past 8px of scroll.
2. Nothing else. No sticky sidebar, no floating CTA, no back-to-top button, no
   cookie banner, no announcement bar.

**Mobile (≤1060px):**

3. **Hide-on-scroll header** — the header gains `.tucked`
   (`transform: translateY(-100%)`) while scrolling down past 160px, and returns
   on the first upward scroll. Suppressed while the drawer is open or focus is
   inside the header. Height shrinks 88px → 68px, then → 58px when scrolled.
4. **Full-screen drawer** — `position: fixed`, `z-index: 49`, covers the
   viewport below the header. Locks `body` scroll and sets
   `body[data-menu-open]`.

**Mobile (≤760px):**

5. **Sticky bottom CTA bar** — `components/MobileCtaBar.tsx`. `position: fixed`,
   `z-index: 40`, inset 12px left/right, 52px tall plus
   `env(safe-area-inset-bottom)`. **Homepage only** — the component is rendered
   only in `app/page.tsx`. Logic: appears once `.hero` has scrolled fully out of
   view, and retires once `.final` comes within 80% of viewport height. Hidden
   entirely while the drawer is open. `aria-hidden` and `tabIndex={-1}` when
   hidden. Entrance animation is disabled under `prefers-reduced-motion`.

---

# 5. Navigation

## 5.1 Header — `components/Header.tsx`

Desktop nav is hidden below 1060px; the burger + drawer take over.

**Logo** (left): `LogoMark` SVG (gold circle + sage waveform, `aria-hidden`) +
`LogoName` reading `Harmonized` / `BRAIN CENTERS` → **`/`**

**Primary nav (`aria-label="Primary"`), left to right:**

| Item | Destination | Notes |
| --- | --- | --- |
| `What We Help With` | `/what-we-help-with` | Has a hover/focus mega panel |
| `How LENS Works` | `/how-lens-works` | |
| `Your First Visit` | `/first-visit` | |
| `About` | `/about` | No dropdown — founder/team reachable only from the About page or footer |
| `Locations` | `/locations` | |
| `Resources` | `/resources` | |

**Mega panel** (two columns, opens on `:hover` or `:focus-within`):

*Column 1 — H5 `Adults`:*
- `Anxiety & stress` → `/concerns/anxiety`
- `Focus & ADHD` → `/concerns/focus-adhd`
- `Sleep` → `/concerns/sleep`
- `Brain fog & memory` → `/concerns/brain-fog`
- `Emotional regulation` → `/concerns/emotional-regulation`
- `All adult concerns →` → `/adults`

*Column 2 — H5 `Children & families`:*
- `Focus & school difficulties` → `/concerns/focus-adhd`
- `Emotional regulation` → `/concerns/emotional-regulation`
- `Sleep` → `/concerns/sleep`
- `Transitions & sensory overwhelm` → `/concerns/children-school`
- `All children's concerns →` → `/children-families`

**Right side:**
- `(615) 000-0000` → `tel:+16150000000` — **`[DRAFT-GATED]`**, also
  `display: none` below 1060px
- `Talk With Our Team` → `/contact` — navy button; **`display: none` below 640px**
- Burger button — shown ≤1060px, `aria-label` toggles `Open menu` / `Close menu`,
  with `aria-expanded` and `aria-controls="mobile-drawer"`

**Active-state logic:** `What We Help With` highlights for
`/what-we-help-with`, `/concerns/*`, `/adults`, and `/children-families`. Other
items highlight on exact match or as a path prefix.

## 5.2 Footer — `components/Footer.tsx`

Five columns: brand + tagline, then four link groups (each a `FooterGroup` with
an H5 heading). **19 links total.**

**Column 1 — brand:** `LogoName` (ivory) + tagline (see §3.14). No links.

**H5 `Help with`:**
| Label | Destination |
| --- | --- |
| `Anxiety & stress` | `/concerns/anxiety` |
| `Focus & ADHD` | `/concerns/focus-adhd` |
| `Sleep` | `/concerns/sleep` |
| `Children & school` | `/concerns/children-school` |
| `All concerns` | `/what-we-help-with` |

**H5 `Learn`:**
| Label | Destination |
| --- | --- |
| `How LENS works` | `/how-lens-works` |
| `Your first visit` | `/first-visit` |
| `FAQ` | `/faq` |
| `Resources` | `/resources` |
| `Client stories` | `/stories` |

**H5 `Visit`:**
| Label | Destination |
| --- | --- |
| `Nashville` | `/locations/nashville` |
| `Murfreesboro` | `/locations/murfreesboro` |
| `Franklin — coming soon` | `/locations/franklin` |
| `All locations` | `/locations` |

**H5 `Company`:**
| Label | Destination |
| --- | --- |
| `About` | `/about` |
| `Our founder` | `/about/founder` |
| `Our team` | `/about/team` |
| `Contact` | `/contact` |

Then the disclaimer + copyright line (§3.14).

**Not in the footer:** no social media links (none exist anywhere on the site),
no privacy policy, no terms, no accessibility statement, no sitemap link, no
newsletter form, no phone number, no address.

**Note:** `/concerns/brain-fog`, `/concerns/emotional-regulation`,
`/concerns/stress-resilience`, and `/concerns/trauma` are **not** in the footer.
`/adults` and `/children-families` are not in the footer either.

## 5.3 Mobile navigation — how it differs

Below **1060px** the desktop `.nav-links` and the header `tel:` link are
`display: none`, replaced by a burger button opening a full-screen drawer.

**Drawer contents (`aria-label="Mobile"`), in order:**

1. `What We Help With` → `/what-we-help-with` (large serif "d-top" link)
2. Grouped block — **the mega panel flattened into one list**:
   - H5 `Adults` → the same 5 concern links + `All adult concerns →`
   - H5 `Children & families` → the same 4 concern links + `All children's concerns →`
3. `How LENS Works`, `Your First Visit`, `About`, `Locations`, `Resources`
   (all as large serif links)
4. CTA block:
   - `Talk With Our Team` → `/contact` (full-width button)
   - `or call (615) 000-0000` → `tel:` — **`[DRAFT-GATED]`**
   - Note text: `Nashville · Murfreesboro · Franklin (coming soon)`

**Behavioral differences:**
- Drawer closes automatically on route change (`useEffect` on `pathname`)
- `body` scroll is locked while open; `body[data-menu-open]` is set
- Burger animates to an X (middle bar hidden, outer bars rotate ±45°)
- Drawer items fade/rise with a staggered `transition-delay` (0.04s–0.32s),
  disabled under `prefers-reduced-motion`
- The header hides on scroll-down and returns on scroll-up (see §4.5)
- Below **640px** the header `Talk With Our Team` button is hidden entirely —
  on phones the header has only the logo and the burger, and the sticky bottom
  bar (homepage) carries the CTA instead

**Footer on mobile (≤760px):** the four link groups collapse into accordions.
`FooterGroup` renders each H5 as a `<button aria-expanded>` with a `+` mark that
rotates 45° when open. Above 760px the button has `pointer-events: none` and the
lists are always visible. **Default state is closed**, so on a phone the footer
shows four collapsed headings and no links until tapped.

## 5.4 Secondary and in-page navigation

**Breadcrumbs (`.crumb`)** — a single text line above the page hero. Present on
7 route groups; **absent from the homepage and all top-level pages**:

| Page | Breadcrumb |
| --- | --- |
| `/adults` | `What We Help With / For adults` |
| `/children-families` | `What We Help With / Children & families` |
| `/concerns/[slug]` | `What We Help With / {concern title}` |
| `/locations/[slug]` | `Locations / {location name}` |
| `/about/founder` | `About / Our founder` |
| `/about/team` | `About / Our team` |
| `/about/team/[slug]` | `About / Our team / {member name}` |
| `/resources/[slug]` | `Resources / {crumbLabel}` |

Only the ancestor segments are links; the current page is plain text.

**Other in-page navigation:**
- **Audience split** on `/what-we-help-with` — a two-cell bordered block:
  `For adults` / `Focus, sleep, stress, and feeling like yourself` → `/adults`,
  and `For children` / `School, emotions, and calmer days at home` →
  `/children-families`
- **Horizontal concern rail** on the homepage at ≤760px, with progress dots and
  a `Swipe` hint (`components/ConcernRail.tsx`)
- **FAQ accordions** — native `<details>`/`<summary>`, on the homepage (3 items,
  first open), `/faq` (14 items, first open), and each concern page (3 items,
  none open)
- **No table of contents** on article pages, no pagination, no in-page anchor
  links, no "related articles", no search.

---

# 6. `lib/concerns.ts` — all 8 concern entries, verbatim

Each entry drives both a `/concerns/[slug]` page and one entry row on
`/what-we-help-with`. Fields below: `title` (page H1, split into
`titleLead` + italic `titleAccent`), `who`, `heroSub`, the two `overview`
strings used on the index page, the 5 `recognize` bullets, the three `howHelp`
strings, the 3 `goals` cards, and the 3 `faqs`. **No entry contains any
bracketed placeholder — all 8 are complete.**

---

## 6.1 `anxiety`

- **shortTitle:** `Anxiety & stress`
- **title:** `Anxiety & nervous-system overload` (accent: *overload*)
- **who:** `Adults & children`
- **heroSub:** For people whose bodies stay on alert long after the moment has passed — and who are tired of being told to just relax.

**overview.recognize:** A body that stays braced long after the stressful moment has passed. Racing thoughts at bedtime. Overreacting to small stressors, and unable to relax even when life is calm.

**overview.approach:** Sessions are calm by design — quiet room, comfortable chair, nothing asked of you. Many clients report a growing settledness they notice outside our walls first.

**recognize:**
- Thoughts that won't quiet down — especially at night
- Feeling constantly on edge, braced for something
- Overreacting to small stressors, then replaying it
- Struggling to relax even when life is objectively calm
- Feeling mentally or physically stuck in high alert

**howHelp.p1:** An anxious nervous system often feels like a system working harder than it needs to. LENS sessions are quiet and passive — small sensors, a very low-energy feedback signal, nothing to perform — and many clients tell us they gradually feel more settled over a series of visits. Experiences vary.

**howHelp.p2:** There's nothing to perform and nothing invasive. We check how settled you actually feel — sleep, tension, reactivity — at every visit, and let your experience guide the plan.

**howHelp.note:** LENS is a wellness service, not a treatment for anxiety disorders. It works alongside — never in place of — care from your doctor or therapist. Individual experiences vary.

**goalsHeading (H2):** The changes people in high alert most often name.
**goals:**
- Falling asleep without an hour of ceiling-staring.
- A body that stands down when the moment has passed.
- Handling a normal Tuesday like a normal Tuesday.

**faqHeading (H2):** Asked by almost everyone who comes in anxious.
**faqs:**
- **Will the session itself make me anxious?** — It's one of the calmest hours of most clients' week: quiet room, comfortable chair, nothing to do or perform. You can bring a book, headphones, or a parent — whatever helps.
- **Can I keep seeing my therapist?** — Please do. LENS is routinely used alongside therapy, and we're glad to coordinate with providers you already trust. We never advise on medication — that stays between you and your prescriber.
- **When do people notice change?** — It varies honestly — some notice shifts in sleep or settledness within the first few sessions; for others it builds gradually. Your check-ins make progress visible either way.

**Image:** `/images/relax.jpg` (`center 40%`), alt = the concern title.
**metaTitle:** `Anxiety & Nervous-System Overload` *(the only entry with a title override)*

---

## 6.2 `focus-adhd`

- **shortTitle:** `Focus & ADHD`
- **title:** `Focus, ADHD & follow-through` (accent: *follow-through*)
- **who:** `Adults & children`
- **heroSub:** For bright kids whose homework takes three hours, and adults whose projects stall at 90 percent — people who care, try hard, and still can't stay on task.

**overview.recognize:** Homework that takes three hours and ends in tears. Projects that stall at 90 percent. Losing track mid-task, and procrastinating on things you genuinely care about.

**overview.approach:** LENS supports the brain's own capacity to settle and organize — nothing to practice, no tasks to perform. Focus and follow-through are tracked at every check-in.

**recognize:**
- Struggling to stay on task — at work or at school
- Overwhelmed by multi-step responsibilities
- Procrastinating on things you genuinely care about
- Work or schoolwork that stalls at 90 percent
- Losing track mid-task, mid-sentence, mid-plan

**howHelp.p1:** Struggling to focus often feels like working against your own noise. LENS asks nothing of you — nothing to practice, no screens to watch, no tasks to perform — and many clients report feeling clearer and steadier over a series of sessions. Experiences vary.

**howHelp.p2:** Focus and follow-through are tracked at every check-in — homework, deadlines, the everyday specifics — and your plan adjusts to what's actually changing.

**howHelp.note:** LENS is a wellness service, not a treatment for ADHD or any diagnosis. It works alongside — never in place of — your doctor, therapist, or school supports. Individual experiences vary.

**goalsHeading:** The changes people stuck at 90 percent most often name.
**goals:**
- Homework that takes the time homework should take.
- Finishing the last 10 percent of what I start.
- Sitting down to work without an hour of circling first.

**faqHeading:** Asked by almost everyone who comes in scattered.
**faqs:**
- **Does my child have to sit still during a session?** — No. There's nothing a child has to get right in a LENS session — no sitting perfectly still, no concentrating, no being corrected. Kids read, draw, or just be kids while the session runs.
- **Is this a substitute for school supports or medication?** — No. LENS is a wellness service and never replaces your doctor, therapist, or school supports. We never advise on medication — that stays between you and your prescriber.
- **How do you know whether it's helping?** — Every visit opens with a structured check-in on focus, follow-through, and how the week actually went — homework, deadlines, mornings. Your plan follows that data, not a template.

**Image:** `/images/child-session.jpg` (`60% 30%`)

---

## 6.3 `sleep`

- **shortTitle:** `Sleep`
- **title:** `Sleep difficulties` (accent: *difficulties*)
- **who:** `Adults & children`
- **heroSub:** For minds that won't shut off at night, 3 a.m. wakings with no reason, and eight hours that somehow feel like four.

**overview.recognize:** A mind that won't shut off at night. Waking at 3 a.m. for no reason. Sleeping many hours and still waking exhausted.

**overview.approach:** Sleep is one of the first things we ask about at every visit, because it's often where clients notice change earliest. Your plan adjusts to what your nights are telling us.

**recognize:**
- A mind that won't shut off at night
- Waking frequently — or at 3 a.m. for no reason
- Eight hours that feel like four
- Inconsistent, unpredictable sleep
- Waking exhausted no matter how long you slept

**howHelp.p1:** A wired, on-alert evening doesn't stand down just because the lights went out. LENS sessions are quiet and passive — and sleep is often the first thing clients tell us has shifted, which is why we ask about it at every visit. Experiences vary.

**howHelp.p2:** Sleep is one of the first things we ask about at every visit. Your plan adjusts to what your nights are telling us — falling asleep, staying asleep, and how mornings actually feel.

**howHelp.note:** LENS is a wellness service, not a treatment for sleep disorders. It works alongside — never in place of — care from your doctor. Individual experiences vary.

**goalsHeading:** The changes people running on empty most often name.
**goals:**
- Falling asleep without an hour of ceiling-staring.
- Sleeping through the night more often than not.
- Waking up actually feeling rested.

**faqHeading:** Asked by almost everyone who comes in exhausted.
**faqs:**
- **When do people notice changes in sleep?** — It varies honestly — sleep is often where clients notice change earliest, sometimes within the first few sessions; for others it builds gradually. Your check-ins make progress visible either way.
- **Do I have to do anything between sessions?** — No. There's nothing to practice and no homework. We'll simply ask how you've been sleeping at the next visit — that's the data that shapes your plan.
- **Can this work alongside what my doctor recommends?** — Yes — LENS is routinely used alongside other care, and we're glad to coordinate with providers you already trust. We never advise on medication.

**Image:** `/images/recline.jpg` (`center 55%`)

---

## 6.4 `emotional-regulation`

- **shortTitle:** `Emotional regulation`
- **title:** `Emotional regulation` (accent: *regulation*)
- **who:** `Often children — and their parents`
- **heroSub:** For the child who becomes overwhelmed in seconds and stays upset for hours — and the parents living every meltdown alongside them.

**overview.recognize:** Becoming overwhelmed quickly. Intense reactions that are hard to stop. Struggling with transitions, and staying upset long after the original problem has passed.

**overview.approach:** There's nothing a child has to get right in a LENS session — which matters for kids tired of being corrected. Parents join every check-in.

**recognize:**
- Becoming overwhelmed quickly
- Intense reactions that are hard to stop
- Struggling with transitions
- Staying upset long after the moment has passed
- A short fuse — and a long recovery

**howHelp.p1:** Big reactions often come from tipping into overwhelm faster than it's possible to recover. LENS sessions are gentle and passive — nothing to get right, nothing to perform — and many families tell us the hard moments gradually get shorter and end in recovery. Experiences vary.

**howHelp.p2:** There's nothing a child has to get right in a LENS session — which matters for kids tired of being corrected. Parents join every check-in, and we track what matters at home: transitions, recoveries, and how the hard moments actually go.

**howHelp.note:** LENS is a wellness service and doesn't diagnose or treat any condition. It works alongside — never in place of — therapists, pediatricians, and school supports. Individual experiences vary.

**goalsHeading:** The changes families in the meltdown years most often name.
**goals:**
- Meltdowns that get shorter — and end in recovery.
- Transitions without a standoff.
- More patience with the people you love.

**faqHeading:** Asked by almost every parent who calls us.
**faqs:**
- **What if my child melts down at the appointment?** — That's okay — truly. There's nothing a child has to get right here, and our practitioners work with overwhelmed kids every week. Comfort beats stillness, and a parent stays the whole time.
- **Is this only for children?** — No. Plenty of adults come in for exactly this — a short fuse, a long recovery, staying upset past the moment. The sessions are the same gentle format at every age.
- **Can you coordinate with our therapist or school?** — Happily. LENS works alongside — never in place of — the care and supports you already have, and we're glad to communicate with providers you trust.

**Image:** `/images/child-sensor.jpg` (`center 42%`)

---

## 6.5 `brain-fog`

- **shortTitle:** `Brain fog & memory`
- **title:** `Brain fog, memory & mental fatigue` (accent: *fatigue*)
- **who:** `Most often adults`
- **heroSub:** For thinking that feels slow or cloudy, words that vanish mid-sentence, and a mind that's exhausted by responsibilities it used to handle easily.

**overview.recognize:** Thinking that feels slow or cloudy. Losing words mid-sentence. Forgetting why you entered the room, and feeling cognitively exhausted by normal responsibilities.

**overview.approach:** We start with a consultation and a baseline recording of brain activity, then track clarity, recall, and mental energy across your sessions.

**recognize:**
- Thinking that feels slow or cloudy
- Losing words mid-sentence
- Forgetting why you entered the room
- Rereading the same paragraph again and again
- Cognitively exhausted by normal responsibilities

**howHelp.p1:** A foggy brain often feels like a tired one — energy going to noise instead of the task in front of you. LENS sessions are brief and passive, and many clients report thinking feeling clearer and less effortful over a series of visits. Experiences vary.

**howHelp.p2:** We start with a consultation and a baseline recording of brain activity, then track clarity, recall, and mental energy across your sessions — in everyday specifics, not vague impressions.

**howHelp.note:** LENS is a wellness service and doesn't diagnose or treat any medical condition. If you're concerned about cognitive change, talk with your doctor — LENS works alongside, never in place of, that care. Individual experiences vary.

**goalsHeading:** The changes people in the fog most often name.
**goals:**
- Reading a full report without restarting the paragraph.
- Finding the word while the sentence still needs it.
- Mental energy that lasts past 2 p.m.

**faqHeading:** Asked by almost everyone who comes in cloudy.
**faqs:**
- **How do you track something as vague as brain fog?** — By making it specific. Every visit opens with a structured check-in on clarity, recall, and mental energy — the paragraphs, conversations, and afternoons where fog actually shows up.
- **Should I see my doctor first?** — If cognitive change worries you, yes — please do. LENS is a wellness service and never replaces medical evaluation. Many clients pursue both at once.
- **When do people notice change?** — It varies honestly — some notice clearer mornings within a few sessions; for others it builds gradually. Your check-ins make progress visible either way.

**Image:** `/images/glass-head.jpg` (`center 40%`)

---

## 6.6 `stress-resilience`

- **shortTitle:** `Stress & resilience`
- **title:** `Stress & resilience` (accent: *resilience*)
- **who:** `Most often adults`
- **heroSub:** For people who are functioning — holding the job, the family, the calendar — and quietly running on empty.

**overview.recognize:** Functioning, but close to burnout. Rest that doesn't restore. Carrying stress physically, and unable to recover after difficult days.

**overview.approach:** Sessions are short enough to keep in a full life — and they ask nothing of you. For many clients, that genuine off-switch is where things begin to turn.

**recognize:**
- Functioning, but close to burnout
- Rest that doesn't restore
- Carrying stress physically — jaw, shoulders, gut
- Unable to recover after difficult days
- Wanting to handle normal stress normally

**howHelp.p1:** A system that never stands down eventually wears down. LENS sessions ask nothing of you — a comfortable chair, a very low-energy feedback signal, a genuine pause — and many clients report recovering from hard days more easily over time. Experiences vary.

**howHelp.p2:** Sessions are short enough to keep in a full life, and they ask nothing of you — no practicing, no performing. For many clients, that genuine off-switch is where things begin to turn.

**howHelp.note:** LENS is a wellness service, not a medical treatment for burnout or any condition. It works alongside — never in place of — care from your doctor or therapist. Individual experiences vary.

**goalsHeading:** The changes people near burnout most often name.
**goals:**
- Hard days that don't cost the whole next day.
- Rest that actually restores.
- Handling normal stress without overwhelm.

**faqHeading:** Asked by almost everyone who comes in running on fumes.
**faqs:**
- **I barely have time for this. How long are visits?** — Most visits are over in well under an hour — brief enough to fit a lunch break. There's nothing to practice between sessions and no homework.
- **Is this just relaxation?** — The sessions are calm, but the approach is more specific: LENS observes brain activity and delivers a structured, very low-energy feedback signal, and we track how you actually feel at every visit.
- **What if LENS isn't the right fit for me?** — We'll say so in your first conversation — plainly — and point you toward what might serve you better. That's policy, not politeness.

**Image:** `/images/sensors-adult.jpg` (`62% 30%`)

---

## 6.7 `children-school`

- **shortTitle:** `Children & school`
- **title:** `Children, school & transitions` (accent: *transitions*)
- **who:** `Children & teens`
- **heroSub:** For the bright kid who can't show what they know — morning battles, meltdowns, sensory overwhelm, and a child trying hard and still struggling.

**overview.recognize:** A bright kid who can't show what they know. Morning battles, meltdowns, sensory overwhelm, low frustration tolerance — a child trying hard and still struggling.

**overview.approach:** Kids don't have to sit still, concentrate, or perform. We track what matters at home: mornings, homework, and how they talk about themselves.

**recognize:**
- A bright kid who can't show what they know
- Morning battles and homework standoffs
- Meltdowns over transitions
- Sensory overwhelm and low frustration tolerance
- A child starting to say “I'm just bad at school”

**howHelp.p1:** There is nothing a child has to get right in a LENS session. No sitting perfectly still, no concentrating, no being corrected — kids read, draw, or just be kids while the session runs.

**howHelp.p2:** A parent joins every check-in, and we track what actually matters at home: mornings, homework, sleep — and how your child talks about themselves.

**howHelp.note:** We coordinate happily with teachers, therapists, and pediatricians. LENS is a wellness service and never replaces their care. Individual experiences vary.

**goalsHeading:** The changes parents most often hope to see.
**goals:**
- Calmer mornings, fewer standoffs.
- Homework without the nightly battle.
- A kid who stops saying they're “bad at school.”

**faqHeading:** Asked by almost every parent who calls us.
**faqs:**
- **Does my child have to sit still?** — No. There's nothing a child has to get right here — no sitting perfectly still, no concentrating, no being corrected. Comfort beats stillness.
- **Can I stay with my child?** — Always. A parent stays with a child the whole time, and joins every check-in.
- **Will you talk to our school or pediatrician?** — Happily. We coordinate with teachers, therapists, and pediatricians — LENS is a wellness service and never replaces their care.

**Image:** `/images/art-wall.jpg` (`center 45%`)

---

## 6.8 `trauma`

- **shortTitle:** `Trauma-related stress`
- **title:** `Trauma-related stress` (accent: *stress*)
- **who:** `Adults & children`
- **heroSub:** For when the past keeps the present from feeling safe — staying vigilant in rooms where nothing is wrong, with sleep, focus, and calm carrying the weight.

**overview.recognize:** When the past keeps the present from feeling safe. Staying vigilant in rooms where nothing is wrong — with sleep, focus, and calm carrying the weight.

**overview.approach:** LENS doesn't require you to retell or relive anything. Sessions are quiet and predictable, and pair well with the therapy or support you already trust.

**recognize:**
- Staying vigilant in rooms where nothing is wrong
- A body braced long after the danger has passed
- Sleep, focus, and calm carrying the weight
- Startling easily, settling slowly
- The past keeping the present from feeling safe

**howHelp.p1:** LENS doesn't require you to retell or relive anything. Sessions are quiet and predictable — small sensors, a comfortable chair, nothing asked of you — while the system delivers its very low-energy feedback signal. Many clients describe sessions themselves as calming. Experiences vary.

**howHelp.p2:** Sessions pair well with the therapy or support you already trust, and we're glad to coordinate with providers you're working with. We track how settled you actually feel at every visit.

**howHelp.note:** LENS is a wellness service, not a treatment for PTSD or any condition. It works alongside — never in place of — care from your therapist or doctor. Individual experiences vary.

**goalsHeading:** The changes people carrying the past most often name.
**goals:**
- Sitting in an ordinary room and feeling ordinary.
- Startling less, settling faster.
- Sleep that isn't standing guard.

**faqHeading:** Asked by almost everyone who comes in braced.
**faqs:**
- **Will I have to talk about what happened?** — No. LENS doesn't require you to retell or relive anything. Sessions are quiet and predictable, and you're always in control of what you share.
- **Can I keep seeing my therapist?** — Please do. LENS is routinely used alongside therapy, and we're glad to coordinate with providers you already trust. We never advise on medication.
- **What are the sessions like?** — Calm and predictable by design: a quiet room, a comfortable chair, small sensors, and nothing to do or perform. We'll walk you through everything before anything begins.

**Image:** `/images/relax.jpg` (`center 40%`) — **shared with `anxiety`**

**Navigation note:** `trauma` is reachable **only** from `/what-we-help-with`
and the FAQ answer text. It is in no nav menu and no footer group.

---

## 6.9 Shared concern-page structure

Every `/concerns/[slug]` page renders identically
(`app/concerns/[slug]/page.tsx`):

1. Breadcrumb: `What We Help With / {title}`
2. Hero — eyebrow `Concern · {who}`, **H1** `{titleLead}{titleAccent}`,
   sub `{heroSub}`, CTAs: `Talk With Our Team` → `/contact` and
   `How LENS works →` → `/how-lens-works`; image with **alt = the concern title**
3. Two columns — eyebrow `You might recognize` + the 5 bullets;
   eyebrow `How LENS may help` + `p1`, `p2`, and the `note` in a sage box
4. **H2** `{goalsHeading}` under eyebrow `What clients hope to support`, then 3
   `Quote` cards each themed `Common goal` (no attribution)
5. **H2** `{faqHeading}` under eyebrow `Fair questions`, then the 3-item
   accordion (none open by default)
6. `FinalCTA` with default heading

---

# 7. Every other page

Presented in nav order. Each entry: purpose, all headings with levels, and all
CTAs with destinations.

## 7.1 `/what-we-help-with`

**Purpose:** Index of all 8 concerns as long-form entry rows, plus an
adults/children split and an honesty statement.

**Headings:** H1 `Start with what you’re living — not with a label.` ·
H2 ×8 (one per concern, from `lib/concerns.ts` `title`) ·
H4 `You might recognize` and H4 `How we approach it` (repeated per row) ·
H2 `We’d rather earn your trust than your booking.` ·
H2 (FinalCTA) `Not sure which of these is you? That's what the first conversation is for.`

**Hero sub:** You don’t need a diagnosis to be here. These are the concerns that most often bring adults and children through our doors, described the way real families describe them.

**Honesty section body:** If what you’re navigating isn’t a fit for LENS, we’ll say so in your first conversation — and point you toward what might serve you better. We work alongside therapists, physicians, and schools, not in place of them.

**Sage note:** We don’t diagnose conditions or promise outcomes, and every person’s experience is different. What we do promise: honest guidance, gentle sessions, and careful attention to how you actually feel.

**Photo interlude** (between concerns 4 and 5) — eyebrow `Gentle at every age`,
three photos, caption `The same quiet, comfortable session — from grade school to grandparents`:
- `/images/child-sensor.jpg` — alt `A child with a small LENS sensor gently placed`
- `/images/ear-clip-adult.jpg` — alt `An adult with an ear-clip sensor during a session`
- `/images/ear-clip-senior.jpg` — alt `A senior client with an ear-clip sensor during a session`
- Honesty-section photo `/images/concierge.jpg` — alt `A Harmonized practitioner in conversation with a client`

**CTAs:** `For adults` → `/adults` · `For children` → `/children-families` ·
`In depth →` ×8 → `/concerns/{slug}` · `Talk With Our Team` → `/contact`

---

## 7.2 `/adults`

**Purpose:** Adult-audience landing page with a six-concern grid.

**Headings:** H1 `Functioning isn’t the same as feeling like yourself.` ·
H2 `The six concerns adults bring us most.` · H3 ×6 (concern cards) ·
H2 `Short sessions. Nothing to practice. No homework.` · H2 (FinalCTA, default)

**Hero sub:** You’re holding the job, the family, the calendar. And you’re exhausted, foggy, wired at midnight, or a shorter version of yourself than you’d like to be. That’s what we work on.

**The six cards** (labels differ from the homepage set):
`Anxiety & stress` / *Most common* → `/concerns/anxiety` ·
`Focus & ADHD` / *Adults too — not just kids* → `/concerns/focus-adhd` ·
`Sleep` / *Often the first change* → `/concerns/sleep` ·
`Brain fog & memory` / *Cloudy, slow, word-hunting* → `/concerns/brain-fog` ·
`Emotional regulation` / *Short fuse, long recovery* → `/concerns/emotional-regulation` ·
**`Performance & resilience`** / *Functioning near burnout* → `/concerns/stress-resilience`
*(label differs from the concern's own `shortTitle`, `Stress & resilience`)*

**Images:** `/images/ear-clip-adult.jpg` — alt `An adult client during a comfortable LENS session` ·
`/images/recline.jpg` — alt `A client reclining comfortably during a session`

**CTAs:** `Talk With Our Team` → `/contact` · `Read more →` ×6 ·
`What the first visit looks like →` → `/first-visit` · FinalCTA → `/contact`

---

## 7.3 `/children-families`

**Purpose:** Parent-audience landing page.

**Headings:** H1 `Your child isn’t lazy, broken, or “bad at school.”` ·
H2 `Made for kids — without feeling childish.` · H2 (FinalCTA, default)

**Hero sub:** Homework battles, meltdowns, hard transitions, sensory overwhelm — bright kids trying hard and still struggling. We work gently, and we work with the whole family.

**"What parents are seeing" list:** Homework battles and morning standoffs · Trouble focusing at school · Emotional meltdowns and hard transitions · Sleep struggles · Sensory overwhelm and low frustration tolerance · A child who’s trying hard — and starting to give up

**"Why kids do well here":** There is nothing a child has to get right in a LENS session. No sitting perfectly still, no concentrating, no being corrected. Kids read, draw, or just be kids while the session runs. / A parent joins every check-in, and we track what actually matters at home: mornings, homework, sleep — and how your child talks about themselves. / *(sage note)* We coordinate happily with teachers, therapists, and pediatricians. LENS is a wellness service and never replaces their care.

**Caption:** The drawing wall at Nashville — every piece from a client, every piece earned

**Images:** `/images/child-sensor.jpg` — alt `A child with a small sensor gently placed during a LENS session` ·
`/images/child-session.jpg` — alt `A child at ease during a LENS session` ·
`/images/art-wall.jpg` — alt `The client drawing wall at the Nashville center` ·
one `PlaceholderPlate`: `Parent and child in consultation with practitioner — warm, candid`

**CTAs:** `Talk With Our Team` → `/contact` · `A child’s first visit →` → `/first-visit` · FinalCTA → `/contact`

---

## 7.4 `/how-lens-works`

**Purpose:** The LENS explainer and expectation-setting page.

**Headings:** H1 `A gentle signal, a comfortable chair, and nothing to perform.` ·
H2 `Feedback, not force.` · H2 `What it feels like from the chair.` ·
H3 ×4 (session steps) · H2 `What LENS is — and what it isn’t.` ·
H3 `LENS is` and H3 `LENS is not` *(both styled as small uppercase labels, not visual headings)* ·
H2 (FinalCTA) `The best way to understand LENS is to talk with someone who does it every day.`

**Hero sub:** LENS stands for Low Energy Neurofeedback System. Here’s the whole idea without the jargon — and exactly what a session feels like from the chair.

**Waveform captions:** `Brain activity is electrical — and observable` · `The feedback signal is far weaker than everyday signals`

**Three-part explainer:**
- **What the equipment does:** small sensors observe the brain’s electrical activity, and the system returns a brief, very low-energy feedback signal — far weaker than the everyday signals already around you.
- **What you experience:** a comfortable chair and a short, quiet visit. There’s nothing to watch, practice, or concentrate on, and most people — including young children — feel nothing at all.
- **What we hope to support, honestly:** many clients report feeling calmer, sleeping more easily, or thinking more clearly over a series of sessions. Every nervous system responds differently, nothing is guaranteed, and we review what you notice at every visit.

**Session steps** (eyebrow / H3 / body): `Arrive` — `A real check-in` — Sleep, mood, focus, energy — how we know what's actually changing for you. · `Settle` — `Sensors on, feet up` — A comfortable chair and a few small sensors. No gel caps, no discomfort. · `Session` — `Nothing to do` — The feedback lasts moments; most people feel nothing. Kids can just be kids. · `Before you go` — `Review & adjust` — Your practitioner fine-tunes the plan; you leave knowing where things stand.

**`LENS is`:** Gentle and noninvasive — nothing enters the body · Passive — no concentrating or performing · Brief — sessions fit real, busy lives · Personalized from your check-ins, every visit · A wellness service alongside the care you trust

**`LENS is not`:** A medical treatment, diagnosis, or cure · Electrical stimulation — it reads far more than it sends · A screen-based training program to master · A guaranteed outcome — every brain responds differently · A replacement for your doctor, therapist, or school supports

**Images:** `/images/glass-head.jpg` — alt `A glass model of a head — the brain, seen clearly` ·
`/images/ear-clip.jpg` — alt `A small ear-clip sensor, gently placed`, caption `Small sensors, gently placed` ·
`/images/map-points.jpg` — alt `A brain map, reviewed point by point`, caption `Your map, point by point` ·
`/images/lensware.jpg` — alt `LENS software reviewed with a client`, caption `Reviewed with you, every visit`

**Sub note:** Most visits are over in well under an hour.

**CTAs:** FinalCTA → `/contact` only. **No CTA in the hero.**

---

## 7.5 `/first-visit`

**Purpose:** Walk through the first appointment and answer practical questions.

**Headings:** H1 `Know exactly what to expect — before you ever walk in.` ·
H2 `The first appointment, in five parts.` · H4 ×5 (the parts) ·
H2 `The practical details.` · H4 ×4 (detail cards) ·
H2 (FinalCTA) `Still have a question about the first visit? Just ask.`

**Hero sub:** No clipboard queue, no waiting-room limbo, no surprises. Here’s the first visit, minute by minute, for adults and for children.

**Micro-copy:** `[DRAFT-GATED]` prefix `Plan for about [60–90] minutes` + tag `[CONFIRM duration]` + ` · `, then always-visible `Nothing to prepare or bring`

**The five parts:**
1. `You're greeted by name` — Someone is expecting you. Coffee, water, a comfortable seat — and a parent stays with a child the whole time.
2. `We talk first` — What's going on, what you've tried, what you're hoping changes. This is the longest part on purpose.
3. `A gentle baseline recording` — Small sensors take brief readings at a series of points — nothing invasive, nothing to feel. The recording helps guide the initial conversation and your starting plan.
4. `Your plan, explained plainly` — What we noticed, what we'd suggest, what it costs, and what we'd track — in plain language, with every question answered.
5. `You decide — without pressure` — Start that week, think it over, or decide it's not for you. No packages, no countdown offers, no follow-up pestering.

**The four practical details:**
- **`What it costs`** — The consultation conversation is free. Session and mapping pricing is straightforward and shared before you commit to anything. `[Insert verified pricing]` **(tag gated)**
- **`Insurance`** — As a wellness service, LENS is typically not covered by insurance. Many clients use HSA/FSA funds — we’ll give you documentation. `[Confirm HSA/FSA policy]` **(tag gated)**
- **`Bringing a child`** — A parent joins everything. Kids can bring a book, a tablet, or a stuffed animal — comfort beats stillness here.
- **`After you leave`** — Most people simply go back to their day. We’ll check how you slept and felt at the next visit — that’s the data that shapes your plan.

**Image:** `/images/checkin.jpg` — alt `A warm check-in conversation at a Harmonized center`

**CTAs:** `Talk With Our Team` → `/contact` (hero) · FinalCTA → `/contact`

---

## 7.6 `/about`

**Purpose:** Organizational credibility and the care model.

**Headings:** H1 `Large enough to trust. Personal enough to care.` ·
H2 `Families deserved a gentle option — and an honest one.` ·
H2 `What’s identical at every center.` · H4 ×4 (care cards) ·
H2 `More hands, one standard.` · H2 (FinalCTA, default)

**Hero sub:** Harmonized Brain Centers is a team of trained LENS practitioners serving adults, children, and families across Middle Tennessee — one care model, multiple centers, and well over a hundred thousand sessions of experience.

**Proof band (4 stats):** `140,000+` / `sessions provided` **(gated tag)** ·
`Two centers` / `open today — Franklin coming soon` ·
`One standard` / `the same training for every practitioner` ·
`Every visit` / `progress reviewed with a structured check-in`

**"Why we exist":** Harmonized began with a simple conviction: people struggling with focus, sleep, anxiety, and overwhelm deserve a gentle, noninvasive option — and a team that listens before it recommends anything. / Today that conviction is a care model: the same training, the same structured check-ins, the same honest policies at every center — so the experience doesn’t depend on which door you walk through.

**Care cards:** `Practitioner training` (+ gated tag `[Confirm training & review process]`) · `Structured progress tracking` · `Care that doesn’t rely on memory` · `Responsible communication`

**"The team":** Harmonized is deliberately built to grow beyond any one person — practitioners across our centers, trained to the same standard, supported by the same systems.

**Images:** `/images/session-wide.jpg` — alt `A wide view of a calm Harmonized session room` ·
`/images/founder.jpg` — alt `Sheri, Founder & Clinical Director` ·
`/images/practitioner-2.jpg` — alt `A Harmonized practitioner` ·
**two** `PlaceholderPlate`s: `Practitioner portrait — natural light` ×2

**CTAs:** `The founder’s story →` → `/about/founder` · `Meet the team →` → `/about/team` · FinalCTA → `/contact`

---

## 7.7 `/about/founder`

**Purpose:** Founder story. **Currently the least-complete page on the site.**

**Headings:** H1 `Sheri` (from `FOUNDER_DISPLAY_NAME` — surname gated) ·
H2 `Founder-led doesn’t mean founder-only.` · H2 (FinalCTA, default)

**Breadcrumb:** `About / Our founder`

**Hero sub:** The clinical standard behind every Harmonized practitioner — and the reason the check-in question is always “how are you actually feeling?”

**Body — what visitors see today** (the entire article, one paragraph):

> Sheri founded Harmonized Brain Centers to give Middle Tennessee families a gentle, honest option — and built a team trained to the same standard she set with her first clients. Her full story is coming to this page soon.

**`[DRAFT-GATED — NOT CURRENTLY VISIBLE]`** — what renders in dev instead:

> [Founder story — 3–4 short paragraphs, drafted with Sheri: what led her to LENS, the first clients, the conviction that became the care model, and why the practice trains others rather than staying a solo practice.]

> “The measure of our work isn’t a chart. It’s how you actually feel, week to week.” `[Founder to approve quote]`

> [Paragraph on training the team: the curriculum, the apprenticeship, and what she looks for in a practitioner.]

> [Paragraph on what’s next: Franklin, and bringing the same standard to more communities.]

**"Still in the room" section** (always visible): Sheri still sees clients and remains closely involved in practitioner training — and the Harmonized care model is designed so every client, at every center, gets the same standard she set.

**Images:** `/images/founder.jpg` — alt `Sheri, Founder & Clinical Director of Harmonized Brain Centers` ·
`/images/sensors-adult.jpg` — alt `Sensors gently placed during an adult LENS session`

**CTAs:** `Meet the whole team →` → `/about/team` · FinalCTA → `/contact`

---

## 7.8 `/about/team`

**Purpose:** Practitioner roster.

**Headings:** H1 `Practitioners who will know your name — and your story.` ·
H3 per member · H2 (FinalCTA, default)

**Breadcrumb:** `About / Our team`

**Hero sub:** Every Harmonized practitioner completes the same LENS training and works from the same care model. Here’s who you’ll meet.

**Roster (`lib/team.ts`) — 6 entries, but 5 are placeholders:**

| Name | Role | Bio | Production? |
| --- | --- | --- | --- |
| `Sheri` | `Founder & Clinical Director` | Sets the clinical standard, trains every practitioner, and still keeps a client schedule. | **Visible** |
| `[Practitioner name]` | `Practitioner · Children & Teens` | `[Two lines: why they love working with kids, and how they put nervous first-timers at ease.]` | Hidden |
| `[Practitioner name]` | `Practitioner · Murfreesboro` | `[Two lines: background, years with Harmonized, and what clients say about working with them.]` | Hidden |
| `[Practitioner name]` | `Practitioner · Nashville` | `[Two lines.]` | Hidden |
| `[Name]` | `Client Care Coordinator` | The first voice you'll hear on the phone — and the person who keeps scheduling painless. | Hidden |
| `Franklin team` | `Now hiring · Coming soon` | Practitioners for our Franklin center complete the same Harmonized training before opening day. | **Visible** |

**In production this page renders exactly 2 of 6 cards** (Sheri and the Franklin
"now hiring" entry). The heading still promises "who you’ll meet."

**CTAs:** `Her story →` → `/about/founder` (Sheri only) ·
`Profile →` → `/about/team/{slug}` (the 3 placeholder members only — **all 404
in production**) · FinalCTA → `/contact`

---

## 7.9 `/about/team/[slug]` — 3 routes, all placeholder

**Purpose:** Individual practitioner profiles. **All three 404 in production**
(`notFound()` when `isDraftText(member.name)` and draft mode is off).

**Headings:** H1 `[Practitioner name]` · H4 `Training`, H4 `Works most with`,
H4 `Location` · H2 (FinalCTA, default)

**Breadcrumb:** `About / Our team / [Practitioner name]`

Every field is bracketed — eyebrow (e.g. `Practitioner · Children & Teens · Nashville`
is real, but sub is `[One-line personal summary — what clients say it's like to
work with them.]`), `background1` = `[Paragraph: professional background, path
to LENS, time with Harmonized.]`, `background2` = `[Paragraph: approach with
clients…]`, `glance.training` = `Harmonized LENS training curriculum ·
[certifications — confirm]`, `glance.worksWith` and `glance.location` partially
bracketed.

**CTAs:** `Request [First name]` → `/contact` · `{locationName}` →
`/locations/{locationSlug}` · FinalCTA → `/contact`

---

## 7.10 `/locations`

**Purpose:** Location index plus the concierge service.

**Headings:** H1 `One organization. The same care, closer to home.` ·
H3 ×3 (location cards) · H3 `For some families, we come to you.` ·
H2 (FinalCTA) `Not sure which center is closest? Tell us where you are.`

**Hero sub:** Every Harmonized center runs the same care model, the same training, and the same honest policies. Your plan travels with you between centers.

**Card meta differs from the homepage** — here the open centers show address,
hours, phone, parking, and practitioner lines:
- Nashville: **`Nashville, TN`** (street + ZIP gated) / `Mon–Fri 9a–6p · Sat by appointment` / phone **(gated)** / `Free on-site parking` / `Practitioners: Sheri [L.], [Name], [Name]` **(gated — bracketed)**
- Murfreesboro: **`Murfreesboro, TN`** / same hours / `[Parking note]` **(gated)** / `Practitioners: [Name], [Name]` **(gated)**
- Franklin: **`Coming soon`** + `[Opening date — confirm]` **(gated)** / `Serving Franklin, Brentwood, Spring Hill & Thompson's Station` / `Founding-client openings are limited`

**Concierge band:** eyebrow `Concierge sessions at home`, H3 `For some families, we come to you.`

> Our concierge service brings the same practitioners and the same equipment to your home — helpful for packed family schedules and clients who settle best in their own space. `[Confirm service area & pricing]` **(tag gated)**

**Image:** `/images/concierge.jpg` — alt `A practitioner bringing LENS equipment to a client's home`

**CTAs:** `Explore this location →` ×2 · `Join the Franklin waitlist →` → `/contact` · FinalCTA → `/contact`

**Note:** the concierge band has **no CTA of its own** — it is descriptive only.

---

## 7.11 `/locations/[slug]` — 3 routes

Shared template (`app/locations/[slug]/page.tsx`); content from `lib/locations.ts`.

**Shared headings:** H1 (per-location) · H2 (space heading) ·
H2 `Trained to one standard. Yours from first call to final check-in.` ·
H3 per team member · H2 `Know exactly what to expect.` · H4 ×4 (first-visit steps) ·
H2 `Easy to reach from anywhere in the metro.` · H4 `Getting here`, H4 `Communities served`, H4 `Also nearby` · H2 (FinalCTA, per-location)

**Shared first-visit steps:** `Greeted by name` — No clipboard queue, no waiting-room limbo. · `We talk first` — What's going on, what you've tried, what you hope changes. · `A gentle brain map` — Brief readings at a series of points — nothing to feel. · `Plan & honest answers` — Commit only if it feels right. No packages, no pressure.

### Nashville
- **H1:** `A quiet place to get your bearings back.` (accent *bearings*)
- Eyebrow `Nashville, Tennessee` · County `Davidson County`
- **Sub:** Serving families and professionals across Davidson County — a calm, comfortable center that feels more like a well-kept study than a clinic.
- Hero facts: Address `Nashville, TN` (street/ZIP gated) · Hours `Mon–Fri 9a–6p` / `Sat by appointment` · Arrival `Free on-site parking,` / `steps from the door`
- **Space H2:** Designed to lower your shoulders the moment you walk in.
  Sub: No fluorescent hum, no waiting-room churn. Quiet rooms, comfortable chairs, and a team that isn't rushing you anywhere.
- Photos: `/images/session-room.jpg` (hero), `/images/recline.jpg`, `/images/session-wide.jpg`, `/images/art-wall.jpg` — all alt `Inside the Nashville center` / `The Nashville center`
- Team: `Sheri` (visible) + 2 placeholder members (hidden in production)
- **Quote `[DRAFT-GATED]`:** “I expected something clinical and intimidating. What I found was a calm room, people who listened longer than any appointment I've ever had, and — three months later — a kid who likes school again.” — `Parent of an 11-year-old · Nashville`
- Planning: Getting here `[Neighborhood, nearest cross streets, highway access.]` **(gated → fallback)** · Communities `Nashville, Belle Meade, Green Hills, Brentwood, Bellevue, Madison & nearby.` + gated `[Confirm list]` · Also nearby `Murfreesboro center · Franklin coming soon — transfer anytime; your plan travels with you.`
- **FinalCTA:** `Come see the space, meet the team, and ask us anything.`

### Murfreesboro
- **H1:** `The same standard of care, closer to home.` (accent *closer*)
- Eyebrow `Murfreesboro, Tennessee` · County `Rutherford County`
- **Sub:** Serving families and professionals across Rutherford County — the same care model, the same training, and the same honest policies as every Harmonized center.
- Arrival line is `[Parking note]` — **gated, so the Arrival fact disappears entirely in production**
- **Hero image is a `PlaceholderPlate`:** `Murfreesboro — reception or session room, natural light`
- All three space photos are placeholder plates: `Murfreesboro interior — reception, natural light` · `Murfreesboro session room — comfortable chair` · `Murfreesboro exterior — entrance signage`
- Team: **both practitioners are `[Practitioner name]` placeholders** and the coordinator is `[Name]` — **in production the team grid renders empty** beneath the heading "Trained to one standard. Yours from first call to final check-in."
- **Quote `[DRAFT-GATED]`:** “Nobody oversold anything — they just kept asking how I was sleeping. By week four: better than I had in years.” — `Adult client · Murfreesboro`
- Communities: `Murfreesboro, Smyrna, La Vergne & nearby.` + gated `[Confirm list]`
- **FinalCTA:** `Come see the space, meet the team, and ask us anything.`

### Franklin
- **H1:** `The same gentle care is coming to Williamson County.` (accent *Williamson County*)
- Eyebrow `Franklin, Tennessee — coming soon` · County `Williamson County`
- **Sub:** Opening soon. Practitioners for our Franklin center complete the same Harmonized training before opening day — and founding-client openings are limited.
- Hero facts: **Status** `Coming soon` + gated `[Opening date — confirm]` · Hours `Coming soon — opening date to be announced` · **Waitlist** `Join the waitlist for` / `founding-client openings`
- Hero + all space images are placeholder plates: `Franklin — exterior storefront, golden hour` · `Franklin exterior — storefront at golden hour` · `Franklin interior — session room build-out` · `Franklin team portrait — hiring`
- **Space H2:** Built to the same standard as every Harmonized center.
  Sub: Quiet rooms, comfortable chairs, and the same care model, training, and honest policies from day one.
- Team: one entry, `Franklin team` / `Now hiring · Coming soon`
- **Quote `[DRAFT-GATED]`** — reuses the founder quote: “We built Harmonized so that every family gets what my first clients got: someone who truly listens, honest guidance, and a gentle option that never asks them to push through.” — `Sheri, Founder & Clinical Director · Harmonized Brain Centers`
- Communities: `Franklin, Brentwood, Spring Hill & Thompson's Station.` (no confirm tag)
- Also nearby: `Nashville & Murfreesboro centers are open now — start there and transfer anytime; your plan travels with you.`
- **FinalCTA:** `Join the Franklin waitlist — founding-client openings are limited.`

**Production fallback replacing the client quote on all three pages** (eyebrow
becomes `Good to know`):

> Consultations are free, no referral is needed, and you’ll never be asked to commit to a long program up front.

**CTAs per location page:** `Talk With Our Team` → `/contact` ·
`Call (615) 000-0000` → `tel:` **(gated)** · FinalCTA → `/contact`

---

## 7.12 `/stories`

**Purpose:** Client testimonials. **Effectively empty in production.**

**Headings:** H1 `Small changes. Real weeks. Honest telling.` ·
H2 `We track outcomes at every single visit.` · H2 (FinalCTA, default)

**Hero sub:** No miracle stories — just the specific, daily-life changes clients report at check-in. Individual experiences vary, and we’d rather understate than oversell.

**What visitors see today** — the six quote cards and the review band are all
replaced by:

> We’re collecting stories from clients who have agreed to share them — in their own words, with their permission. Check back soon, or ask us anything directly.

**`[DRAFT-GATED — NOT CURRENTLY VISIBLE]`** — the six sample quotes:

1. `Focus · Children` — “For the first time in two years, homework isn't a fight. He sits down, does it, and moves on.” — Parent of a 9-year-old · Nashville
2. `Sleep · Adults` — “Nobody oversold anything — they just kept asking how I was sleeping. By week four: better than in years.” — Adult client · Murfreesboro
3. `Emotional regulation` — “The meltdowns didn't vanish. They got shorter — and she recovers now. That's the part that changed our house.” — Parent of a 7-year-old · Nashville
4. `Stress & resilience` — “Hard days still happen. I just stopped losing the whole next day to them.” — Adult client · Nashville
5. `Brain fog` — “I read a full report without restarting the same paragraph. I texted my husband about it. That's where I was.” — Adult client · Murfreesboro
6. `School` — “His teacher emailed to ask what changed. First email from school I've ever been happy to open.” — Parent of a 10-year-old · Murfreesboro

Plus the sample note and the 3-cell review band (`[4.x] ★` / `Google rating across locations`; `[N] reviews` / `Read them unfiltered on Google`; `Video stories` / `Client interviews in their own words`).

**Always-visible section:** eyebrow `Why the stories are specific`, H2 `We track outcomes at every single visit.`

> Every session opens with a structured check-in on sleep, mood, focus, and energy. That’s why our clients talk in specifics — homework, Tuesdays, paragraphs — instead of vague transformations.

**Image:** `/images/checkin.jpg` — alt `A structured check-in conversation at a Harmonized center`

**CTAs:** `How the check-ins work →` → `/how-lens-works` · FinalCTA → `/contact`

---

## 7.13 `/faq`

**Purpose:** Full FAQ. **Only page besides `/contact` with a single H1 and no
other headings in the page body.**

**Headings:** H1 `Every question, answered plainly.` · H2 (FinalCTA, default).
The 14 questions are `<summary>` elements, not headings.

**Hero sub:** Including the ones people are hesitant to ask. If yours isn’t here, call — a real person answers during business hours.

*(Note: this sub instructs the visitor to call, while the phone number is gated
out of production.)*

**The 14 questions** (first open by default):

1. **What is LENS neurofeedback?** — LENS — the Low Energy Neurofeedback System — uses small sensors to observe the brain's electrical activity and returns a brief, very low-energy feedback signal, far weaker than the everyday signals already around you. There's nothing to perform, and it's offered as a wellness service — not a medical treatment.
2. **Is it safe?** — LENS is gentle and noninvasive. Nothing enters the body, and the feedback signal is far weaker than the everyday signals already around you. We'll walk you through exactly what to expect before anything begins.
3. **Does it hurt?** — No. Most people — including young children — feel nothing at all during a session.
4. **Is it appropriate for children?** — Yes. There's nothing a child has to get right: no sitting perfectly still, no concentrating, no being corrected. Parents are welcome at every visit and every check-in.
5. **Do I have to do anything during the session?** — No. No screens to watch, tasks to complete, or skills to practice. You sit comfortably; many clients read or simply rest.
6. **How long is a session?** — Most visits are over in well under an hour — brief enough to fit a lunch break or a school pickup. `[Confirm typical length]` **(tag gated)**
7. **How many sessions will I need?** — It genuinely varies from person to person. We track how you feel at every visit, review progress together, and never ask you to commit to a long program up front.
8. **What does the first visit include?** — A real conversation about what’s going on, a baseline recording of brain activity, and a personalized plan explained in plain language — with every question answered before you decide anything. See **[Your First Visit](/first-visit)**.
9. **What kinds of concerns do clients come in with?** — Most commonly: anxiety and stress, focus and ADHD, sleep, emotional regulation, brain fog and memory, burnout, school struggles, and trauma-related stress. See **[What We Help With](/what-we-help-with)**.
10. **Is this therapy or medical treatment?** — Neither. We're a wellness practice. LENS doesn't diagnose or treat medical or psychiatric conditions, and it isn't a substitute for care from your doctor or therapist.
11. **Can I continue seeing my doctor or therapist?** — Please do. LENS is routinely used alongside other care, and we're glad to coordinate with providers you already trust. We never advise on medication.
12. **What does it cost?** — The consultation conversation is free. Session and mapping pricing is straightforward and shared before you commit to anything. `[Insert verified pricing]` **(tag gated)**
13. **Does insurance cover it?** — As a wellness service, LENS is typically not covered by insurance. Many clients use HSA/FSA funds — we can provide documentation. `[Confirm policy]` **(tag gated)**
14. **What if I'm unsure whether it's right for me?** — That's exactly what the free conversation is for. Bring the skeptical questions — and if we think LENS isn't a good fit, we'll say so and point you toward what might serve you better.

**In-answer links (the only in-body links on the page):** `Your First Visit` → `/first-visit` · `What We Help With` → `/what-we-help-with`

**CTAs:** FinalCTA → `/contact` only.

---

## 7.14 `/contact`

**Purpose:** The only conversion page. Full mechanics in §4.1.

**Headings:** H1 `Tell us what’s going on. We’ll take it from there.` ·
H4 ×3 (`We call you`, `We listen, then answer`, `You decide`) ·
H3 (success state only) `Thank you, {name}. Here’s what happens next.`

**Hero sub:** A free, no-pressure conversation with a real person from your nearest center`[DRAFT-GATED:` — usually within one business day`]`.

**Right column:** eyebrow `What happens next` + the three steps, then:
- `[DRAFT-GATED]` sage note: Prefer to talk now? Call **(615) 000-0000** — a real person answers during business hours.
- Always visible: **`Helpful to have ready (not required):`** / What a typical hard day looks like · what you’ve already tried · your schedule for a first visit

**This is the only page with no `FinalCTA` band and no imagery of any kind.**

**CTAs:** the form submit button `Request my conversation` only.

---

## 7.15 `/resources`

**Purpose:** Article index. **Renders zero cards in production.**

**Headings:** H1 `Understand the brain you live with.` · H3 per article card ·
H2 (FinalCTA, default)

**Hero sub:** Plain-language guides for parents and adults — written by our practitioners, reviewed against our no-hype standard.

**Empty-state copy** (rendered when the filtered list is empty — **which is the
current production state**):

> Our plain-language guides are being finished now — check back soon, or ask us your question directly and we’ll answer it plainly.

**The six cards** (tag / H3 / excerpt), all `[DRAFT-GATED]` at present:

1. `For parents` — **Homework battles: what's really happening in a stuck brain** — Why “try harder” backfires — and what helps instead.
2. `Sleep` — **Why you're exhausted after eight hours of sleep** — Sleep quantity isn't sleep quality. A plain-language look at a wired-but-tired nervous system.
3. `How it works` — **LENS vs. traditional neurofeedback: an honest comparison** — Active training vs. passive feedback — and who tends to prefer which.
4. `For parents` — **When a bright kid starts saying “I'm just bad at school”** — The self-story problem — and how to interrupt it early. *(no image — plate: `Parent and teen talking at kitchen table — candid`)*
5. `Adults 55+` — **Brain fog after 55: what's normal, what's worth attention** — A calm, non-alarmist guide to cognitive change — and when to talk to your doctor.
6. `How it works` — **What the equipment actually does (and doesn't do)** — A tour of the LENS system — sensors, signals, and safety.

Card images use **empty alt (`alt=""`)** — they are treated as decorative.

**CTAs:** `Read →` per card · FinalCTA → `/contact`

---

## 7.16 `/resources/[slug]` — 6 routes, all 404 in production

**Headings:** H1 (article title) · H2 per `h2` block · H2 (FinalCTA, per-article)

Each article renders: breadcrumb `Resources / {crumbLabel}`, eyebrow
`{tag} · {readTime}`, H1, a `.meta` byline, a `.lede`, an image (alt = the
article title), then the typed body blocks.

**`homework-battles`** is the only one with substantial written copy, and it is
**still not publishable** — two of its five body blocks are bracketed:
- Byline: `By the Harmonized team · Reviewed by Sheri, Clinical Director` *(code comment: `// [Confirm byline & review date]`)*
- Lede: Your child is bright. You know it, their teacher knows it — and yet a worksheet that should take twenty minutes just consumed the whole evening and everyone's patience. Here's what's often happening underneath, and why “try harder” tends to make it worse.
- H2: `It usually isn't a motivation problem` → body `[Body copy — 2–3 paragraphs in plain, non-clinical language. Cite sources where claims are made; keep the no-hype standard.]`
- Blockquote: A brain stuck in high alert can't also be a brain that plans, sequences, and follows through. Those systems take turns.
- H2: `What tends to help` → body `[Body copy — practical guidance first, LENS mentioned honestly as one gentle option among several, with the standard wellness disclaimer.]`
- Closing note: This article is educational and isn't medical advice. LENS is a wellness service and doesn't diagnose or treat any condition. If you're concerned about your child, talk with their pediatrician.
- FinalCTA: `Wondering whether this describes your child? Ask us.` / `A free conversation with a practitioner — honest answers, no pressure, and a plain “not a fit” if that’s the truth.`

**The other five** have byline `By [Practitioner name] · Reviewed by Sheri
[Last name], Clinical Director · [Month Year]`, a `[Draft lede — …]`, one
`[Draft article — …]` paragraph, and a closing note (the adult variant: "…If
you have health concerns, talk with your doctor."). FinalCTA headings:
`The next step is a conversation, not a commitment.` for three of them,
`Wondering whether this describes your child? Ask us.` for `bad-at-school`, and
`The best way to understand LENS is to talk with someone who does it every day.`
for `what-the-equipment-does`.

---

# 8. Technical / SEO surface

## 8.1 Title and meta description per page

**Global template** (`app/layout.tsx`): `title.default` =
`Feel like yourself again — Harmonized Brain Centers`;
`title.template` = `%s — Harmonized Brain Centers`.

**Global description** (inherited by any page not setting its own):

> Gentle, noninvasive LENS neurofeedback support for anxiety, focus and ADHD, sleep, emotional regulation, brain fog, and stress — delivered by trained practitioners at centers across Middle Tennessee.

| Page | Title (as rendered) | Description |
| --- | --- | --- |
| `/` | `Feel like yourself again — Harmonized Brain Centers` *(set via `absolute`, bypassing the template)* | **None set** — inherits the global |
| `/what-we-help-with` | `What We Help With — Harmonized Brain Centers` | The concerns that most often bring adults and children to Harmonized Brain Centers — described the way real families describe them. No diagnosis needed. |
| `/adults` | `For Adults — …` | Gentle LENS neurofeedback for adults — anxiety and stress, focus, sleep, brain fog, emotional regulation, and resilience. Short sessions, nothing to practice, no homework. |
| `/children-families` | `Children & Families — …` | Gentle LENS neurofeedback for children and families — homework battles, meltdowns, hard transitions, and sensory overwhelm. Nothing a child has to get right, and a parent joins every check-in. |
| `/how-lens-works` | `How LENS Works — …` | LENS stands for Low Energy Neurofeedback System. The whole idea without the jargon — and exactly what a session feels like from the chair. |
| `/first-visit` | `Your First Visit — …` | No clipboard queue, no waiting-room limbo, no surprises. The first visit at Harmonized Brain Centers, minute by minute, for adults and for children. |
| `/about` | `About — …` | Harmonized Brain Centers is a team of trained LENS practitioners serving adults, children, and families across Middle Tennessee — one care model, multiple centers, and 140,000+ sessions of experience. |
| `/about/founder` | `Our Founder — …` | Sheri, Founder & Clinical Director — the clinical standard behind every Harmonized practitioner, and the reason the check-in question is always “how are you actually feeling?” |
| `/about/team` | `Our Team — …` | Every Harmonized practitioner completes the same LENS training and works from the same care model. Here's who you'll meet. |
| `/about/team/[slug]` | `{name} — {role} — …` | `{name}, {role} at Harmonized Brain Centers.` |
| `/locations` | `Locations — …` | Every Harmonized center runs the same care model, the same training, and the same honest policies. Nashville, Murfreesboro, and Franklin (coming soon). |
| `/locations/nashville` | `Nashville — …` | Harmonized Brain Centers Nashville — gentle LENS neurofeedback for adults, children, and families across Davidson County. |
| `/locations/murfreesboro` | `Murfreesboro — …` | Harmonized Brain Centers Murfreesboro — gentle LENS neurofeedback for adults, children, and families across Rutherford County. |
| `/locations/franklin` | `Franklin — Coming Soon — …` | Harmonized Brain Centers Franklin — coming soon to Williamson County. Join the waitlist for founding-client openings. |
| `/stories` | `Client Stories — …` | No miracle stories — just the specific, daily-life changes clients report at check-in. Individual experiences vary, and we'd rather understate than oversell. |
| `/faq` | `FAQ — …` | Every question about LENS neurofeedback, answered plainly — including the ones people are hesitant to ask. |
| `/contact` | `Talk With Our Team — …` | Tell us what's going on. A free, no-pressure conversation with a real person from your nearest center. |
| `/resources` | `Resources — …` | Plain-language guides for parents and adults — written by our practitioners, reviewed against our no-hype standard. |
| `/resources/[slug]` | `{article title} — …` | per-article `metaDescription` |

**Concern pages** (`/concerns/[slug]`) — title is `metaTitle ?? title`:

| Slug | Title | Description |
| --- | --- | --- |
| `anxiety` | `Anxiety & Nervous-System Overload — …` | Gentle LENS neurofeedback support for anxiety and nervous-system overload — for people whose bodies stay on alert long after the moment has passed. |
| `focus-adhd` | `Focus, ADHD & follow-through — …` | Gentle LENS neurofeedback support for focus, ADHD, and follow-through — for kids and adults who try hard and still struggle to stay on task. |
| `sleep` | `Sleep difficulties — …` | Gentle LENS neurofeedback support for sleep difficulties — for minds that won't shut off at night and mornings that never feel rested. |
| `emotional-regulation` | `Emotional regulation — …` | Gentle LENS neurofeedback support for emotional regulation — for kids (and adults) who become overwhelmed quickly and recover slowly. |
| `brain-fog` | `Brain fog, memory & mental fatigue — …` | Gentle LENS neurofeedback support for brain fog, memory, and mental fatigue — for thinking that feels slow, cloudy, or spent by mid-afternoon. |
| `stress-resilience` | `Stress & resilience — …` | Gentle LENS neurofeedback support for stress and resilience — for people functioning near burnout whose rest no longer restores. |
| `children-school` | `Children, school & transitions — …` | Gentle LENS neurofeedback support for children and school struggles — for bright kids who are trying hard and still struggling. |
| `trauma` | `Trauma-related stress — …` | Gentle LENS neurofeedback support for trauma-related stress — quiet, predictable sessions that never ask you to retell or relive anything. |

**Observation (stated as fact, not critique):** only `anxiety` sets a
`metaTitle`, so its title is title-cased while the other seven inherit
sentence-cased titles from the display copy.

## 8.2 Structured data

**One schema type, on three pages only.**

`app/locations/[slug]/page.tsx:82-101` outputs an inline
`<script type="application/ld+json">` per location:

```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Harmonized Brain Centers — {Nashville|Murfreesboro|Franklin}",
  "url": "{SITE_URL}/locations/{slug}",
  "telephone": "+16150000000",          // omitted unless SHOW_PHONE
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "…",                // omitted — unconfirmed
    "postalCode": "…",                   // omitted — unconfirmed
    "addressLocality": "Nashville",
    "addressRegion": "TN",
    "addressCountry": "US"
  },
  "description": "{metaDescription}"
}
```

In the current production state `telephone`, `streetAddress`, and `postalCode`
are **all omitted**, leaving city/state/country only.

**Not present anywhere:** `Organization`, `WebSite`, `BreadcrumbList`,
`FAQPage` (despite 14 FAQ items on `/faq`, 3 on the homepage, and 24 across the
concern pages), `Article`/`BlogPosting` (despite `/resources/[slug]`),
`Person`, `MedicalBusiness`, `Service`, `Review`, or `AggregateRating`.

## 8.3 Open Graph and social tags

Defined once in `app/layout.tsx:33-38` and inherited by every page:

```
og:site_name  Harmonized Brain Centers
og:type       website
og:locale     en_US
og:image      /images/hero.jpg  (1600 × 1067)
```

`metadataBase` is `SITE_URL`. `og:title` and `og:description` are derived by
Next.js from each page's `title`/`description`.

`/resources/[slug]` overrides `openGraph: { type: "article" }` — **the only
page-level OG override on the site**.

**Not present:** any `twitter:` card tags, `og:image:alt`, a custom OG image
per page, `canonical` link tags (no `alternates.canonical` anywhere), or
`article:published_time` / `article:author`.

**Other head output:** `viewport` sets `themeColor: "#fbf8f1"` and
`viewportFit: "cover"`. `<html lang="en">`. Favicon is `app/favicon.ico`.

## 8.4 Heading hierarchy per page — flags only

**Every page has exactly one `<h1>`.** No page has zero or multiple H1s.

**However, `components/Header.tsx` emits four `<h5>` elements** (the mega-menu
column labels `Adults` and `Children & families`, duplicated in the mobile
drawer) and `components/FooterGroup.tsx` emits four more. The header's H5s
appear in the DOM **before every page's H1**, so on every page the first
heading encountered is an H5.

**Skipped levels, per page:**

| Page | Sequence | Flag |
| --- | --- | --- |
| `/` | H1 → H2 → H3 (concern cards) → H3 (family row) → H2 → H2 → **H4** (LENS steps) → H2 → H3 (journey) → H2 → **H4** (care rows) → H2 → H3 (location cards) → H2 → H2 | **H2 → H4 skip** ×2 (LENS sequence, care model) |
| `/what-we-help-with` | H1 → H2 → **H4** → H2 | **H2 → H4 skip** (entry row sub-labels) |
| `/concerns/[slug]` | H1 → H2 → H2 → H2 | Clean |
| `/adults` | H1 → H2 → H3 → H2 → H2 | Clean |
| `/children-families` | H1 → H2 → H2 | Clean |
| `/how-lens-works` | H1 → H2 → H2 → H3 → H2 → H3 → H2 | Clean |
| `/first-visit` | H1 → H2 → **H4** → H2 → **H4** → H2 | **H2 → H4 skip** ×2 |
| `/about` | H1 → H2 → H2 → **H4** → H2 → H2 | **H2 → H4 skip** |
| `/about/founder` | H1 → H2 → H2 | Clean |
| `/about/team` | H1 → **H3** → H2 | **H1 → H3 skip** |
| `/about/team/[slug]` | H1 → **H4** → H2 | **H1 → H4 skip** (two levels) |
| `/locations` | H1 → **H3** → H3 → H2 | **H1 → H3 skip** |
| `/locations/[slug]` | H1 → H2 → H2 → H3 → H2 → **H4** → H2 → **H4** → H2 | **H2 → H4 skip** ×2 |
| `/stories` | H1 → H2 → H2 | Clean |
| `/faq` | H1 → H2 | Clean |
| `/contact` | H1 → **H4** ×3 (→ H3 in success state) | **H1 → H4 skip** (two levels) |
| `/resources` | H1 → **H3** → H2 | **H1 → H3 skip** |
| `/resources/[slug]` | H1 → H2 → H2 | Clean |

**Additional structural notes (flags only):**
- The Trisha band's name and role are `<div>`s (`.celeb-name`, `.celeb-role`),
  not headings — so that section has no heading at all.
- `ProofBand` uses `<strong>` for its four stats, not headings.
- All FAQ questions are `<summary>` elements, not headings — on `/faq` this
  leaves the entire body with no headings between H1 and the FinalCTA H2.
- On `/how-lens-works` the two `<h3>` elements `LENS is` and `LENS is not` are
  styled as 14px uppercase labels, so they read visually as eyebrows rather
  than headings.

## 8.5 Crawl surface

**`app/robots.ts`:** `User-agent: *`, `Allow: /`, `Disallow: /api/`, plus a
`sitemap` pointer to `{SITE_URL}/sitemap.xml`.

**`app/sitemap.ts`:** 14 static paths + dynamic paths, every entry
`changeFrequency: "monthly"`, priority `1` for `/`, `0.9` for `/contact`,
`0.7` for everything else.

**In production the sitemap contains 25 URLs:** 14 static + 8 concerns + 3
locations + **0 team profiles** + **0 resource articles** (both dynamic groups
are filtered out by the draft check). The `/resources` and `/about/team` index
pages remain listed while every page they link to is excluded.

**Not present:** `lastModified` on any sitemap entry, canonical tags, `hreflang`,
a `manifest.json`, or any `noindex` directives.

---

# 9. Responsive behavior

All responsive CSS lives in `app/globals.css`. Layout is hand-written CSS grid
and flexbox; Tailwind utilities are essentially unused for layout.

## 9.1 Breakpoints defined

Four `max-width` breakpoints. **There are no `min-width` media queries** — the
site is desktop-first throughout.

| Breakpoint | Role |
| --- | --- |
| **≤1060px** | Tablet/desktop boundary. Desktop nav → burger + drawer; almost every 2- and 3-column grid collapses. |
| **≤760px** | The "phone composition layer." A large appended block (`globals.css:462-692`) that re-art-directs the homepage. |
| **≤640px** | Narrow-phone adjustments (padding, single-column grids, header CTA hidden). |
| **≤360px** | Very narrow phones — protects the headline and rail cards. |

Two non-width queries: `prefers-reduced-motion: reduce` (used four separate
times) and `prefers-color-scheme` is **not** used — there is no dark mode.

`README.md:12-17` records that the mockups defined desktop only, and that the
≤1060/≤760 layers were added afterward so "desktop rendering is untouched."

## 9.2 What changes at ≤1060px

**Navigation:** `.nav-links` and the header `.nav-tel` → `display: none`;
`.nav-burger` → `display: block`; the fixed full-screen `.drawer` becomes
available. Header height 88px → 68px, shrinking to 58px when `.scrolled`. The
header gains hide-on-scroll (`.tucked`). Logo mark shrinks 42px → 33px, logo
name 21px → 17.5px.

**Grids collapsing to one column:** `.hero-grid`, `.split`, `.lens-grid`,
`.goals-grid`, `.duo`, `.duo-form`, `.wwh-hero`, `.prac-hero`, `.trio-quotes`,
`.half-row`, `.family-row`, `.quote-grid`, `.care-list`.

**Grids collapsing to two columns:** `.concern-grid` (3 → 2, with border rules
rewritten), `.steps4` (4 → 2), `.journey` (5 → 2, and the connecting rail
`.journey::before` is hidden), `.proof-grid` (4 → 2), `.loc-grid`,
`.team-grid`, `.res-grid` (3 → 2), `.foot-grid` (5 → 2).

**Other:** `.entry` rows (concern index) go from `320px 1fr 1fr` to one column;
`.celeb-grid` goes to one column.

## 9.3 What changes at ≤760px — the phone composition layer

This layer is the most substantial responsive work on the site.

**Homepage section reordering.** `.home` becomes `display: flex; flex-direction: column`
and each section is given an explicit CSS `order`. **The Trisha band moves from
DOM position 3 to visual position 2**, directly beneath the hero — the source
comment reads "instant credibility right under the hero." Order:
hero(1) → celeb-band(2) → proof(3) → concerns(4) → goals(5) → lens(6) →
journey(7) → care(8) → stories(9) → locations(10) → faq(11) → final(12) →
cta-bar(13). **DOM order is unchanged**, so screen-reader and tab order still
follow the desktop sequence while the visual order differs.

**Content swaps.** `.m-only` → `display: revert` and `.d-only` → `display: none`.
This swaps the hero eyebrow (long → `LENS Neurofeedback`) and the hero sub
(six named concerns → four). It also reveals the concern rail's dots/`Swipe`
cue and the Trisha `.celeb-id` overlay.

**Hero becomes a cinematic overlay.** `.hero-copy` and `.hero-media` are placed
in the same grid cell (`grid-area: 1 / 1`). The photo goes full-bleed
(`position: absolute; inset: 0`), `.hero-scrim` appears as a five-stop
navy gradient, and the copy is pinned to the bottom with `align-self: end`.
Text inverts to ivory, the H1 accent shifts from `--sage-deep` to `#c7d3c3`,
and the primary button inverts to ivory-on-navy. Hero min-height becomes
`min(100svh - 68px, 700px)`.

**Concerns become a swipe rail.** `.concern-grid` switches from
`display: grid` to `display: flex; overflow-x: auto; scroll-snap-type: x mandatory`,
bleeds to the viewport edges (`margin: 0 -24px`), and each card is
`flex: 0 0 80%` so the next card peeks. Scrollbars hidden.

**Family row inverts and overlaps.** The photo moves to `order: 0` above the
copy (a `4/3` crop), and `.fr-copy` is pulled up over it with `margin-top: -60px`
plus a 2px gold top border.

**Journey becomes a vertical timeline.** `.journey` goes to `display: block`;
`::before` becomes a vertical gold rail at `left: 22px`; each `.jstep` gets
`padding-left: 64px` with the number circle absolutely positioned.

**Trisha band restructures completely.** `.celeb-grid` becomes a flex column,
`.celeb-copy` becomes `display: contents`, and the children are reordered:
eyebrow(1) → quote(2) → video(3) → CTA(4). `.celeb-name` and `.celeb-role` are
**hidden** and replaced by the `.celeb-id` overlay on the video. The video goes
full-bleed with a `4/5` aspect ratio.

**Founder note becomes a float.** `.founder-note` goes to `display: block` and
the photo becomes a 106×132 `float: left` thumbnail with text wrapping.

**Footer link groups become accordions.** See §5.3.

**Sticky bottom CTA bar appears.** See §4.5.

**Typography:** `h1` → `clamp(38px, 11.5vw, 50px)` (hero: `clamp(40px, 12.5vw, 56px)`),
`h2` → `clamp(29px, 8.2vw, 37px)`, `.sub` → 17px. `text-wrap: balance` on
headings and `text-wrap: pretty` on `.sub`. Buttons get `min-height: 54px` and
an `:active` press effect. Section padding 100–120px → 80px.

**Safe-area handling:** `env(safe-area-inset-bottom)` is applied to the hero
copy, the final CTA, the footer, the drawer, and the sticky bar.

## 9.4 What changes at ≤640px

- `.wrap` / `.wrap-wide` padding 44px → 24px
- **The header `Talk With Our Team` button is hidden** (`.nav > .nav-cta { display: none }`)
- `.hero-ph` height forced to 340px (later overridden by the 760px layer)
- All remaining multi-column grids → 1 column: `.concern-grid`, `.loc-grid`,
  `.team-grid`, `.res-grid`, `.care-grid`, `.journey`, `.trio-photos`,
  `.trio-feature`, `.facts3`, `.steps4`
- `.goals-list` `column-count` 2 → 1
- `.review-band` becomes a vertical stack
- `.sec-head.split` stacks (heading above its CTA)
- `h1` → 42px; `.split .ph` heights forced to 320px
- Form card padding 48/52px → 32/22px

## 9.5 What changes at ≤360px

Three rules only: hero `h1` → 38px, concern rail cards → `flex-basis: 88%`,
`.celeb-quote` → 25px.

## 9.6 Hidden or reordered on mobile

**Hidden below 1060px:** desktop nav links, header phone link, the mega panel.

**Hidden below 760px:** all `.d-only` spans (long hero eyebrow, long hero sub),
`.celeb-name`, `.celeb-role`, footer link lists (until a group is tapped),
concern-rail scrollbars, the `.journey::before` horizontal rail (replaced by a
vertical one).

**Hidden below 640px:** the header CTA button.

**Shown only below 760px:** all `.m-only` spans, `.hero-scrim`, `.cta-bar`,
`.rail-cue` (dots + `Swipe`), `.celeb-id`, the `.fg-mark` footer `+` marks.

**Reordered on mobile:** the entire homepage section sequence (Trisha band
3 → 2), the family-row photo/copy pair, and the Trisha band's internal children.
In all three cases DOM order is unchanged and only the visual order differs.

**Reduced motion:** four separate `prefers-reduced-motion: reduce` blocks
disable the drawer transition, the header tuck, the drawer stagger, the sticky
bar entrance, and the global `.rv` reveal animation. `RevealOnScroll` also
checks the media query in JS and adds `.in` to every element immediately when
reduced motion is set or `IntersectionObserver` is unavailable.

**Reference screenshots:** four production captures exist at the repo root,
dated 2026-07-14 13:01 — `prod-1440.png`, `prod-834.png`, `prod-390.png`,
`prod-320.png` (untracked in git).

---

# 10. Gaps

Plain list. No commentary.

**Unverified facts blocking production rendering** (`lib/site-config.ts`, all `verified: false`):
- Primary phone number — `(615) 000-0000` is a placeholder; all phone UI hidden
- Founder last name — site shows "Sheri" only
- Founder quote wording — not signed off
- Session count — `140,000+` unverified (renders anyway)
- Founding year — `2016` unverified (renders anyway)
- Google rating and review count — `[4.x]` / `[N] reviews`; block hidden
- Response-time claim — "within one business day"
- Start-timing claim — "Most new clients start within a week of their first call."
- Franklin opening date — empty string; shows "Coming soon" only
- Canonical domain — `SITE_URL` marked `// [CONFIRM domain]`
- Zero verified testimonials — `TESTIMONIALS.some(t => t.verified)` is false

**Bracketed placeholder strings in data files:**
- `[Street address]` and `[ZIP]` — all three locations
- `[Parking note]` — Murfreesboro (card and hero arrival line)
- `[Neighborhood, nearest cross streets, highway access.]` — all three locations
- `[Confirm list]` — communities served, Nashville and Murfreesboro
- `Practitioners: Sheri [L.], [Name], [Name]` — Nashville
- `Practitioners: [Name], [Name]` — Murfreesboro
- `[Practitioner name]` ×3 and `[Name]` ×1 — `lib/team.ts` and `lib/locations.ts`
- `[Two lines: …]`, `[Two lines.]` — 3 team bios
- `[One-line personal summary …]` ×3, `[Paragraph: …]` ×6 — team profiles
- `[certifications — confirm]` ×3, `[Focus areas — confirm]` ×2, `[Days — confirm]` ×2
- `Request [First name]` ×3 — practitioner CTA labels
- `[Founder story — 3–4 short paragraphs …]`, `[Paragraph on training the team …]`, `[Paragraph on what's next …]` — `/about/founder`
- `[Founder to approve quote]` — founder page blockquote
- `[Draft lede — …]` ×5 and `[Draft article — …]` ×5 — `lib/resources.ts`
- `[Body copy — …]` ×2 — the `homework-battles` article
- `By [Practitioner name] · Reviewed by Sheri [Last name], Clinical Director · [Month Year]` ×5 — article bylines

**Confirm tags awaiting values** (`lib/site-config.ts:202-212`):
`FIRST_VISIT_DURATION` (`about [60–90] minutes`), `SESSION_LENGTH_TAG`,
`PRICING_TAG`, `HSA_FSA_TAG`, `INSURANCE_TAG`, `CONCIERGE_TAG`,
`CONTACT_RESPONSE_TAG`, `TRAINING_CLAIM_TAG`, `TRISHA_APPROVAL_TAG`

**Pages that return 404 in production:**
- `/about/team/practitioner-children-teens`
- `/about/team/practitioner-murfreesboro`
- `/about/team/practitioner-nashville`
- `/resources/homework-battles`
- `/resources/exhausted-after-eight-hours`
- `/resources/lens-vs-traditional-neurofeedback`
- `/resources/bad-at-school`
- `/resources/brain-fog-after-55`
- `/resources/what-the-equipment-does`

**Links pointing to pages that 404 in production:**
- `Profile →` ×3 on `/about/team` — but the cards carrying them are themselves filtered out, so the links do not render
- `Read →` on `/resources` cards — cards are filtered out, so the links do not render
- `/resources` and `/about/team` remain in the header nav, footer, and sitemap while every article and profile they lead to is absent

**Sections that render empty or near-empty in production:**
- `/resources` — zero cards, empty-state paragraph only
- `/stories` — zero quotes, holding paragraph only
- `/about/team` — 2 of 6 cards
- `/locations/murfreesboro` team grid — **zero members** beneath its heading
- `/about/founder` — one fallback paragraph in place of the article

**Missing photography** (`PlaceholderPlate` instances currently rendering as bare gradient blocks):
- `Murfreesboro interior — reception or session room, natural light` (homepage card)
- `Murfreesboro — reception or session room, natural light` (location hero)
- `Murfreesboro interior — reception, natural light`
- `Murfreesboro session room — comfortable chair`
- `Murfreesboro exterior — entrance signage`
- `Franklin exterior — storefront at golden hour` (homepage card)
- `Franklin — exterior storefront, golden hour` (location hero)
- `Franklin interior — session room build-out`
- `Franklin team portrait — hiring` (×2)
- `Practitioner portrait — natural light, ivory backdrop` (×3)
- `Practitioner portrait — natural light` (×2, `/about`)
- `Client care coordinator portrait — natural light` (×2)
- `Client care coordinator portrait`
- `Parent and child in consultation with practitioner — warm, candid`
- `Parent and teen talking at kitchen table — candid`

**Unwired or absent conversion infrastructure:**
- No email notification, webhook, autoresponder, or alert on form submission — rows land in Supabase only
- No `.env.local` present, so `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` are unset locally; submitting returns `500` with "The form isn't configured yet. Please call us instead." — which points the visitor at a phone number that is hidden
- No analytics or tag manager of any kind
- No thank-you URL — the success state replaces the form in place, so no conversion event is observable
- No rate limiting, CAPTCHA, or honeypot on the public API route
- `source_page` field is populated from a `?from=` parameter that nothing on the site sets
- No email capture, newsletter, lead magnet, or download anywhere
- No booking or scheduling integration
- Sticky mobile CTA bar is rendered on the homepage only

**Unbuilt or absent pages:**
- No privacy policy
- No terms of service
- No accessibility statement
- No custom 404 (`not-found.tsx`), error, or loading page
- No `/pricing`
- (None of these are linked from anywhere, so none is a dead link)

**Structured data and SEO gaps:**
- No `FAQPage` schema despite 41 Q&A pairs across the site
- No `Article` / `BlogPosting` schema on resource pages
- No `Organization`, `WebSite`, or `BreadcrumbList` schema
- No canonical tags on any page
- No Twitter card tags
- No per-page OG image; every page shares `/images/hero.jpg`
- No `lastModified` in the sitemap
- `LocalBusiness` JSON-LD currently omits `telephone`, `streetAddress`, and `postalCode` on all three locations
- Homepage sets no meta description of its own (inherits the global)

**Code-level notes:**
- No `TODO`, `FIXME`, `XXX`, or `HACK` comments exist anywhere in `app/`, `components/`, or `lib/` — the tracking mechanism is the `Verifiable` type and `CONTENT-CHECKLIST.md` instead
- `components/Eyebrow.tsx` is defined but imported by no file
- `lib/site-config.ts` exports `draftText()`, which is imported by no file
- `next.config.ts` is empty (`/* config options here */`)
- Git working tree has 34 modified and 9 untracked files; no remote is configured
- `.next/` contains a build dated 2026-07-14 13:02; `app/page.tsx` and `app/globals.css` have changed since

**Ambiguities I could not resolve from the codebase:**
- Whether a production deployment exists, and if so what flag state it was built with (no remote, no deploy config; I did not fetch the live site)
- Whether `design-reference/` is still intended to be kept in sync (README says yes for design/copy; the mobile layer already diverges — see §2.3)
- Whether `Franklin waitlist` and `Concierge / at home` selections in the contact form route anywhere differently — they are stored as plain text in `preferred_center` with no downstream branching in the codebase
- Who monitors the `consultation_requests` table
