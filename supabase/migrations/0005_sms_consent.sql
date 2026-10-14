-- Text-message consent, recorded on the request it came with (Oct 2026).
--
-- The A2P 10DLC campaign registration was rejected and is being resubmitted;
-- part of what a carrier can ask for is proof of opt-in. Until now the site
-- texted every visitor who asked for a call, with no checkbox, and kept no
-- record of consent because there was none to keep. From now on a text goes
-- only to someone who ticked the box on the contact form or said yes in the
-- assistant's booking flow (lib/sms-consent.ts), and this is the record:
--
--   sms_consent       true only when she agreed. Rows from before this
--                     migration read false — they were never asked.
--   sms_consent_text  the consent wording exactly as it was shown to her,
--                     whether or not she agreed (what she was offered is part
--                     of the record). Null on guide rows and on rows from
--                     before this migration.
--   sms_consent_at    the server's time when the request carrying her yes
--                     arrived. Null unless sms_consent.
--
-- Additive: nullable columns plus a defaulted boolean, so the code deployed
-- before this migration keeps inserting without change.

alter table public.consultation_requests
  add column if not exists sms_consent boolean not null default false,
  add column if not exists sms_consent_text text,
  add column if not exists sms_consent_at timestamptz;

-- A yes always carries its wording and its time; a no never carries a time.
alter table public.consultation_requests
  add constraint consultation_requests_sms_consent_check check (
    (sms_consent and sms_consent_text is not null and sms_consent_at is not null)
    or (not sms_consent and sms_consent_at is null)
  );

comment on column public.consultation_requests.sms_consent is
  'True only when the visitor opted in to texts (form checkbox or a yes in the chat). Pre-2026-10-14 rows read false: they were never asked.';
comment on column public.consultation_requests.sms_consent_text is
  'The consent wording exactly as shown to the visitor, agreed or not. See lib/sms-consent.ts.';
comment on column public.consultation_requests.sms_consent_at is
  'Server time of the request that carried the opt-in. Null unless sms_consent.';
