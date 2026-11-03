/**
 * Clear one TESTING env's giveaway rows in the real database, so
 * `check:giveaway -- --db` and preview test runs (GIVEAWAY_ENV=test) start
 * from a clean slate — the database twin of memory-client's resetEnv.
 *
 *   node scripts/giveaway-reset-env.mjs test            # dry run: counts only
 *   node scripts/giveaway-reset-env.mjs test --yes      # delete
 *
 * Refuses any env but test or local. Every delete goes through
 * GiveawayStore, which adds `env = <env>` to it, so a production or preview
 * row cannot be touched. giveaway_prizes stay (the seed); giveaway_drawings
 * are reset to "scheduled", not deleted. Reads SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY from the environment (or .env.local).
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { registerHooks } from "node:module";

registerHooks({
  resolve(spec, ctx, next) {
    const local = !ctx.parentURL?.includes("/node_modules/");
    if (local && spec.startsWith(".") && !/\.(ts|tsx|js|mjs|cjs|json)$/.test(spec)) return next(`${spec}.ts`, ctx);
    return next(spec, ctx);
  },
});

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = process.argv[2];
const yes = process.argv.includes("--yes");
if (env !== "test" && env !== "local") {
  console.error(`refused: env must be "test" or "local" (got ${JSON.stringify(env)})`);
  process.exit(2);
}
if (existsSync(join(ROOT, ".env.local"))) {
  for (const line of readFileSync(join(ROOT, ".env.local"), "utf8").split("\n")) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set");
  process.exit(2);
}
const { createClient } = await import("@supabase/supabase-js");
const { GiveawayStore } = await import(`${ROOT}/lib/giveaway/store.ts`);
const store = new GiveawayStore(createClient(url, key, { auth: { persistSession: false } }), env);

// Children before parents (0010's foreign keys).
const ORDER = ["giveaway_drawing_pool", "giveaway_winners", "scheduled_sends", "giveaway_offers", "giveaway_entries", "giveaway_notify", "giveaway_people", "giveaway_audit", "rate_limits", "giveaway_admin_allowlist"];

const count = async (t) => {
  const { count: n, error } = await store.select(t, "env", { count: "exact", head: true });
  if (error) throw new Error(`${t}: ${error.message}`);
  return n ?? 0;
};
const drawnCount = async () => {
  const { count: n } = await store.select("giveaway_drawings", "env", { count: "exact", head: true }).neq("status", "scheduled");
  return n ?? 0;
};

console.log(`env "${env}" — ${yes ? "DELETING" : "dry run (add --yes to delete)"}`);
for (const t of ORDER) console.log(`  ${t}: ${await count(t)}`);
console.log(`  giveaway_drawings not scheduled: ${await drawnCount()}`);
if (!yes) process.exit(0);

const must = (label, r) => {
  if (r.error) throw new Error(`${label}: ${r.error.message}`);
};
// The drawings point at entries and people: clear those links first.
must("drawings reset", await store.update("giveaway_drawings", { status: "scheduled", pool_snapshot_hash: null, pool_size: null, entries_count: null, seed: null, winner_entry_id: null, winner_person_id: null, drawn_at: null, drawn_by: null, claimed_at: null }).neq("status", "__none__"));
// People refer to people (referred_by).
must("people referrals", await store.update("giveaway_people", { referred_by_person_id: null }).not("referred_by_person_id", "is", null));
// store.delete() carries `env = <env>`: the only filter, and the one that matters.
for (const t of ORDER) must(t, await store.delete(t));
console.log("after:");
for (const t of ORDER) console.log(`  ${t}: ${await count(t)}`);
console.log(`  giveaway_drawings not scheduled: ${await drawnCount()}`);
