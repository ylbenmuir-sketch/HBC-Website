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
  assert.deepEqual(tue, { v: 645, t: true });
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
