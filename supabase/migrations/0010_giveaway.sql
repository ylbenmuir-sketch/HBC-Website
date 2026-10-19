-- 0010 — the 10-year anniversary giveaway (GIVEAWAY-PLAN.md §3; Ben's
-- decisions 1–20, Oct 18 2026). Phase 1: foundations.
--
-- Every table carries `env` ('production' | 'preview' | 'local' | 'test')
-- and every unique key includes it, so a test run on a preview or a laptop
-- shares the database with the real giveaway and can never read, draw from,
-- email or count a real entrant (lib/giveaway/env.ts, lib/giveaway/store.ts).
-- RLS is ON with NO policies on every table: only the service role (route
-- handlers, the cron) can touch them. Nothing public reads these directly.
--
-- Only ADDS: new tables, one SQL function, and one widened check constraint
-- on consultation_requests (source may now be 'giveaway'). Nothing is
-- dropped, renamed or changed on any existing table beyond that constraint.
--
-- The seed rows at the end (prizes, drawings) are GENERATED from
-- lib/giveaway/config.ts by lib/giveaway/seed-sql.ts; `npm test` fails if
-- this file and the config disagree. Edit the config, regenerate, paste.
--
-- Apply: Supabase → project HBC-Website (brwyfneahhhkymytkvpx) → SQL Editor
-- → New query → paste this whole file → Run. Idempotent: safe to run twice.


-- ── People ────────────────────────────────────────────────────────────────
-- One row per verified person (notify-me signups who tapped, entrants who
-- clicked their verification link). `email` is normalized (lower-case; Gmail
-- dots and +tags folded) and unique per env; email_display is as typed.
create table if not exists public.giveaway_people (
  id uuid primary key default gen_random_uuid(),
  env text not null check (env in ('production', 'preview', 'local', 'test')),
  created_at timestamptz not null default now(),
  email text not null,
  email_display text not null,
  first_name text not null,
  last_name text not null,
  zip text not null check (zip ~ '^[0-9]{5}$'),
  city text,
  nearest_center text check (nearest_center is null or nearest_center in ('nashville', 'murfreesboro')),
  is_existing_client boolean not null default false,
  age_confirmed boolean not null default false,
  rules_accepted_at timestamptz,
  rules_version text,
  verified_at timestamptz,
  referral_code text not null,
  referred_by_person_id uuid references public.giveaway_people (id),
  referral_credits integer not null default 0,
  source_page text,
  ip_hash text,
  ua_hash text,
  marketing_opt_in boolean not null default false,
  marketing_opt_in_wording text,
  marketing_opt_in_at timestamptz,
  unsubscribed_at timestamptz,
  unique (env, email),
  unique (env, referral_code)
);
alter table public.giveaway_people enable row level security;
comment on table public.giveaway_people is 'One row per verified giveaway person. Service role only; env-scoped.';
comment on column public.giveaway_people.is_existing_client is 'The "I''m already an HBC client" box: picks the current_client prize version and adds the forward-to-a-friend line to their emails (decisions 15, 16).';
comment on column public.giveaway_people.referral_credits is 'Credited friends so far (cap: config REFERRAL.friendCap = 10). Maintained by the referral code path; the entries ledger is the source of truth.';

-- ── Notify-me ─────────────────────────────────────────────────────────────
-- Signups before entries open. Holds the full entry set so the Sunday
-- "It's live" email can enter them in one tap (decision 13).
create table if not exists public.giveaway_notify (
  id uuid primary key default gen_random_uuid(),
  env text not null check (env in ('production', 'preview', 'local', 'test')),
  created_at timestamptz not null default now(),
  email text not null,
  email_display text not null,
  first_name text not null,
  last_name text not null,
  zip text not null check (zip ~ '^[0-9]{5}$'),
  is_existing_client boolean not null default false,
  age_confirmed boolean not null default false,
  rules_accepted_at timestamptz,
  rules_version text,
  marketing_opt_in boolean not null default false,
  marketing_opt_in_wording text,
  marketing_opt_in_at timestamptz,
  verify_token_hash text,
  verified_at timestamptz,
  live_token_hash text,
  sent_live_at timestamptz,
  reminded_at timestamptz,
  tapped_at timestamptz,
  person_id uuid references public.giveaway_people (id),
  source_page text,
  ip_hash text,
  ua_hash text,
  unsubscribed_at timestamptz,
  unique (env, email)
);
alter table public.giveaway_notify enable row level security;
comment on table public.giveaway_notify is 'Notify-me signups (Nov 9–15) with the full entry set for the one-tap entry. Service role only; env-scoped.';

-- ── Entries — the ledger of chances ───────────────────────────────────────
-- Weights are row counts; nothing is a mutable counter (decisions 1–3).
create table if not exists public.giveaway_entries (
  id uuid primary key default gen_random_uuid(),
  env text not null check (env in ('production', 'preview', 'local', 'test')),
  created_at timestamptz not null default now(),
  person_id uuid not null references public.giveaway_people (id),
  kind text not null check (kind in ('base', 'early_bird', 'referral_bonus', 'referred_bonus', 'amoe')),
  referral_person_id uuid references public.giveaway_people (id),
  void_reason text,
  voided_at timestamptz
);
alter table public.giveaway_entries enable row level security;
create unique index if not exists giveaway_entries_one_base_idx on public.giveaway_entries (env, person_id) where kind = 'base';
create unique index if not exists giveaway_entries_one_early_bird_idx on public.giveaway_entries (env, person_id) where kind = 'early_bird';
create unique index if not exists giveaway_entries_one_referred_bonus_idx on public.giveaway_entries (env, person_id) where kind = 'referred_bonus';
create index if not exists giveaway_entries_person_idx on public.giveaway_entries (env, person_id);
create index if not exists giveaway_entries_referral_idx on public.giveaway_entries (env, referral_person_id) where referral_person_id is not null;
comment on table public.giveaway_entries is 'Every chance in every drawing: one base per person, one early_bird, three referral_bonus per credited friend (cap 10 friends), one referred_bonus. void_reason set = out of every pool.';

-- ── Prizes — seeded from config, two versions per drawing ─────────────────
create table if not exists public.giveaway_prizes (
  id uuid primary key default gen_random_uuid(),
  env text not null check (env in ('production', 'preview', 'local', 'test')),
  slot text not null check (slot in ('mon', 'tue', 'wed', 'thu', 'fri', 'grand')),
  version text not null check (version in ('new_client', 'current_client')),
  name text not null,
  description text not null,
  brain_map boolean not null,
  sessions integer not null,
  vibro_chair boolean not null default true,
  hoolest_keychain boolean not null default false,
  hoolest_handheld boolean not null default false,
  partner_services boolean not null default false,
  retail_value_usd numeric(10, 2) not null,
  practitioner_cost_usd numeric(10, 2) not null,
  tax_form_required boolean not null,
  fulfilment_status text not null default 'pending' check (fulfilment_status in ('pending', 'scheduled', 'delivered', 'declined')),
  unique (env, slot, version)
);
alter table public.giveaway_prizes enable row level security;
comment on table public.giveaway_prizes is 'The HBC prize ladder (decision 16), both versions per drawing. Values computed from lib/giveaway/config.ts rates — never hand-typed. Partner prizes live in config only.';

-- ── Drawings — the schedule and the result ────────────────────────────────
-- Unique (env, scheduled_at, kind) is the idempotency key: a second cron
-- tick finds the row drawn and does nothing. Six rows per env (decision 17).
create table if not exists public.giveaway_drawings (
  id uuid primary key default gen_random_uuid(),
  env text not null check (env in ('production', 'preview', 'local', 'test')),
  slot text not null check (slot in ('mon', 'tue', 'wed', 'thu', 'fri', 'grand')),
  kind text not null check (kind in ('daily', 'grand')),
  scheduled_at timestamptz not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'drawing', 'drawn', 'redrawn', 'void')),
  pool_snapshot_hash text,
  pool_size integer,
  entries_count integer,
  seed text,
  winner_entry_id uuid references public.giveaway_entries (id),
  winner_person_id uuid references public.giveaway_people (id),
  drawn_at timestamptz,
  drawn_by text,
  claimed_at timestamptz,
  unique (env, scheduled_at, kind),
  unique (env, slot)
);
alter table public.giveaway_drawings enable row level security;
comment on table public.giveaway_drawings is 'One row per drawing (five daily, one grand), seeded from config. status drawing = claimed by one runner (conditional UPDATE), the same never-twice rule as the held lead email.';

-- The frozen pool, written in the same step as the draw, so the pick can be
-- re-verified from the stored seed and a redraw uses the same pool.
create table if not exists public.giveaway_drawing_pool (
  id bigint generated always as identity primary key,
  env text not null check (env in ('production', 'preview', 'local', 'test')),
  drawing_id uuid not null references public.giveaway_drawings (id),
  entry_id uuid not null references public.giveaway_entries (id),
  person_id uuid not null references public.giveaway_people (id),
  position integer not null,
  unique (drawing_id, entry_id),
  unique (drawing_id, position)
);
alter table public.giveaway_drawing_pool enable row level security;
create index if not exists giveaway_drawing_pool_drawing_idx on public.giveaway_drawing_pool (drawing_id);

-- ── Winners — one row per result, including redraw history ────────────────
create table if not exists public.giveaway_winners (
  id uuid primary key default gen_random_uuid(),
  env text not null check (env in ('production', 'preview', 'local', 'test')),
  created_at timestamptz not null default now(),
  drawing_id uuid not null references public.giveaway_drawings (id),
  person_id uuid not null references public.giveaway_people (id),
  entry_id uuid references public.giveaway_entries (id),
  prize_id uuid not null references public.giveaway_prizes (id),
  prize_version text not null check (prize_version in ('new_client', 'current_client')),
  claim_token_hash text,
  phone text,
  status text not null default 'drawn' check (status in ('drawn', 'contacted', 'claimed', 'unreachable', 'declined', 'ineligible', 'redrawn')),
  claim_deadline_at timestamptz not null,
  call_attempts jsonb not null default '[]'::jsonb,
  contacted_at timestamptz,
  claimed_at timestamptz,
  public_ok boolean not null default false,
  public_ok_at timestamptz,
  public_label text,
  tax_form_required boolean not null default false,
  tax_form_received_at timestamptz,
  redraw_reason text,
  redrawn_at timestamptz,
  notes text
);
alter table public.giveaway_winners enable row level security;
create index if not exists giveaway_winners_drawing_idx on public.giveaway_winners (env, drawing_id);
comment on table public.giveaway_winners is 'Every drawing result, redraws included (status redrawn). claim_deadline_at follows decision 18 (72 h; Sun/Mon → Tue 5 pm CT). tax_form_required from the prize''s computed value (> $600).';

-- ── Audit — append-only ───────────────────────────────────────────────────
create table if not exists public.giveaway_audit (
  id bigint generated always as identity primary key,
  env text not null check (env in ('production', 'preview', 'local', 'test')),
  at timestamptz not null default now(),
  actor text not null,
  action text not null,
  target_table text,
  target_id text,
  reason text,
  before jsonb,
  after jsonb,
  ip_hash text
);
alter table public.giveaway_audit enable row level security;
create index if not exists giveaway_audit_env_at_idx on public.giveaway_audit (env, at desc);
comment on table public.giveaway_audit is 'Append-only: every draw, redraw, void, admin login (requested/denied/verified/failed), export, toggle, unsubscribe. actor = staff email or ''cron'' / ''system''.';

-- ── Offers — one code per person, one kind (decision 15) ──────────────────
create table if not exists public.giveaway_offers (
  id uuid primary key default gen_random_uuid(),
  env text not null check (env in ('production', 'preview', 'local', 'test')),
  person_id uuid not null references public.giveaway_people (id),
  kind text not null default 'free_first_visit' check (kind in ('free_first_visit')),
  code text not null,
  issued_at timestamptz not null default now(),
  expires_at timestamptz not null,
  redeemed_at timestamptz,
  consultation_request_id uuid,
  redeemed_center text,
  unique (env, person_id),
  unique (env, code)
);
alter table public.giveaway_offers enable row level security;
comment on table public.giveaway_offers is 'The thank-you offer code per person. Existing clients get the same code (decision 15). Redemption = code → consultation_requests row.';

-- ── Admin allowlist — seeded at runtime from GIVEAWAY_ADMINS ──────────────
create table if not exists public.giveaway_admin_allowlist (
  id uuid primary key default gen_random_uuid(),
  env text not null check (env in ('production', 'preview', 'local', 'test')),
  email text not null,
  added_at timestamptz not null default now(),
  added_by text not null default 'env',
  unique (env, email)
);
alter table public.giveaway_admin_allowlist enable row level security;
comment on table public.giveaway_admin_allowlist is 'Who may sign in at /admin/10years. Seeded from the GIVEAWAY_ADMINS env var on each login attempt; no address is written in code.';

-- ── Rate limits — fixed windows, atomic increment ─────────────────────────
create table if not exists public.rate_limits (
  env text not null check (env in ('production', 'preview', 'local', 'test')),
  bucket text not null,
  key_hash text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (env, bucket, key_hash, window_start)
);
alter table public.rate_limits enable row level security;
comment on table public.rate_limits is 'Database-backed limiter (lib/giveaway/rate-limit.ts). Keys are SHA-256 hashes; rows older than a day can be purged.';

create or replace function public.giveaway_rate_limit_hit(p_env text, p_bucket text, p_key_hash text, p_window_start timestamptz)
returns integer
language sql
security invoker
set search_path = public
as $$
  insert into public.rate_limits (env, bucket, key_hash, window_start, count)
  values (p_env, p_bucket, p_key_hash, p_window_start, 1)
  on conflict (env, bucket, key_hash, window_start)
  do update set count = rate_limits.count + 1
  returning count;
$$;
revoke all on function public.giveaway_rate_limit_hit(text, text, text, timestamptz) from public, anon, authenticated;
comment on function public.giveaway_rate_limit_hit is 'Increment one (env, bucket, key_hash, window) and return the new count. Service role only.';

-- ── Scheduled sends — the email schedule the per-minute job drains ────────
create table if not exists public.scheduled_sends (
  id uuid primary key default gen_random_uuid(),
  env text not null check (env in ('production', 'preview', 'local', 'test')),
  created_at timestamptz not null default now(),
  kind text not null,
  due_at timestamptz not null,
  person_id uuid references public.giveaway_people (id),
  notify_id uuid references public.giveaway_notify (id),
  claimed_at timestamptz,
  sent_at timestamptz,
  skipped_reason text,
  message_id text,
  error text
);
alter table public.scheduled_sends enable row level security;
-- Unique with nulls treated as equal, written as an expression so it works
-- on every Postgres version Supabase runs.
create unique index if not exists scheduled_sends_once_idx
  on public.scheduled_sends (env, kind, due_at, coalesce(person_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(notify_id, '00000000-0000-0000-0000-000000000000'::uuid));
create index if not exists scheduled_sends_due_idx on public.scheduled_sends (env, due_at) where sent_at is null and skipped_reason is null;
comment on table public.scheduled_sends is 'Every scheduled giveaway email (It''s live, Monday reminder, daily afternoon, Tuesday call-today, Nov 22 thank-you; Dec 1 reminder added after Nov 21). Drained by the per-minute job; unique per (env, kind, due_at, recipient).';

-- ── consultation_requests: an offer booking is a lead with source 'giveaway'
alter table public.consultation_requests
  drop constraint if exists consultation_requests_source_check;
alter table public.consultation_requests
  add constraint consultation_requests_source_check
    check (source in ('form', 'chat', 'giveaway'));
comment on column public.consultation_requests.source is
  'Channel the request arrived through: "form" (ContactForm/GuideCta), "chat" (site assistant) or "giveaway" (a 10-year offer code booked through /contact).';

-- ── Seed: prizes and drawings, generated from lib/giveaway/config.ts ──────
-- BEGIN generated from lib/giveaway/config.ts (do not edit by hand; npm test checks it)
insert into public.giveaway_prizes
  (env, slot, version, name, description, brain_map, sessions, vibro_chair, hoolest_keychain, hoolest_handheld, partner_services, retail_value_usd, practitioner_cost_usd, tax_form_required)
values
  ('production', 'mon', 'new_client', 'Brain Map + 2 sessions', 'a Brain Map and 2 LENS sessions (every session includes the vibro chair)', true, 2, true, false, false, false, 480, 105, false),
  ('production', 'mon', 'current_client', '2 sessions', '2 LENS sessions (every session includes the vibro chair)', false, 2, true, false, false, false, 330, 70, false),
  ('production', 'tue', 'new_client', 'Brain Map + 3 sessions', 'a Brain Map and 3 LENS sessions (every session includes the vibro chair)', true, 3, true, false, false, false, 645, 140, true),
  ('production', 'tue', 'current_client', '3 sessions', '3 LENS sessions (every session includes the vibro chair)', false, 3, true, false, false, false, 495, 105, false),
  ('production', 'wed', 'new_client', 'Brain Map + 4 sessions + Hoolest keychain', 'a Brain Map, 4 LENS sessions and a Hoolest keychain (every session includes the vibro chair)', true, 4, true, true, false, false, 810, 175, true),
  ('production', 'wed', 'current_client', '4 sessions + Hoolest keychain', '4 LENS sessions and a Hoolest keychain (every session includes the vibro chair)', false, 4, true, true, false, false, 660, 140, true),
  ('production', 'thu', 'new_client', 'Brain Map + 5 sessions + Hoolest keychain', 'a Brain Map, 5 LENS sessions and a Hoolest keychain (every session includes the vibro chair)', true, 5, true, true, false, false, 975, 210, true),
  ('production', 'thu', 'current_client', '5 sessions + Hoolest keychain', '5 LENS sessions and a Hoolest keychain (every session includes the vibro chair)', false, 5, true, true, false, false, 825, 175, true),
  ('production', 'fri', 'new_client', 'Brain Map + 7 sessions + Hoolest keychain', 'a Brain Map, 7 LENS sessions and a Hoolest keychain (every session includes the vibro chair)', true, 7, true, true, false, false, 1305, 280, true),
  ('production', 'fri', 'current_client', '7 sessions + Hoolest keychain', '7 LENS sessions and a Hoolest keychain (every session includes the vibro chair)', false, 7, true, true, false, false, 1155, 245, true),
  ('production', 'grand', 'new_client', 'Brain Map + 12 sessions + Hoolest handheld vagus nerve stimulator (to keep) + one service from every partner', 'a Brain Map, 12 LENS sessions, a Hoolest handheld vagus nerve stimulator to keep and one service from every partner (every session includes the vibro chair)', true, 12, true, false, true, true, 2559, 455, true),
  ('production', 'grand', 'current_client', '13 sessions + Hoolest handheld vagus nerve stimulator (to keep) + one service from every partner', '13 LENS sessions, a Hoolest handheld vagus nerve stimulator to keep and one service from every partner (every session includes the vibro chair)', false, 13, true, false, true, true, 2574, 455, true),
  ('preview', 'mon', 'new_client', 'Brain Map + 2 sessions', 'a Brain Map and 2 LENS sessions (every session includes the vibro chair)', true, 2, true, false, false, false, 480, 105, false),
  ('preview', 'mon', 'current_client', '2 sessions', '2 LENS sessions (every session includes the vibro chair)', false, 2, true, false, false, false, 330, 70, false),
  ('preview', 'tue', 'new_client', 'Brain Map + 3 sessions', 'a Brain Map and 3 LENS sessions (every session includes the vibro chair)', true, 3, true, false, false, false, 645, 140, true),
  ('preview', 'tue', 'current_client', '3 sessions', '3 LENS sessions (every session includes the vibro chair)', false, 3, true, false, false, false, 495, 105, false),
  ('preview', 'wed', 'new_client', 'Brain Map + 4 sessions + Hoolest keychain', 'a Brain Map, 4 LENS sessions and a Hoolest keychain (every session includes the vibro chair)', true, 4, true, true, false, false, 810, 175, true),
  ('preview', 'wed', 'current_client', '4 sessions + Hoolest keychain', '4 LENS sessions and a Hoolest keychain (every session includes the vibro chair)', false, 4, true, true, false, false, 660, 140, true),
  ('preview', 'thu', 'new_client', 'Brain Map + 5 sessions + Hoolest keychain', 'a Brain Map, 5 LENS sessions and a Hoolest keychain (every session includes the vibro chair)', true, 5, true, true, false, false, 975, 210, true),
  ('preview', 'thu', 'current_client', '5 sessions + Hoolest keychain', '5 LENS sessions and a Hoolest keychain (every session includes the vibro chair)', false, 5, true, true, false, false, 825, 175, true),
  ('preview', 'fri', 'new_client', 'Brain Map + 7 sessions + Hoolest keychain', 'a Brain Map, 7 LENS sessions and a Hoolest keychain (every session includes the vibro chair)', true, 7, true, true, false, false, 1305, 280, true),
  ('preview', 'fri', 'current_client', '7 sessions + Hoolest keychain', '7 LENS sessions and a Hoolest keychain (every session includes the vibro chair)', false, 7, true, true, false, false, 1155, 245, true),
  ('preview', 'grand', 'new_client', 'Brain Map + 12 sessions + Hoolest handheld vagus nerve stimulator (to keep) + one service from every partner', 'a Brain Map, 12 LENS sessions, a Hoolest handheld vagus nerve stimulator to keep and one service from every partner (every session includes the vibro chair)', true, 12, true, false, true, true, 2559, 455, true),
  ('preview', 'grand', 'current_client', '13 sessions + Hoolest handheld vagus nerve stimulator (to keep) + one service from every partner', '13 LENS sessions, a Hoolest handheld vagus nerve stimulator to keep and one service from every partner (every session includes the vibro chair)', false, 13, true, false, true, true, 2574, 455, true),
  ('local', 'mon', 'new_client', 'Brain Map + 2 sessions', 'a Brain Map and 2 LENS sessions (every session includes the vibro chair)', true, 2, true, false, false, false, 480, 105, false),
  ('local', 'mon', 'current_client', '2 sessions', '2 LENS sessions (every session includes the vibro chair)', false, 2, true, false, false, false, 330, 70, false),
  ('local', 'tue', 'new_client', 'Brain Map + 3 sessions', 'a Brain Map and 3 LENS sessions (every session includes the vibro chair)', true, 3, true, false, false, false, 645, 140, true),
  ('local', 'tue', 'current_client', '3 sessions', '3 LENS sessions (every session includes the vibro chair)', false, 3, true, false, false, false, 495, 105, false),
  ('local', 'wed', 'new_client', 'Brain Map + 4 sessions + Hoolest keychain', 'a Brain Map, 4 LENS sessions and a Hoolest keychain (every session includes the vibro chair)', true, 4, true, true, false, false, 810, 175, true),
  ('local', 'wed', 'current_client', '4 sessions + Hoolest keychain', '4 LENS sessions and a Hoolest keychain (every session includes the vibro chair)', false, 4, true, true, false, false, 660, 140, true),
  ('local', 'thu', 'new_client', 'Brain Map + 5 sessions + Hoolest keychain', 'a Brain Map, 5 LENS sessions and a Hoolest keychain (every session includes the vibro chair)', true, 5, true, true, false, false, 975, 210, true),
  ('local', 'thu', 'current_client', '5 sessions + Hoolest keychain', '5 LENS sessions and a Hoolest keychain (every session includes the vibro chair)', false, 5, true, true, false, false, 825, 175, true),
  ('local', 'fri', 'new_client', 'Brain Map + 7 sessions + Hoolest keychain', 'a Brain Map, 7 LENS sessions and a Hoolest keychain (every session includes the vibro chair)', true, 7, true, true, false, false, 1305, 280, true),
  ('local', 'fri', 'current_client', '7 sessions + Hoolest keychain', '7 LENS sessions and a Hoolest keychain (every session includes the vibro chair)', false, 7, true, true, false, false, 1155, 245, true),
  ('local', 'grand', 'new_client', 'Brain Map + 12 sessions + Hoolest handheld vagus nerve stimulator (to keep) + one service from every partner', 'a Brain Map, 12 LENS sessions, a Hoolest handheld vagus nerve stimulator to keep and one service from every partner (every session includes the vibro chair)', true, 12, true, false, true, true, 2559, 455, true),
  ('local', 'grand', 'current_client', '13 sessions + Hoolest handheld vagus nerve stimulator (to keep) + one service from every partner', '13 LENS sessions, a Hoolest handheld vagus nerve stimulator to keep and one service from every partner (every session includes the vibro chair)', false, 13, true, false, true, true, 2574, 455, true),
  ('test', 'mon', 'new_client', 'Brain Map + 2 sessions', 'a Brain Map and 2 LENS sessions (every session includes the vibro chair)', true, 2, true, false, false, false, 480, 105, false),
  ('test', 'mon', 'current_client', '2 sessions', '2 LENS sessions (every session includes the vibro chair)', false, 2, true, false, false, false, 330, 70, false),
  ('test', 'tue', 'new_client', 'Brain Map + 3 sessions', 'a Brain Map and 3 LENS sessions (every session includes the vibro chair)', true, 3, true, false, false, false, 645, 140, true),
  ('test', 'tue', 'current_client', '3 sessions', '3 LENS sessions (every session includes the vibro chair)', false, 3, true, false, false, false, 495, 105, false),
  ('test', 'wed', 'new_client', 'Brain Map + 4 sessions + Hoolest keychain', 'a Brain Map, 4 LENS sessions and a Hoolest keychain (every session includes the vibro chair)', true, 4, true, true, false, false, 810, 175, true),
  ('test', 'wed', 'current_client', '4 sessions + Hoolest keychain', '4 LENS sessions and a Hoolest keychain (every session includes the vibro chair)', false, 4, true, true, false, false, 660, 140, true),
  ('test', 'thu', 'new_client', 'Brain Map + 5 sessions + Hoolest keychain', 'a Brain Map, 5 LENS sessions and a Hoolest keychain (every session includes the vibro chair)', true, 5, true, true, false, false, 975, 210, true),
  ('test', 'thu', 'current_client', '5 sessions + Hoolest keychain', '5 LENS sessions and a Hoolest keychain (every session includes the vibro chair)', false, 5, true, true, false, false, 825, 175, true),
  ('test', 'fri', 'new_client', 'Brain Map + 7 sessions + Hoolest keychain', 'a Brain Map, 7 LENS sessions and a Hoolest keychain (every session includes the vibro chair)', true, 7, true, true, false, false, 1305, 280, true),
  ('test', 'fri', 'current_client', '7 sessions + Hoolest keychain', '7 LENS sessions and a Hoolest keychain (every session includes the vibro chair)', false, 7, true, true, false, false, 1155, 245, true),
  ('test', 'grand', 'new_client', 'Brain Map + 12 sessions + Hoolest handheld vagus nerve stimulator (to keep) + one service from every partner', 'a Brain Map, 12 LENS sessions, a Hoolest handheld vagus nerve stimulator to keep and one service from every partner (every session includes the vibro chair)', true, 12, true, false, true, true, 2559, 455, true),
  ('test', 'grand', 'current_client', '13 sessions + Hoolest handheld vagus nerve stimulator (to keep) + one service from every partner', '13 LENS sessions, a Hoolest handheld vagus nerve stimulator to keep and one service from every partner (every session includes the vibro chair)', false, 13, true, false, true, true, 2574, 455, true)
on conflict (env, slot, version) do nothing;

insert into public.giveaway_drawings (env, slot, kind, scheduled_at)
values
  ('production', 'mon', 'daily', '2026-11-16T18:00:00.000Z'), -- Mon Nov 16, 12:00 PM CT
  ('production', 'tue', 'daily', '2026-11-17T18:00:00.000Z'), -- Tue Nov 17, 12:00 PM CT
  ('production', 'wed', 'daily', '2026-11-18T18:00:00.000Z'), -- Wed Nov 18, 12:00 PM CT
  ('production', 'thu', 'daily', '2026-11-19T18:00:00.000Z'), -- Thu Nov 19, 12:00 PM CT
  ('production', 'fri', 'daily', '2026-11-20T18:00:00.000Z'), -- Fri Nov 20, 12:00 PM CT
  ('production', 'grand', 'grand', '2026-11-21T23:00:00.000Z'), -- Sat Nov 21, 5:00 PM CT
  ('preview', 'mon', 'daily', '2026-11-16T18:00:00.000Z'), -- Mon Nov 16, 12:00 PM CT
  ('preview', 'tue', 'daily', '2026-11-17T18:00:00.000Z'), -- Tue Nov 17, 12:00 PM CT
  ('preview', 'wed', 'daily', '2026-11-18T18:00:00.000Z'), -- Wed Nov 18, 12:00 PM CT
  ('preview', 'thu', 'daily', '2026-11-19T18:00:00.000Z'), -- Thu Nov 19, 12:00 PM CT
  ('preview', 'fri', 'daily', '2026-11-20T18:00:00.000Z'), -- Fri Nov 20, 12:00 PM CT
  ('preview', 'grand', 'grand', '2026-11-21T23:00:00.000Z'), -- Sat Nov 21, 5:00 PM CT
  ('local', 'mon', 'daily', '2026-11-16T18:00:00.000Z'), -- Mon Nov 16, 12:00 PM CT
  ('local', 'tue', 'daily', '2026-11-17T18:00:00.000Z'), -- Tue Nov 17, 12:00 PM CT
  ('local', 'wed', 'daily', '2026-11-18T18:00:00.000Z'), -- Wed Nov 18, 12:00 PM CT
  ('local', 'thu', 'daily', '2026-11-19T18:00:00.000Z'), -- Thu Nov 19, 12:00 PM CT
  ('local', 'fri', 'daily', '2026-11-20T18:00:00.000Z'), -- Fri Nov 20, 12:00 PM CT
  ('local', 'grand', 'grand', '2026-11-21T23:00:00.000Z'), -- Sat Nov 21, 5:00 PM CT
  ('test', 'mon', 'daily', '2026-11-16T18:00:00.000Z'), -- Mon Nov 16, 12:00 PM CT
  ('test', 'tue', 'daily', '2026-11-17T18:00:00.000Z'), -- Tue Nov 17, 12:00 PM CT
  ('test', 'wed', 'daily', '2026-11-18T18:00:00.000Z'), -- Wed Nov 18, 12:00 PM CT
  ('test', 'thu', 'daily', '2026-11-19T18:00:00.000Z'), -- Thu Nov 19, 12:00 PM CT
  ('test', 'fri', 'daily', '2026-11-20T18:00:00.000Z'), -- Fri Nov 20, 12:00 PM CT
  ('test', 'grand', 'grand', '2026-11-21T23:00:00.000Z') -- Sat Nov 21, 5:00 PM CT
on conflict (env, scheduled_at, kind) do nothing;
-- END generated from lib/giveaway/config.ts
