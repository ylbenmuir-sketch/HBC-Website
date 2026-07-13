-- Consultation requests from the /contact form.
-- Inserted server-side via the service-role key (app/api/consultation/route.ts);
-- RLS is enabled with no public policies, so anon/authenticated clients have no access.

create table if not exists public.consultation_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  helping_who text not null,
  concerns text[] not null default '{}',
  first_name text not null,
  phone text not null,
  preferred_center text,
  best_time text,
  note text,
  source_page text
);

alter table public.consultation_requests enable row level security;

comment on table public.consultation_requests is
  'Requests from the website contact form ("Talk With Our Team"). No payment data, ever.';
