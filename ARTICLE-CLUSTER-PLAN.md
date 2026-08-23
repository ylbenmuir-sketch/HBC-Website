# Article Cluster Plan — sleep, focus & ADHD, anxiety

Written Aug 2026, from `SEO-AUDIT.md` (production build audit) and
`QUERY-TO-PAGE-MAP.md` (GSC 16-month export + GBP Performance, both centers).

Purpose: decide which supporting articles get written, which concern page each
one feeds, and which cluster is built first — before any of them is written,
so the answer isn't whichever draft happened to be nearest finished.

**Rule 1 governs everything below.** One cluster, one page. Every article here
takes a satellite long-tail the concern page does not own, and links up into
it. An article that targets its own concern page's primary query is the
failure this plan exists to avoid, not a bonus.

---

## 1. Where the three concerns actually stand

### First, a correction to the question

The concern pages rank for **nothing**, because they have never been indexed.
The rebuild isn't live, `NEXT_PUBLIC_SITE_URL` is only just confirmed, and
Search Console setup is still open (`SEO-AUDIT.md` §6.2 item 24). Every
position below belongs to the **legacy WordPress URL** whose cluster the new
page inherits through a 301 — it is the surface being handed over, not a
measurement of the page that will receive it.

That matters for expectations: these are not pages slipping down a ranking.
They are pages that don't exist yet, taking over a cluster that currently
converts nothing.

### The three, as recorded

| Cluster | Legacy URL | New page | Primary target | Impressions | Clicks | Position |
|---|---|---|---|---|---|---|
| Anxiety | `/stressanxiety/` | `/concerns/anxiety` | `neurofeedback for anxiety` | **7,017** | **0** | 50.1 |
| Focus / ADHD | `/add-adhd/` | `/concerns/focus-adhd` | `adhd help without medication` | **6,277** | **0** | 58.8 |
| Sleep | `/sleepproblems/` | `/concerns/sleep` | `neurofeedback for sleep` | **2,702** | **0** | 60.2 |

Positions 50–60 are pages five and six. The impressions are real demand that
has never once produced a click, which is the site-wide pattern — 909 of 1,000
queries with zero clicks, 0.5% non-branded CTR.

All three concern pages already carry the correct `metaTitle`
("Neurofeedback for Anxiety & Stress", "…for ADHD & Focus", "…for Sleep"), so
the head terms are assigned and no head-term work is outstanding on any of
them. What is missing underneath them is everything.

### Where the unclaimed demand is

**Anxiety** — the largest of the three and the best-positioned. Supporting
terms named in the map: *anxiety help nashville*, *drug-free anxiety support*,
*calm nervous system*. The page's own copy already holds the informational
language nothing on the site elaborates: "thoughts that won't quiet down —
especially at night", "constantly on edge, braced for something", "struggling
to relax even when life is objectively calm", and a hero that names being
"tired of being told to just relax". **Zero of the six drafted articles sit in
this cluster.** It has the most demand and the least supporting material.

**Focus / ADHD** — the "without medication" modifier is the primary target, and
the homepage H1 already frames the whole practice that way ("Help for anxiety,
focus, and sleep — *without medication*"). The unclaimed tail splits cleanly in
two, and both halves are written into the concern page and nowhere else: the
**parent** side (homework taking three hours and ending in tears, "I'm just bad
at school", mornings) and the **adult** side (projects that stall at 90 percent,
losing track mid-task, procrastinating on things you genuinely care about).
**Two of the six drafted slugs already sit here.** Ruled out by the map's
Do-not-target list: `adhd testing`, `adhd assessment`, `adhd evaluation`,
`adhd diagnosis`.

**Sleep** — smallest cluster, worst position, and P2 rather than P1. Supporting
terms: *can't sleep racing thoughts*, *insomnia help nashville*. The unclaimed
tail is the quality-not-quantity question ("eight hours that feel like four",
"waking at 3 a.m. for no reason"). **One drafted slug sits here.**

**A collision to keep in view:** *racing thoughts at bedtime* is claimed by
anxiety (`recognize`, `overview.recognize`) and by sleep (`recognize`) in
almost identical words. Building both clusters at once would put two pages
behind one query, which is rule 1 broken by accident rather than on purpose.
Sequencing them apart is part of why sleep goes last.

---

## 2. The supporting sets

Each article: target query · intent · why it's winnable · which page it feeds.
None targets its concern page's primary.

### Focus & ADHD → `/concerns/focus-adhd`

| Article | Target | Intent | Why winnable | Feeds |
|---|---|---|---|---|
| `homework-battles` *(draft exists)* | `homework battles adhd`, `why does homework take so long` | Parent, mid-crisis, informational | Pure parent phrasing; no local competitor covers it, and the approved shell (title, excerpt, image, CTA, blockquote) already exists | focus-adhd + children-school |
| `bad-at-school` *(draft exists)* | `child says they're bad at school`, `bright kid given up` | Parent, self-esteem worry | Emotional long-tail with no commercial competition at all | **children-school** + focus-adhd |
| `the-last-ten-percent` *(new)* | `can't finish what I start`, `projects stall at 90 percent` | Adult self-recognition | The concern page's own `goals` and `heroSub` already own this language; nothing else on the site says it, and the cluster is otherwise all-parent | focus-adhd + `/adults` |
| `lens-and-medication` *(new)* | `neurofeedback while on medication`, `can you do neurofeedback with adhd meds` | Late-funnel objection | The question that blocks the booking, answered nowhere on the site outside two FAQ lines; near-zero competition | focus-adhd + `/faq` |

`bad-at-school` feeds **children-school first** on purpose. The sentence in its
title is literally an item in that concern's `recognize` list *and* its
`goals`. Pointing it at focus-adhd would put an article about the exact words
one page claims onto a different one.

### Anxiety → `/concerns/anxiety`

| Article | Target | Intent | Why winnable | Feeds |
|---|---|---|---|---|
| `told-to-just-relax` | `can't relax even when nothing is wrong` | Adult self-recognition | The page's hero already names the grievance; no page anywhere serves the phrase | anxiety |
| `braced-for-something` | `physical anxiety symptoms for no reason`, `body won't calm down` | Informational, somatic framing | The physical half is what people describe and what content in this category consistently skips | anxiety + stress-resilience |
| `alongside-therapy` | `neurofeedback alongside therapy`, `can I keep seeing my therapist` | Late-funnel objection | Same shape as `lens-and-medication`, and the anxiety FAQ already answers it in two sentences that deserve a page | anxiety + `/faq` |

Three, not four: the fourth candidate in this cluster is *is neurofeedback
safe*, and the map assigns that to a **page** (`/is-lens-safe/`, P2), not an
article. Writing it here would be rule 1 broken against a page not yet built.

### Sleep → `/concerns/sleep`

| Article | Target | Intent | Why winnable | Feeds |
|---|---|---|---|---|
| `exhausted-after-eight-hours` *(draft exists)* | `slept 8 hours still tired` | Informational | High-volume phrasing, no local competitor, approved shell exists | sleep |
| `the-3am-waking` | `waking at 3am every night for no reason` | Informational, high anxiety | Named verbatim in the page's `recognize` list; strong long-tail with weak content behind it | sleep + anxiety |
| `when-sleep-hygiene-isnt-it` | `sleep hygiene not working` | Post-strategy, informational | The audience that has already tried the standard advice — under-served, and the honest thing the site can say to them | sleep |

Deliberately three, and deliberately last: two of the strongest sleep long-tails
(*racing thoughts at bedtime*) are shared with anxiety, and this cluster should
be written after anxiety so the split is decided with the anxiety copy in front
of whoever writes it.

---

## 3. Build order — focus & ADHD first

**Recommendation: focus & ADHD.** Anxiety second, sleep third.

Anxiety has 740 more impressions and a 9-place better position, and that is a
real argument for taking it first. It loses on four other counts:

1. **Two of its four articles already exist as approved shells.**
   `homework-battles` and `bad-at-school` have signed-off titles, excerpts,
   meta descriptions, tags, CTA headings and — for one — an assigned photograph
   and an approved blockquote. `SEO-AUDIT.md` §5.2's first instruction is
   *finish drafts first, the slugs already exist*. The anxiety cluster is four
   articles from zero.
2. **It's the cluster the lead magnet already serves.** The GuideCta on ten
   pages collects emails against *Why regulation fails*, whose own subtitle
   leads with attention. `/concerns/focus-adhd`'s guide lead-in is "Why trying
   harder stops working" — which is the guide's section four verbatim in
   substance. Article → concern → guide is already coherent here and has to be
   built from scratch anywhere else.
3. **The recoverable half of this cluster is the only half.** The map rules out
   `adhd testing / assessment / evaluation / diagnosis` outright. That sounds
   like a constraint and is actually a simplification: everything left is
   support intent, which is what the practice can honestly serve, so there is
   no line to walk inside the cluster.
4. **It's the one cluster with an audience gap the site can see.**
   `/concerns/focus-adhd` serves "Adults & children", and both existing drafts
   are parent-facing. The adult half — projects stalling at 90 percent — is
   written into the page and supported by nothing.

Sleep goes last on its own merits: smallest cluster, P2 in the map's own
priority order, and it shares its best long-tails with anxiety.

---

## 4. Flags — verified facts, and scope of practice

Ordered by what should block a publish.

**a) The byline is an unconfirmed authorship and review claim.** All four
built articles carry `By the Harmonized team · Reviewed by {FOUNDER_DISPLAY_NAME},
Clinical Director`, copied from `homework-battles`, where it has always sat
behind a `// [Confirm byline & review date]` note. It now renders on four
production URLs. It needs Ben's and Sheri's sign-off — not the gate system's,
which can't see it, because the string contains no brackets and so passes
`isPublishable` cleanly. **Two separate things to confirm:** that the team is
the author, and that Sheri has actually reviewed each piece.

Related, smaller: **"Clinical Director"** is the title in that byline, on a
practice whose own `DISCLAIMER` says "not a medical clinic". It is pre-existing
approved copy and was not changed here, but it is worth a second look now that
it appears four more times.

**b) `lens-and-medication` is the highest-risk article of the four and should
not publish without explicit sign-off.** Every sentence in it traces —
sitewide FAQ 10 and 11, the `focus-adhd` FAQ on substitution, and the
`/how-lens-works` "is / is not" passage — and its entire thesis is that LENS is
*not* an alternative to medication and that the practice never advises on it.
That is the safest possible content for the query and it is still the one page
where being wrong costs the most.

**c) `bad-at-school` ships without a photograph.** Its `plateSpec` asks for
"Parent and teen talking at kitchen table — candid", which does not exist in
`public/images/`, so it renders `PlaceholderPlate` — a quiet brand gradient in
production. No unrelated photo was substituted; a session photo under an
article about a child's self-esteem would be misleading. `CONTENT-CHECKLIST.md`
→ Photography.

**d) Some framing traces to the guide, which is published but not indexed.**
The regulation model these articles lean on — capacity varies within the same
person across a week, standard strategies require the capacity that is short,
explanation is input a loaded system can't process — is published copy in
`public/guides/why-regulation-fails.html` and is asserted against site-config by
`check:index`. It is **not** in the assistant's content index
(`MIRRORED_PAGES` covers `/`, `/about`, `/first-visit`, `/how-lens-works` only).
So those sentences trace to approved published copy rather than to an indexed
passage. If the standard is strictly "indexed passage", the resolution is to
mirror the guide into the index — worth doing for its own sake, since the
assistant currently cannot quote the document the site's biggest CTA hands out.

**e) The redirect table names four URLs this codebase does not have.**
`QUERY-TO-PAGE-MAP.md` still routes `/add-adhd/ → /adhd-focus/`,
`/stressanxiety/ → /anxiety/`, `/sleepproblems/ → /sleep/`, `/depression/ →
/mood/`. The routes are `/concerns/focus-adhd`, `/concerns/anxiety`,
`/concerns/sleep` and — for mood — nothing at all. Shipped as written, all four
301s land on 404s and the inherited surface in §1 is thrown away on day one.
This is rule 6 again, already decided twice (the location clusters, the
concussion cluster); the table just hasn't been updated to match.
**Fix before launch.** `/depression/` needs its own decision: there is no mood
concern page.

**Clean, and checked:** no article mentions the Brain Map, so nothing here can
read as a test or assessment. No article names an outcome. The single
outcome-shaped sentence is `page:how-lens-works:expect` carried verbatim
("clients commonly report … over a series of visits") with its "varies from
person to person" clause attached, which is how that claim appears everywhere
else on the site. No article uses `testing`, `assessment`, `evaluation` or
`diagnosis` about anything the practice does — the word "testing" appears three
times, each time pointing the reader to a doctor.

---

## 5. The `[Draft]` articles that 404 in production

Six articles are gated, not five. Five carry `[Draft…]` bodies; `homework-battles`
is the sixth, gated on `[Body copy…]` placeholders — `isPublishable` reads
brackets and does not care which kind. All six 404'd.

| Slug | Tag | Fits? | Verdict |
|---|---|---|---|
| `homework-battles` | For parents | Focus/ADHD cluster, article 1 | **Written this run** |
| `bad-at-school` | For parents | Children-school, with a focus-adhd tie | **Written this run** |
| `exhausted-after-eight-hours` | Sleep | Sleep cluster, article 1 | **Keep** — write with the sleep cluster |
| `lens-vs-traditional-neurofeedback` | How it works | `/compare/` cluster (P3) | **Keep, decide first** — see below |
| `what-the-equipment-does` | How it works | `/is-lens-safe/` cluster (P2) | **Keep, decide first** — see below |
| `brain-fog-after-55` | Adults 55+ | `/concerns/brain-fog` | **Keep, lowest priority** — see below |

**Nothing should be deleted.** Every one maps to a named cluster or a §5.2
priority. Three need a decision before they are written:

- **`lens-vs-traditional-neurofeedback`** is `SEO-AUDIT.md` §5.2's highest
  commercial-intent draft, and `lens therapy vs traditional neurofeedback` is a
  supporting term of the `/compare/` **page** in the map. Decide whether this
  article *is* that cluster's home or a satellite of it, before writing.
  It also blocks something else: `/lens-neurofeedback` §3 carries an explicit
  code note not to add a comparison table until this article exists.
- **`what-the-equipment-does`** has the same shape against `/is-lens-safe/`
  (P2, `is neurofeedback safe`, `neurofeedback side effects`). Same decision.
- **`brain-fog-after-55`** has no cluster in the map at all — `/concerns/brain-fog`
  is a concern page the map never assigns demand to. It is a genuinely
  differentiated audience (§5.2 #5) and it is also **the most compliance-
  sensitive of the six**: cognitive change after 55 sits next to dementia
  queries, and its own excerpt already commits it to saying "when to talk to
  your doctor". Write it late, and write it with the same care as the
  concussion page — which is the site's existing pattern for handing a visitor
  on rather than converting them.
