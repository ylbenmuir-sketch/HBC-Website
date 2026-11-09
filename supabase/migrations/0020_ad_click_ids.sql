-- 0020 — utm_term and the ad click ids on the lead row (Ben, 2026-11-09).
--
-- The Meta/Google ads pass: the visit's first touch (lib/attribution.ts,
-- sessionStorage) now also keeps utm_term and the click id an ad adds to
-- the URL — fbclid (Meta) or gclid (Google). Facts about the link, not the
-- person. Additive and nullable; until applied, the route saves the lead
-- without these three and logs that 0020 is missing. Needs 0019 first
-- (the other four utm columns and lead_source).
--
-- Which form saved the lead is already `source` ('form' | 'chat' |
-- 'giveaway', since 0002/0010); the center is `preferred_center`.

alter table public.consultation_requests
  add column if not exists utm_term text,
  add column if not exists fbclid text,
  add column if not exists gclid text;
