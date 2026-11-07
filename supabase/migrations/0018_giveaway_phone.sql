-- 0018 — "Best phone if you win" (Ben, 2026-11-06).
--
-- An optional phone on the /10years drawing entry form (live mode only; the
-- notify-me form has none), saved on the entrant and shown in the staff
-- winner alert. Stored formatted, "(615) 555-0134"; null when left blank.
-- For staff to call a winner — never used for texts or marketing.
--
-- Additive and idempotent. Until applied, entries save without the phone
-- (lib/giveaway/people.ts retries without it and logs that 0018 is
-- missing), and the alert says "No phone given, email first."

alter table public.giveaway_people
  add column if not exists phone text;

comment on column public.giveaway_people.phone is 'Optional "Best phone if you win" from the /10years entry form, formatted (615) 555-0134. For staff to call a winner only.';
