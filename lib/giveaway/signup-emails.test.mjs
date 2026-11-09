/**
 * The two emails a form submit sends (Ben, 2026-11-09): "You're on the list" (a reminder,
 * not an entry) and "You're in" (the entry). Both carry the one-click unsubscribe; only the
 * entry email says "entered". And production links never point at a vercel.app preview.
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
const E = await import("./emails.ts");
const C = await import("./config.ts");
const S = await import("./send.ts");

const footing = { identityLine: "Harmonized Brain Centers · Nashville, TN", siteUrl: "https://harmonizedbraincenterstn.com", unsubscribeUrl: "https://harmonizedbraincenterstn.com/unsubscribe?t=X" };

test("You're on the list: reminder wording, the new small line, the unsubscribe link (HTML and text)", () => {
  const m = E.notifyOnListEmail({ firstName: "Ann", pageUrl: "https://harmonizedbraincenterstn.com/10years", footing });
  for (const body of [m.text, m.html]) {
    assert.match(body, /You(?:'|&#39;|&#x27;)re getting this because you asked for a reminder about the 10-year giveaway at/);
    assert.doesNotMatch(body, /because you entered/);
    assert.match(body, /Didn(?:'|&#39;|&#x27;)t sign up\? Ignore this email or unsubscribe below\./);
    assert.doesNotMatch(body, /Every reminder after it/);
    assert.match(body, /harmonizedbraincenterstn\.com\/unsubscribe\?t=X/);
  }
});

test("You're in: keeps the 'entered' wording and carries the unsubscribe link", () => {
  const m = E.youreInEmail({ firstName: "Ann", referredBonus: false, nextDrawing: C.DRAWINGS[0], referralUrl: "https://harmonizedbraincenterstn.com/10years?ref=HBC-AAAAAA", footing });
  assert.match(m.text, /because you entered the 10-year giveaway at/);
  assert.doesNotMatch(m.text, /asked for a reminder/);
  assert.match(m.text, /unsubscribe\?t=X/);
});

test("siteUrl: production never uses a vercel.app address; previews keep theirs", () => {
  assert.equal(S.siteUrl({ VERCEL_ENV: "production", GIVEAWAY_SITE_URL: "https://hbc-website-git-x-team.vercel.app" }), "https://harmonizedbraincenterstn.com");
  assert.equal(S.siteUrl({ VERCEL_ENV: "production", GIVEAWAY_SITE_URL: "https://harmonizedbraincenterstn.com/" }), "https://harmonizedbraincenterstn.com");
  assert.equal(S.siteUrl({ VERCEL_ENV: "preview", GIVEAWAY_SITE_URL: "https://hbc-website-git-x-team.vercel.app" }), "https://hbc-website-git-x-team.vercel.app");
});
