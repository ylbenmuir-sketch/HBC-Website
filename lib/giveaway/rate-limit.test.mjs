// Unit tests for lib/giveaway/rate-limit.ts: per IP hash, per email, per
// referral code — fixed windows, the count shared through the counter, keys
// hashed, failure closed. The counter is in memory with the same ON CONFLICT
// rule as the SQL function. Run: npm test

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

const R = await import("./rate-limit.ts");
const quiet = { error() {} };
const T0 = new Date("2026-11-16T15:00:00Z");
const at = (s) => new Date(T0.getTime() + s * 1000);

test("per IP hash: 5 entry attempts an hour, then refused until the window turns", async () => {
  const counter = R.memoryCounter();
  for (let i = 1; i <= 5; i++) {
    const r = await R.rateLimit(counter, "entry_ip", "203.0.113.9", { now: at(i) });
    assert.equal(r.allowed, true, `attempt ${i}`);
    assert.equal(r.remaining, 5 - i);
  }
  const sixth = await R.rateLimit(counter, "entry_ip", "203.0.113.9", { now: at(6) });
  assert.equal(sixth.allowed, false);
  assert.equal(sixth.reason, "limit");
  assert.ok(sixth.retryAfterSeconds > 0 && sixth.retryAfterSeconds <= 3600);
  // Another address is unaffected.
  assert.equal((await R.rateLimit(counter, "entry_ip", "203.0.113.10", { now: at(6) })).allowed, true);
  // The next hour window is fresh.
  assert.equal((await R.rateLimit(counter, "entry_ip", "203.0.113.9", { now: new Date("2026-11-16T16:00:00Z") })).allowed, true);
  // The table never holds the address.
  for (const key of counter.rows.keys()) assert.doesNotMatch(key, /203\.0\.113/);
});

test("per email: one verification email per ten minutes, case- and space-insensitive", async () => {
  const counter = R.memoryCounter();
  assert.equal((await R.rateLimit(counter, "verify_email", "Sarah@Example.test", { now: at(0) })).allowed, true);
  const again = await R.rateLimit(counter, "verify_email", " sarah@example.test ", { now: at(30) });
  assert.equal(again.allowed, false);
  assert.equal(again.retryAfterSeconds, 10 * 60 - 30);
  assert.equal((await R.rateLimit(counter, "verify_email", "sarah@example.test", { now: at(600) })).allowed, true);
});

test("per referral code: a burst ceiling of 30 an hour", async () => {
  const counter = R.memoryCounter();
  for (let i = 0; i < 30; i++) assert.equal((await R.rateLimit(counter, "referral_code", "HBC-ABCDEF", { now: at(i) })).allowed, true);
  assert.equal((await R.rateLimit(counter, "referral_code", "HBC-ABCDEF", { now: at(31) })).allowed, false);
  assert.equal((await R.rateLimit(counter, "referral_code", "HBC-ZZZZZZ", { now: at(31) })).allowed, true);
});

test("buckets are independent; the window start is aligned to the window", async () => {
  const counter = R.memoryCounter();
  await R.rateLimit(counter, "verify_email", "a@b.c", { now: at(0) });
  assert.equal((await R.rateLimit(counter, "admin_code_email", "a@b.c", { now: at(0) })).allowed, true);
  assert.equal(R.windowStart(new Date("2026-11-16T15:07:33Z"), 10 * 60_000).toISOString(), "2026-11-16T15:00:00.000Z");
  assert.equal(R.windowStart(new Date("2026-11-16T15:07:33Z"), 3600_000).toISOString(), "2026-11-16T15:00:00.000Z");
  assert.notEqual(R.keyHash("x"), R.keyHash("x", "salt"));
});

test("fails closed when the counter throws, and says so", async () => {
  const broken = { hit: async () => { throw new Error("db down"); } };
  const errors = [];
  const r = await R.rateLimit(broken, "entry_ip", "1.2.3.4", { now: at(0), log: { error: (m) => errors.push(m) } });
  assert.equal(r.allowed, false);
  assert.equal(r.reason, "error");
  assert.match(errors[0], /db down/);
});

test("supabaseCounter calls the SQL function with the hash and window, never the key", async () => {
  const calls = [];
  const store = { rpc: (fn, args) => { calls.push([fn, args]); return Promise.resolve({ data: 3, error: null }); } };
  const counter = R.supabaseCounter(store);
  const r = await R.rateLimit(counter, "entry_ip", "203.0.113.9", { now: at(0), log: quiet });
  assert.equal(r.allowed, true);
  assert.equal(r.count, 3);
  assert.equal(calls[0][0], "giveaway_rate_limit_hit");
  assert.equal(calls[0][1].p_bucket, "entry_ip");
  assert.match(calls[0][1].p_key_hash, /^[0-9a-f]{64}$/);
  assert.equal(calls[0][1].p_window_start, "2026-11-16T15:00:00.000Z");
  const failing = R.supabaseCounter({ rpc: async () => ({ data: null, error: { message: "function missing" } }) });
  assert.equal((await R.rateLimit(failing, "entry_ip", "x", { log: quiet })).reason, "error");
});

test("clientAddress reads x-forwarded-for first", () => {
  assert.equal(R.clientAddress(new Request("http://x", { headers: { "x-forwarded-for": "198.51.100.7, 10.0.0.1" } })), "198.51.100.7");
  assert.equal(R.clientAddress(new Request("http://x", { headers: { "x-real-ip": "198.51.100.8" } })), "198.51.100.8");
  assert.equal(R.clientAddress(new Request("http://x")), "unknown");
});
