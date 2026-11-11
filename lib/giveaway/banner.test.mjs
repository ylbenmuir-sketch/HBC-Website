/**
 * The site-wide 10-year banner (fix list rev 2, P0-7): the copy flips at
 * Nov 9 00:00, Nov 15 18:00 and Nov 21 17:00 CT and is gone after Dec 5;
 * never on /10years* or /admin*; dismissed for the tab session. The inline
 * <head> script's TEXT is executed here against fake document / location /
 * sessionStorage / clock, and must agree with bannerModeAt everywhere.
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

const B = await import("./banner.ts");
const C = await import("./config.ts");

/** Run the shipped script text with a mocked clock and page; return the attribute it set. */
function runScript(nowMs, path, stored = null, storageThrows = false) {
  const attrs = {};
  const document = { documentElement: { setAttribute: (k, v) => (attrs[k] = v) } };
  const location = { pathname: path };
  const sessionStorage = {
    getItem: (k) => {
      if (storageThrows) throw new Error("blocked");
      return k === B.BANNER_STORAGE_KEY ? stored : null;
    },
  };
  const DateMock = { now: () => nowMs };
  new Function("document", "location", "sessionStorage", "Date", B.bannerScript())(document, location, sessionStorage, DateMock);
  return attrs["data-hbc-banner"];
}

const ct = (y, mo, d, h, mi = 0, s = 0) => C.centralToUtc(y, mo, d, h, mi, s).getTime();
const MOMENTS = [
  ["Nov 8, 11:59:59 PM", ct(2026, 11, 8, 23, 59, 59), "off"],
  ["Nov 9, 12:00 AM", ct(2026, 11, 9, 0, 0), "notify"],
  ["Nov 15, 5:59:59 PM", ct(2026, 11, 15, 17, 59, 59), "notify"],
  ["Nov 15, 6:00 PM", ct(2026, 11, 15, 18, 0), "live"],
  ["Nov 21, 4:59:59 PM", ct(2026, 11, 21, 16, 59, 59), "live"],
  ["Nov 21, 5:00 PM", ct(2026, 11, 21, 17, 0), "closed"],
  ["Dec 5, 11:59:59 PM", ct(2026, 12, 5, 23, 59, 59), "closed"],
  ["Dec 6, 12:00:00 AM", ct(2026, 12, 6, 0, 0, 0), "off"],
  ["Jan 2027", ct(2027, 1, 10, 12), "off"],
];

test("the copy flips on the config clock: Nov 9 00:00, Nov 15 18:00, Nov 21 17:00 CT; gone after Dec 5", () => {
  for (const [label, at, want] of MOMENTS) {
    assert.equal(B.bannerModeAt(at, "/", false), want, `bannerModeAt ${label}`);
    assert.equal(runScript(at, "/"), want, `head script ${label}`);
  }
});

test("never on /10years*, /admin* or /start; on every other page", () => {
  const live = ct(2026, 11, 17, 10);
  for (const p of ["/10years", "/10years/rules", "/10years/verify", "/admin", "/admin/10years/winners", "/start"]) {
    assert.equal(B.bannerModeAt(live, p, false), "off", p);
    assert.equal(runScript(live, p), "off", p);
  }
  for (const p of ["/", "/first-visit", "/contact", "/faq", "/administration-not-a-real-page", "/locations/murfreesboro", "/starting-not-a-real-page"]) {
    assert.equal(B.bannerModeAt(live, p, false), "live", p);
    assert.equal(runScript(live, p), "live", p);
  }
});

test("dismissed for the tab session ('0' in sessionStorage); blocked storage still shows it", () => {
  const notify = ct(2026, 11, 10, 9);
  assert.equal(runScript(notify, "/", "0"), "off");
  assert.equal(B.bannerModeAt(notify, "/", true), "off");
  assert.equal(runScript(notify, "/", null), "notify", "a new session (empty storage) shows it again");
  assert.equal(runScript(notify, "/", null, true), "notify");
});

test("the link carries the campaign tags and the mode", () => {
  assert.equal(B.bannerHref("live"), "/10years?utm_source=site&utm_medium=banner&utm_campaign=hbc10y&utm_content=live");
});

test("the banner copy never mentions the gift or the visit", async () => {
  process.env.GIVEAWAY_HIDE_DRAFT_TAGS = "1";
  const { PAGES } = await import("./copy.ts");
  for (const s of Object.values(PAGES.banner)) assert.doesNotMatch(s, /gift|first visit|free visit|13th/i);
});
