-- 0009 — one staff email per form lead (Ben, 2026-10-15).
--
-- A /contact lead's staff notification is no longer sent at step one. It is
-- HELD on the row and sent once, with whatever the visitor has added by then:
--
--   page two saved   → sent at once, with the details in it
--   "Skip for now"   → sent at once
--   neither in 2 min → sent by the release job (Vercel Cron, every minute:
--                      app/api/cron/release-held-leads/route.ts)
--
-- lib/held-notification.ts holds the rules. These columns are its state,
-- written by follow-up UPDATEs, never by the insert, so none of them can be
-- the reason a lead fails to save. Every column is nullable; rows from
-- before this migration (and every chat lead and guide download, which are
-- still sent at once) read null here.
--
--   notify_hold_state   held      waiting for page two, Skip or the timer
--                       sending   claimed by exactly one sender (the claim is
--                                 the conditional UPDATE held → sending, so two
--                                 senders can never both get the row)
--                       released  sent; notify_status says 'sent'
--                       gave_up   still failing 24 hours after the request —
--                                 logged loudly, notify_status 'failed'
--   notify_held_until   when the release job may send it (step one + 2 min)
--   notify_hold_env     which deployment's release job owns it — production,
--                       preview or a local test server — so a test run can
--                       never send (or mark as sent) a real lead's email
--   notify_claimed_at   when the current sender claimed it; a claim older
--                       than two minutes is a crashed sender and is retried
--   notify_attempts     sends tried so far
--   notify_released_by  page_two | skip | cron | sweep
--   notify_had_details  whether the email that went out carried page two —
--                       when it did not, a later page-two save sends the
--                       threaded "Details added" update as before
--   notify_failures     every failed attempt: [{at, by, status, error}]

alter table public.consultation_requests
  add column if not exists notify_hold_state text,
  add column if not exists notify_held_until timestamptz,
  add column if not exists notify_hold_env text,
  add column if not exists notify_claimed_at timestamptz,
  add column if not exists notify_attempts integer not null default 0,
  add column if not exists notify_released_by text,
  add column if not exists notify_had_details boolean,
  add column if not exists notify_failures jsonb not null default '[]'::jsonb;

alter table public.consultation_requests
  drop constraint if exists consultation_requests_notify_hold_state_check;

alter table public.consultation_requests
  add constraint consultation_requests_notify_hold_state_check
    check (notify_hold_state is null or notify_hold_state in ('held', 'sending', 'released', 'gave_up'));

-- The release job's one query: what is due, for this deployment.
create index if not exists consultation_requests_held_idx
  on public.consultation_requests (notify_hold_env, notify_held_until)
  where notify_hold_state in ('held', 'sending');

comment on column public.consultation_requests.notify_hold_state is
  'Held staff notification (form leads): held / sending / released / gave_up. Null: sent at once, the old way.';
comment on column public.consultation_requests.notify_failures is
  'Every failed attempt to send the held staff notification: [{at, by, status, error}].';

-- The release job's heartbeat. Step one holds a notification ONLY when the
-- job for its own deployment has demonstrably run every minute lately (the
-- last two runs both recent and close together); otherwise it sends at
-- step one as before. A missing CRON_SECRET, a paused schedule or a broken
-- job therefore costs the hold, never a lead.
create table if not exists public.lead_job_heartbeats (
  name text primary key,
  last_run_at timestamptz not null,
  previous_run_at timestamptz,
  runs bigint not null default 1
);

alter table public.lead_job_heartbeats enable row level security;

comment on table public.lead_job_heartbeats is
  'Last two runs of each lead job, per deployment (e.g. release-held-leads:production). Service role only.';
