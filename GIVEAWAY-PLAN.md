# 10-Year Anniversary Giveaway — repo inspection and build plan

Planning only (Ben's brief, 2026-10-15, Tier 4). No code is written for this
yet. Read with `BUILD-LOG-2026-10-15.md`.

**Searched for an existing spec first:** nothing. No giveaway, sweepstakes,
anniversary, `/10years` or drawing notes exist in this repo, the older
checkout (`hbc-website-v2_4`), or `hbc-platform/context` (plans and logs).
The only "drawing" hits are the client drawing wall at Nashville. Everything
below comes from the brief and from what the code already does.

---

## 1. What it has to do (the brief)

| When (Central) | What |
|---|---|
| **Fri Nov 6, 2026** | A full **test-mode** run works end to end |
| **Mon Nov 9** | `/10years` live in **notify-me** mode |
| **Mon Nov 16 – Sat Nov 21** | **Giveaway week**: one drawing a day at **7:00 pm CT**, plus a **Saturday grand prize** |
| **to Sat Dec 5** | **Thank-you offer** window |

Also: referral bonus entries; an admin drawing engine with an audit trail; a
lead pipeline from entry to attended appointment. **Email only — no SMS
anywhere** (Dialpad bans sweepstakes and referral traffic). Winners are
called by the front desk. **Both clinics are unstaffed on Mondays.**

Note on time: US daylight saving ends **Sun Nov 1, 2026**, so the whole
giveaway week is CST (UTC−6). 7:00 pm CT = **01:00 UTC the next day**.

---

## 2. What already exists to build on

| Need | Already in this repo | Use it how |
|---|---|---|
| Hosting, crons | Vercel Pro project, production from `main`; `vercel.json` already runs `/api/cron/release-held-leads` **every minute** (Tier 1, 2026-10-15) | Drawings ride the same per-minute pattern: a schedule table + an idempotent "run what is due" job, so DST and a late tick can't skip or double a draw |
| Database | Supabase project `brwyfneahhhkymytkvpx` (RLS on, service-role from route handlers only) | New tables, below. Migrations in `supabase/migrations/` |
| Email | Resend over fetch (`lib/lead-notification.ts`), one branded template (`lib/email/templates.ts`: wordmark, card, footer with the registered identity line, dark mode, one-phone-screen rule), previews via `npm run preview:emails` | Every giveaway email is a new builder on the same `page()`/`section()`/`footer()` pieces. The visitor confirmation (email #1 of the planned sequence) is already built that way |
| Staff routing | `lib/lead-routing.ts` (per-center env vars) | Winner and lead notifications to the front desk use it; add a `LEADS_GIVEAWAY` route (falls back like the others) |
| Leads table | `consultation_requests` (form + chat); held-email + audit columns | An entrant who asks for a call becomes a row here with `source = 'giveaway'` — the existing pipeline then emails the office. Needs one check-constraint change |
| Abuse controls | Honeypot on forms; in-memory rate limit for chat (`lib/chat/rate-limit.ts`) | In-memory is per instance on Vercel — the giveaway needs a **database-backed** limiter (below) |
| Test harness | `check:contact` (Chrome over CDP, mock Resend/platform/Dialpad, live DB with fingerprinted real rows), `LEAD_HOLD_ENV`-style env scoping | `check:giveaway` on the same pattern; giveaway rows carry an `env` column so a test run can never draw from or email real entrants |
| Admin auth | **None on the website.** The platform (`hbc-platform`) uses Clerk for practitioners | See §5 — recommend Supabase Auth email-OTP with a staff allowlist, not Clerk on the website |
| SMS | `lib/sms-confirmation.ts`, `lib/sms-consent.ts` (Dialpad) | **Not used. Not imported. No consent checkbox on any giveaway form.** No SMS abstraction is designed here |

---

## 3. Data model (one migration, `0010_giveaway.sql`)

All tables RLS-on with no policies (service role only), all with
`env text not null` (`production` / `preview` / `local` / `test`) so test
runs are isolated by construction.

- **`giveaway_people`** — one row per verified person.
  `id, env, email (normalized: lower-case; Gmail dots and +tags folded),
  email_display, first_name, last_name, zip, age_confirmed bool,
  rules_accepted_at, rules_version, verified_at, referral_code (unique, short,
  unguessable), referred_by_person_id, source_page, ip_hash, ua_hash,
  marketing_opt_in bool + wording + at, unsubscribed_at, created_at`.
- **`giveaway_notify`** — notify-me signups before Nov 16 (email, verified_at,
  sent_live_at). Converted into an entry only by the person's own action.
- **`giveaway_entries`** — the ledger of chances. `id, env, person_id, kind
  ('base' | 'referral_bonus' | 'amoe'), referral_person_id, created_at,
  void_reason`. Weights are row counts; nothing is a mutable counter.
- **`giveaway_drawings`** — the schedule and the result. `id, env,
  scheduled_at (timestamptz), prize_id, kind ('daily' | 'grand'), status
  ('scheduled' | 'drawn' | 'redrawn' | 'void'), pool_snapshot_hash,
  pool_size, entries_count, seed (crypto random, stored), winner_entry_id,
  winner_person_id, drawn_at, drawn_by ('cron' | admin user id)`. Unique on
  `(env, scheduled_at, kind)` — the idempotency key: a second run finds it
  drawn and does nothing.
- **`giveaway_drawing_pool`** — the frozen pool for each drawing (drawing_id,
  entry_id, person_id). Written in the same transaction as the draw, so the
  result can be re-verified later from the stored seed and pool.
- **`giveaway_audit`** — append-only: every draw, redraw (with reason:
  unreachable / ineligible / declined), void, admin login, CSV export, entry
  void, prize edit — who, when, what, before/after.
- **`giveaway_prizes`** — name, description, ARV, which drawing, fulfilment
  status.
- **`giveaway_leads`** (or columns on `giveaway_people`) — the pipeline:
  `stage ('entered' | 'offer_claimed' | 'call_requested' | 'called' |
  'brain_map_booked' | 'attended' | 'not_a_fit' | 'no_response')`,
  `consultation_request_id`, `offer_code`, timestamps per stage, notes.
- **`rate_limits`** — `(bucket text, key_hash text, window_start, count)` for
  the database-backed limiter.

The drawing is a weighted pick from the frozen pool with `crypto.randomInt`
(Node), seed stored. **Whether a person's entries carry over to later days,
and whether a daily winner stays eligible for later days and the grand
prize, are open questions (§8)** — the model supports either.

---

## 4. Flows

### Entry (Nov 16–21)
`/10years` form: first and last name, email, ZIP, "I'm 18 or older", "I've
read the Official Rules" (link), optional marketing opt-in (unticked). No
phone field at entry (no SMS, and the front desk gets the phone only from a
winner or someone who asks for a call). Honeypot. Submit → **double opt-in
email** (Resend) → the click verifies and creates the base entry. Unverified
addresses never enter a draw. Referral link `/10years?ref=<code>` stored on
the visit (cookie-free: carried in the form as a hidden field from the URL).

### Referral bonus
When a referred person **verifies**, the referrer gets N bonus entries
(owner sets N and a cap). Not for self-referral: same normalized email, same
`ip_hash` + `ua_hash` pair within a window, or a disposable-domain email,
voids the bonus (logged, not silently dropped).

### No purchase necessary / AMOE
An alternative method of entry that does not require a referral or any
purchase — the base entry already needs nothing bought, which covers most of
it; the official rules must say so and give a mail-in or plain-form route if
counsel wants one (`kind = 'amoe'`).

### Drawings (the engine)
- A `giveaway_drawings` row per slot, created by the migration/seed with
  `scheduled_at` = 7:00 pm CT each day Nov 16–21, and the grand prize on
  Sat Nov 21 (time per §8).
- The existing per-minute cron (or a second route on the same schedule) runs
  `runDueDrawings()`: for each `scheduled` row past `scheduled_at` in its env,
  in one transaction: freeze the pool, hash it, draw, record winner, audit.
  Idempotent on the unique key; a missed minute is caught the next.
- Admin can also press "Draw now" for a slot whose time has passed (audited
  as the admin), and "Redraw" with a required reason.
- After a draw: staff email to the front desk (route `LEADS_GIVEAWAY`):
  winner's name, email, ZIP, the prize, the call deadline. Winner email
  (below). Nothing public until the winner confirms.

### Monday (clinics unstaffed)
Monday's 7:00 pm drawing still runs. The winner email says the front desk
will call **Tuesday morning**; the staff notification is sent Monday night
**and** re-sent Tuesday 8:30 am CT as "call today" (a scheduled send on the
same per-minute job). Alternatives for Ben in §8 (move Monday's drawing to
Tuesday morning, or combine Monday + Tuesday at Tuesday 7 pm).

### Winner contact
Email at draw time ("You won — we'll call you to arrange it; reply with the
best number"). The phone number comes from the winner's reply or a one-field
claim page (`/10years/claim/<token>`). Front desk calls; outcome recorded in
admin (`claimed`, `unreachable after N tries`, `declined`) — unreachable past
the claim deadline triggers an audited redraw.

### Lead pipeline: entry → attended
- Every confirmation and the Nov 22 thank-you email carry the **thank-you
  offer** (owner defines it) with a personal code, valid to **Dec 5**.
- "Book my free call" from any giveaway email → the existing `/contact` flow
  with `?from=10years&code=<offer>`; the consultation POST records
  `source_page`, and a `giveaway_leads` row moves to `call_requested`
  (linked to `consultation_requests.id`). The office gets the normal lead
  email (held/one-email rules apply), tagged "10 years".
- Admin moves the stage: `called` → `brain_map_booked` → `attended` (or
  `not_a_fit` / `no_response`). Funnel counts on the admin dashboard and in
  a CSV export. (Until the HBC platform is finished, stage updates are manual;
  later the platform can post them back.)

### Emails (Resend, the shared template; every one previewed at 390/640)
1. Notify-me confirmation (verify) · 2. "It's live" (Nov 16, to verified
notify-me signups) · 3. Entry verification · 4. "You're in" + your referral
link + the thank-you offer · 5. "A friend entered — +N entries" · 6. Winner ·
7. Non-winner thank-you + offer (Nov 22) · 8. Offer reminder (e.g. Dec 1) ·
9. Staff: winner drawn · 10. Staff: Tuesday "call today" for Monday's winner.
Marketing emails (2, 7, 8) carry an unsubscribe link (own `/unsubscribe`
endpoint writing `unsubscribed_at`) and the registered identity line
(CAN-SPAM). Each needs a held-for-review copy deck before it's built.

### Anti-fraud and rate limiting
Database-backed limiter: per IP hash (e.g. 5 entry attempts / hour), per
email (1 verification email / 10 min), per referral code (bonus cap). Double
opt-in. Disposable-domain blocklist. Normalized email uniqueness (one person,
one base entry). Honeypot. Optional Cloudflare Turnstile — it is a third
party, so the privacy policy would change in the same commit (§6). Admin
"suspicious" view: many entries from one IP hash, referral bursts.

---

## 5. Admin

`/admin/10years` on the website, server-rendered, never cached, `noindex`.
**Recommended auth: Supabase Auth email one-time code** limited to an
allowlist of staff emails (a `staff_allowlist` table) — the website already
talks to Supabase and has no auth library; adding Clerk (the platform's) to
the website is a bigger dependency for a six-week feature. Every admin action
is written to `giveaway_audit` with the staff email.

Screens: dashboard (entries/day, verified %, referrals, offer claims, funnel),
drawings (schedule, pool size, Draw now, Redraw with reason, audit trail per
drawing, re-verify button that recomputes the pick from stored seed + pool),
winners (claim status, call log), entries (search, void with reason),
leads (stage board), exports (CSV, audited).

---

## 6. Things that change outside the feature

- `/privacy-policy`: what the giveaway collects (name, email, ZIP, age
  confirmation, referral relationships, IP hash), the emails, Turnstile if
  used, retention for giveaway data. **Same commit as the feature.**
- `consultation_requests` source check constraint: add `'giveaway'` (or keep
  `form` and rely on `source_page`) — decide in Phase 1.
- `ASSISTANT_SUPPRESSED_ROUTES`: decide whether the chat shows on `/10years`.
- Sitemap: `/10years` in; `/10years/claim/*` and `/admin/*` out, `noindex`.

---

## 7. Phases

| Phase | Done by | Contents |
|---|---|---|
| **0 — decisions** | Tue Oct 27 | Ben answers §8; counsel returns official rules; prizes and the thank-you offer fixed; email copy deck approved |
| **1 — foundations** | Fri Oct 30 | Migration 0010 (applied by Ben or via MCP with permission); env-scoped store; limiter; staff allowlist + admin login; email builders + previews |
| **2 — notify-me** | Tue Nov 3 | `/10years` in notify-me mode (date-switched by config, not by deploy); notify signup + verify; privacy policy update; `check:giveaway` part 1 |
| **3 — giveaway + engine** | Thu Nov 5 | Entry + double opt-in; referrals + bonus; drawings schedule + `runDueDrawings` on the per-minute cron; winner flow; admin screens; lead stages; offer codes |
| **4 — test-mode run** | **Fri Nov 6** | A full compressed week on a preview deployment, `env = test`: notify-me → live → 6 daily drawings + grand prize scheduled minutes apart → winners → redraw → offer claims → leads to `attended`; Resend mocked; audit re-verified; then the same checks against production with `env = test` rows only |
| **5 — notify-me live** | **Mon Nov 9** | Switch on; monitor verifications |
| **6 — giveaway week** | **Mon Nov 16 – Sat Nov 21** | Daily: watch the 7 pm draw, the staff email, Tuesday re-send for Monday; redraws as needed |
| **7 — offer window** | to **Sat Dec 5** | Reminder ~Dec 1; pipeline follow-up; close the offer at Dec 5 23:59 CT |
| **8 — wrap-up** | Dec 7 | Funnel report; retention per the rules; turn the page off (redirect `/10years` per Ben) |

The date switches (notify-me → live → closed → offer-only) are config
timestamps, so no deploy has to happen at 7 pm on a Monday.

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

**Open questions:**
1. Entries per person: one base entry for the week, or one per day?
2. Do entries carry over to later daily drawings? Does a daily winner stay in
   for later days and the grand prize?
3. Referral bonus: how many entries per verified referral, and the cap?
4. Grand prize: drawn Saturday at 7 pm with that day's daily prize, or
   separately (time)? From all week's entries?
5. Monday: keep the 7 pm Monday draw with a Tuesday call (planned default),
   or move/combine it?
6. Winner claim deadline before a redraw (48 hours?), and how many call
   attempts?
7. Announce winners publicly (first name + last initial + city)? Needs
   consent in the rules.
8. The thank-you offer: what exactly, for whom (all entrants? notify-me
   too?), one per person, stacks with packages?
9. Who receives winner/lead emails (a `LEADS_GIVEAWAY` address?), and who
   needs admin access (the allowlist)?
10. Use Cloudflare Turnstile (adds a third party to the privacy policy) or
    rely on double opt-in + limits?
11. After Dec 5: keep `/10years` as a thank-you page, or redirect it?
12. Collect ZIP at entry (for TN eligibility), or just a "Tennessee
    resident" checkbox?
13. Should notify-me signups be entered automatically on Nov 16, or only when
    they click through? (Plan default: they must click — consent to the
    rules is per person.)
14. Does the chat assistant appear on `/10years`?

---

## 9. Risks

- **Rules not ready by Nov 9** → notify-me can still go live (it is not a
  sweepstakes entry), but the entry form cannot. Phase 0 is the critical path.
- **A missed or doubled draw** → the schedule table + unique key + per-minute
  job; the test run on Nov 6 proves it, including a deliberately skipped
  minute.
- **Email deliverability spike** (hundreds of verifications) → Resend plan
  limits; warm up with notify-me; keep the verification email tiny.
- **SMS creeping back in** → the giveaway code imports nothing from
  `lib/sms-*`, no form shows a consent box, and `check:giveaway` asserts the
  Dialpad mock log stays empty for every giveaway path.
