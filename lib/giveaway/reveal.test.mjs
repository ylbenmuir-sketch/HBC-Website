/**
 * The thank-you gift is a secret until Sat Nov 21, 7:00 PM CT (fix list
 * rev 2, P0-2): the rules, the You're-in email and every pre-reveal copy
 * line never name it; from the reveal on, the rules' §13 and the reveal
 * email do. Both sides of GIFT_REVEAL_AT.
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

process.env.GIVEAWAY_HIDE_DRAFT_TAGS = "1";
const C = await import("./config.ts");
const R = await import("./rules.ts");
const E = await import("./emails.ts");
const { PAGES } = await import("./copy.ts");

const FORBIDDEN = /free first visit|first visit|13th|thank-you offer/i;
const input = (giftRevealed) => ({ legalEntity: "Five Dog Enterprises Inc", centers: [{ name: "Nashville", address: "197 Thompson Ln, Suite S, Nashville, TN 37211", phone: "(615) 331-8762" }, { name: "Murfreesboro", address: "206 W Chestnut St, Murfreesboro, TN 37130", phone: "(615) 203-2650" }], siteHost: "example.test", contactEmail: "hi@example.test", privacyUrl: "https://example.test/privacy-policy", giftRevealed });
const text = (sections) => R.rulesText(sections);

test("the reveal instant: one second before is hidden, the instant itself is revealed", () => {
  const at = C.GIFT_REVEAL_AT.getTime();
  assert.equal(C.giftRevealed(new Date(at - 1000)), false);
  assert.equal(C.giftRevealed(new Date(at)), true);
});

test("the rules before the reveal: §13 is one neutral line; nothing names the gift", () => {
  const s = R.rulesSections(input(false));
  const gift = s.find((x) => x.id === "thank-you-gift");
  assert.equal(gift.n, 13);
  assert.equal(gift.blocks.length, 1);
  assert.equal(s.length, 20, "the draft's twenty sections");
  assert.doesNotMatch(text(s), FORBIDDEN);
  assert.doesNotMatch(text(s), /counsel|placeholder|\[|\]/i);
});

test("the rules after the reveal: §13 names the free first visit", () => {
  const s = R.rulesSections(input(true));
  assert.match(R.rulesText([s.find((x) => x.id === "thank-you-gift")]), /free first visit/);
});

test("the rules' facts (async): Ben's winner-contact wording, center pickup, $2,000 with the accountant note, the new prize values, Ben's current-client sentence", async () => {
  const t = text(R.rulesSections(input(false)));
  // Ben, 2026-11-03: no automated winner email; staff call and email.
  assert.match(t, /HBC staff will contact the winner by phone and email\. If the winner doesn't respond within 72 hours of our first attempt, a new winner may be drawn\./);
  assert.doesNotMatch(t, /claim link|claim page|We notify winners by email|Sunday or Monday/i);
  assert.match(t, /Hoolest devices and BrainMD bottles are picked up at an HBC center \(Nashville or Murfreesboro\)\. They are not shipped\./);
  assert.doesNotMatch(t, /shipped to/i);
  assert.match(t, /\$2,000 or more/);
  assert.match(t, /Accountant to confirm the \$2,000 threshold\./);
  assert.match(t, /Form 1099-MISC/);
  assert.match(t, /Total ARV of all six prizes: \$5,537\.60\./);
  assert.match(t, /Current clients receive a Brain Map gift certificate to give to someone new in place of their own Brain Map\./);
  assert.match(t, /BrainMD supplement bottle: \$44\.95 each/);
  assert.match(t, /Hoolest Mini vagus nerve stimulator: \$99/);
  assert.match(t, /Hoolest VeRelief vagus nerve stimulator: \$199/);
  assert.match(t, /redeemed directly with Skye Chiropractic/);
  assert.match(t, /may gift this session to a woman of their choice/);
  assert.match(t, /valid through TBD/);
  assert.doesNotMatch(t, /\$6,0|\$6,7|\$2,529|\$2,544|\$399|\$429|keychain|pocket|two versions|new or current|prize version/i);
  assert.match(t, /before Mon, Nov 16, 2026, 12:00 PM, you get 1 extra entry/);
  assert.match(t, /up to 10 friends, so 30 extra entries at most/);
  assert.match(t, /scheduled by May 31, 2027/);
  assert.match(t, /by January 31, 2027/);
  assert.match(t, /206 W Chestnut St, Murfreesboro, TN 37130, \(615\) 203-2650/);
  assert.doesNotMatch(t, /template|legal advice/i, "the template line stays out of the public page");
  assert.equal(R.maxEntriesPerPerson(), 33);
});
test("pre-reveal copy never names the gift; the You're-in email teases it, unnamed", () => {
  const t = PAGES.tenYears;
  const lines = [t.giftTeaseHero, t.giftTeaseCard("Sat, Nov 21"), t.og.tease, t.og.description(6, "Nov 16–21"), t.giftComing("7 PM"), t.verifiedEntry(2), t.tapped(true), t.tapped(false), t.notifySent, t.liveSent];
  for (const l of lines) assert.doesNotMatch(l, FORBIDDEN, l);
  for (const l of [t.giftTeaseHero, t.giftTeaseCard("x"), t.og.tease]) assert.doesNotMatch(l, /prize/i, "a gift, never a prize");
  const footing = { identityLine: "HBC", siteUrl: "https://example.test" };
  const yi = E.youreInEmail({ firstName: "Sarah", referredBonus: false, nextDrawing: C.DRAWINGS[0], referralUrl: "https://example.test/10years?ref=X", footing });
  for (const part of [yi.subject, yi.preheader, yi.text, yi.html]) assert.doesNotMatch(part, FORBIDDEN);
  assert.match(yi.text, /thank-you gift for every entrant, revealed by email Sat, Nov 21 at 7 PM/);
});

test("the reveal email names the gift, greets winners and non-winners alike; no scarcity wording", () => {
  const footing = { identityLine: "HBC", siteUrl: "https://example.test", unsubscribeUrl: "https://example.test/u" };
  const base = { firstName: "Sarah", offerCode: "10Y-ABC123", bookUrl: "https://example.test/contact?from=10years&code=10Y-ABC123", footing };
  const a = E.thankYouEmail(base);
  assert.match(a.text, /Whether or not your name was drawn/);
  assert.match(a.text, /Dec 5/);
  assert.match(a.text, /Dec 31/);
  assert.doesNotMatch(a.text, /\bleft\b|limited|claimed|spots/i);
});
