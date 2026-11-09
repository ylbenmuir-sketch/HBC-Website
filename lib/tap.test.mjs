// Unit tests for lib/tap.ts and lib/tap-stats.ts: a tap payload carries four
// fixed-list fields and a path and nothing else; the center is read from the
// line without the number leaving; bots and /admin are refused; the counts
// are integers keyed by fixed strings.
// Run: npm test   (plain `node --test`; Node strips the types from the .ts)

import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

// lib/tap.ts reaches lib/locations.ts and lib/analytics.ts, which import
// extensionless siblings; Node's type stripping needs the `.ts` added (the
// giveaway tests' resolver).
registerHooks({
  resolve(spec, ctx, next) {
    const local = !ctx.parentURL?.includes("/node_modules/");
    if (local && spec.startsWith(".") && !/\.(ts|tsx|js|mjs|cjs|json)$/.test(spec)) return next(`${spec}.ts`, ctx);
    return next(spec, ctx);
  },
});

const { TAP_CENTERS, deviceClass, isBotUserAgent, parseTapBody, tapCenter, tapIgnoredPath, tapLoggingEnabled, tapPayload } =
  await import("./tap.ts");
const { TAP_FIELDS, countTaps } = await import("./tap-stats.ts");

test("the center is read from the line: both centers' numbers, any format", () => {
  assert.equal(tapCenter("tel:+16153318762"), "nashville");
  assert.equal(tapCenter("sms:+16152032650"), "murfreesboro");
  assert.equal(tapCenter("tel:(615) 203-2650"), "murfreesboro");
  assert.equal(tapCenter("sms:+16152032650?body=hi"), "murfreesboro");
  assert.equal(tapCenter("tel:+16155550100"), "other");
  for (const c of TAP_CENTERS) assert.match(c, /^[a-z]+$/);
});

test("the payload: scheme → link type, location from the list, path without the query", () => {
  assert.deepEqual(tapPayload("tel:+16153318762", "mobile_bar", "/concerns/sleep?utm=jane@example.test"), {
    link_type: "phone",
    location: "mobile_bar",
    center: "nashville",
    page_path: "/concerns/sleep",
  });
  assert.equal(tapPayload("sms:+16152032650", "location_hero", "/locations/murfreesboro").link_type, "text");
  assert.equal(tapPayload("tel:+1", "jane@example.test", "/").location, "other");
  assert.equal(tapPayload("mailto:jane@example.test", "footer", "/"), null);
  assert.equal(tapPayload("https://example.test", "footer", "/"), null);
  // Only these four keys, and never the number.
  const p = tapPayload("tel:+16153318762", "header", "/");
  assert.deepEqual(Object.keys(p).sort(), ["center", "link_type", "location", "page_path"]);
  assert.doesNotMatch(JSON.stringify(p), /331|8762/);
});

test("the route accepts a body only when every field is on its list", () => {
  assert.deepEqual(parseTapBody({ link_type: "phone", location: "footer", center: "nashville", page_path: "/about" }), {
    link_type: "phone",
    location: "footer",
    center: "nashville",
    page_path: "/about",
  });
  assert.equal(parseTapBody({ link_type: "email", location: "footer", center: "nashville", page_path: "/" }), null);
  assert.equal(parseTapBody({ link_type: "phone", location: "sidebar", center: "nashville", page_path: "/" }), null);
  assert.equal(parseTapBody({ link_type: "phone", location: "footer", center: "franklin", page_path: "/" }), null);
  assert.equal(parseTapBody({ link_type: "phone", location: "footer", center: "nashville", page_path: "about" }), null);
  assert.equal(parseTapBody({ link_type: "phone", location: "footer", center: "nashville", page_path: "/a?x=1", ip: "1.2.3.4" }).page_path, "/a");
  assert.equal(parseTapBody("tel:+1"), null);
  assert.equal(parseTapBody(null), null);
});

test("bots, an empty user agent and /admin are refused; the device is a class", () => {
  assert.equal(isBotUserAgent("Mozilla/5.0 (compatible; Googlebot/2.1)"), true);
  assert.equal(isBotUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1"), false);
  assert.equal(isBotUserAgent(""), true);
  assert.equal(isBotUserAgent(undefined), true);
  assert.equal(isBotUserAgent("HeadlessChrome/120"), true);
  assert.equal(tapIgnoredPath("/admin/10years"), true);
  assert.equal(tapIgnoredPath("/administration"), false);
  assert.equal(deviceClass("anything", "?1"), "mobile");
  assert.equal(deviceClass("Mozilla/5.0 (iPhone) Mobile Safari", undefined), "mobile");
  assert.equal(deviceClass("Mozilla/5.0 (Macintosh; Intel Mac OS X) Safari", undefined), "desktop");
});

test("logging is on for the Production deployment, or when TAP_LOG says so", () => {
  assert.equal(tapLoggingEnabled({ VERCEL_ENV: "production" }), true);
  assert.equal(tapLoggingEnabled({ VERCEL_ENV: "preview" }), false);
  assert.equal(tapLoggingEnabled({}), false);
  assert.equal(tapLoggingEnabled({ TAP_LOG: "on" }), true);
  assert.equal(tapLoggingEnabled({ VERCEL_ENV: "production", TAP_LOG: "off" }), false);
});

test("counts per day per center, with the same seven per location", () => {
  const row = (over) => ({
    ts: "2026-11-10T15:00:00Z",
    center: "nashville",
    link_type: "phone",
    location: "mobile_bar",
    match_status: "matched",
    answered: true,
    duration_bucket: ">2m",
    replied_within_24h: null,
    ...over,
  });
  const rows = [
    row({}),
    row({ answered: true, duration_bucket: "30s-2m", location: "header" }),
    row({ answered: false, duration_bucket: null }),
    row({ match_status: "unmatched", answered: null, duration_bucket: null }),
    row({ link_type: "text", answered: null, duration_bucket: null, replied_within_24h: true }),
    row({ link_type: "text", answered: null, duration_bucket: null, replied_within_24h: false, location: "location_hero" }),
    row({ link_type: "text", match_status: "pending", answered: null, duration_bucket: null }),
    row({ center: "murfreesboro", location: "sidebar" }),
    // 11:30pm Nov 10 Chicago = Nov 11 05:30Z: still Nov 10.
    row({ ts: "2026-11-11T05:30:00Z", match_status: "unmatched", answered: null, duration_bucket: null }),
    row({ ts: "2026-11-12T15:00:00Z" }), // outside the range
    row({ center: "franklin" }), // not a center on the list
  ];
  const got = countTaps(rows, ["2026-11-10"], ["nashville", "murfreesboro", "other"]);
  const nash = got.get("2026-11-10|nashville");
  assert.deepEqual(
    Object.fromEntries(TAP_FIELDS.map((f) => [f, nash[f]])),
    {
      taps_phone: 5,
      taps_text: 3,
      taps_phone_matched: 3,
      taps_phone_matched_answered: 2,
      taps_phone_matched_2min_plus: 1,
      taps_text_matched: 2,
      taps_text_matched_replied: 1,
    },
  );
  assert.equal(nash.by_location.mobile_bar.taps_phone, 4);
  assert.equal(nash.by_location.header.taps_phone_matched_answered, 1);
  assert.equal(nash.by_location.location_hero.taps_text_matched, 1);
  const boro = got.get("2026-11-10|murfreesboro");
  assert.equal(boro.taps_phone, 1);
  // An unknown location is counted under "other", never passed through.
  assert.equal(boro.by_location.other.taps_phone, 1);
  assert.equal("sidebar" in boro.by_location, false);
  assert.equal(got.has("2026-11-10|franklin"), false);
  assert.equal(got.size, 2);
  assert.doesNotMatch(JSON.stringify([...got.values()]), /615|jane/);
});
