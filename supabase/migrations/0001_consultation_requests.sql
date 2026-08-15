-- Consultation requests and guide signups from the site.
-- Inserted server-side via the service-role key (app/api/consultation/route.ts);
-- RLS is enabled with no public policies, so anon/authenticated clients have no access.
--
-- One table, two row shapes, told apart by `type`:
--   consultation — the contact form; someone is expecting a phone call.
--   guide        — the "Not ready to call?" email capture; only an address.
-- Hence the nullable columns: a guide signup has no name or phone. The check
-- constraint below keeps each shape honest rather than trusting the caller.

create table if not exists public.consultation_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  type text not null default 'consultation',
  helping_who text,
  concerns text[] not null default '{}',
  first_name text,
  phone text,
  email text,
  preferred_center text,
  best_time text,
  note text,
  source_page text,

  constraint consultation_requests_type_check
    check (type in ('consultation', 'guide')),

  -- A consultation needs someone to call; a guide signup needs somewhere to send it.
  constraint consultation_requests_shape_check check (
    (
      type = 'consultation'
      and helping_who is not null
      and first_name is not null
      and phone is not null
    )
    or (type = 'guide' and email is not null)
  )
);

alter table public.consultation_requests enable row level security;

comment on table public.consultation_requests is
  'Requests from the website: contact-form consultations and guide email signups, separated by "type". No payment data, ever.';
