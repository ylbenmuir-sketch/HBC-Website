// Unit tests for the env scoping (lib/giveaway/env.ts, lib/giveaway/store.ts):
// which env a process is, and that every read and write through the store
// carries it — selects/updates/deletes get .eq("env"), inserts/upserts get
// the column stamped, other envs and other tables are refused. The client
// is a recording fake; nothing touches a database. Run: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

registerHooks({
  resolve(spec, ctx, next) {
    const local = !ctx.parentURL?.includes("/node_modules/");
    if (local && spec.startsWith(".") && !/\.(ts|tsx|js|mjs|cjs|json)$/.test(spec)) {
      return next(`${spec}.ts`, ctx);
    }
    return next(spec, ctx);
  },
});

const { giveawayEnv, isTestingEnv, GIVEAWAY_ENVS } = await import("./env.ts");
const { GiveawayStore, GIVEAWAY_TABLES, isGiveawayTable } = await import("./store.ts");

/* ── env ────────────────────────────────────────────────────────────── */

test("giveawayEnv: explicit wins, then VERCEL_ENV, then local", () => {
  assert.equal(giveawayEnv({}), "local");
  assert.equal(giveawayEnv({ VERCEL_ENV: "production" }), "production");
  assert.equal(giveawayEnv({ VERCEL_ENV: "preview" }), "preview");
  assert.equal(giveawayEnv({ VERCEL_ENV: "development" }), "local");
  assert.equal(giveawayEnv({ GIVEAWAY_ENV: "test", VERCEL_ENV: "production" }), "test");
  assert.equal(giveawayEnv({ GIVEAWAY_ENV: " preview " }), "preview");
  assert.throws(() => giveawayEnv({ GIVEAWAY_ENV: "prod" }), /not one of/);
  assert.deepEqual([...GIVEAWAY_ENVS], ["production", "preview", "local", "test"]);
  assert.equal(isTestingEnv("test"), true);
  assert.equal(isTestingEnv("local"), true);
  assert.equal(isTestingEnv("preview"), false);
  assert.equal(isTestingEnv("production"), false);
});

/* ── a recording fake of the Supabase client ────────────────────────── */

function fakeClient() {
  const calls = [];
  const builder = (table) => {
    const chain = [];
    const b = new Proxy(
      {},
      {
        get(_, method) {
          if (method === "then") return undefined;
          if (method === "chain") return chain;
          return (...args) => {
            chain.push([method, ...args]);
            return b;
          };
        },
      }
    );
    calls.push({ table, chain });
    return b;
  };
  return {
    calls,
    from: (table) => builder(table),
    rpc: (fn, args) => {
      calls.push({ rpc: fn, args });
      return Promise.resolve({ data: 1, error: null });
    },
  };
}

test("every read is filtered to the store's env before the caller adds anything", () => {
  const client = fakeClient();
  const store = new GiveawayStore(client, "test");
  store.select("giveaway_people", "id, email").eq("email", "a@b.c").limit(1);
  assert.deepEqual(client.calls[0].table, "giveaway_people");
  assert.deepEqual(client.calls[0].chain, [["select", "id, email", undefined], ["eq", "env", "test"], ["eq", "email", "a@b.c"], ["limit", 1]]);

  store.update("giveaway_notify", { tapped_at: "now" }).eq("id", "x");
  assert.deepEqual(client.calls[1].chain, [["update", { tapped_at: "now" }], ["eq", "env", "test"], ["eq", "id", "x"]]);

  store.delete("rate_limits").lt("window_start", "y");
  assert.deepEqual(client.calls[2].chain, [["delete"], ["eq", "env", "test"], ["lt", "window_start", "y"]]);
});

test("every write is stamped with the store's env; another env is refused", () => {
  const client = fakeClient();
  const store = new GiveawayStore(client, "preview");
  store.insert("giveaway_entries", { person_id: "p", kind: "base" });
  assert.deepEqual(client.calls[0].chain, [["insert", [{ person_id: "p", kind: "base", env: "preview" }]]]);
  store.insert("giveaway_entries", [{ kind: "a" }, { kind: "b", env: "preview" }]);
  assert.deepEqual(client.calls[1].chain[0][1].map((r) => r.env), ["preview", "preview"]);
  store.upsert("giveaway_admin_allowlist", { email: "x@y.z" }, { onConflict: "env,email" });
  assert.deepEqual(client.calls[2].chain, [["upsert", [{ email: "x@y.z", env: "preview" }], { onConflict: "env,email" }]]);

  assert.throws(() => store.insert("giveaway_entries", { kind: "base", env: "production" }), /refusing to write a row for env "production"/);
  assert.throws(() => store.update("giveaway_people", { env: "production" }), /cannot change env/);
});

test("only giveaway tables; rpc carries p_env", async () => {
  const client = fakeClient();
  const store = new GiveawayStore(client, "local");
  assert.throws(() => store.select("consultation_requests"), /not a giveaway table/);
  assert.throws(() => store.insert("chat_sessions", {}), /not a giveaway table/);
  assert.equal(isGiveawayTable("giveaway_people"), true);
  assert.equal(isGiveawayTable("consultation_requests"), false);
  assert.ok(GIVEAWAY_TABLES.includes("rate_limits") && GIVEAWAY_TABLES.includes("scheduled_sends"));
  await store.rpc("giveaway_rate_limit_hit", { p_bucket: "entry_ip" });
  assert.deepEqual(client.calls[0], { rpc: "giveaway_rate_limit_hit", args: { p_bucket: "entry_ip", p_env: "local" } });
});
