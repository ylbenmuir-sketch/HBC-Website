# Harmonized Brain Centers — Website

Production Next.js site for Harmonized Brain Centers, a LENS neurofeedback
**wellness practice** (not a medical clinic) serving Nashville, Murfreesboro,
and Franklin (coming soon), established 2016.

Built from the finished design system in [`/design-reference`](design-reference/)
— 18 HTML mockups, `css/main.css`, `js/site.js`, and graded brand photography.
**Those files are the source of truth for design, copy, and interaction; leave
them untouched.**

### Mobile design layer

The mockups only define desktop; phones get their own art direction. All of it
lives at the end of `app/globals.css` under the "Mobile design layer" banner —
every rule is inside a `max-width` media query (≤1060px header, ≤760px phone
compositions), so desktop rendering is untouched. Key pieces:

- **Homepage flow** — `app/page.tsx` wraps sections in `.home`; at ≤760px it
  becomes a flex column. It no longer re-sequences anything: the `order`
  overrides existed only to lift the Trisha band above the proof band, and
  once the band moved to that position in the DOM they were deleted. Phone and
  desktop now read in the same order, so section sequence is changed by moving
  the section, not by adding a rule.
- **Hero** — copy and photo share one grid cell on phones (image layered
  behind a scrim, copy pinned to the base). `.m-only`/`.d-only` spans swap
  the short mobile eyebrow/sub for the desktop copy.
- **PhotoFrame** — optional `positionMobile` (per-crop art direction via the
  `--ph-pos-m` custom property) and `aspect` props; desktop callers unchanged.
- **Sticky CTA** — `components/MobileCtaBar.tsx` (homepage, ≤760px only);
  same "Get a Free Call Today" → `/contact` ask, retiring near the final CTA band.
- Motion (drawer stagger, sticky-bar entrance, reveals) is gated behind
  `prefers-reduced-motion` like everything else.

## Stack

- Next.js 15 (App Router) · React 19 · TypeScript
- Tailwind CSS v4 (brand tokens in `app/globals.css` `@theme`; the ported
  design-system classes live in the same file)
- Fonts via `next/font`: Cormorant Garamond (display) + DM Sans (body)
- Supabase (contact-form storage only)

## Local development

```bash
npm install
cp .env.example .env.local   # fill in values (see below)
npm run dev                  # http://localhost:3000
npm run build                # production build
npm run lint
```

The site runs without `.env.local` — every page renders; only the contact-form
submission requires Supabase credentials.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `SUPABASE_URL` | Supabase project URL (Settings → API). Server-side only. |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key used by `app/api/consultation/route.ts` to insert form submissions. **Never expose to the browser; never commit.** |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL for canonical tags, `og:url`, `sitemap.xml`, `robots.txt`, and JSON-LD. Apex form, no trailing slash — `https://harmonizedbraincenterstn.com`. Defaults to that value; set it explicitly in the deploy environment. |
| `RESEND_API_KEY` | Resend key used by `lib/lead-notification.ts` to email each new consultation request. Server-side only. Unset = leads save but nobody is notified. |
| `LEADS_NOTIFY_EMAIL` | Inbox that receives new consultation requests. Required alongside `RESEND_API_KEY`. |
| `LEADS_NOTIFY_FROM` | Optional sender address; must be on a domain verified in Resend. Defaults to Resend's shared test sender, which only delivers to the account owner. |
| `NEXT_PUBLIC_FEATURE_CELEBRITY` | `true` renders the Trisha Yearwood band under the hero. Read at **build** time (`NEXT_PUBLIC_*` is inlined), so production needs it set in the deploy environment *and* a redeploy. Permissions below still apply. |

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Run the migration in `supabase/migrations/0001_consultation_requests.sql`
   (SQL Editor → paste → run, or `supabase db push` with the CLI).
3. Copy the project URL and service-role key into `.env.local`.

Submissions land in `public.consultation_requests`
(`id, created_at, type, helping_who, concerns text[], first_name, phone,
email, preferred_center, best_time, note, source_page`). RLS is enabled with no
public policies — only the service-role key (server) can read/write.
**The form collects no payment details, ever.**

One table holds two row shapes, told apart by `type`:

| `type` | Written by | Required |
| --- | --- | --- |
| `consultation` | `components/ContactForm.tsx` | `helping_who`, `first_name`, `phone` (`email` optional) |
| `guide` | `components/GuideCta.tsx` | `email` only |

A check constraint enforces each shape, so the nullable columns can't be
abused. Both kinds notify `LEADS_NOTIFY_EMAIL`, with a message shaped to what
was collected (`lib/lead-notification.ts`): a consultation reads as a callback
request, a guide signup as a download — address, source page, and time only,
so nobody phones someone who only wanted a PDF.

## Content verification & draft mode

Every unverified fact is centralized and **cannot ship to production**:

- Draft mode (`npm run dev`, or `NEXT_PUBLIC_SHOW_DRAFT_CONTENT=true`) renders
  unverified values with visible gold `[CONFIRM]` tags.
- Production builds hide unverified blocks entirely (phone UI, review ratings,
  sample testimonials, draft team profiles/articles, placeholder addresses).
- The Trisha Yearwood band renders only with `NEXT_PUBLIC_FEATURE_CELEBRITY=true`
  (set in `.env.example`; production needs it in the deploy environment plus a
  rebuild). The gate itself stays — every permission must still be confirmed in
  writing, and the flag being on is not evidence that they are.
- `REQUIRE_VERIFIED_CONTENT=true npm run build` fails the build while required
  facts are unverified (`lib/content-validation.ts`).

See **[CONTENT-CHECKLIST.md](CONTENT-CHECKLIST.md)** for the full launch list.

### Build-time checks

Two modules run as side effects of `app/layout.tsx`, so both execute on every
`next build`:

| Module | Checks |
| --- | --- |
| `lib/content-validation.ts` | Unverified facts (phone, review stats, testimonials, the same-day callback promise). |
| `lib/config-validation.ts` | Missing runtime config — currently `RESEND_API_KEY` and `LEADS_NOTIFY_EMAIL`. |

Both warn in a normal production build and **throw** under
`REQUIRE_VERIFIED_CONTENT=true`, so the launch build fails on either an
unverified fact or a missing lead-notification setting. Unverified content only
hides itself; missing config silently drops leads on the floor, which is why it
fails the same gate.

## Content model

All page copy that varies by entity is data-driven:

| File | Drives |
| --- | --- |
| `lib/site-config.ts` | Phone number, disclaimer, review stats, **every [CONFIRM]/[Insert] placeholder value** |
| `lib/concerns.ts` | All 8 concern pages (`/concerns/[slug]`) + the What We Help With entries |
| `lib/locations.ts` | `/locations/[slug]` (Nashville seeded; Murfreesboro/Franklin data-driven) + location cards + JSON-LD addresses |
| `lib/team.ts` | `/about/team` grid + `/about/team/[slug]` profiles |
| `lib/resources.ts` | `/resources` cards + `/resources/[slug]` articles (homework-battles seeded) |

## Replacing the [CONFIRM] / [Insert …] placeholders

Gold tags mark **unverified facts**. They render visibly on purpose and must
each be replaced with a verified value before launch. Testimonial quotes carry
a "sample copy" note that must remain until quotes are verified.

Search the repo for `[CONFIRM`, `[Insert`, `[Street address`, `[ZIP`,
`[DATE`, `[Name`, `[Practitioner`, `[Last name`, `[Month Year`, `[Draft`,
`[Parking`, `[Neighborhood`, `[certifications`, `[Focus areas`, `[Days`,
`[Body copy`, `[Founder story`, `[Paragraph`, `[One-line`, `[Two lines` —
or work through the files below:

| File | Placeholders to replace |
| --- | --- |
| `lib/site-config.ts` | Phone number (display + tel:), Trisha Yearwood name/likeness approval, founder last name, Google rating + review count, response-time promise, first-visit duration, session length, pricing, HSA/FSA + insurance policy, concierge service area & pricing |
| `lib/locations.ts` | Franklin street address + ZIP (Nashville and Murfreesboro are confirmed; a confirmed address also unlocks `geo` and `hasMap` in the LocalBusiness JSON-LD, so add `geo` coordinates when Franklin's lands), Murfreesboro parking note, Franklin opening date, practitioner name lists, "getting here" directions, communities-served lists |
| `lib/team.ts` | Practitioner names, bios, certifications, focus areas, schedules; coordinator name; Franklin opening date |
| `lib/resources.ts` | Article bylines (`[Practitioner name]`, `[Month Year]`) and the `[Draft…]`/`[Body copy…]` article bodies (homework-battles included) |
| `app/page.tsx` | Location-card address/date lines (mirror `lib/locations.ts` when confirming) |
| `app/locations/page.tsx` | Same address/date lines on the index cards |
| `app/about/founder/page.tsx` | Founder story paragraphs (`[Founder story…]`, `[Paragraph…]`) |
| `components/Footer.tsx` / `FinalCTA.tsx` | Nothing hard-coded — both read from `lib/site-config.ts` |

Also replace when assets exist:

- **Photography plates** — sage-gradient `PlaceholderPlate` blocks list their
  needed shot (Murfreesboro/Franklin interiors, practitioner portraits,
  parent-and-child consult, kitchen-table candid). Swap for `PhotoFrame`
  with the new image in `/public/images`.
- **Sample testimonials** — every quote on `/`, `/stories`, and the location
  pages is sample copy; the "sample copy" notes must remain until each quote
  is verified.
- **Location map** — the sage map placeholder on `/locations/[slug]` awaits an
  embedded map (muted sage style) once addresses are confirmed.

## Compliance guardrails

- Harmonized is a **wellness practice, not a medical clinic**. The footer
  disclaimer (`lib/site-config.ts` → `DISCLAIMER`) appears on every page —
  never remove or soften it, and never add medical claims (diagnose / treat /
  cure / prevent language) anywhere.
- Primary CTA everywhere is **"Get a Free Call Today" → `/contact`**
  (`TalkCta` in `components/Buttons.tsx`). Don't introduce competing CTAs.
- One secondary CTA exists: **"Book Your Brain Map — $150"** (`BrainMapCta`),
  the priced first visit, for visitors who arrive already sold. It appears in
  exactly four places — the homepage hero, the homepage Harmonized Brain Map
  section, `/first-visit`, and `/how-lens-works` — always beside `TalkCta`,
  never instead of it, and it points at the same `/contact` destination.
  Don't add a fifth.
- One transitional CTA exists: `components/GuideCta.tsx` ("Not ready to
  call?"), an email capture for visitors who aren't calling today. It sits
  below the `FinalCTA` band on `/`, `/resources`, and `/concerns/[slug]`,
  asks for one field, and uses an outline button so it stays visually
  subordinate to the primary ask. It posts to the same API route — never
  build it a second system.
- The Trisha Yearwood video (`https://www.youtube.com/shorts/fhmoa68_uHY`)
  has embedding disabled — it must stay a thumbnail linking out, never an
  iframe.

## Deploying to Vercel

1. Push the repo to GitHub/GitLab.
2. [vercel.com/new](https://vercel.com/new) → import the repo (framework
   auto-detects as Next.js; no custom build settings needed).
3. Add the environment variables under Project → Settings → Environment
   Variables for Production (and Preview if desired): `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, plus
   `RESEND_API_KEY` and `LEADS_NOTIFY_EMAIL` (and optionally
   `LEADS_NOTIFY_FROM`) so submitted leads reach a human. The build warns
   loudly while the last two are unset — see "Build-time checks" below.
   Add `NEXT_PUBLIC_FEATURE_CELEBRITY=true` here as well for the Trisha
   band — it is compiled into the bundle, so setting it without redeploying
   changes nothing.
4. Deploy. The production domain is `harmonizedbraincenterstn.com`; the apex
   is canonical, so add both apex and `www` in Project → Settings → Domains
   and point the `www` record at the apex with a **301** (Vercel's "Redirect
   to" on the `www` domain). HTTPS redirection is automatic. Every absolute
   URL the site emits already uses the apex, so nothing else has to change.

## Route map

```
/                       homepage (index.html)
/what-we-help-with      all 8 concerns, entry rows
/concerns/[slug]        anxiety · focus-adhd · sleep · emotional-regulation ·
                        brain-fog · stress-resilience · children-school · trauma
/adults                 adults landing
/children-families      children & families landing
/how-lens-works         LENS explainer
/first-visit            first visit, minute by minute
/about                  about + care model
/about/founder          founder story
/about/team             team grid
/about/team/[slug]      practitioner profiles
/locations              all locations + concierge band
/locations/[slug]       nashville · murfreesboro · franklin (JSON-LD on each)
/stories                client stories (sample copy)
/faq                    full FAQ
/contact                form → POST /api/consultation → Supabase
/resources              learning center
/resources/[slug]       articles (homework-battles seeded)
```
