-- 0013 — giveaway prize values follow config (Ben, 2026-11-03).
--
-- Brings every existing giveaway_prizes row, in EVERY env (production,
-- preview, local, test), to the names and values lib/giveaway/config.ts
-- computes. Written for the case where 0010 was applied from an older copy;
-- on a fresh database 0010's seed already carries the same values and this
-- changes nothing.
--
-- What changed since 0010 was first committed:
--   * Handheld vagus nerve stimulator by Hoolest: $429 -> $399 (Hoolest's
--     published price). Grand prize $2,559 -> $2,529 (new client),
--     $2,574 -> $2,544 (current client).
--   * Tax-form threshold $600 -> $2,000 (2026): only the grand prize alone
--     reaches it now. A winner's own flag is aggregated per person in code.
--   * "one service from every partner" left the grand prize's name and
--     description; partner prizes are TBD and live in config only.
--
-- Idempotent: a second run updates nothing. A no-op (with a notice) if
-- giveaway_prizes does not exist yet. Apply AFTER 0010.

-- BEGIN prize sync generated from lib/giveaway/config.ts (do not edit by hand; npm test checks it)
do $$
begin
  if to_regclass('public.giveaway_prizes') is null then
    raise notice 'giveaway_prizes does not exist yet; apply 0010 first (its seed already carries these values)';
    return;
  end if;
  update public.giveaway_prizes as g
     set name = v.name, description = v.description, retail_value_usd = v.retail_value_usd,
         practitioner_cost_usd = v.practitioner_cost_usd, tax_form_required = v.tax_form_required
    from (values
      ('mon', 'new_client', 'Brain Map + 2 sessions', 'a Brain Map and 2 LENS sessions (every session includes the vibro chair)', 480, 105, false),
      ('mon', 'current_client', '2 sessions', '2 LENS sessions (every session includes the vibro chair)', 330, 70, false),
      ('tue', 'new_client', 'Brain Map + 3 sessions', 'a Brain Map and 3 LENS sessions (every session includes the vibro chair)', 645, 140, false),
      ('tue', 'current_client', '3 sessions', '3 LENS sessions (every session includes the vibro chair)', 495, 105, false),
      ('wed', 'new_client', 'Brain Map + 4 sessions + Pocket vagus nerve stimulator by Hoolest', 'a Brain Map, 4 LENS sessions and a pocket vagus nerve stimulator by Hoolest (every session includes the vibro chair)', 810, 175, false),
      ('wed', 'current_client', '4 sessions + Pocket vagus nerve stimulator by Hoolest', '4 LENS sessions and a pocket vagus nerve stimulator by Hoolest (every session includes the vibro chair)', 660, 140, false),
      ('thu', 'new_client', 'Brain Map + 5 sessions + Pocket vagus nerve stimulator by Hoolest', 'a Brain Map, 5 LENS sessions and a pocket vagus nerve stimulator by Hoolest (every session includes the vibro chair)', 975, 210, false),
      ('thu', 'current_client', '5 sessions + Pocket vagus nerve stimulator by Hoolest', '5 LENS sessions and a pocket vagus nerve stimulator by Hoolest (every session includes the vibro chair)', 825, 175, false),
      ('fri', 'new_client', 'Brain Map + 7 sessions + Pocket vagus nerve stimulator by Hoolest', 'a Brain Map, 7 LENS sessions and a pocket vagus nerve stimulator by Hoolest (every session includes the vibro chair)', 1305, 280, false),
      ('fri', 'current_client', '7 sessions + Pocket vagus nerve stimulator by Hoolest', '7 LENS sessions and a pocket vagus nerve stimulator by Hoolest (every session includes the vibro chair)', 1155, 245, false),
      ('grand', 'new_client', 'Brain Map + 12 sessions + Handheld vagus nerve stimulator by Hoolest (yours to keep)', 'a Brain Map, 12 LENS sessions and a handheld vagus nerve stimulator by Hoolest, yours to keep (every session includes the vibro chair)', 2529, 455, true),
      ('grand', 'current_client', '13 sessions + Handheld vagus nerve stimulator by Hoolest (yours to keep)', '13 LENS sessions and a handheld vagus nerve stimulator by Hoolest, yours to keep (every session includes the vibro chair)', 2544, 455, true)
    ) as v(slot, version, name, description, retail_value_usd, practitioner_cost_usd, tax_form_required)
   where g.slot = v.slot and g.version = v.version
     and (g.name, g.description, g.retail_value_usd, g.practitioner_cost_usd, g.tax_form_required)
         is distinct from (v.name, v.description, v.retail_value_usd, v.practitioner_cost_usd, v.tax_form_required);
end
$$;
-- END prize sync generated from lib/giveaway/config.ts
