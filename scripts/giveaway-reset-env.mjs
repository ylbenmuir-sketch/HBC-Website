/**
 * Clear one TESTING env's giveaway rows in the real database, so
 * `check:giveaway -- --db` and preview test runs (GIVEAWAY_ENV=test) start
 * from a clean slate — the database twin of memory-client's resetEnv.
 *
 *   node scripts/giveaway-reset-env.mjs test            # dry run: counts only
 *   node scripts/giveaway-reset-env.mjs test --yes      # delete
 *
 * The same cleanup runs on its own at the start and end of every
 * `check:giveaway -- --db` (scripts/giveaway-test-cleanup.mjs).
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
const { countGiveawayRows, resetGiveawayEnv, supabaseCredentials } = await import("./giveaway-test-cleanup.mjs");
const { url, key } = supabaseCredentials(ROOT, readFileSync, existsSync, join);
if (!url || !key) {
  console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set");
  process.exit(2);
}
const { createClient } = await import("@supabase/supabase-js");
const { GiveawayStore } = await import(`${ROOT}/lib/giveaway/store.ts`);
const store = new GiveawayStore(createClient(url, key, { auth: { persistSession: false } }), env);

const show = async () => {
  for (const [t, n] of Object.entries(await countGiveawayRows(store))) console.log(`  ${t}: ${n}`);
};
console.log(`env "${env}" — ${yes ? "DELETING" : "dry run (add --yes to delete)"}`);
await show();
if (!yes) process.exit(0);
await resetGiveawayEnv(store);
console.log("after:");
await show();
