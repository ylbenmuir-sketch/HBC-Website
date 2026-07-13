# Harmonized Brain Centers — Website

Production Next.js site for Harmonized Brain Centers, a LENS neurofeedback
**wellness practice** (not a medical clinic) serving Nashville, Murfreesboro,
and Franklin (coming soon), established 2016.

Built from the finished design system in [`/design-reference`](design-reference/)
— 18 HTML mockups, `css/main.css`, `js/site.js`, and graded brand photography.
**Those files are the source of truth for design, copy, and interaction; leave
them untouched.**

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
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL for metadata, `sitemap.xml`, `robots.txt`, and JSON-LD. |

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Run the migration in `supabase/migrations/0001_consultation_requests.sql`
   (SQL Editor → paste → run, or `supabase db push` with the CLI).
3. Copy the project URL and service-role key into `.env.local`.

Submissions land in `public.consultation_requests`
(`id, created_at, helping_who, concerns text[], first_name, phone,
preferred_center, best_time, note, source_page`). RLS is enabled with no
public policies — only the service-role key (server) can read/write.
**The form collects no payment details, ever.**

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
| `lib/site-config.ts` | Phone number (display + tel:), site domain, Trisha Yearwood name/likeness approval, founder last name, Google rating + review count, response-time promise, first-visit duration, session length, pricing, HSA/FSA + insurance policy, concierge service area & pricing |
| `lib/locations.ts` | Street addresses + ZIPs (all three centers — these also feed the LocalBusiness JSON-LD), Murfreesboro parking note, Franklin opening date, practitioner name lists, "getting here" directions, communities-served lists |
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
- Primary CTA everywhere is **"Talk With Our Team" → `/contact`**. Don't
  introduce competing CTAs.
- The Trisha Yearwood video (`https://www.youtube.com/shorts/fhmoa68_uHY`)
  has embedding disabled — it must stay a thumbnail linking out, never an
  iframe.

## Deploying to Vercel

1. Push the repo to GitHub/GitLab.
2. [vercel.com/new](https://vercel.com/new) → import the repo (framework
   auto-detects as Next.js; no custom build settings needed).
3. Add the three environment variables under Project → Settings →
   Environment Variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
   `NEXT_PUBLIC_SITE_URL`) for Production (and Preview if desired).
4. Deploy. Set the production domain, then update `NEXT_PUBLIC_SITE_URL`
   to match and redeploy so sitemap/OG/JSON-LD URLs are correct.

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
