# 10-year giveaway — handoff (as of Tue Nov 3, 2026, late evening CT)

Written to start a fresh chat from. Everything below is on the branch, not on
`main`. Verified against the live database and Vercel the evening it was
written; anything not verified says so.

## Where things are

- **Branch:** `giveaway/fix-list-rev2`, pushed to GitHub up to `f8909ab`.
  **Not merged to `main`.** Production deploys `main`, so the live site still
  runs the older giveaway code: the hidden `/10years` showcase, engine off.
- **Uncommitted:** the Nov 3 late-evening changes (Ben's nine items, below)
  are in the worktree, **not committed or pushed**, so the preview doesn't
  show them yet. Commit and push them when Ben says so.
- **Worktree on Ben's Mac:** `/Users/benmuir/Code/hbc-10y-fixes`. The main
  checkout at `…/HBC Website - 7.14.26/hbc-website-v2_4` stays on `main`.
- **Preview (Vercel login needed):**
  https://hbc-website-git-giveaway-fix-list-rev2-ylbenmuir-9529s-projects.vercel.app
  It runs with the engine ON, `GIVEAWAY_ENV=test` and the clock pinned to
  Tue Nov 17 (live mode). See "Env vars" below.
- **Commits on the branch** (oldest first): `709a85f` fix list P0 + Hoolest
  price · `007d244` Grok's rules wording · `ec14f36` P1-1 cap (later
  removed) + P1-4 reminders · `ace819b` no caps, P1-8, scheduler fix ·
  `d91f4df` GIVEAWAY_FAKE_NOW · `e3f6aa4` P1-6 entry source ·
  `4e9a991` P1-5 stats endpoint · `4b7cb9c` self-hosted fonts ·
  `22c9abe` P1-7 + P1-3 + checklist · `c1550c2` new prize ladder ·
  `f8909ab` the first version of this doc.
- **Checks on the uncommitted worktree:** `npm test` 257/257 ·
  `npm run check:giveaway` 260/260 in memory · `-- --db` 261/261 against
  Supabase (its own cleanup left 0 env=test rows and 0 test leads; confirmed
  separately) · typecheck and lint clean · `npm run build` OK.
  `check:layout` was **not** re-run; the only CSS change is a ≤389px block
  scoped to `.ty-*` (the giveaway page).

## What changed on Nov 3, late evening (Ben's nine items)

1. **Winners get no automated email.** The winner email is gone, and so is
   the claim page (`/10years/claim/…` answers 404). Nothing else used the
   claim page: its only link was in the winner email. No claim token is
   minted (`claim_token_hash` stays null). Staff record the outcome by
   replying all to the winner alert; Ben records it at `/admin/10years`
   if he wants the public winners list to change (see Open item 2). The rules
   (§ "Notifying winners and redraws") and the page Q&A carry Ben's
   sentence verbatim: "HBC staff will contact the winner by phone and email.
   If the winner doesn't respond within 72 hours of our first attempt, a new
   winner may be drawn." The Sun/Mon → Tue 5 PM rule is gone.
   `claimDeadline()` became `earliestRedrawAt()` (draw + 72 h, written to
   `claim_deadline_at`, shown on the backup admin screen only), and
   `RESPONSE_WINDOW_MS` replaced `CLAIM_WINDOW_MS`.
2. **Pickup only.** Rules: "Hoolest devices and BrainMD bottles are picked up
   at an HBC center (Nashville or Murfreesboro). They are not shipped." The
   staff alert says so too.
3. **`check:giveaway -- --db` cleans up after itself.** At the start and in
   `finally`, it wipes every env=test giveaway row (drawings reset to
   scheduled, prize seed kept) and deletes `consultation_requests` rows with
   an `@example.test` email created since the run began. It then asserts
   that none are left. The shared code is `scripts/giveaway-test-cleanup.mjs`;
   `scripts/giveaway-reset-env.mjs` uses it too. ⚠ env=test is shared with the
   branch preview's test data, so a `--db` run clears that as well.
4. **Entry form at 360×740:** the email field and button are now on the
   first screen in both live (button bottom 711px) and notify-me (733px).
   This is a `@media (max-width: 389px)` block in `app/globals.css`: card side
   padding 18 → 14 px (keeps "I'm 18+ and agree to the Official Rules" on one
   line) and four vertical gaps trimmed by 2–6 px. 390×844, 414×896,
   1366×768 and 1440×900 measured identical before and after.
   `check:giveaway` now asserts 360×740 in both modes. 320×640 still doesn't
   fit (button at 779px live).
5. **No admin screen for staff.** The Tuesday 8:30 AM "call today" email is
   gone (10 send jobs, not 11). The staff alert lost its "Open in admin"
   button and the "mark contacted in admin" line. `/admin/10years` stays, and
   `GIVEAWAY_ADMINS` should hold Ben's address only (README updated).
6. **Reveal email button:** confirmed. It goes to
   `/contact?from=10years&code=<their 10Y- code>`, and the code is prefilled.
   The label is **"Book my free first visit"**, not "Claim my gift" ("Claim
   my gift" is the button on the closed `/10years` card). **The center was
   NOT preselected before;** it is now. A ready code preselects the center
   nearer the entrant's ZIP (`GiveawayBooking.center`, set server-side in
   `app/contact/10years/page.tsx`), and `?center=` still wins. GIFT- codes
   preselect nothing. `check:giveaway` asserts all of this.
7. **Hype emails:** drafts only, in `docs/giveaway-hype-drafts.md`, waiting
   for Ben. Nothing is built.
8. **Recipients:** Preview values are listed under "Env vars" below. A
   recipient check is now step 4b of the README checklist and step 5 of the
   Friday checklist below.
9. **Redraw:** see "How to redraw" below.

Also: one harness assertion ("the rules have no placeholder…") was a false
positive. It matched the ask bar's `placeholder=` attribute, which appears
whenever the assistant is built on (this worktree's `.env.local` turns it
on). The check now ignores HTML placeholder attributes.

## Ben's standing rules

1. **Email only. No SMS** anywhere in the giveaway. Dialpad bans sweepstakes
   traffic: the `/contact?from=10years` path has no texting link and no
   texting checkbox. (Staff phone calls to a winner are fine.)
2. **No merge to `main` and no Production change without Ben's OK.** That
   covers Production env vars, `GIVEAWAY_ENGINE_ENABLED`, `COPY_IS_DRAFT`,
   and robots/sitemap/noindex.
3. **Winners get no automated email.** Staff get the winner alert and
   contact the winner by phone and email themselves. The code now follows
   this.
4. **Staff work from the alert emails only.** They have no admin screen.
   `/admin/10years` is Ben's backup.
5. **The free-first-visit gift stays hidden until the Saturday reveal**
   (Sat Nov 21, 7:00 PM CT, `GIFT_REVEAL_AT`). Before then, nothing public
   and no email names it; the page teases "a thank-you gift" only.
6. **No per-center caps** and no fallback gift, ever. No "limited spots" or
   "X of N left" wording. Urgency comes from the Dec 5 booking deadline only.
7. **BrainMD bottles and Hoolest devices are picked up at a center.** No
   shipping.
8. Also standing: no health-outcome claims (name products for what they
   are) · email only to entrants · every giveaway table read and written
   through `GiveawayStore` only · outside-facing endpoints return counts only.

## Migrations (Supabase project `brwyfneahhhkymytkvpx`)

All applied by Ben in the SQL editor, verified the evening of Nov 3. Apply
any future one by hand; the Supabase connector has no write permission on
this project. Nothing in the Nov 3 late-evening changes needs a migration.

| # | What | Status |
|---|---|---|
| 0010 | Giveaway tables, RLS, rate-limit function, prize and drawing seed | Applied · **frozen, never edit** |
| 0013 | Prize-value sync ($399 Hoolest era) | Applied · frozen (history) |
| 0014 | `consultation_requests.call_consent / _text / _at` (the "Yes, call me" box) | Applied |
| 0015 | `giveaway_redeem_gift()` (one-transaction redemption) + offer waitlist/fallback columns (unused since caps were dropped) + `consultation_requests.giveaway_waitlist` (unused) | Applied |
| 0016 | UTM + `channel` on `giveaway_people` / `giveaway_notify`; `consultation_requests.giveaway_channel` | Applied |
| 0017 | **Current prize ladder** synced into every env's `giveaway_prizes`; `consultation_requests.giveaway_code` | Applied (prize rows read $194.95 … $2,838.85) |

(0011 and 0012 are the contact-form migrations, applied earlier.)
`lib/giveaway/config.test.mjs` checks that the **newest** sync migration
(0017) matches config; a future prize change ships as a new sync migration.
Now-unused columns: `giveaway_winners.claim_token_hash` (always null) and
`phone` (nothing writes it; the claim page did).

## The prize ladder (`lib/giveaway/config.ts`, one prize per drawing)

| Drawing (CT) | Prize | Value |
|---|---|---|
| Mon Nov 16, noon | Brain Map + 1 BrainMD supplement bottle | $194.95 |
| Tue Nov 17, noon | Brain Map + Skye Chiropractic gift ($250) + 1 BrainMD bottle | $444.95 |
| Wed Nov 18, noon | Brain Map + 3 LENS sessions + 1 BrainMD bottle | $569.95 |
| Thu Nov 19, noon | Brain Map + 3 LENS sessions + Hoolest Mini vagus nerve stimulator ($99) + 1 BrainMD bottle | $668.95 |
| Fri Nov 20, noon | Brain Map + 3 LENS sessions + 90-minute one-to-one Women's Health & Life Coaching session with Amabel Luers of Be Well with Amabel ($250; the winner may gift it to a woman of their choice) + 1 BrainMD bottle | $819.95 |
| **Sat Nov 21, 5 PM (grand)** | Brain Map + 12 LENS sessions + Hoolest VeRelief vagus nerve stimulator ($199) + a vibro chair session with each of the 12 ($480) + 3 Assisted Lymphatic Therapy sessions with Victoria Bailey of Envision Thermography & Wellness ($375) + 3 BrainMD bottles ($134.85) | $2,838.85 |
| | **Total** | **$5,537.60** |

- **Rates:** Brain Map $150 · LENS session $125 · BrainMD bottle $44.95
  (retail) · vibro $40 a session (grand prize only) · Hoolest Mini $99 ·
  VeRelief $199. Sums are done in cents.
- **Headline:** "Over $5,500 in prizes" (the total rounded down to the
  nearest $500). A test fails if the total ever drops below $5,500.
- **Partner gifts** are redeemed directly with the partner. Their
  valid-through dates are **TBD** (`PARTNER_GIFTS[].validThrough = null`)
  and show as "TBD" on the page and in the rules.
- **Bottles and Hoolest devices:** picked up at a center, never shipped.
- **Current clients** (Official Rules wording): "Current clients receive a
  Brain Map gift certificate to give to someone new in place of their own
  Brain Map." The site never asks new or current; staff ask on the winner
  call. Gift codes are **GIFT-MON, GIFT-TUE, GIFT-WED, GIFT-THU, GIFT-FRI,
  GIFT-SAT**. /contact accepts each one from its day's drawing until
  `PRIZE_USE_BY`, and the lead email shows the code. They are for tracking
  only; nothing stops a code being used twice.
- **Tax:** a 1099 is needed when a person's 2026 prizes total $2,000 or more
  (aggregated per person); that winner completes a W-9 first. Only the grand
  prize reaches that alone.
- **Thank-you gift** (separate from the prizes): every verified entrant gets
  a free first visit (Brain Map + consultation, normally $150), code
  `10Y-XXXXXX`, booked by Sat Dec 5 for a visit through Dec 31. It is
  revealed Sat Nov 21 at 7 PM.

## Every automated email

Sender: `lib/giveaway/send.ts`. While `COPY_IS_DRAFT` is true, `[DRAFT]` copy
is refused outside test/local envs, so **no giveaway email goes out in
Production until the copy freeze.** Crons never run on Vercel previews.
Times are Central. Scheduled emails are drained by the every-minute cron
(`/api/cron/giveaway`, Production only). 10 scheduled jobs in all.

**To entrants**

| Email | When | To |
|---|---|---|
| Confirm your email (notify-me) | On a notify-me signup, Nov 9–15 | That address |
| It's live (one-tap entry) | **Sun Nov 15, 6:00 PM** | Verified notify-me signups who haven't tapped |
| Monday reminder | **Mon Nov 16, 9:00 AM** | Verified notify-me signups who haven't tapped |
| Confirm your entry | On an entry signup, Nov 15–21 | That address |
| You're in (share link + "thank-you gift on the way", no code) | On the first confirmation or tap | That entrant |
| Daily afternoon (next prize, entry count, share link) | **Mon–Fri, 4:00 PM** | Every verified, subscribed entrant. Hype rewrite drafted, not built |
| Thank-you + gift reveal (10Y- code, "Book my free first visit" → /contact, code prefilled, center preselected) | **Sat Nov 21, 7:00 PM** | Every verified, subscribed entrant, winners included |
| Gift reminder | **Tue Dec 1, 9:00 AM** | Verified, subscribed, unredeemed |
| Last call ("Booking closes Saturday") | **Thu Dec 3, 9:00 AM** | Verified, subscribed, unredeemed |
| "We got your request" | On a /contact booking (normal site behaviour) | The booker |

**Winners get nothing extra.** There is no winner email.

**To staff**

| Email | When | To |
|---|---|---|
| Winner alert: name, email, city/ZIP, prize, "reach them today by phone and email", phone not on the form, 72 h after the first attempt, current-client gift code, tax form, pickup, an "Email the winner" mailto button, "Reply all with how it went" | At each drawing (noon; Sat 5 PM) and on every redraw | Tue–Fri: `GIVEAWAY_ALERTS`; Mon and Sat: `GIVEAWAY_ALERTS_OWNER` (first address To, the rest CC). If unset: `LEADS_FALLBACK`, then `LEADS_NOTIFY_EMAIL` |
| Booking lead, subject "(10 years)", shows the code | Each /contact booking with a 10Y- or GIFT- code | Normal lead routing by center: `LEADS_NASHVILLE` / `LEADS_MURFREESBORO` / `LEADS_CONCIERGE` / `LEADS_FALLBACK` |
| Admin sign-in code | When Ben signs in at /admin/10years | Ben (Supabase Auth) |

Entering never emails staff.

## How to redraw (Ben)

1. Staff reply to the winner alert saying there's been no response 72 hours
   after their first attempt (or the winner declined or isn't eligible).
2. Sign in at `/admin/10years` (your address must be in `GIVEAWAY_ADMINS`;
   the six-digit code arrives by email).
3. Optional: **Winners** → that winner → log the call attempt and mark them
   unreachable / declined / ineligible, so the record says why.
4. **Drawings** → that day's row → type a reason in "Reason for the redraw"
   → **Redraw**.
5. It picks from that drawing's frozen pool, never the same person twice
   (and, for a daily drawing, no current daily prize holder). It marks the
   old winner "redrawn" with your reason, audits it, and sends a **new staff
   alert** for the new winner. The new winner gets no email. Drawings →
   **Re-verify** proves every pick from the stored seed and pool.

Nothing redraws on its own: the 72 hours run from staff's first attempt,
which the system doesn't see.

## Env vars and flags

Values are never recorded here, apart from the recipient lists Ben asked for.

| Name | Production | Preview |
|---|---|---|
| `GIVEAWAY_ENGINE_ENABLED` | **unset (engine OFF)** | `1` — branch only |
| `GIVEAWAY_ENV` | unset (→ `production`) | `test` — branch only |
| `GIVEAWAY_TOKEN_SECRET` | **unset — needed** | set — branch only (the value is in a session scratch file, not in the repo) |
| `GIVEAWAY_ADMINS` | **unset — needed: Ben's address only** | **unset** |
| `GIVEAWAY_ALERTS` / `GIVEAWAY_ALERTS_OWNER` | **unset — needed** (else alerts fall back to `LEADS_FALLBACK`) | **unset** |
| `GIVEAWAY_STATS_TOKEN` | **unset — needed** (stats endpoint answers 503) | unset |
| `GIVEAWAY_SITE_URL` | unset (→ canonical site) | branch preview URL — branch only |
| `GIVEAWAY_FAKE_NOW` | never (ignored outside test/local) | `2026-11-17T16:00:00Z` — branch only |
| `GIVEAWAY_HIDE_DRAFT_TAGS` | unset | unset (`.env.local` only) |
| `GIVEAWAY_REPO`, `GIVEAWAY_OTP_MOCK_CODE` | never (checks only) | never |
| `CRON_SECRET` | set | set — branch only |
| `LEADS_*` | **set — the same values as Preview** (each is one variable scoped to both) | see below |
| `RESEND_API_KEY`, `SUPABASE_*` | set | set |
| `DIALPAD_*` | set (contact form only; never giveaway) | set |
| `NEXT_PUBLIC_GA_ID` | set | — (GA runs in production only) |

**Preview recipients, read Nov 3 with `vercel env pull --environment=preview
--git-branch=giveaway/fix-list-rev2`** (file deleted after reading):

| Variable | Preview value |
|---|---|
| `GIVEAWAY_ALERTS` | not set |
| `GIVEAWAY_ALERTS_OWNER` | not set |
| `LEADS_NASHVILLE` | denise@, ben@, paul@ (all @harmonizedbraincenterstn.com) |
| `LEADS_MURFREESBORO` | kylie@, denise@, ben@, paul@ |
| `LEADS_CONCIERGE` | denise@, ben@, paul@ |
| `LEADS_FALLBACK` | denise@, ben@, paul@ |
| `LEADS_NOTIFY_EMAIL` | set, but a **Sensitive** variable: Vercel won't show its value |
| `GIVEAWAY_ADMINS` | not set |

⚠ Because the alert variables are unset in Preview, a winner alert there
(for example, from Draw now on the preview) goes to `LEADS_FALLBACK`, which
is real staff (denise, ben, paul), and a preview booking's lead goes to the
real center inboxes. The `LEADS_*` variables are shared by Preview and
Production, so Production already has these same values.

**Code flags**, changed by commit rather than env var:
- `COPY_IS_DRAFT = true` (`lib/giveaway/copy.ts`)
- `RULES_VERSION = "2026-11-03"`
- `TAX_THRESHOLD_CONFIRMED = false`
- `PRIZE_USE_BY = May 31, 2027` (placeholder)
- `PARTNER_GIFTS[].validThrough = null` (TBD)

Vercel also has a project **protection-bypass token**, made by `vercel curl`
on Nov 3 for the preview test. It's revocable in Settings → Deployment
Protection. No directory on Ben's Mac is `vercel link`ed; pass
`--project hbc-website --scope ylbenmuir-9529s-projects` to the CLI.

## Friday turn-on checklist (go/no-go Sat Nov 7, 3 PM CT)

The full version is in README → "10-year giveaway: turning the engine on".
In order:

1. **Copy freeze (Thu Nov 5):** Ben approves the rules, the page copy,
   the gift tease, all emails and the hype drafts (or keeps today's daily
   email). Replace every `D("…")`, set `COPY_IS_DRAFT = false`, set
   `RULES_VERSION` to the approval date, and fill in `PRIZE_USE_BY` and the
   partner valid-through dates.
2. **Merge `giveaway/fix-list-rev2` → `main`, with Ben's OK.** Nothing below
   matters in Production until this is done.
3. Migrations: done (0010, 0013–0017).
4. **Production env vars:** `GIVEAWAY_TOKEN_SECRET`, `GIVEAWAY_ADMINS` (Ben
   only), `GIVEAWAY_ALERTS`, `GIVEAWAY_ALERTS_OWNER`, `GIVEAWAY_STATS_TOKEN`
   (`CRON_SECRET` is already set).
5. **Recipient check (Production).** The winner alert is the only notice of
   a win, so: `npx vercel env pull <scratch file> --environment=production
   --project hbc-website --scope ylbenmuir-9529s-projects`, read these, and
   confirm each address is a real, monitored inbox with no test or preview
   address among them:
   - `GIVEAWAY_ALERTS` — Tue–Fri winners (To = first address, CC = the rest)
   - `GIVEAWAY_ALERTS_OWNER` — Monday and Saturday winners
   - `LEADS_NASHVILLE`, `LEADS_MURFREESBORO`, `LEADS_CONCIERGE` — bookings
   - `LEADS_FALLBACK` — bookings with no center, and the alert fallback
   - `LEADS_NOTIFY_EMAIL` — last fallback (Sensitive: check it in the
     Vercel dashboard, or re-enter it)
   - `GIVEAWAY_ADMINS` — Ben only

   Then delete the scratch file. Production can't send a test alert without
   drawing a real winner, so reading the addresses is the check.
6. **Supabase Auth:** the Magic Link template prints `{{ .Token }}`; custom
   SMTP through Resend; one real admin sign-in at /admin/10years (Ben).
7. **Sat Nov 7 morning:** set `GIVEAWAY_ENGINE_ENABLED=1` in Production,
   then **redeploy** (the site-wide banner is built into static pages).
   `/10years` stays the showcase until Nov 9, then un-hides on its own
   (robots, sitemap and meta all follow the clock).
8. **By 3 PM:** `npm run check:giveaway -- --db` is green (it cleans up its
   own rows), and one real notify-me signup to Ben's address arrives. Go if
   both pass; otherwise notify-me opens Thu Nov 12 and the drawings stay
   Nov 16–21.
9. **Mon Nov 9:** submit the sitemap in Search Console.

## Open items

1. **Phone numbers.** The entry form never asks for one, and the claim page
   (the only place a winner gave a number) is gone. The rules say staff
   contact winners "by phone and email". The alert tells staff to check
   client records or ask by email first. If Ben wants a number on file,
   that's a new form field (and it would cost the 360×740 fold).
2. **Public winners list.** It says "claimed ✓" or names a winner only once
   the row is marked in `/admin/10years`. Staff can't do that, so unless Ben
   records it from their replies, each drawn day keeps saying "we're reaching
   them now".
3. **Hype emails:** drafts in `docs/giveaway-hype-drafts.md`. Ben approves or
   edits them, and says yes or no to the optional Saturday 9 AM send (a new
   job). Then build.
4. **Preview alerts reach real staff** (see Env vars). Set Preview-scoped
   `GIVEAWAY_ALERTS` / `GIVEAWAY_ALERTS_OWNER` to Ben's address before any
   Draw now on the preview, if that matters.
5. **Partner valid-through dates** (Skye, Amabel, Envision): TBD.
6. **`PRIZE_USE_BY` = May 31, 2027:** a placeholder for Ben to confirm.
7. **Accountant** to confirm the $2,000 threshold (then set
   `TAX_THRESHOLD_CONFIRMED`; until then the rules say "Accountant to
   confirm").
8. **Gift codes are not single-use.** Reuse shows up only in lead emails.
9. **Phones narrower than 360 px:** the entry button is still below the fold
   at 320×640 (779px live, 801px notify-me). 360×740 and up pass.
10. **Gmail connector** needs re-authorising before any session can read test
    emails.
11. **Unused columns** (0015's `waitlisted_at`, `waitlist_center`,
    `fallback`, `giveaway_waitlist`; `giveaway_winners.claim_token_hash` and
    `phone`) are harmless and left in place. `is_existing_client` is no
    longer written.
12. **P1-9** (gift-a-visit code for current clients): skipped by Ben.
    **P2-1 to P2-7** not started. P1-2 was dropped with the caps.

## Half-done or temporary

- **Preview env vars** are scoped to this branch only (`GIVEAWAY_ENGINE_ENABLED`,
  `GIVEAWAY_ENV=test`, `GIVEAWAY_TOKEN_SECRET`, `CRON_SECRET`,
  `GIVEAWAY_FAKE_NOW`, `GIVEAWAY_SITE_URL`). Remove or change
  `GIVEAWAY_FAKE_NOW` to see other stages; the `?mode=` stages show only
  while the engine is off.
- **The preview end-to-end run** (Nov 3, before these changes) passed: enter,
  verify, 10Y code, booking, redeemed, call-me stored, reuse refused. Whether
  the confirm-entry and You're-in emails reached the inbox was **not**
  checked (Gmail connector).
- **The fixed-date clock** (`GIVEAWAY_FAKE_NOW`) and
  `scripts/giveaway-reset-env.mjs` exist for testing only.
- **Docs:** `GIVEAWAY-COPY.md` (copy deck) is current, with the winner email,
  claim page and Tuesday email marked removed. `GIVEAWAY-PLAN.md` has
  "superseded" notes (prize table; winner notification).
  `GIVEAWAY-BUILD-LOG.md` is history. `docs/giveaway-hype-drafts.md` holds
  the drafts.
- **Not done anywhere:** a real-Resend send of every giveaway email to a
  real inbox, and a real admin OTP sign-in.
