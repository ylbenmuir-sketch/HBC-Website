-- 0007 — "Who referred you?" (Ben, 2026-10-14).
--
-- An optional text box on the contact form's second step, under "In your own
-- words". Like the other step-two answers it arrives by PATCH on the row step
-- one created (app/api/consultation/[id]/route.ts) — so it is never part of
-- the insert and can never be the reason a lead fails to save.
--
-- Additive and nullable: rows from before this migration, chat rows (the
-- assistant does not ask) and form rows that skipped the question read null.

alter table public.consultation_requests
  add column if not exists referred_by text;

comment on column public.consultation_requests.referred_by is
  'Optional answer to "Who referred you?" on the contact form''s second step, as typed. Null when not asked or not answered.';
