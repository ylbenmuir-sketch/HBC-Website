# 10-Year Anniversary Giveaway — repo inspection and build plan

Planning only (Ben's brief, 2026-10-15, Tier 4). No code is written for this
yet. Read with `BUILD-LOG-2026-10-15.md`.

**Updated 2026-10-18** with Ben's answers to the fourteen open questions
(§8, "Decisions"). Every other section was rewritten to match, so this file
is the single source of truth for the build. §10 is a scope check for the
Nov 6 test run — recommendations only; nothing else in the plan was changed
because of it.

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
| **Mon–Fri, afternoon** | | "Today's winner + next drawing + your share link" email to verified entrants |
| **Sat Nov 21, 5:00 pm** | 23:00 | **Saturday daily AND the grand prize**, drawn together, daily first. Entries close at this moment. Ben (or Sheri) calls both winners that evening |
| **Sun Nov 22** | | Thank-you + offer email to everyone who did not win |
| **to Sat Dec 5, 11:59 pm** | Dec 6 05:59 | **Thank-you offer** window: book by then, visit any date through **Dec 31**. Offer and codes switch off at this timestamp (config, no deploy) |
| **after Dec 5** | | `/10years` stays live permanently as a thank-you page (no redirect) |

Also: referral bonus entries (+3 per verified friend, cap 10 friends); an
admin drawing engine with an audit trail; a lead pipeline from entry to
attended appointment. **Email only — no SMS anywhere** (Dialpad bans
sweepstakes and referral traffic). Winners are called: Monday and Saturday
by Ben (or Sheri), the other days by the front desk. **Both clinics are
unstaffed on Mondays.**

Note on time: US daylight saving ends **Sun Nov 1, 2026**, so the whole
giveaway window is CST (UTC−6). Noon CT = **18:00 UTC**; 5:00 pm CT =
**23:00 UTC**; 6:00 pm CT = **00:00 UTC the next day**.

---

## 2. What already exists to build on

| Need | Already in this repo | Use it how |
|---|---|---|
| Hosting, crons | Vercel Pro project, production from `main`; `vercel.json` already runs `/api/cron/release-held-leads` **every minute** (Tier 1, 2026-10-15) | Drawings and scheduled emails ride the same per-minute pattern: a schedule table + an idempotent "run what is due" job, so DST and a late tick can't skip or double a draw |
| Database | Supabase project `brwyfneahhhkymytkvpx` (RLS on, service-role from route handlers only) | New tables, below. Migrations in `supabase/migrations/` |
| Email | Resend over fetch (`lib/lead-notification.ts`), one branded template (`lib/email/templates.ts`: wordmark, card, footer with the registered identity line, dark mode, one-phone-screen rule), previews via `npm run preview:emails` | Every giveaway email is a new builder on the same `page()`/`section()`/`footer()` pieces. The visitor confirmation (email #1 of the planned sequence) is already built that way |
| Staff routing | `lib/lead-routing.ts` (per-center env vars; **no address is ever written in code**) | Offer bookings use the existing per-center routes, no new route (§4). Winner alerts are not leads: they go to two new env vars read the same way (`GIVEAWAY_ALERTS`, `GIVEAWAY_ALERTS_OWNER`, §4) |
| Leads table | `consultation_requests` (form + chat); held-email + audit columns; `referred_by` (0007) | An offer booking becomes a row here with `source = 'giveaway'` and the office gets the normal lead email, tagged "10 years". Needs one check-constraint change (`source in ('form','chat')` today) |
| Abuse controls | Honeypot on forms; in-memory rate limit for chat (`lib/chat/rate-limit.ts`) | In-memory is per instance on Vercel — the giveaway needs a **database-backed** limiter (below) |
| Test harness | `check:contact` (Chrome over CDP, mock Resend/platform/Dialpad, live DB with fingerprinted real rows), `LEAD_HOLD_ENV`-style env scoping | `check:giveaway` on the same pattern; giveaway rows carry an `env` column so a test run can never draw from or email real entrants |
| Admin auth | **None on the website.** The platform (`hbc-platform`) uses Clerk for practitioners | See §5 — Supabase Auth email-OTP with a staff allowlist (Ben, Denise, Kylie), not Clerk on the website |
| Chat suppression | `ASSISTANT_SUPPRESSED_ROUTES` in `lib/site-config.ts` — a static list of path prefixes (`/contact`) with no dates | Needs a date-gated entry for `/10years` (§6). Small change, same file |
| SMS | `lib/sms-confirmation.ts`, `lib/sms-consent.ts` (Dialpad) | **Not used. Not imported. No consent checkbox on any giveaway form.** No SMS abstraction is designed here |

---

## 3. Data model (one migration, `0010_giveaway.sql`)

All tables RLS-on with no policies (service role only), all with
`env text not null` (`production` / `preview` / `local` / `test`) so test
runs are isolated by construction.

- **`giveaway_people`** — one row per verified person.
  `id, env, email (normalized: lower-case; Gmail dots and +tags folded),
  email_display, first_name, last_name, zip (5 digits, Tennessee), city
  (from ZIP, for the public winner line), nearest_center ('nashville' |
  'murfreesboro', from ZIP), is_existing_client bool (the "I'm already an HBC
  client" checkbox), age_confirmed bool, rules_accepted_at, rules_version,
  verified_at, referral_code (unique, short, unguessable),
  referred_by_person_id, source_page, ip_hash, ua_hash, marketing_opt_in
  bool + wording + at, unsubscribed_at, created_at`.
- **`giveaway_notify`** — notify-me signups before Nov 15. Because the
  "It's live" email has a **one-tap** entry button, the notify-me form
  collects the **full entry set** (name, email, ZIP, 18+, rules accepted,
  existing-client box, optional marketing opt-in) and the row holds it:
  `email (normalized), fields as above, verified_at, live_token (signed,
  single-use), sent_live_at, reminded_at, tapped_at, person_id`. The tap
  converts the row into a `giveaway_people` row + base entry with no second
  verification. Nobody is entered without their own tap.
- **`giveaway_entries`** — the ledger of chances. `id, env, person_id, kind
  ('base' | 'early_bird' | 'referral_bonus' | 'referred_bonus' | 'amoe'),
  referral_person_id, created_at, void_reason`. Weights are row counts;
  nothing is a mutable counter. One `base` per person for the week; one
  `early_bird` for a notify-me signup who taps before Monday noon; three
  `referral_bonus` rows per credited friend (cap: ten friends); one
  `referred_bonus` for entering via a referral link.
- **`giveaway_drawings`** — the schedule and the result. `id, env,
  scheduled_at (timestamptz), prize_id, kind ('daily' | 'grand'), status
  ('scheduled' | 'drawn' | 'redrawn' | 'void'), pool_snapshot_hash,
  pool_size, entries_count, seed (crypto random, stored), winner_entry_id,
  winner_person_id, drawn_at, drawn_by ('cron' | admin user id)`. Unique on
  `(env, scheduled_at, kind)` — the idempotency key: a second run finds it
  drawn and does nothing. Seven rows: six daily (Mon–Fri noon, Sat 5 pm)
  and one grand (Sat 5 pm, drawn after the daily).
- **`giveaway_drawing_pool`** — the frozen pool for each drawing (drawing_id,
  entry_id, person_id). Written in the same transaction as the draw, so the
  result can be re-verified later from the stored seed and pool, and a
  redraw picks from the same pool.
- **`giveaway_winners`** — one row per drawing result (also the redraw
  history): `drawing_id, person_id, claim_token, phone, status ('drawn' |
  'contacted' | 'claimed' | 'unreachable' | 'declined' | 'ineligible' |
  'redrawn'), claim_deadline_at (draw + 72 h), call_attempts jsonb (when,
  who, outcome), contacted_at, claimed_at, public_ok bool (default false),
  public_ok_at, public_label ("Jane D., Franklin" — computed, stored at OK
  time), pickup_video bool, pickup_notes`.
- **`giveaway_audit`** — append-only: every draw, redraw (with reason:
  unreachable / ineligible / declined), void, admin login, CSV export, entry
  void, prize edit, public-OK toggle — who, when, what, before/after.
- **`giveaway_prizes`** — name, description, ARV, which drawing, fulfilment
  status.
- **`giveaway_offers`** — one row per person: `person_id, kind
  ('free_first_visit' | 'friend_pass'), code (personal, unguessable),
  issued_at, expires_at (Dec 5 23:59 CT), redeemed_at,
  consultation_request_id, redeemed_center`. `free_first_visit` for every
  verified entrant, referred friend and verified notify-me signup;
  `friend_pass` instead when `is_existing_client` is true (one per existing
  client; the friend who books need not be an entrant).
- **`giveaway_leads`** (or columns on `giveaway_people`) — the pipeline:
  `stage ('entered' | 'offer_claimed' | 'call_requested' | 'called' |
  'brain_map_booked' | 'attended' | 'not_a_fit' | 'no_response')`,
  `consultation_request_id`, `offer_id`, timestamps per stage, notes.
- **`rate_limits`** — `(bucket text, key_hash text, window_start, count)` for
  the database-backed limiter.
- **`scheduled_sends`** — the email schedule the per-minute job drains:
  `(env, kind, due_at, person_id | null, sent_at, skipped_reason)`. Holds the
  Sunday "It's live", the Monday 9 am reminder, the daily afternoon emails,
  the Tuesday "call today" re-send, the Nov 22 thank-you and the Dec 1
  reminder. Unique on `(env, kind, due_at, person_id)`.

The drawing is a weighted pick from the frozen pool with `crypto.randomInt`
(Node), seed stored. Eligibility rules (decisions 1, 2, 4): every valid entry
counts in every drawing still to come; a **daily winner's entries leave the
pool of later daily drawings** but stay in the grand-prize pool; the grand
pool is every valid entry from the whole week, referral and early-bird
bonuses included.

---

## 4. Flows

### Timing config (one place)
`lib/giveaway/config.ts` holds every timestamp above as a constant (UTC
instants with the CT label beside each): notify-me start, entries open,
each drawing, the daily email time, the Monday reminder, the Tuesday
re-send, the offer end, the chat-suppression window. The migration seed for
`giveaway_drawings` and `scheduled_sends` is generated from it, the page's
on-page Q&A and countdowns read it, and `assistantSuppressedOn()` reads it —
so a time can only be wrong in one place. The admin dashboard shows a
warning if a `giveaway_drawings` row and the config disagree.

### Notify-me (Nov 9 – Nov 15)
`/10years` in notify-me mode shows the 10-year message, the schedule and the
**full entry form** (so the Sunday tap can be one tap): first and last name,
email, ZIP (5 digits), "I'm 18 or older", "I've read the Official Rules"
(link), optional "I'm already an HBC client", optional marketing opt-in
(unticked). Honeypot. Submit → verification email → the click sets
`verified_at`. A non-Tennessee ZIP gets a polite "this one's for Tennessee
residents" message and no row.

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

**Existing clients:** the "I'm already an HBC client" box flips the person
to the friend pass (§ Lead pipeline). They still enter and can still win.

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
  **12:00 pm CT Mon Nov 16 – Fri Nov 20**; Saturday Nov 21 at **5:00 pm CT**
  two rows, the Saturday daily and the grand prize, run in that order in the
  same tick.
- The existing per-minute cron (or a second route on the same schedule) runs
  `runDueDrawings()`: for each `scheduled` row past `scheduled_at` in its env,
  in one transaction: build the pool (all non-void entries; for a **daily**
  drawing minus the entries of anyone who already holds a daily win; for the
  **grand** drawing, everyone), freeze it, hash it, draw, record winner, write
  `giveaway_winners` with a 72-hour deadline, audit. Idempotent on the
  unique key; a missed minute is caught the next.
- Admin can also press "Draw now" for a slot whose time has passed (audited
  as the admin), and "Redraw" with a required reason. A redraw picks from
  **that drawing's frozen pool**, minus the previous pick and minus anyone
  who has won a daily prize since (daily drawings only).
- After a draw: **staff alert** — to `GIVEAWAY_ALERTS` (Denise; cc Ben and
  Kylie) for Tue–Fri drawings, to `GIVEAWAY_ALERTS_OWNER` (Ben; cc Denise)
  for the Monday and both Saturday drawings. Same first-address-is-To,
  rest-are-CC format as the lead routes; both fall back to `LEADS_FALLBACK`
  with a logged warning. Contents: winner's name, email, ZIP + city, the
  prize, the claim deadline, the admin link. Then the winner email (below).
  Nothing public until the winner says OK.

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
first name, last initial and city. **Claim window: 72 hours from the draw.**
Three call attempts, one per day, voicemail each time, logged in admin with
who and when. Outcome recorded (`claimed`, `declined`, `unreachable`).
**Unreachable after 72 hours → audited redraw** from that drawing's frozen
pool. Note the calendar: the Friday noon and Saturday 5 pm windows run
through Sunday and the unstaffed Monday, so those attempts are Ben's or
Sheri's; the Saturday window ends Tuesday Nov 24 at 5 pm CT.

### Public winners list
On the claim call the winner is asked for the OK; admin has a **"public OK"
toggle per winner** (audited). The `/10years` winners list and the daily
email show, per drawing, one of three states: **named** ("Jane D.,
Franklin" — first name, last initial, city from ZIP) when `public_ok` is on;
**"[Day]'s winner: claimed ✓"** when contacted or claimed without the OK;
**"[Day]'s winner has been drawn — we're reaching them now"** before
contact. Staff may optionally ask for a short phone video at prize pickup
(never required; `pickup_video` is a note, not a gate).

### Lead pipeline: entry → attended
- **The thank-you offer, "Your first visit is on us":** a free Brain Map +
  consultation (normally $150). Must be **booked by Dec 5 at 11:59 pm CT**;
  the visit may be any date through **Dec 31**. **Bonus:** start the
  12-session package at that first visit and get a **13th session free**
  ($125 value). One per person, both centers, no cap. **Concierge:** the
  visit is free, the $100 travel fee still applies (whether the package
  bonus applies to concierge is the same open fact as `CONCIERGE_PACKAGE` in
  `lib/site-config.ts` — unconfirmed there today). Goes to all verified
  entrants, referred friends and verified notify-me signups.
- **Existing clients** get a **"free first visit for a friend" pass**
  instead (one per existing client): same terms, the friend books with the
  client's code. Their emails carry the pass copy, not the free-visit copy.
- Every offer carries a **personal code** (`giveaway_offers.code`); the code
  and the offer switch off at the Dec 5 timestamp from the config — the
  claim page then says the window has closed and the normal "Talk with our
  team" button remains.
- "Book my free visit" from any giveaway email → the existing `/contact`
  flow with `?from=10years&code=<offer>`; the consultation POST validates
  the code, records `source = 'giveaway'` and `source_page`, and the
  `giveaway_leads` row moves to `call_requested` (linked to
  `consultation_requests.id`). **Routing: the existing per-center lead
  routing, no new route**, with the center chosen from ZIP (nearer of
  Nashville and Murfreesboro by ZIP centroid; unknown ZIP → today's
  fallback). The office gets the normal lead email (held/one-email rules
  apply), subject tagged **"10 years"**, and the booking is tagged "10
  years" in the platform.
- Admin moves the stage: `called` → `brain_map_booked` → `attended` (or
  `not_a_fit` / `no_response`). Funnel counts on the admin dashboard and in
  a CSV export. (Until the HBC platform is finished, stage updates are manual;
  later the platform can post them back.)

### Emails (Resend, the shared template; every one previewed at 390/640)
1. Notify-me confirmation (verify) ·
2. **"It's live"** (Sun Nov 15, 6:00 pm CT, to verified notify-me signups;
   one-tap entry button) ·
3. **Notify-me reminder** (Mon Nov 16, 9:00 am CT, to signups who have not
   tapped) ·
4. Entry verification ·
5. "You're in" + your referral link + the thank-you offer (or the friend
   pass) ·
6. "A friend entered — +3 entries" (and the friend's "+1 for entering via a
   link" line in their "You're in") ·
7. **Daily "Today's winner + next drawing + your share link"** (Mon–Fri
   afternoon, 4:00 pm CT, to verified entrants; the winner line follows the
   three states above; Saturday's slot is email 9) ·
8. Winner (with the claim link) ·
9. Non-winner thank-you + offer (Sun Nov 22) ·
10. Offer reminder (Dec 1) ·
11. Staff: winner drawn ·
12. Staff: Tuesday "call today" for Monday's winner (skipped if contacted).
**Marketing emails (2, 3, 7, 9, 10) carry an unsubscribe link** (own
`/unsubscribe` endpoint writing `unsubscribed_at`; nothing of the kind exists
on the site today) and the registered identity line (CAN-SPAM). The week's
emails go to every verified entrant who has not unsubscribed — the rules
disclose them as part of entering; the separate marketing opt-in box governs
HBC news after Dec 5. Each email needs a held-for-review copy deck before
it's built.

### Anti-fraud and rate limiting
Database-backed limiter: per IP hash (e.g. 5 entry attempts / hour), per
email (1 verification email / 10 min), per referral code (the ten-friend
cap). Double opt-in. Disposable-domain blocklist. Normalized email
uniqueness (one person, one base entry). Honeypot. Admin "suspicious" view:
many entries from one IP hash, referral bursts. **No Cloudflare Turnstile**
(decision 10) — no third party is added, and the privacy policy change in §6
is about the giveaway data only.

---

## 5. Admin

`/admin/10years` on the website, server-rendered, never cached, `noindex`.
**Auth: Supabase Auth email one-time code** limited to an allowlist of staff
emails (a `staff_allowlist` table) — the website already talks to Supabase
and has no auth library; adding Clerk (the platform's) to the website is a
bigger dependency for a six-week feature. **Allowlist: Ben, Denise, Kylie**
(addresses seeded from env, never written in code). Every admin action is
written to `giveaway_audit` with the staff email.

Screens: dashboard (entries/day, verified %, referrals, offer claims,
funnel, a **Franklin-corridor count** from ZIP — the ZIP list is a config
constant for Ben to confirm: Franklin 37064–37069, Brentwood 37027,
Nolensville 37135, Thompson's Station 37179, Spring Hill 37174, College
Grove 37046), drawings (schedule, pool size, Draw now, Redraw with reason,
audit trail per drawing, re-verify button that recomputes the pick from
stored seed + pool), winners (claim status, call log with the three
attempts, **public OK toggle**, pickup notes), entries (search, void with
reason), leads (stage board), exports (CSV, audited).

---

## 6. Things that change outside the feature

- `/privacy-policy`: what the giveaway collects (name, email, ZIP, age
  confirmation, existing-client flag, referral relationships, IP hash), the
  emails and the unsubscribe, retention for giveaway data. No new third
  party (no Turnstile). **Same commit as the feature.**
- `consultation_requests` source check constraint: add `'giveaway'` (today
  `check (source in ('form','chat'))`, migration 0002) — decide in Phase 1
  whether that or `form` + `source_page` + the offer code.
- `ASSISTANT_SUPPRESSED_ROUTES` (`lib/site-config.ts`): today a static list
  of path prefixes. Becomes entries with an optional window, and `/10years`
  is suppressed **from Nov 9 00:00 CT through Dec 5 11:59 pm CT** (the
  window comes from `lib/giveaway/config.ts`), then the assistant returns.
  During the window the page carries a short **on-page Q&A** instead (how
  entries work, drawing times, how winners are contacted, the thank-you
  offer), rendered from the same config so times can't drift.
- Sitemap: `/10years` in; `/10years/claim/*`, `/10years/enter/*`,
  `/unsubscribe` and `/admin/*` out, `noindex`.

---

## 7. Phases

| Phase | Done by | Contents |
|---|---|---|
| **0 — decisions** | Tue Oct 27 | **Ben's 14 decisions: done (Oct 18, §8).** Still open: counsel returns official rules; prize descriptions and ARVs; email copy decks approved (twelve emails, §4) |
| **1 — foundations** | Fri Oct 30 | Migration 0010 (applied by Ben or via MCP with permission); `lib/giveaway/config.ts`; env-scoped store; limiter; staff allowlist + admin login; email builders + previews; `/unsubscribe` |
| **2 — notify-me** | Tue Nov 3 | `/10years` in notify-me mode (date-switched by config, not by deploy) with the full entry form; notify signup + verify; privacy policy update; date-gated chat suppression + on-page Q&A; `check:giveaway` part 1 |
| **3 — giveaway + engine** | Thu Nov 5 | Entry + double opt-in; one-tap entry from notify-me + early bird; referrals (+3 / +1, cap 10); drawings schedule + `runDueDrawings` on the per-minute cron (daily-winner exclusion, grand pool); `scheduled_sends`; winner claim page + 72-hour window + redraw; public-OK state; admin screens; offer codes (two kinds, Dec 5 cut-off); ZIP → center; lead stages |
| **4 — test-mode run** | **Fri Nov 6** | A full compressed week on a preview deployment, `env = test`: notify-me → "It's live" tap (early bird) → 6 daily drawings + grand prize scheduled minutes apart → daily emails → winners → a Monday winner marked contacted (Tuesday re-send skipped) → one unreachable → redraw → offer claims (both kinds) → leads to `attended` → Dec 5 cut-off; Resend mocked; Dialpad mock log empty; audit re-verified; then the same checks against production with `env = test` rows only |
| **5 — notify-me live** | **Mon Nov 9** | Switch on; chat hidden on `/10years`; monitor verifications |
| **6 — giveaway week** | **Sun Nov 15 6 pm – Sat Nov 21 5 pm** | Sunday: "It's live" send. Daily: watch the noon draw, the alert, the 4 pm email; Monday: Ben calls; Tuesday 8:30 re-send if needed; Saturday 5 pm: daily + grand, Ben/Sheri call; redraws as needed |
| **7 — offer window** | to **Sat Dec 5** | Nov 22 thank-you; reminder Dec 1; pipeline follow-up; the offer and codes close themselves at Dec 5 23:59 CT; chat returns to `/10years` |
| **8 — wrap-up** | Dec 7 | Funnel report; retention per the rules; `/10years` stays as the permanent thank-you page (10-year message, winners list, "Talk with our team") |

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
2. **Eligibility**: age (18+?), geography (Tennessee only is the simplest —
   some states, e.g. New York and Florida, impose registration and bonding
   for prize values above set thresholds), employee/family exclusions,
   existing clients eligible?
3. **Prize descriptions and approximate retail values** for each daily
   drawing and the grand prize; tax note (a prize worth $600+ may mean a
   1099 — confirm with the accountant).
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
5. Entries open Sunday Nov 15 at 6:00 pm CT (the "It's live" email goes out
   then). Monday's noon drawing runs; Ben calls the Monday winner Monday
   afternoon. Fallback: front desk calls Tuesday morning; keep the Tuesday
   8:30 am CT "call today" staff re-send, but only if the Monday winner is
   not marked contacted.
6. Claim: 72 hours from the draw, 3 call attempts (one per day, voicemail
   each time) plus the winner email with the claim link. Unreachable after
   72 hours → audited redraw from that drawing's frozen pool.
7. Winners are announced publicly as first name + last initial + city (city
   from ZIP), only after the winner says OK on the claim call. If not OK,
   show "[Day]'s winner: claimed ✓". Admin gets a "public OK" toggle per
   winner. Staff may optionally ask for a short phone video at prize pickup
   (never required).
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
9. Routing: winner alerts to Denise, cc Ben and Kylie. Monday and Saturday
   winners: to Ben first, cc Denise. Offer bookings go through the existing
   per-center lead routing (no new route), tagged "10 years". Use ZIP to
   pick the nearer center (Nashville vs Murfreesboro). Admin allowlist: Ben,
   Denise, Kylie.
10. No Cloudflare Turnstile. Keep double opt-in, the database limiter, the
    disposable-domain blocklist, normalized-email uniqueness, the honeypot,
    the 10-friend cap, and the admin "suspicious" view. Remove Turnstile
    from §4 and §6.
11. After Dec 5, /10years stays live permanently as a thank-you page: the
    10-year message, the winners list, the normal "Talk with our team"
    button. The offer turns off automatically at Dec 5 11:59 pm CT (config
    timestamp, no deploy) and codes stop working at the same moment. No
    redirect.
12. ZIP is collected at entry (5 digits). Non-Tennessee ZIPs get a polite
    "this one's for Tennessee residents" message; no separate residency
    checkbox. ZIP is also used for center routing, the winner's city, and a
    Franklin-corridor count on the admin dashboard.
13. Notify-me signups: the Sunday 6 pm "It's live" email has a one-tap entry
    button (details on file, already verified, so no second verification).
    They get +1 early-bird entry if they tap before Monday's noon drawing.
    One reminder email Monday 9:00 am CT to signups who haven't tapped.
14. The chat assistant is hidden on /10years from Nov 9 through Dec 5 (add
    to ASSISTANT_SUPPRESSED_ROUTES behind those dates), then returns. The
    page gets a short on-page Q&A instead (how entries work, drawing times,
    how winners are contacted, the thank-you offer), driven by the same
    config the drawings use so times can't drift.

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
- **The Sunday/Monday gap in the claim window** → Friday's and Saturday's
  winners are Ben's or Sheri's calls until Tuesday; the admin call log
  makes that visible.

---

## 10. Scope check for Nov 6

Everything in the plan, ranked from **cut first** (top) to **must have**
(bottom). Size is the build including its `check:giveaway` coverage and
email preview: S = under half a day, M = one to two days, L = three days or
more. Recommendations only; nothing above was changed because of this list.

| # | Piece | Size | Cut-first reason |
|---|---|---|---|
| 1 | Phone video at pickup (`pickup_video`, notes) | S | Operational, not software; a notes field in admin covers it |
| 2 | Franklin-corridor count on the dashboard | S | Nice-to-know; the ZIP is stored, so the count can be run as SQL any time |
| 3 | Friend pass for existing clients (second offer kind, checkbox, second email copy) | M | Doubles the offer logic and copy for a group that already knows HBC; an existing client could get the plain offer email with one "share it with a friend" line |
| 4 | Lead stage board in admin (`called` → `attended`) | M | Manual anyway until the platform posts back; a CSV export with the offer code does the same for December |
| 5 | Daily afternoon "Today's winner" email (five sends, three-state winner line, copy deck) | M | The share link is already in "You're in"; the public winners list on the page shows the same thing |
| 6 | Early-bird +1 entry | S | A fourth entry kind and a time comparison for a small nudge; the one-tap button is the real conversion lever |
| 7 | Monday 9 am notify-me reminder | S | One more scheduled send and copy deck; the "It's live" link works all week anyway |
| 8 | Offer reminder email, Dec 1 | S | Cheap, but it is a December job and can be built after Nov 21 |
| 9 | "A friend entered" email | S | The count is visible in the next daily email or on the page |
| 10 | Admin "suspicious" view | S | The data is in the entries table; a query in the admin entries search covers week one |
| 11 | Re-verify button (recompute the pick from seed + pool) | S | Cheap given the stored seed; keep if the engine lands early |
| 12 | On-page Q&A driven by config | S | Cheap and it replaces the chat; keep unless the week is lost |
| 13 | Public winners list with the three states + public-OK toggle | S | Needed once the first winner says OK; the toggle is one column and one button |
| 14 | ZIP → nearer center for offer bookings | S | A small table; without it bookings use today's fallback route, which still reaches the office |
| 15 | Date-gated chat suppression on `/10years` | S | One entry and a window check in `site-config.ts` |
| 16 | Tuesday 8:30 "call today" re-send, skipped if contacted | S | Part of the scheduled-sends job once that exists |
| 17 | Offer codes + Dec 5 auto-off + `/contact` code validation + "10 years" tag | M | The whole point of the lead pipeline; without it the offer is a coupon nobody can track |
| 18 | `/unsubscribe` endpoint + `unsubscribed_at` | S | Required by law for emails 2, 3, 7, 9, 10; must ship with the first marketing send |
| 19 | Privacy policy update | S | Same commit as the feature |
| 20 | One-tap entry from notify-me (signed token, full form at notify-me) | M | Decision 13 depends on it; without it notify-me signups re-enter by hand on the form |
| 21 | Referrals: +3 / +1, cap 10, self-referral voids | M | Core mechanic of the campaign |
| 22 | Winner claim page, 72-hour window, call log, redraw from the frozen pool | M | Without it winners are tracked in email threads and a redraw is not auditable |
| 23 | Staff winner alerts (two env vars, To/CC, fallback) | S | Someone has to be told |
| 24 | Admin login (Supabase OTP + allowlist) + drawings and winners screens | M | No admin means no Draw now, no redraw, no public OK, no contacted mark |
| 25 | Emails on the shared template: verify, "You're in", winner, staff alert, "It's live", thank-you | M | Six are the floor; each needs a copy deck first |
| 26 | Drawing engine: schedule rows, `runDueDrawings` on the per-minute cron, frozen pool, daily-winner exclusion, grand pool, audit | L | The giveaway |
| 27 | Entry form + double opt-in + database limiter + blocklist + normalized uniqueness + honeypot + TN ZIP check | L | No valid entries without it |
| 28 | Migration 0010, `env` scoping, `lib/giveaway/config.ts`, `scheduled_sends` | M | Everything sits on it |
| 29 | `check:giveaway` harness (compressed week, Dialpad mock asserted empty) | M | The Nov 6 deliverable is the test run itself |
| 30 | Notify-me mode on `/10years` (Nov 9) | M | First public date |

**Is the full plan realistic for a Nov 6 test run?** Not as written. Nov 6
is nineteen days from today, the site's own DNS cutover is this coming
Monday, and Phase 0 (counsel's rules, prize ARVs, twelve copy decks) is on
the critical path and not under the build's control. Rows 17–30 are the
core: roughly three weeks of focused work for one builder, which is the
whole window. Rows 1–16 add about a week on top. Recommendation: hold the
Nov 6 test run to rows 17–30 plus whatever of 11–16 is already done; land
rows 5–10 by **Fri Nov 13** (before entries open) or cut them; cut rows 1–4
from this build and revisit for a future campaign. If counsel's rules slip
past Oct 27, the Nov 6 run still proves the engine with placeholder rules
text, but the Nov 9 notify-me page cannot ask anyone to accept rules that
do not exist — that date, not Nov 6, is the one to protect.
