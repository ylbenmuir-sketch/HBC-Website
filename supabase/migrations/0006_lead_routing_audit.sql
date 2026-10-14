-- 0006 — where each lead's notification went (Ben, 2026-10-14).
--
-- Lead emails are routed by rule (lib/lead-routing.ts): LEADS_NASHVILLE,
-- LEADS_MURFREESBORO, LEADS_CONCIERGE, LEADS_MORE_INFO, LEADS_GUIDE,
-- LEADS_FALLBACK, then LEADS_NOTIFY_EMAIL. These columns record, on the lead
-- itself, which rule fired, which variable the addresses actually came from
-- (a fallback shows here), the To and CC, and what Resend answered — so any
-- lead can be audited against its route later.
--
-- Written by a separate UPDATE after the insert and the send
-- (app/api/consultation/route.ts → recordRouting), never by the insert: an
-- audit column must never be the reason a lead fails to save. All nullable;
-- rows from before this migration read null ("not recorded").

alter table public.consultation_requests
  add column if not exists notify_route text,
  add column if not exists notify_env text,
  add column if not exists notify_to text,
  add column if not exists notify_cc text[],
  add column if not exists notify_status text,
  add column if not exists notify_message_id text,
  add column if not exists notify_error text;

alter table public.consultation_requests
  drop constraint if exists consultation_requests_notify_status_check;

alter table public.consultation_requests
  add constraint consultation_requests_notify_status_check
    check (notify_status is null or notify_status in ('sent', 'failed', 'not_configured'));

comment on column public.consultation_requests.notify_route is
  'Routing rule that fired: guide, more_info, concierge, nashville, murfreesboro, fallback (lib/lead-routing.ts).';
comment on column public.consultation_requests.notify_env is
  'Env var the recipients came from — the route''s own, or LEADS_FALLBACK / LEADS_NOTIFY_EMAIL when it fell back. Null: nothing was set.';
comment on column public.consultation_requests.notify_status is
  'sent = Resend accepted it; failed = Resend or the network refused; not_configured = no key or no recipient.';
comment on column public.consultation_requests.notify_message_id is
  'Resend message id, for looking the send up in the Resend dashboard.';
