# Query-to-Page Map — harmonizedbraincenterstn.com

Built from: GSC 16-month export (Aug 2026) + GBP Performance, both locations (Mar–Aug 2026).
Purpose: define which page owns which query cluster before the Next.js rebuild locks routes.

---

## Rules

1. **One cluster, one page.** If two pages target the same cluster, neither wins.
2. **Every page has one primary target and a named supporting set.** If a page has no primary target, it doesn't need to exist.
3. **Head terms are unclaimed.** Current site targets long-tail modality language; the actual demand is on generic category words.
4. **Prices and stats interpolate from `lib/site-config.ts`.** No figures written into copy.
5. **"Support," not "treatment."** No diagnostic or outcome claims.
6. **Strengthen the page that exists before minting a URL that doesn't.** A cluster whose intent an existing page already serves is assigned to that page and the page is rewritten to earn it. See the note below.

---

## Decision: the local clusters live on `/locations/[slug]/`

This map originally routed the two local clusters to new `/neurofeedback-nashville/` and `/neurofeedback-murfreesboro/` pages. **Those pages are not being built.** The clusters are assigned to `/locations/nashville/` and `/locations/murfreesboro/`, which have been rewritten to hold them.

The reasoning, recorded so it isn't relitigated:

- **The location pages already carry every local signal a new URL would have to earn from zero** — a confirmed street address and ZIP, per-center opening hours, `geo`, `hasMap`, `areaServed`, `LocalBusiness` JSON-LD, breadcrumbs, and inbound links from the header, footer, `/locations`, and `/lens-neurofeedback`. A `/neurofeedback-nashville/` page starts with none of it and would need the same address and hours copied onto it — two sources for one fact, which is the drift this codebase is built to prevent.
- **Two pages per city is rule 1 violated on purpose.** `/neurofeedback-nashville/` and `/locations/nashville/` answer the same question for the same visitor. Whichever Google picked, the other would dilute it.
- **What the location pages actually lacked was content, not a URL.** Before the rewrite the H1 was "A quiet place to get your bearings back," and the words "LENS" and "neurofeedback" appeared zero times in body copy. That is a copy problem, and copy is cheaper to fix than authority is to rebuild.

**What the rewrite changed** (both pages, Aug 2026): H1s carrying the service and the city; a body section defining LENS and naming who comes to each center, linking out to `/lens-neurofeedback` and `/how-lens-works` rather than restating them; Ben's verified client-community lists (16 towns Nashville, 10 Murfreesboro) replacing guessed ones; real directions copy; Nashville's Saturday hours given their own hero fact and planning row.

**What still needs to be true:** the two pages must not converge. They differ today on H1 axis, schedule (Nashville's Saturday vs. Murfreesboro's three clinic days), catchment (Davidson plus Williamson/Sumner/Wilson vs. Rutherford plus Bedford/Cannon/Coffee), access copy, photo-led vs. text-led space section, and cross-link direction. Any future edit that makes one page's section a copy of the other's with the town swapped undoes the reason this decision was safe.

---

## Decision: the concussion cluster lives on `/concerns/concussion/`

This map originally routed the concussion/TBI cluster to a new `/concussion-recovery/` page. **That page is not being built.** The cluster is assigned to `/concerns/concussion/`, built as the ninth concern page.

Rule 6, applied the same way the location clusters were:

- **It is a concern, and the site already has a concern pattern that ranks.** `/concerns/[slug]` carries breadcrumbs, FAQ-eligible structure, the guide CTA, the free-call CTA, cross-links from the header, footer, `/what-we-help-with`, the homepage and `/adults`, and eight sibling pages of internal link equity. `/concussion-recovery/` starts with none of it.
- **`/concussion-recovery/` names an outcome we are not allowed to claim.** The URL itself would assert that LENS is part of a recovery from a brain injury. That is the one thing this page's copy may never say, and a slug is not a place to put a caveat. `/concerns/concussion` names the topic and claims nothing.
- **Two pages here would be rule 1 violated twice over.** `/concussion-recovery/` and `/concerns/concussion/` answer the same query for the same visitor.

**Primary target moved** from `concussion therapy` to `post concussion symptoms`. "Therapy" is treatment intent for an injury, which is traffic this practice cannot serve and should not rank for — the same reasoning as `adhd testing` under **Do not target**. The recoverable demand in this cluster is the *post*-clearance query: someone who has been checked, been cleared, and is still not right. That is what the page is about, and it is the only half of the cluster the copy can honestly answer.

**What is deliberately not on the page:** no sport, league, team or athlete is named — "professional athletes" is the ceiling on that claim and the page is already at it. No recovery, healing or speed-of-recovery claim appears anywhere, in copy or in metadata. And the page opens with a block telling a recently injured visitor to see a doctor instead of us, above its own CTAs; the site assistant carries the same rule as a check that fires before retrieval (`head-injury` in `lib/chat/safety.ts`). Ranking for acute-injury queries is not the goal, and the page is built to hand those visitors on rather than convert them.

---

## The map

| Cluster | Page | Primary target | Supporting terms | Demand signal | Status |
|---|---|---|---|---|---|
| LENS modality | `/lens-neurofeedback/` | `lens therapy` | lens therapy near me, lens neurofeedback, low energy neurofeedback system, what is lens therapy | **10,900+ web impr, pos 13.9–17.1** · 999 GBP searches | **Missing — P0** |
| Category generic | `/` (homepage) | `neurofeedback therapy` | neurofeedback, neurotherapy, biofeedback therapy, biofeedback | 551 + 351 + 139 + 101 GBP searches | Exists, untargeted |
| Nashville local | `/locations/nashville/` | `neurofeedback nashville` | lens therapy nashville, biofeedback nashville, brain mapping nashville, neurofeedback near me | 2,930 impr pos 10.2 · 193 GBP | **Rewritten** — see decision above |
| Murfreesboro local | `/locations/murfreesboro/` | `neurofeedback murfreesboro` | lens therapy murfreesboro, neurofeedback rutherford county, smyrna / christiana / la vergne | 325 impr **pos 3.5, 0 clicks** | **Rewritten** — see decision above |
| Brain mapping | `/brain-map/` | `brain mapping therapy` | brain map, qeeg nashville, brain mapping near me | 819 impr pos 8.2 · 22 GBP | Section only, no page |
| ADHD / focus | `/concerns/focus-adhd/` | `adhd help without medication` | neurofeedback for adhd, adhd focus support nashville, non-medication adhd support | 6,277 impr, **0 clicks**, pos 58.8 | `/add-adhd/` — rewrite |
| Anxiety | `/concerns/anxiety/` | `neurofeedback for anxiety` | anxiety help nashville, drug-free anxiety support, calm nervous system | 7,017 impr, **0 clicks**, pos 50.1 | `/stressanxiety/` — rewrite |
| Sleep | `/concerns/sleep/` | `neurofeedback for sleep` | can't sleep racing thoughts, insomnia help nashville | 2,702 impr, 0 clicks, pos 60.2 | `/sleepproblems/` — rewrite |
| Mood | **none** | ~~`neurofeedback for depression`~~ | — | 3,472 impr, 1 click, pos 49.1 | **Unassigned — see the decision below** |
| Concussion / TBI | `/concerns/concussion/` | `post concussion symptoms` | post-concussion support, post concussion syndrome nashville, tbi support middle tennessee, still not right after concussion | 3,331 impr, 1 click · 487 impr pos 12.8 | **Built** — see decision above |
| Children | `/for-children/` | `neurofeedback for children` | neurofeedback for kids, help for my child's focus, child emotional regulation | **157 impr, 0 clicks** — near-zero surface | **Missing — P1** |
| Cost / access | `/pricing/` | `neurofeedback cost` | how much does neurofeedback cost, is neurofeedback covered by insurance, hsa fsa | Present in tail, no page | **Missing — P2** |
| Trust / safety | `/is-lens-safe/` | `is neurofeedback safe` | neurofeedback side effects, does neurofeedback work, neurofeedback reviews | Present in tail, no page | **Missing — P2** |
| Comparison | `/compare/` | `neurofeedback vs [alternative]` | amen clinic tennessee, exomind nashville, lens vs traditional neurofeedback | exomind 26 · amen clinic + vanderbilt + christiana in tail | **Missing — P3** |
| Vibroacoustic | `/vibroacoustic-therapy/` | (retain only) | — | 3,446 impr — **purchase intent, not clinical** | Keep, do not expand |
| Celebrity / social proof | `/trisha-yearwood/` | (retain) | — | Best CTR on site, pos 2.7 | Keep as-is |

---

## Priority order

**P0 — before launch**
1. `/lens-neurofeedback/` — largest single recoverable cluster on the site
2. ~~`/neurofeedback-nashville/` and `/neurofeedback-murfreesboro/`~~ **Done, as rewrites of `/locations/nashville/` and `/locations/murfreesboro/`** rather than as new URLs — see the decision above
3. Homepage retarget to `neurofeedback therapy` as primary

**P1 — first 30 days post-launch**
4. `/concerns/focus-adhd/` full rewrite
5. `/concerns/anxiety/` full rewrite
6. `/for-children/` new

**P2 — 30–90 days**
7. `/concerns/sleep/` rewrite (`/mood/` is unassigned — see the decision below) (~~`/concussion-recovery/`~~ — shipped early as `/concerns/concussion/`; see the decision above)
8. `/pricing/`, `/is-lens-safe/`

**P3 — opportunistic**
9. `/compare/`

---

## Do not target

- **`adhd testing`, `adhd assessment`, `adhd evaluation`, `adhd diagnosis`** — HBC does not diagnose. The Brain Map is not an ADHD assessment. Ranking for these produces unqualified leads and a scope-of-practice exposure. Target help/support intent instead.
- **`vibroacoustic chair`, `acoustic chair`, `vibro chair`** — purchase intent for furniture. Currently the site's #2 click driver and commercially near-worthless.
- **`concussion treatment`, `concussion therapy`, `tbi treatment`, `head injury treatment`** — treatment intent for a medical injury. HBC does not treat concussion or brain injury and the copy may not imply it, so ranking here produces exactly the visitor `/concerns/concussion/` is built to send to a doctor. Target the post-clearance half of the cluster instead.
- **`neurofeedback for depression`, `depression treatment`, `depression therapy`, `low mood support`** — **added Aug 2026.** There is no mood concern page and the practice has not decided whether it serves this at all, so there is nothing on the site that can honestly answer these. Ranking here produces exactly the visitor nobody can help. Revisit only if the scope question in the `/mood/` decision above is answered yes; until then the 3,472 impressions stay unpursued on purpose.
- **`pandas treatment`** — appeared in the tail. Verify HBC treats this before creating any surface for it.

---

## Decision: the concern clusters live on `/concerns/[slug]/`, and `/mood/` is not being built

This map routed the three concern clusters to new `/adhd-focus/`, `/anxiety/`
and `/sleep/` pages, and the mood cluster to `/mood/`. **None of those pages
exist and none is being built.** Rule 6, for the third time, after the location
clusters and the concussion cluster:

- **The concern pages already carry every signal a new URL would have to earn
  from zero** — breadcrumbs, FAQ-eligible structure, the guide CTA, the
  free-call CTA, inbound links from the header, footer, `/what-we-help-with`,
  the homepage, `/adults` and `/lens-neurofeedback`, and eight sibling pages of
  internal link equity. `/anxiety/` starts with none of it.
- **Two pages per concern is rule 1 violated on purpose.** `/anxiety/` and
  `/concerns/anxiety/` answer the same question for the same visitor.
- **All three already hold their head term.** `metaTitle` on each is
  "Neurofeedback for Anxiety & Stress", "…for ADHD & Focus", "…for Sleep". The
  head-term work the new URLs were for is done, on the pages that exist.

**`/mood/` is a different case and is not resolved by the above.** There is no
mood or depression concern page, and one is not being created by redirect —
a destination is not a decision to offer a service. So the cluster is
**unassigned**: `neurofeedback for depression` is targeted by nothing, and its
3,472 impressions are deliberately not pursued until somebody decides whether
this practice serves that concern at all. That is a scope-of-practice question,
not an SEO one. Until it is answered, treat `depression treatment`,
`depression therapy` and `neurofeedback for depression` the way **Do not
target** treats the concussion terms.

---

## Redirects required at launch

301 permanent, unless noted. **Every destination below was checked against the
routes the build actually emits** — the previous version of this table pointed
four of its six entries at URLs that do not exist, which would have thrown away
the inherited surface on day one rather than carrying it over.

| Legacy | Destination | Route exists? |
|---|---|---|
| `/add-adhd/` | `/concerns/focus-adhd/` | ✅ |
| `/stressanxiety/` | `/concerns/anxiety/` | ✅ |
| `/sleepproblems/` | `/concerns/sleep/` | ✅ |
| `/concussion-and-tbi/` | `/concerns/concussion/` | ✅ |
| `/depression/` | `/what-we-help-with/` | ✅ — **proposed, needs Ben** |
| `/vibro-acoustic-chair/` | **410 Gone** | n/a — **proposed, needs Ben** |
| `/trisha-yearwood/` | `/stories/` | ✅ — **proposed, needs Ben** |

### The three proposals

**`/depression/` → `/what-we-help-with/`.** The hub names all nine concerns
and asserts that none of them is depression care, which is the honest thing
this redirect can say. A concern page would imply a service the practice does
not offer; a 410 throws away real equity for a page whose visitors may well be
served by something on the hub. If the answer to the scope question above is
"we don't serve this at all", switch it to 410 then — not now, and not by
default.

**`/vibro-acoustic-chair/` → 410 Gone.** The map says retain
`/vibroacoustic-therapy/`; no such page exists or is planned, and "retain"
cannot be honoured by a table. This URL is the site's #2 click driver and the
map's own note calls the traffic "purchase intent, not clinical" and
"commercially near-worthless" — furniture shoppers. 410 retires it deliberately
and tells Google so. The alternative is `/` if the clicks are wanted for any
reason, which would mean answering a furniture query with a wellness homepage.
**Either way the "Keep, do not expand" row in the map above is currently
describing a page that isn't being built, and that contradiction is Ben's to
resolve.**

**`/trisha-yearwood/` → `/stories/`.** The map says this URL keeps its own —
best CTR on the site, position 2.7 — but keeping it means building a page, and
that page's content is gated behind `FEATURE_CELEBRITY`, which does not open
until name, likeness, image, quote, Grammy credit and commercial-use
permissions are all on file. Shipping a URL that ranks for a person's name
before those exist is the one thing that gate is for. `/stories/` carries the
client quotes, claims nothing about anybody, and can be swapped for a real page
the day the permissions land.

---

## Baseline to measure against

Recorded Aug 2026, pre-rebuild:

- Non-branded CTR: **0.5%**
- Branded share of clicks: **77%** (web) vs **~18%** (GBP Nashville)
- Queries with zero clicks: **909 of 1,000**
- GBP Nashville: 11,116 views → 671 calls + 1,084 website clicks
- GBP Murfreesboro: 2,869 views → 179 calls + 219 website clicks

Re-pull at 90 days post-launch. The number that matters is non-branded clicks, not total clicks.
