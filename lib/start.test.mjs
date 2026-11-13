// Unit tests for lib/start.ts (Ben, 2026-11-13): /start's headlines are
// short, never say the visitor has a condition or promise a result, and an
// unknown code gets the default.
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

const { START_HOOKS, START_DEFAULT_HOOK, START_OFFER, START_TRUST, START_HOW, startHook } = await import("./start.ts");
const { cleanHook } = await import("./attribution.ts");
const { PROOF_LINE_SHORT } = await import("./site-config.ts");

const HEADLINES = {
  g1: "See what your brain is doing.",
  k1: "When homework is a daily battle.",
  k2: "For kids who can’t calm down.",
  a1: "When your mind won’t turn off.",
  a2: "A drug-free look at sleep.",
  a3: "Clear the fog.",
  a4: "See what’s going on with focus.",
  a5: "A drug-free look at stress.",
  n1: "LENS starts with a brain map.",
};

/** Whole words only, either apostrophe: "treat" must not pass as "treats", nor hide in "retreat". */
const BANNED = ["you have", "your anxiety", "cure", "fix", "treat", "book"];
const banned = (s) => {
  const plain = s.toLowerCase().replace(/’/g, "'");
  return BANNED.filter((w) => new RegExp(`\\b${w}(s|d|ed|ing)?\\b`).test(plain));
};

test("the codes and their headlines are the agreed list", () => {
  assert.deepEqual(Object.fromEntries(Object.entries(START_HOOKS).map(([k, v]) => [k, v.headline])), HEADLINES);
});

test("every headline is six words or fewer", () => {
  for (const [code, { headline }] of Object.entries(START_HOOKS)) {
    const words = headline.trim().split(/\s+/).length;
    assert.ok(words <= 6, `${code}: "${headline}" is ${words} words`);
  }
});

test("no headline says the visitor has a condition, promises a result, or says Book", () => {
  for (const [code, { headline }] of Object.entries(START_HOOKS)) {
    assert.deepEqual(banned(headline), [], `${code}: "${headline}"`);
  }
  // The check itself catches what it is for.
  assert.deepEqual(banned("Fix your anxiety"), ["your anxiety", "fix"]);
  assert.deepEqual(banned("Book now. You have options"), ["you have", "book"]);
});

test("the rest of the page's copy holds to the same words", () => {
  for (const line of [START_OFFER.line, START_OFFER.button, START_OFFER.guarantee, START_OFFER.afterSend, START_HOW.heading, START_HOW.caption, START_HOW.jump, ...START_HOW.steps]) {
    assert.deepEqual(banned(line), [], line);
  }
  assert.equal(START_OFFER.button, "Request My Consultation");
});

test("How it works is the caption and the three steps, word for word", () => {
  assert.equal(START_HOW.caption, "Your brain map, in plain English.");
  assert.deepEqual(START_HOW.steps.map((t) => t.replace(/’/g, "'")), [
    "We measure all 21 sites of your brain to see what's doing well, what's in overdrive, and what's underperforming.",
    "We walk you through your results and how they can show up in everyday life.",
    "We build a customized brain plan based on your results.",
  ]);
});

test("an unknown, missing or malformed code gets the default", () => {
  for (const h of ["zz", "z9", "anxiety", "", " ", undefined, null, 7, ["k1"], "__proto__", "constructor"]) {
    assert.equal(startHook(h), START_DEFAULT_HOOK, String(h));
  }
  assert.equal(startHook("g1"), START_DEFAULT_HOOK);
  assert.equal(startHook(" K1 ").headline, HEADLINES.k1);
});

test("every code is one the lead can save (cleanHook)", () => {
  for (const code of Object.keys(START_HOOKS)) assert.equal(cleanHook(code), code, code);
});

test("the offer line and the trust line are built from the site's own figures", () => {
  assert.equal(START_OFFER.line, "60-minute Brain Map Session · $150 · written plan included");
  assert.equal(`${START_TRUST.star} ${START_TRUST.text}`, "★ 5.0 · 160+ Google reviews");
  // The same count the site's proof line prints.
  assert.ok(PROOF_LINE_SHORT.includes(START_TRUST.text.split(" · ")[1]));
});
