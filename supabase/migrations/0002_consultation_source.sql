-- Which channel a request came in through (phase-8-chatbot.md §5).
--
-- The site assistant reuses app/api/consultation/route.ts rather than getting
-- an endpoint, a table, or a notification path of its own — so the only thing
-- needed to tell a chat lead from a form lead is one column.
--
-- Defaults to 'form' so every existing row keeps its meaning and
-- components/ContactForm.tsx needs no change: a request that names no source
-- came from the form. 'chat' is set by the assistant.
--
-- Deliberately separate from `source_page`, which records *where* on the site
-- the request came from and stays useful for both channels.

alter table public.consultation_requests
  add column if not exists source text not null default 'form';

alter table public.consultation_requests
  drop constraint if exists consultation_requests_source_check;

alter table public.consultation_requests
  add constraint consultation_requests_source_check
    check (source in ('form', 'chat'));

comment on column public.consultation_requests.source is
  'Channel the request arrived through: "form" (ContactForm/GuideCta) or "chat" (site assistant).';
