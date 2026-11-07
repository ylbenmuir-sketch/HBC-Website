/**
 * The engine switch and the /10years showcase (Ben, 2026-10-19): off by
 * default; the showcase shows while the engine is off on any date, and
 * with it on only before Nov 9; each ?mode= maps to its stage with a "now"
 * inside that stage; the sample winners are shaped like the real list.
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
delete process.env.GIVEAWAY_ENGINE_ENABLED;
const { giveawayEngineEnabled } = await import("./engine.ts");
const { pageMode, DRAWINGS } = await import("./config.ts");
const S = await import("./showcase.ts");

const ON = { GIVEAWAY_ENGINE_ENABLED: "1" };
const oct = new Date("2026-10-19T16:00:00Z");
const nov10 = new Date("2026-11-10T16:00:00Z");
const dec20 = new Date("2026-12-20T16:00:00Z");

test("the engine is off unless the variable says so", () => {
  assert.equal(giveawayEngineEnabled({}), false);
  assert.equal(giveawayEngineEnabled({ GIVEAWAY_ENGINE_ENABLED: "" }), false);
  assert.equal(giveawayEngineEnabled({ GIVEAWAY_ENGINE_ENABLED: "0" }), false);
  assert.equal(giveawayEngineEnabled({ GIVEAWAY_ENGINE_ENABLED: "false" }), false);
  for (const v of ["1", "true", "on", "yes", " TRUE "]) assert.equal(giveawayEngineEnabled({ GIVEAWAY_ENGINE_ENABLED: v }), true, v);
});

test("engine off → showcase on every date; engine on → showcase only before Nov 9", () => {
  for (const now of [oct, nov10, dec20]) assert.equal(S.showcaseActive(now, {}), true, `off ${now.toISOString()}`);
  assert.equal(S.showcaseActive(oct, ON), true, "on, before Nov 9");
  assert.equal(S.showcaseActive(new Date("2026-11-09T05:59:59Z"), ON), true, "on, the last second before");
  assert.equal(S.showcaseActive(new Date("2026-11-09T06:00:00Z"), ON), false, "on, notify-me opens");
  assert.equal(S.showcaseActive(nov10, ON), false);
  assert.equal(S.showcaseActive(dec20, ON), false);
});

test("?mode= maps to a stage, anything else is notify-me, and each stage's now sits inside it", () => {
  assert.equal(S.showcaseMode(undefined), "notify_me");
  assert.equal(S.showcaseMode(""), "notify_me");
  assert.equal(S.showcaseMode("nonsense"), "notify_me");
  assert.equal(S.showcaseMode("notify"), "notify_me");
  assert.equal(S.showcaseMode("LIVE"), "live");
  assert.equal(S.showcaseMode(["closed", "live"]), "closed");
  assert.equal(S.showcaseMode("thanks"), "thank_you");
  for (const mode of ["notify_me", "live", "closed", "thank_you"]) {
    assert.equal(pageMode(S.showcaseNow(mode)), mode, mode);
    assert.equal(S.showcaseMode(S.showcaseParamFor(mode)), mode, `round trip ${mode}`);
  }
});

test("sample winners: none before the week, the drawn days during it, all six after", () => {
  assert.ok(S.showcaseWinners("notify_me", S.showcaseNow("notify_me")).every((w) => w.state === "pending"));
  const live = S.showcaseWinners("live", S.showcaseNow("live"));
  assert.equal(live.length, DRAWINGS.length);
  assert.deepEqual(
    live.map((w) => w.state),
    ["named", "claimed", "pending", "pending", "pending", "pending"],
    "Wed Nov 18 10 am: Monday named, Tuesday still being reached, Wednesday next"
  );
  assert.ok(live[0].label && live[0].line.includes(live[0].label));
  for (const mode of ["closed", "thank_you"]) {
    const all = S.showcaseWinners(mode, S.showcaseNow(mode));
    assert.ok(all.every((w) => w.state === "named" && w.label), mode);
    assert.equal(new Set(all.map((w) => w.label)).size, DRAWINGS.length, "six different people");
  }
  // No draft marker anywhere: the engine is off in this process.
  assert.ok(live.every((w) => !w.line.includes("[DRAFT]")));
});

test("showcaseFor hands the page one consistent stage", () => {
  const s = S.showcaseFor("closed");
  assert.equal(s.mode, "closed");
  assert.equal(s.param, "closed");
  assert.equal(pageMode(s.now), "closed");
  assert.equal(s.winners.length, DRAWINGS.length);
});

/* ── Fix list rev 2: ?mode= locked in production (P0-3); un-hidden on the clock (P0-6) ── */

test("engine on, before Nov 9: plain /10years is hidden, a ?mode= link is a preview (never on production)", () => {
  const PREVIEW = { ...ON, VERCEL_ENV: "preview" };
  const PROD = { ...ON, VERCEL_ENV: "production" };
  assert.equal(S.showcaseHiddenWithoutParam(undefined, oct, PREVIEW), true);
  assert.equal(S.showcaseHiddenWithoutParam("", oct, PREVIEW), true);
  for (const m of ["notify", "live", "closed", "thanks"]) {
    assert.equal(S.showcaseHiddenWithoutParam(m, oct, PREVIEW), false, m);
    assert.equal(S.showcaseHiddenWithoutParam(m, oct, PROD), true, `production ignores ?mode=${m}`);
  }
  assert.equal(S.showcaseHiddenWithoutParam(undefined, oct, {}), false, "engine off: the showcase, notify-me");
  assert.equal(S.showcaseHiddenWithoutParam(undefined, oct, { VERCEL_ENV: "production" }), false, "engine off on production: unchanged");
  assert.equal(S.showcaseHiddenWithoutParam(undefined, nov10, PREVIEW), false, "from Nov 9 the real page shows");
});

test("?mode= is ignored on the production deployment and honored everywhere else", () => {
  const prod = { VERCEL_ENV: "production" };
  for (const p of ["closed", "live", "thanks", "notify"]) {
    assert.equal(S.showcaseFor(p, prod).mode, "notify_me", `production ?mode=${p}`);
    assert.deepEqual(S.showcaseFor(p, prod), S.showcaseFor(undefined, prod), "same page as no param");
  }
  assert.equal(S.showcaseFor("closed", { VERCEL_ENV: "preview" }).mode, "closed");
  assert.equal(S.showcaseFor("closed", {}).mode, "closed");
});

test("/10years is public (indexable) only with the engine on and the clock at Nov 9", () => {
  const nov8 = new Date("2026-11-09T05:59:00Z");
  const nov9 = new Date("2026-11-09T06:01:00Z");
  assert.equal(S.tenYearsPublic(nov9, {}), false, "engine off: still the hidden showcase");
  assert.equal(S.tenYearsPublic(nov8, ON), false, "before Nov 9");
  assert.equal(S.tenYearsPublic(nov9, ON), true, "Nov 9 00:01 CT");
  assert.equal(S.tenYearsPublic(dec20, ON), true);
});


test("GIVEAWAY_FAKE_NOW pins the clock in a testing env only", async () => {
  const { giveawayNow } = await import("./clock.ts");
  const at = "2026-11-17T16:00:00.000Z";
  assert.equal(giveawayNow({ GIVEAWAY_ENV: "test", GIVEAWAY_FAKE_NOW: at }).toISOString(), at);
  assert.notEqual(giveawayNow({ GIVEAWAY_ENV: "production", GIVEAWAY_FAKE_NOW: at }).toISOString(), at);
  assert.notEqual(giveawayNow({ VERCEL_ENV: "production", GIVEAWAY_FAKE_NOW: at }).toISOString(), at);
  assert.notEqual(giveawayNow({ VERCEL_ENV: "preview", GIVEAWAY_FAKE_NOW: at }).toISOString(), at, "a preview's giveaway env is 'preview' unless GIVEAWAY_ENV=test");
  assert.notEqual(giveawayNow({ GIVEAWAY_ENV: "test", GIVEAWAY_FAKE_NOW: "garbage" }).toISOString(), at);
});
