// Unit tests for lib/giveaway/memory-client.ts — the in-memory PostgREST
// stand-in has to behave like the real thing for the operations the engine
// uses: filters, writes with defaults, the unique keys, select-after-write,
// single/maybeSingle, the rate-limit RPC, and the seed. Run: npm test

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

const { memoryClient } = await import("./memory-client.ts");
const { GiveawayStore } = await import("./store.ts");

const fresh = () => new GiveawayStore(memoryClient(), "test");
const person = (email, extra = {}) => ({ email, email_display: email, first_name: "Sarah", last_name: "Mitchell", zip: "37064", referral_code: `HBC-${email.length}${email[0].toUpperCase()}XYZ`, ...extra });

test("seeded like the migration: 12 prizes and 6 drawings per env", async () => {
  const store = fresh();
  const { count } = await store.select("giveaway_prizes", "id", { count: "exact", head: true });
  assert.equal(count, 12);
  const { data } = await store.select("giveaway_drawings", "slot, kind, scheduled_at, status").order("scheduled_at");
  assert.equal(data.length, 6);
  assert.equal(data[5].kind, "grand");
  assert.equal(data[0].status, "scheduled");
  // Other envs are invisible through this store.
  const other = new GiveawayStore(memoryClient(store.client.db), "production");
  assert.equal((await other.select("giveaway_drawings", "id", { count: "exact", head: true })).count, 6);
});

test("insert applies defaults and returns rows on .select(); unique keys refuse duplicates", async () => {
  const store = fresh();
  const { data, error } = await store.insert("giveaway_people", person("a@example.test")).select("id, email, is_existing_client, referral_credits, created_at");
  assert.equal(error, null);
  assert.match(data[0].id, /^[0-9a-f-]{36}$/);
  assert.equal(data[0].is_existing_client, false);
  assert.equal(data[0].referral_credits, 0);
  assert.ok(data[0].created_at);
  const dup = await store.insert("giveaway_people", person("a@example.test", { referral_code: "HBC-OTHER1" }));
  assert.equal(dup.error.code, "23505");
  assert.match(dup.error.message, /giveaway_people_env_email_key/);
  // Same email in another env is a different row.
  const other = new GiveawayStore(memoryClient(store.client.db), "local");
  assert.equal((await other.insert("giveaway_people", person("a@example.test"))).error, null);
});

test("partial unique: one base entry per person, many referral bonuses", async () => {
  const store = fresh();
  const { data: [p] } = await store.insert("giveaway_people", person("a@example.test")).select("id");
  assert.equal((await store.insert("giveaway_entries", { person_id: p.id, kind: "base" })).error, null);
  assert.match((await store.insert("giveaway_entries", { person_id: p.id, kind: "base" })).error.message, /one_base_idx/);
  assert.equal((await store.insert("giveaway_entries", [{ person_id: p.id, kind: "referral_bonus", referral_person_id: p.id }, { person_id: p.id, kind: "referral_bonus", referral_person_id: p.id }])).error, null);
  const { count } = await store.select("giveaway_entries", "id", { count: "exact", head: true }).eq("person_id", p.id);
  assert.equal(count, 3);
});

test("filters: eq/is/in/lt/gte/neq/not, order, limit, single, maybeSingle", async () => {
  const store = fresh();
  await store.insert("giveaway_people", [person("a@example.test", { verified_at: "2026-11-16T01:00:00Z" }), person("b@example.test"), person("c@example.test", { verified_at: "2026-11-16T03:00:00Z", is_existing_client: true })]);
  assert.equal((await store.select("giveaway_people", "email").is("verified_at", null)).data.length, 1);
  assert.equal((await store.select("giveaway_people", "email").not("verified_at", "is", null)).data.length, 2);
  assert.equal((await store.select("giveaway_people", "email").in("email", ["a@example.test", "c@example.test"])).data.length, 2);
  assert.equal((await store.select("giveaway_people", "email").lt("verified_at", new Date("2026-11-16T02:00:00Z"))).data[0].email, "a@example.test");
  assert.equal((await store.select("giveaway_people", "email").gte("verified_at", "2026-11-16T03:00:00.000Z")).data[0].email, "c@example.test");
  assert.equal((await store.select("giveaway_people", "email").neq("email", "a@example.test")).data.length, 2);
  const ordered = await store.select("giveaway_people", "email").order("email", { ascending: false }).limit(2);
  assert.deepEqual(ordered.data.map((r) => r.email), ["c@example.test", "b@example.test"]);
  assert.equal((await store.select("giveaway_people", "email").eq("email", "b@example.test").single()).data.email, "b@example.test");
  assert.equal((await store.select("giveaway_people", "email").eq("email", "zzz").maybeSingle()).data, null);
  assert.equal((await store.select("giveaway_people", "email").eq("email", "zzz").single()).error.code, "PGRST116");
  assert.equal((await store.select("giveaway_people", "email").eq("is_existing_client", true).single()).data.email, "c@example.test");
});

test("conditional update returns only the rows it changed (the claim pattern)", async () => {
  const store = fresh();
  const { data: [d] } = await store.select("giveaway_drawings", "id").eq("slot", "mon");
  const first = await store.update("giveaway_drawings", { status: "drawing", claimed_at: "2026-11-16T18:00:00Z" }).eq("id", d.id).eq("status", "scheduled").select("id, status");
  assert.equal(first.data.length, 1);
  const second = await store.update("giveaway_drawings", { status: "drawing" }).eq("id", d.id).eq("status", "scheduled").select("id");
  assert.equal(second.data.length, 0);
  assert.equal((await store.select("giveaway_drawings", "status").eq("id", d.id).single()).data.status, "drawing");
});

test("upsert: onConflict updates, ignoreDuplicates keeps; delete with select", async () => {
  const store = fresh();
  await store.upsert("giveaway_admin_allowlist", [{ email: "a@example.test" }], { onConflict: "env,email", ignoreDuplicates: true });
  await store.upsert("giveaway_admin_allowlist", [{ email: "a@example.test" }, { email: "b@example.test" }], { onConflict: "env,email", ignoreDuplicates: true });
  assert.equal((await store.select("giveaway_admin_allowlist", "email")).data.length, 2);
  await store.upsert("giveaway_admin_allowlist", [{ email: "a@example.test", added_by: "ben" }], { onConflict: "env,email" });
  assert.equal((await store.select("giveaway_admin_allowlist", "added_by").eq("email", "a@example.test").single()).data.added_by, "ben");
  const gone = await store.delete("giveaway_admin_allowlist").eq("email", "b@example.test").select("email");
  assert.deepEqual(gone.data, [{ email: "b@example.test" }]);
  assert.equal((await store.select("giveaway_admin_allowlist", "email")).data.length, 1);
});

test("rpc giveaway_rate_limit_hit counts per env/bucket/key/window; unknown functions error like PostgREST", async () => {
  const store = fresh();
  const hit = () => store.rpc("giveaway_rate_limit_hit", { p_bucket: "entry_ip", p_key_hash: "h", p_window_start: "2026-11-16T15:00:00.000Z" });
  assert.equal((await hit()).data, 1);
  assert.equal((await hit()).data, 2);
  assert.equal((await store.rpc("giveaway_rate_limit_hit", { p_bucket: "entry_ip", p_key_hash: "h", p_window_start: "2026-11-16T16:00:00.000Z" })).data, 1);
  assert.equal((await store.rpc("nope")).error.code, "PGRST202");
});

test("resetEnv clears one env's rows and re-arms its drawings, keeps the seed", async () => {
  const store = fresh();
  await store.insert("giveaway_people", person("a@example.test"));
  const { data: [d] } = await store.select("giveaway_drawings", "id").eq("slot", "mon");
  await store.update("giveaway_drawings", { status: "drawn" }).eq("id", d.id);
  store.client.db.resetEnv("test");
  assert.equal((await store.select("giveaway_people", "id")).data.length, 0);
  assert.equal((await store.select("giveaway_drawings", "status").eq("id", d.id).single()).data.status, "scheduled");
  assert.equal((await store.select("giveaway_prizes", "id", { count: "exact", head: true })).count, 12);
});
