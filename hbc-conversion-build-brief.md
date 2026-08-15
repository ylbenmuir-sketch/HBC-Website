# HBC — Conversion Build Brief

For Claude Code. Work the phases in order; each is self-contained and
independently shippable. Do not change typography, palette, layout structure,
or brand tone except where explicitly specified.

**The governing principle:** the visitor is the hero, we are the guide. Every
line answers one of: *What problem do I have? How does this fix it? What do I
do next?* Empathy is already strong in this codebase. What's missing is
authority, an offer, and a clear next step.

---

## PHASE 0 — Unblock the funnel (do this first, 20 minutes)

Nothing else matters until a lead is visible to a human.

- **Add a notification on form submit.** In `app/api/consultation/route.ts`,
  after a successful Supabase insert, send an email (Resend, Postmark, or
  SendGrid — whichever key is easiest to obtain) to a `LEADS_NOTIFY_EMAIL`
  env var. Include: first name, phone, helping-who, concerns, preferred
  center, best time to call, note.
- Failure to send must **not** fail the request. Log and continue — the row is
  already saved.
- Add `LEADS_NOTIFY_EMAIL` and the provider key to `.env.example` with comments.
- If no provider key is available, scaffold the function, gate it behind the
  env var, and leave a clear comment. Do not silently skip this.

---

## PHASE 1 — Offer + CTA architecture

### The offer structure (settled — implement exactly)

Two steps, both named, both priced honestly:

1. **Free call.** A real person calls you back the same day. No cost, no
   obligation. This is the primary CTA everywhere.
2. **The Brain Map — $150.** 60–90 minutes: a full conversation, a baseline
   recording of brain activity, and a written plan you keep. Secondary CTA,
   for visitors who arrive already sold.

**Risk reversal (use verbatim, it replaces "free" as the objection-killer):**

> If we don't think LENS is right for you, we'll tell you on the phone —
> before you ever book or pay for anything.

### CTA label changes

In `components/Buttons.tsx`, `TalkCta` currently renders `Talk With Our Team`.
Replace sitewide:

| Old | New |
| --- | --- |
| `Talk With Our Team` | `Get a Free Call Today` |
| (new secondary) | `Book Your Brain Map — $150` |

Keep the single-primary-CTA discipline the codebase already enforces. The
secondary CTA appears in exactly three places: the hero (replacing
`See how LENS works →`), `/first-visit`, and `/how-lens-works`. Nowhere else.

Add a `BrainMapCta` component alongside `TalkCta` so the label and destination
live in one place.

### Hero micro-copy

Replace *"A free, no-pressure conversation. Ask anything — including the
skeptical questions."* with:

> A real person calls you back today. Ask anything — including the skeptical
> questions.

### The "free consultation" scoping fix

The site currently promises a free *consultation* in ~12 places. The
conversation is free; the first visit is $150. Every instance below must be
rescoped. Search for `free` across `app/`, `components/`, and `lib/`.

Known instances:

- `components/FinalCTA.tsx` — `DEFAULT_SUB` ("free, and with no obligation")
  and `p.after` ("Consultations are free · No referral needed")
- `app/page.tsx` — hero micro-copy, journey step 1 ("A free conversation")
- `app/first-visit/page.tsx` — the `What it costs` card
- `app/faq/page.tsx` — Q12 and Q14
- `app/what-we-help-with/page.tsx` — honesty section
- `lib/concerns.ts` — `stress-resilience` FAQ 3
- `components/ContactForm.tsx` — `WhatHappensNext` step 3
- `lib/resources.ts` — `homework-battles` `finalSub`

**Replacement patterns:**

- `FinalCTA` `p.after` → `The call is free · No referral needed · Same-day callback`
- `FinalCTA` `DEFAULT_SUB` → *"Tell us what's going on. We'll listen, answer
  honestly, and tell you plainly whether LENS is a fit — on the phone, before
  you book anything."*
- Journey step 1 → *"A free phone call — ask anything."*
- `WhatHappensNext` step 3 → *"Book your Brain Map, think it over, or decide
  it's not for you. The call is free either way."*

### `/first-visit` — the `What it costs` card

Rewrite to state the price openly. Transparent pricing is a trust signal in
this category; almost no competitor does it.

> **What it costs**
> The phone call is free. The Brain Map — your first visit — is $150 and
> includes the full conversation, a baseline recording of brain activity, and
> a written plan you keep. Session pricing is shared before you commit to
> anything, and there are no packages or countdown offers.

Remove `PRICING_TAG` from this card; the value is now known.

---

## PHASE 2 — Homepage hero

Current H1 (*"Feel like yourself again"*) is adult-only. Roughly half the
business is parents, and a parent doesn't want to feel like themselves — they
want their child to stop struggling.

**H1:**

> You've tried everything. Your brain hasn't.

**Sub (single version — retire the desktop/mobile keyword split):**

> Gentle, drug-free neurofeedback for anxiety, focus, sleep, and overwhelm —
> for adults and kids across Middle Tennessee. Over 140,000 sessions since 2016.

**Eyebrow:** `LENS Neurofeedback · Nashville & Murfreesboro`

**Buttons:** `Get a Free Call Today` (primary) · `Book Your Brain Map — $150`
(secondary, ghost)

**Alternate H1 if the above tests too confrontational** — implement only if
directed: `Calmer days. Clearer thinking. Better sleep.`

Delete the `.d-only` / `.m-only` hero sub variants and the two eyebrow
variants; one of each now. Keep the mobile `<br>` handling on the H1.

---

## PHASE 3 — Consolidate the process modules

The homepage currently explains the process four times: *How LENS works*
(4 steps), *The client journey* (5 steps), *The Harmonized care model*
(4 rows), and the FAQ. This is the same reassurance repeated, and it pushes
every CTA far below the fold.

**Collapse to one three-step plan.** StoryBrand: three steps, no more.

**Eyebrow:** `How it works`

**H2:**

> Three steps. No homework, no screens, nothing to perform.

| # | H3 | Body |
| --- | --- | --- |
| 1 | `Talk` | A free phone call. Tell us what's going on — we'll tell you honestly whether LENS is a fit. |
| 2 | `Map` | Your first visit: a real conversation, a baseline recording of brain activity, and a written plan you keep. |
| 3 | `Sessions` | Short, comfortable visits. Sleep, focus, and mood reviewed every time — your plan follows what you actually report. |

**Button:** `Get a Free Call Today`

Then:

- **Delete** the `home-journey` navy section from `app/page.tsx` (the 5-step
  version). Its content is now step 1–3 above.
- **Delete** the `lens-seq` four-row block from the `home-lens` section. Keep
  the section's `Feedback, not force.` heading, the two paragraphs, the
  waveform SVG, and the `The full explanation →` link.
- **Move** `The Harmonized care model` section to `/about` (it already has a
  near-identical section there — merge, don't duplicate). Remove from homepage.
- Keep the 3-item homepage FAQ as-is.

Preserve all deleted copy in the interior pages that already carry it
(`/how-lens-works`, `/first-visit`, `/about`). Nothing is lost — it's
relocated.

---

## PHASE 4 — Add stakes

There is currently no cost-of-inaction anywhere on the site. Add one short
section between the concern rail and the goals list. Specific pain with
dignity — not fear-mongering, and consistent with existing house style.

**Eyebrow:** `Why now`

**H2:**

> Waiting has a cost nobody adds up.

**Body:**

> Another school year of teacher emails. Another year of 3 a.m. ceilings and
> afternoons that disappear into fog. Most people who call us have been
> managing this for years — and the thing they say most often afterward is
> that they wish they'd called sooner.

**Button:** `Get a Free Call Today`

Keep it to one paragraph. Do not stack pain.

---

## PHASE 5 — Email capture

There is no email capture anywhere on the site. The overwhelming majority of
visitors are not calling today, and all of them are currently lost.

- **Add an optional email field** to `components/ContactForm.tsx` (label
  `Email`, `type="email"`, `autoComplete="email"`, not required). Add
  `email` to the server validation (≤200 chars, optional) and to the Supabase
  migration as a nullable column.
- **Add a transitional CTA block** above the footer on `/`, `/resources`, and
  all `/concerns/[slug]` pages:

  > **Not ready to call?**
  > Get *The Parent's Guide to Homework Battles* — a plain-language look at
  > what's happening in a stuck brain, and what actually helps.
  > `[email field]` `[Send it to me]`

- Wire it to the same API route with a `type: "guide"` discriminator. Store in
  the same table. Do not build a separate system.
- The guide itself does not exist yet. Build the capture UI and the storage;
  leave a clear `// TODO: attach guide PDF` and have the success state say
  *"We'll email it to you shortly."*

---

## PHASE 6 — Reduce disclaimer repetition

Some variant of *"experiences vary / nothing is guaranteed / goals, not
guarantees"* appears 15+ times, frequently **before** the desire has landed.
The honesty is a genuine differentiator; the repetition undercuts it.

**Rule:** one disclaimer per page, placed at the bottom of the relevant
section — plus the footer `DISCLAIMER`, which stays **verbatim and untouched**.

- Keep every `howHelp.note` in `lib/concerns.ts` — these are correctly placed.
- Remove the trailing `Experiences vary.` sentence from `howHelp.p1` on all 8
  concerns (the `note` directly below already says it).
- Homepage: keep `.note-sage` in the goals section; that's the one.
- Do not touch the footer disclaimer, the `LENS is not` list, or any
  wellness-service framing. Those are load-bearing.

If any removal feels legally significant, flag it rather than removing it.

---

## PHASE 7 — The Harmonized Brain Map

This is the site's single largest differentiator and it currently appears
nowhere. It makes the $150 tangible, and it is the one claim no competitor can
copy. Treat it with the same discipline as every other phase: nothing
un-gated, no new typography, palette, or layout structure.

**Naming:** the product is **The Harmonized Brain Map**, capitalized, used
consistently. Add `BRAIN_MAP_NAME` to `lib/site-config.ts` as a known constant
alongside `BRAIN_MAP_PRICE`.

### 7.1 The claim — gate it

The line "no other LENS practice in the country does this" is the strongest
sentence available and the most likely to be scrutinized. Add
`BRAIN_MAP_CLAIM` as a `Verifiable` in `lib/site-config.ts`, wired into
`content-validation.ts` like the others, `verified: false` for now.

Use this hedged wording, which is defensible today:

> As far as we know, no other LENS practice in the country puts it in your hands.

Do not write "the first in the country" anywhere until Ben verifies the basis
for it.

### 7.2 Homepage — new section

Place directly after step 2 ("Map") of the three-step module from Phase 3.
Default `.sec` background. Add a mobile `order` entry and renumber everything
below it, as in Phases 4 and 5.

**Eyebrow:** `What you walk away with`

**H2:**

> Most people have never seen their own brain. You will.

**Body:**

> On your first visit we record activity at 21 points across your brain and
> turn it into a map you can actually read — where things are running hot,
> where they're running quiet, and how that lines up with what you came in
> describing. We built this. `{BRAIN_MAP_CLAIM}`

**Micro-line beneath the image**, always visible, not gated:

> A picture of electrical activity — not a diagnosis.

**Image:** the heat-map render. Ben will supply the asset; use a
`PlaceholderPlate` with the spec `Harmonized Brain Map — heat map render` until
it lands.

**Button:** `BrainMapCta` — this is a sanctioned fourth placement for the
secondary CTA. Update the README guardrail note accordingly.

### 7.3 `/how-lens-works` — new section

Place after the existing "What it feels like from the chair" section.

**H2:**

> What the map actually tells us.

**Body — preserve this sentence structure exactly.** It is pattern language
from clinical observation, not diagnosis, and the "what we've seen with
clients whose…" construction is what keeps it honest:

> Pz is where analytical thinking and processing happen. What we've seen with
> clients whose Pz sits below 10 is difficulty switching that part on —
> logistical tasks that should be simple become a slog.
>
> F7 handles verbal expression. When we see F7 above 35, that region is often
> overprocessing — and clients describe struggling to get out what they're
> trying to say.

**Closing paragraph:**

> None of that is a diagnosis. It's a pattern we've seen across
> `{sessionCount}` sessions, held up against what you told us in the room —
> and it's why your plan starts where it starts instead of somewhere generic.

**Image:** the lobe-function graphic (image 2 in Ben's uploads). Ben will
supply; `PlaceholderPlate` spec `Brain lobe function diagram` until then.

### 7.4 `/first-visit` — rewrite the cost card

Replace the Phase 1 version with:

> **What it costs**
> The phone call is free. The Harmonized Brain Map — your first visit — is
> $150 and includes the full conversation, a 21-point recording, your map
> explained point by point, and a written plan you keep. Session pricing is
> shared before you commit to anything.

### 7.5 Legend and label corrections

These apply to the graphics themselves, which Ben produces — but flag them in
the repo (a comment in `lib/site-config.ts` near `BRAIN_MAP_NAME` is fine) so
they aren't lost:

- **"Ideal range" → "typical range"** on both the bar chart and the heat map.
  "Ideal" is evaluative and invites a client to read a number as a verdict.
- **Heat-map legend:** "Under-engaged / Ideal / Over-engaged" → "Lower
  amplitude / Typical range / Higher amplitude." Descriptive, not evaluative.
- **Lobe graphic has a labeling error:** F3 is mislabeled as F8, producing two
  F8s and no F3. Also carries an empty trailing bullet in the Frontal Lobe
  list.
- **Diagnostic terms as electrode labels** — "anxiety," "depression,"
  "addiction" — should soften to function words: "impulse control," "mood
  regulation," "attention and focus."

### 7.6 Future — do not build yet

- A dedicated `/brain-map` page. Big enough differentiator to rank on its own,
  but it needs the assets and the verified claim first.
- Before/after maps. Highly persuasive and the closest thing to a testimonial
  you can produce in-house — but two maps side by side is an implied outcome
  claim. Requires written consent, honest framing, and legal review.

---

## Blocked on Ben — do not attempt

- Verified testimonials (currently zero render in production — this is the
  single biggest authority gap on the site)
- Trisha Yearwood approval; the band stays gated until signed
- Real phone number
- Confirming the same-day callback promise is operationally true before the
  copy in Phase 1 ships
- Google rating and review count
- The two Brain Map graphics (heat-map render, lobe-function diagram) and the
  basis for `BRAIN_MAP_CLAIM` — Phase 7 ships with placeholder plates and the
  claim gated until both land

---

## Build order

Phase 0 → 1 → 2 → 3 → 4 → 5 → 6. Commit after each phase with a message
naming the phase. Run `npm run build` after Phase 3 and Phase 5.

Phase 7 runs 7.1 → 7.2 → 7.3 → 7.4 → 7.5, each sub-step its own commit, with
`npm run build` after 7.2 and 7.3.
