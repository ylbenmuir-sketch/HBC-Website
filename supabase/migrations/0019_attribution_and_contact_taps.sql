-- 0019 — where a lead came from, and the tap log (Ben, 2026-11-09).
--
-- 1. Attribution on consultation_requests. The Instagram bio link lands on
--    /start with utm tags; the lead row keeps the FIRST page's four tags
--    (cleaned: lowercase, [a-z0-9._-], at most 64 characters — lib/attribution.ts)
--    and one fixed word, lead_source, "instagram" when the visit started
--    there (utm_source=instagram, or an instagram.com referrer). Facts about
--    the link, not the person. Additive and nullable: older rows, chat rows
--    and untagged visits read null. Until applied, the route saves the lead
--    without these columns (it retries without them) and logs that 0019 is
--    missing.
--
-- 2. contact_taps — one row per tap on a tel: or sms: link anywhere on the
--    site (POST /api/track/tap, sent with sendBeacon so it never delays the
--    tap; lib/tap.ts). What is kept: when, phone or text, which button
--    (location), which center's line, which page, and whether the device
--    was a phone or a desktop. What is NOT kept, by design: no IP address,
--    no user or session id, no user agent, no number. Bots and /admin are
--    dropped before the insert. The match_* columns are filled by the
--    nightly job (/api/cron/tap-match; lib/tap-match.ts), which pairs each
--    tap with the first inbound Dialpad call or text to that center's line
--    0–3 minutes after it — an estimate, and said so in the stats endpoint's
--    notes. dialpad_event_id is the matched call or message id, so one
--    Dialpad event can be matched to at most one tap (the unique index).
--    No backfill: rows start at the deploy.
--
-- RLS on with no policies, like every table here: the server writes and
-- reads with the service role; the browser never touches it.

alter table public.consultation_requests
  add column if not exists utm_source text,
  add column if not exists utm_medium text,
  add column if not exists utm_campaign text,
  add column if not exists utm_content text,
  add column if not exists lead_source text;

alter table public.consultation_requests
  drop constraint if exists consultation_requests_lead_source_check;
alter table public.consultation_requests
  add constraint consultation_requests_lead_source_check
    check (lead_source is null or lead_source in ('instagram'));

comment on column public.consultation_requests.utm_source is 'First-touch utm_source of the visit (cleaned; lib/attribution.ts). Null when the visit carried none.';
comment on column public.consultation_requests.lead_source is 'Where the visit started, one fixed word: instagram (utm_source=instagram or an instagram.com referrer). Null otherwise.';

create table if not exists public.contact_taps (
  id uuid primary key default gen_random_uuid(),
  ts timestamptz not null default now(),
  link_type text not null,
  location text not null,
  center text not null,
  page_path text not null,
  device text not null,
  -- Filled by the matching job. match_status: pending → matched | unmatched.
  match_status text not null default 'pending',
  matched_at timestamptz,
  dialpad_event_id text,
  -- Phone taps: was the matched call answered by a person, and how long did
  -- the talk run. Text taps: did staff reply within 24 hours (null until the
  -- 24 hours have passed).
  answered boolean,
  duration_bucket text,
  replied_within_24h boolean,
  reply_checked_at timestamptz,

  constraint contact_taps_link_type_check check (link_type in ('phone', 'text')),
  constraint contact_taps_center_check check (center in ('nashville', 'murfreesboro', 'other')),
  constraint contact_taps_device_check check (device in ('mobile', 'desktop')),
  constraint contact_taps_match_status_check check (match_status in ('pending', 'matched', 'unmatched')),
  constraint contact_taps_duration_bucket_check check (duration_bucket is null or duration_bucket in ('<30s', '30s-2m', '>2m'))
);

create index if not exists contact_taps_ts_idx on public.contact_taps (ts);
create unique index if not exists contact_taps_dialpad_event_idx on public.contact_taps (dialpad_event_id) where dialpad_event_id is not null;

alter table public.contact_taps enable row level security;

comment on table public.contact_taps is
  'One row per tap on a tel:/sms: link on the website (lib/tap.ts): when, phone or text, button location, center line, page, device class. No IP, no user id, no user agent, no number. match_* filled nightly by lib/tap-match.ts against Dialpad (0–3 minute window estimate).';
