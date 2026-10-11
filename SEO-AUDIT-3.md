# SEO Audit #3 — Machine-readability — Harmonized Brain Centers

**Date:** 2026-10-10
**Audited commit:** `origin/main` @ `ead3c84e30742d93350eedc253252159546eb1d0` — "Bridge the 8px dead band under the mega-menu trigger" (2026-09-01).
**Report only. Nothing in the repository was changed.**

---

## 0. Scope, method, and what I could not measure

### The checkout was not on main

The working tree is on `feature/sticky-ask-bar` (`8f9bd6d`) with 13 modified and 4 untracked files, and local `main` is **51 commits behind** `origin/main`. Switching branches would have disturbed uncommitted work, so `origin/main` was checked out into a disposable git worktree outside the repository and audited there. That worktree has been removed. Everything below describes `ead3c84`, which is what "main, up to date" currently means.

The diff between `feature/sticky-ask-bar` and `origin/main` touches `app/layout.tsx` and `app/page.tsx` among 14 files; nothing in this report was re-checked against that branch.

### How it was measured

- `next build` (webpack — Turbopack refuses a symlinked `node_modules`) with `NEXT_PUBLIC_SITE_URL=https://harmonizedbraincenterstn.com`, `NEXT_PUBLIC_FEATURE_ASSISTANT` and `NEXT_PUBLIC_FEATURE_CELEBRITY` on, as in the local `.env.local`. The first build used the `localhost:3000` value from `.env.local` and every canonical, `og:url`, sitemap `<loc>` and JSON-LD `url` came out pointing at localhost. That is SEO-AUDIT-2 B2 and it is still the default on this machine.
- `next start` on a local port. All 40 sitemap URLs fetched and parsed: `<head>`, headings, landmarks, every JSON-LD block, every `<img>`, every `<a>`.
- Probes for 404 behaviour, trailing slashes, query strings, case, `/index.html`, `/llms.txt`, `/humans.txt`, `/.well-known/security.txt`, `/manifest.webmanifest`, the guide, and the API routes.
- The repo's own `check:links` (in-content and whole-document graphs) and `check:cwv` (median of three, mobile and desktop).
- Lighthouse 12 on five templates (`/`, `/concerns/sleep`, `/locations/nashville`, `/resources/homework-battles`, `/contact`) under its default simulated slow-4G mobile profile, plus the desktop preset on `/`. Lighthouse throttles harder than `check:cwv`; both sets are reported.
- Social previews are inferred from the emitted tags against each platform's documented parser. No scraper was run against a live URL, because there is no live URL.

### Not measurable

The domain still serves WordPress. No field CWV, no Search Console, no Rich Results Test on a public URL, no scraper debuggers, no apex/www/https behaviour, no CDN cache headers. Section 7.3 lists what that blocks.

---

## 1. Executive summary

The build is technically clean in the ways most sites are not: self-referencing canonicals on every route, a complete Open Graph set on every route, a 404 that is a real 404 with `noindex`, an `@id`-linked schema graph with one Organization entity, zero orphans, no redirect chains, Lighthouse SEO 100 and Best Practices 100 on every template. Two prior audits did their job. **This one found the things that sit underneath those checks.**

Ranked by what it costs:

1. **The pages built to rank for "neurofeedback for X" do not say "neurofeedback."** The word appears **zero times** in the main content of all eleven `/concerns/*` pages, `/adults`, `/first-visit` and `/what-we-help-with`. Twice in 1,348 words on the homepage. The concern H1s are bare labels ("Sleep difficulties"). No concern page names a city. Titles were fixed in audit 2; the bodies they describe were not. This is the single largest ranking defect on the site and it is a copy edit.
2. **~108 legacy WordPress URLs still have no redirect anywhere in code.** `next.config.ts` has no `redirects()`, there is no `middleware.ts`, no `vercel.json`. Audit 2 documented the inventory a month ago. It can be written and committed now and tested later; it has not been.
3. **Nothing on the site measures anything.** No GA4, no Tag Manager, no Plausible, no `google-site-verification` meta. Post-launch, every number in this document is unobservable.
4. **Every one of 40 URLs shares one Open Graph image.** No page renders as a bare card — but a 3 a.m. sleep article, a Murfreesboro location page and the privacy policy all unfurl as the same smiling woman and the same headline. Next can generate per-route images at build time; the site does not.
5. **The heading outline is broken on every page by the site chrome.** Four `<h5>`s (mega-menu column labels, desktop and mobile drawer) precede the `<h1>`, and four more close every page in the footer. Lighthouse `heading-order` fails on all five templates. There is no skip link, and the breadcrumb is a `<div>`.
6. **Mobile LCP is 2.6–3.0 s under Lighthouse's throttle.** The homepage hero is preloaded and eager, yet 2.56 s of its 3.0 s LCP is *render delay*: the `.rv` reveal still gates first paint on the JS bundle. On concern pages the hero photograph is the LCP element and ships `loading="lazy"`. Neither has `fetchpriority="high"`. `check:cwv`'s lighter profile hides this (0.66–1.31 s).
7. **The sitemap's `lastmod` is two constants.** Thirty URLs say 2026-08-22, nine articles say 2026-08-23. Google uses `lastmod` only when it is consistently accurate; this pattern is the signature of a site that is not.
8. **Structured data is correct but shallow.** No `WebSite`, no `WebPage`, no `@graph`; cross-references are bare `{"@id"}` with no `@type` or `name`; seven named practitioners with on-page roles and credentials have no `Person`; 12 of 40 routes carry no breadcrumb; Murfreesboro's `LocalBusiness` has no `image`.
9. **The site has no AI-crawler policy and no `llms.txt`.** It is fully server-rendered and extractable, which is the part that matters, but the facts a model would quote are stated two ways in two places ("140,000+ sessions" vs "well over a hundred thousand"; "Neurofeedback Therapy" in the homepage title vs "Is this therapy? Neither." in the FAQ).
10. **Colour contrast fails on every page** — the gold wordmark at 3.23:1 — with the candidate fixes already documented in `CONTRAST-OPTIONS.md` and not applied.

What is *not* wrong, so it is not re-litigated: titles and descriptions are unique with none over length; canonicals strip query strings; 404s are 404s; trailing slashes 308 to one form; robots.txt and sitemap are consistent; the lead-magnet HTML is `noindex, nofollow` and disallowed; alt text is descriptive; forms are labelled with `autocomplete`; tap targets pass; CLS is ~0.02; TBT is near zero; there is no self-serving `aggregateRating`, no fake review markup, no medical types contradicting the disclaimer, and nothing that would draw a manual action.

---

## 2. Google / search

### 2.1 Per-route table

40 routes. All 200. All indexable (no `robots` meta, no `X-Robots-Tag`). All canonicals absolute, self-referencing, resolved against `metadataBase`. One `<h1>` per page, all 40 unique. No duplicate titles, descriptions or H1s.

| Route | Title (len) | Desc | H1 | Schema beyond Organization | Words in `<main>` |
|---|---|---|---|---|---|
| `/` | Neurofeedback Therapy in Nashville & Murfreesboro, TN (57) | 126 | Help for anxiety, focus, and sleep — without medication. | — | 1,348 |
| `/what-we-help-with` | What We Help With — HBC (44) | 152 | Start with what you're living — not with a label. | — | 1,049 |
| `/adults` | Neurofeedback for Adults — HBC (51) | 159 | Functioning isn't the same as feeling like yourself. | Breadcrumb | **296** |
| `/children-families` | Neurofeedback for Children & Teens (38) | 150 | Your child isn't lazy, broken, or "bad at school." | Breadcrumb | **277** |
| `/lens-neurofeedback` | LENS Neurofeedback — HBC (45) | 152 | What LENS neurofeedback is, and who it's for. | Service | 1,250 |
| `/how-lens-works` | How LENS Neurofeedback Works — HBC (55) | 138 | A gentle signal, a comfortable chair, and nothing to perform. | — | 708 |
| `/first-visit` | Your First Visit — HBC (43) | 148 | Know exactly what to expect — before you ever walk in. | — | 449 |
| `/about` | About — HBC (32) | 154 | Large enough to trust. Personal enough to care. | — | 407 |
| `/about/founder` | Our Founder — HBC (38) | 148 | Sheri Rowney | Person, Breadcrumb | **194** |
| `/about/team` | Our Team — HBC (35) | 122 | Practitioners who will know your name — and your story. | Breadcrumb | 335 |
| `/locations` | Locations — HBC (36) | 151 | One organization. The same care, closer to home. | — | **264** |
| `/stories` | Client Stories — HBC (41) | 157 | Small changes. Real weeks. Honest telling. | — | 353 |
| `/faq` | FAQ — HBC (30) | **106** | Every question, answered plainly. | FAQPage | 698 |
| `/contact` | Talk With Our Team — HBC (45) | **102** | Tell us what's going on. We'll take it from there. | — | **231** |
| `/resources` | Resources — HBC (36) | 115 | Understand the brain you live with. | — | 401 |
| `/privacy-policy` | Privacy — HBC (34) | 157 | What happens to what you tell us. | — | 823 |
| `/concerns/anxiety` | Neurofeedback for Anxiety & Stress (38) | 147 | Anxiety & nervous-system overload | FAQPage, Breadcrumb | 542 |
| `/concerns/focus-adhd` | Neurofeedback for ADHD & Focus (34) | 140 | Focus, ADHD & follow-through | FAQPage, Breadcrumb | 549 |
| `/concerns/sleep` | Neurofeedback for Sleep (**23**) | 134 | Sleep difficulties | FAQPage, Breadcrumb | 500 |
| `/concerns/emotional-regulation` | Neurofeedback for Emotional Regulation (38) | 133 | Emotional regulation | FAQPage, Breadcrumb | 494 |
| `/concerns/brain-fog` | Neurofeedback for Brain Fog & Memory (40) | 142 | Brain fog, memory & mental fatigue | FAQPage, Breadcrumb | 494 |
| `/concerns/stress-resilience` | Neurofeedback for Stress & Burnout (38) | 128 | Stress & resilience | FAQPage, Breadcrumb | 492 |
| `/concerns/children-school` | Neurofeedback for School Struggles (34) | 127 | Children, school & transitions | FAQPage, Breadcrumb | 454 |
| `/concerns/trauma` | Neurofeedback for Trauma-Related Stress (39) | 138 | Trauma-related stress | FAQPage, Breadcrumb | 469 |
| `/concerns/performance` | Neurofeedback for High Performers (33) | 159 | You used to be able to handle more than this. | FAQPage, Breadcrumb | 687 |
| `/concerns/concussion` | Neurofeedback for Post-Concussion Symptoms & TBI (52) | 158 | Cleared by your doctor, and still not right. | FAQPage, Breadcrumb | 831 |
| `/concerns/migraines` | Migraines & LENS Neurofeedback (34) | 160 | After you've tried a lot of other things. | FAQPage, Breadcrumb | 772 |
| `/locations/nashville` | LENS Neurofeedback in Nashville, TN (35) | 144 | LENS neurofeedback in Nashville — Tuesday through Saturday. | LocalBusiness, Breadcrumb | 816 |
| `/locations/murfreesboro` | LENS Neurofeedback in Murfreesboro, TN (38) | 159 | LENS neurofeedback for Rutherford County — in downtown Murfreesboro. | LocalBusiness, Breadcrumb | 767 |
| `/locations/franklin` | Franklin — Coming Soon — HBC (49) | 120 | The same gentle care is coming to Williamson County. | Breadcrumb | 370 |
| `/resources/*` (10) | 48–60 each, no brand suffix | 94–154 | = headline | Article, Breadcrumb | 593–1,024 |

"HBC" above abbreviates the " — Harmonized Brain Centers" template suffix; the emitted titles carry the full name.

### 2.2 What the table hides

**The body copy does not contain the target term.** Count of "neurofeedback" in `<main>` text, scripts stripped, soft hyphens normalised:

| Route | "neurofeedback" | "Nashville" / "Murfreesboro" / "Tennessee" | "LENS" |
|---|---|---|---|
| `/concerns/sleep` | **0** | 0 / 0 / 0 | 7 |
| `/concerns/anxiety` | **0** | 0 / 0 / 0 | 8 |
| `/concerns/focus-adhd` | **0** | 0 / 0 / 0 | 9 |
| `/concerns/concussion` | **0** | 0 / 0 / 2 | 7 |
| `/adults` | **0** | 0 / 0 / 0 | 2 |
| `/children-families` | **0** | 1 / 0 / 0 | 4 |
| `/first-visit` | **0** | 0 / 0 / 0 | 2 |
| `/what-we-help-with` | **0** | 0 / 0 / 0 | — |
| `/faq` | 2 | 0 / 0 / 0 | 8 |
| `/how-lens-works` | 1 | 0 / 0 / 0 | 10 |
| `/` | 2 | — | — |
| `/lens-neurofeedback` | 4 | — | — |
| `/locations/nashville` | 2 | — | — |

The site's own brand word is "LENS." The category word people search is "neurofeedback" (`QUERY-TO-PAGE-MAP.md`: 6,277 impressions for the ADHD cluster, 7,017 anxiety, 2,702 sleep — all at position 50–60, zero clicks). A page titled "Neurofeedback for Sleep" whose H1 is "Sleep difficulties" and whose 500 words never say "neurofeedback" is relying on the `<title>` alone. Google rewrites titles from body and H1 when they disagree, so the one place the term appears is the one Google is most willing to replace.

The concern pages also never name a city. The map assigns them local supporting terms ("anxiety help nashville", "insomnia help nashville"). None of those can match.

**Concern titles are short and un-anchored.** `title: { absolute }` drops the brand suffix on purpose (the file comment explains it). But "Neurofeedback for Sleep" is 23 characters, with no geography and no brand; eight titles are under 35. A title of the form "Neurofeedback for Sleep in Nashville & Murfreesboro, TN" (54) uses the space, carries the local modifier the body lacks, and still clears 60.

**The homepage title says "Therapy."** `Neurofeedback Therapy in Nashville & Murfreesboro, TN` targets the map's `neurofeedback therapy` head term, deliberately. The FAQ on the same site answers "Is this therapy or medical treatment?" with "Neither." Both are quotable by a model and they contradict. This is Ben's call, not a bug — but it should be made knowingly (section 4.4).

**Four descriptions are short** (94–108) and leave SERP space: `/resources/exhausted-after-eight-hours`, `/contact`, `/faq`, `/resources/lens-and-medication`. None is over 160.

**Six pages are thin.** `/about/founder` at 194 words is the E-E-A-T anchor and has a title ("Our Founder") that does not contain her name. `/adults` (296) and `/children-families` (277) are segment landing pages for P1 clusters. `/locations` (264) and `/contact` (231) are fine for what they are.

### 2.3 Heading hierarchy

Every route's outline, as a screen reader or a parser sees it:

```
H5 Adults                      ← mega-menu (desktop)
H5 Children & families
H5 Adults                      ← mega-menu (mobile drawer, also in DOM)
H5 Children & families
H1 <page title>
H2 …
H5 Help with  H5 Learn  H5 Visit  H5 Company   ← footer groups
```

`components/Header.tsx:142,151,199,206` and `components/FooterGroup.tsx:23`. Lighthouse `heading-order` fails on all five templates. Within `<main>` the outlines are good: homepage H1→H2→H3→H4 with no skips; concern pages H1→H2; `/about/team` H1→H2 per person. Audit 2's three card-grid skips are closed.

### 2.4 Crawlability

| Check | Result |
|---|---|
| `robots.txt` | `Allow: /`, `Disallow: /api/`, `Disallow: /guides/`, `Sitemap:` absolute. Correct. No AI-agent directives (section 4). |
| Sitemap | 40 URLs, all 200, none redirecting, none noindex. Draft team profiles and articles correctly excluded. |
| Sitemap `lastmod` | **30 URLs = 2026-08-22** (`CONTENT_REVISION` constant in `app/sitemap.ts`), **9 of 10 articles = 2026-08-23**, one article 2026-07-13... no, `homework-battles` is also 2026-08-23 via `lastChanged`. Two dates across 40 URLs. Google's documented position: `lastmod` is used when it is "consistently and verifiably accurate"; a site where every page changed on one of two days is not that. `changefreq` and `priority` are emitted and ignored. |
| Trailing slash | `/about/` → 308 → `/about`. Single hop. Good. |
| Query strings | `/faq?utm_source=x` canonicalises to `/faq`. Good. |
| `/index.html`, `/FAQ` | 404. Acceptable. |
| 404 | Real 404 status, `<meta name="robots" content="noindex">`, branded, routes to four destinations. `/resources/does-not-exist` and `/nonexistent` both. Good. |
| `/concerns` | **404.** Eleven URLs live under it; the visible breadcrumb goes to `/what-we-help-with`. A visitor trimming the URL, or a crawler guessing the parent, lands on nothing. One redirect fixes it. |
| Orphans | None. `check:links`: every route ≥2 in-content inbound except `/locations/franklin` and `/privacy-policy` (both deliberate, chrome-linked). |
| Depth | Everything ≤1 from `/` in the whole-document graph; `/resources` is depth 3 in the content-only graph (reached via an article). |
| Chrome weight | **39 header links + 25 footer links = 64 chrome links on every page**, against 10–40 in-content. Audit 2 C14 (cut the footer) was flagged to Ben and is open. |
| Redirect chains | None internal. |
| **Legacy redirects** | **None in code.** `next.config.ts` has no `redirects()`; no `middleware.ts`; no `vercel.json`. Audit 2 §2.6 inventoried ~115 live WordPress URLs of which 4 share a path with this build. On cutover, ~108 URLs with two years of inbound links and 10,900 impressions on the LENS cluster alone will 404 — to a very good 404 page. |
| Headers | `X-Powered-By: Next.js` leaks (one config line). No `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, CSP. Not ranking factors; part of what "world-class" looks like to anyone who checks. HSTS will depend on the host. |
| Guide | `/guides/why-regulation-fails.html` is `noindex, nofollow` and disallowed. Correct. It has OG tags but no canonical; it is the one URL on the site that would unfurl differently if shared. |

### 2.5 Core Web Vitals

**Repo check (`check:cwv`, 412×823, 4× CPU, 1.6 Mbps / 150 ms, median of 3):**

| Route | LCP | CLS | TBT | kB | LCP element |
|---|---|---|---|---|---|
| `/` | 880 ms | 0.020 | 64 ms | 488 | img |
| `/concerns/sleep` | 1,312 ms | 0.020 | 4 ms | 342 | img |
| `/locations/nashville` | 660 ms | 0.020 | 8 ms | 417 | h1 |
| `/resources/homework-battles` | 668 ms | 0.020 | 5 ms | 320 | p.lede |
| `/lens-neurofeedback` | 656 ms | 0.023 | 10 ms | 477 | h1 |

**Lighthouse 12 (simulated slow 4G, 4× CPU — Google's lab default):**

| Route | Perf | A11y | BP | SEO | FCP | **LCP** | TBT | CLS |
|---|---|---|---|---|---|---|---|---|
| `/` mobile | 94 | 95 | 100 | 100 | 1.2 s | **3.0 s** | 3 ms | 0.000 |
| `/concerns/sleep` | 97 | 91 | 100 | 100 | 1.2 s | **2.6 s** | 3 ms | 0.000 |
| `/locations/nashville` | 95 | 90 | 100 | 100 | 1.2 s | **2.8 s** | 1 ms | 0.001 |
| `/resources/homework-battles` | 97 | 90 | 100 | 100 | 1.2 s | **2.6 s** | 1 ms | 0.000 |
| `/contact` | 98 | 94 | 100 | 100 | 0.9 s | 2.5 s | 0 ms | 0.000 |
| `/` desktop | 100 | 95 | 100 | 100 | 0.3 s | 0.6 s | 0 ms | 0.000 |

Google's "good" LCP threshold is 2.5 s. Every mobile template sits at or just over it in the lab. CLS and TBT are excellent everywhere; INP proxy (max potential FID) is 50–56 ms.

**Where the LCP time goes.** Lighthouse's phase breakdown:

- `/` — LCP is the hero `<img>`. It is discoverable in the initial HTML and preloaded (`<link rel="preload" as="image" imagesrcset=…>`), not lazy. Phases: TTFB 452 · load delay 0 · load time 0 · **render delay 2,562 ms**. The image is there; the page does not paint it. That is the `.rv` reveal: `html.js .rv { opacity: 0 }` applies the moment the inline `<script>` adds the class, and nothing lifts it until the hydrated observer runs — after ~100 kB of JS on a throttled link. Audit 2 C1 moved the gate behind `html.js` (no-JS visitors are no longer blank); it did not remove the gate from the first viewport.
- `/concerns/sleep` — LCP is the concern hero photograph (`div.ph > img`, alt "Sleep difficulties"). It ships **`loading="lazy"`** — no `priority` on the `<Image>`. Phases: TTFB 452 · **load delay 1,051** · load time 448 · render delay 655. Lighthouse flags `lcp-lazy-loaded` outright.
- Neither LCP image carries `fetchpriority="high"` (`lcp-discovery-insight` on both).
- One render-blocking stylesheet, 14.7 kB, 130–420 ms per template. Next does not inline critical CSS by default; `experimental.inlineCss` exists in 15.x.
- 11–12 kB of legacy polyfills in the shared chunk (`legacy-javascript`); 21 kB unused JS on `/contact`.
- `uses-long-cache-ttl`: 0 resources — `/public` assets serve `max-age=0` from `next start`. On Vercel this is overridden; self-hosted it is not.

---

## 3. Structured data

### 3.1 Inventory

94 JSON-LD blocks across 40 routes, each in its own `<script type="application/ld+json">`, all parse:

| Type | Blocks | Where |
|---|---|---|
| `Organization` | 40 | root layout, every route |
| `BreadcrumbList` | 28 | concerns, locations, articles, `/adults`, `/children-families`, `/about/founder`, `/about/team` |
| `FAQPage` | 12 | 11 concerns + `/faq` |
| `Article` | 10 | `/resources/*` |
| `LocalBusiness` | 2 | Nashville, Murfreesboro |
| `Service` | 1 | `/lens-neurofeedback` |
| `Person` | 1 | `/about/founder` |

### 3.2 Does the @id graph resolve?

Yes, to one entity set. `#organization` is the single subject; `LocalBusiness.parentOrganization`, `Service.provider`, `Article.author` and `.publisher`, `Person.worksFor` all point at it by `@id`; `Organization.founder` points at `/about/founder#person`, and the standalone `Person` on that page carries the same `@id`. No duplicate entities, no drift between the 40 copies of the Organization node (they are generated, not written). No node asserts anything the page does not render — the file's rule 1 holds; `foundingDate: 2016` is in body copy on `/` and `/lens-neurofeedback`.

Two structural weaknesses:

- **References are bare.** `"author": {"@id": "…#organization"}` with no `@type` and no `name`. Google's parser merges all JSON-LD on a page into one graph, so the Rich Results Test will resolve it. Most other consumers — Schema Markup Validator in some modes, Bing, LLM extraction pipelines, SEO crawlers — read each `<script>` in isolation and see an author with no name. The founder reference already does it right (`@type` + `@id` + `name`); the other four relations should match.
- **Separate blocks instead of one `@graph`.** Related: a single `@graph` per page is what every parser handles identically, and it is the natural place for the missing `WebSite`/`WebPage` nodes below.

### 3.3 Per type: validity and what it earns

**Organization** — valid. `logo` 512×512 PNG (≥112 px required). Eligible for the logo/knowledge-panel treatment. Missing: `address` or `location` (an array of the two `LocalBusiness` `@id`s would make the parent/child relationship bidirectional), `contactPoint`, `email`, `image`, `areaServed`. `sameAs` holds two Google Maps `?cid=` URLs; `sameAs` is meant for identity pages (social profiles, Wikipedia, Wikidata, Crunchbase) and Google does not reconcile a GBP via `sameAs` — it does that via NAP and the website field on the listing. The CIDs are harmless and can stay; they are not the signal the comment in `lib/schema.ts` believes they are.

**LocalBusiness ×2** — valid. `name`, `address` (full, both), `geo`, `hasMap`, `telephone` (per-centre, distinct — audit 2 P5 closed), `openingHoursSpecification`, `priceRange`, `url`, `description`, `areaServed`, `sameAs`. Nashville carries four real `image`s; **Murfreesboro has none** (no photography — P4, open), and the Rich Results Test warns on a missing `image` for LocalBusiness. No `aggregateRating`, and that is correct: Google's self-serving review rule means a GBP rating republished on the business's own site is ineligible and a documented reason for a markup manual action. Generic `LocalBusiness` rather than a subtype is the right call given the non-medical stance; there is no honest non-medical subtype. Rich-result upside: local business rich results are driven almost entirely by GBP; this markup supports entity reconciliation, it does not earn a SERP feature on its own. Franklin correctly emits nothing.

**Service ×1** — valid. There is no Service rich result; this is for entity understanding. No `offers` by design (the package condition). Note that `Offer` has a `description` field precisely for conditions — publishing `$150 Brain Map` / `$125 session` / `$1,300 package (Brain Map required first, not included)` as three `Offer`s with the condition in `description` would be *more* faithful to the page than silence, not less. A judgment call; the current choice is defensible and the file explains it.

**Article ×10** — valid. `headline`, `description`, `datePublished`, `dateModified`, `mainEntityOfPage`, `articleSection`, `author`, `publisher`, `image` on 8 of 10 (`when-sleep-hygiene-isnt-it` and `bad-at-school` have placeholder plates, so none — correct per rule 1, and the Rich Results Test warns). Google's Article rich result is in practice Top Stories and news; for a practice this earns comprehension, not a card. `author` is the Organization because the byline says so. That is honest and it is also the ceiling: no named author, no credentials, no `reviewedBy`. P8 (confirm reviews) remains the unlock.

**FAQPage ×12** — valid; answers are visible on-page in `<details>` so there is no hidden-content risk. Since August 2023 Google shows FAQ rich results only for "well-known, authoritative government and health websites." A wellness practice will not get the treatment. No harm, modest extraction benefit; expect nothing in the SERP.

**Person ×1** — valid, minimal: `name`, `jobTitle`, `url`, `image`, `worksFor`. No `description`, `sameAs`, `knowsAbout`, `hasCredential`, `alumniOf` — all waiting on P2. **Seven other practitioners are named on `/about/team` with roles**, and one with a credential in copy ("Licensed Master Social Worker with more than fifteen years in practice"). They are fully page-licensed for `Person` nodes and emit nothing. `lib/team.ts` has every slug `null`, so there are no profile pages either.

**BreadcrumbList ×28** — valid; omitting `item` on the last rung is permitted; starting at the section hub instead of Home is permitted. The visible crumb is rendered from the same array (`components/Breadcrumbs.tsx`), so it cannot disagree with the markup — the thing Google actually checks. **12 routes have no breadcrumb at all**, visible or marked up: `/`, `/what-we-help-with`, `/lens-neurofeedback`, `/how-lens-works`, `/first-visit`, `/about`, `/locations`, `/stories`, `/faq`, `/contact`, `/resources`, `/privacy-policy`. The homepage legitimately has none; the other eleven are hub and utility pages one level deep where "Home / Locations" is the trail Google would show in the URL slot.

### 3.4 What is not emitted, and what each would win

| Add | Where | Wins |
|---|---|---|
| `WebSite` (`@id` `/#website`, `name`, `url`, `publisher` → org, `inLanguage`) | root | Anchors the graph; site-name display in results is driven by this plus `og:site_name`. `SearchAction` is dead (sitelinks search box retired Oct 2024) — don't add it. |
| `WebPage` per route (`isPartOf` → website, `about` → org/service, `primaryImageOfPage`, `breadcrumb` → the list, `datePublished`/`dateModified`, `inLanguage`) with `AboutPage`, `ContactPage`, `CollectionPage` subtypes where they apply | every route | The node most LLM extraction pipelines look for first; gives every page a dated, typed identity instead of "Organization + nothing." |
| `Person` ×7 for named staff, with `jobTitle`, `worksFor`, `hasCredential` where stated | `/about/team`, Nashville team block | E-E-A-T: the only ranking competitors with no practitioner entities are the ones losing. |
| `BreadcrumbList` on the 11 hub/utility routes | as listed | Breadcrumb display in the SERP URL slot on a quarter of the site. |
| `image` on Murfreesboro `LocalBusiness` | after P4 | Clears the Rich Results Test warning; parity with Nashville. |
| `ImageObject` for `logo` with `width`/`height` | org | Marginal; removes one validator note. |
| `Offer` ×3 on the Service, with conditions in `description` | `/lens-neurofeedback` | A model asked "how much does LENS cost at HBC" gets structured, conditioned figures (section 4). Ben's call. |
| `dateModified` on evergreen pages | all | Feeds per-URL sitemap `lastmod` and the `WebPage` node from one value. |

Do **not** add: `AggregateRating`/`Review` for the practice (self-serving), `HowTo` (retired Sept 2023), any `Medical*` type (contradicts the disclaimer), `VideoObject` (the Trisha Yearwood link is an outbound `<a>`, not an embed).

### 3.5 Manual-action exposure

None found. Every marked-up fact is visible; no ratings; no reviews; no hidden FAQ text; no type that claims more than the page. The one thing to keep watching is the FAQPage on commercial concern pages — Google's guidance excludes FAQ markup "used for advertising purposes"; the questions there ("Can I keep seeing my therapist?") are informational, so this is fine today.

---

## 4. Social and link previews

### 4.1 What every route emits

All 40 routes: `og:title`, `og:description`, `og:url` (absolute, equals canonical), `og:type` (`website`; `article` on the ten articles), `og:site_name`, `og:locale` `en_US`, `og:image` (absolute), `og:image:width` 1200, `og:image:height` 630, `og:image:alt`, `twitter:card` `summary_large_image`, `twitter:title`, `twitter:description`, `twitter:image`. Articles add `article:published_time` and `article:modified_time`. `og:title` equals `<title>` on all but four routes where the `&` entity differs cosmetically.

The image resolves (200, `image/jpeg`, 50 kB) and is exactly 1200×630 — the declared dimensions are true. `apple-touch-icon` 180×180, `icon` 192 PNG and a 32 px `.ico` are present. Audit 2's article `openGraph` merge bug (C3) is confirmed closed: all ten articles now carry the full set.

Missing, all minor: `og:image:type`, `twitter:site`/`twitter:creator` (no accounts exist), `article:author`, `article:section` (the `articleSection` value is in JSON-LD only).

### 4.2 How each platform renders a pasted link

| Platform | What it reads | Result for any HBC URL |
|---|---|---|
| **Facebook** | `og:*`; wants ≥600×315, prefers 1200×630, <8 MB | Large-image card: image, `og:title`, `og:description`, domain. Correct. |
| **LinkedIn** | `og:*`; ≥1200×627 for large card | Large-image card. Correct. |
| **iMessage** | `og:title`, `og:image`, falls back to `apple-touch-icon` + `<title>` | Rich link: image (centre-cropped to iMessage's aspect — the left-aligned headline band survives), title, domain. Correct. |
| **Slack** | `og:*` + `twitter:card`; `summary_large_image` → full-width image | Favicon + site name + title + description + large image. Correct. |
| **WhatsApp** | `og:title`, `og:description`, `og:image` (≥300×200, ≤600 kB for large preview) | Large preview. Correct. |
| **X / Discord / Telegram** | `twitter:card` / `og:*` | Large-image card. Correct. |

**No route renders as a bare text card.** Section 3 of audit 2 is closed.

### 4.3 The actual problem

**One image, forty URLs.** The card for `/resources/the-3am-waking` is a smiling woman and "Gentle LENS neurofeedback for adults, children and families. Nashville · Murfreesboro." So is the card for `/privacy-policy`, `/locations/murfreesboro`, `/concerns/concussion` and `/about/founder`. The image is well made (checked: legible wordmark, headline, location line, dark scrim, survives square crops). It is also the reason that every share from this site, in every channel, is visually the same share. Audit 1 item 33 deferred per-route images; nothing has moved.

Next's `opengraph-image.tsx` convention generates them at build time with `ImageResponse` — one file per dynamic segment: article headline + "For parents" tag; concern name + "Neurofeedback for …"; location name + days open. The default stays as the fallback for utility pages. No design assets needed beyond the fonts already loaded.

---

## 5. AI and answer engines

### 5.1 Access

`robots.txt` names no AI user agent: not `GPTBot`, `OAI-SearchBot`, `ChatGPT-User`, `ClaudeBot`, `anthropic-ai`, `PerplexityBot`, `Google-Extended`, `Applebot-Extended`, `CCBot`, `Bytespider`, `Amazonbot`, `Meta-ExternalAgent`. `User-Agent: * / Allow: /` admits all of them. For a practice that wants to be the answer to "neurofeedback near Nashville" in ChatGPT and Perplexity, that is the right outcome — reached by default rather than by decision. A world-class robots.txt states the policy: explicit `Allow` for the search/answer agents (`OAI-SearchBot`, `PerplexityBot`, `ClaudeBot`, `Google-Extended` for AI Overviews/Gemini grounding), and a deliberate yes or no on the pure training crawlers (`GPTBot`, `CCBot`, `Bytespider`). The current file will keep working either way; the point is that nobody chose.

No `/llms.txt`, no `/llms-full.txt`. The convention is young and adoption by the engines is uneven, but it is cheap, it is the one place to put a canonical entity description plus a curated list of the 40 URLs with one-line summaries, and it is the signal that the practice has thought about this channel at all.

### 5.2 Extractability

Good — better than most. Everything is static HTML from the server: every sentence, every FAQ answer (`<details>` content is in the DOM), every price, every address is present with JavaScript off. The `.rv` reveal hides nothing from a text parser (opacity, and only under `html.js`). Headless-rendering crawlers (Googlebot, and the engines that lean on its index) get the full page too.

One quirk: the RSC payload in `self.__next_f.push(...)` restates every string on the page — 37 kB of the 89 kB homepage. Parsers that strip `<script>` never see it; naive ones see every sentence twice. Inherent to the App Router; noted, not actionable.

### 5.3 Can a model quote the facts correctly?

Facts stated once, plainly, in one form — a model will get these right:

- "Harmonized Brain Centers is a wellness practice, not a medical clinic. LENS neurofeedback is offered as a wellness service and is not intended to diagnose, treat, cure, or prevent…" — footer, every page.
- First visit (Brain Map) $150 and ~60 minutes; regular sessions $125 and ~30 minutes; 12-session package $1,300 — `/faq` and `/first-visit`.
- Nashville: 197 Thompson Ln, Suite S, 37211; Tue–Fri 9–6, Sat 8–3; (615) 331-8762. Murfreesboro: 206 W Chestnut St, 37130; Tue–Thu 9–6; (615) 203-2650. Both in copy and in schema, identically.
- Founded 2016; founder Sheri Rowney, Founder & Clinical Director.

Facts a model could get wrong because the site states them two ways:

| Fact | Version A | Version B |
|---|---|---|
| Experience | "140,000+ sessions" (`/about` meta description) | "well over a hundred thousand sessions" (`/about` body) |
| What it is | "Neurofeedback **Therapy** in Nashville & Murfreesboro" (homepage `<title>`, the most-quoted string on the site) | "Is this therapy or medical treatment? **Neither.**" (`/faq`, in FAQPage markup) |
| Category | "neurofeedback" (titles) | "LENS" (bodies) — section 2.2 |

Gaps a model will fill from somewhere else:

- **No entity sentence on the homepage.** "Harmonized Brain Centers is …" appears only on `/about`. The homepage, which every engine fetches first, never says what the organisation is in one declarative sentence. 1,348 words and the model has to assemble it.
- **No named human expertise on the articles.** "By Harmonized Brain Centers" is honest and it is what the answer engines discount most. P2/P8.
- **No `/pricing` page.** The prices exist but live on pages whose titles are "FAQ" and "Your First Visit"; a model asked "how much is neurofeedback in Nashville" has to find them inside a 698-word FAQ. Audit 2 §8.4 ranked this second of the missing pages.
- **Concern pages give no local anchor.** "neurofeedback for sleep in Murfreesboro" matches a page whose body contains neither word.
- No RSS/Atom feed for `/resources`: no push signal when an article lands; aggregators and some answer engines poll feeds, not sitemaps.

---

## 6. Accessibility and semantics

| Area | State |
|---|---|
| Landmarks | `<header>` (banner), `<nav aria-label="Primary">`, `<nav aria-label="Mobile">`, `<main>`, `<footer>` (contentinfo). One of each per page. Blockquote `<footer>`s on three pages are correct usage. |
| Skip link | **None.** 64 chrome links precede `<main>` on every page. |
| Heading order | **Fails on every template** (section 2.3). The mega-menu column labels and footer group labels are not headings in any outline sense; they are `<h5>`s because the design system named them so. |
| Breadcrumb | A `<div class="wrap crumb">` with bare links. No `<nav aria-label="Breadcrumb">`, no `<ol>`, no `aria-current="page"`. Lighthouse `link-in-text-block` fails on the breadcrumb link on concern, location and article templates — it is distinguishable from body text by colour alone. |
| Colour contrast | **Fails on every template.** The gold wordmark `span` (`#a9853f` on `#fbf8f1`, **3.23:1** at 9 px) is in the header of all 40 pages. Also `p.sample-note` on `/` (3.33:1 at 11.5 px) and the three `facts3 b` labels on both location pages (3.23:1 at 11.5 px). `CONTRAST-OPTIONS.md` already renders two candidates (`#856831`, `#8c6e34`) for the wordmark and two for the sage eyebrow. Unapplied. |
| Text size | 9 px wordmark subtitle; 10.5–11.5 px eyebrows, tags, city labels. Audit 2 C26 open. |
| Tap targets | Lighthouse `target-size` passes on all five templates. Audit 2 C16 closed. |
| Focus | Global `:focus-visible` rules; mega-menu opens on `:focus-within` with Escape returning focus to the trigger and a blur guard; drawer button has `aria-expanded`/`aria-controls`. Good. |
| Alt text | Descriptive and specific on 31 of 40 distinct images. 8 `alt=""` on `/resources` card images (decorative; headline adjacent) and 1 elsewhere — acceptable. Concern hero `alt` is the concern label ("Sleep difficulties"), which describes the page, not the photograph; weak but not wrong. |
| ARIA | Sparse and correct: `aria-hidden` on decorative plates and marks, `aria-expanded`/`aria-controls` on disclosures, `aria-label` on the two scroll rails, the burger, the YouTube link and the ask-bar input, `role="group"` + `aria-labelledby` on the two contact-form choice groups. `<h5><button>` in the footer is permitted. |
| Forms | Every input has a `<label for>`, `autocomplete` (`given-name`, `tel`, `email`), `type`, `required` where meaningful; `enterkeyhint` on the ask bar. Good. |
| Document | `lang="en"`, viewport without `maximum-scale`, `theme-color`, `viewport-fit=cover`. Motion gated on `prefers-reduced-motion`. |
| External links | All `target="_blank"` carry `rel="noopener"`. |

Lighthouse accessibility: 90–95. The three recurring failures (contrast, heading-order, link-in-text-block) are the whole gap, and all three are sitewide-by-chrome, so three edits fix forty pages.

---

## 7. What a world-class build would have that this doesn't

Ranked by impact, honestly.

1. **The target vocabulary in the body.** The site is written in brand language ("LENS", "nervous-system overload", "regulation") and optimised in category language ("neurofeedback", "ADHD", "Nashville") — in the `<title>` only. World-class sites say the category word in the H1 or first paragraph of every page that targets it, and then say it the brand's way for the rest. (2.2)
2. **A redirect map in the repository before cutover.** Not a document; `redirects()` in `next.config.ts`, committed, reviewed, with the four open decisions resolved or defaulted. (2.4)
3. **Measurement wired before launch.** GA4 or Plausible, Search Console and Bing verification meta, and a conversion event on the consultation form. Nothing exists. (5)
4. **Per-route social images.** Generated, not designed. (4.3)
5. **A clean document outline and a skip link.** Chrome labels as `<div>`s or `<p>`s; `<nav aria-label="Breadcrumb"><ol>`; a skip link as the first focusable element. (2.3, 6)
6. **LCP under 2.5 s on Google's own lab profile.** First-viewport content not gated on hydration; `priority` + `fetchpriority="high"` on every template's LCP image; critical CSS inline. (2.5)
7. **A full entity graph.** One `@graph` per page; `WebSite` + `WebPage`; typed references with names; `Person` for every named practitioner; breadcrumbs everywhere but home. (3.3–3.4)
8. **Accurate `lastmod`.** A revision date on every content entity, the sitemap reading it, nothing else in the sitemap. (2.4)
9. **An AI posture.** Named agents in robots.txt, `llms.txt`, one entity sentence on the homepage, every number stated one way, an RSS feed. (5)
10. **The contrast fix that is already drawn.** (6)
11. **The two missing pages the demand data asked for** — `/pricing` and `/brain-map` — and a founder page longer than 194 words. (audit 2 §8.4; P2)
12. **Hygiene:** `poweredByHeader: false`, security headers, a `/concerns` redirect, long-cache headers on `/public` if ever self-hosted. (2.4)

What a world-class build would **not** have that this one correctly avoids: medical schema types, self-serving ratings, HowTo/FAQ markup chasing dead rich results, hidden text, keyword-stuffed footers, a sitemap full of drafts, `new Date()` as `lastmod`.

---

## 8. Prioritized actions

**S** ≤ half a day · **M** ≤ 2 days · **L** multi-day. Ranked by impact per unit of effort within each group.

### 8.1 Code — can be done now

| # | Action | Impact | Effort | Where |
|---|---|---|---|---|
| **A1** | **Put "neurofeedback" into the body of every concern page, `/adults`, `/children-families`, `/first-visit`, `/what-we-help-with`** — in the H1 or the first paragraph, then once or twice naturally; name Nashville and Murfreesboro once on each concern page (the CTA band is the natural place). | **Critical** | S–M | `lib/concerns.ts` copy fields, `app/concerns/[slug]/page.tsx`, the four static pages |
| **A2** | **Write the legacy redirect map into `next.config.ts` `redirects()`** from audit 2 §2.6; default the four open rows to the nearest concern and flag them. Add `/concerns` → `/what-we-help-with`. Untestable until DNS moves; writable today. | **Critical** | M | `next.config.ts` |
| **A3** | **Analytics + verification scaffolding** — a `NEXT_PUBLIC_GA_ID` (or Plausible domain) env, the script behind it, `verification.google` / `.other.bing` in root metadata, a form-submit event. Ships inert until Ben supplies IDs (P3). | High | S | `app/layout.tsx`, `components/ContactForm.tsx` |
| **A4** | **LCP:** `priority` on the concern hero `<Image>`; `fetchPriority="high"` on every template's LCP image; exempt the first-viewport `.rv` block from the opacity gate (or animate with a CSS-only transition that starts visible). Re-run `check:cwv` **and** Lighthouse mobile — the repo check alone did not see this. | High | S | `app/concerns/[slug]/page.tsx`, `app/page.tsx`, `globals.css` reveal block |
| **A5** | **Heading outline + skip link + breadcrumb semantics:** mega-menu and footer `<h5>` → `<p class="h5">` (keep the class, lose the level); `<a href="#main" class="skip">` first in `<body>` with `id="main"` on `<main>`; `Breadcrumbs.tsx` → `<nav aria-label="Breadcrumb"><ol>` with `aria-current="page"` and an underline or weight change on crumb links. | High | S | `Header.tsx`, `FooterGroup.tsx`, `Breadcrumbs.tsx`, `layout.tsx` |
| **A6** | **Per-route Open Graph images** via `opengraph-image.tsx` for `/concerns/[slug]`, `/locations/[slug]`, `/resources/[slug]`; keep `og-default.jpg` as fallback. | High | M | three segment folders |
| **A7** | **Concern titles:** append the geography — "Neurofeedback for Sleep in Nashville & Murfreesboro, TN" — keeping every title ≤60. | High | S | `lib/concerns.ts` `metaTitle` |
| **A8** | **Schema depth:** one `@graph` per page through `JsonLd`; add `WebSite` and `WebPage` (typed) nodes; inline `@type` + `name` beside every `@id` reference; `Person` for the named practitioners from `lib/team.ts`; `BreadcrumbList` on the 11 hub/utility routes (visible crumb included); `Organization.location` → both `LocalBusiness` `@id`s. | Med-High | M | `lib/schema.ts`, `components/JsonLd.tsx`, pages |
| **A9** | **Apply the contrast values** from `CONTRAST-OPTIONS.md` to the wordmark, `sample-note`, and `facts3 b`; raise the 9 px wordmark subtitle. | Med | S | `globals.css`, `Logo.tsx` |
| **A10** | **Per-entity `lastmod`:** a `dateModified` on each concern, location and static page record; sitemap reads it; drop `changeFrequency`/`priority`. | Med | S–M | `lib/concerns.ts`, `lib/locations.ts`, `app/sitemap.ts` |
| **A11** | **AI posture:** named agents in `robots.ts`; `app/llms.txt/route.ts` generated from the same content indices the assistant uses; an entity sentence in the homepage's first section; `/resources/feed.xml`. | Med | S | `app/robots.ts`, new routes, `app/page.tsx` |
| **A12** | **One number, one phrasing:** "140,000+ sessions" or "well over a hundred thousand" — pick one and interpolate from `site-config.ts` everywhere. | Med | S | `lib/site-config.ts`, `/about` |
| **A13** | **Short descriptions** on `/contact`, `/faq`, two articles — to 130–155. | Low-Med | S | per-page metadata |
| **A14** | `poweredByHeader: false`; `headers()` with `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`. | Low | S | `next.config.ts` |
| **A15** | Try `experimental.inlineCss`; measure the 130–420 ms render-blocking CSS against it. | Low | S | `next.config.ts` |
| **A16** | `/guides/why-regulation-fails.html`: add a canonical to itself (it is `noindex`; the tag only stops a scraper guessing). | Low | S | `public/guides/` |

### 8.2 Only Ben can supply

| # | Item | Unblocks |
|---|---|---|
| **P1** | **Decide "Neurofeedback Therapy" vs the FAQ's "neither."** Either the homepage title drops "Therapy" or the FAQ answer is reworded to "LENS is offered as a wellness service, not medical treatment" without the flat "Neither." The site cannot carry both. | A7's shape; every AI answer about what HBC is |
| **P2** | **Founder bio, credentials, quote sign-off** (`FOUNDER_BIO`, `FOUNDER_QUOTE` still `verified: false`); practitioner credentials for the seven named staff. | `/about/founder` from 194 words; `Person` nodes with substance (A8); article `reviewedBy` (P5) |
| **P3** | **GA4 (or Plausible) property, Search Console and Bing verification tokens.** | A3 |
| **P4** | **Murfreesboro photography** — one interior shot. | `LocalBusiness.image`, the space grid, parity |
| **P5** | **Confirm which articles were reviewed and by whom.** | Named reviewer on ten articles — the strongest E-E-A-T move available for the content that exists |
| **P6** | **Resolve the four open redirect rows** (`/peakperformance/`, `/migrainesandpain/`, `/concierge/`, `/refer-a-friend/`) — the first two now have destinations (`/concerns/performance`, `/concerns/migraines`). | A2 |
| **P7** | **Social profile URLs** (Facebook, Instagram, LinkedIn, YouTube if any). | `sameAs` with what the property is for |
| **P8** | **AI crawler policy:** allow training crawlers or not. Recommendation: allow all — the content is marketing; being in the model is the point. | A11 |
| **P9** | **Pricing-page and Brain Map page copy** (audit 2 §8.4). | The two highest-demand missing URLs |
| **P10** | **Footer link cut** (audit 2 C14) — design decision. | In-content link share |

### 8.3 Blocked until the domain moves off WordPress

| # | Item |
|---|---|
| B1 | Testing any redirect in A2; verifying the ~108 legacy URLs resolve |
| B2 | `NEXT_PUBLIC_SITE_URL` in the production environment — **and checking three emitted canonicals on day one.** This audit's first build silently shipped `localhost:3000` into every tag. |
| B3 | Apex↔www and http→https at the host |
| B4 | Search Console / Bing submission, sitemap ping, indexation of 40 URLs |
| B5 | Field CWV / CrUX — the lab LCP in 2.5 is the only number until then |
| B6 | Rich Results Test and Schema Markup Validator on live URLs; Facebook/LinkedIn/X card debuggers on live URLs |
| B7 | GBP website-field alignment with the new location URLs; GBP ↔ site NAP check on the live page |
| B8 | Any CDN cache-header behaviour for `/public` |

---

## Appendix A — Closed since SEO-AUDIT-2

| Audit 2 item | State |
|---|---|
| C1 `.rv` LCP gate | **Partly.** No-JS fallback fixed; first-viewport reveal still costs ~2.5 s render delay under Lighthouse's throttle (2.5) |
| C2 `sameAs` with GBP CIDs | Done (and see 3.3 on what `sameAs` does) |
| C3 article `openGraph` merge | **Closed** — all ten carry the full set |
| C5 article dates + schema | **Closed** |
| C6 article title suffix | **Closed** — 48–60 chars |
| C7 guide noindex + disallow | **Closed** |
| C8 privacy policy | **Closed** |
| C9 GA4 + GSC | **Open** — nothing in the HTML |
| C10 `Person` on founder | **Closed** (minimal) |
| C13 over-length titles/descriptions | **Closed** — none over length |
| C16 tap targets | **Closed** — Lighthouse passes |
| C17 AVIF/WebP | **Closed** |
| C18 font preloads | **Closed** — two faces preloaded |
| C23 per-URL `lastmod` | **Partly** — articles only; two constants for the other 30 |
| C24 favicon / apple-touch-icon / 404 | **Closed** (no web manifest; not needed) |
| C26 small text | **Open** |
| C27 heading skips | **Closed inside `<main>`**; chrome H5s were not in scope then and are the finding now |
| P5 per-centre phones | **Closed** |

## Appendix B — Reproducing

```bash
# From a clean checkout of origin/main
cp .env.example .env.local   # then set NEXT_PUBLIC_SITE_URL=https://harmonizedbraincenterstn.com
rm -rf .next && npm run build && npx next start -p 3123

CHECK_BASE=http://127.0.0.1:3123 npm run check:links
CHECK_BASE=http://127.0.0.1:3123 npm run check:links -- --all-links
CHECK_BASE=http://127.0.0.1:3123 npm run check:cwv

# Lighthouse, Google's lab profile (needs Chrome)
npx -y lighthouse@12 http://127.0.0.1:3123/concerns/sleep --output=json \
  --chrome-flags="--headless=new" --form-factor=mobile --screenEmulation.mobile \
  --only-categories=performance,accessibility,best-practices,seo

# Term count in <main>, scripts stripped
curl -s http://127.0.0.1:3123/concerns/sleep | node -e '
let h="";process.stdin.on("data",d=>h+=d).on("end",()=>{const m=h.slice(h.indexOf("<main"),h.indexOf("</main>"))
.replace(/<script[\s\S]*?<\/script>/g,"").replace(/<[^>]+>/g," ");console.log((m.match(/neurofeedback/gi)||[]).length)})'
```
