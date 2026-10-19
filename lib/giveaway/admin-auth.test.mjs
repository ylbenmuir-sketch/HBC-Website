// Unit tests for lib/giveaway/admin-auth.ts: the allowlist comes from the
// env var and the table, never from code; a code goes only to an address on
// the list; a good code mints a 12-hour session that is re-checked against
// the list; every attempt is audited; the limiter applies. The store is an
// in-memory fake, the OTP client a stub. Run: npm test

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

const A = await import("./admin-auth.ts");
const { memoryCounter } = await import("./rate-limit.ts");
const SECRET = "test-secret-at-least-sixteen-chars";
const quiet = { error() {} };

/** A tiny in-memory GiveawayStore: allowlist rows + audit rows for one env. */
function fakeStore(env = "test") {
  const allow = new Set();
  const audits = [];
  const table = (name) => ({
    select: () => Promise.resolve(name === "giveaway_admin_allowlist" ? { data: [...allow].map((email) => ({ email })), error: null } : { data: [], error: null }),
    upsert: (rows) => { for (const r of rows) allow.add(r.email); return Promise.resolve({ error: null }); },
    insert: (rows) => { if (name === "giveaway_audit") audits.push(...rows); return Promise.resolve({ error: null }); },
  });
  const store = {
    env,
    allow,
    audits,
    select: (t) => table(t).select(),
    upsert: (t, rows) => table(t).upsert(rows),
    insert: (t, rows) => table(t).insert(Array.isArray(rows) ? rows : [rows]),
  };
  return store;
}

function otpStub({ good = "123456", fail = false } = {}) {
  const sent = [];
  return {
    sent,
    async signInWithOtp(email) { if (fail) return { error: { message: "smtp down" } }; sent.push(email); return { error: null }; },
    async verifyOtp(email, code) { return code === good ? { email, error: null } : { email: null, error: { message: "Token has expired or is invalid" } }; },
  };
}

const ENV = { GIVEAWAY_ADMINS: "Ben@Example.test, denise@example.test; kylie@example.test, not-an-address" };

test("the allowlist is the env var, normalized — nothing in code", () => {
  assert.deepEqual(A.adminEmailsFromEnv(ENV), ["ben@example.test", "denise@example.test", "kylie@example.test"]);
  assert.deepEqual(A.adminEmailsFromEnv({}), []);
});

test("a code goes only to an address on the list; everything is audited", async () => {
  const store = fakeStore();
  const otp = otpStub();
  const deps = { store, otp, counter: memoryCounter(), env: ENV, log: quiet };
  assert.deepEqual(await A.requestCode(deps, { email: "stranger@example.test", ip: "1.1.1.1" }), { ok: false, reason: "not_allowed" });
  assert.deepEqual(otp.sent, []);
  assert.deepEqual(await A.requestCode(deps, { email: "Denise@Example.test", ip: "1.1.1.1" }), { ok: true });
  assert.deepEqual(otp.sent, ["denise@example.test"]);
  assert.deepEqual(store.audits.map((a) => a.action), ["admin_code_denied", "admin_code_requested"]);
  assert.equal(store.audits[1].actor, "denise@example.test");
  assert.match(store.audits[1].ip_hash, /^[0-9a-f]{64}$/);
  // The table was seeded from the variable.
  assert.deepEqual([...store.allow].sort(), ["ben@example.test", "denise@example.test", "kylie@example.test"]);
});

test("not configured: no variable, or no table", async () => {
  const otp = otpStub();
  const r1 = await A.requestCode({ store: fakeStore(), otp, counter: memoryCounter(), env: {}, log: quiet }, { email: "ben@example.test", ip: "1.1.1.1" });
  assert.deepEqual(r1, { ok: false, reason: "not_configured", detail: "GIVEAWAY_ADMINS" });
  const broken = fakeStore();
  broken.select = () => Promise.resolve({ data: null, error: { message: 'relation "giveaway_admin_allowlist" does not exist' } });
  const r2 = await A.requestCode({ store: broken, otp, counter: memoryCounter(), env: ENV, log: quiet }, { email: "ben@example.test", ip: "1.1.1.1" });
  assert.deepEqual(r2, { ok: false, reason: "not_configured", detail: "allowlist" });
  assert.deepEqual(otp.sent, []);
});

test("a failed send is reported and audited; an invalid address never reaches the list", async () => {
  const store = fakeStore();
  const r = await A.requestCode({ store, otp: otpStub({ fail: true }), counter: memoryCounter(), env: ENV, log: quiet }, { email: "ben@example.test", ip: "1.1.1.1" });
  assert.equal(r.ok, false);
  assert.equal(r.reason, "send_failed");
  assert.equal(store.audits.at(-1).action, "admin_code_send_failed");
  assert.deepEqual(await A.requestCode({ store, otp: otpStub(), counter: memoryCounter(), env: ENV, log: quiet }, { email: "ben", ip: "1.1.1.1" }), { ok: false, reason: "invalid_email" });
});

test("three codes per address per ten minutes, then rate limited", async () => {
  const store = fakeStore();
  const counter = memoryCounter();
  const deps = { store, otp: otpStub(), counter, env: ENV, log: quiet };
  for (let i = 0; i < 3; i++) assert.equal((await A.requestCode(deps, { email: "ben@example.test", ip: "1.1.1.1" })).ok, true);
  assert.deepEqual(await A.requestCode(deps, { email: "ben@example.test", ip: "1.1.1.1" }), { ok: false, reason: "rate_limited" });
  assert.equal(store.audits.at(-1).action, "admin_rate_limited");
});

test("a good code mints a session; the session is re-checked against the list", async () => {
  const store = fakeStore();
  const otp = otpStub({ good: "654321" });
  const now = new Date("2026-11-16T15:00:00Z");
  const deps = { store, otp, secret: SECRET, counter: memoryCounter(), env: ENV, now, log: quiet };
  const bad = await A.verifyCode(deps, { email: "ben@example.test", code: "000000", ip: "1.1.1.1" });
  assert.deepEqual(bad, { ok: false, reason: "invalid" });
  assert.equal(store.audits.at(-1).action, "admin_code_rejected");
  const good = await A.verifyCode(deps, { email: "ben@example.test", code: "654 321", ip: "1.1.1.1" });
  assert.equal(good.ok, true);
  assert.equal(good.email, "ben@example.test");
  assert.equal(good.expiresAt.toISOString(), "2026-11-17T03:00:00.000Z");
  assert.equal(store.audits.at(-1).action, "admin_signed_in");

  const who = await A.currentAdmin({ store, secret: SECRET, env: ENV, now }, good.sessionToken);
  assert.deepEqual(who, { email: "ben@example.test" });
  // Expired after twelve hours.
  assert.equal(await A.currentAdmin({ store, secret: SECRET, env: ENV, now: new Date("2026-11-17T03:00:01Z") }, good.sessionToken), null);
  // Removed from the variable → refused on the next request even with a valid cookie.
  const removed = fakeStore();
  assert.equal(await A.currentAdmin({ store: removed, secret: SECRET, env: { GIVEAWAY_ADMINS: "denise@example.test" }, now }, good.sessionToken), null);
  // A token for another env is refused.
  const other = fakeStore("production");
  assert.equal(await A.currentAdmin({ store: other, secret: SECRET, env: ENV, now }, good.sessionToken), null);
  // Garbage and absence.
  assert.equal(await A.currentAdmin({ store, secret: SECRET, env: ENV, now }, "nonsense"), null);
  assert.equal(await A.currentAdmin({ store, secret: SECRET, env: ENV, now }, undefined), null);
});

test("a good code for an address not on the list still fails", async () => {
  const store = fakeStore();
  const r = await A.verifyCode({ store, otp: otpStub(), secret: SECRET, counter: memoryCounter(), env: ENV, log: quiet }, { email: "stranger@example.test", code: "123456", ip: "1.1.1.1" });
  assert.deepEqual(r, { ok: false, reason: "not_allowed" });
});

test("pending cookie: which address is waiting for a code, ten minutes", () => {
  const now = new Date("2026-11-16T15:00:00Z");
  const t = A.pendingToken("ben@example.test", "test", SECRET, now);
  assert.equal(A.pendingEmail(t, "test", SECRET, new Date(now.getTime() + 9 * 60_000)), "ben@example.test");
  assert.equal(A.pendingEmail(t, "test", SECRET, new Date(now.getTime() + 11 * 60_000)), null);
  assert.equal(A.pendingEmail(t, "production", SECRET, now), null);
  assert.equal(A.pendingEmail(undefined, "test", SECRET, now), null);
});

test("a counter that cannot be reached reads as not configured, not rate limited", async () => {
  const broken = { hit: async () => { throw new Error("function missing"); } };
  const r = await A.requestCode({ store: fakeStore(), otp: otpStub(), counter: broken, env: ENV, log: quiet }, { email: "ben@example.test", ip: "1.1.1.1" });
  assert.deepEqual(r, { ok: false, reason: "not_configured", detail: "rate_limits" });
  const v = await A.verifyCode({ store: fakeStore(), otp: otpStub(), secret: SECRET, counter: broken, env: ENV, log: quiet }, { email: "ben@example.test", code: "123456", ip: "1.1.1.1" });
  assert.deepEqual(v, { ok: false, reason: "not_configured" });
});
