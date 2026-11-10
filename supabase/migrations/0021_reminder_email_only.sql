-- 0021 — the reminder is an email address; the entry needs a phone (Ben, 2026-11-10).
--
-- 1. giveaway_notify: before entries open, /10years now asks for an email
--    address and, optionally, a first name — nothing else. It is a reminder,
--    not an entry, so first_name, last_name and zip may be empty. Rows saved
--    by the earlier, longer form keep their values and stay valid. Until
--    this is applied, a reminder saves with "" / "" / "00000" in those three
--    columns (lib/giveaway/people.ts logs that 0021 is missing).
--
-- 2. giveaway_people.phone (added by 0018) is now required by the entry
--    form and stored as E.164, "+16155550134". The column stays nullable:
--    the form and the server enforce it, and rows from before keep what
--    they have. For staff to call a winner — never texted, never marketing.
--
-- Additive and idempotent: safe to run twice.

alter table public.giveaway_notify alter column first_name drop not null;
alter table public.giveaway_notify alter column last_name drop not null;
alter table public.giveaway_notify alter column zip drop not null;

alter table public.giveaway_people
  add column if not exists phone text;

comment on table public.giveaway_notify is 'Reminder signups before entries open (Nov 9–15): an email address and, if given, a first name. Not entries. Rows from the earlier form also hold last name and ZIP. Service role only; env-scoped.';
comment on column public.giveaway_people.phone is 'The /10years entry form''s phone, required since 2026-11-10, stored as E.164 (+16155550134); rows from before may be null or formatted (615) 555-0134. For staff to call a winner only — never texted.';
