// Unit test for lib/form-guard.ts — the contact form's spam guard (Ben,
// 2026-11-08): the page token, the minimum fill time, the rate limit, and
// where it is enforced. Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FORM_MIN_FILL_MS,
  FORM_TOKEN_TTL_MS,
  FORM_RATE_LIMIT,
  checkFormRateLimit,
  checkFormToken,
  formClientKey,
  guardEnforced,
  internalSubmitHeaders,
  isInternalSubmit,
  mintFormToken,
  resetFormRateLimit,
} from "./form-guard.ts";

const ENV = { FORM_TOKEN_SECRET: "test-secret-one" };
const T0 = Date.UTC(2026, 10, 8, 12);

test("a token is good from 3 s to its TTL, and only then", () => {
  const t = mintFormToken(T0, ENV);
  assert.deepEqual(checkFormToken(t, T0 + 500, ENV), { ok: false, reason: "too_fast", ageMs: 500 });
  assert.equal(checkFormToken(t, T0 + FORM_MIN_FILL_MS - 1, ENV).ok, false);
  assert.deepEqual(checkFormToken(t, T0 + FORM_MIN_FILL_MS, ENV), { ok: true, ageMs: FORM_MIN_FILL_MS });
  assert.equal(checkFormToken(t, T0 + 20 * 60_000, ENV).ok, true);
  assert.deepEqual(checkFormToken(t, T0 + FORM_TOKEN_TTL_MS + 1, ENV), { ok: false, reason: "expired", ageMs: FORM_TOKEN_TTL_MS + 1 });
});

test("missing, malformed, forged and re-keyed tokens are refused", () => {
  const later = T0 + 10_000;
  for (const bad of [undefined, null, "", 42, {}]) assert.equal(checkFormToken(bad, later, ENV).reason, "missing");
  for (const bad of ["abc", "v1.x.y", "v2.a.b.c", "v1.zz.zz.zz.zz", "x".repeat(300)]) {
    assert.equal(checkFormToken(bad, later, ENV).ok, false, bad);
  }
  const t = mintFormToken(T0, ENV);
  const [v, at, nonce, sig] = t.split(".");
  // Backdating the issue time to beat the fill-time check breaks the signature.
  const backdated = [v, (T0 - 60_000).toString(36), nonce, sig].join(".");
  assert.equal(checkFormToken(backdated, T0 + 1_000, ENV).reason, "bad_signature");
  assert.equal(checkFormToken(`${v}.${at}.${nonce}.${sig.slice(0, -2)}xx`, later, ENV).reason, "bad_signature");
  assert.equal(checkFormToken(t, later, { FORM_TOKEN_SECRET: "another" }).reason, "bad_signature");
  // From the future (beyond clock skew) is not a real token.
  assert.equal(checkFormToken(mintFormToken(T0 + 120_000, ENV), T0, ENV).ok, false);
});

test("without FORM_TOKEN_SECRET the key is derived from the service-role key, stably", () => {
  const env = { SUPABASE_SERVICE_ROLE_KEY: "service-role-abc" };
  const t = mintFormToken(T0, env);
  assert.equal(checkFormToken(t, T0 + 5_000, { ...env }).ok, true);
  assert.equal(checkFormToken(t, T0 + 5_000, { SUPABASE_SERVICE_ROLE_KEY: "rotated" }).ok, false);
});

test("enforced on Vercel, off locally, and the switch wins both ways", () => {
  assert.equal(guardEnforced({}), false);
  assert.equal(guardEnforced({ VERCEL_ENV: "production" }), true);
  assert.equal(guardEnforced({ VERCEL_ENV: "preview" }), true);
  assert.equal(guardEnforced({ VERCEL: "1" }), true);
  assert.equal(guardEnforced({ FORM_GUARD: "on" }), true);
  assert.equal(guardEnforced({ FORM_GUARD: "off", VERCEL_ENV: "production" }), false);
  assert.equal(guardEnforced({ FORM_GUARD: " OFF ", VERCEL_ENV: "production" }), false);
});

test("rate limit: 5 per 10 minutes, 20 per day, per address", () => {
  resetFormRateLimit();
  assert.deepEqual(FORM_RATE_LIMIT.windows.map((w) => w.max), [5, 20]);
  for (let i = 0; i < 5; i++) assert.equal(checkFormRateLimit("198.51.100.7", T0 + i).allowed, true);
  const sixth = checkFormRateLimit("198.51.100.7", T0 + 10);
  assert.equal(sixth.allowed, false);
  assert.ok(sixth.retryAfterSeconds > 500 && sixth.retryAfterSeconds <= 600, String(sixth.retryAfterSeconds));
  assert.equal(checkFormRateLimit("203.0.113.9", T0 + 10).allowed, true, "another address is unaffected");
  // Eleven minutes on, the short window has cleared.
  resetFormRateLimit();
  let allowed = 0;
  for (let hour = 0; hour < 24; hour++) {
    for (let k = 0; k < 3; k++) if (checkFormRateLimit("192.0.2.1", T0 + hour * 3_600_000 + k * 660_000).allowed) allowed++;
  }
  assert.equal(allowed, 20, "the day window caps a slow drip");
  resetFormRateLimit();
});

test("client key: first x-forwarded-for entry, else x-real-ip, else unknown", () => {
  const req = (h) => new Request("https://example.test/api/consultation", { method: "POST", headers: h });
  assert.equal(formClientKey(req({ "x-forwarded-for": "198.51.100.7, 10.0.0.1" })), "198.51.100.7");
  assert.equal(formClientKey(req({ "x-real-ip": "203.0.113.4" })), "203.0.113.4");
  assert.equal(formClientKey(req({})), "unknown");
});

test("only the in-process key marks a request internal", () => {
  const req = (h) => new Request("https://example.test/api/consultation", { method: "POST", headers: h });
  assert.equal(isInternalSubmit(req(internalSubmitHeaders())), true);
  assert.equal(isInternalSubmit(req({})), false);
  assert.equal(isInternalSubmit(req({ "x-hbc-internal-submit": "guess" })), false);
});
