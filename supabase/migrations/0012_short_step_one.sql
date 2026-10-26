-- 0012 — the short step one (Ben, 2026-10-26).
--
-- Leads fell ~75% after launch. The new form's first step asked for a full
-- name, a phone AND an email, and a Call/Text/Email choice before anything
-- was saved; the old WordPress form took a name and a phone OR an email. Step
-- one is now: first name, phone or email (either), center, and two optional
-- lines ("Who referred you?" and "Anything we should know?").
--
-- 1. A consultation may carry an email instead of a phone. The 0004 shape
--    required `phone`; it now requires someone to reach — a phone or an
--    email — plus the name and the center, as before. Guide rows unchanged.
-- 2. "How did you hear about us?" — an optional answer on step two, PATCHed
--    onto the row step one created. One of a fixed list; the check keeps it
--    there. Additive and nullable: older rows, chat rows and skipped
--    questions read null.
--
-- Applied to the live project by Ben on 2026-10-26. Before it was, the route
-- saved an email-only lead with phone "" and a step-two save without
-- heard_about (both logged); those fallbacks stay for any database without it.

alter table public.consultation_requests
  drop constraint if exists consultation_requests_shape_check;

alter table public.consultation_requests
  add constraint consultation_requests_shape_check check (
    (
      type = 'consultation'
      and first_name is not null
      and (phone is not null or email is not null)
      and preferred_center is not null
    )
    or (type = 'guide' and email is not null)
  );

comment on constraint consultation_requests_shape_check
  on public.consultation_requests is
  'A consultation needs a name, a phone or an email, and a center to route to; everything else arrives in the optional second step. A guide signup needs an address.';

alter table public.consultation_requests
  add column if not exists heard_about text;

alter table public.consultation_requests
  drop constraint if exists consultation_requests_heard_about_check;

alter table public.consultation_requests
  add constraint consultation_requests_heard_about_check check (
    heard_about is null or heard_about in (
      'Google search',
      'Referral from a friend or family',
      'Referral from a doctor or provider',
      'Instagram',
      'Facebook',
      'TikTok',
      'Other'
    )
  );

comment on column public.consultation_requests.heard_about is
  'Optional answer to "How did you hear about us?" on the contact form''s second step. Null when not asked or not answered.';
