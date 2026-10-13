-- Site-assistant conversation state (lib/chat/session.ts).
--
-- The assistant's booking flow asks one question per turn, and the answers so
-- far have to live somewhere between turns. In-process memory is not that
-- place on Vercel: requests in one conversation can land on different
-- instances, and an instance can be recycled mid-flow, which loses the lead.
-- This table is the shared store. Read and written server-side with the
-- service-role key only; RLS is on with no policies, so nothing else can
-- touch it.
--
-- `session` is the whole ChatSession as JSON — the safety ledger (crisis and
-- under-18 flags) and the booking draft. A draft may hold a name, a phone
-- number and a parent's note for the minutes it takes to finish the flow.
-- Rows are swept an hour after they were last touched (see session.ts); a
-- completed booking is already on consultation_requests by then.

create table if not exists public.chat_sessions (
  id text primary key,
  session jsonb not null,
  last_seen_at timestamptz not null default now()
);

create index if not exists chat_sessions_last_seen_at_idx
  on public.chat_sessions (last_seen_at);

alter table public.chat_sessions enable row level security;
