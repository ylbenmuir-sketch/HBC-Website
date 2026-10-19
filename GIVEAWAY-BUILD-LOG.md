# 10-year giveaway — build log

Running record of the build (Ben's briefs, 2026-10-18). A fresh session
resumes from here: read the **Morning report** first, then **Where things
stand**, then the **Questions for Ben**. The spec is `GIVEAWAY-PLAN.md`.

---

## Morning report (updated as the night goes)

_(Overnight build in progress on branch `giveaway-build`. This section is
rewritten at the end.)_

---

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

- [ ] 0. Core for the night: in-memory PostgREST-shaped client (tests +
      `GIVEAWAY_REPO=memory` server mode for local/test only); PGlite proves
      0010 executes.
- [ ] 1. Copy deck `GIVEAWAY-COPY.md` + `lib/giveaway/copy.ts` wired.
- [ ] 2. Phase 2 notify-me (`/10years` date-gated, form, TN ZIP, honeypot,
      limiter, verify, chat suppression window, Q&A, sitemap/noindex rules,
      `PRIVACY-POLICY-GIVEAWAY-DRAFT.md`).
- [ ] 3. Phase 3 engine (entries, one-tap + early bird, referrals, drawings
      on the cron, scheduled sends, winner + claim + deadline + tax step,
      redraw, winners list, alerts, offer codes + /contact, admin screens).
- [ ] 4. Phase 4 prep: `check:giveaway` end to end.
- [ ] 5. lint / typecheck / tests / checks; push `giveaway-build`.

## Questions for Ben

_(filled in as decisions are made overnight)_
