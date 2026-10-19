# 10-Year Anniversary Giveaway — repo inspection and build plan

Planning document (Ben's brief, 2026-10-15, Tier 4). Read with
`BUILD-LOG-2026-10-15.md` and, once the build starts, `GIVEAWAY-BUILD-LOG.md`.

**Updated 2026-10-18 (second pass)** with Ben's prize ladder, the
Saturday grand-only drawing, the claim-deadline rule, the Concierge rule and
six scope cuts (§8, decisions 15–20). Every other section was rewritten to
match, so this file is the single source of truth for the build. §10 is the
scope check for the Nov 6 test run, re-marked after the cuts.

**Updated 2026-10-18 (first pass)** with Ben's answers to the fourteen open
questions (§8, decisions 1–14).

**Searched for an existing spec first:** nothing. No giveaway, sweepstakes,
anniversary, `/10years` or drawing notes exist in this repo, the older
checkout (`hbc-website-v2_4`), or `hbc-platform/context` (plans and logs).
The only "drawing" hits are the client drawing wall at Nashville. Everything
below comes from the brief, Ben's decisions, and what the code already does.

---

## 1. What it has to do (the brief + decisions)

| When (Central) | UTC | What |
|---|---|---|
| **Fri Nov 6, 2026** | | A full **test-mode** run works end to end |
| **Mon Nov 9** | 06:00 | `/10years` live in **notify-me** mode. Chat assistant hidden on `/10years` from here to Dec 5 |
| **Sun Nov 15, 6:00 pm** | Mon 00:00 | **Entries open.** The "It's live" email goes to verified notify-me signups with a one-tap entry button |
| **Mon Nov 16, 9:00 am** | 15:00 | One reminder to notify-me signups who have not tapped |
| **Mon Nov 16 – Fri Nov 20, 12:00 pm** | 18:00 | **Daily drawing**, one a day (five). Ben calls Monday's winner Monday afternoon |
| **Mon–Fri, 4:00 pm** | 22:00 | The daily afternoon email to verified entrants: the drawing is done, the next drawing and its prize, your entry count, your share link (no winner name) |
| **Sat Nov 21, 5:00 pm** | 23:00 | **The grand prize — ONE drawing.** Pool = every valid entry from the whole week, daily winners included. Entries close at this moment. Ben (or Sheri) calls the winner Saturday evening. **Six drawings in all** |
| **Sun Nov 22** | | Thank-you + offer email to everyone who did not win |
| **to Sat Dec 5, 11:59 pm** | Dec 6 05:59 | **Thank-you offer** window: book by then, visit any date through **Dec 31**. Offer and codes switch off at this timestamp (config, no deploy) |
| **Dec 1** | | Offer reminder email — **built after Nov 21**, not part of the Nov 6 run |
| **after Dec 5** | | `/10years` stays live permanently as a thank-you page (no redirect) |

Also: referral bonus entries (+3 per verified friend, cap 10 friends); an
admin drawing engine with an audit trail; offer-code redemption tracked from
entry to booking. **Email only — no SMS anywhere** (Dialpad bans
sweepstakes and referral traffic). Winners are called: Monday and Saturday
by Ben (or Sheri), the other days by the front desk. **Both clinics are
unstaffed on Mondays.**

Note on time: US daylight saving ends **Sun Nov 1, 2026**, so the whole
giveaway window is CST (UTC−6). Noon CT = **18:00 UTC**; 4:00 pm CT =
**22:00 UTC**; 5:00 pm CT = **23:00 UTC**; 6:00 pm CT = **00:00 UTC the
next day**.

### Prizes (decision 16)

One winner per drawing. The winner gets **the HBC prize and that day's
partner prize**. Every HBC prize has two versions, and the winner's **"I'm
already an HBC client"** checkbox picks which one:

| Drawing | New client | Current client | Partner |
|---|---|---|---|
| Mon | Brain Map + 2 sessions | 2 sessions | Partner 1 (TBD) |
| Tue | Brain Map + 3 sessions | 3 sessions | Partner 2 (TBD) |
| Wed | Brain Map + 4 sessions + Pocket vagus nerve stimulator by Hoolest | 4 sessions + Pocket vagus nerve stimulator by Hoolest | Partner 3 (TBD) |
| Thu | Brain Map + 5 sessions + Pocket vagus nerve stimulator by Hoolest | 5 sessions + Pocket vagus nerve stimulator by Hoolest | Partner 4 (TBD) |
| Fri | Brain Map + 7 sessions + Pocket vagus nerve stimulator by Hoolest | 7 sessions + Pocket vagus nerve stimulator by Hoolest | Partner 5 (TBD) |
| **Sat GRAND** | Brain Map + 12 sessions + Handheld vagus nerve stimulator by Hoolest (yours to keep) + one service from every partner | 13 sessions + the same Hoolest handheld + partner services | Partner 6 (TBD) |

- **Every prize session includes the vibro chair.**
- Partner prizes are six slots, smallest Monday to biggest Saturday, all
  "TBD". The page and the emails show a partner prize **only once its name is
  set in config**; unset = not shown at all (no "TBD" ever renders).
- **Retail values come from config rates, never hand-typed** (`lib/giveaway/
  config.ts`): Brain Map $150; session $125; vibro chair $40 per use; Hoolest
  handheld $429 (**UNCONFIRMED**); Hoolest keychain retail **UNCONFIRMED**
  (counted as $0 until set). Practitioner cost $35 per session or map — admin
  cost view only, never shown to the public.
- Any prize whose **computed retail value is over $600** sets
  `tax_form_required` on the winner. The claim flow and admin show a **"tax
  form received"** step for those winners. With the rates above that is
  every prize from Tuesday's new-client version up; Monday's two versions and
  Tuesday's current-client version are under.

---

## 2. What already exists to build on

| Need | Already in this repo | Use it how |
|---|---|---|
| Hosting, crons | Vercel Pro project, production from `main`; `vercel.json` already runs `/api/cron/release-held-leads` **every minute** (Tier 1, 2026-10-15) | Drawings and scheduled emails ride the same per-minute pattern: a schedule table + an idempotent "run what is due" job, so DST and a late tick can't skip or double a draw |
| Database | Supabase project `brwyfneahhhkymytkvpx` (RLS on, service-role from route handlers only) | New tables, below. Migrations in `supabase/migrations/` |
| Email | Resend over fetch (`lib/lead-notification.ts`), one branded template (`lib/email/templates.ts`: wordmark, card, footer with the registered identity line, dark mode, one-phone-screen rule), previews via `npm run preview:emails` | Every giveaway email is a new builder on the same `page()`/`section()`/`footer()` pieces (exported from templates.ts for this). Copy lives in one file, `lib/giveaway/copy.ts`, as [DRAFT] until Ben supplies the final words |
| Staff routing | `lib/lead-routing.ts` (per-center env vars; **no address is ever written in code**) | Offer bookings use the existing per-center routes, no new route (§4). Winner alerts are not leads: they go to two new env vars read the same way (`GIVEAWAY_ALERTS`, `GIVEAWAY_ALERTS_OWNER`, §4) |
| Leads table | `consultation_requests` (form + chat); held-email + audit columns; `referred_by` (0007) | An offer booking becomes a row here with `source = 'giveaway'` and the office gets the normal lead email, tagged "10 years". Migration 0010 adds `'giveaway'` to the source check constraint |
| Abuse controls | Honeypot on forms; in-memory rate limit for chat (`lib/chat/rate-limit.ts`) | In-memory is per instance on Vercel — the giveaway uses a **database-backed** limiter (`rate_limits`, below) |
| Test harness | `check:contact` (Chrome over CDP, mock Resend/platform/Dialpad, live DB with fingerprinted real rows), `LEAD_HOLD_ENV`-style env scoping | `check:giveaway` on the same pattern; giveaway rows carry an `env` column so a test run can never draw from or email real entrants |
| Admin auth | **None on the website.** The platform (`hbc-platform`) uses Clerk for practitioners | See §5 — Supabase Auth email-OTP with a staff allowlist seeded from an env var, not Clerk on the website |
| Chat suppression | `ASSISTANT_SUPPRESSED_ROUTES` in `lib/site-config.ts` — a static list of path prefixes (`/contact`) with no dates | Needs a date-gated entry for `/10years` (§6). Small change, same file |
| SMS | `lib/sms-confirmation.ts`, `lib/sms-consent.ts` (Dialpad) | **Not used. Not imported. No consent checkbox on any giveaway form.** No SMS abstraction is designed here |

---

## 3. Data model (one migration, `0010_giveaway.sql`)

All tables RLS-on with no policies (service role only), all with
`env text not null` (`production` / `preview` / `local` / `test`) so test
runs are isolated by construction. Every unique key below includes `env`.

- **`giveaway_people`** — one row per verified person.
  `id, env, email (normalized: lower-case; Gmail dots and +tags folded),
  email_display, first_name, last_name, zip (5 digits, an eligible state), city
  (from ZIP, for the public winner line), nearest_center ('nashville' |
  'murfreesboro', from ZIP), is_existing_client bool (the "I'm already an HBC
  client" checkbox — picks the prize version and the forward line),
  age_confirmed bool, rules_accepted_at, rules_version, verified_at,
  referral_code (unique per env, short, unguessable), referred_by_person_id,
  source_page, ip_hash, ua_hash, marketing_opt_in bool + wording + at,
  unsubscribed_at, created_at`. Unique `(env, email)`.
- **`giveaway_notify`** — notify-me signups before Nov 15. Because the
  "It's live" email has a **one-tap** entry button, the notify-me form
  collects the **full entry set** (name, email, ZIP, 18+, rules accepted,
  existing-client box, optional marketing opt-in) and the row holds it:
  `email (normalized), fields as above, verified_at, live_token_hash (signed
  token, single-use), sent_live_at, reminded_at, tapped_at, person_id,
  unsubscribed_at`. The tap converts the row into a `giveaway_people` row +
  base entry with no second verification. Nobody is entered without their
  own tap. Unique `(env, email)`.
- **`giveaway_entries`** — the ledger of chances. `id, env, person_id, kind
  ('base' | 'early_bird' | 'referral_bonus' | 'referred_bonus' | 'amoe'),
  referral_person_id, created_at, void_reason, voided_at`. Weights are row
  counts; nothing is a mutable counter. One `base` per person for the week
  (unique); one `early_bird` for a notify-me signup who taps before Monday
  noon (unique); three `referral_bonus` rows per credited friend (cap: ten
  friends); one `referred_bonus` for entering via a referral link (unique).
- **`giveaway_prizes`** — **seeded from `lib/giveaway/config.ts`**, two rows
  per drawing: `env, slot ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'grand'),
  version ('new_client' | 'current_client'), name, description, brain_map
  bool, sessions int, vibro_chair bool, hoolest_keychain bool,
  hoolest_handheld bool, partner_services bool, retail_value_usd (computed
  from the rates), practitioner_cost_usd (admin only), tax_form_required
  (retail > $600), fulfilment_status`. Unique `(env, slot, version)`. A unit
  test regenerates the seed from the config and fails if the SQL drifts.
  Partner prizes live in config only (name null = not shown).
- **`giveaway_drawings`** — the schedule and the result. `id, env, slot,
  scheduled_at (timestamptz), kind ('daily' | 'grand'), status ('scheduled' |
  'drawn' | 'redrawn' | 'void'), pool_snapshot_hash, pool_size,
  entries_count, seed (crypto random, stored), winner_entry_id,
  winner_person_id, drawn_at, drawn_by ('cron' | admin email)`. Unique on
  `(env, scheduled_at, kind)` — the idempotency key: a second run finds it
  drawn and does nothing. **Six rows per env**, seeded from config: five
  daily (Mon–Fri noon) and one grand (Sat 5 pm).
- **`giveaway_drawing_pool`** — the frozen pool for each drawing (drawing_id,
  entry_id, person_id). Written in the same transaction as the draw, so the
  result can be re-verified later from the stored seed and pool, and a
  redraw picks from the same pool. Unique `(drawing_id, entry_id)`.
- **`giveaway_winners`** — one row per drawing result (also the redraw
  history): `env, drawing_id, person_id, prize_id, prize_version
  ('new_client' | 'current_client', from the person's existing-client box at
  draw time), claim_token_hash, phone, status ('drawn' | 'contacted' |
  'claimed' | 'unreachable' | 'declined' | 'ineligible' | 'redrawn'),
  claim_deadline_at (the rule in §4), call_attempts jsonb (when, who,
  outcome), contacted_at, claimed_at, public_ok bool (default false),
  public_ok_at, public_label ("Jane D., Franklin" — computed, stored at OK
  time), tax_form_required bool (from the prize), tax_form_received_at`.
  No pickup-video fields (cut, decision 15).
- **`giveaway_audit`** — append-only: every draw, redraw (with reason:
  unreachable / ineligible / declined), void, admin login (code requested,
  denied, verified, failed), CSV export, entry void, prize edit, public-OK
  toggle, tax-form received, unsubscribe — who, when, what, before/after.
- **`giveaway_offers`** — one row per person: `env, person_id, kind
  ('free_first_visit' — the only kind), code (personal, unguessable, unique
  per env), issued_at, expires_at (Dec 5 23:59 CT), redeemed_at,
  consultation_request_id, redeemed_center`. One per verified entrant,
  referred friend and verified notify-me signup — **existing clients
  included**: they get the same code, and their emails carry one extra line
  inviting them to forward it to a friend (decision 15). Redemption is
  tracked here (code → `consultation_requests` row); there is no separate
  lead-stage table (cut).
- **`giveaway_admin_allowlist`** — `env, email, added_at, added_by`. Seeded
  at runtime from `GIVEAWAY_ADMINS` (never from code), checked on every
  login. Unique `(env, email)`.
- **`rate_limits`** — `(env, bucket, key_hash, window_start, count)` for the
  database-backed limiter, incremented atomically by a SQL function
  (`giveaway_rate_limit_hit`).
- **`scheduled_sends`** — the email schedule the per-minute job drains:
  `(env, kind, due_at, person_id | null, sent_at, skipped_reason)`. Holds the
  Sunday "It's live", the Monday 9 am reminder, the daily afternoon emails,
  the Tuesday "call today" re-send and the Nov 22 thank-you. The Dec 1
  reminder is added after Nov 21. Unique on `(env, kind, due_at, person_id)`
  (nulls not distinct).
- **`consultation_requests`** — the source check constraint gains
  `'giveaway'` (today `check (source in ('form','chat'))`, migration 0002).

The drawing is a weighted pick from the frozen pool with `crypto.randomInt`
(Node), seed stored. Eligibility rules (decisions 1, 2, 4, 17): every valid
entry counts in every drawing still to come; a **daily winner's entries
leave the pool of later daily drawings** but stay in the grand-prize pool;
the grand pool is every valid entry from the whole week, referral and
early-bird bonuses and daily winners included.

---

## 4. Flows

### Timing config (one place)
`lib/giveaway/config.ts` holds every timestamp above as a constant (UTC
instants with the CT label beside each): notify-me start, entries open,
each drawing, the daily email time, the Monday reminder, the Tuesday
re-send, the offer end, the chat-suppression window — plus the prize ladder
(both versions, the six partner slots), the rates, the claim-deadline rule
and the offer window. The migration seed for `giveaway_prizes` and
`giveaway_drawings` is generated from it (a test fails if the SQL drifts),
the page's on-page Q&A and countdowns read it, the emails read it, and
`assistantSuppressedOn()` reads it — so a time or a prize can only be wrong
in one place. The admin dashboard shows a warning if a `giveaway_drawings`
row and the config disagree.

### Notify-me (Nov 9 – Nov 15)
`/10years` in notify-me mode shows the 10-year message, the schedule, the
prizes and the **full entry form** (so the Sunday tap can be one tap): first
and last name, email, ZIP (5 digits), "I'm 18 or older", "I've read the
Official Rules" (link), optional "I'm already an HBC client", optional
marketing opt-in (unticked). Honeypot. Submit → verification email → the
click sets `verified_at`. A ZIP outside the eligible states gets a polite
"neighbors within driving distance" message and no row.

### Entry (Sun Nov 15 6:00 pm – Sat Nov 21 5:00 pm)
Same form, now creating entries. No phone field at entry (no SMS, and the
front desk gets the phone only from a winner's claim page or someone who
asks for a call). Submit → **double opt-in email** (Resend) → the click
verifies and creates the base entry (plus `referred_bonus` if a referral
code was carried). Unverified addresses never enter a draw. Referral link
`/10years?ref=<code>` stored on the visit (cookie-free: carried in the form
as a hidden field from the URL). Entering earlier means more drawings: the
base entry sits in every drawing still to come.

**Notify-me signups:** the Sunday 6 pm "It's live" email carries a one-tap
button (`/10years/enter/<live_token>`): their details are on file and
already verified, so the tap creates the person + base entry with no second
verification, and records `rules_accepted_at` / `rules_version` for the
rules current at tap time. A tap **before Monday's noon drawing** also
writes one `early_bird` entry. Monday 9:00 am CT: one reminder to signups
with no `tapped_at`. The link works all week; after the tap, the ordinary
"You're in" email follows.

**Existing clients:** the "I'm already an HBC client" box does two things:
it picks the **current-client prize version** if they win (§1), and it adds
one line to their emails — *"Already a client? Forward this to a friend — the
code works for whoever books with it."* They get the same offer code as
everyone else. They still enter and can still win.

### Referral bonus
When a referred person **verifies**, the referrer gets **three**
`referral_bonus` entries and the friend gets one `referred_bonus` entry.
**Cap: ten credited friends (thirty bonus entries) per referrer**; the
eleventh friend still enters normally but credits nothing (logged). Only
verified friends count. Not for self-referral: same normalized email, same
`ip_hash` + `ua_hash` pair within a window, or a disposable-domain email,
voids the bonus (logged, not silently dropped).

### No purchase necessary / AMOE
An alternative method of entry that does not require a referral or any
purchase — the base entry already needs nothing bought, which covers most of
it; the official rules must say so and give a mail-in or plain-form route if
counsel wants one (`kind = 'amoe'`).

### Drawings (the engine)
- A `giveaway_drawings` row per slot, seeded from the config: daily at
  **12:00 pm CT Mon Nov 16 – Fri Nov 20** (five rows), and **one** grand
  row at **5:00 pm CT Saturday Nov 21**. Six rows. There is no Saturday
  daily (decision 17).
- The existing per-minute cron (or a second route on the same schedule) runs
  `runDueDrawings()`: for each `scheduled` row past `scheduled_at` in its env,
  in one transaction: build the pool (all non-void entries; for a **daily**
  drawing minus the entries of anyone who already holds a daily win; for the
  **grand** drawing, everyone), freeze it, hash it, draw, record winner with
  the **prize version from the person's existing-client box**, set
  `tax_form_required` from the prize's computed retail value, write
  `giveaway_winners` with the claim deadline (rule below), audit. Idempotent
  on the unique key; a missed minute is caught the next.
- Admin can also press "Draw now" for a slot whose time has passed (audited
  as the admin), and "Redraw" with a required reason. A redraw picks from
  **that drawing's frozen pool**, minus the previous pick and minus anyone
  who has won a daily prize since (daily drawings only).
- After a draw: **staff alert** — to `GIVEAWAY_ALERTS` (Denise; cc Ben and
  Kylie) for Tue–Fri drawings, to `GIVEAWAY_ALERTS_OWNER` (Ben; cc Denise)
  for the Monday and Saturday drawings. Same first-address-is-To,
  rest-are-CC format as the lead routes; both fall back to `LEADS_FALLBACK`
  with a logged warning. Contents: winner's name, email, ZIP + city, the
  prize (version named), tax-form flag, the claim deadline, the admin link.
  Then the winner email (below). Nothing public until the winner says OK.

### Monday (clinics unstaffed)
Monday's noon drawing runs. The alert goes to Ben first; **Ben calls the
Monday winner Monday afternoon** and marks the row `contacted` in admin.
Fallback: the front desk calls Tuesday morning — the Tuesday **8:30 am CT
"call today"** re-send to `GIVEAWAY_ALERTS` is kept, and is **skipped when
the Monday winner is already marked contacted** (the per-minute job checks
the row at send time).

### Winner contact and claim
Winner email at draw time ("You won — we'll call you; tap to give us the
best number") with the claim link (`/10years/claim/<token>`): one phone
field, plus a line saying we'll ask on the call whether we may post your
first name, last initial and city. When `tax_form_required`, the email and
the claim page carry one line saying a tax form is part of claiming, and
admin shows a **"tax form received"** step for that winner.

**Claim window (decision 18): 72 hours from the draw — except that a
deadline which would land on a Sunday or a Monday moves to the following
Tuesday at 5:00 pm CT.** So: Monday's, Tuesday's and Wednesday's winners
have until noon three days later (Thu, Fri, Sat); Thursday's would land
Sunday noon → **Tue Nov 24, 5 pm**; Friday's would land Monday noon → **Tue
Nov 24, 5 pm**; Saturday's grand winner lands **Tue Nov 24, 5 pm** as it is. Three call attempts, one per
day, voicemail each time, logged in admin with who and when. Outcome
recorded (`claimed`, `declined`, `unreachable`). **Unreachable after the
deadline → audited redraw** from that drawing's frozen pool. The Sunday and
unstaffed Monday calls are Ben's or Sheri's.

### Public winners list
On the claim call the winner is asked for the OK; admin has a **"public OK"
toggle per winner** (audited). The `/10years` winners list shows, per
drawing, one of three states: **named** ("Jane D., Franklin" — first name,
last initial, city from ZIP) when `public_ok` is on; **"[Day]'s winner:
claimed ✓"** when contacted or claimed without the OK; **"[Day]'s winner has
been drawn — we're reaching them now"** before contact. The daily email does
**not** carry any of this (below).

### Lead pipeline: entry → booking
- **The thank-you offer, "Your first visit is on us":** a free Brain Map +
  consultation (normally $150). Must be **booked by Dec 5 at 11:59 pm CT**;
  the visit may be any date through **Dec 31**. **Bonus:** start the
  **in-center 12-session package** at that first visit and get a **13th
  session free** ($125 value). One per person, both centers, no cap.
  **Concierge (decision 19):** a Concierge booking gets the free first visit
  (the $100 travel fee still applies) and **no package bonus** — the 13th
  session applies to the in-center package only. Goes to all verified
  entrants, referred friends and verified notify-me signups, existing
  clients included. **Option A (decision 20): the offer stays at full
  strength as decided; nothing was trimmed for budget.**
- Every offer carries a **personal code** (`giveaway_offers.code`); the code
  and the offer switch off at the Dec 5 timestamp from the config — the
  claim page then says the window has closed and the normal "Talk with our
  team" button remains.
- "Book my free visit" from any giveaway email → the existing `/contact`
  flow with `?from=10years&code=<offer>`; the consultation POST validates
  the code, records `source = 'giveaway'` and `source_page`, and stamps the
  offer row `redeemed_at` + `consultation_request_id` + `redeemed_center`.
  **Routing: the existing per-center lead routing, no new route**, with the
  center chosen from ZIP (nearer of Nashville and Murfreesboro by ZIP
  centroid; unknown ZIP → today's fallback). The office gets the normal lead
  email (held/one-email rules apply), subject tagged **"10 years"**, and the
  booking is tagged "10 years" in the platform.
- **Tracking (decision 15):** redemption counts on the admin dashboard and a
  **CSV export** (people, entries, offers with redemption, winners). No lead
  stage board; stages after booking live in the platform.

### Emails (Resend, the shared template; every one previewed at 390/640)
1. Notify-me confirmation (verify) ·
2. **"It's live"** (Sun Nov 15, 6:00 pm CT, to verified notify-me signups;
   one-tap entry button) ·
3. **Notify-me reminder** (Mon Nov 16, 9:00 am CT, to signups who have not
   tapped) ·
4. Entry verification ·
5. "You're in" + your referral link + the thank-you offer (+ the forward
   line for existing clients; + "+1 for entering via a link" when it applies) ·
6. **Daily afternoon** (Mon–Fri 4:00 pm CT, to verified entrants) —
   **simplified (decision 15)**: no winner name, no three-state line. Shape:
   *"Today's drawing is done and the winner is being called. Next drawing:
   [day] at noon — [next prize]. You have [N] entries. Share your link to add
   more."* Friday's names Saturday's grand prize at 5 pm ·
7. Winner (with the claim link; a tax-form line when required) ·
8. Non-winner thank-you + offer (Sun Nov 22) ·
9. Staff: winner drawn ·
10. Staff: Tuesday "call today" for Monday's winner (skipped if contacted) ·
11. Offer reminder (Dec 1) — **built after Nov 21**.
**Marketing emails (2, 3, 6, 8, 11) carry an unsubscribe link** (own
`/unsubscribe` endpoint writing `unsubscribed_at`, signed token, no login)
and the registered identity line (CAN-SPAM). The week's emails go to every
verified entrant who has not unsubscribed — the rules disclose them as part
of entering; the separate marketing opt-in box governs HBC news after Dec 5.
All copy lives in `lib/giveaway/copy.ts` as [DRAFT] until Ben approves the
deck. Cut: the "A friend entered" email (decision 15) — the count is in the
next daily email and on the page.

### Anti-fraud and rate limiting
Database-backed limiter (`rate_limits`): per IP hash (5 entry attempts /
hour), per email (1 verification email / 10 min), per referral code (a burst
ceiling; the ten-friend cap is business logic). Double opt-in.
Disposable-domain blocklist. Normalized email uniqueness (one person, one
base entry). Honeypot. Admin entries search has a **saved "suspicious"
filter** (many entries from one IP hash, referral bursts) — no separate
view (decision 15). **No Cloudflare Turnstile** (decision 10) — no third
party is added, and the privacy policy change in §6 is about the giveaway
data only.

---

## 5. Admin

`/admin/10years` on the website, server-rendered, never cached, `noindex`.
**Auth: Supabase Auth email one-time code** limited to an allowlist of staff
emails (`giveaway_admin_allowlist`, seeded at runtime from the
`GIVEAWAY_ADMINS` env var — never written in code) — the website already
talks to Supabase and has no auth library; adding Clerk (the platform's) to
the website is a bigger dependency for a six-week feature. **Allowlist: Ben,
Denise, Kylie** (decision 9). Every login attempt is written to
`giveaway_audit` with the staff email. Phase 1 ships the login and an empty
dashboard shell; the screens come in Phase 3.

Screens: dashboard (entries/day, verified %, referrals, offer codes issued
and redeemed, a config-vs-schedule warning), drawings (schedule, pool size,
Draw now, Redraw with reason, audit trail per drawing, re-verify button that
recomputes the pick from stored seed + pool), winners (claim status, call log
with the three attempts, **public OK toggle**, **tax form received** step
when required, prize version shown), entries (search with the saved
"suspicious" filter, void with reason), exports (CSV, audited). Cut
(decision 15): the Franklin-corridor count (ZIP is stored; query it later),
the lead stage board, the separate suspicious view.

---

## 6. Things that change outside the feature

- `/privacy-policy`: what the giveaway collects (name, email, ZIP, age
  confirmation, existing-client flag, referral relationships, IP hash), the
  emails and the unsubscribe, retention for giveaway data. No new third
  party (no Turnstile). **Same commit as the feature.**
- `consultation_requests` source check constraint: `'giveaway'` added in
  migration 0010 (Phase 1). The route's accepted sources and the lead-routing
  `source` type widen in Phase 3 when the code check lands.
- `ASSISTANT_SUPPRESSED_ROUTES` (`lib/site-config.ts`): today a static list
  of path prefixes. Becomes entries with an optional window, and `/10years`
  is suppressed **from Nov 9 00:00 CT through Dec 5 11:59 pm CT** (the
  window comes from `lib/giveaway/config.ts`), then the assistant returns.
  During the window the page carries a short **on-page Q&A** instead (how
  entries work, drawing times, how winners are contacted, the thank-you
  offer), rendered from the same config so times can't drift. `/admin` is
  suppressed always.
- Sitemap: `/10years` in (once live); `/10years/claim/*`, `/10years/enter/*`,
  `/unsubscribe` and `/admin/*` out, `noindex`. robots.txt disallows
  `/admin/`.

---

## 7. Phases

| Phase | Done by | Contents |
|---|---|---|
| **0 — decisions** | Tue Oct 27 | **Ben's 20 decisions: done (Oct 18, §8).** Still open: counsel returns official rules; the two UNCONFIRMED Hoolest retail values; partner names; email copy approved (ten emails, §4) |
| **1 — foundations** | Fri Oct 30 | Migration 0010 (committed; applied by Ben in the SQL editor if the connector keeps refusing); `lib/giveaway/config.ts` with tests; env-scoped store; limiter; admin allowlist + login + empty shell; email builders + previews, copy in one [DRAFT] file; `/unsubscribe` |
| **2 — notify-me** | Tue Nov 3 | `/10years` in notify-me mode (date-switched by config, not by deploy) with the full entry form; notify signup + verify; privacy policy update; date-gated chat suppression + on-page Q&A; `check:giveaway` part 1 |
| **3 — giveaway + engine** | Thu Nov 5 | Entry + double opt-in; one-tap entry from notify-me + early bird; referrals (+3 / +1, cap 10); drawings schedule + `runDueDrawings` on the per-minute cron (daily-winner exclusion, grand pool, six drawings); `scheduled_sends`; winner claim page + the deadline rule + tax-form step + redraw; prize version from the existing-client box; public-OK state; admin screens; offer codes (one kind, Dec 5 cut-off); ZIP → center; CSV export |
| **4 — test-mode run** | **Fri Nov 6** | A full compressed week on a preview deployment, `env = test`: notify-me → "It's live" tap (early bird) → 5 daily drawings + the grand prize scheduled minutes apart → daily emails → winners → a Monday winner marked contacted (Tuesday re-send skipped) → one unreachable → redraw → a >$600 prize's tax-form step → offer code booked through /contact → Dec 5 cut-off; Resend mocked; Dialpad mock log empty; audit re-verified; then the same checks against production with `env = test` rows only |
| **5 — notify-me live** | **Mon Nov 9** | Switch on; chat hidden on `/10years`; monitor verifications |
| **6 — giveaway week** | **Sun Nov 15 6 pm – Sat Nov 21 5 pm** | Sunday: "It's live" send. Daily: watch the noon draw, the alert, the 4 pm email; Monday: Ben calls; Tuesday 8:30 re-send if needed; Saturday 5 pm: the grand prize, Ben/Sheri call; redraws as needed |
| **7 — offer window** | to **Sat Dec 5** | Nov 22 thank-you; build and send the Dec 1 reminder; redemption follow-up; the offer and codes close themselves at Dec 5 23:59 CT; chat returns to `/10years` |
| **8 — wrap-up** | Dec 7 | Redemption report; retention per the rules; `/10years` stays as the permanent thank-you page (10-year message, winners list, "Talk with our team") |

The date switches (notify-me → live → closed → thank-you page) are config
timestamps, so no deploy has to happen at noon on a Monday or at midnight
on Dec 5.

---

## 8. What Ben (and counsel) must supply

**Legal — must exist before Nov 9:**
1. **Official Rules** (counsel-drafted): sponsor legal name and address (Five
   Dog Enterprises Inc dba Harmonized Brain Centers, 197 Thompson Ln, Suite S,
   Nashville, TN 37211 — confirm), start/end dates and times in CT,
   eligibility, **no purchase necessary** and the free method of entry, how
   entries and referral bonuses work and their caps, odds statement, drawing
   method, winner notification and claim deadline, redraw rules, publicity
   consent, governing law, limitation of liability, privacy link.
2. **Eligibility**: age (18+?), geography (decided 2026-10-19: residents of
   Tennessee and its bordering states — `ELIGIBLE_STATES` in
   `lib/giveaway/config.ts`: KY, VA, NC, GA, AL, MS, AR, MO; none of these
   is a registration-and-bonding state like New York or Florida),
   employee/family exclusions, existing clients eligible?
3. **Prize descriptions and approximate retail values** — the ladder is
   decided (§1); still open: the Hoolest handheld ($429, unconfirmed) and
   keychain retail values, and the six partner names. Tax note: a prize worth
   $600+ may mean a 1099 — the code flags those winners; confirm the
   threshold and the form with the accountant.
4. **Health-service prizes**: if prizes or the thank-you offer are LENS
   services, have counsel confirm the inducement and advertising angle, and
   keep every giveaway word inside the site's existing claim rules (no
   outcomes, wellness framing).
5. **Marketing consent wording** for the optional opt-in, and the
   unsubscribe/CAN-SPAM footer.

**Decisions (Ben, Oct 18 2026):**
1. Entries: one base entry per verified person for the whole week. It counts
   in every drawing still to come (entering earlier = more drawings).
2. A daily winner is removed from later DAILY drawings but stays eligible
   for the grand prize.
3. Referrals: referrer gets +3 entries per referred friend who verifies; the
   referred friend gets +1 bonus entry for entering via a link. Cap: 10
   credited friends (30 bonus entries) per referrer. Only verified friends
   count. Self-referral rules from §4 stand.
4. Schedule (all Central, CST in effect): daily drawings at 12:00 pm Mon
   Nov 16 – Fri Nov 20 (= 18:00 UTC). Saturday Nov 21 at 5:00 pm (= 23:00
   UTC): the Saturday daily AND the grand prize, drawn together, daily
   first. Grand prize pool = all valid entries from the whole week,
   including referral bonuses and daily winners. Ben (or Sheri) personally
   calls both Saturday winners that evening.
   *(Saturday superseded by decision 17: one drawing, the grand prize only.)*
5. Entries open Sunday Nov 15 at 6:00 pm CT (the "It's live" email goes out
   then). Monday's noon drawing runs; Ben calls the Monday winner Monday
   afternoon. Fallback: front desk calls Tuesday morning; keep the Tuesday
   8:30 am CT "call today" staff re-send, but only if the Monday winner is
   not marked contacted.
6. Claim: 72 hours from the draw, 3 call attempts (one per day, voicemail
   each time) plus the winner email with the claim link. Unreachable after
   72 hours → audited redraw from that drawing's frozen pool.
   *(Deadline refined by decision 18.)*
7. Winners are announced publicly as first name + last initial + city (city
   from ZIP), only after the winner says OK on the claim call. If not OK,
   show "[Day]'s winner: claimed ✓". Admin gets a "public OK" toggle per
   winner. Staff may optionally ask for a short phone video at prize pickup
   (never required).
   *(Pickup video cut from the software by decision 15; it stays an
   operational option with no fields.)*
8. Thank-you offer, "Your first visit is on us": free Brain Map +
   consultation (normally $150). Must be booked by Dec 5 at 11:59 pm CT; the
   visit itself may be any date through Dec 31. Bonus: start the 12-session
   package at that first visit and get a 13th session free ($125 value). One
   per person, both centers, no cap. Concierge: visit free, the $100 travel
   fee still applies. Goes to all verified entrants, referred friends, and
   verified notify-me signups. Existing clients get a "free first visit for
   a friend" pass instead (one per existing client). Every offer carries a
   personal code; bookings are tagged "10 years".
   Add to the entry form: optional checkbox "I'm already an HBC client".
   Checked → that person's emails carry the friend pass, not the free-visit
   offer.
   *(Friend pass replaced by decision 15; Concierge bonus settled by
   decision 19; offer strength confirmed by decision 20.)*
9. Routing: winner alerts to Denise, cc Ben and Kylie. Monday and Saturday
   winners: to Ben first, cc Denise. Offer bookings go through the existing
   per-center lead routing (no new route), tagged "10 years". Use ZIP to
   pick the nearer center (Nashville vs Murfreesboro). Admin allowlist: Ben,
   Denise, Kylie.
10. No Cloudflare Turnstile. Keep double opt-in, the database limiter, the
    disposable-domain blocklist, normalized-email uniqueness, the honeypot,
    the 10-friend cap, and the admin "suspicious" view. Remove Turnstile
    from §4 and §6.
    *(The "suspicious" view became a saved filter in the entries search by
    decision 15.)*
11. After Dec 5, /10years stays live permanently as a thank-you page: the
    10-year message, the winners list, the normal "Talk with our team"
    button. The offer turns off automatically at Dec 5 11:59 pm CT (config
    timestamp, no deploy) and codes stop working at the same moment. No
    redirect.
12. ZIP is collected at entry (5 digits). A ZIP outside Tennessee and its
    bordering states (`ELIGIBLE_STATES` in config: KY, VA, NC, GA, AL, MS,
    AR, MO — Ben, 2026-10-19) gets a polite "neighbors within driving
    distance of our centers" message; no separate residency checkbox. ZIP
    is also used for center routing (out of state: the nearer center by
    the road in), the winner's city (state name when no city is listed),
    and a Franklin-corridor count on the admin dashboard.
    *(Franklin-corridor count cut by decision 15; ZIP is still stored.)*
13. Notify-me signups: the Sunday 6 pm "It's live" email has a one-tap entry
    button (details on file, already verified, so no second verification).
    They get +1 early-bird entry if they tap before Monday's noon drawing.
    One reminder email Monday 9:00 am CT to signups who haven't tapped.
14. The chat assistant is hidden on /10years from Nov 9 through Dec 5 (add
    to ASSISTANT_SUPPRESSED_ROUTES behind those dates), then returns. The
    page gets a short on-page Q&A instead (how entries work, drawing times,
    how winners are contacted, the thank-you offer), driven by the same
    config the drawings use so times can't drift.

**Decisions (Ben, Oct 18 2026, second pass):**
15. **Scope cuts.** Cut from this build (future campaign): the pickup video
    fields (`pickup_video`, `pickup_notes`); the Franklin-corridor count on
    the dashboard (ZIP is stored; query it later); the separate friend-pass
    offer — existing clients get the **same** free-first-visit code and their
    emails add one line: *"Already a client? Forward this to a friend — the
    code works for whoever books with it."* The "I'm already an HBC client"
    checkbox stays (it also picks the prize version, decision 16). One offer
    kind only. Cut the lead stage board in admin; keep offer redemption
    tracking (code → `consultation_requests` row) and a CSV export. Cut the
    "A friend entered" email. Cut the admin "suspicious" view (a saved filter
    in the entries search is enough). The Dec 1 offer reminder stays in the
    plan but is **built after Nov 21**. The daily afternoon email is kept
    but simplified: no winner name, no three-state winner line — *"Today's
    drawing is done and the winner is being called. Next drawing: [day] at
    noon — [next prize]. You have [N] entries. Share your link to add more."*
    The public winners list on /10years keeps the three states.
16. **Prizes.** One winner per drawing gets both the HBC prize and that
    day's partner prize. Each HBC prize has two versions; the winner's "I'm
    already an HBC client" checkbox picks which: Mon new = Brain Map + 2
    sessions | current = 2 sessions; Tue new = Brain Map + 3 sessions |
    current = 3 sessions; Wed new = Brain Map + 4 sessions + Hoolest keychain
    | current = 4 sessions + Hoolest keychain; Thu new = Brain Map + 5
    sessions + Hoolest keychain | current = 5 sessions + Hoolest keychain;
    Fri new = Brain Map + 7 sessions + Hoolest keychain | current = 7
    sessions + Hoolest keychain; Sat GRAND new = Brain Map + 12 sessions +
    Hoolest handheld vagus nerve stimulator (to keep) + one service from
    every partner | current = 13 sessions + the same Hoolest handheld +
    partner services. Every prize session includes the vibro chair. Partner
    prizes: Partner 1–6, smallest Monday to biggest Saturday, all "TBD"; the
    page and emails show a partner prize only once its name is set in
    config; unset = simply not shown. Retail values come from config rates,
    never hand-typed: Brain Map $150, session $125, vibro chair $40 per use,
    Hoolest handheld $429 (UNCONFIRMED), Hoolest keychain retail
    UNCONFIRMED. Practitioner cost $35 per session/map, for the admin cost
    view only. Any prize whose computed retail value is over $600 sets
    `tax_form_required` on the winner; the claim flow and admin show a "tax
    form received" step for those winners.
17. **Saturday is ONE drawing**, the grand prize, at 5:00 pm CT (23:00 UTC),
    pool = every valid entry from the whole week (daily winners included).
    There is no separate Saturday daily. Six drawings total. Ben (or Sheri)
    calls that winner Saturday evening.
18. **Claim deadline:** the 72-hour window still applies, but a winner whose
    deadline would land on Sunday or Monday (Friday's and Saturday's
    winners) gets a deadline of the following Tuesday at 5:00 pm CT.
19. **Concierge:** the 13th-session bonus in the thank-you offer applies to
    the in-center 12-session package only. A Concierge booking gets the free
    first visit (travel fee still applies) and no package bonus.
20. **The thank-you offer stays as decided** (free first visit = Brain Map +
    consultation, book by Dec 5, visit by Dec 31, 13th session free with the
    package). **Option A was chosen so the offer stays at full strength.**

---

## 9. Risks

- **Rules not ready by Nov 9** → notify-me can still go live (it is not a
  sweepstakes entry), but the entry form cannot — and with the one-tap
  design the notify-me form already asks people to accept the rules, so a
  rules change after Nov 9 means the tap records the newer `rules_version`
  and the "It's live" email must say so. Phase 0 is the critical path.
- **A missed or doubled draw** → the schedule table + unique key + per-minute
  job; the test run on Nov 6 proves it, including a deliberately skipped
  minute.
- **Email deliverability spike** (hundreds of verifications, then a daily
  send to every entrant) → Resend plan limits; warm up with notify-me; keep
  the verification email tiny.
- **SMS creeping back in** → the giveaway code imports nothing from
  `lib/sms-*`, no form shows a consent box, and `check:giveaway` asserts the
  Dialpad mock log stays empty for every giveaway path.
- **The Sunday/Monday gap in the claim window** → closed by decision 18:
  Friday's and Saturday's deadlines move to Tuesday 5 pm. Thursday's
  (Sunday noon) moves too. The admin call log still shows who called when;
  the Sunday/Monday attempts are Ben's or Sheri's.
- **Prize values and the tax flag** → two retail values are unconfirmed, so
  `tax_form_required` is computed from the rates as they stand; the flag
  recomputes when the rate changes in config, and the admin shows the value
  it used. A wrong rate before Nov 16 is a config edit and a deploy.
- **Supabase Auth email for the admin code** → the project's built-in mailer
  is rate-limited and may only deliver to project team members; the admin
  login needs custom SMTP in the Supabase dashboard (Resend's SMTP works)
  and an email template that prints `{{ .Token }}`. Listed in the Phase 1
  report.

---

## 10. Scope check for Nov 6

Everything in the plan, ranked from **cut first** (top) to **must have**
(bottom), re-marked after decision 15. Size is the build including its
`check:giveaway` coverage and email preview: S = under half a day, M = one
to two days, L = three days or more.

| # | Piece | Size | Status after decision 15 |
|---|---|---|---|
| 1 | Phone video at pickup (`pickup_video`, notes) | S | **Cut** |
| 2 | Franklin-corridor count on the dashboard | S | **Cut** (ZIP stored) |
| 3 | Friend pass for existing clients (second offer kind) | M | **Cut** → same code + one forward line |
| 4 | Lead stage board in admin | M | **Cut** → redemption tracking + CSV |
| 5 | Daily afternoon email | M→S | **Kept, simplified** (no winner line) |
| 6 | Early-bird +1 entry | S | Kept |
| 7 | Monday 9 am notify-me reminder | S | Kept |
| 8 | Offer reminder email, Dec 1 | S | **After Nov 21** |
| 9 | "A friend entered" email | S | **Cut** |
| 10 | Admin "suspicious" view | S | **Cut** → saved filter in entries search |
| 11 | Re-verify button (recompute the pick from seed + pool) | S | Kept |
| 12 | On-page Q&A driven by config | S | Kept |
| 13 | Public winners list with the three states + public-OK toggle | S | Kept |
| 14 | ZIP → nearer center for offer bookings | S | Kept |
| 15 | Date-gated chat suppression on `/10years` | S | Kept |
| 16 | Tuesday 8:30 "call today" re-send, skipped if contacted | S | Kept |
| 17 | Offer codes + Dec 5 auto-off + `/contact` code validation + "10 years" tag | M | Core |
| 18 | `/unsubscribe` endpoint + `unsubscribed_at` | S | Core (Phase 1) |
| 19 | Privacy policy update | S | Core |
| 20 | One-tap entry from notify-me (signed token, full form at notify-me) | M | Core |
| 21 | Referrals: +3 / +1, cap 10, self-referral voids | M | Core |
| 22 | Winner claim page, deadline rule, call log, tax-form step, redraw from the frozen pool | M | Core |
| 23 | Staff winner alerts (two env vars, To/CC, fallback) | S | Core |
| 24 | Admin login (Supabase OTP + allowlist) + drawings and winners screens | M | Core (login in Phase 1) |
| 25 | Emails on the shared template: ten builders, one [DRAFT] copy file | M | Core (Phase 1) |
| 26 | Drawing engine: six schedule rows, `runDueDrawings` on the per-minute cron, frozen pool, daily-winner exclusion, grand pool, prize version, audit | L | Core |
| 27 | Entry form + double opt-in + database limiter + blocklist + normalized uniqueness + honeypot + TN ZIP check | L | Core |
| 28 | Migration 0010, `env` scoping, `lib/giveaway/config.ts`, `scheduled_sends` | M | Core (Phase 1) |
| 29 | `check:giveaway` harness (compressed week, Dialpad mock asserted empty) | M | Core |
| 30 | Notify-me mode on `/10years` (Nov 9) | M | Core |

**Is the plan realistic for a Nov 6 test run?** With rows 1–4, 9 and 10 cut
and 5 simplified, the remaining work is roughly the three weeks of focused
build the window allows, with Phase 1 landing Oct 18. Phase 0 (counsel's
rules, the two Hoolest values, partner names, the copy deck) stays on the
critical path and outside the build's control. If counsel's rules slip past
Oct 27, the Nov 6 run still proves the engine with placeholder rules text,
but the Nov 9 notify-me page cannot ask anyone to accept rules that do not
exist — that date, not Nov 6, is the one to protect.
