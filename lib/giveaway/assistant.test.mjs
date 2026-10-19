/**
 * The assistant's suppression on /10years follows the giveaway clock — the
 * fake one included — not the browser's date (Ben, 2026-10-19: the bar
 * showed with the local clock on Nov 10).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

registerHooks({
  resolve(spec, ctx, next) {
    const local = !ctx.parentURL?.includes("/node_modules/");
    if (local && spec.startsWith(".") && !/\.(ts|tsx|js|mjs|cjs|json)$/.test(spec)) return next(`${spec}.ts`, ctx);
    return next(spec, ctx);
  },
});

process.env.GIVEAWAY_ENV = "test";
const { setFakeNow } = await import("./clock.ts");
const { assistantSuppressedByGiveaway } = await import("./assistant.ts");
const { assistantSuppressedOn } = await import("../site-config.ts");

const quiet = { log() {}, error() {} };

test("the suppression reads the giveaway clock: on with the fake clock inside the window, off outside it", () => {
  assert.ok(setFakeNow(new Date("2026-11-10T16:00:00Z"), quiet));
  assert.equal(assistantSuppressedByGiveaway(), true, "Nov 10 (notify-me) → off");
  assert.ok(setFakeNow(new Date("2026-11-17T16:00:00Z"), quiet));
  assert.equal(assistantSuppressedByGiveaway(), true, "Nov 17 (live) → off");
  assert.ok(setFakeNow(new Date("2026-10-01T16:00:00Z"), quiet));
  assert.equal(assistantSuppressedByGiveaway(), false, "Oct 1 → on");
  assert.ok(setFakeNow(new Date("2026-12-07T16:00:00Z"), quiet));
  assert.equal(assistantSuppressedByGiveaway(), false, "Dec 7 → back on");
  setFakeNow(null, quiet);
});

test("the pathname check alone no longer decides the window — only the fixed routes", () => {
  assert.equal(assistantSuppressedOn("/contact"), true);
  assert.equal(assistantSuppressedOn("/admin/10years"), true);
  assert.equal(assistantSuppressedOn("/10years"), false, "the page, not the path, says when");
  assert.equal(assistantSuppressedOn("/"), false);
});
