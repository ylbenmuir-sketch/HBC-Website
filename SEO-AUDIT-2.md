# SEO Audit #2 — Harmonized Brain Centers

**Audited:** 2026-08-23 · clean production build (`rm -rf .next && npm run build`, Next.js 15.5.20) at commit `ca4b9bf`
**Supersedes:** `SEO-AUDIT.md` (2026-08-14). That audit is now mostly closed; this one is written against what exists today, not against its own to-do list.
**Verdict in one line:** the build is technically excellent and strategically stranded. Nothing in this repository is live, and the two things most likely to decide whether the rebuild earns anything — the WordPress migration and the practitioner roster — are both outside the code.

---

## 0. Scope, method, and what I could not measure

**Measured directly on the production build:**

| What | How |
|---|---|
| Core Web Vitals | Headless Chrome via CDP against `next start`, mobile profile (412×823, 4× CPU throttle, 1.6 Mbps / 150 ms RTT) and desktop (1440×900, 10 Mbps / 20 ms), cache disabled per navigation |
| Interaction latency | Real `Input.dispatchMouseEvent` clicks with a `PerformanceObserver` on `event` entries |
| CLS | Full-page slow scroll, `buffered: true` observer installed pre-navigation |
| Metadata, headings, schema, alt text | Parsed from the 38 prerendered HTML files in `.next/server/app/` |
| Internal link graph | Parsed from `<main>` and from whole documents; BFS depth + damped PageRank over the 37 indexable routes |
| Duplicate content | Sentence-level index across all `<main>` bodies |
| Mobile usability | Rect audit at 320/390 px + the repo's own `check:layout` sweep (37 routes × 4 widths = 148 combinations) |
| Legacy site inventory | Live `curl` against `harmonizedbraincenterstn.com` — sitemaps, status codes, titles |

**What I could not measure, and why it matters:**

- **No field data exists.** CrUX has nothing because this build has never been served to a user. Every CWV figure below is lab data from `localhost`, where TTFB is ~2 ms. Real hosting adds 30–150 ms before anything else happens, so treat every LCP number as a floor, not an estimate.
- **No Search Console, no analytics.** There is no GA4, no GTM, no `google-site-verification`, no third-party tag of any kind anywhere in `app/`, `components/`, or `lib/`. Post-launch you will have no first-party measurement of anything in this document.
- **No backlink or rank data.** The Ahrefs MCP connector is not authorised in this session — it needs authorising through claude.ai connector settings before it can be used. Section 6 is reasoned from the GSC/GBP baseline recorded in `QUERY-TO-PAGE-MAP.md`, live SERP sampling, and category structure. It is not a keyword-difficulty pull, and I have said where that limits confidence.
- **`.env.local` sets `NEXT_PUBLIC_SITE_URL=http://localhost:3000`.** Every canonical, `og:url`, sitemap `<loc>` and JSON-LD `url` in the build I audited is a localhost URL. The code default is correct (`https://harmonizedbraincenterstn.com`); this is an environment problem, and §1.2 treats it as a launch-blocking one.

---

## 1. Executive summary

**What is genuinely good, stated once so the rest of the document can be blunt:**

Every route prerenders as static HTML with a unique title, description, and exactly one `<h1>`. 100% of images carry alt text, and the alt text is now *descriptive* rather than a restatement of the headline. Canonicals and `og:url` are emitted sitewide. The sitemap is accurate to the build (37 URLs, zero 404s, zero gated pages leaked). Structured data has gone from three thin stubs to a coherent `@id`-linked graph: `Organization`, two fully-populated `LocalBusiness` nodes with confirmed street addresses, geo, hours and 26 `areaServed` cities, `Service`, `FAQPage` on ten pages (42 distinct Q&As), and `BreadcrumbList` everywhere a crumb renders. The repo's own layout sweep passes 148 page/width combinations with no clipping, no overlap, and nothing past the viewport. Ten articles now exist where six drafts used to sit. CLS is 0.034 sitewide. INP is fine.

That is a better technical foundation than most practices in this category will ever have.

**Now the problems, ranked by how much each is costing:**

1. **The reveal-on-scroll animation gates LCP behind JS hydration on every page.** Measured: `.rv { opacity: 0 }` costs **1,460–1,620 ms of LCP** on mobile. With `prefers-reduced-motion` (which bypasses the class) the homepage goes 2,732 ms → 1,272 ms and `/lens-neurofeedback` goes 2,452 ms → 864 ms. At 2.4–2.75 s on a zero-latency localhost, real hosting puts most templates *over* the 2.5 s "good" threshold. This is the single largest technical defect on the site and it is a code fix. (§2.1)

2. **The redirect table covers 7 URLs. The live site has roughly 115.** WordPress is serving ~40 pages, ~55 posts, 14 category archives and 6 tag archives. `QUERY-TO-PAGE-MAP.md`'s table maps seven of them. Worse: a dozen legacy duplicates currently 301 *inside WordPress* (`/lens-therapy/` → `/what-is-lens/`, `/faqs/` → `/faq/`, `/stress/` → `/stressanxiety/`…), and **those redirects die with the WordPress install**. `/lens-therapy/` is the incumbent URL for the single largest recoverable cluster on the site — 10,900 impressions at position 13.9–17.1 — and it appears in no plan. (§2.6)

3. **The ten new articles are the weakest nodes in the link graph, and the cluster structure runs one way only.** Each article links *up* to two concern pages. **No concern page links back to any article.** Each article has exactly one inbound internal link sitewide (the `/resources` index), sits at depth 2, and receives 0.49% of internal PageRank against 3.52% for every chrome-linked page — a 7.2× deficit. The clusters exist in the copy and in the anchor text. They do not exist in the link graph. (§4)

4. **All ten article pages lose `og:url`, `og:image`, `og:site_name` and `og:locale`, and downgrade `twitter:card` from `summary_large_image` to `summary`.** `openGraph: { type: "article" }` in `generateMetadata` replaces the parent object rather than merging into it. Every article shared to Facebook, LinkedIn, iMessage or Slack renders as a bare text card. (§2.2)

5. **E-E-A-T is the weakest dimension on the site, and the gap is entirely non-code.** Every practitioner is `[Placeholder]`. The founder is named but has no bio, no credentials, and no `Person` schema. No article carries an author, a reviewer, or a date. There are no citations anywhere. Meanwhile the Nashville SERP is contested by physician-led clinics — MaxWell Clinic fronts David Haase, MD, an ISNR member. (§5)

6. **There is no privacy policy.** The site runs a lead form writing to Supabase and an AI assistant that logs transcripts (`CHAT_LOG_TRANSCRIPTS=true`). The legacy site has `/privacy-policy/`; the rebuild has no such route, so that URL will 404 on cutover. For a health-adjacent YMYL site collecting personal data, this is both a trust signal and a legal exposure. (§2.5)

7. **`/guides/why-regulation-fails.html` is a 1,778-word page shipping `<meta name="robots" content="index, follow">`** with no canonical, no navigation, and no inbound links. It is the lead magnet the site trades an email address for. If it is ever indexed, the gate is bypassed and the site gains a chrome-less orphan competing with its own concern pages. (§2.2)

---

## 2. Technical

### 2.1 Core Web Vitals

Lab data. Mobile = 412×823, 4× CPU throttle, 1.6 Mbps down / 150 ms RTT, cache disabled. Server on `localhost` (TTFB ≈ 2 ms — real hosting will add to every LCP figure below).

| Route (template) | Mobile LCP | LCP element | Mobile CLS | Mobile TBT | Worst interaction | Desktop LCP | Transfer |
|---|---|---|---|---|---|---|---|
| `/` (home) | **2,752 ms** | hero `<img>` | 0.034 | 34 ms | 48 ms | 1,084 ms | 454 kB |
| `/concerns/sleep` (concern) | **2,456 ms** | `<img>` | 0.034 | 0 ms | — | 1,036 ms | 360 kB |
| `/locations/nashville` (location) | **2,436 ms** | `<h1>` | 0.034 | 0 ms | 48 ms | 1,044 ms | 384 kB |
| `/resources/homework-battles` (article) | **2,456 ms** | `<p class="lede">` | 0.034 | 0 ms | — | 1,040 ms | 366 kB |
| `/lens-neurofeedback` (service) | **2,460 ms** | `<h1>` | 0.034 | 1 ms | — | 1,044 ms | 388 kB |
| `/what-we-help-with` (hub) | 2,432 ms | `<h1>` | 0.034 | 0 ms | — | 1,052 ms | 341 kB |
| `/contact` (form) | 2,424 ms | `<h1>` | 0.034 | 16 ms | 32 ms | 1,040 ms | 350 kB |
| `/faq` | 2,468 ms | `<div class="a">` | 0.034 | 0 ms | **192 ms** | 1,028 ms | 347 kB |
| `/stories` | 2,436 ms | `<h1>` | 0.034 | 7 ms | — | 1,032 ms | 347 kB |

**CLS (0.034) and INP (≤192 ms) both pass comfortably.** LCP does not, and the cause is one CSS rule.

#### The reveal-on-scroll LCP gate — the headline finding

`.rv { opacity: 0 }` in `app/globals.css` hides essentially all page content until client JS mounts an IntersectionObserver and adds `.in`. LCP is measured at *paint*, so the largest element cannot register until hydration completes. `prefers-reduced-motion: reduce` bypasses the class, which gives a clean A/B:

| Route | LCP, motion on | LCP, reduced-motion (`.rv` bypassed) | Cost |
|---|---|---|---|
| `/` | 2,732 ms | **1,272 ms** | −1,460 ms |
| `/concerns/sleep` | 2,476 ms | **1,732 ms** | −744 ms |
| `/lens-neurofeedback` | 2,452 ms | **864 ms** | −1,588 ms |
| `/resources/homework-battles` | 2,476 ms | **856 ms** | −1,620 ms |
| `/what-we-help-with` | 2,412 ms | **836 ms** | −1,576 ms |
| `/contact` | 2,420 ms | **832 ms** | −1,588 ms |
| `/faq` | 2,388 ms | **836 ms** | −1,552 ms |
| `/locations/nashville` | 2,436 ms | **836 ms** | −1,600 ms |

The homepage waterfall confirms the mechanism precisely: the preloaded hero image **finishes downloading at 1,243 ms** and LCP does not fire until **2,752 ms**. A 1,509 ms gap in which the pixel is available and the CSS is refusing to paint it.

`SEO-AUDIT.md` §1.9 filed this as "low SEO risk; a no-JS visitor sees a blank page." That framing was wrong. The a11y/no-JS concern is real but secondary; the ranking-relevant fact is that this rule single-handedly moves every template from comfortably-good to borderline-failing on the one Core Web Vital that is still a ranking signal.

**The fix keeps the animation.** Render `.rv` at `opacity: 1` and let the observer add a class that *animates from* a transform, or gate the initial hidden state behind an `html.js` class set synchronously in a tiny inline script — so the hidden state only ever applies in a browser that will definitely run the observer, and never during the critical paint of the first viewport. Simplest correct version: exempt above-the-fold content from `.rv` entirely.

#### Secondary CWV items, in order of value

1. **Three preloaded font files, 114 kB, on every page.** Cormorant Garamond (400/500/600 × normal + italic) and DM Sans (400/500/600) generate nine faces; three are `preload`ed at high priority and land at 1,264/1,284/1,322 ms — directly alongside the LCP image, competing for the same bandwidth on a throttled connection. Dropping Cormorant italic and one weight, or setting `preload: false` on the display face, frees ~37–75 kB from the critical path.
2. **No AVIF.** `next.config.ts` is empty, so Next serves WebP only. Measured on the hero: 46.6 kB JPEG → 34.4 kB WebP. AVIF typically lands 20–30% below WebP again. One config line: `images: { formats: ["image/avif", "image/webp"] }`.
3. **RSC prefetch storm.** The homepage fires **13 `?_rsc=` prefetches totalling ~80 kB** between 2,336 ms and 2,829 ms, because Next prefetches every viewport-visible `<Link>` and the header mega-menu puts 27 of them on every page. On a throttled mobile connection this competes with rendering. Consider `prefetch={false}` on the chrome nav links.
4. **`favicon.ico` is 25.6 kB at 256×256.** It loads at 2,480 ms on mobile. A 1–2 kB multi-size ICO plus a PNG `icon` is standard.
5. **The 0.034 CLS is systematic, not incidental.** Identical on every page: `0.012` from `MAIN`/`A.logo` and `0.011 × 2` from `FORM.askbar` (the sticky ask bar mounting, then re-laying out). Well inside "good," but it is free to fix by reserving the bar's height in CSS.
6. **The FAQ accordion's 192 ms interaction** is presentation delay, not script (processing time was 1 ms) — a large `<details>` panel painting. Under the 200 ms "good" bar, but it is the one interaction on the site with no headroom.

**Note:** these measurements were taken with `NEXT_PUBLIC_FEATURE_ASSISTANT=true` (set in `.env.local`). The ask-bar CLS and part of the JS payload belong to the assistant. If the assistant ships disabled, CLS drops further and the numbers above are conservative.

### 2.2 Metadata, canonicals, indexability

**Working:** self-referencing canonicals on all 37 routes via `alternates: { canonical: "./" }`; `og:url` on 27 of them; `_not-found` correctly `noindex`; correct `<meta viewport>`; `<html lang="en">`; a purpose-built 1200×630 OG image with correct declared dimensions.

**Broken:**

- **`og:url`, `og:image`, `og:site_name`, `og:locale` are absent from all ten `/resources/[slug]` pages, and `twitter:card` degrades to `summary`.** Cause: `app/resources/[slug]/page.tsx` returns `openGraph: { type: "article" }`, and Next replaces the parent `openGraph` object rather than merging keys into it. Every article shares as a bare text card with no image. Fix: spread the shared fields, or set `openGraph.type` per-route while re-declaring `url: "./"` and the image.
- **`/guides/why-regulation-fails.html` ships `<meta name="robots" content="index, follow">`** on a 1,778-word chrome-less page with no canonical, sitting at a public path under `public/`. It is not in the sitemap and nothing links to it, so discovery risk is moderate rather than acute — but the meta tag is an active invitation, and an indexed copy defeats the email gate the whole `GuideCta` exists to run. Either `noindex` it and `Disallow: /guides/` in `robots.ts`, or promote it to a real `/resources/` article and drop the gate. Pick one; the current state is neither.

**Length problems.** Google truncates titles around 580 px (~60 characters) and descriptions around 155–160.

Titles over 60 characters — 17 of 37 routes:

| Route | Chars | Route | Chars |
|---|---|---|---|
| `/resources/told-to-just-relax` | **90** | `/resources/braced-for-something` | 75 |
| `/resources/bad-at-school` | **89** | `/concerns/brain-fog` | 67 |
| `/resources/when-sleep-hygiene-isnt-it` | **89** | `/concerns/trauma` | 66 |
| `/resources/the-last-ten-percent` | **87** | `/children-families` | 65 |
| `/` (homepage) | **83** | `/concerns/anxiety` | 65 |
| `/resources/exhausted-after-eight-hours` | 81 | `/concerns/emotional-regulation` | 65 |
| `/concerns/concussion` | 79 | `/concerns/stress-resilience` | 65 |
| `/resources/lens-and-medication` | 77 | `/locations/murfreesboro` | 65 |
| `/resources/the-3am-waking` | 77 | `/concerns/children-school` | 61 |
| `/resources/homework-battles` | 76 | `/concerns/focus-adhd` | 61 |
| `/resources/alongside-therapy` | 75 | `/locations/nashville` | 62 |

The `— Harmonized Brain Centers` suffix is 27 characters. On the article template it is pure waste: nine of ten article titles would fit inside 60 characters without it, and `og:site_name` already carries the brand. **Drop the template suffix on `/resources/[slug]` and the whole article set comes back under the limit at zero cost to the target keyword.** The concern pages sit at 61–67 and are borderline — acceptable. The homepage at 83 and `/concerns/concussion` at 79 need shortening on their own terms.

Descriptions over 160 characters — 4 routes: `/concerns/concussion` (191), `/about/founder` (186), `/adults` (171), `/stories` (162).

**No duplicate or near-duplicate titles or descriptions anywhere.** All 37 are unique and none is a template-generated near-clone. This is genuinely clean.

### 2.3 Crawlability, robots, sitemap

- `robots.txt`: allows all, disallows `/api/`, absolute sitemap pointer. Correct. Should also disallow `/guides/` (§2.2).
- Sitemap: **37 URLs, all built, all 200.** Gated content (3 team profiles) correctly excluded. `lastmod` present.
- **`lastmod` is one hand-maintained constant (`2026-08-22`) applied to all 37 URLs.** The reasoning in `app/sitemap.ts` — that a build-time `new Date()` would falsely claim every page changed on every deploy — is right. But the current form tells Google all 37 pages changed on the same day, which is equally untrue and equally uninformative. Per-entity revision dates (one per concern, per location, per article) would make the field actually useful, and article dates are needed for §2.4 anyway.
- All routes static/SSG. First Load JS 126–133 kB shared. TTFB effectively zero.
- Trailing-slash URLs 308-redirect to the canonical non-slash form. **This is a migration trap** — see §2.6.
- `/ABOUT` returns 404. Case-sensitive routing; harmless unless legacy links used mixed case.
- No custom `app/not-found.tsx`. The default renders with full chrome and correctly emits `noindex`. Acceptable; a branded 404 with links to the top pages would be better, and matters more than usual when ~108 legacy URLs are about to start landing on it.

### 2.4 Structured data

Emitted today, validated by parsing every block out of the build:

| Type | Pages | State |
|---|---|---|
| `Organization` | 37 (root layout) | Complete: name, url, logo, description, telephone, `foundingDate: 2016`, `founder` as nested `Person` with `jobTitle`. Single `@id`, referenced by everything else. |
| `LocalBusiness` | 2 (Nashville, Murfreesboro) | Strong. Confirmed `streetAddress` + `postalCode`, `geo`, `hasMap`, `openingHoursSpecification` (correctly grouped, closed days correctly omitted), `priceRange`, `areaServed` (16 + 10 `City` nodes), `parentOrganization` by `@id`. Franklin correctly ships none. |
| `FAQPage` | 10 (`/faq` + 9 concerns) | 42 distinct questions. Only 2 questions appear on more than one page. Clean. |
| `BreadcrumbList` | 15 | Built from the same array that renders the visible crumb. Correct. |
| `Service` | 1 (`/lens-neurofeedback`) | `serviceType`, `provider` by `@id`, `areaServed` limited to open centers. |

The `lib/schema.ts` discipline — schema never asserts more than the page does, one Organization entity referenced by `@id` — is better than most agency work. It is also why the gaps below are gaps rather than errors.

**Missing, ranked by value:**

1. **`sameAs` on `Organization`, and GBP URLs on both `LocalBusiness` nodes.** Both Google Business Profiles exist and both CIDs are already in `lib/locations.ts` (`reviewReadUrl`, CID `690359003920868215` Nashville / `978389547119317468` Murfreesboro). Nothing is unverified, nothing is blocked. This is the single strongest entity-reconciliation signal available and it is currently one array short. **Highest-value schema fix on the list, and it is a data plumbing change, not a decision.**
2. **`Article` / `BlogPosting` on all ten `/resources/[slug]` pages.** They currently emit only `Organization` + `BreadcrumbList` — the same markup as a navigation stub. No `headline`, no `author`, no `publisher`, no `datePublished`, no `dateModified`, no `image`. There is no date field on the `Resource` type at all, so the site cannot express freshness anywhere: not in schema, not on the page, not in the sitemap. For informational content this is a real handicap.
3. **`Person` on `/about/founder`.** Sheri Rowney is named on the page, in the `<title>`, in the meta description, in the image alt, and inside the Organization node. A standalone `Person` with `@id`, `jobTitle`, `worksFor`, and `image` is fully licensed by what the page already says. (Credentials and `alumniOf` wait on §5.)
4. **`WebSite`** on the root. Low value with no site search; cheap.
5. **`Offer` / `Product` for the $150 Brain Map**, when and if `/brain-map` is built. The existing decision not to emit one — because `PACKAGE_NOTE` conditions the package price and an `Offer` without the condition would break the schema-never-overclaims rule — is correct and should hold.

**Correctly absent, do not "fix":** `aggregateRating`. 159 five-star reviews across two profiles is a strong asset, and self-emitted review markup is exactly the self-serving case Google names as a manual-action risk. The reasoning already written into `lib/site-config.ts` is right. Keep the numbers as copy.

### 2.5 What would fail a Lighthouse or Search Console check

| Check | Status |
|---|---|
| Document has a title / meta description | Pass, 37/37 |
| Exactly one H1 | Pass, 37/37 |
| Image alt text | Pass, 100%, and descriptive |
| Links are crawlable | Pass — every internal link is a real `<a href>` |
| Descriptive link text | Pass — zero generic anchors ("click here", "read more") in `<main>`. One weak spot: `"Explore this location →"` ×3 points at the two highest-value local pages. |
| `robots.txt` valid | Pass |
| Canonical valid | Pass in code; **fails in the audited build** because `.env.local` points at localhost |
| Viewport meta | Pass |
| Structured data valid | Pass — all 62 JSON-LD blocks parse; no invalid types |
| Legible font sizes | **Marginal** — `.tag` at 10.5 px (`/resources` cards), `.city` at 11.5 px, `.celeb-role` at 11 px. Small proportion of text, so likely passes the 40% threshold; still under the 12 px floor. |
| Tap targets ≥ 24×24 (WCAG 2.5.8) | **Fails on two sitewide elements** — `A.nav-tel` (the header phone link) at 141×23 px, and `INPUT.askbar-input` at 196×22 / 260×22 px. Both appear on every page. Ghost buttons and footer links measure 43 px — one pixel under Google's 44 px recommendation. |
| Horizontal scroll / clipping | Pass — the repo's own sweep clears 148 route/width combinations |
| **Privacy policy** | **Absent.** No route, no footer link. The site collects name/email/phone into Supabase and logs AI assistant transcripts. The legacy site has `/privacy-policy/`, which will 404 on cutover. |
| Analytics / GSC verification | **Absent.** No tag of any kind. |
| `apple-touch-icon`, web manifest | Absent. Minor. |

### 2.6 The WordPress migration — the largest technical risk in this document

`harmonizedbraincenterstn.com` is still WordPress (`nginx`, All in One SEO Pro 5.0.1, `wp-json` present). **Nothing in this repository is live.** Of the 37 URLs in the new sitemap, exactly four (`/`, `/about`, `/locations`, `/contact`) share a path with the current site. The other 33 are new.

**The live inventory, from the WordPress sitemaps:**

| Sitemap | URLs |
|---|---|
| `page-sitemap.xml` | ~40 |
| `post-sitemap.xml` | ~55 |
| `category-sitemap.xml` | 14 |
| `post_tag-sitemap.xml` | 6 |
| **Total** | **~115** |

`QUERY-TO-PAGE-MAP.md` maps **seven**. On cutover as currently planned, roughly **108 URLs 404**.

**Three specific problems that a bigger table alone will not solve:**

**(a) Legacy 301s live inside WordPress and die with it.** Verified live:

| Legacy | Currently 301s to | After cutover, without a rule |
|---|---|---|
| `/lens-therapy/` | `/what-is-lens/` | 404 |
| `/faqs/` | `/faq/` | 404 |
| `/stress/` | `/stressanxiety/` | 404 |
| `/sleep-disorder/` | `/sleepproblems/` | 404 |
| `/testimonials1/` | `/testimonials/` | 404 |
| `/depression1/` | `/depression/` | 404 |
| `/concussion-tbi1/` | `/concussion-and-tbi/` | 404 |
| `/emotional-balance22/` | `/emotional-balance/` | 404 |
| `/self-development/` | `/peakperformance/` | 404 |
| `/home/` | `/` | 404 |
| `/migraines-and-fibromyalgia/` | `/migrainesandpain/` | 404 |
| `/home-simple/` | `/harmonizedbraincenterstn.com` (already broken) | 404 |

Every one of these needs a *direct* rule to its final new destination. Chaining them through the intermediate legacy URL means a second hop that also has to exist.

**`/lens-therapy/` is the important one.** `QUERY-TO-PAGE-MAP.md` gives the LENS modality cluster 10,900+ impressions at position 13.9–17.1 and calls it "the largest single recoverable cluster on the site." Two live URLs hold it — `/lens-therapy/` and `/what-is-lens/` — and **neither appears in the redirect table.** Both must 301 to `/lens-neurofeedback`.

**(b) Trailing slashes.** Every WordPress URL ends in `/`. Next.js 15 with default config 308-redirects `/anything/` → `/anything`. Verified: `/add-adhd/` → 308 → `/add-adhd` → 404. If host redirect rules are written against the non-slash form, every legacy hit becomes a 308 + 301 chain; if they are written against the slash form but run *after* Next's normalisation, they never fire at all. **Write the rules at the edge/host layer, matching the trailing-slash source form, executing before the app.**

**(c) Category and tag archives.** 20 URLs, all currently 200. They are thin and mostly worthless, but they are indexed. A blanket `/category/*` and `/tag/*` → `/resources` rule costs one line and avoids 20 fresh 404s in Search Console during the most sensitive week of the migration.

**A redirect map that is actually complete.** Approved rows from `QUERY-TO-PAGE-MAP.md` are marked ✅; the rest are proposals needing Ben's sign-off:

| Legacy (trailing slash) | → New | Note |
|---|---|---|
| `/home/`, `/home-simple/` | `/` | Duplicate homepages |
| `/what-is-lens/`, `/lens-therapy/` | `/lens-neurofeedback` | **The 10,900-impression cluster. Highest-value redirect on the list.** |
| `/nashville_neurofeedback_therapy/` | `/locations/nashville` | Local page, currently ranking |
| `/add-adhd/` ✅, `/adhd/`, `/add-adhd-landing-page/` | `/concerns/focus-adhd` | |
| `/stressanxiety/` ✅, `/stress/` | `/concerns/anxiety` | |
| `/sleepproblems/` ✅, `/sleep-disorder/` | `/concerns/sleep` | |
| `/concussion-and-tbi/` ✅, `/concussion-tbi1/` | `/concerns/concussion` | |
| `/emotional-balance/`, `/emotional-balance22/` | `/concerns/emotional-regulation` | |
| `/depression/` ✅, `/depression1/` | `/what-we-help-with` | Approved reasoning holds |
| `/peakperformance/`, `/self-development/` | `/concerns/stress-resilience` | **Decision needed** — nearest honest destination, or 410 |
| `/migrainesandpain/`, `/migraines-and-fibromyalgia/` | ? | **Decision needed** — the rebuild covers no migraine concern. Nearest honest destination is `/what-we-help-with`; a 410 is defensible. Do not invent a concern page for it. |
| `/vibro-acoustic-chair/` ✅ | 410 Gone | |
| `/trisha-yearwood/` ✅ | `/stories` | |
| `/testimonials/`, `/testimonials1/` | `/stories` | |
| `/faq/`, `/faqs/` | `/faq` | |
| `/blog/`, `/advice-center/` | `/resources` | |
| `/privacy-policy/` | **`/privacy-policy`** | **Requires building the page (§2.5)** |
| `/concierge/` | ? | **Decision needed** — no equivalent exists |
| `/refer-a-friend/` | ? | **Decision needed** — a live $25 referral offer with no home in the rebuild |
| `/phoneschedule/`, `/new-client-intake-form/` | `/contact` | |
| `/what-we-help-with-1/` | `/what-we-help-with` | |
| `/category/*`, `/tag/*` (20) | `/resources` | Blanket rule |
| ~55 `/post-sitemap` posts | Per-post to the nearest concern or article; **the ~30 numeric slugs (`/6200-2/` etc.) → 410** | Needs one pass with the GSC export open |

**One content-consistency item found while doing this.** The live WordPress site says "over 120,000 sessions" and calls the practice "the leading LENS practice in the nation." The rebuild says "140,000+" and makes no leadership claim. The session-count change is fine and presumably just newer. The dropped leadership claim is a deliberate improvement. But if both properties are visible during a phased cutover, the two numbers will be visible side by side — worth knowing before someone notices.

---

## 3. On-page — every route

`Words` = full-document text. `Unique` = words in sentences that appear on no other page, which is the number that matters for thin-content assessment. `Target` is the cluster assigned in `QUERY-TO-PAGE-MAP.md` where one exists.

| Route | Title chars | Desc chars | H1 | Words | Unique | Depth | Target query | Assessment |
|---|---|---|---|---|---|---|---|---|
| `/` | **83** | 126 | "Help for anxiety, focus, and sleep — without medication." | 1,521 | 928 | 0 | `neurofeedback therapy` | Title too long; H1 carries no category or geography. Strong page otherwise. |
| `/lens-neurofeedback` | 45 | 157 | "What LENS neurofeedback is, and who it's for." | 1,494 | 820 | 1 | `lens therapy` | **The most important page on the site.** Well built. Needs the two legacy URLs redirected into it. |
| `/what-we-help-with` | 44 | 152 | "Start with what you're living — not with a label." | 1,111 | 720 | 1 | hub | Good. 12 outbound contextual links. |
| `/concerns/concussion` | **79** | **191** | "Cleared by your doctor, and still not right." | 1,108 | 620 | 1 | `post concussion symptoms` | Best concern page on the site. Title and description both over. |
| `/faq` | 30 | 106 | "Every question, answered plainly." | 959 | 411 | 1 | `is neurofeedback safe` (weakly) | Title wastes the slot; `LENS Neurofeedback FAQ` is free. |
| `/how-lens-works` | 55 | 138 | "A gentle signal, a comfortable chair…" | 946 | 538 | 1 | `how does LENS work` | Good. Receives 14 inbound, passes 1 out — a near-terminal node. |
| `/locations/murfreesboro` | 65 | 159 | "LENS neurofeedback for Rutherford County…" | 927 | 534 | 1 | `neurofeedback murfreesboro` | Strong copy. **Zero images** — no `image` in its LocalBusiness. |
| `/locations/nashville` | 62 | 144 | "LENS neurofeedback in Nashville — Tuesday through Saturday." | 924 | 511 | 1 | `neurofeedback nashville` | Strongest local page. Saturday hours well used. |
| `/concerns/focus-adhd` | 61 | 140 | "Focus, ADHD & follow-through" | 753 | 359 | 1 | `adhd help without medication` | H1 carries neither "neurofeedback" nor geography. |
| `/concerns/anxiety` | 65 | 147 | "Anxiety & nervous-system overload" | 751 | 315 | 1 | `neurofeedback for anxiety` | Same. Largest cluster (7,017 impr) on 315 unique words. |
| `/concerns/emotional-regulation` | 65 | 133 | "Emotional regulation" | 750 | 361 | 1 | `neurofeedback emotional regulation` | H1 is two words. |
| `/concerns/brain-fog` | 67 | 142 | "Brain fog, memory & mental fatigue" | 733 | 343 | 1 | `neurofeedback for brain fog` | |
| `/concerns/trauma` | 66 | 138 | "Trauma-related stress" | 726 | 323 | 1 | `neurofeedback for trauma` | No longer near-orphaned (4 contextual inbound). |
| `/concerns/stress-resilience` | 65 | 128 | "Stress & resilience" | 726 | 316 | 1 | `neurofeedback for burnout` | |
| `/concerns/sleep` | 50 | 139 | "Sleep difficulties" | 717 | 320 | 1 | `neurofeedback for sleep` | H1 is two generic words for a 2,702-impression cluster. |
| `/first-visit` | 43 | 148 | "Know exactly what to expect…" | 693 | 320 | 1 | `what to expect at a neurofeedback session` | Holds the $150 price. Title targets no cost query. **1 outbound link — a dead end.** |
| `/concerns/children-school` | 61 | 127 | "Children, school & transitions" | 681 | **257** | 1 | `neurofeedback for school struggles` | Thinnest concern page. Overlaps `/children-families`. |
| `/resources` | 36 | 115 | "Understand the brain you live with." | 655 | 274 | 1 | hub | Now real. The only page linking to any article. |
| `/about` | 32 | 154 | "Large enough to trust. Personal enough to care." | 631 | 290 | 1 | navigational | |
| `/locations/franklin` | 49 | 120 | "The same gentle care is coming to Williamson County." | 622 | 218 | 1 | pre-launch | Correct as-is. No LocalBusiness — right call. |
| `/stories` | 41 | **162** | "Small changes. Real weeks. Honest telling." | 597 | **99** | 1 | `neurofeedback reviews nashville` | **Thin.** 99 unique words on the page that should carry 159 five-star reviews. |
| `/children-families` | 65 | 150 | "Your child isn't lazy, broken, or 'bad at school.'" | 525 | **152** | 1 | `neurofeedback for children` | **Thin** — and `QUERY-TO-PAGE-MAP.md` made this cluster a P1. 152 unique words is not a P1 page. |
| `/adults` | 51 | **171** | "Functioning isn't the same as feeling like yourself." | 518 | **188** | 1 | `neurofeedback for adults` | **Thin** hub. Mostly a link rail. |
| `/locations` | 36 | 151 | "One organization. The same care, closer to home." | 491 | 183 | 1 | navigational | Fine as a hub. |
| `/contact` | 45 | 107 | "Tell us what's going on…" | 460 | 197 | 1 | conversion | 100% unique. Receives 36 inbound, passes 0 — correct for a conversion endpoint. |
| `/about/founder` | 38 | **186** | "Sheri Rowney" | 443 | **122** | 1 | E-E-A-T anchor | **The most consequential thin page on the site.** See §5. |
| `/about/team` | 35 | 132 | "Practitioners who will know your name…" | 393 | **60** | 1 | E-E-A-T | **Thinnest page on the site.** 2 of 6 members render. |
| `/resources/told-to-just-relax` | **90** | 144 | "Why you can't relax when there's nothing to relax about" | 1,249 | 835 | **2** | `told to just relax anxiety` | Best article. One inbound link. |
| `/resources/the-last-ten-percent` | **87** | 154 | "The last ten percent…" | 1,126 | 716 | **2** | `can't finish what I start` | |
| `/resources/homework-battles` | 76 | 130 | "Homework battles…" | 1,114 | 702 | **2** | `adhd homework battles` | |
| `/resources/braced-for-something` | 75 | 132 | "Why your body stays braced…" | 1,088 | 634 | **2** | `body braced nothing wrong` | |
| `/resources/the-3am-waking` | 77 | 125 | "The 3 a.m. waking…" | 1,073 | 644 | **2** | `waking at 3am every night` | |
| `/resources/exhausted-after-eight-hours` | 81 | 99 | "Why you're exhausted after eight hours of sleep" | 1,064 | 613 | **2** | `slept 8 hours still tired` | Description at 99 chars is short — room to use. |
| `/resources/bad-at-school` | **89** | 129 | "When a bright kid starts saying 'I'm just bad at school'" | 1,058 | 629 | **2** | `child says bad at school` | |
| `/resources/when-sleep-hygiene-isnt-it` | **89** | 139 | "When sleep hygiene isn't the problem" | 910 | 513 | **2** | `sleep hygiene not working` | |
| `/resources/lens-and-medication` | 77 | 108 | "Can you do LENS while you're on medication?" | 892 | 498 | **2** | `neurofeedback with medication` | |
| `/resources/alongside-therapy` | 75 | 132 | "Can you do LENS while you're seeing a therapist?" | 817 | 444 | **2** | `neurofeedback alongside therapy` | |

**Orphans:** none in the strict sense. Every route has at least one inbound internal link and appears in the sitemap. But the ten articles have exactly **one** each, which is functionally close (§4).

**Pages with no clear target:** `/adults` and `/children-families` are audience hubs whose assigned targets (`neurofeedback for adults`, `neurofeedback for children`) duplicate what the concern pages and the location pages already claim, on 188 and 152 unique words respectively. They earn their place in the navigation; they do not currently earn a ranking. `/about/team` at 60 unique words has no target and, until the roster is real, no reason to be indexed.

**Duplicate content:** no duplicate titles or descriptions. The body-text repetition that exists is CTA boilerplate, correctly scoped: the free-call CTA on 36 pages, the trust line on 25, the standard closing sub on 21, the wellness disclaimer on 11. That is normal chrome. The `GuideCta` heading duplication flagged in the first audit is genuinely fixed — the heading is now per-page.

---

## 4. Internal linking — what the graph actually shows

The brief asked whether the ten articles were built as clusters feeding concern pages, "rather than what was intended." The honest answer is: **half of it happened.**

### What was intended, and did happen

Every article links up to exactly two destinations, and the assignments match `ARTICLE-CLUSTER-PLAN.md` exactly:

| Article | Links up to |
|---|---|
| `homework-battles` | `/concerns/focus-adhd`, `/concerns/children-school` |
| `bad-at-school` | `/concerns/children-school`, `/concerns/focus-adhd` |
| `the-last-ten-percent` | `/concerns/focus-adhd`, `/adults` |
| `lens-and-medication` | `/concerns/focus-adhd`, `/faq` |
| `told-to-just-relax` | `/concerns/anxiety`, `/concerns/sleep` |
| `braced-for-something` | `/concerns/anxiety`, `/concerns/stress-resilience` |
| `alongside-therapy` | `/concerns/anxiety`, `/faq` |
| `exhausted-after-eight-hours` | `/concerns/sleep`, `/concerns/brain-fog` |
| `the-3am-waking` | `/concerns/sleep`, `/concerns/anxiety` |
| `when-sleep-hygiene-isnt-it` | `/concerns/sleep`, `/concerns/stress-resilience` |

The anchor text is descriptive, the boundary discipline between the anxiety and sleep clusters is real and visible in both directions, and the concern pages also cross-link to each other (three "related concerns" per page). The intent is executed in the copy.

### What did not happen

**No concern page links to any article.** Not one, in either direction of the cluster. Verified by parsing `<main>` on all 37 routes: the concern template's outbound set is fixed at `/what-we-help-with`, `/contact`, `/how-lens-works`, and three sibling concerns. There is no "related reading" block, no article rail, no inline citation.

The consequence, measured:

| Node class | Inbound links (total) | Depth from `/` | Internal PageRank share |
|---|---|---|---|
| Every chrome-linked page (27 routes) | 36 | 0–1 | **3.52%** each — identical to four decimal places |
| Every `/resources/[slug]` article (10 routes) | **1** | **2** | **0.49%** each |

Two things fall out of this.

**First, the article cluster is starved.** A 7.2× PageRank deficit, one inbound link apiece, and depth 2 behind a hub page. These are the pages doing the informational-query work — the pages `ARTICLE-CLUSTER-PLAN.md` correctly identified as the way to build topical authority around "neurofeedback" — and they are the least-supported pages on the site. Their outbound links to the concern pages are worth correspondingly little, because a node with 0.49% of the graph's authority has little to pass.

**Second, and more uncomfortable: the contextual link work is currently invisible.** The header mega-menu plus footer put **36 identical internal links on every page**. Against that, six contextual links per concern page are noise. The PageRank distribution across all 27 chrome-linked pages is *perfectly flat* — `/contact` and `/about/team` and `/concerns/anxiety` all sit at exactly 3.52%. Every deliberate editorial link on this site — the location→concern links, the concern→concern rail, the article→concern handoffs — moves that number by zero.

Google discounts boilerplate navigation links relative to in-content links, so the real picture is less extreme than a naive PageRank model implies. But the direction is not in doubt: with 36 sitewide nav links per page, in-content links carry roughly one-seventh of the link budget, and no amount of careful editorial linking will differentiate pages that the navigation has already flattened.

### The three fixes, in order

1. **Link articles from the concern pages they feed.** A "Read more on this" block on each concern template, pulling the 2–4 articles assigned to that concern. This closes the cluster loop, gives each article 2–4 more inbound links from depth-1 pages, and is the single highest-leverage internal-linking change available. It is also the one that makes the cluster structure legible to Google as a cluster rather than as ten unconnected essays behind an index.
2. **Cross-link articles within a cluster.** The three sleep articles do not link to each other; nor do the four focus/ADHD articles. Sibling links inside a topic are how a cluster reads as a cluster.
3. **Cut the footer.** The footer alone repeats 21 links on every page. Reducing it to the ~8 that matter (locations, contact, FAQ, about, privacy) and letting the header mega-menu carry the rest would let the in-content links start to mean something. This is a real trade against navigation convenience, and it is Ben's call — but the current design has spent the entire link budget on chrome.

**Also worth fixing:** `/first-visit` (5 inbound, 1 outbound) and `/how-lens-works` (14 inbound, 1 outbound) are near-terminal nodes absorbing authority and passing almost none on. `/how-lens-works` in particular receives more contextual inbound links than any page except `/what-we-help-with` and `/contact`, and forwards them nowhere.

---

## 5. E-E-A-T — an honest assessment

For a health-adjacent wellness site, this is the weakest dimension, and almost nothing about it is a code problem.

### What exists

| Signal | State | Strength |
|---|---|---|
| **Reviews** | 5.0 rating, **144 reviews Nashville, 15 Murfreesboro**, none below five. Both GBP CIDs confirmed and in the repo. | **Strong.** The single best trust asset the practice has. |
| **Session volume** | "140,000+" sessions, verified | Strong and specific |
| **Years in operation** | Founded 2016, in `Organization.foundingDate` | Solid |
| **Physician referrals** | "Physicians in Middle Tennessee refer patients to us — we work from a standing referral list." | **Strong claim, badly placed.** It appears on `/concerns/concussion` and nowhere else. |
| **Honest limitations** | Consistent, everywhere. Wellness-not-medical disclaimer; "we don't diagnose or treat"; the concussion page sends recently-injured visitors to a doctor *above its own CTAs*; the assistant carries a matching safety rule. | **Genuinely excellent.** This is real Trustworthiness and most competitors do not have it. |
| **Founder identified** | Sheri Rowney, Founder & Clinical Director — named on-page, in title, in meta, in image alt, in `Organization.founder` | Present but hollow (below) |
| **Pricing transparency** | $150 Brain Map and $125/session published | Good |

### What is missing, ranked by ranking impact

**1. Named practitioners with credentials. (Highest impact by a wide margin.)**
`lib/team.ts` holds six entries. Four are `[Practitioner name]` with `[Paragraph: professional background…]` bios and `[certifications — confirm]`. Three profile pages 404 in production, correctly. `/about/team` renders 60 unique words. Nashville lists `["Sheri Rowney", "[Name]", "[Name]"]`; Murfreesboro lists two placeholders and consequently suppresses its team section entirely.

This is decisive because of who else ranks. The Nashville neurofeedback SERP is contested by [MaxWell Clinic](https://maxwellclinic.com/neurofeedback/), whose neurotherapy team is fronted by **David Haase, MD**, an International Society for Neurofeedback Research member described as having helped develop EEG software used by clinicians internationally; by [Nashville Brain Institute](https://nashvillebraininstitute.com/neurofeedback-therapy/); by [Chambul Wellness Center](https://www.chambulwellness.com/services-and-therapies/neurofeedback) fronting Dr. Chambul; and by [Nashville BrainCore](https://nashvillebraincore.com/braincore-neurofeedback/), which self-describes as "Tennessee's #1 neurofeedback center." Every one of them puts a credentialled human on the page. Harmonized puts a placeholder.

The relevant credentials in this field are BCIA certification and Ochs Labs LENS training. If practitioners hold either, saying so on-page — with a `Person` node carrying `hasCredential` — closes most of the gap. If they hold neither, the honest asset is the in-house training curriculum, and it should be described concretely (hours, supervision, who signs off) rather than named in one clause.

**2. A real founder page with credentials.**
`/about/founder` has 122 unique words. `FOUNDER_BIO` is `verified: false` on three unconfirmed claims; `FOUNDER_QUOTE` is `verified: false` pending sign-off. So production renders a name, a role, a photo, and almost nothing else. The gate is behaving exactly as designed — the problem is that nobody has walked through it. For the founder of a 2016 practice with 140,000 sessions, this page should be the strongest Experience signal on the site and it is currently the second-thinnest page in the build.

**3. Author and reviewer attribution on the ten articles.**
Every article renders `By Harmonized Brain Centers` and nothing more. No author, no reviewer, no date, no `Article` schema. The `Byline` type is well designed — `reviewer` is a `Verifiable`, `org` is checked by `npm run check:index` so a person cannot be smuggled into the publisher field — and it is doing its job of preventing a false credit. But an organizational byline with no date is the weakest attribution a health-adjacent article can carry. Ten pieces of genuinely good writing are being published anonymously and undated.

**4. Citations.**
Zero across ten articles and nine concern pages. The articles make claims about nervous-system arousal, executive function, and sleep architecture with no sources. The site is careful never to overclaim, which protects it — but "careful and unsourced" reads differently from "careful and sourced" to both a reader and a quality rater. The LENS literature is thin but it exists (the [ISNR outcomes study](https://www.isnr-jnt.org/article/view/16725) on 100 patients; the [exploratory stress/anxiety study](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3373531/)). Citing it honestly — including its limits — is a stronger position than citing nothing.

**5. The physician-referral claim is buried.**
"Physicians in Middle Tennessee refer patients to us — we work from a standing referral list" is the strongest third-party credibility statement anywhere in this codebase, and it lives on one concern page. It belongs on `/about`, on both location pages, and in the homepage proof band.

**6. A research/evidence page.**
`SEO-AUDIT.md` §6.3 item 31 proposed one. Still absent, and it remains the highest-value E-E-A-T asset available to a practice that correctly declines to make medical claims: a hedged, sourced, reviewed page saying what the LENS evidence does and does not show. It also answers the "is neurofeedback legit / does it work" query family, which is the dominant pre-purchase research pattern in this category.

**7. No privacy policy.** Repeated from §2.5 because it is a Trust signal, not only a legal one. A YMYL site collecting names, phone numbers and AI chat transcripts with no privacy policy is a visible gap to a careful reader and to a quality rater.

### Ranked by movement per unit of effort

| Rank | Gap | Effort | Why this rank |
|---|---|---|---|
| 1 | Practitioner names + credentials | Ben — roster sign-off | Closes the largest visible gap against every ranking competitor; unblocks 3 pages, `Person` schema, and Murfreesboro's team section, all automatically |
| 2 | Founder bio + credentials + `Person` schema | Ben — 3 claims + sign-off, then S of code | The named entity already exists; it just says nothing |
| 3 | Article dates + `Article` schema | Code, S | Ten articles currently invisible as articles to every parser |
| 4 | Move the physician-referral line to `/about` + both locations | Code, S | Best claim on the site, worst placement |
| 5 | Privacy policy page | Ben (content) + code, S | Trust floor for a YMYL data-collecting site; also fixes a migration 404 |
| 6 | Citations on articles + a research/evidence page | Ben (approval) + M | Highest ceiling, slowest to build |
| 7 | Named reviewer on articles | Ben — confirm the review happened | The type is already built for it |

---

## 6. Local

### NAP consistency

| Element | State |
|---|---|
| **Name** | Consistent: "Harmonized Brain Centers" sitewide, "Harmonized Brain Centers — {City}" in schema |
| **Address** | **Now confirmed and rendering.** Nashville: 197 Thompson Ln, Suite S, TN 37211. Murfreesboro: 206 W Chestnut St, TN 37130. Both in on-page copy and in `PostalAddress` with `postalCode`, both with Census-geocoded `geo`, both with `hasMap`. **This was the #1 blocker in the previous audit and it is closed.** |
| **Phone** | **One number, `(615) 331-8762`, on both centers.** Still the weakest NAP element. |
| **Hours** | Per-center, structured, correct: Nashville Tue–Fri 09:00–18:00 + Sat 08:00–15:00; Murfreesboro Tue–Thu 09:00–18:00. Closed days deliberately omitted from schema rather than encoded ambiguously — correct. |

**Live cross-check:** the WordPress site currently publishes Nashville hours as "Tuesday – Friday, 9:00 AM – 6:00 PM" with **no Saturday**. The rebuild's Saturday hours are a genuine differentiator in this category — verify the GBP shows them, because if the GBP inherited the old week, the site and the profile disagree on the one fact most likely to win a Saturday "near me" search.

### Google Business Profile alignment

Both profiles exist and both are already in the codebase:

| Center | CID | Reviews | Rating |
|---|---|---|---|
| Nashville | `690359003920868215` | 144 | 5.0 |
| Murfreesboro | `978389547119317468` | 15 | 5.0 |

The GBP baseline in `QUERY-TO-PAGE-MAP.md` is unambiguous about where acquisition happens: **GBP Nashville — 11,116 views → 671 calls + 1,084 website clicks. GBP Murfreesboro — 2,869 views → 179 calls + 219 website clicks.** Against a website with 0.5% non-branded CTR and 909 of its top 1,000 queries producing zero clicks. The first audit's finding — that GBP is doing acquisition the site is not — is unchanged and remains the most important commercial fact about this project.

**The gaps:**

1. **`sameAs` is absent everywhere.** Both `reviewReadUrl` CIDs are sitting in `lib/locations.ts`, unused by `lib/schema.ts`. `Organization.sameAs` and a `sameAs` on each `LocalBusiness` are the standard way to tell Google that this site and that profile are the same entity. **Nothing is blocked. This is the highest-value local fix on the list and it is a data plumbing change.**
2. **One phone number for two centers.** Shared numbers weaken Google's confidence that the locations are distinct entities, which is exactly the confidence a two-location map-pack strategy depends on. A direct line per center — used identically on the site, in schema, on the GBP, and in every citation — is worth more than any on-page change in this section. It is an operations decision, not a code one.
3. **No map embed.** `hasMap` is in the schema; the page renders a styled gradient. With confirmed addresses and geo, a real embed is now possible and is a normal local-page expectation.
4. **Murfreesboro has zero photographs.** Its `LocalBusiness` node therefore omits `image` entirely while Nashville carries four. On a profile with 15 reviews against Nashville's 144, the weaker location is also the one with no visual evidence it exists.
5. **No review links on `/stories`.** Both `reviewReadUrl` and `reviewWriteUrl` are in the data. `/stories` renders 99 unique words and does not link to 159 five-star reviews.
6. **No citations audit.** With addresses now confirmed, the Apple Maps / Bing Places / Yelp / chamber / health-directory pass can finally run with an exact, stable NAP.

### What would actually move the map pack

In order, and honestly: **proximity, prominence, and relevance, roughly in that order of weight for "neurofeedback near me" type queries.** Proximity is fixed. That leaves:

1. **Review velocity, not review count.** 144 reviews at 5.0 is already strong; a steady inflow is what sustains ranking. `reviewWriteUrl` exists for both centers and is described in the code as "follow-up only" — a structured post-visit ask is the highest-return local activity available, and it needs no website change at all.
2. **GBP categories.** Primary category is the single strongest map-pack lever and it lives entirely inside the profile. "Neurofeedback" is not a Google category; the realistic set is a primary of *Mental health service* or *Wellness center* with secondaries. Worth an explicit decision rather than whatever was picked in 2016.
3. **GBP completeness** — services, attributes, products, hours (including Saturday), and photos, refreshed. Google Posts weekly.
4. **`sameAs` + a real map embed + per-center phone numbers**, from the list above.
5. **Citation consistency**, now unblocked.

**What will not move it:** more on-page copy on the two location pages. They are already 924 and 927 words with strong local signals, and they are not the constraint.

**Still correct: do not build per-town pages.** "Neurofeedback in Smyrna, TN" with no premises there is a doorway page. The `areaServed` lists (16 + 10 cities, from real client data) are the right way to cover those towns and they are already shipping.

---

## 7. Competitive reality

Confidence note: this section rests on the GSC/GBP baseline recorded in `QUERY-TO-PAGE-MAP.md` (real, 16-month export), live SERP sampling, and category structure. It is **not** backed by a keyword-difficulty or backlink pull — the Ahrefs connector is unauthorised in this session. Volume and difficulty figures should be re-checked against a real tool before anyone commits budget to the 12-month items.

The starting position, stated plainly: **0.5% non-branded CTR. 77% of web clicks are branded. 909 of the top 1,000 queries produced zero clicks.** Three of the four largest clusters — anxiety (7,017 impressions), ADHD (6,277), sleep (2,702) — sit at positions 50–60 with zero clicks. That is not a site slipping; it is a site that has never competed. The rebuild is a first attempt, not a recovery.

### LENS / neurofeedback modality — **the only genuinely winnable national cluster**

**6 months: yes, and this should be the entire early focus.**

`lens therapy` and `lens neurofeedback` already produce 10,900+ impressions at position 13.9–17.1 for the current WordPress pages. LENS is a specific, trademark-adjacent modality developed by Len Ochs; national LENS providers are scattered small practices ([Ochs Labs](https://main.ochslabs.com/about/), Brain Resource Center, individual therapists). There is no dominant national authority page for "what is LENS neurofeedback." The rebuild's `/lens-neurofeedback` — 1,494 words, `Service` schema, well-structured — is a better page than most of what ranks.

Page one within six months is realistic **provided** `/what-is-lens/` and `/lens-therapy/` both 301 into it. Without those redirects the existing position is thrown away and this becomes a 12-month task instead.

**Generic `neurofeedback therapy` / `neurofeedback` nationally: not winnable, ever, for this practice.** Those SERPs belong to Cleveland Clinic, Healthline, WebMD and academic institutions. `QUERY-TO-PAGE-MAP.md` assigns `neurofeedback therapy` to the homepage as primary. That assignment is fine as a *framing* decision — the homepage should say what the business does — but it should not be tracked as a ranking goal. The recoverable half is `neurofeedback nashville` / `neurofeedback murfreesboro` / `neurofeedback near me`, which is a local query resolved in the map pack.

### Local — Nashville and Murfreesboro

**Murfreesboro, 6 months: yes.** 325 impressions at **position 3.5** already, on a page that was previously a stub. Rutherford County is a materially less contested market than Davidson. Two constraints, both non-code: 15 reviews vs Nashville's 144, and zero photographs. Fix those and this is the easiest win on the board.

**Nashville map pack, 6–12 months: contested but real.** 2,930 impressions at position 10.2. 144 five-star reviews is a genuinely strong prominence signal — better than several competitors will have. The obstacles are proximity (197 Thompson Ln vs competitors spread across the metro), a shared phone number, and the E-E-A-T deficit against physician-led practices. Top three for the broad "neurofeedback nashville" pack is a 12-month goal, not a 6-month one. Top three for **"LENS neurofeedback nashville"** is a 6-month goal, because almost nobody else in the metro offers LENS specifically — most competitors run traditional/BrainCore/qEEG protocols.

**That distinction is the whole local strategy.** Compete on the modality, not on the category.

### ADHD alternatives

**Nationally: not winnable. Not at 6 months, not at 12, not at all.**

`adhd help without medication` and its relatives are owned by health publishers and affiliate sites — [adhdadvisor.org](https://www.adhdadvisor.org/learn/adderall-alternatives), [alternativetomeds.com](https://www.alternativetomeds.com/blog/adhd-medication-alternatives/), ADDitude, Healthline. A two-location wellness practice with no author credentials and no citations does not enter that SERP. `QUERY-TO-PAGE-MAP.md` assigns `adhd help without medication` as the primary target for `/concerns/focus-adhd`; the 6,277 impressions at position 58.8 that produced zero clicks are the empirical answer to whether that is achievable. **This target should be reframed as local or dropped.**

**Locally: 12 months, and contested.** Nashville BrainCore already runs a dedicated "Overcoming ADHD Without Medication" page. `neurofeedback for adhd nashville` and the parent-specific long tail are reachable — but note that `/children-families` (the assigned P1 audience page) currently carries **152 unique words**, and the four focus/ADHD support articles have one inbound link each. The cluster's structure is right and its execution is unfinished.

**Realistically winnable inside 6 months:** the article-level long tail. `adhd homework battles`, `child says bad at school`, `can't finish what I start adhd`, `neurofeedback while on medication`. These are low-volume, low-competition, high-intent, and the articles are already written and genuinely good. They need internal links (§4), dates, and `Article` schema — and they are the fastest non-branded clicks available anywhere in this project.

### Sleep

**6 months: the article tail, yes. The head term, no.**

`neurofeedback for sleep` at 2,702 impressions / position 60.2 is the smallest of the three clusters and the worst-positioned. Sleep SERPs nationally are dominated by Sleep Foundation, Mayo, and Healthline — unreachable.

The three sleep articles target queries that are genuinely open: `slept 8 hours still tired`, `waking at 3am every night`, `sleep hygiene not working`. Little competent competition, real search volume, and the articles are 910–1,073 words of honest, specific writing. **This is the most under-exploited asset in the build.**

One structural caution: `/concerns/sleep` has 320 unique words and an H1 of "Sleep difficulties." Its own supporting articles are three times its length and considerably more specific. If the concern page does not deepen, Google may reasonably decide an article is the better answer for the cluster the concern page is supposed to own — which is rule 1 broken from the other direction.

**Also: the decision to keep "insomnia" out of every title and metaTitle is correct and should hold.** It names a disorder the site explicitly does not treat.

### Anxiety

**The largest cluster (7,017 impressions) and the hardest.** Position 50.1, zero clicks.

Nationally unwinnable — the same publisher wall. Locally, "anxiety" SERPs in Nashville are contested not just by neurofeedback providers but by every therapy practice, psychiatry group and treatment centre in the metro, most with licensed clinicians on staff. A wellness practice that correctly declines to make treatment claims is structurally disadvantaged here, and that disadvantage is not a marketing problem to be solved — it is the honest consequence of a correct positioning decision.

**Winnable at 6 months:** `told to just relax`, `body braced when nothing is wrong`, `can I do neurofeedback alongside therapy`. All three articles exist. All three target experience-language rather than diagnosis-language, which is both the honest framing and the low-competition one.
**Winnable at 12 months:** `lens neurofeedback for anxiety nashville` and similar modality+geo long tail.
**Not winnable:** `anxiety treatment nashville`, `neurofeedback for anxiety` unqualified.

### Concussion

**12 months, and this is the sleeper.**

3,331 impressions with 1 click, plus 487 impressions at position 12.8. `/concerns/concussion` is the best page in the build — 1,108 words, 620 unique, six H2 sections, the most complete FAQ set on the site.

Two structural advantages. First, the decision to target `post concussion symptoms` rather than `concussion therapy` is strategically correct and unusually well-reasoned: the post-clearance visitor is the only half of this cluster the practice can honestly serve, and it is also the half competitors mostly ignore because it converts less obviously. Second, the physician-referral relationship is real and is *most* credible in exactly this cluster.

The constraint is E-E-A-T. Post-concussion queries are as YMYL as this site gets, and the page currently has no named clinician, no citations, and no reviewer. It will not outrank Vanderbilt or a sports-medicine practice on a bare content play. With a named practitioner and two honest citations it could hold page one for the long tail inside 12 months.

**Not winnable, correctly excluded:** `concussion treatment`, `tbi treatment`, acute-injury intent. The page is built to hand those visitors to a doctor, and it should be.

### Summary

| Cluster | 6 months | 12 months | Not realistically winnable |
|---|---|---|---|
| **LENS modality** | `lens therapy`, `lens neurofeedback` (national) — **if the redirects land** | `what is lens neurofeedback`, comparison queries | — |
| **Local Murfreesboro** | Map pack top 3; `neurofeedback murfreesboro` | `neurofeedback rutherford county` and the town tail | — |
| **Local Nashville** | `lens neurofeedback nashville`; map pack top 5 | `neurofeedback nashville` top 3; `neurofeedback near me` | — |
| **ADHD** | Article long tail (`homework battles`, `bad at school`, `last ten percent`) | `neurofeedback for adhd nashville`; parent-intent local | `adhd help without medication` nationally; anything diagnostic |
| **Sleep** | All three article targets | `neurofeedback for sleep nashville` | `insomnia`, `sleep disorder`, national sleep head terms |
| **Anxiety** | Three article targets | `lens neurofeedback for anxiety nashville` | `anxiety treatment nashville`; `neurofeedback for anxiety` unqualified |
| **Concussion** | Nothing — E-E-A-T-gated | `post concussion symptoms` long tail, with a named clinician | `concussion treatment`, `tbi treatment` |
| **Cost / safety / comparison** | — | `neurofeedback cost nashville`, `is neurofeedback safe`, `lens vs traditional` — pages don't exist yet | — |
| **Brain mapping** | — | `brain mapping nashville` (819 impr, pos 8.2) — page doesn't exist yet | `qeeg` clinical queries |

**The honest bottom line.** The realistic 12-month ceiling for this site is: **owning the LENS modality nationally, owning both local map packs on modality-qualified queries, and holding a long tail of 20–40 informational article queries.** That is a good outcome and it is worth building for. What it is not is a path to ranking for "neurofeedback for anxiety" or "ADHD without medication" as national head terms — and the 13,000 combined impressions those two clusters currently generate at position 50–60 should be understood as demand this practice cannot serve, not as an opportunity being missed.

---

## 8. Prioritized actions

**S** ≤ half a day · **M** ≤ 2 days · **L** = multi-day or ongoing.

### 8.1 Blocked until the domain moves off WordPress

Nothing in this group can be validated, measured, or ranked while the rebuild is not the live site. Listing them explicitly so they are not mistaken for open work.

| # | Item | Note |
|---|---|---|
| B1 | **Every 301 in §2.6** | Host/edge layer. Cannot be tested until DNS moves. |
| B2 | Set `NEXT_PUBLIC_SITE_URL` in the production environment | Currently `localhost:3000` in `.env.local`. Every canonical, `og:url`, sitemap `<loc>` and JSON-LD `url` depends on it. **Verify the emitted tags on three routes immediately post-deploy.** |
| B3 | Host-level apex↔www and http→https 301s | `next.config.ts` is empty; no app-level redirects exist |
| B4 | Search Console + Bing Webmaster Tools, sitemap submission, indexation check on all 37 URLs in week one | |
| B5 | Any field CWV / CrUX data | Requires real traffic |
| B6 | Verification that the 33 new URLs index at all | |
| B7 | Re-pull the GSC baseline at 90 days; the metric is non-branded clicks | Baseline recorded in `QUERY-TO-PAGE-MAP.md` |

### 8.2 Code — ranked by impact per unit of effort

| # | Action | Impact | Effort | Why here |
|---|---|---|---|---|
| C1 | **Remove the `.rv` opacity gate from above-the-fold content** (or set the hidden state only under an `html.js` guard) | **Critical** | S | −1,460 to −1,620 ms LCP on every template. Largest single measured defect. |
| C2 | **Add `sameAs` with both GBP CIDs** to `Organization` and both `LocalBusiness` nodes | **Critical (local)** | S | Data already in `lib/locations.ts`. Strongest entity signal available; nothing blocked. |
| C3 | **Fix `openGraph` merge on `/resources/[slug]`** | High | S | Restores `og:url`/`og:image`/`og:site_name` and `summary_large_image` on all 10 articles |
| C4 | **Add "Read more" article links to the concern template** | High | S–M | Closes the cluster loop; +2–4 inbound depth-1 links per article; makes the cluster legible as a cluster (§4) |
| C5 | **Add `datePublished`/`dateModified` to `Resource` + `Article` schema + a visible date** | High | M | Ten articles currently invisible as articles; also enables real per-URL sitemap `lastmod` |
| C6 | **Drop the brand suffix from article `<title>`s** | High | S | Brings 9 of 10 back under 60 chars at zero keyword cost |
| C7 | **`noindex` `/guides/*.html` + `Disallow: /guides/` in `robots.ts`** | High | S | Protects the lead gate; prevents a chrome-less orphan competing with concern pages |
| C8 | **Build `/privacy-policy`** and link it in the footer | High | S (page) | Trust floor for a YMYL data-collecting site; also fixes a migration 404. Copy is Ben's. |
| C9 | **Add GA4 (or a privacy-friendly equivalent) + GSC verification** | High | S | Without it, nothing in this document is measurable post-launch |
| C10 | **`Person` schema on `/about/founder`** | Med-High | S | Fully licensed by what the page already says |
| C11 | **Move the physician-referral line to `/about` + both location pages + homepage proof band** | Med-High | S | Best credibility claim on the site, on one page |
| C12 | **Link `reviewReadUrl` from `/stories` and both location pages** | Med-High | S | 159 five-star reviews currently unlinked from the page about client stories |
| C13 | **Shorten 4 over-length descriptions** (`/concerns/concussion` 191, `/about/founder` 186, `/adults` 171, `/stories` 162) and 2 titles (`/` 83, `/concerns/concussion` 79) | Med | S | |
| C14 | **Cut the footer to ~8 links** | Med | S | Recovers the in-content link budget (§4). Design trade — flag to Ben. |
| C15 | **Cross-link articles within each cluster** | Med | S | Sibling links are how a cluster reads as one |
| C16 | **Fix tap targets** — `A.nav-tel` (23 px) and `INPUT.askbar-input` (22 px) to ≥ 24 px; ghost buttons 43 → 44 px | Med | S | The only Lighthouse/WCAG failures in the build; both sitewide |
| C17 | **`images: { formats: ["image/avif","image/webp"] }`** in `next.config.ts` | Med | S | 20–30% off every image |
| C18 | **Reduce preloaded font faces from 3 to 1–2** | Med | S | 114 kB competing with the LCP image on the critical path |
| C19 | **Real map embed on both location pages** | Med | S | `geo` and `hasMap` already exist; the page shows a gradient |
| C20 | **Deepen `/stories` (99 unique words), `/children-families` (152), `/adults` (188)** | Med | M | Three thin pages, one of which is a P1 cluster target |
| C21 | **`prefetch={false}` on chrome nav links** | Low-Med | S | 13 RSC prefetches / ~80 kB on the homepage |
| C22 | Reserve the ask-bar height; fix the `A.logo` shift | Low | S | CLS 0.034 → ~0.01 |
| C23 | Per-URL sitemap `lastmod` from per-entity dates | Low | S | Depends on C5 |
| C24 | Smaller favicon; `apple-touch-icon`; web manifest; branded 404 | Low | S | The 404 matters more than usual with ~108 legacy URLs about to arrive |
| C25 | Retitle `"Explore this location →"` to a descriptive anchor | Low | S | Only weak anchor text on the site |
| C26 | Raise `.tag` (10.5 px) and `.city` (11.5 px) to ≥ 12 px | Low | S | |
| C27 | Fix 3 `h1→h3` skips (`/about/team`, `/locations`, `/resources`) | Low | S | Card-grid templates |
| C28 | `/first-visit` and `/how-lens-works` each pass 1 outbound link — add 2–3 | Low | S | Near-terminal nodes absorbing authority |

### 8.3 Only Ben can supply

| # | Item | Unblocks |
|---|---|---|
| **P1** | **Practitioner roster: real names, roles, credentials (BCIA / Ochs LENS / in-house), bios** | 3 profile pages, `/about/team` (60 unique words today), Murfreesboro's suppressed team section, `Person` schema, and the single largest E-E-A-T gap against every ranking competitor |
| **P2** | **Founder bio + credentials + quote sign-off** (`FOUNDER_BIO`, `FOUNDER_QUOTE` both `verified: false`) | `/about/founder` — currently 122 unique words on the site's most important trust page |
| **P3** | **Approve the full redirect map (§2.6)**, including the four open decisions: `/peakperformance/`, `/migrainesandpain/`, `/concierge/`, `/refer-a-friend/` | Prevents ~108 URLs 404-ing on cutover, and recovers the 10,900-impression LENS cluster |
| **P4** | **Murfreesboro photography** — at minimum one real interior shot | Restores the space grid, adds `image` to its `LocalBusiness`, closes the visual gap against a 144-review sibling |
| **P5** | **Per-center phone numbers** (operations decision) | The last inconsistent NAP element; distinctness for two map-pack entities |
| **P6** | **GBP work: verify Nashville's Saturday hours are live**, review primary/secondary categories, refresh photos, start a structured review-request loop using the existing `reviewWriteUrl`s | The channel currently doing the acquisition. Highest commercial return of anything in this document. |
| **P7** | **Privacy policy copy** | C8 |
| **P8** | **Confirm whether article reviews actually happened** (the `Byline.reviewer` field exists and is gated) | Named reviewer credit on ten articles |
| **P9** | **Scope decisions: mood/depression** (3,472 impressions currently unpursued on purpose) **and migraines** (a live legacy cluster with no destination) | Two redirect rows and two content decisions |
| **P10** | **Approve citations / a research-and-evidence page** | The highest-ceiling E-E-A-T asset available to this practice |
| **P11** | **Authorise the Ahrefs connector** (claude.ai connector settings) | Turns §7's reasoning into measured keyword difficulty and backlink data before anyone commits budget to the 12-month targets |

### 8.4 The four pages `QUERY-TO-PAGE-MAP.md` still wants, re-prioritised

| Page | Map priority | My read |
|---|---|---|
| `/brain-map` | not listed | **Build first.** 819 impressions at position 8.2 already, the $150 entry offer, the stated differentiator, and no URL. Best ratio of demand to effort of any missing page. |
| `/pricing` | P2 | Second. `$150` and `$125` are published but buried on `/first-visit`, whose title targets no cost query. Transparent pricing is a differentiator in this category. |
| `/is-lens-safe` | P2 | Third — and worth merging with the research/evidence page from §5. Safety is the dominant pre-purchase objection and the FAQ answers already exist. |
| `/for-children` | P1 | **Downgrade.** `/children-families` already occupies this intent. Deepen it (152 unique words) rather than minting a competing URL — which is rule 6, the same reasoning already applied three times in `QUERY-TO-PAGE-MAP.md`. |
| `/compare` | P3 | Leave. `lens-vs-traditional-neurofeedback` as an article inside `/resources` is the cheaper form and fits the cluster that already exists. |

---

## Appendix A — Closed since `SEO-AUDIT.md`

For the record, so this document is not read as saying nothing improved.

| Previous finding | State |
|---|---|
| No canonicals, no `og:url` sitewide | **Closed** (except the article `openGraph` bug, §2.2) |
| Canonical domain unconfirmed | **Closed** — apex confirmed in code |
| Structured data nearly absent | **Closed** — 62 blocks, 5 types, `@id`-linked graph |
| No street addresses anywhere | **Closed** — both confirmed, on-page and in schema, with geo and `hasMap` |
| `/resources` publishes zero articles | **Closed** — ten published |
| `/concerns/trauma` near-orphaned | **Closed** — 4 contextual inbound |
| Concern titles omit "neurofeedback" | **Closed** — all 9 carry it |
| Homepage title lacks category + geography | **Closed** (now too long instead) |
| `/adults`, `/children-families`, `/how-lens-works` titles | **Closed** |
| OG image dimensions wrong | **Closed** — purpose-built 1200×630 |
| Sitemap has no `lastModified` | **Closed** (single constant; see §2.3) |
| Weak/duplicate alt text | **Closed** — descriptive throughout |
| Heading skips (`lens-seq`/`care-grid` H4s, `/contact` H2) | **Closed** — 3 minor card-grid skips remain |
| Founder surname gating `Person` | Surname confirmed; **`Person` schema still not emitted** (C10) |
| Murfreesboro empty team section / blank gradients | **Closed** — degrades honestly. Photography still missing. |

## Appendix B — Reproducing the measurements

Scripts written for this audit live in the session scratchpad. To re-run:

```bash
rm -rf .next && npm run build
npx next start -p 3123
# CWV per template (mobile + desktop, cache disabled)
node cwv.mjs / /concerns/sleep /locations/nashville /resources/homework-battles /lens-neurofeedback
# Isolate the .rv LCP gate (A/B on prefers-reduced-motion)
node rv.mjs
# CLS through a full page scroll
node scrollcls.mjs
# Interaction latency with real input events
node inp.mjs
# Metadata / schema / heading / alt extraction from the build
node meta.mjs
# Link graph, depth, PageRank
node depth.mjs && node links2.mjs
# Duplicate-content index
node dupe.mjs
# The repo's own sweep
CHECK_BASE=http://127.0.0.1:3123 npm run check:layout
```

They depend on `scripts/layout/cdp.mjs`, which is already in the repo. Worth promoting the CWV and link-graph probes into `scripts/` as `check:cwv` and `check:links` — both findings in §2.1 and §4 would have been caught automatically had they existed.

---

*Sources consulted for §5 and §7:*
[MaxWell Clinic — Neurofeedback Nashville](https://maxwellclinic.com/neurofeedback/) ·
[Nashville Brain Institute](https://nashvillebraininstitute.com/neurofeedback-therapy/) ·
[Nashville BrainCore Neurofeedback](https://nashvillebraincore.com/braincore-neurofeedback/) ·
[Nashville BrainCore — Overcoming ADHD Without Medication](https://nashvillebraincore.com/services/overcoming-adhd-without-medication/) ·
[Integrative Life Center](https://integrativelifecenter.com/therapy/neurofeedback/) ·
[Chambul Wellness Center](https://www.chambulwellness.com/services-and-therapies/neurofeedback) ·
[Nashville Family Wellness](https://nashvillefamilywellness.com/services/neurofeedback/) ·
[TN Neurofeedback](https://tnnfb.com/) ·
[Ochs Labs](https://main.ochslabs.com/about/) ·
[ISNR Journal of Neurotherapy — LENS clinical outcomes, 100 patients](https://www.isnr-jnt.org/article/view/16725) ·
[LENS for stress, anxiety and cognitive function (exploratory study, PMC)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3373531/) ·
[ADHD Advisor — Adderall alternatives](https://www.adhdadvisor.org/learn/adderall-alternatives) ·
[AlternativeToMeds — ADHD medication alternatives](https://www.alternativetomeds.com/blog/adhd-medication-alternatives/)
