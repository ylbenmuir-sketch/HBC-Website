# Phase 14 — overnight batch report

Nothing is pushed. Every item below is committed on `main` locally, one commit
per item, in the order they were given.

Items 5, 6 and 7 are reports only — no code changed for any of them, as asked.

---

## 1. Phase 14 — "How it works" moved, steps one and two rewritten

**Commit:** `Phase 14: how it works, right after the stories`

### a. The move

`section.sec.sec-navy.home-journey` now sits immediately after the client
stories section and before "Why people wish they'd called sooner." Nothing else
moved.

Order on the homepage now, top to bottom:

```
hero → Trisha band → proof band → concerns → CLIENT STORIES →
HOW IT WORKS → why now → what could change → brain map →
founder note → locations → FAQ → final CTA → guide capture
```

Phone and desktop moved together, because the DOM is the only thing that states
section order on this page: `.home` is a plain flex column at ≤760px with no
`order` overrides left in it (they were deleted in an earlier phase). Verified
in the browser at 390px — the rendered sequence matches the DOM exactly.

### b/c. Step copy

Both took the approved wording verbatim. Step two keeps its
"See what the first visit is like →" link, and step three is untouched.

`lib/chat/site-copy.ts` mirrors this module word for word for the site
assistant, so it moved in the same commit — `npm run check:index` fails
otherwise, and it passes (22 mirrored passages).

### d. What the reorder could have broken, and didn't

| Thing | Result |
| --- | --- |
| In-page anchors `#for-your-child`, `#for-adults` | Both live inside the concerns section, which didn't move; the jump buttons travelled with their targets. No other file links to a homepage anchor. |
| Scroll reveals | `RevealOnScroll` matches on the `.rv` class, not position. 39 `.rv` elements on the page, 3 of them in the moved section, all observed. |
| Positional CSS | There is none — no `nth-child`, `+`, `~`, `:first-of-type` or `:last-of-type` selector in `globals.css` touches these sections. |
| `MobileCtaBar` `.final` retire logic | Intact. Exercised at seven scroll positions rather than reasoned about: the bar appears once `.hero` clears the top, stays up through the moved section, and retires exactly when `.final` comes within 80% of the viewport height. `.hero` is still first and `.final` still second-to-last (the guide band has always been after it). |

**One consequence you should look at.** The Brain Map section stayed where it
was, so it is no longer directly after the step that names it. Its code comment
used to claim that adjacency; I corrected the comment to describe what is
actually true now rather than move a second section. **Moving the Brain Map
section up to follow the steps again would be a layout decision, so I did not
make it.**

Background sequence after the move, in case you want to eyeball it:
concerns (ivory) → stories (ivory-2) → **how it works (navy)** → why now
(ivory) → what could change (ivory-2) → brain map (ivory). I changed no
section's background class.

### e. Does step three now restate step two?

**No — but they touch in two places, and both are new.**

- Step two now ends "…we walk you through what we see, and you leave with a
  written plan." Step three says "Sleep, focus, and mood reviewed every time —
  your plan follows what you actually report." Both now contain a *review*
  action and both name *the plan*. They are different reviews (the recording
  vs. how you're doing) and it is the same plan carried forward, so this reads
  as continuity rather than repetition.
- The closer collision is "you sit down with a practitioner" (step two) against
  "Short, comfortable visits" (step three) — both are now describing the
  physical experience of attending, which only step three used to do.

Step two is also now the longest of the three by a clear margin (four
sequential clauses against step three's two), so the module no longer reads as
three even beats.

**I did not rewrite anything.**

### f. Screenshot

`phase-14-home-390.png` — full page, 390px wide, 15,121px tall, committed.

---

## 2. `source_page` on chat bookings

**Commit:** `Booking: assert the page she was actually on`

### It is hardcoded — but in the test harness, not in production

The production path is correct and always was:

```
SiteAssistant.tsx  page: pathname
  → /api/chat       body.page
    → advanceBooking(session, message, page)
      → submit.source_page
        → /api/consultation → consultation_requests.source_page
```

Driven end to end to be sure, with a stand-in listening on the Supabase REST
endpoint so nothing was written anywhere real. A booking started on
`/concerns/anxiety` produced exactly this insert:

```json
{"type":"consultation","source":"chat","helping_who":"My child","concerns":[],
 "first_name":"Sarah","phone":"615-555-0142","email":null,
 "preferred_center":null,"best_time":null,"note":null,
 "source_page":"/concerns/anxiety"}
```

The `"/contact"` was in `scripts/answer-audit.mjs` — `runBooking()` passed that
literal as the page for every booking it drove. So every audited row agreed
with every other one, and the field was untested in both directions.

### What changed

`runBooking()` takes a `page`, and the audit now drives three bookings from
three different pages (`/concerns/anxiety`, `/`, and `null`), checks each
payload against the page it came from, and separately checks that the three did
not all come back the same. That last assertion is the one that matters — a
single row passes just as well against a hardcoded constant.

Given teeth before being trusted: hardcoding `source_page: "/contact"` in
`booking.ts` fails all four assertions, printing the exact symptom you
described.

### Question for you

**Where did you see the `/contact` rows?** If it was in Supabase rather than in
audit output, there is a mechanism I have not found — the code path is clean and
the harness never writes. Two innocent explanations exist: `check:chat` sends
`page: "/"` for every message (see item 3), and the contact form itself records
`/contact` when submitted from that page, which is correct but looks identical
in the table unless you filter on `source = 'chat'`.

---

## 3. Guarding `check:chat`

**Commit:** `check:chat: refuse to book a fake Sarah into a real table`

Two of its conversations run a booking through to "yes", so each run inserted
two consultation rows and sent two lead-notification emails. Nothing marked them
as tests and nothing downstream can tell them from real leads.

A preflight now decides whether the run may proceed:

| Condition | Result |
| --- | --- |
| No Supabase credentials visible | Runs — the insert fails, which is §7's "submit while the API is down" case |
| Loopback host (`supabase start`), table empty | Runs |
| Any hosted project, table empty | **Refuses** until `CHECK_CHAT_ALLOW_PROJECT=<ref>` names that exact project |
| Table holds any rows | **Refuses**, whatever the host |
| Can't reach the database, or no row count returned | **Refuses** |

It reads `.env.local` the way the dev server does, because `npm run check:chat`
is plain node and would otherwise see no credentials and declare itself safe
while the server it drives inserted happily. All five branches were exercised.

Noted in `PHASE-8-HANDOFF.md` (running-it-locally section) and `README.md`.

### Finding you need to act on

**The project in `.env.local` currently holds 5 rows in
`consultation_requests`.** The guard refuses on both counts — hosted project,
and non-empty. I did not look at the rows beyond counting them, and I did not
delete anything.

**Are those five real leads, or leftovers from earlier `check:chat` runs?** If
they are test rows, `delete from public.consultation_requests;` clears them and
the checklist will run. If any are real, they need to come out of that table
before it is ever used as a test target — and someone may be waiting on a call.

---

## 6. Verified-content status — everything still open

Six `Verifiable`s are unverified; the production build names all six in its log.
Alongside them are four `[CONFIRM]` gates that are not `Verifiable`s, and a set
of `[bracketed]` data placeholders.

### The six unverified `Verifiable`s

| Fact | What it blocks today | What closes it |
| --- | --- | --- |
| `FOUNDER_QUOTE` | The founder blockquote on `/` falls back to a generic sentence in production; `/about/founder` carries a `[Founder to approve quote]` tag. Never in the assistant's index either way. **Also**: Franklin's location-page quote is this same wording typed in as a plain string in `lib/locations.ts`, so it is *not* gated — see the drift note in item 7. | Sheri's personal sign-off on the exact wording. |
| `REVIEWS` | The whole three-cell review band on `/` and `/stories` (rating, count, video-stories cell). Not indexed. | The verified Google rating and review count, plus links to the live profiles. |
| `RESPONSE_TIME` | "usually within one business day" on `/contact` — the clause is draft-only, so production reads "A free, no-pressure conversation with a real person from your nearest center." | Confirmation of the real response time, or a different wording. |
| `START_TIMING` | "Most new clients start within a week of their first call." beside the how-it-works CTA. Not indexed. | Confirmation of typical start timing. |
| `BRAIN_MAP_CLAIM` | The differentiator sentence in the Brain Map section ("As far as we know, no other LENS practice in the country puts it in your hands."). Not indexed. | A documented basis. Keep it hedged — a bare "the first in the country" is not defensible. |
| `FRANKLIN_OPENING` | The opening date on `/`, `/locations` and `/locations/franklin`; all three read "Coming soon". Not indexed. | The opening date. |

### The `[CONFIRM]` gates that are not `Verifiable`s

| Gate | What it blocks | What closes it |
| --- | --- | --- |
| `planning.communitiesTag` — Nashville **and** Murfreesboro (`"[Confirm list]"`) | This is the only thing the assistant's `confirmTag` gate still excludes, so "do you serve Green Hills?" gets "I don't have that on the site". Franklin's list is confirmed and answers. | The real community list per center. Confirming one rejoins that center on its own. **Note:** the sentence itself renders in production — the tag is a marker beside it, not a gate on the copy. Schema `areaServed` is gated (it drops when the string is a `[placeholder]`, which these are not). |
| `CONCIERGE_TAG` | Nothing hides — the concierge paragraph on `/locations` ships; the tag flags it. | Service area and pricing. |
| `CONTACT_RESPONSE_TAG` | Paired with `RESPONSE_TIME` above. | Same answer. |
| `TRISHA_APPROVAL_TAG` | Nothing — it is the note beside the celebrity band, which is gated on `NEXT_PUBLIC_FEATURE_CELEBRITY` instead. | Written permission for name, likeness, image/video, quote, the Grammy credit, and commercial website use. |

### `[bracketed]` data placeholders still open

- **`lib/team.ts`** — three `[Practitioner name]` profiles plus one `[Name]`
  coordinator, and their bio paragraphs. These 404 in production (3 routes).
- **`lib/locations.ts`** — Franklin `[Street address]` / `[ZIP]`; Murfreesboro
  `[Parking note]`; `[Neighborhood, nearest cross streets, highway access.]`
  for **all three** centers; the per-location team rosters.
- **`lib/resources.ts`** — five `[Draft…]` articles plus `[Body copy…]` in
  "Homework battles", and its `[Confirm byline & review date]`. These 404 in
  production (6 routes).

### Two things the checklist says that the code no longer agrees with

`CONTENT-CHECKLIST.md` still has these unticked, but the code has them verified:

- Primary phone number (`PHONE.verified === true` — phone UI ships)
- 140,000+ sessions (`STAT_SESSIONS.verified === true`)
- Founding year 2016 (`ESTABLISHED_YEAR.verified === true`)
- "Replace all sample quotes with verified client quotes" — all three
  `TESTIMONIALS` are `verified: true` and ship. The **location-page** quotes are
  still samples, but they are gated behind draft mode and do not ship.

And one verified fact is on no checklist line at all: `SAME_DAY_CALLBACK`
(`verified: true`), which is what puts "A real person calls you back today" in
the hero.

I did not edit the checklist — ticking boxes on your behalf is exactly the kind
of call you asked me not to make.

---

## 7. Dead code and drift — report only, nothing changed

### Exports referenced nowhere, including in their own file

| File | Export |
| --- | --- |
| `components/Eyebrow.tsx` | `Eyebrow` — **the whole component is orphaned.** Every eyebrow on the site is written inline as `<div className="eyebrow">`. |
| `lib/chat/content-index.ts` | `indexSummary()` — built to feed the build log; nothing calls it. |
| `lib/config-validation.ts` | `MISCONFIGURED` |
| `lib/content-validation.ts` | `UNRESOLVED_CONTENT` |
| `lib/site-config.ts` | `PHONE_VERIFIED`, `RESPONSE_TIME_NOTE`, `RESPONSE_TIME_TAG` (both marked "back-compat aliases (interior pages)" — no interior page reads them), `SAMPLE_QUOTES_NOTE_STORIES` (an alias of `SAMPLE_QUOTES_NOTE`), `draftText()` (the sibling `isDraftText()` is used in eight places; this wrapper in none) |

Roughly thirty exported **types** are used only inside their own file
(`AnswerResult`, `BookingTurn`, `Scored`, `TeamMember`, `Resource`, and so on).
Harmless, and arguably documentation — listing them here only so "unused
exports" doesn't read as thirty problems when it is nine.

`FOUNDER_FIRST_NAME` looks unused from outside but is read by
`FOUNDER_DISPLAY_NAME` in the same file. Not dead.

### Files referenced nowhere

- `public/images/brain-map-bars.png` — in the repo, placed on no page. Already
  noted in `lib/site-config.ts`'s Phase 7.5 block.
- `public/images/hero.jpg` — referenced only in a comment in `app/layout.tsx`.
  It is the source the stopgap OG image was composited from, so it is not junk,
  but nothing on the site serves it.
- `public/.DS_Store` and `public/images/.DS_Store` — gitignored, so they do not
  deploy, but they are sitting in a directory that is served wholesale.

### Working docs that no longer describe the code

`BUSINESS_HOURS` **does not exist**. It was deleted when the per-center `hours`
were confirmed, and both centers' weeks are `verified: true`. Six places still
describe it as the live blocker:

| Where | What it says | Reality |
| --- | --- | --- |
| `README.md:345` | Open item #1: "`BUSINESS_HOURS` is unverified, so the assistant makes **no** callback-timing claim" | It makes one. A booking I ran replied "The team will call you back Tuesday, the next day they're open." |
| `README.md:394` | "`lib/schema.ts` omits `openingHoursSpecification` too" | `lib/schema.ts:189` emits it. |
| `README.md:351`, `PHASE-8-HANDOFF.md:824` | "Confirm `hoursLines` in `lib/locations.ts`" | `hoursLines` was replaced by structured `hours` + `formattedHours()`. |
| `PHASE-8-HANDOFF.md:70` | §5.1 "**Built, dormant** — `BUSINESS_HOURS` unverified → no timing claim ships" | Live. |
| `PHASE-8-HANDOFF.md:819` | Ben's outstanding decision #1 | Settled. |
| `PHASE-8-HANDOFF.md:822` | "retires the `UNANSWERABLE_TOPICS` hours check" | The export is `PRE_RETRIEVAL_TOPICS`, and the hours entry is *live and answering*, not retired. |

Both docs therefore say four decisions are outstanding when three are.
`SEO-AUDIT.md:313` also still lists enriching the LocalBusiness JSON-LD from
`hoursLines` as an open task; it is done.

`hbc-conversion-build-brief.md:169` instructs deleting the `home-journey`
section — that refers to the old five-step version, which was replaced by the
three-step one under the same class name. Historical, not a live instruction.

`QUERY-TO-PAGE-MAP.md` is untracked — it exists on disk and is in no commit. I
left it alone.

### Constants from `lib/site-config.ts` duplicated as literals

**None in rendered code.** I checked the phone (display and `tel:`), the session
count, the founding year, all four price figures, both durations,
`BRAIN_MAP_NAME` and the canonical domain. Every occurrence outside
`site-config.ts` is inside a comment explaining the constant, except:

- `app/page.tsx:729` — the Brain Map image's `alt` text writes "A sample
  Harmonized Brain Map" as a literal rather than interpolating `BRAIN_MAP_NAME`.
- `lib/chat/site-copy.ts:546` — the passage `title` is the literal "The
  Harmonized Brain Map".

Both are prose rather than facts, and neither is a figure that can go stale
dangerously, so I am flagging rather than changing them.

The "21 points" / "21-point" figure appears in four places, but two of those are
the mirrored copy pair that `check:index` already keeps identical.

---

## 4. Re-audit with the corrected method

**Commits:** `Layout audit: measure the text, not the document` ·
`Two headings that were rendered and invisible`

### Why phase 9 read clean

`document.documentElement.scrollWidth` answers one question — *can this page be
scrolled sideways* — and a clipped element answers it **no**, because
`overflow: hidden` is precisely what stops content from widening the document.

An element-box audit misses the same case for the same reason: an element whose
own overflow is `visible` keeps `scrollWidth === clientWidth` however far its
text hangs out, and its box stays whatever width its parent gave it. I built
that version first and it also reported clean.

The method that works measures **the text** — Range rects, per line box —
against **the box actually allowed to contain it**, the padding box of the
nearest ancestor that clips.

It is committed as `npm run check:layout` (`scripts/check-layout.mjs`), driving
headless Chrome over the running server's own sitemap. No npm dependency.
**Adding a script was not in the brief** — say the word and I'll drop it; the
reason I did is that phase 9's error survived because there was nothing to
re-run.

### The detectors were tested before they were trusted

Four faults injected into `/faq` at 390px. `documentElement.scrollWidth` stays
at 390 for all four — the phase 9 result, reproduced on purpose:

| Injected fault | scrollWidth | New audit |
| --- | --- | --- |
| baseline | 390 | 0 findings |
| `h1 { white-space: nowrap }` | 390 | 2 — text past viewport, text clipped |
| `.faq:nth-child(2) { margin-top: -80px }` | 390 | 1 — text overlap |
| `.faq-list { height: 90px; overflow: hidden }` | 390 | 33 — 14 clipped vertically, 19 overlaps |

### Coverage

- **Dev, 34 routes × 320/390/414/834 = 136 combinations.**
- **Production build, 25 routes × 4 = 100 combinations.** The other 9 routes
  (3 team profiles, 6 draft articles) 404 in a production build because they
  are draft-gated in both the pages and the sitemap. Not a bug — but the sweep
  now records HTTP status, because a 404 renders a short tidy page and audits
  perfectly clean.

### Everything found

**Three real bugs. All three fixed. Nothing else was touched.**

**1 — `/resources/lens-vs-traditional-neurofeedback`, H1 clipped at 320px.**
"neurofeedback:" sets 301px wide at the 52px article size, in a 272px column.
The heading ran 5px past the screen and `body { overflow-x: hidden }` took the
tail off it.
Fix: `overflow-wrap: break-word` on `h1–h4`. It does nothing at all until a word
cannot fit. **Proven rather than asserted**: every box on all 136 dev
combinations was measured before and after, and not one with a non-zero area
moved. The heading still sets in five lines — only where line three breaks
changed.

**2 — `/locations/[slug]`, hero copy under the photo, every phone width.**
Breadcrumbs, the "Nashville, Tennessee" eyebrow, the H1 and part of the sub
were completely covered. `.hero-ph` is a size-and-shape class, and the mobile
rule that absolutely positions it was written for the homepage hero and scoped
to nothing; on the locations page there is no positioned ancestor, so `inset: 0`
resolved against the initial containing block. Scoped to `.hero-media`.

**3 — Homepage family row, "Children & families" eyebrow under the photo,
every phone width.** The navy panel is pulled 60px up onto the image on purpose
— gold top border, drop shadow, the lot. It was `position: static` and the photo
is `position: relative`, and a static element paints in an earlier layer than a
positioned sibling whatever the flex `order` says. `position: relative` on the
panel puts it back on top. Nothing moves; only the paint order.

**Both 2 and 3 were invisible to phase 9's method and to my corrected one.** The
text is inside its box, inside everything that clips it, on a document that does
not scroll sideways — and simply not on the screen. I found #3 by accident
during the contrast sweep, then added a detector that samples five points across
every line and asks `elementFromPoint` what is in front; that detector found #2.
A fixed overlay does not count, because that is what a sticky header does to
everything it passes.

**Final state: 34 routes × 4 widths, 136 combinations, clean.**

### Three harness bugs worth knowing about

I got wrong readings from all three before catching them, so they are written
into the script:

1. A page is measured and photographed in **one** state, with motion frozen.
   `getBoundingClientRect()` includes the transform, so an element caught
   mid-reveal measures somewhere it will never be.
2. **Images are waited for.** Making the window as tall as the document pulls
   every lazy image into view at once, and each one reflows what is below it.
   Measuring before they land reads rects off one layout and pixels off
   another — this is what put an ivory heading "on" a photograph.
3. A single capture of a 15,000px surface comes back the right dimensions with
   its content displaced. Pages are read in 1,000px bands, which are exact.

---

## 5. Contrast sweep — the list, nothing fixed

**No code changed for this item.**

### The method, and why you can trust the numbers

Same as the hero: hide every glyph, screenshot, and read the actual composited
backdrop pixel under each line of text — photo, gradient and tint as the browser
painted them — then composite any translucent text colour onto that pixel before
computing the WCAG ratio. Worst pixel per line wins.

Validated two ways before I reported anything:

- **Against your own numbers.** Re-injecting the pre-phase-9 hero gradient
  reproduces **1.33:1** for the eyebrow (globals.css records 1.35) and
  **2.39:1** for the H1 (records 2.1).
- **Against arithmetic.** Gold `#A9853F` on ivory `#FBF8F1` computes to
  **3.238:1** by hand; the sweep reports 3.24.

The hero as it ships today measures 6.06 (eyebrow), 10.63 (H1), 7.46 (the sage
italic), 8.57 (sub), 5.81–5.91 (the micro line and its link). Nothing in it is
under 4.5.

### Every pairing under 4.5:1 — production build, 25 routes × 320/390/414/834

765 instances, 19 distinct pairings. "Needs" is the WCAG 1.4.3 threshold for
that text's size and weight.

| Measured | Needs | What it is | Colour on backdrop | Where |
| --- | --- | --- | --- | --- |
| **1.69–1.91** | 4.5 | Trisha card role line, over the video thumbnail (`span.celeb-id-role`, phones only) | gold `rgb(169,133,63)` on `rgb(95,102,111)` | `/` @ 320/390/414 |
| **2.54** | 4.5 | First-visit sequence body copy on the navy band (`.lens-seq .row p`) | slate `rgb(93,104,115)` on navy `rgb(28,43,58)` | 3 location pages, all widths |
| **3.24** | 4.5 | Header wordmark, "Brain Centers" | gold on ivory | **all 25 routes**, all widths |
| **3.24–3.43** | 4.5 | Testimonial theme label (`.quote .theme`) | gold on ivory | 10 routes |
| **3.24** | 4.5 | Team member role (`.member .role`) | gold on ivory | 3 routes |
| **3.24–4.20** | 4.5 | Numbered step markers (`.row .n`) | gold on ivory | 5 routes |
| **3.24** | 4.5 | Location fact labels ("Status", "Address") | gold on ivory | 3 location pages |
| **3.24** | 4.5 | "Adults & children" audience label (`.who`) | gold on ivory | `/what-we-help-with` |
| **3.43** | 4.5 | Location card city line (`.body .city`) | gold on white | `/`, `/locations` |
| **3.99** | 3 | "Trisha Yearwood" name over the thumbnail | ivory on `rgb(128,122,118)` | `/` @ 320 only |
| **4.20** | 4.5 | How-it-works step numerals (`.jstep .n`) | gold on navy | `/` |
| **4.20** | 4.5 | Trisha role line on the navy band | gold on navy | `/` @ 834 |
| **4.23** | 4.5 | Sage note panels (`.note-sage`) | sage `rgb(94,115,96)` on `rgb(230,235,226)` | 11 routes |
| **4.23** | 4.5 | The phone number inside a sage note | sage on sage-soft | `/contact` |
| **4.43** | 4.5 | Section eyebrows on ivory-2 (three selector variants) | sage on `rgb(244,238,225)` | 5 + 5 + 14 routes |
| **4.43** | 3 | Sage italic inside an H2 on ivory-2 | sage on ivory-2 | 10 routes |
| **4.43** | 4.5 | "Related concerns" eyebrow | sage on ivory-2 | 8 concern pages |

### The 9 draft-only routes (dev, they 404 in production)

| Measured | Needs | What it is | Where |
| --- | --- | --- | --- |
| **2.75–4.09** | 4.5 | PlaceholderPlate shot spec (`.plate .spec`) | 2 routes |
| **2.82–4.02** | 4.5 | Same, on the article plate | 1 route |
| **3.07–4.47** | 4.5 | "Photography needed" label (`.spec b`) | 3 routes |
| **3.24** | 4.5 | Header wordmark | 9 routes |
| **3.24** | 4.5 | Step numerals | 3 routes |
| **4.20** | 4.5 | `[Confirm same-day callback]` tag | 9 routes |
| **4.23** | 4.5 | Sage note panel | 6 routes |

The first three are `PlaceholderPlate` internals and the sixth is a `[CONFIRM]`
tag — both are draft-mode-only and `aria-hidden`, so they never ship. Everything
else on that list already appears in the production table.

### Reading the list

Three groups, and they are three different decisions:

1. **Gold on ivory at 3.24:1** is one decision, not eight. It is `--gold` on
   `--ivory`, and it is the wordmark, every step numeral, every small label.
   Nothing about it is width- or page-specific.
2. **Sage on ivory-2 at 4.43:1** is one decision too — every section eyebrow on
   the site, plus the sage italic (which needs only 3:1 and passes).
3. **The genuinely local ones** are the two Trisha-card lines over the
   thumbnail (1.69–1.91 and 3.99) and slate body copy on navy at 2.54:1 on the
   location pages. The last is the one I'd look at first: it is body copy, it is
   the lowest non-celebrity number on the site, and `.sec-navy p` already sets
   `rgba(251,248,241,.7)` for exactly this situation — the `.lens-seq` rows just
   aren't picking it up.

**I fixed none of it, as instructed.**

---

## 8. Full verification

All run against the final commit.

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | clean |
| `npm run lint` | clean |
| `npm run check:index` | 22 mirrored passages match; 14 `[CONFIRM]` tags accounted for across 9 pages |
| `npm run check:answers -- --retrieval` | all guardrails hold — 21 refusals, 31 answerable, 6 medication phrasings + 2 benign, 16 off-topic probes, 6 pre-retrieval + 6 near-misses, 7 days + no-day, 11 centers / 8 times / 3 notes / **3 source pages**, 23 concern routing lines + 4 known misses |
| `npm run build` (production) | exit 0. Warns the 6 unverified facts and the 2 missing lead-notification settings, as designed |
| `REQUIRE_VERIFIED_CONTENT=true npm run build` | **throws**, naming all six — the launch gate still bites |
| `npm run check:layout` | 34 routes × 4 widths, 136 combinations, clean |

The answer audit's second half (the one that posts to a live route and spends on
the model) was not run — item 8 asked for `--retrieval`.

### The assistant flag ships off

Built with `NEXT_PUBLIC_FEATURE_ASSISTANT` absent, served with `next start`:

| Probe | Result |
| --- | --- |
| `POST /api/chat` | **404** |
| `assistant-launcher` in the homepage HTML | 0 occurrences |
| the string "Questions?" anywhere on the homepage | 0 |
| any `assistant` markup on `/contact` | 0 |

Two other gates checked at the same time: **0** `[CONFIRM]` tags in production
HTML, and the sample location quote ("I expected something clinical…") does
**not** ship. The Trisha band does render, because I built with
`NEXT_PUBLIC_FEATURE_CELEBRITY=true` as the README says production is set —
its own permissions gate is unchanged and still unsatisfied.

---

## Questions I need answered

1. **Item 2** — where did you see chat bookings recording `/contact`? Supabase,
   or audit output? The production path is clean end to end and the only
   `/contact` literal was in the test harness.
2. **Item 3** — the live `consultation_requests` table holds **5 rows**. Test
   leftovers, or real leads? I counted them and touched nothing.
3. **Item 1** — the Brain Map section is no longer next to the step that names
   it. Leave it, or move it up behind the steps?
4. **Item 5** — gold-on-ivory (3.24:1) and sage-on-ivory-2 (4.43:1) are two
   token-level decisions covering almost the whole list. Do you want options, or
   is the list enough for now?
5. **Item 4** — I added `npm run check:layout` to the repo, which was not asked
   for. Keep or drop?
6. **Item 7** — `CONTENT-CHECKLIST.md` has four boxes unticked that the code has
   verified, and the README/handoff describe `BUSINESS_HOURS` as the live
   blocker when it no longer exists. Both are yours to correct; I left them.
