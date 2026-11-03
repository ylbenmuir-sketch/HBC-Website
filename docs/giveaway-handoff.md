# 10-year giveaway — handoff (as of Tue Nov 3, 2026, evening CT)

Written to start a fresh chat from. Everything below is on the branch, not on
`main`. Verified against the live database and Vercel the evening it was
written; anything not verified says so.

## Where things are

- **Branch:** `giveaway/fix-list-rev2`, pushed to GitHub. **Not merged to
  `main`.** Production deploys `main`, so the live site still runs the older
  giveaway code: the hidden `/10years` showcase, engine off.
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
  `22c9abe` P1-7 + P1-3 + checklist · `c1550c2` new prize ladder · this doc.
- **Checks at `c1550c2`:** `npm test` 257/257 · `npm run check:giveaway`
  253/253 in memory **and** `-- --db` against Supabase (env=test rows,
  cleared after) · typecheck, lint, `check:layout` clean.

## Ben's standing rules

1. **Email only. No SMS** anywhere in the giveaway. Dialpad bans sweepstakes
   traffic: the `/contact?from=10years` path has no texting link and no
   texting checkbox.
2. **No merge to `main` and no Production change without Ben's OK.** That
   covers Production env vars, `GIVEAWAY_ENGINE_ENABLED`, `COPY_IS_DRAFT`,
   and robots/sitemap/noindex.
3. **Winners get no automated email.** ⚠ **The code does not follow this
   yet.** See Open item 1.
4. **Staff work from the alert emails only.**
5. **The free-first-visit gift stays hidden until the Saturday reveal**
   (Sat Nov 21, 7:00 PM CT, `GIFT_REVEAL_AT`). Before then, nothing public
   and no email names it; the page teases "a thank-you gift" only.
6. **No per-center caps** and no fallback gift, ever. No "limited spots" or
   "X of N left" wording. Urgency comes from the Dec 5 booking deadline only.
7. Also standing: no health-outcome claims (name products for what they
   are) · email only to entrants · every giveaway table read and written
   through `GiveawayStore` only · outside-facing endpoints return counts only.

## Migrations (Supabase project `brwyfneahhhkymytkvpx`)

All applied by Ben in the SQL editor, verified the evening of Nov 3. Apply
any future one by hand; the Supabase connector has no write permission on
this project.

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
- **Headline:** "Over $5,500 in prizes" (the total rounded down to $500). A
  test fails if the total ever drops below $5,500.
- **Partner gifts** are redeemed directly with the partner. Their
  valid-through dates are **TBD** (`PARTNER_GIFTS[].validThrough = null`)
  and show as "TBD" on the page and in the rules.
- **Current clients** (Official Rules wording): "Current clients receive a
  Brain Map gift certificate to give to someone new in place of their own
  Brain Map." The site never asks new or current; staff ask on the winner
  call. Gift codes are **GIFT-MON, GIFT-TUE, GIFT-WED, GIFT-THU, GIFT-FRI,
  GIFT-SAT**. /contact accepts each one from its day's drawing until
  `PRIZE_USE_BY`, and the lead email shows the code. They are for tracking
  only; nothing stops a code being used twice.
- **Tax:** a 1099 is needed when a person's 2026 prizes total $2,000 or more
  (aggregated per person). Only the grand prize reaches that alone.
- **Thank-you gift** (separate from the prizes): every verified entrant gets
  a free first visit (Brain Map + consultation, normally $150), code
  `10Y-XXXXXX`, booked by Sat Dec 5 for a visit through Dec 31. It is
  revealed Sat Nov 21 at 7 PM.

## Every automated email

Sender: `lib/giveaway/send.ts`. While `COPY_IS_DRAFT` is true, `[DRAFT]` copy
is refused outside test/local envs, so **no giveaway email goes out in
Production until the copy freeze.** Crons never run on Vercel previews.

**To entrants**

| Email | When | To |
|---|---|---|
| Confirm your email (notify-me) | On a notify-me signup, Nov 9–15 | That address |
| It's live (one-tap entry) | **Sun Nov 15, 6:00 PM** | Verified notify-me signups |
| Monday reminder | **Mon Nov 16, 9:00 AM** | Notify-me signups who haven't tapped |
| Confirm your entry | On an entry signup, Nov 15–21 | That address |
| You're in (share link + "thank-you gift on the way", no code) | On the first confirmation or tap | That entrant |
| Daily afternoon | **Mon–Fri, 4:00 PM** | Every verified, subscribed entrant |
| **Winner email (claim link)** | **At each drawing (noon; Sat 5 PM)** | The winner; Reply-To is the alert address. ⚠ Conflicts with rule 3 |
| Thank-you + gift reveal (10Y- code) | **Sat Nov 21, 7:00 PM** | Every verified, subscribed entrant, winners included |
| Gift reminder | **Tue Dec 1, 9:00 AM** | Verified, subscribed, unredeemed |
| Last call ("Booking closes Saturday") | **Thu Dec 3, 9:00 AM** | Verified, subscribed, unredeemed |
| "We got your request" | On a /contact booking (normal site behaviour) | The booker |

**To staff**

| Email | When | To |
|---|---|---|
| Winner alert (+ "Current client? … GIFT-XXX") | At each drawing | Tue–Fri: `GIVEAWAY_ALERTS`; Mon and Sat: `GIVEAWAY_ALERTS_OWNER` (first address To, the rest CC). If unset: `LEADS_FALLBACK`, then `LEADS_NOTIFY_EMAIL` |
| Tuesday "call today" | **Tue Nov 17, 8:30 AM**, only if Monday's winner isn't marked contacted | `GIVEAWAY_ALERTS` (same fallbacks) |
| Booking lead, subject "(10 years)", shows the code | Each /contact booking with a 10Y- or GIFT- code | Normal lead routing by center: `LEADS_NASHVILLE` / `LEADS_MURFREESBORO` / `LEADS_CONCIERGE` / `LEADS_FALLBACK` |
| Admin sign-in code | When staff sign in at /admin/10years | That admin (Supabase Auth) |

Entering never emails staff. Times are Central. Scheduled emails are drained
by the every-minute cron (`/api/cron/giveaway`, Production only).

## Env vars and flags

Production state was verified with `vercel env ls` on Nov 3. Values are never
recorded here.

| Name | Production | Preview |
|---|---|---|
| `GIVEAWAY_ENGINE_ENABLED` | **unset (engine OFF)** | `1` — branch only |
| `GIVEAWAY_ENV` | unset (→ `production`) | `test` — branch only |
| `GIVEAWAY_TOKEN_SECRET` | **unset — needed** | set — branch only (the value is in a session scratch file, not in the repo) |
| `GIVEAWAY_ADMINS` | **unset — needed** | unset |
| `GIVEAWAY_ALERTS` / `GIVEAWAY_ALERTS_OWNER` | **unset — needed** (else alerts fall back to `LEADS_FALLBACK`) | unset |
| `GIVEAWAY_STATS_TOKEN` | **unset — needed** (stats endpoint answers 503) | unset |
| `GIVEAWAY_SITE_URL` | unset (→ canonical site) | branch preview URL — branch only |
| `GIVEAWAY_FAKE_NOW` | never (ignored outside test/local) | `2026-11-17T16:00:00Z` — branch only |
| `GIVEAWAY_HIDE_DRAFT_TAGS` | unset | unset (`.env.local` only) |
| `GIVEAWAY_REPO`, `GIVEAWAY_OTP_MOCK_CODE` | never (checks only) | never |
| `CRON_SECRET` | set | set — branch only |
| `LEADS_*`, `RESEND_API_KEY`, `SUPABASE_*` | set | set |
| `DIALPAD_*` | set (contact form only; never giveaway) | set |
| `NEXT_PUBLIC_GA_ID` | set | — (GA runs in production only) |

**Code flags**, changed by commit rather than env var:
- `COPY_IS_DRAFT = true` (`lib/giveaway/copy.ts`)
- `RULES_VERSION = "2026-11-03"`
- `TAX_THRESHOLD_CONFIRMED = false`
- `PRIZE_USE_BY = May 31, 2027` (placeholder)
- `PARTNER_GIFTS[].validThrough = null` (TBD)

Vercel also has a project **protection-bypass token**, made by `vercel curl`
on Nov 3 for the preview test. It's revocable in Settings → Deployment
Protection.

## Friday turn-on checklist (go/no-go Sat Nov 7, 3 PM CT)

The full version is in README → "10-year giveaway: turning the engine on".
In order:

1. **Copy freeze (Thu Nov 5):** Ben approves the rules, the page copy,
   the gift tease and all emails. Replace every `D("…")`, set
   `COPY_IS_DRAFT = false`, set `RULES_VERSION` to the approval date, and
   fill in `PRIZE_USE_BY` and the partner valid-through dates.
2. **Merge `giveaway/fix-list-rev2` → `main`, with Ben's OK.** Nothing below
   matters in Production until this is done.
3. Migrations: done (0010, 0013–0017).
4. **Production env vars:** `GIVEAWAY_TOKEN_SECRET`, `GIVEAWAY_ADMINS`,
   `GIVEAWAY_ALERTS`, `GIVEAWAY_ALERTS_OWNER`, `GIVEAWAY_STATS_TOKEN`
   (`CRON_SECRET` is already set).
5. **Supabase Auth:** the Magic Link template prints `{{ .Token }}`; custom
   SMTP through Resend; one real admin sign-in at /admin/10years.
6. **Sat Nov 7 morning:** set `GIVEAWAY_ENGINE_ENABLED=1` in Production,
   then **redeploy** (the site-wide banner is built into static pages).
   `/10years` stays the showcase until Nov 9, then un-hides on its own
   (robots, sitemap and meta all follow the clock).
7. **By 3 PM:** `npm run check:giveaway -- --db` is green, and one real
   notify-me signup to Ben's address arrives. Go if both pass; otherwise
   notify-me opens Thu Nov 12 and the drawings stay Nov 16–21.
8. **Mon Nov 9:** submit the sitemap in Search Console.

## Open items

1. **Rule 3 vs the code.** `lib/giveaway/notify.ts` → `winnerDrawn` emails
   each winner at the draw (claim link, 72-hour deadline, tax line). It
   needs either a code change (stop the email and have staff contact
   winners from the alert) or a change to the rule. The claim page,
   `claim_deadline_at` and the "redrawn after 72 h" wording in the rules
   (§9) all assume the winner is emailed.
2. **Partner valid-through dates** (Skye, Amabel, Envision): TBD.
3. **`PRIZE_USE_BY` = May 31, 2027:** a placeholder for Ben to confirm.
4. **Rules wording I added:** "Hoolest devices and BrainMD bottles are
   picked up at a center or shipped to an address in an eligible state." The
   bottles part is an assumption.
5. **Accountant** to confirm the $2,000 threshold (then set
   `TAX_THRESHOLD_CONFIRMED`; until then the rules say "Accountant to
   confirm").
6. **Gift codes are not single-use.** Reuse shows up only in lead emails.
7. **Friday's daily email subject** is the grand prize name, now 200+
   characters. A shorter display name would need a config change.
8. **Phones narrower than 390 px:** the entry button is still below the fold
   at 360×780 and 320×640 (390×844 and 414×896 pass).
9. **Gmail connector** needs re-authorising before any session can read test
   emails.
10. **Unused columns from the dropped caps** (0015's `waitlisted_at`,
    `waitlist_center`, `fallback`, `giveaway_waitlist`) are harmless and left
    in place. `is_existing_client` is no longer written.
11. **Each `check:giveaway -- --db` run** leaves 3 TEST rows in
    `consultation_requests` (bookings by "TEST Dan Tester", "TEST NoJS
    Tester", and the GIFT-MON booking) and env=test giveaway rows. Clear the
    latter with `node scripts/giveaway-reset-env.mjs test --yes`; delete the
    TEST leads by id.
12. **P1-9** (gift-a-visit code for current clients): skipped by Ben.
    **P2-1 to P2-7** not started. P1-2 was dropped with the caps.

## Half-done or temporary

- **Preview env vars** are scoped to this branch only (`GIVEAWAY_ENGINE_ENABLED`,
  `GIVEAWAY_ENV=test`, `GIVEAWAY_TOKEN_SECRET`, `CRON_SECRET`,
  `GIVEAWAY_FAKE_NOW`, `GIVEAWAY_SITE_URL`). Remove or change
  `GIVEAWAY_FAKE_NOW` to see other stages; the `?mode=` stages show only
  while the engine is off.
- **The preview end-to-end run** (Nov 3) passed: enter, verify, 10Y code,
  booking, redeemed, call-me stored, reuse refused. Whether the
  confirm-entry and You're-in emails reached the inbox was **not** checked
  (Gmail connector). That run's env=test rows have since been cleared.
- **The fixed-date clock** (`GIVEAWAY_FAKE_NOW`) and
  `scripts/giveaway-reset-env.mjs` exist for testing only.
- **Docs:** `GIVEAWAY-COPY.md` (copy deck) is current. `GIVEAWAY-PLAN.md`
  has a "superseded" note above its old prize table.
  `GIVEAWAY-BUILD-LOG.md` is history.
- **Not done anywhere:** a real-Resend send of every giveaway email to a
  real inbox, and a real admin OTP sign-in.
