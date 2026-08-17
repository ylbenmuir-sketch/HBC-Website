# SEO Audit — Harmonized Brain Centers

**Audited:** 2026-08-14 · production build (`rm -rf .next && npm run build`, Next.js 15.5.20)
**Scope:** source in `app/`, `components/`, `lib/` plus the 26 prerendered HTML files in `.next/server/app/`. This audit reflects what a real visitor and crawler receive in production — draft-gated content is treated as absent, and flagged where its absence has SEO consequences.

---

## Executive summary

The site is technically clean where it counts — every page prerenders as static HTML, has a unique title, description, and exactly one H1, 100% of images carry alt text, the sitemap and robots.txt are correct, and the draft-content gating system correctly keeps placeholder pages out of the build and the sitemap. The foundation is genuinely good.

The gaps are almost all in what's *missing*, not what's broken:

1. **No canonical URLs and no `og:url` on any page** — one config line fixes the whole site.
2. **The canonical domain is unconfirmed** (`SITE_URL` carries a `[CONFIRM domain]` note). Every absolute URL on the site — sitemap, schema, OG images — depends on it.
3. ~~**No page targets "neurofeedback nashville" or "neurofeedback murfreesboro."**~~ **Closed (Aug 2026).** Both location pages have been rewritten to hold their local cluster — title, H1, meta description and body copy — rather than ceding it to new `/neurofeedback-{city}/` URLs. See §3.3 and the decision note in QUERY-TO-PAGE-MAP.md. The homepage title still contains neither "neurofeedback" nor a place name; that one is open (§6.1 item 4).
4. **Structured data is nearly absent**: three thin `LocalBusiness` blocks (no street address, hours, geo, or images) and nothing else — no Organization, no FAQPage despite ~41 Q&A pairs, no BreadcrumbList, no Person.
5. **The /resources section publishes zero articles** (all six are draft-gated), and the site's biggest differentiator — the $150 Harmonized Brain Map — has no page of its own.
6. **Local SEO is blocked on unverified facts**: no street addresses anywhere on the site or in schema, one shared phone number for all locations, no Google Business Profile links, no map embeds.

Everything above is fixable, and most of it before launch. The prioritized plan is in section 6.

---

## 1. Technical

### 1.1 Per-page metadata (as rendered in production)

| Route | Title (rendered) | Notes |
|---|---|---|
| `/` | Help for anxiety, focus, and sleep without medication — Harmonized Brain Centers | 81 chars — truncates in SERPs (~60 char limit); no "neurofeedback," no geography |
| `/what-we-help-with` | What We Help With — Harmonized Brain Centers | Navigational; fine as hub |
| `/adults` | For Adults — Harmonized Brain Centers | No category noun — "For Adults" means nothing out of context |
| `/children-families` | Children & Families — Harmonized Brain Centers | Same issue; description 198 chars (truncates) |
| `/how-lens-works` | How LENS Works — Harmonized Brain Centers | Good target; could add "Neurofeedback" |
| `/first-visit` | Your First Visit — Harmonized Brain Centers | Holds the $150 pricing content but title doesn't target cost queries |
| `/about` | About — Harmonized Brain Centers | Description 199 chars (truncates) |
| `/about/founder` | Our Founder — Harmonized Brain Centers | Body is a one-paragraph fallback in production (story is draft-gated) |
| `/about/team` | Our Team — Harmonized Brain Centers | Only 2 members render (rest are placeholder-gated) |
| `/locations` | Locations — Harmonized Brain Centers | Fine as hub |
| `/locations/nashville` | LENS Neurofeedback in Nashville, TN — Harmonized Brain Centers | **Fixed.** Was "Nashville — Harmonized Brain Centers", the biggest single title miss on the site. The page has since been rewritten to hold the cluster (see §3.3) |
| `/locations/murfreesboro` | LENS Neurofeedback in Murfreesboro, TN — Harmonized Brain Centers | **Fixed**, same |
| `/locations/franklin` | Franklin — Coming Soon — Harmonized Brain Centers | OK for a waitlist page |
| `/concerns/anxiety` | Anxiety & Nervous-System Overload — Harmonized Brain Centers | All 8 concern titles omit "neurofeedback" — the qualifying word people actually search with |
| `/concerns/focus-adhd` | Focus, ADHD & follow-through — … | Same; also lowercase title casing inconsistency (only anxiety has a `metaTitle` override) |
| `/concerns/sleep` | Sleep difficulties — … | Same |
| `/concerns/emotional-regulation` | Emotional regulation — … | Same |
| `/concerns/brain-fog` | Brain fog, memory & mental fatigue — … | Same |
| `/concerns/stress-resilience` | Stress & resilience — … | Same |
| `/concerns/children-school` | Children, school & transitions — … | Same; competes with `/children-families` (see §4) |
| `/concerns/trauma` | Trauma-related stress — … | Same; page is linked from only one page sitewide (see §1.6) |
| `/faq` | FAQ — Harmonized Brain Centers | Could target "LENS neurofeedback FAQ" |
| `/stories` | Client Stories — Harmonized Brain Centers | Fine |
| `/resources` | Resources — Harmonized Brain Centers | Renders an empty "check back soon" state (see §5) |
| `/contact` | Talk With Our Team — Harmonized Brain Centers | Fine |
| `/_not-found` | 404: This page could not be found. | Correctly `noindex` |

Descriptions are otherwise well-written and unique per page. The `%s — Harmonized Brain Centers` template is consistent.

### 1.2 Canonicals and og:url — missing sitewide

No page emits `<link rel="canonical">` or `og:url`. `metadataBase` is set in [app/layout.tsx:27](app/layout.tsx#L27), but `alternates.canonical` is never declared, so Next.js emits nothing. Without canonicals, `www` vs apex, `http` vs `https`, and any URL with tracking parameters (`?utm_…`, `?gclid=…` from future ad campaigns) all index as separate URLs.

**Fix (one line):** add to the root `metadata` export in `app/layout.tsx`:

```ts
alternates: { canonical: "./" },
```

Relative canonicals in a root layout resolve per-route against `metadataBase` in Next 15, giving every page a self-referencing canonical. Verify one page's output after adding it; if the resolution misbehaves on dynamic routes, fall back to setting `alternates: { canonical: `/concerns/${slug}` }` etc. in each `generateMetadata`. Add `url` to the `openGraph` block the same way.

### 1.3 The unconfirmed domain — everything depends on it

`SITE_URL` falls back to `https://www.harmonizedbraincenters.com` with a `[CONFIRM domain]` comment ([lib/site-config.ts:46-47](lib/site-config.ts#L46-L47)). This value is baked into the sitemap, robots.txt sitemap pointer, all JSON-LD `url` fields, and absolute OG image URLs. Pre-launch checklist:

- Confirm the production domain and whether `www` or apex is canonical.
- Set `NEXT_PUBLIC_SITE_URL` in the production host's environment.
- Configure host-level 301 redirects (apex→www or vice versa, http→https). `next.config.ts` is empty — no redirects are defined in the app, so this must happen at the host/DNS layer (Vercel and Netlify handle this in domain settings).

### 1.4 Open Graph / Twitter

- Every page shares one OG image, `/images/hero.jpg`, declared as 1600×1067 in [app/layout.tsx:42](app/layout.tsx#L42) — **but the actual file is 1500×843**. The declared dimensions are wrong (and the wrong aspect ratio), which can cause bad crops in link previews.
- Recommended: create a dedicated 1200×630 OG image (logo + tagline over a session photo) and fix the declared dimensions. Later, per-location and per-article OG images.
- Twitter falls back to `summary_large_image` correctly. No `twitter:site` handle — add if/when a profile exists.
- The 404 page inherits the homepage OG block — harmless.

### 1.5 Sitemap and robots

Both are correct. Verified in the build output:

- 25 URLs, all resolving to built pages. Gated content (3 team profiles, 6 resource articles) is correctly excluded — nothing in the sitemap 404s.
- `robots.txt` allows all, disallows `/api/`, points at the sitemap with an absolute URL.
- Minor: no `lastModified` on sitemap entries. Google uses `lastmod` when it's accurate; `changeFrequency`/`priority` are ignored. Add a `lastModified` date (even a build-time constant per content revision) in [app/sitemap.ts](app/sitemap.ts).

### 1.6 Internal linking

Header + footer give every page the same ~23 internal links — good crawl coverage, near-zero orphan risk. But the link graph is almost perfectly uniform, which wastes the chance to concentrate equity and establish topical relationships:

- **`/concerns/trauma` is linked from exactly one page** (`/what-we-help-with`). It's absent from the header mega-menu, the footer, the homepage concern rail, and even `/adults`. Two clicks from home, one referring page.
- `/concerns/stress-resilience` is nearly as thin: homepage rail, `/adults`, and `/what-we-help-with` only.
- Concern pages don't link to each other (anxiety ↔ sleep ↔ trauma are naturally related), don't link to `/adults` / `/children-families`, and don't link to location pages. Location pages don't link to concern pages.
- The visible breadcrumbs (concerns, locations, team, resources) are plain text for the current page — fine — but carry no BreadcrumbList schema (see §2).

### 1.7 Headings

Exactly one H1 per page everywhere — good. Hierarchy skips exist but are minor:

- `/contact`: H1 → H4 (no H2/H3 at all).
- `/first-visit`, `/what-we-help-with`, all three location pages, `/about`: H2 → H4 with no H3 (the `lens-seq` and `care-grid` row components use `<h4>`).
- The GuideCta H2 "Get The Parent's Guide to Homework Battles." repeats on 10 pages (homepage, `/resources`, all 8 concern pages) — a small amount of cross-page heading duplication.

### 1.8 Images and alt text

- **100% alt coverage.** Zero `<img>` without alt across all 26 pages; decorative images (resource-card thumbnails) correctly use `alt=""`.
- Weak/duplicate alts worth improving: the three Nashville interior photos all say "Inside the Nashville center"; concern hero alts just repeat the concern title. Descriptive alts ("Reclining chair in a quiet LENS session room at the Nashville center") would serve image search better.
- The hero LCP image has `priority` — good.
- Murfreesboro and Franklin pages render **zero images** in production (all their photos are placeholder-gated). Murfreesboro's "The space" section now renders prose in place of the three blank gradients, and its team section is suppressed rather than rendering an empty grid (§3.3) — the page is honest about what it has, but photography is still the fix (§6.2 item 22).

### 1.9 404s, orphans, and other checks

- No internal link on any production page points to a non-built route. The gating system consistently filters links and pages together — verified for team profiles and resource articles.
- `/_not-found` correctly emits `noindex`. No custom 404 page exists (`app/not-found.tsx` absent) — the default renders with full header/footer, which is acceptable; a branded one with links to top pages would be better.
- `favicon.ico` exists; there is no `apple-touch-icon` or web manifest. Minor.
- **Reveal-on-scroll:** `.rv { opacity: 0 }` in base CSS ([app/globals.css:370](app/globals.css#L370)) means all content is invisible until client JS runs (except under reduced-motion). Content is present in the HTML so text crawlers and Google (which renders JS) are fine, but a no-JS visitor sees a blank page. Low SEO risk; consider a `<noscript>` override or an `html.js` guard for robustness.
- All routes are static/SSG — fast TTFB, fully crawlable HTML. First Load JS ~121–128 kB is reasonable.

---

## 2. Structured data

### 2.1 What exists today

Exactly one schema type, on three pages. Each location page emits ([app/locations/[slug]/page.tsx:82-101](app/locations/[slug]/page.tsx#L82-L101)):

```json
{
  "@type": "LocalBusiness",
  "name": "Harmonized Brain Centers — Nashville",
  "url": "…/locations/nashville",
  "telephone": "+16153318762",
  "address": { "addressLocality": "Nashville", "addressRegion": "TN", "addressCountry": "US" },
  "description": "…"
}
```

That's the entire structured-data footprint. Nothing on the other 23 pages.

### 2.2 What a two-location wellness practice should have

| Schema | Status | Where it should live |
|---|---|---|
| `Organization` | **Missing** | Root layout, sitewide — name, url, logo, telephone, founder, `sameAs` (GBP/social, once they exist). Ties the location entities together via `parentOrganization`. |
| `LocalBusiness` (full) | **Done** | Location pages carry `openingHoursSpecification`, `image`, `priceRange`, `areaServed`, `geo`, `parentOrganization` and `hasMap`, each gated on the data that backs it. See below. |
| `FAQPage` | **Missing** | `/faq` (14 Q&As) and each concern page (3 each = 24 more). ~41 Q&A pairs sitewide, all already rendered as crawlable `<details>` HTML — the markup is the only missing piece. |
| `BreadcrumbList` | **Missing** | Concern, location, team, and resource pages — visible breadcrumbs already exist. |
| `Person` | **Missing** | `/about/founder` (Sheri) — blocked on the verified surname, but a first-name Person with `jobTitle` and `worksFor` is valid today. Practitioner pages when they publish. |
| `WebSite` | Missing (optional) | Root layout. No site search exists, so value is modest. |
| `Article` | Missing (moot) | `/resources/[slug]` — add alongside the first published article (`headline`, `author`, `reviewedBy`, `datePublished`). The `openGraph: { type: "article" }` is already there. |
| `Service` | Optional | A future `/brain-map` page — `Service` or `Product` with the $150 offer. |

**Expectation-setting on FAQPage:** since late 2023 Google shows FAQ rich results almost exclusively for government and authoritative health sites, so don't expect visible SERP treatment. The markup still aids entity comprehension and other surfaces, and costs little since the content already exists. One implementation note: several FAQ answers are JSX with embedded links ([app/faq/page.tsx](app/faq/page.tsx)) — the schema generator needs plain-text mirrors of those answers, so store answers as strings with an optional rendered variant.

**Reviews:** when the Google rating unlocks, do *not* add `aggregateRating` to the site's own LocalBusiness markup — Google ignores self-serving review markup (2019 policy). Reviews matter on the Google Business Profile, not in on-site schema.

### 2.3 LocalBusiness enrichment that is possible *today*

Several fields are blocked on unverified facts, but these are not:

- `openingHoursSpecification` — **done, and the hours in this line were wrong.** The two centers do not keep one week: Nashville is Tue–Fri 9:00–18:00 plus Sat 8:00–15:00, Murfreesboro Tue–Thu 9:00–18:00. Both are confirmed and encoded per center from `hours` in `lib/locations.ts`; Franklin records none until it opens.
- `priceRange` — the $150 Brain Map is a settled, rendered price.
- `image` — Nashville has real interior photos in the repo.
- `areaServed` — **done, and the lists in this line were guessed.** Ben's client data replaced them: 16 `City` nodes on Nashville and 10 on Murfreesboro, from the `string[]` the page itself prints (§3.4). The `[Confirm list]` tag that used to gate them is retired.
- `parentOrganization` → the new Organization node.

### 2.4 Gated items with schema consequences (flagged per brief)

- **Street address + ZIP omitted** from `PostalAddress` until verified ([app/locations/[slug]/page.tsx:88-95](app/locations/[slug]/page.tsx#L88-L95)). The gate is behaving correctly, but a LocalBusiness without a street address is too thin to connect confidently to a Google Business Profile or map-pack entity. **Verifying the two addresses is the single highest-leverage unverified fact on the list.** Geo coordinates and map embeds are downstream of it.
- **Franklin ships LocalBusiness markup for a business that isn't open.** Google's guidance is not to represent unopened businesses as operating (GBPs can only be created ~90 days pre-opening). Recommend dropping the JSON-LD from the coming-soon page, or at minimum not creating any Franklin GBP/citations until an opening date is set.
- Founder surname gates a complete `Person`; placeholder practitioners gate practitioner `Person` nodes; unpublished articles gate `Article` markup. All correct behavior — listed so they're wired in when the facts verify.

### 2.5 MedicalBusiness vs LocalBusiness

**Recommendation: stay with `LocalBusiness`.** The tradeoff:

- `MedicalBusiness`/`MedicalClinic` would be topically precise for "neurofeedback," but it declares the entity a medical provider — directly contradicting the site's own footer disclaimer ("a wellness practice, not a medical clinic… not intended to diagnose, treat, cure, or prevent"). Inconsistency between schema and page copy is worse than a generic type, and a medical declaration invites the strictest YMYL scrutiny while the site (correctly) declines to make medical claims and has no licensed-provider E-E-A-T signals to back it.
- The schema.org tree has no good "wellness center" type (`HealthAndBeautyBusiness` subtypes are salons/spas/gyms).
- Best of both: keep `@type: "LocalBusiness"` and add `"additionalType": "https://schema.org/HealthAndBeautyBusiness"` plus a precise `description` and `knowsAbout: ["LENS neurofeedback"]`. Let the GBP category (e.g., "Wellness center," secondary "Alternative medicine practitioner") carry the classification burden — GBP categories matter far more for map rankings than the schema type does.

---

## 3. Local SEO

### 3.1 NAP (Name, Address, Phone)

- **Name:** consistent — "Harmonized Brain Centers" everywhere, "Harmonized Brain Centers — {City}" in schema. Good.
- **Address:** absent sitewide (gated). Production shows only "Nashville, TN" / "Murfreesboro, TN". Until street addresses render on-page *and* in schema, the site cannot reinforce a GBP listing, earn map-pack presence, or be cited consistently in directories. This is the #1 local blocker.
- **Phone:** one verified number, (615) 331-8762, shared by all locations ([lib/locations.ts](lib/locations.ts) assigns `PHONE_DISPLAY` to every location). Shared numbers weaken Google's confidence that each location is distinct. Recommend a direct line per center (used consistently on GBP + site + citations). If call tracking is ever added, the GBP-consistent number must remain the one in schema.

### 3.2 Google Business Profile ecosystem — nothing yet

No GBP links, no `sameAs`, no map embeds (the map is a styled gradient placeholder), no directions content in production ("We'll send simple directions and arrival details when you book"), no review links. For "near me" and map-pack queries — which is where most "neurofeedback nashville" clicks actually go — the GBP *is* the ranking surface, and the site's job is to corroborate it. At launch: create/claim GBPs for Nashville and Murfreesboro (not Franklin), link them via `sameAs`, embed the map on each location page, and add each center's GBP review link to the stories page CTA.

### 3.3 Location page depth — rewritten (Aug 2026)

**These two pages now own the local clusters.** QUERY-TO-PAGE-MAP.md's original plan was new `/neurofeedback-nashville/` and `/neurofeedback-murfreesboro/` URLs; the decision recorded there is that those are not being built, because the location pages already carry the address, hours, `geo`, `hasMap`, `areaServed` and `LocalBusiness` markup a new URL would start without — and what they actually lacked was body copy, which is cheaper to fix than authority is to rebuild.

What this audit found, and what changed:

| Finding | Resolution |
|---|---|
| H1s carried no service and no city ("A quiet place to get your bearings back") | Rewritten: "LENS neurofeedback in *Nashville* — Tuesday through Saturday." / "LENS neurofeedback for *Rutherford County* — in downtown Murfreesboro." |
| "LENS" and "neurofeedback" appeared **zero times in body copy** on both pages | New section between hero and space: what LENS is in two sentences, who comes to *this* center, what a first visit involves — handing off to `/lens-neurofeedback` and `/how-lens-works` rather than restating them |
| Communities were a guessed one-line sentence behind a `[Confirm list]` tag | Ben's verified client data — 16 towns Nashville, 10 Murfreesboro — as a `string[]` feeding both the page and schema `areaServed`. The tag is retired, which also put the assistant's `location:<slug>:area` passages back in its index |
| "Getting here" was a production non-answer ("We'll send simple directions… when you book") | Real copy on both, gated on `isDraftText` rather than on draft mode — the old ternary would have kept shipping the non-answer after the facts were confirmed |
| Murfreesboro rendered an **empty team section** under a heading promising a team | Section suppressed entirely when no member renders; returns on the first confirmed name |
| Murfreesboro rendered three empty sage gradients under "The space" | Prose renders instead of the grid when a center has no real photographs; the plates and their specs stay visible in draft builds, and the grid returns with the first real photo |
| Nashville's Saturday hours — a differentiator most practices in the category don't have — were the third line of an hours block | Own hero fact (derived from the `hours` data, not restated) and own row under "Planning your visit" |
| First-visit step 4 claimed "No packages, no pressure" while the site publishes a 12-session package | Rewritten to the part that was true; pricing stays with `/first-visit` per QUERY-TO-PAGE-MAP.md rule 1 |

**Still open:** Murfreesboro needs at least one real photograph and one named practitioner. Both are fact/asset gates, not code — the page degrades honestly without them now instead of rendering empty furniture.

**The two pages must not converge.** They differ on seven axes: H1 construction, schedule emphasis (Nashville's Saturday vs. Murfreesboro's three clinic days), catchment (Davidson plus Williamson/Sumner/Wilson vs. Rutherford plus Bedford/Cannon/Coffee), access copy (interstate junction vs. downtown surface streets), photo-led vs. text-led space section, "Good to know" band, and cross-link direction. Any edit that turns one page's section into the other's with the town swapped removes the reason a shared template was safe here.

County usage is good: "Davidson County," "Rutherford County," "Williamson County" appear in hero subs, descriptions, and card copy. "Middle Tennessee" is used consistently as the umbrella region.

### 3.4 Community coverage (Franklin, Brentwood, Smyrna, La Vergne)

Current coverage is one sentence per location page:

**Resolved as of the Aug 2026 rewrite.** The guessed list this section audited ("Belle Meade, Green Hills, Bellevue") is gone, replaced by Ben's verified client data:

| Center | Communities in production and in `areaServed` |
|---|---|
| Nashville | Nashville, Franklin, Brentwood, Spring Hill, Mount Juliet, Hendersonville, Nolensville, Lebanon, College Grove, Thompson's Station, Antioch, Gallatin, Madison, Old Hickory, Fairview, Hermitage |
| Murfreesboro | Murfreesboro, Smyrna, Christiana, La Vergne, Eagleville, Rockvale, Woodbury, Manchester, Bell Buckle, Shelbyville |
| Franklin | Franklin, Brentwood, Spring Hill, Thompson's Station (pre-opening; no `LocalBusiness`) |

Each list is a `string[]` in `lib/locations.ts` read by the page, by `communitiesServed()` → schema `areaServed`, and by the site assistant's index — one source, so the three cannot disagree about who is on it. Retiring the `[Confirm list]` tag is what let the assistant start answering "do you serve Smyrna?" and "do you serve Franklin?"; both were retrieval gaps before, on a question the page itself was already answering.

**Still don't build doorway pages.** "Neurofeedback in Smyrna, TN" with no physical presence there rarely sustains rankings and risks doorway classification.

**Correction to this section's original advice:** it recommended drive-time copy ("15 minutes from Smyrna via I-24"). Don't. Drive times are unverifiable claims that vary by traffic and origin, and the practice has no basis for them. The directions copy that shipped names the road and the interchange and stops there — "just off I-24 at Thompson Lane, with I-440 ending immediately north of us" — with no exit numbers and no times.

---

## 4. Keyword architecture

### 4.1 Route → apparent target query

| Route | Query it currently targets | Query it *should* target | Gap |
|---|---|---|---|
| `/` | "help for anxiety focus sleep without medication" (not a real query pattern) | **neurofeedback nashville / LENS neurofeedback middle tennessee** | Title has no category or place term. The eyebrow ("LENS Neurofeedback · Nashville & Murfreesboro") has the right idea — the title doesn't. |
| `/locations/nashville` | **neurofeedback nashville** | — | **Closed.** Title, H1, meta description and body copy all carry it; the page owns the cluster (§3.3) |
| `/locations/murfreesboro` | **neurofeedback murfreesboro tn** | — | **Closed**, same |
| `/locations/franklin` | — | neurofeedback franklin tn (pre-launch waitlist) | OK as-is |
| `/concerns/anxiety` | "anxiety nervous system overload" | **neurofeedback for anxiety** | All 8 concern pages: add "neurofeedback" to titles via the existing `metaTitle` field |
| `/concerns/focus-adhd` | — | **neurofeedback for ADHD** (support framing) | Same |
| `/concerns/sleep` | "sleep difficulties" | neurofeedback for sleep / insomnia support | Same |
| `/concerns/brain-fog` | — | neurofeedback for brain fog | Same |
| `/concerns/emotional-regulation` | — | neurofeedback emotional regulation child | Same |
| `/concerns/stress-resilience` | — | neurofeedback for burnout / stress | Same |
| `/concerns/children-school` | — | neurofeedback for school struggles | Overlaps `/children-families` — see below |
| `/concerns/trauma` | — | neurofeedback for trauma-related stress | Nearly orphaned (§1.6) |
| `/adults` | "for adults" | neurofeedback for adults | Title needs the noun |
| `/children-families` | "children & families" | **neurofeedback for children / kids nashville** | Title needs the noun |
| `/how-lens-works` | "how LENS works" | how does LENS neurofeedback work / what is LENS | Close — add "Neurofeedback" |
| `/first-visit` | "first visit" | what to expect at a neurofeedback session; **neurofeedback cost** (partially) | Cost content is here but untargeted |
| `/faq` | "FAQ" | LENS neurofeedback FAQ / is neurofeedback safe | Close |
| `/stories` | — | neurofeedback reviews nashville (weakly) | Fine |
| `/what-we-help-with` | hub | what does neurofeedback help with | Fine |
| `/about`, `/about/founder`, `/about/team`, `/contact`, `/locations`, `/resources` | navigational | — | Fine |

### 4.2 Pages competing with each other

- **`/children-families` vs `/concerns/children-school` vs `/concerns/focus-adhd`** — three pages chase "child struggling at school." Differentiate deliberately: `/children-families` = audience page ("neurofeedback for children"), `/concerns/children-school` = school/transitions symptom page, `/concerns/focus-adhd` = ADHD/focus. The title rewrites in §6 encode this split.
- **Homepage vs the anxiety/focus/sleep concern pages** — the homepage title currently stacks all three concern keywords, competing with its own spoke pages. Giving the homepage the geo+category query (which no page holds) resolves this cleanly.
- `/adults` vs concern pages is a normal hub-and-spoke relationship; fine once titles differ.

### 4.3 High-intent queries with **no page**

| Query | Closest current asset | What's needed |
|---|---|---|
| ~~"neurofeedback nashville"~~ | `/locations/nashville` | **Closed** — title, H1 and body copy all carry it (§3.3). Homepage retarget still open |
| ~~"neurofeedback murfreesboro"~~ | `/locations/murfreesboro` | **Closed** (§3.3) |
| "neurofeedback smyrna / la vergne / brentwood / hendersonville" | The two location pages' communities lists + `areaServed` | Nothing further on-site. These are map-pack and long-tail queries the location pages now name explicitly; don't build per-town pages |
| "LENS neurofeedback near me" | — | GBPs + enriched LocalBusiness + location titles; "near me" is won in the map pack |
| "neurofeedback cost" / "how much does neurofeedback cost" | One FAQ answer + a paragraph on `/first-visit` | A dedicated cost/pricing page (or a `/resources` article) — competitors rank with transparent-pricing pages, and the site's $150 Brain Map is a strong answer it currently buries |
| "brain mapping nashville" / "brain map test" | Homepage section only | **A `/brain-map` page.** The Harmonized Brain Map is the stated differentiator and the $150 entry offer, and it has no URL |
| "non-medication help for child ADHD" | `/concerns/focus-adhd` obliquely | Article (the homework-battles draft is adjacent); "without medication" is already the H1 framing — use it in article titles |
| "LENS vs traditional neurofeedback" | Draft article exists, unpublished | Publish it — high commercial intent, low local competition |
| "is neurofeedback safe / side effects" | FAQ answers | Article or FAQ-anchor landing; safety objections are the #1 pre-purchase research query in this category |
| "neurofeedback for autism" | Nothing | Decide deliberately whether to cover (compliance-sensitive); competitors do |

---

## 5. Content gaps

### 5.1 What the empty /resources section costs

Production renders `/resources` with zero articles and a "check back soon" paragraph. All six drafted articles are gated (even `homework-battles` — its body still contains `[Body copy…]` placeholders). Meanwhile the GuideCta on 10 pages collects emails promising a parent's guide that doesn't exist yet (acknowledged in a code TODO).

The cost: zero coverage of informational queries (where a novel service category like LENS gets most of its search volume — people research before they buy), no internal-link targets to build topical authority around "neurofeedback," thin E-E-A-T (no authored, reviewed, dated content), and a homepage/nav promise ("Resources & learning center") the site doesn't keep. Competitors ranking for Nashville neurofeedback terms carry practitioner bios with credentials, review widgets, FAQ/condition libraries, and blogs; this site's equivalents are all gated or empty at the moment.

### 5.2 Article priority (finish drafts first — the slugs already exist)

1. **`homework-battles`** — closest to publishable, powers the lead magnet already being promised, targets the parent/ADHD cluster. Finish body + create the actual PDF.
2. **`lens-vs-traditional-neurofeedback`** — highest commercial intent of the six; people comparing modalities are late-funnel.
3. **`what-the-equipment-does`** — answers the safety objection; supports "is LENS safe."
4. **`exhausted-after-eight-hours`** — sleep cluster support.
5. **`brain-fog-after-55`** — a differentiated audience (55+) competitors ignore.
6. **`bad-at-school`** — parent cluster depth.

New articles worth adding to the calendar (each maps to a §4.3 gap): "How much does neurofeedback cost in Nashville?" · "Is neurofeedback legit? What the research does and doesn't show" (hedged, cited — E-E-A-T anchor) · "Neurofeedback and medication: how they coexist" · "What a brain map shows (sample walkthrough)".

### 5.3 Trust assets competitors have that are gated here

Real reviews with counts (gated), named practitioners with credentials (gated), founder story (gated), street addresses and maps (gated), photos of the Murfreesboro space (missing). None of this requires new SEO work — it requires fact verification, which is exactly what `CONTENT-CHECKLIST.md` already tracks. The SEO consequence of that checklist is larger than any code change in this report.

---

## 6. Prioritized plan

Effort: **S** ≤ half a day · **M** ≤ 2 days · **L** = ongoing/multi-day. Every "fix now" item is code-only and needs no unverified facts.

### 6.1 Fix now (pre-launch)

| # | Task | Impact | Effort |
|---|---|---|---|
| 1 | **Confirm canonical domain**; set `NEXT_PUBLIC_SITE_URL` in prod env; configure host-level 301s (apex↔www, http→https). Removes the `[CONFIRM domain]` risk under every absolute URL. | Critical | S |
| 2 | **Add canonicals + og:url**: `alternates: { canonical: "./" }` and `openGraph.url` in `app/layout.tsx` metadata; verify emitted tags on `/`, one concern page, one location page. | High | S |
| 3 | ~~**Rewrite location page titles**~~ **Done, and superseded by a full rewrite of both pages.** Titles carry "LENS Neurofeedback in {City}, TN"; Franklin unchanged. The titles alone were never going to hold the cluster — the pages behind them said nothing about LENS — so §3.3 records the copy, data and template changes that followed, and QUERY-TO-PAGE-MAP.md records the decision to strengthen these pages instead of building `/neurofeedback-{city}/`. | High | S → M |
| 4 | **Rewrite homepage title** ([app/page.tsx:48-52](app/page.tsx#L48-L52)) to carry category + geography, e.g. `Neurofeedback in Nashville & Murfreesboro — Help for Anxiety, Focus & Sleep` (brand arrives via og:site_name; or keep brand and accept truncation). Keep the H1 as-is — it's a conversion asset. | High | S |
| 5 | **Populate `metaTitle` for all 8 concerns** in [lib/concerns.ts](lib/concerns.ts) with the "Neurofeedback for X" pattern: Anxiety & Stress / ADHD & Focus / Sleep / Emotional Regulation / Brain Fog & Memory / Stress & Burnout / School Struggles / Trauma-Related Stress. Keep the "support" framing in descriptions to stay consistent with the wellness disclaimer. | High | S |
| 6 | **Retitle `/adults` → "Neurofeedback for Adults"** and **`/children-families` → "Neurofeedback for Children & Teens"**; `/how-lens-works` → "How LENS Neurofeedback Works". | High | S |
| 7 | **Add Organization JSON-LD** to `app/layout.tsx`: name, url, logo, telephone, `foundingDate: 2016` (verified), founder (Person, first name), description. Add `sameAs` later when profiles exist. | High | S |
| 8 | ~~**Enrich LocalBusiness JSON-LD** (location template)~~ **Done.** `lib/schema.ts` emits `openingHoursSpecification`, `priceRange`, `image`, `areaServed`, `geo`, `hasMap` and `parentOrganization`, and Franklin ships no LocalBusiness at all while it is `comingSoon`. The hours come from each center's `hours: Verifiable<WeeklyHours>` in `lib/locations.ts`, **not** from `hoursLines` — that array no longer exists; the week is structured data now, rendered for people through `formattedHours()`. `areaServed` derives from `planning.communities` through `communitiesServed()`, which returns nothing while the list is a `[placeholder]`, so Nashville and Murfreesboro stay silent until their lists are confirmed. | High | S–M |
| 9 | **Add FAQPage JSON-LD** on `/faq` and concern pages. Refactor: store FAQ answers as plain strings (with optional rendered JSX variant) so the same data feeds `<details>` and schema. | Med | M |
| 10 | **Add BreadcrumbList JSON-LD** wherever the visual crumb renders (concerns, locations, team, resources). One small shared component. | Med | S |
| 11 | **Dedicated 1200×630 OG image**; fix the wrong declared dimensions (currently 1600×1067 vs actual 1500×843) in `app/layout.tsx`. | Med | S |
| 12 | **Internal links for the two weak concerns**: add trauma + stress-resilience to the footer "Help with" group (or swap in an 8-item list); add a "Related concerns" link block to the concern template. ~~link each location page's communities paragraph to 2–3 concern pages~~ **done** — the anxiety/focus/sleep links moved out of the communities row (where they sat under a heading about geography) into the new body section, and each location page now also links to `/lens-neurofeedback` and `/how-lens-works`. | Med | S |
| 13 | **Trim over-length descriptions**: `/about` (199 chars), `/children-families` (198) to ≤160. | Low | S |
| 14 | Add `lastModified` to sitemap entries. | Low | S |
| 15 | Fix heading skips: `lens-seq`/`care-grid` H4s → H3s; give `/contact` an H2. | Low | S |

### 6.2 Fix at launch (needs verified facts or new content — sequence with the content checklist)

| # | Task | Depends on | Impact |
|---|---|---|---|
| 16 | **Verify both street addresses** → street/ZIP render on-page + in schema automatically (gates already wired). Then add `geo` coordinates and a real map embed per location page. | Address verification | Critical for local |
| 17 | **Create Google Business Profiles** (Nashville, Murfreesboro — not Franklin), categories "Wellness center" + secondary; link via `sameAs` in Organization/LocalBusiness; add GBP review links to `/stories` and post-visit follow-ups. | #16 (GBP wants the address) | Critical for local |
| 18 | **Finish and publish `homework-battles`** + produce the actual PDF guide the GuideCta promises; add Article JSON-LD to the resource template while doing it. | Copy sign-off | High |
| 19 | **Publish `lens-vs-traditional-neurofeedback`.** | Copy | High |
| 20 | **Create `/brain-map` page**: what the 21-point map is, sample image (already shipped on homepage), $150 offer, FAQs, CTA. Target "brain mapping nashville" + "what is a brain map." Link from homepage brain-map section, `/first-visit` cost card, and both location pages. | Design/copy | High |
| 21 | **Cost transparency page or article** ("How much does neurofeedback cost?") anchored on the free call → $150 map → per-session pricing structure; publish once per-session pricing verifies. | Pricing verification | High |
| 22 | **Murfreesboro parity**: at least one real interior photo and one named practitioner. The page no longer *renders* an empty team section or three blank gradients — both degrade to prose or vanish (§3.3) — so this is now about depth rather than about a visible defect. Adding either asset restores the section automatically; no code change. | Photography, roster | Med |
| 23 | **Founder page + Person schema** with surname, credentials, real story. Practitioner profiles → Person schema as they verify. | Roster verification | Med |
| 24 | **Set up Google Search Console + Bing Webmaster Tools**, submit sitemap, verify indexation of all 25 URLs in week one. | Domain live | High (hygiene) |
| 25 | Per-location phone numbers if operationally feasible; otherwise ensure the shared number is identical across site, schema, and both GBPs. | Ops decision | Med |

### 6.3 Build over time

| # | Task | Cadence / trigger |
|---|---|---|
| 26 | Publish remaining drafts (`what-the-equipment-does`, `exhausted-after-eight-hours`, `brain-fog-after-55`, `bad-at-school`), then the §5.2 new-article list. One well-made article/month beats four thin ones — each targets one named query and links to one concern + one location page. | Monthly |
| 27 | ~~Expand "Communities served" with drive-time copy~~ **Done, without the drive times** — both lists are Ben's verified client data and feed page + `areaServed` + assistant index from one array (§3.4). Drive times were the wrong ask: unverifiable, traffic-dependent, and the practice has no basis for them. Ongoing work is keeping the lists current as the client base moves, not adding copy around them. Still avoid per-town doorway pages. | Quarterly |
| 28 | Local citations (Apple Maps, Yelp, health/wellness directories, chamber listings) with exact NAP; track consistency. | Post-GBP |
| 29 | Review generation loop on GBP; refresh `/stories` with new verified quotes (keep `aggregateRating` off-site per §2.2). | Ongoing |
| 30 | Video testimonials (already planned in the review band) — host on a YouTube channel, embed on `/stories`, `VideoObject` schema. | When filmed |
| 31 | A cited research/evidence page ("What the research says about LENS") — the strongest E-E-A-T asset available to a wellness practice that can't make medical claims. Hedged, sourced, reviewed byline. | One-time, then annual refresh |
| 32 | Franklin launch package when the date verifies: reinstate LocalBusiness (full), GBP inside 90 days of opening, opening announcement article, update the three "coming soon" mentions sitewide. | Opening date |
| 33 | Per-page OG images (locations, articles); apple-touch-icon + manifest; branded 404. | Opportunistic |

---

## Appendix: verified-fact gates with SEO consequences (cross-reference for CONTENT-CHECKLIST.md)

| Gated fact | SEO consequence while unverified |
|---|---|
| Street addresses + ZIPs | No on-page NAP, no schema address, no geo/map, GBP can't be corroborated — the largest local-SEO blocker |
| Google rating & count | No social proof on `/stories`/homepage (keep ratings off on-site schema regardless) |
| Practitioner roster | 3 team pages 404 (correctly), Murfreesboro's team section is suppressed entirely (§3.3), no Person schema, thin E-E-A-T |
| Founder surname + story | `/about/founder` is one paragraph; Person schema incomplete |
| Resource article bodies | `/resources` is an empty shell; zero informational-query coverage; GuideCta promises an unwritten guide |
| Response time / start timing | CTA-band copy only — negligible SEO impact |
| Franklin opening date | Keep Franklin schema + GBP off until set (see §2.4) |
| Canonical domain (`SITE_URL`) | Every absolute URL in sitemap/schema/OG is provisional until confirmed |

*The gating system itself is an asset: nothing in the build ships placeholder text, fake numbers, or unapproved endorsements, and the sitemap never references a gated page. This audit found zero cases where the gate leaked or stranded a link — the SEO work is to enrich what renders, not to fight the gate.*
