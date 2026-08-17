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

## The map

| Cluster | Page | Primary target | Supporting terms | Demand signal | Status |
|---|---|---|---|---|---|
| LENS modality | `/lens-neurofeedback/` | `lens therapy` | lens therapy near me, lens neurofeedback, low energy neurofeedback system, what is lens therapy | **10,900+ web impr, pos 13.9–17.1** · 999 GBP searches | **Missing — P0** |
| Category generic | `/` (homepage) | `neurofeedback therapy` | neurofeedback, neurotherapy, biofeedback therapy, biofeedback | 551 + 351 + 139 + 101 GBP searches | Exists, untargeted |
| Nashville local | `/locations/nashville/` | `neurofeedback nashville` | lens therapy nashville, biofeedback nashville, brain mapping nashville, neurofeedback near me | 2,930 impr pos 10.2 · 193 GBP | **Rewritten** — see decision above |
| Murfreesboro local | `/locations/murfreesboro/` | `neurofeedback murfreesboro` | lens therapy murfreesboro, neurofeedback rutherford county, smyrna / christiana / la vergne | 325 impr **pos 3.5, 0 clicks** | **Rewritten** — see decision above |
| Brain mapping | `/brain-map/` | `brain mapping therapy` | brain map, qeeg nashville, brain mapping near me | 819 impr pos 8.2 · 22 GBP | Section only, no page |
| ADHD / focus | `/adhd-focus/` | `adhd help without medication` | neurofeedback for adhd, adhd focus support nashville, non-medication adhd support | 6,277 impr, **0 clicks**, pos 58.8 | `/add-adhd/` — rewrite |
| Anxiety | `/anxiety/` | `neurofeedback for anxiety` | anxiety help nashville, drug-free anxiety support, calm nervous system | 7,017 impr, **0 clicks**, pos 50.1 | `/stressanxiety/` — rewrite |
| Sleep | `/sleep/` | `neurofeedback for sleep` | can't sleep racing thoughts, insomnia help nashville | 2,702 impr, 0 clicks, pos 60.2 | `/sleepproblems/` — rewrite |
| Mood | `/mood/` | `neurofeedback for depression` | low mood support, drug-free depression support | 3,472 impr, 1 click, pos 49.1 | `/depression/` — rewrite |
| Concussion / TBI | `/concussion-recovery/` | `concussion therapy` | post-concussion support, tbi recovery nashville, concussion therapy murfreesboro | 3,331 impr, 1 click · 487 impr pos 12.8 | `/concussion-and-tbi/` — rewrite |
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
4. `/adhd-focus/` full rewrite
5. `/anxiety/` full rewrite
6. `/for-children/` new

**P2 — 30–90 days**
7. `/sleep/`, `/mood/`, `/concussion-recovery/` rewrites
8. `/pricing/`, `/is-lens-safe/`

**P3 — opportunistic**
9. `/compare/`

---

## Do not target

- **`adhd testing`, `adhd assessment`, `adhd evaluation`, `adhd diagnosis`** — HBC does not diagnose. The Brain Map is not an ADHD assessment. Ranking for these produces unqualified leads and a scope-of-practice exposure. Target help/support intent instead.
- **`vibroacoustic chair`, `acoustic chair`, `vibro chair`** — purchase intent for furniture. Currently the site's #2 click driver and commercially near-worthless.
- **`pandas treatment`** — appeared in the tail. Verify HBC treats this before creating any surface for it.

---

## Redirects required at launch

| Legacy | New |
|---|---|
| `/add-adhd/` | `/adhd-focus/` |
| `/stressanxiety/` | `/anxiety/` |
| `/sleepproblems/` | `/sleep/` |
| `/depression/` | `/mood/` |
| `/concussion-and-tbi/` | `/concussion-recovery/` |
| `/vibro-acoustic-chair/` | `/vibroacoustic-therapy/` |

301 permanent. `/trisha-yearwood/` keeps its URL — it has the site's best CTR and existing equity.

---

## Baseline to measure against

Recorded Aug 2026, pre-rebuild:

- Non-branded CTR: **0.5%**
- Branded share of clicks: **77%** (web) vs **~18%** (GBP Nashville)
- Queries with zero clicks: **909 of 1,000**
- GBP Nashville: 11,116 views → 671 calls + 1,084 website clicks
- GBP Murfreesboro: 2,869 views → 179 calls + 219 website clicks

Re-pull at 90 days post-launch. The number that matters is non-branded clicks, not total clicks.
