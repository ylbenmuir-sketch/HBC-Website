-- 0017 — the new prize ladder (Ben, 2026-11-03), and the giveaway code on a lead.
--
-- 1. Every env's giveaway_prizes rows set to config's new prizes (one prize
--    per drawing; both of 0010's rows per slot hold the same prize):
--      Mon  Brain Map + 1 BrainMD bottle                                   $194.95
--      Tue  Brain Map + Skye Chiropractic gift + 1 BrainMD bottle          $444.95
--      Wed  Brain Map + 3 LENS sessions + 1 BrainMD bottle                 $569.95
--      Thu  Brain Map + 3 LENS sessions + Hoolest Mini + 1 BrainMD bottle  $668.95
--      Fri  Brain Map + 3 LENS sessions + coaching session + 1 BrainMD     $819.95
--      Sat  Brain Map + 12 LENS + Hoolest VeRelief + vibro x12 + 3 lymphatic
--           therapy sessions + 3 BrainMD bottles                           $2,838.85
--    Total $5,537.60. Only the grand prize alone reaches the $2,000 tax line.
-- 2. consultation_requests.giveaway_code: the code a giveaway booking used —
--    a 10Y-… thank-you visit or a GIFT-MON…GIFT-SAT Brain Map gift
--    certificate — for staff. The route saves without it until this is applied.
--
-- 0010 and 0013 are applied and never edited; this is the newest prize sync
-- (lib/giveaway/seed-sql.ts; npm test checks it). Idempotent.

-- BEGIN prize sync generated from lib/giveaway/config.ts (do not edit by hand; npm test checks it)
do $$
begin
  if to_regclass('public.giveaway_prizes') is null then
    raise notice 'giveaway_prizes does not exist yet; apply 0010 first';
    return;
  end if;
  update public.giveaway_prizes as g
     set name = v.name, description = v.description, brain_map = v.brain_map, sessions = v.sessions, vibro_chair = v.vibro_chair,
         hoolest_keychain = v.hoolest_keychain, hoolest_handheld = v.hoolest_handheld, partner_services = v.partner_services,
         retail_value_usd = v.retail_value_usd, practitioner_cost_usd = v.practitioner_cost_usd, tax_form_required = v.tax_form_required
    from (values
      ('mon', 'Brain Map + 1 BrainMD bottle', 'Brain Map and 1 BrainMD bottle', true, 0, false, false, false, false, 194.95, 35, false),
      ('tue', 'Brain Map + Skye Chiropractic gift + 1 BrainMD bottle', 'Brain Map, Skye Chiropractic gift and 1 BrainMD bottle', true, 0, false, false, false, true, 444.95, 35, false),
      ('wed', 'Brain Map + 3 LENS sessions + 1 BrainMD bottle', 'Brain Map, 3 LENS sessions and 1 BrainMD bottle', true, 3, false, false, false, false, 569.95, 140, false),
      ('thu', 'Brain Map + 3 LENS sessions + Hoolest Mini + 1 BrainMD bottle', 'Brain Map, 3 LENS sessions, Hoolest Mini and 1 BrainMD bottle', true, 3, false, true, false, false, 668.95, 140, false),
      ('fri', 'Brain Map + 3 LENS sessions + 90-minute one-to-one Women''s Health & Life Coaching session with Amabel Luers of Be Well with Amabel + 1 BrainMD bottle', 'Brain Map, 3 LENS sessions, 90-minute one-to-one Women''s Health & Life Coaching session with Amabel Luers of Be Well with Amabel and 1 BrainMD bottle', true, 3, false, false, false, true, 819.95, 140, false),
      ('grand', 'Brain Map + 12 LENS sessions + Hoolest VeRelief + a vibro chair session with each of the 12 sessions + 3 Assisted Lymphatic Therapy sessions with Victoria Bailey of Envision Thermography & Wellness + 3 BrainMD bottles', 'Brain Map, 12 LENS sessions, Hoolest VeRelief, a vibro chair session with each of the 12 sessions, 3 Assisted Lymphatic Therapy sessions with Victoria Bailey of Envision Thermography & Wellness and 3 BrainMD bottles', true, 12, true, false, true, true, 2838.85, 455, true)
    ) as v(slot, name, description, brain_map, sessions, vibro_chair, hoolest_keychain, hoolest_handheld, partner_services, retail_value_usd, practitioner_cost_usd, tax_form_required)
   where g.slot = v.slot
     and (g.name, g.description, g.brain_map, g.sessions, g.vibro_chair, g.hoolest_keychain, g.hoolest_handheld, g.partner_services, g.retail_value_usd, g.practitioner_cost_usd, g.tax_form_required)
         is distinct from (v.name, v.description, v.brain_map, v.sessions, v.vibro_chair, v.hoolest_keychain, v.hoolest_handheld, v.partner_services, v.retail_value_usd, v.practitioner_cost_usd, v.tax_form_required);
end
$$;
-- END prize sync generated from lib/giveaway/config.ts

alter table public.consultation_requests
  add column if not exists giveaway_code text;

comment on column public.consultation_requests.giveaway_code is 'A 10-year giveaway booking''s code: 10Y-… (thank-you free first visit) or GIFT-MON…GIFT-SAT (a prize''s Brain Map gift certificate, for someone new).';
