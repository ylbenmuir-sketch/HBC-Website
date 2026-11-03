-- The 10-year giveaway path's call-me box, recorded on the request it came
-- with (fix list rev 2, P0-8; Ben, 2026-11-03).
--
-- /contact?from=10years offers no texting: giveaway entrants get email only
-- (Dialpad bans sweepstakes traffic). In place of the texting box it shows an
-- unticked "Yes, call me to schedule my visit." (lib/call-consent.ts). The
-- record mirrors the SMS consent of 0005:
--
--   call_consent       true only when she ticked it, with a number to call.
--   call_consent_text  the wording exactly as shown, ticked or not. Null on
--                      every request that did not come through the giveaway
--                      path.
--   call_consent_at    the server's time of the request that carried the
--                      yes. Null unless call_consent.
--
-- Additive and idempotent. Until it is applied the route saves the lead
-- without these three columns and logs that 0014 is missing.

alter table public.consultation_requests
  add column if not exists call_consent boolean not null default false,
  add column if not exists call_consent_text text,
  add column if not exists call_consent_at timestamptz;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'consultation_requests_call_consent_check') then
    alter table public.consultation_requests
      add constraint consultation_requests_call_consent_check check (
        (call_consent and call_consent_text is not null and call_consent_at is not null)
        or (not call_consent and call_consent_at is null)
      );
  end if;
end
$$;

comment on column public.consultation_requests.call_consent is
  'True only when a 10-year giveaway booking ticked "Yes, call me to schedule my visit." with a phone number.';
comment on column public.consultation_requests.call_consent_text is
  'The call-me wording exactly as shown on the giveaway path, ticked or not. See lib/call-consent.ts.';
comment on column public.consultation_requests.call_consent_at is
  'Server time of the request that carried the yes. Null unless call_consent.';
