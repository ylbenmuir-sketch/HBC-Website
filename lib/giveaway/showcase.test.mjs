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
