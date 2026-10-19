// Unit tests for lib/giveaway/tokens.ts: a signed token verifies only for its
// own kind, env and lifetime; a bit flipped anywhere fails; codes come from
// the unambiguous alphabet. Run: npm test

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

const T = await import("./tokens.ts");
const SECRET = "test-secret-at-least-sixteen-chars";

test("sign → verify round trip, kind and env checked", () => {
  const token = T.signToken({ kind: "unsubscribe", subject: "sarah@example.test", env: "test" }, SECRET);
  assert.match(token, /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  const ok = T.verifyToken(token, { kind: "unsubscribe", env: "test" }, SECRET);
  assert.equal(ok.ok, true);
  assert.equal(ok.payload.s, "sarah@example.test");
  assert.deepEqual(T.verifyToken(token, { kind: "claim", env: "test" }, SECRET), { ok: false, reason: "wrong_kind" });
  assert.deepEqual(T.verifyToken(token, { kind: "unsubscribe", env: "production" }, SECRET), { ok: false, reason: "wrong_env" });
  assert.deepEqual(T.verifyToken(token, { kind: "unsubscribe", env: "test" }, "another-secret-of-16-chars"), { ok: false, reason: "bad_signature" });
});

test("tampering fails; garbage is malformed", () => {
  const token = T.signToken({ kind: "claim", subject: "winner-row-id", env: "test" }, SECRET);
  const [body, sig] = token.split(".");
  const flipped = body.slice(0, -1) + (body.endsWith("A") ? "B" : "A");
  assert.equal(T.verifyToken(`${flipped}.${sig}`, { kind: "claim", env: "test" }, SECRET).ok, false);
  assert.deepEqual(T.verifyToken("nonsense", { kind: "claim", env: "test" }, SECRET), { ok: false, reason: "malformed" });
  assert.deepEqual(T.verifyToken("", { kind: "claim", env: "test" }, SECRET), { ok: false, reason: "malformed" });
  assert.deepEqual(T.verifyToken("a.b.c", { kind: "claim", env: "test" }, SECRET), { ok: false, reason: "malformed" });
});

test("expiry is honoured; two tokens for one subject differ (nonce)", () => {
  const exp = new Date("2026-11-24T23:00:00Z");
  const token = T.signToken({ kind: "claim", subject: "w1", env: "test", expiresAt: exp }, SECRET);
  assert.equal(T.verifyToken(token, { kind: "claim", env: "test", now: new Date("2026-11-24T22:59:59Z") }, SECRET).ok, true);
  assert.deepEqual(T.verifyToken(token, { kind: "claim", env: "test", now: new Date("2026-11-24T23:00:01Z") }, SECRET), { ok: false, reason: "expired" });
  const again = T.signToken({ kind: "claim", subject: "w1", env: "test", expiresAt: exp }, SECRET);
  assert.notEqual(token, again);
});

test("tokenSecret refuses unset or short values", () => {
  assert.throws(() => T.tokenSecret({}), /GIVEAWAY_TOKEN_SECRET is not set/);
  assert.throws(() => T.tokenSecret({ GIVEAWAY_TOKEN_SECRET: "short" }), /16\+/);
  assert.equal(T.tokenSecret({ GIVEAWAY_TOKEN_SECRET: ` ${SECRET} ` }), SECRET);
});

test("hashes and codes", () => {
  assert.equal(T.sha256Hex("a"), T.sha256Hex("a"));
  assert.notEqual(T.sha256Hex("a"), T.sha256Hex("a", "salt"));
  assert.match(T.sha256Hex("x"), /^[0-9a-f]{64}$/);
  for (let i = 0; i < 50; i++) {
    assert.match(T.randomCode(), /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/);
    assert.match(T.referralCode(), /^HBC-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
    assert.match(T.offerCode(), /^10Y-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
  }
});
