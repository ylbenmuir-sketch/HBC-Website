-- 0022 — the ad headline code on the lead row (Ben, 2026-11-11).
--
-- /start shows one of a few headlines, picked by the `h` parameter on the
-- ad's link (g1, k1, k2, a1, a2, a3). The code — a letter and a digit or
-- two, never a word — is kept with the visit's first touch
-- (lib/attribution.ts) and saved here, so leads can be counted per headline.
-- A fact about the link, not the person. Additive and nullable; until
-- applied, the route saves the lead without it and logs that 0022 is
-- missing. Independent of 0019/0020.

alter table public.consultation_requests
  add column if not exists hook text;
