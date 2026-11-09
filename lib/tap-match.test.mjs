// Unit tests for lib/tap-match.ts: first inbound event in the 0–3 minute
// window, one event per tap, the earliest tap wins, answered and talk-time
// buckets for calls, the 24-hour reply for texts (null until the window has
// passed), pending while the window is open, "other" lines never match —
// and nothing but ids and verdicts in a decision.
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

const { durationBucket, matchTaps } = await import("./tap-match.ts");
const { callEvents, textEvents } = await import("./phone-stats.ts");

const T0 = Date.parse("2026-11-10T15:00:00Z");
const min = (n) => n * 60_000;
const NASH = "+16153318762";
const BORO = "+16152032650";
const at = (ms) => String(ms);

const call = (id, ts, over = {}) => ({
  id,
  ts,
  center: "nashville",
  direction: "inbound",
  external: "6155550101",
  answered: true,
  talkMs: 150_000,
  ...over,
});
const text = (id, ts, over = {}) => ({ id, ts, center: "nashville", direction: "inbound", external: "6155550102", ...over });

test("duration buckets", () => {
  assert.equal(durationBucket(null), null);
  assert.equal(durationBucket(0), "<30s");
  assert.equal(durationBucket(29_999), "<30s");
  assert.equal(durationBucket(30_000), "30s-2m");
  assert.equal(durationBucket(120_000), "30s-2m");
  assert.equal(durationBucket(120_001), ">2m");
});

test("a phone tap matches the first inbound call to its center's line within three minutes", () => {
  const taps = [{ id: "t1", ts: T0, link_type: "phone", center: "nashville" }];
  const calls = [
    call("before", T0 - 1000),
    call("boro", T0 + min(1), { center: "murfreesboro" }),
    call("outbound", T0 + min(1), { direction: "outbound" }),
    call("hit", T0 + min(2), { answered: true, talkMs: 200_000 }),
    call("later", T0 + min(2.5)),
    call("late", T0 + min(3) + 1),
  ];
  const [d] = matchTaps({ taps, calls, texts: [], now: T0 + min(10) });
  assert.deepEqual(d, {
    id: "t1",
    match_status: "matched",
    dialpad_event_id: "hit",
    answered: true,
    duration_bucket: ">2m",
    replied_within_24h: null,
    reply_checked_at: null,
  });
});

test("each call matches at most one tap; the earliest tap takes it; a missed call has no bucket", () => {
  const taps = [
    { id: "second", ts: T0 + min(1), link_type: "phone", center: "nashville" },
    { id: "first", ts: T0, link_type: "phone", center: "nashville" },
  ];
  const calls = [call("c1", T0 + min(1.5), { answered: false, talkMs: null })];
  const got = Object.fromEntries(matchTaps({ taps, calls, texts: [], now: T0 + min(10) }).map((d) => [d.id, d]));
  assert.equal(got.first.match_status, "matched");
  assert.equal(got.first.answered, false);
  assert.equal(got.first.duration_bucket, null);
  assert.equal(got.second.match_status, "unmatched");
  assert.equal(got.second.dialpad_event_id, null);
  // An event already matched on an earlier run (seeded) is not reused.
  const again = matchTaps({ taps: [taps[1]], calls, texts: [], now: T0 + min(10), used: ["c1"] });
  assert.equal(again[0].match_status, "unmatched");
});

test("a tap whose window is still open stays pending; an 'other' line never matches", () => {
  const taps = [
    { id: "open", ts: T0, link_type: "phone", center: "nashville" },
    { id: "other", ts: T0 - min(10), link_type: "phone", center: "other" },
  ];
  const got = matchTaps({ taps, calls: [call("c", T0 + min(1)), call("o", T0 - min(9), { center: "other" })], texts: [], now: T0 + min(2) });
  assert.deepEqual(got.map((d) => [d.id, d.match_status]), [["other", "unmatched"]]);
  // A tap already decided is left alone.
  const decided = matchTaps({ taps: [{ ...taps[0], match_status: "unmatched" }], calls: [call("c", T0 + min(1))], texts: [], now: T0 + min(10) });
  assert.equal(decided.length, 0);
});

test("a text tap: the first inbound text; the reply is decided only after 24 hours", () => {
  const taps = [{ id: "t", ts: T0, link_type: "text", center: "nashville" }];
  const texts = [
    text("in", T0 + min(1)),
    text("reply", T0 + min(40), { direction: "outbound" }),
    text("someone-else", T0 + min(50), { direction: "outbound", external: "6155550199" }),
  ];
  const soon = matchTaps({ taps, calls: [], texts, now: T0 + min(60) });
  assert.equal(soon[0].match_status, "matched");
  assert.equal(soon[0].dialpad_event_id, "in");
  assert.equal(soon[0].replied_within_24h, null);
  assert.equal(soon[0].reply_checked_at, null);
  const later = matchTaps({ taps, calls: [], texts, now: T0 + 25 * 3_600_000 });
  assert.equal(later[0].replied_within_24h, true);
  assert.equal(typeof later[0].reply_checked_at, "string");
  // No reply to that number → false; a reply to another number does not count.
  const none = matchTaps({ taps, calls: [], texts: [texts[0], texts[2]], now: T0 + 25 * 3_600_000 });
  assert.equal(none[0].replied_within_24h, false);
});

test("a matched text with an unknown reply is re-checked once the 24 hours have passed", () => {
  const taps = [{ id: "t", ts: T0, link_type: "text", center: "nashville", match_status: "matched", dialpad_event_id: "in", replied_within_24h: null }];
  const texts = [text("in", T0 + min(1)), text("reply", T0 + 3 * 3_600_000, { direction: "outbound" })];
  assert.equal(matchTaps({ taps, calls: [], texts, now: T0 + min(90) }).length, 0);
  const [d] = matchTaps({ taps, calls: [], texts, now: T0 + 25 * 3_600_000 });
  assert.equal(d.replied_within_24h, true);
  assert.equal(d.dialpad_event_id, "in");
});

test("end to end from Dialpad records: numbers are used to match and never appear in a decision", () => {
  const records = [
    { call_id: "1", direction: "inbound", date_started: at(T0 + min(1)), date_connected: at(T0 + min(1) + 5000), date_ended: at(T0 + min(1) + 95_000), internal_number: NASH, external_number: "+16155550101" },
    { call_id: "2", direction: "inbound", date_started: at(T0 + min(2)), internal_number: BORO, external_number: "+16155550102" },
  ];
  const csv = [
    { date: "2026-11-10 09:02:00", message_id: "m1", direction: "external", from_phone: "+16155550103", to_phone: BORO },
    { date: "2026-11-10 09:30:00", message_id: "m2", direction: "internal", from_phone: BORO, to_phone: "+16155550103" },
  ];
  const calls = callEvents(records);
  const texts = textEvents(csv);
  assert.equal(calls[0].talkMs, 90_000);
  const taps = [
    { id: "p-nash", ts: T0, link_type: "phone", center: "nashville" },
    { id: "p-boro", ts: T0, link_type: "phone", center: "murfreesboro" },
    { id: "t-boro", ts: Date.parse("2026-11-10T15:00:00Z"), link_type: "text", center: "murfreesboro" }, // 9:00 CST
  ];
  const got = matchTaps({ taps, calls, texts, now: T0 + 25 * 3_600_000 });
  const by = Object.fromEntries(got.map((d) => [d.id, d]));
  assert.equal(by["p-nash"].duration_bucket, "30s-2m");
  assert.equal(by["p-boro"].answered, false);
  assert.equal(by["t-boro"].match_status, "matched");
  assert.equal(by["t-boro"].replied_within_24h, true);
  assert.doesNotMatch(JSON.stringify(got), /615|550|0101|0102|0103/);
});
