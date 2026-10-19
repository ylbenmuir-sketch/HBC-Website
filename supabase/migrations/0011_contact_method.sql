-- 0011 — "Best way to reach you" (Ben, 2026-10-19).
--
-- A required choice on the contact form's FIRST step — Call, Text or Email —
-- sent with the step-one POST and saved on the row it creates
-- (app/api/consultation/route.ts). The office sees it at the top of the lead
-- email. The chat does not ask, so chat rows read null, as do rows from
-- before this migration.
--
-- Additive and nullable. Numbered 0011: 0010 is the highest migration on both
-- main and giveaway-build, so this cannot collide with either.
--
-- Until this is applied the route still saves every lead: an insert that is
-- refused for this column alone is retried without it (and logged), so the
-- lead is never the thing lost. Apply it and the retries stop.

alter table public.consultation_requests
  add column if not exists contact_method text;

alter table public.consultation_requests
  drop constraint if exists consultation_requests_contact_method_check;

alter table public.consultation_requests
  add constraint consultation_requests_contact_method_check
    check (contact_method is null or contact_method in ('call', 'text', 'email'));

comment on column public.consultation_requests.contact_method is
  'Best way to reach you, from the contact form''s first step: call, text or email. Null for chat rows and rows from before 2026-10-19.';
