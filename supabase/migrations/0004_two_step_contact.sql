-- The contact form became two steps (components/ContactForm.tsx, Oct 2026):
-- step one captures the callback — first name, phone, preferred center, best
-- time, optional email — and saves the row before anything else is asked.
-- Step two (who we're helping, concerns, note) is optional and PATCHes that
-- same row through app/api/consultation/[id]/route.ts.
--
-- The 0001 shape check required `helping_who` on every consultation row, and
-- `helping_who` is now collected in step two. A step-one insert failed the
-- check, so the lead — the whole point of the split — was the thing lost.
--
-- New shape for a consultation: someone to call (first_name, phone) and
-- somewhere to route the lead (preferred_center — the inbox and the Dialpad
-- line are both chosen by it, lib/center-routing.ts). Nothing else is
-- required. The guide shape is unchanged.
--
-- `preferred_center` was nullable in practice for the chat path: the
-- assistant records null when a visitor declines the center question, and one
-- row (Aug 2026, source "chat") carried it. The form has always sent
-- "Not sure yet" for the same meaning, and the route now substitutes that
-- string for a null center on every consultation insert, so the two channels
-- write the same value for "unsure". The one existing null is backfilled to
-- that value so the constraint can be validated against the whole table
-- rather than added NOT VALID.

alter table public.consultation_requests
  drop constraint if exists consultation_requests_shape_check;

update public.consultation_requests
  set preferred_center = 'Not sure yet'
  where type = 'consultation' and preferred_center is null;

alter table public.consultation_requests
  add constraint consultation_requests_shape_check check (
    (
      type = 'consultation'
      and first_name is not null
      and phone is not null
      and preferred_center is not null
    )
    or (type = 'guide' and email is not null)
  );

comment on constraint consultation_requests_shape_check
  on public.consultation_requests is
  'A consultation needs someone to call and a center to route to; helping_who, concerns and note arrive in the optional second step. A guide signup needs an address.';
