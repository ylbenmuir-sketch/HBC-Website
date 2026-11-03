// Migration 0010 actually executes: every migration in order runs in an
// embedded Postgres (PGlite, a dev dependency — no server, no Docker), twice
// (idempotent), then the seed counts, the unique keys, the rate-limit
// function and the widened source check are exercised. The Supabase
// connector could not apply 0010 from a session (no permission), so this is
// the proof that the file Ben pastes into the SQL editor is sound.
// Run: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";

const DIR = new URL("../../supabase/migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();

/** PGlite has no auth schema or the roles Supabase defines; the revoke in
 *  0010 names anon/authenticated, which exist on Supabase. Create them. */
async function fresh() {
  const db = new PGlite();
  await db.exec("create role anon; create role authenticated;");
  return db;
}

test("every migration runs in order on a fresh database, and 0010 runs twice", async () => {
  const db = await fresh();
  for (const f of files) await db.exec(readFileSync(new URL(f, DIR), "utf8"));
  // Idempotent: a second run of 0010 changes nothing and errors nowhere.
  await db.exec(readFileSync(new URL("0010_giveaway.sql", DIR), "utf8"));
  const tables = (await db.query("select table_name from information_schema.tables where table_schema = 'public' order by 1")).rows.map((r) => r.table_name);
  for (const t of ["giveaway_people", "giveaway_notify", "giveaway_entries", "giveaway_prizes", "giveaway_drawings", "giveaway_drawing_pool", "giveaway_winners", "giveaway_audit", "giveaway_offers", "giveaway_admin_allowlist", "rate_limits", "scheduled_sends"]) {
    assert.ok(tables.includes(t), t);
  }
  // RLS on everywhere, no policies.
  const rls = (await db.query("select relname, relrowsecurity from pg_class where relkind = 'r' and (relname like 'giveaway_%' or relname in ('rate_limits', 'scheduled_sends'))")).rows;
  assert.equal(rls.length, 12);
  for (const r of rls) assert.equal(r.relrowsecurity, true, `${r.relname} RLS`);
  assert.equal((await db.query("select count(*)::int as n from pg_policies where schemaname = 'public'")).rows[0].n, 0);
  // Seed: 12 prizes and 6 drawings per env, four envs — once, not twice.
  assert.equal((await db.query("select count(*)::int as n from giveaway_prizes")).rows[0].n, 48);
  assert.equal((await db.query("select count(*)::int as n from giveaway_drawings")).rows[0].n, 24);
  assert.equal((await db.query("select count(*)::int as n from giveaway_drawings where env = 'test' and kind = 'grand'")).rows[0].n, 1);
  const grand = (await db.query("select scheduled_at from giveaway_drawings where env = 'test' and slot = 'grand'")).rows[0].scheduled_at;
  assert.equal(new Date(grand).toISOString(), "2026-11-21T23:00:00.000Z");
  const tue = (await db.query("select retail_value_usd::float as v, tax_form_required as t from giveaway_prizes where env = 'test' and slot = 'tue' and version = 'new_client'")).rows[0];
  assert.deepEqual(tue, { v: 645, t: false }); // under $2,000 (2026)
  const grandPrize = (await db.query("select retail_value_usd::float as v, tax_form_required as t from giveaway_prizes where env = 'production' and slot = 'grand' and version = 'new_client'")).rows[0];
  assert.deepEqual(grandPrize, { v: 2529, t: true });
});

test("0013 brings an OLD 0010's prize rows (Hoolest $429, $600 threshold) to config in every env, and runs twice", async () => {
  const db = await fresh();
  for (const f of files.filter((f) => f < "0013")) await db.exec(readFileSync(new URL(f, DIR), "utf8"));
  // Simulate 0010 applied from its old copy.
  await db.exec("update giveaway_prizes set retail_value_usd = retail_value_usd + 30, name = name || ' + one service from every partner' where slot = 'grand'; update giveaway_prizes set tax_form_required = true where retail_value_usd > 600");
  const sync = readFileSync(new URL("0013_giveaway_prize_values.sql", DIR), "utf8");
  await db.exec(sync);
  await db.exec(sync);
  const rows = (await db.query("select env, version, retail_value_usd::float as v, tax_form_required as t, name from giveaway_prizes where slot = 'grand' order by env, version")).rows;
  assert.equal(rows.length, 8);
  for (const r of rows) {
    assert.equal(r.v, r.version === "new_client" ? 2529 : 2544, `${r.env}/${r.version}`);
    assert.equal(r.t, true);
    assert.doesNotMatch(r.name, /partner/);
  }
  assert.equal((await db.query("select count(*)::int as n from giveaway_prizes where tax_form_required and slot <> 'grand'")).rows[0].n, 0);
});

test("0013 is a no-op without 0010; 0014 adds the call-me columns and runs twice", async () => {
  const db = await fresh();
  for (const f of files.filter((f) => f < "0010")) await db.exec(readFileSync(new URL(f, DIR), "utf8"));
  await db.exec(readFileSync(new URL("0013_giveaway_prize_values.sql", DIR), "utf8"));
  const c14 = readFileSync(new URL("0014_call_consent.sql", DIR), "utf8");
  await db.exec(c14);
  await db.exec(c14);
  await db.query("insert into consultation_requests (type, first_name, phone, preferred_center, call_consent, call_consent_text, call_consent_at) values ('consultation', 'T', '0', 'Nashville', true, 'Yes, call me to schedule my visit.', now())");
  await assert.rejects(db.query("insert into consultation_requests (type, first_name, phone, preferred_center, call_consent) values ('consultation', 'T', '0', 'Nashville', true)"), /consultation_requests_call_consent_check/);
});

test("rate-limit function increments per (env, bucket, key, window); the source check accepts 'giveaway'", async () => {
  const db = await fresh();
  for (const f of files) await db.exec(readFileSync(new URL(f, DIR), "utf8"));
  const hit = async (env, key) => (await db.query("select public.giveaway_rate_limit_hit($1, 'entry_ip', $2, '2026-11-16T15:00:00Z') as n", [env, key])).rows[0].n;
  assert.equal(await hit("test", "k1"), 1);
  assert.equal(await hit("test", "k1"), 2);
  assert.equal(await hit("test", "k2"), 1);
  assert.equal(await hit("local", "k1"), 1);
  await db.query("insert into consultation_requests (type, first_name, phone, preferred_center, source) values ('consultation', 'T', '0', 'Nashville', 'giveaway')");
  await assert.rejects(db.query("insert into consultation_requests (type, first_name, phone, preferred_center, source) values ('consultation', 'T', '0', 'Nashville', 'carrier-pigeon')"), /consultation_requests_source_check/);
});

test("unique keys: one base entry per person, one email per env, one drawing per slot", async () => {
  const db = await fresh();
  for (const f of files) await db.exec(readFileSync(new URL(f, DIR), "utf8"));
  const person = async (env, email) =>
    (await db.query("insert into giveaway_people (env, email, email_display, first_name, last_name, zip, referral_code) values ($1, $2, $2, 'A', 'B', '37064', $3) returning id", [env, email, `HBC-${env}${email.length}`])).rows[0].id;
  const a = await person("test", "a@example.test");
  await person("local", "a@example.test"); // same email, other env: fine
  await assert.rejects(person("test", "a@example.test"), /giveaway_people_env_email_key/);
  await db.query("insert into giveaway_entries (env, person_id, kind) values ('test', $1, 'base')", [a]);
  await assert.rejects(db.query("insert into giveaway_entries (env, person_id, kind) values ('test', $1, 'base')", [a]), /giveaway_entries_one_base_idx/);
  await db.query("insert into giveaway_entries (env, person_id, kind, referral_person_id) values ('test', $1, 'referral_bonus', $1)", [a]);
  await db.query("insert into giveaway_entries (env, person_id, kind, referral_person_id) values ('test', $1, 'referral_bonus', $1)", [a]);
  await assert.rejects(db.query("insert into giveaway_drawings (env, slot, kind, scheduled_at) values ('test', 'mon', 'daily', '2026-11-16T18:00:00Z')"), /giveaway_drawings_env_scheduled_at_kind_key|giveaway_drawings_env_slot_key/);
  await assert.rejects(db.query("insert into giveaway_people (env, email, email_display, first_name, last_name, zip, referral_code) values ('test', 'z@example.test', 'z', 'A', 'B', '3706', 'X')"), /zip_check/);
});

test("0015: giveaway_redeem_gift redeems to the cap, then waitlists (or falls back); idempotent; the lead flag column exists", async () => {
  const db = await fresh();
  for (const f of files) await db.exec(readFileSync(new URL(f, DIR), "utf8"));
  await db.exec(readFileSync(new URL("0015_gift_cap.sql", DIR), "utf8")); // twice
  const person = async (i) => (await db.query(`insert into giveaway_people (env, first_name, last_name, email, email_display, zip, referral_code) values ('test', 'T', 'P', 'p${i}@x.test', 'p${i}@x.test', '37064', 'HBC-T0000${i}') returning id`)).rows[0].id;
  const offer = async (i) => (await db.query(`insert into giveaway_offers (env, person_id, code, expires_at) values ('test', $1, 'TEST-CODE-${i}', now() + interval '30 days') returning id`, [await person(i)])).rows[0].id;
  const redeem = async (id, cap, fb = false, env = "test") => (await db.query("select public.giveaway_redeem_gift($1, $2, 'Nashville', $3, $4, null, now()) as r", [env, id, cap, fb])).rows[0].r;
  const [a, b, c, d] = [await offer(1), await offer(2), await offer(3), await offer(4)];
  assert.equal(await redeem(a, 2), "redeemed");
  assert.equal(await redeem(b, 2), "redeemed");
  assert.equal(await redeem(c, 2), "waitlisted");
  assert.equal(await redeem(c, 2), "waitlisted", "a second try at the cap is still waitlisted");
  assert.equal(await redeem(a, 2), "already");
  assert.equal(await redeem(d, 2, true), "fallback");
  assert.equal(await redeem(c, null), "redeemed", "no cap: redeem");
  assert.equal(await redeem(c, 5, false, "production"), "already", "env-scoped: another env's call finds nothing to update");
  const counts = (await db.query("select count(*) filter (where redeemed_at is not null and not fallback)::int as n, count(*) filter (where fallback)::int as f from giveaway_offers where env = 'test'")).rows[0];
  assert.deepEqual(counts, { n: 3, f: 1 });
  await db.query("insert into consultation_requests (type, first_name, phone, preferred_center, giveaway_waitlist) values ('consultation', 'T', '0', 'Nashville', true)");
});
