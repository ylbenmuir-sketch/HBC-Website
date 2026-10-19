/**
 * The seed rows migration 0010 inserts, generated from lib/giveaway/
 * config.ts so the database and the code cannot disagree about a prize or a
 * drawing time. The block between the BEGIN/END markers in
 * supabase/migrations/0010_giveaway.sql is this function's output;
 * lib/giveaway/config.test.mjs regenerates it and fails on any difference.
 *
 *   node --experimental-strip-types -e "import('./lib/giveaway/seed-sql.ts').then(m => console.log(m.seedSql()))"
 *
 * Pure.
 */

import { GIVEAWAY_ENVS } from "./env";
import { DRAWINGS, PRIZES, prizeDescription, prizeName, prizePractitionerCostUsd, prizeRetailUsd, prizeTaxFormRequired } from "./config";

export const SEED_BEGIN = "-- BEGIN generated from lib/giveaway/config.ts (do not edit by hand; npm test checks it)";
export const SEED_END = "-- END generated from lib/giveaway/config.ts";

const lit = (s: string) => `'${s.replace(/'/g, "''")}'`;

export function seedSql(): string {
  const lines: string[] = [SEED_BEGIN];
  lines.push("insert into public.giveaway_prizes");
  lines.push("  (env, slot, version, name, description, brain_map, sessions, vibro_chair, hoolest_keychain, hoolest_handheld, partner_services, retail_value_usd, practitioner_cost_usd, tax_form_required)");
  lines.push("values");
  const prizeRows: string[] = [];
  for (const env of GIVEAWAY_ENVS) {
    for (const p of PRIZES) {
      prizeRows.push(
        `  (${lit(env)}, ${lit(p.slot)}, ${lit(p.version)}, ${lit(prizeName(p))}, ${lit(prizeDescription(p))}, ${p.brainMap}, ${p.sessions}, ${p.vibroChair}, ${p.hoolestKeychain}, ${p.hoolestHandheld}, ${p.partnerServices}, ${prizeRetailUsd(p)}, ${prizePractitionerCostUsd(p)}, ${prizeTaxFormRequired(p)})`
      );
    }
  }
  lines.push(prizeRows.join(",\n"));
  lines.push("on conflict (env, slot, version) do nothing;");
  lines.push("");
  lines.push("insert into public.giveaway_drawings (env, slot, kind, scheduled_at)");
  lines.push("values");
  const drawingRows: string[] = [];
  for (const env of GIVEAWAY_ENVS) {
    for (const d of DRAWINGS) {
      // The comma goes BEFORE the comment: a trailing "-- label," swallows it.
      drawingRows.push(`  (${lit(env)}, ${lit(d.slot)}, ${lit(d.kind)}, ${lit(d.at.toISOString())})`);
    }
  }
  lines.push(drawingRows.map((row, i) => `${row}${i < drawingRows.length - 1 ? "," : ""} -- ${DRAWINGS[i % DRAWINGS.length].ct}`).join("\n"));
  lines.push("on conflict (env, scheduled_at, kind) do nothing;");
  lines.push(SEED_END);
  return lines.join("\n");
}

/** The seed block as it stands in a migration file, or null if the markers are missing. */
export function seedBlockOf(sql: string): string | null {
  const a = sql.indexOf(SEED_BEGIN);
  const b = sql.indexOf(SEED_END);
  if (a < 0 || b < 0 || b < a) return null;
  return sql.slice(a, b + SEED_END.length);
}
