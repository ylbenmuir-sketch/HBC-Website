// Unit tests for lib/murfreesboro.ts (Ben, 2026-11-22): the Murfreesboro ad
// page keeps /start's headline codes, its own default headline, exactly
// three lines under the form, the exact button and guarantee, and none of
// the words the page may not use.
// Run: npm test   (plain `node --test`; Node strips the types from the .ts)

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

const M = await import("./murfreesboro.ts");
const { START_HOOKS, START_OFFER } = await import("./start.ts");
const { metaAllowedPath } = await import("./meta.ts");
const { assistantSuppressedOn, MOBILE_BAR_SUPPRESSED_ROUTES } = await import("./site-config.ts");

test("no code, g1 or an unknown code gets the page's own headline; an ad's code gets /start's line", () => {
  for (const h of [undefined, "", "g1", "zz9", "anxiety", ["k1"]]) assert.equal(M.murfreesboroHook(h), M.MURFREESBORO_DEFAULT_HOOK, String(h));
  assert.equal(M.MURFREESBORO_DEFAULT_HOOK.headline, "See which parts of your brain are in overdrive, which are running quiet, and what to do about it.");
  for (const [code, hook] of Object.entries(START_HOOKS)) {
    if (code !== "g1") assert.equal(M.murfreesboroHook(code), hook, code);
  }
});

test("the offer's exact words", () => {
  assert.equal(START_OFFER.button, "Request My Consultation");
  assert.equal(M.MURFREESBORO_OFFER.guarantee, "If we don’t deliver the map and the written plan, you don’t pay.");
  assert.equal(M.MURFREESBORO_OFFER.badges, "$150 · 60 minutes");
  assert.equal(M.MURFREESBORO_OFFER.formSub, "We’ll call to find a time that works for you.");
  assert.equal(M.MURFREESBORO_OFFER.sub, "A 60-minute Brain Map Session at our Murfreesboro center. You leave with your map and a written plan. $150, no medication.");
});

test("exactly three lines under the form", () => {
  assert.deepEqual([...M.MURFREESBORO_BULLETS], [
    "Painless. Sensors simply read your brain’s activity while you sit comfortably.",
    "About 60 minutes, and you leave with your map and written plan the same day.",
    "No referral needed, and nothing is booked that day unless you want it to be.",
  ]);
  // The guarantee is said once, under the button — never in the three lines.
  for (const line of M.MURFREESBORO_BULLETS) assert.equal(/don’t pay/.test(line), false, line);
});

test("words the page may not use", () => {
  const all = [M.MURFREESBORO_DEFAULT_HOOK.headline, ...Object.values(M.MURFREESBORO_OFFER), ...M.MURFREESBORO_BULLETS, M.BRAIN_MAP_VIDEO.title, M.BRAIN_MAP_VIDEO.posterAlt].join(" ").toLowerCase();
  for (const w of ["clarity session", "book my brain map", "rowney", "nashville", "cure", "diagnos", "treat"]) assert.equal(all.includes(w), false, w);
});

test("the path is a place name: the pixel's exact path, no assistant, no phone bar", () => {
  assert.equal(M.MURFREESBORO_AD_PATH, "/murfreesboro");
  assert.equal(metaAllowedPath("/murfreesboro"), true);
  assert.equal(metaAllowedPath("/murfreesboro/x"), false);
  assert.equal(assistantSuppressedOn("/murfreesboro"), true);
  assert.equal(MOBILE_BAR_SUPPRESSED_ROUTES.includes("/murfreesboro"), true);
});

test("the video slot ships as a plain poster still, with no placeholder words", () => {
  assert.equal("soon" in M.BRAIN_MAP_VIDEO, false);
  assert.equal(M.BRAIN_MAP_VIDEO.poster, "/images/map-points.jpg");
  // When the clip is recorded this is the test to update, with the paths.
  assert.equal(M.BRAIN_MAP_VIDEO.src, null);
  assert.match(M.BRAIN_MAP_VIDEO.poster, /^\/images\/.+\.(jpg|png|webp)$/);
});
