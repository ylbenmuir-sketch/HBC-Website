# 10-year giveaway — build log

Running record of the build (Ben's briefs, 2026-10-18). A fresh session
resumes from here: read the **Morning report** first, then **Where things
stand**, then the **Questions for Ben**. The spec is `GIVEAWAY-PLAN.md`.

---

## Morning report (Sun Oct 19 2026, overnight build on `giveaway-build`)

**Done, per step** (branch `giveaway-build`, 9 commits off main 2eeb84f, pushed; main untouched):
1. **Copy deck** — `GIVEAWAY-COPY.md` (every email, page mode, Q&A, claim,
   one-tap, unsubscribe, non-TN message, rules placeholder) and a copy pass
   on `lib/giveaway/copy.ts`; every string still `[DRAFT]`.
2. **Phase 2** — `/10years` notify-me mode behind the config date (404 today),
   full form + TN ZIP + honeypot + limiter + verification email, date-gated
   chat suppression, config-driven Q&A, sitemap/noindex rules,
   `PRIVACY-POLICY-GIVEAWAY-DRAFT.md` (live page untouched).
3. **Phase 3** — entry + double opt-in; one-tap with early bird; referrals
   (+3/+1, cap 10, self-referral and disposable voids, all audited);
   `/api/cron/giveaway` every minute (frozen pool, daily-winner exclusion,
   grand from every entry, never twice, re-verifiable picks); scheduled
   sends (It's live, Monday reminder, daily, Tuesday call-today skipped if
   contacted, Nov 22 thank-you); winner email + claim page with the Fri/Sat
   → Tue 5 pm rule and the tax-form step; redraw with a reason; public
   winners list (three states); staff alerts (`GIVEAWAY_ALERTS` /
   `_OWNER`, fallback); offer codes with the Dec 5 cut-off and `/contact`
   validation (source `giveaway`, subject "(10 years)", center from ZIP);
   admin dashboard, drawings (Draw now / Redraw / Re-verify), winners
   (call log, status, public-OK, tax-form), entries (search, void,
   "suspicious" filter), CSV exports — every action audited.
4. **check:giveaway** — `npm run check:giveaway` runs the whole week over
   the fake clock: **126 passed, 0 failed** (includes a skipped cron
   minute, an unreachable winner → redraw, the >$600 tax step, public-OK,
   a code booked through /contact, a Dec 6 expiry, unsubscribe; every pick
   re-verifies; the Resend mock holds exactly the expected 152 emails; the
   Dialpad log is EMPTY). It runs on in-memory tables because 0010 is not
   on the project; `--db` repeats it against Supabase once it is.
5. lint, typecheck, 183 unit tests, build, check:redirects, check:schema,
   check:links, check:index, preview:emails — all green.

**Preview URL:** Vercel builds every pushed branch; open the deployment for
`giveaway-build` under the project's Deployments tab (no CLI here to print
the URL). `/10years` answers 404 on it today, by the config date.

**Migrations:** 0010 is still waiting on you — **paste the copy from this
branch**: main's copy has a seed bug (row commas inside trailing comments)
that embedded Postgres caught; the branch's file runs clean, twice. Two
columns were added to it (`giveaway_winners.seed`, `pool_excluded`) so
every pick re-verifies. No other migration.

**Env vars for Vercel (Production + Preview):** `GIVEAWAY_ADMINS`,
`GIVEAWAY_TOKEN_SECRET`, `GIVEAWAY_ALERTS`, `GIVEAWAY_ALERTS_OWNER`;
`CRON_SECRET` (already needed for the held-lead job) now also runs the
giveaway cron. Never set `GIVEAWAY_REPO`, `GIVEAWAY_OTP_MOCK_CODE` or
`GIVEAWAY_ENV=test` on production (they are refused there anyway).

**To review and merge:** `git fetch && git checkout giveaway-build`, read
this log, `npm test && npm run build && npm run check:giveaway`, open the
preview's `/admin/10years` (needs the two env vars + the Supabase Auth
template/SMTP from the Phase 1 report), then `git checkout main && git merge
--ff-only giveaway-build && git push`. Apply 0010 from the branch, then
`npm run check:giveaway -- --db` against env=test rows.

**Questions for Ben:** see the section at the end (9 from the build, 6
from the copy pass in `GIVEAWAY-COPY.md`).

## Phase 1 report (main 2eeb84f, Sat Oct 18 2026 evening)

**Shipped to main** (four commits: 8e2c616, 7af5995, 625010b, 2eeb84f):
1. `GIVEAWAY-PLAN.md` v2 — decisions 15–20 folded in (prizes, Saturday
   grand-only, claim-deadline rule, Concierge, scope cuts, option A).
2. `supabase/migrations/0010_giveaway.sql` — every table with `env`, RLS on
   with no policies, the unique keys, prizes + drawings **seeded from
   config** (a test fails on drift), `giveaway_rate_limit_hit`, `'giveaway'`
   in the `source` check. **NOT applied**: the Supabase connector still
   answers "You do not have permission" for this project (as on Oct 15), and
   there is no psql/CLI/Docker here. **One step for Ben:** Supabase → SQL
   Editor → New query → paste the whole file → Run (idempotent).
3. `lib/giveaway/config.ts` — every instant (UTC + CT label), the prize
   ladder (both versions, six partner slots), rates, deadline rule, offer
   window, page modes. 32 tests.
4. Env scoping (`GIVEAWAY_ENV` / `VERCEL_ENV`, `GiveawayStore` stamps and
   filters every read and write, giveaway tables only).
5. Database limiter (`rate_limits` + SQL function; fails closed) with tests.
6. `/admin/10years` — Supabase Auth email code, allowlist seeded from
   `GIVEAWAY_ADMINS`, 12-hour signed session cookie, every attempt audited,
   noindex + no-store, empty dashboard shell (env, schedule, "is 0010
   applied?").
7. Ten email builders on the shared template; **all copy in
   `lib/giveaway/copy.ts` as `[DRAFT]`**; in `npm run preview:emails` at 390
   and 640 (all fit 844; "You're in" is the tallest at 796 px).
8. `/unsubscribe` (signed token, GET + one-click POST, audited, noindex,
   not in the sitemap). No SMS imports anywhere in the giveaway code;
   `/10years` and `/10years/*` answer 404.

**Checks:** lint clean, typecheck clean, 154 unit tests pass, build passes,
check:redirects / check:schema / check:index green against the build.

**Env vars for Vercel (Production, and Preview if you want the preview to
work):**
- `GIVEAWAY_ADMINS` = `ben@…, denise@…, kylie@…` (comma-separated, the
  three staff addresses; same format as `LEADS_*`).
- `GIVEAWAY_TOKEN_SECRET` = output of `openssl rand -hex 32`.
- Optional `GIVEAWAY_ENV` (defaults from `VERCEL_ENV`; set `test` only on
  a preview used for test runs).

**Supabase dashboard, two one-time settings for the admin code email:**
Authentication → Email Templates → *Magic Link* must contain `{{ .Token }}`;
Authentication → SMTP Settings → custom SMTP (Resend: `smtp.resend.com`,
465, user `resend`, password = a Resend API key) so Denise and Kylie, who
are not project members, receive codes.

**Plan vs code conflicts found:** none new. Still true from the plan: the
consultation route's accepted sources and lead-routing's `source` type widen
in Phase 3; `ASSISTANT_SUPPRESSED_ROUTES` gets its date gate in Phase 2.

**Blocking Phase 2 / the test run:** only the migration (nothing can be
read or written until 0010 exists). Everything else can be built and
unit-tested without it.

---

## Where things stand

- **main** `2eeb84f`: Phase 1 complete (above).
- **giveaway-build** (this branch, off `2eeb84f`): overnight Phases 2–4.
  Nothing here is pushed to main or merged.

## Milestones (overnight)

- [x] 0. Core for the night (ba12fb0): in-memory PostgREST-shaped client
      (`lib/giveaway/memory-client.ts`, tests), `GIVEAWAY_REPO=memory` server
      mode (local/test only), `GIVEAWAY_OTP_MOCK_CODE`, ZIP table. **PGlite
      proved 0010 executes — and found a real bug: the drawings seed had its
      row commas inside trailing comments. FIXED on this branch; the copy on
      main (2eeb84f) would fail in the SQL editor with "syntax error at or
      near (".** `lib/giveaway/migration.test.mjs` now runs every migration.
- [x] 3a. Engine (984be17): `people.ts` (signup, verify, one-tap + early
      bird, referrals +3/+1 cap 10, self-referral/disposable voids, offers),
      `drawings.ts` (frozen pool, deterministic pick from stored seed,
      claim/never-twice, redraw with per-winner seed + exclusions,
      re-verify, winner updates), `sends.ts` (job + receipt rows),
      `alerts.ts`, `clock.ts` (fake clock, test env only). 15 engine tests.
- [x] 2 + 3b. Surface (39a0457): `/10years` in four modes, signup/verify/
      enter/claim/rules routes, `/api/cron/giveaway` (+ vercel.json),
      `/api/giveaway/test-clock` (test env only), `/contact` offer-code
      validation + redemption (source `giveaway`, subject "(10 years)",
      center from ZIP), date-gated chat suppression, sitemap gating.
- [x] 1. Copy deck `GIVEAWAY-COPY.md` + copy polish (2575273).
- [x] 3c. Admin screens (2575273).
- [x] 2b. `PRIVACY-POLICY-GIVEAWAY-DRAFT.md` (2575273).
- [x] 4. `check:giveaway`: 126 passed, 0 failed (e460b1a).
- [x] 5. lint / typecheck / 183 tests / build / redirects / schema / links / index / previews green; pushed.

## Questions for Ben

1. **Migration 0010 on main is broken** (the seed's trailing comments ate
   the row commas). Apply the copy from `giveaway-build` (or merge first),
   not main's. Proven in embedded Postgres by `npm test`.
2. **Thank-you send time**: Sun Nov 22 at 10:00 am CT (my call; the plan
   said only "Sun Nov 22"). Dec 1 reminder: 10:00 am CT. Both in config.
3. **Nearer center by ZIP** (lib/giveaway/zip.ts): Rutherford County and
   I-24 south-east → Murfreesboro; Williamson/Davidson and west →
   Nashville; East Tennessee → Murfreesboro. Nolensville, College Grove and
   Lebanon went to Nashville. Move any ZIP in the table.
4. **Draw determinism**: the pick is SHA-256(seed ‖ pool hash ‖ exclusions)
   mod pool size with a 32-byte random seed stored per winner row, so every
   pick re-verifies from the rows. The plan said `crypto.randomInt`; that
   alone is not re-verifiable. Same randomness, auditable.
5. **Unreachable → redraw is a two-step admin action** (mark unreachable,
   then Redraw with a reason), not automatic at the deadline, so nobody is
   redrawn while Sheri is still trying on a Sunday. Say if you want the
   cron to redraw automatically after the deadline instead.
6. **The claim page marks the winner "claimed"** when they enter a phone
   number (the call still has to happen; admin can set contacted/claimed
   either way). The public list then shows "claimed ✓" until public-OK.
7. **check:giveaway runs on the in-memory tables** (0010 is not on the
   project). Once you apply 0010, run `npm run check:giveaway -- --db` to
   repeat it against Supabase with env=test rows.
8. **`/10years/rules` is a placeholder** built from config for counsel to
   replace; the form links to it and records RULES_VERSION.
9. **Admin sessions are the site's own 12-hour cookie** after the Supabase
   code, not Supabase's JWT — no refresh handling, no JWT-lifetime setting.
10. **Copy pass questions** (GIVEAWAY-COPY.md, end): two buttons in "You're
    in"; the grand-prize name is ~110 characters as a subject; typed days
    ("Monday's prize", "Six drawings") where a builder gets no drawing; the
    plain "Free to enter, nothing to buy" line; the opt-in wording; whether
    the public list should say "Hoolest handheld device".
11. **Admin decisions**: public-OK label is computed from the row, never
    typed; "Suspicious" also flags the referrer of a voided bonus
    (thresholds: shares an IP hash with 3+ others, 5+ credits); voiding an
    entry does not change the referral_credits counter (the pool reads only
    void_reason); redrawn winners are read-only; CSV cells starting with
    = @ TAB CR are prefixed with an apostrophe; entries list shows 200 rows
    (search to narrow); re-verify writes an audit row.
12. **Privacy draft proposals**: retention (records to Dec 31 2027; IP/UA
    hashes 90 days after Nov 21) and the tax-form sentence need you and
    the accountant.
