// Unit tests for lib/phone-stats.ts: the range rules, Chicago days across
// DST, call grouping and counting, text counting, and the privacy rule —
// records full of phone numbers, names and message text go in, and nothing
// but counts, dates, centers and the fixed notes comes out.
// Run: npm test   (plain `node --test`; Node strips the types from the .ts)

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CENTERS,
  NOTE,
  ROW_FIELDS,
  buildResponse,
  countCalls,
  countTexts,
  dayStartMs,
  exportTexts,
  fetchDays,
  fillNote,
  parseCsv,
  parseRange,
} from "./phone-stats.ts";

const NASH = "+16153318762";
const NASH_DEPT = "+16152378417";
const BORO = "+16152032650";
const at = (iso) => String(Date.parse(iso)); // Dialpad stamps: ms as strings

test("range: inclusive, at most 120 days, nothing after today", () => {
  const today = "2026-11-02";
  assert.deepEqual(parseRange("2026-10-30", "2026-11-01", today), {
    ok: true,
    days: ["2026-10-30", "2026-10-31", "2026-11-01"],
  });
  assert.equal(parseRange("2026-11-02", "2026-11-02", today).ok, true);
  assert.equal(parseRange(null, "2026-11-01", today).ok, false);
  assert.equal(parseRange("2026-02-30", "2026-03-01", today).ok, false);
  assert.equal(parseRange("2026-11-01", "2026-10-01", today).ok, false);
  assert.equal(parseRange("2026-11-01", "2026-11-03", today).ok, false);
  assert.equal(parseRange("2026-07-06", "2026-11-02", today).ok, true); // 120 days
  assert.equal(parseRange("2026-07-05", "2026-11-02", today).ok, false); // 121
});

test("Chicago midnight across both DST changes", () => {
  assert.equal(new Date(dayStartMs("2026-03-08")).toISOString(), "2026-03-08T06:00:00.000Z"); // CST
  assert.equal(new Date(dayStartMs("2026-03-09")).toISOString(), "2026-03-09T05:00:00.000Z"); // CDT
  assert.equal(new Date(dayStartMs("2026-11-01")).toISOString(), "2026-11-01T05:00:00.000Z"); // CDT
  assert.equal(new Date(dayStartMs("2026-11-02")).toISOString(), "2026-11-02T06:00:00.000Z"); // CST
});

test("calls: legs and the main-line hand-off fold into one call; answered across the group", () => {
  const records = [
    // Nashville: the main line's hand-off (missed on its own) and the
    // department's record of the same call, answered on a child leg.
    { call_id: "1", direction: "inbound", date_started: at("2026-10-28T15:00:00Z"), internal_number: NASH, external_number: "+16155550101" },
    { call_id: "2", master_call_id: "1", direction: "inbound", date_started: at("2026-10-28T15:00:02Z"), internal_number: NASH_DEPT, external_number: "+16155550101" },
    { call_id: "3", entry_point_call_id: "2", direction: "inbound", date_started: at("2026-10-28T15:00:03Z"), date_connected: at("2026-10-28T15:00:09Z"), internal_number: NASH_DEPT, external_number: "+16155550101" },
    // Nashville: to voicemail — connected, but not by a person.
    { call_id: "4", direction: "inbound", date_started: at("2026-10-28T16:00:00Z"), date_connected: at("2026-10-28T16:00:20Z"), voicemail_link: "https://example.test/vm", internal_number: NASH, external_number: "+16155550102" },
    // Same caller again, missed: two calls, one unique caller among them.
    { call_id: "5", direction: "inbound", date_started: at("2026-10-28T17:00:00Z"), internal_number: NASH, external_number: "+16155550102" },
    // Murfreesboro outbound.
    { call_id: "6", direction: "outbound", date_started: at("2026-10-28T18:00:00Z"), internal_number: BORO, external_number: "+16155550103" },
    // Desk to desk: not a client call.
    { call_id: "7", direction: "inbound", date_started: at("2026-10-28T19:00:00Z"), internal_number: BORO, external_number: NASH },
    // A staff direct line: "other".
    { call_id: "8", direction: "inbound", date_started: at("2026-10-28T20:00:00Z"), date_connected: at("2026-10-28T20:00:05Z"), internal_number: "+16155559999", external_number: "+16155550104" },
    // 11:30pm Oct 28 Chicago = Oct 29 04:30Z: still Oct 28.
    { call_id: "9", direction: "inbound", date_started: at("2026-10-29T04:30:00Z"), internal_number: BORO, external_number: "+16155550105" },
    // Outside the range.
    { call_id: "10", direction: "inbound", date_started: at("2026-10-30T15:00:00Z"), internal_number: BORO, external_number: "+16155550106" },
  ];
  const got = countCalls(records, ["2026-10-28"]);
  assert.deepEqual(got.get("2026-10-28|nashville"), {
    calls_inbound: 3,
    calls_inbound_answered: 1,
    calls_inbound_missed: 2,
    calls_outbound: 0,
    unique_inbound_callers: 2,
  });
  assert.deepEqual(got.get("2026-10-28|murfreesboro"), {
    calls_inbound: 1,
    calls_inbound_answered: 0,
    calls_inbound_missed: 1,
    calls_outbound: 1,
    unique_inbound_callers: 1,
  });
  assert.deepEqual(got.get("2026-10-28|other"), {
    calls_inbound: 1,
    calls_inbound_answered: 1,
    calls_inbound_missed: 0,
    calls_outbound: 0,
    unique_inbound_callers: 1,
  });
  assert.equal(got.size, 3);
});

test("texts: direction and center from the clinic side, Dialpad's label for other lines", () => {
  const rows = [
    { date: "2026-10-28 10:01:25.17", message_id: "a", direction: "external", from_phone: "+16155550101", to_phone: NASH },
    { date: "2026-10-28 10:02:25.17", message_id: "b", direction: "internal", from_phone: NASH, to_phone: "+16155550101" },
    { date: "2026-10-28 10:02:25.17", message_id: "b", direction: "internal", from_phone: NASH, to_phone: "+16155550101" }, // duplicate
    { date: "2026-10-28 11:00:00", message_id: "c", direction: "internal", from_phone: BORO, to_phone: "+16155550102" },
    { date: "2026-10-28 12:00:00", message_id: "d", direction: "external", from_phone: "+16155550103", to_phone: "+16155559999" },
    { date: "2026-10-28 12:30:00", message_id: "e", direction: "internal", from_phone: NASH, to_phone: BORO }, // desk to desk
    { date: "2026-10-27 23:59:59", message_id: "f", direction: "external", from_phone: "+16155550104", to_phone: BORO }, // other day
  ];
  const got = countTexts(rows, ["2026-10-28"]);
  assert.deepEqual(got.get("2026-10-28|nashville"), { texts_inbound: 1, texts_outbound: 1 });
  assert.deepEqual(got.get("2026-10-28|murfreesboro"), { texts_inbound: 0, texts_outbound: 1 });
  assert.deepEqual(got.get("2026-10-28|other"), { texts_inbound: 1, texts_outbound: 0 });
});

test("CSV: quoted commas, quotes and newlines; only the kept columns survive", () => {
  const csv = 'date,name,text,from_phone\r\n2026-10-28 10:00:00,"Doe, Jane","hi ""there""\nsecond line",+16155550101\n';
  assert.deepEqual(parseCsv(csv, ["date", "from_phone", "missing"]), [
    { date: "2026-10-28 10:00:00", from_phone: "+16155550101", missing: "" },
  ]);
});

/* --- a stand-in Dialpad ---------------------------------------------------- */

const PII = {
  numbers: ["+16155550101", "6155550199", "(615) 555-0142", "+16155550177"],
  names: ["Jane Q. Client", "Robert Tables"],
  text: "My son has a seizure history, call me back at 615-555-0142",
  ids: ["5551234567890123", "9876543210987654"],
  urls: ["https://dialpad.example/recording/secret-recording-id", "https://dialpad.example/vm/abc"],
};

function stubDialpad({ textsStatus = 200, callsStatus = 200 } = {}) {
  const calls = [
    {
      call_id: PII.ids[0],
      direction: "inbound",
      state: "hangup",
      date_started: at("2026-10-28T15:00:00Z"),
      date_connected: at("2026-10-28T15:00:09Z"),
      internal_number: NASH,
      external_number: PII.numbers[0],
      contact: { id: PII.ids[1], name: PII.names[0], phone: PII.numbers[0], email: "jane@example.test" },
      target: { id: "123", name: "Nashville Office", phone: NASH },
      recording_details: [{ url: PII.urls[0] }],
      transcription_text: PII.text,
      voicemail_link: null,
      labels: [PII.text],
    },
    {
      call_id: PII.ids[1],
      direction: "inbound",
      state: "voicemail",
      date_started: at("2026-10-28T16:00:00Z"),
      internal_number: BORO,
      external_number: PII.numbers[2],
      contact: { name: PII.names[1], phone: PII.numbers[2] },
      voicemail_link: PII.urls[1],
      transcription_text: PII.text,
    },
  ];
  const csv =
    "date,message_id,name,email,target_type,target_id,sender_id,direction,to_phone,from_phone,mms,timezone,encrypted_text\n" +
    `2026-10-28 10:01:25.175953,${PII.ids[0]},${PII.names[0]},jane@example.test,office,1,2,external,${NASH},${PII.numbers[1]},false,America/Chicago,"${PII.text}"\n` +
    `2026-10-28 10:05:00.000000,${PII.ids[1]},${PII.names[1]},bob@example.test,office,1,2,internal,${PII.numbers[3]},${BORO},false,America/Chicago,"${PII.text}"\n`;

  const seen = [];
  const fetch = async (url, init = {}) => {
    seen.push({ url, auth: init.headers?.Authorization ?? null });
    const json = (body, status = 200) =>
      new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
    if (url.startsWith("https://dialpad.com/api/v2/call?")) {
      return callsStatus === 200 ? json({ items: calls, cursor: null }) : json({ error: PII.numbers[0] }, callsStatus);
    }
    if (url === "https://dialpad.com/api/v2/stats") {
      return textsStatus === 200 ? json({ request_id: "req1" }) : json({ error: PII.text }, textsStatus);
    }
    if (url === "https://dialpad.com/api/v2/stats/req1") {
      return json({ status: "complete", download_url: "https://storage.example/signed.csv" });
    }
    if (url === "https://storage.example/signed.csv") return new Response(csv);
    return new Response("not found", { status: 404 });
  };
  let t = 0;
  const opts = { apiKey: "test-key", fetch, sleep: async () => {}, now: () => (t += 1000) };
  return { opts, seen };
}

/** Every number, name, id, url and message in the stand-in, and every
 *  digit-only form of the numbers. */
function forbidden() {
  const out = [...PII.names, PII.text, ...PII.ids, ...PII.urls, "jane@example.test", "bob@example.test", "seizure"];
  for (const n of PII.numbers) {
    out.push(n, n.replace(/\D/g, ""), n.replace(/\D/g, "").slice(-10), n.replace(/\D/g, "").slice(-7));
  }
  return out;
}

const NOTE_PATTERNS = Object.values(NOTE).map(
  (n) => new RegExp("^" + n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace("\\{days\\}", "\\d{4}-\\d{2}-\\d{2}(, \\d{4}-\\d{2}-\\d{2})*") + "$")
);

function assertCountsOnly(response) {
  const body = JSON.stringify(response);
  for (const s of forbidden()) assert.ok(!body.includes(s), `response leaked ${JSON.stringify(s)}`);

  assert.deepEqual(Object.keys(response).sort(), ["from", "generated_at", "notes", "rows", "timezone", "to"]);
  assert.match(response.generated_at, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  assert.equal(response.timezone, "America/Chicago");
  assert.match(response.from, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(response.to, /^\d{4}-\d{2}-\d{2}$/);

  for (const row of response.rows) {
    assert.deepEqual(Object.keys(row), [...ROW_FIELDS]);
    assert.match(row.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(CENTERS.includes(row.center));
    for (const f of ROW_FIELDS.slice(2)) {
      const v = row[f];
      assert.ok(v === null || (Number.isInteger(v) && v >= 0 && v < 1e6), `${f}=${v} is not a count`);
    }
  }
  // Free text can only be one of the fixed notes, with dates filled in.
  for (const n of response.notes) {
    assert.ok(NOTE_PATTERNS.some((p) => p.test(n)), `note is not a fixed template: ${n}`);
    assert.ok(!/\d{7,}/.test(n.replace(/\d{4}-\d{2}-\d{2}/g, "")), "note holds a digit run");
  }
}

test("PRIVACY: records full of numbers, names and message text come out as counts only", async () => {
  const { opts } = stubDialpad();
  const days = ["2026-10-28"];
  const got = await fetchDays(opts, days, "2026-11-02");
  assert.equal(got.calls, "ok");
  assert.equal(got.texts, "ok");

  const nash = got.rows.find((r) => r.center === "nashville");
  const boro = got.rows.find((r) => r.center === "murfreesboro");
  assert.equal(nash.calls_inbound_answered, 1);
  assert.equal(nash.texts_inbound, 1);
  assert.equal(boro.calls_inbound_missed, 1); // voicemail
  assert.equal(boro.texts_outbound, 1);

  // A row that picked up an extra property cannot carry it out.
  got.rows[0].external_number = PII.numbers[0];
  got.rows[0].calls_outbound = PII.numbers[0];
  const response = buildResponse({
    days,
    rows: got.rows,
    notes: [NOTE.definitions, NOTE.firstTime, fillNote(NOTE.today, ["2026-11-02"])],
    now: new Date("2026-11-02T15:00:00Z"),
  });
  assertCountsOnly(response);
  assert.equal(response.rows[0].calls_outbound, null);
});

test("PRIVACY: a refused text export nulls texts, names the scope, and keeps Dialpad's error body out", async () => {
  const { opts } = stubDialpad({ textsStatus: 403 });
  const got = await fetchDays(opts, ["2026-10-28"], "2026-11-02");
  assert.equal(got.texts, "scope");
  assert.ok(got.rows.every((r) => r.texts_inbound === null && r.texts_outbound === null));
  assert.ok(got.rows.some((r) => r.calls_inbound > 0));
  const response = buildResponse({
    days: ["2026-10-28"],
    rows: got.rows,
    notes: [NOTE.definitions, NOTE.firstTime, NOTE.textsScope],
    now: new Date(),
  });
  assertCountsOnly(response);
  assert.match(response.notes.join(" "), /message_content_export:all/);
});

test("text export: asks for Chicago days counted back from today; the signed download gets no key", async () => {
  const { opts, seen } = stubDialpad();
  const posted = [];
  const fetch = opts.fetch;
  opts.fetch = async (url, init = {}) => {
    if (init.body) posted.push(JSON.parse(init.body));
    return fetch(url, init);
  };
  const r = await exportTexts(opts, "2026-10-19", "2026-11-01", "2026-11-02");
  assert.equal(r.ok, true);
  assert.deepEqual(posted[0], {
    export_type: "records",
    stat_type: "texts",
    days_ago_start: 1,
    days_ago_end: 14,
    timezone: "America/Chicago",
  });
  assert.equal(seen.find((s) => s.url.startsWith("https://storage.example/")).auth, null);
  assert.equal(seen.find((s) => s.url === "https://dialpad.com/api/v2/stats").auth, "Bearer test-key");
  // Only the five columns this reads are kept.
  assert.deepEqual(Object.keys(r.rows[0]).sort(), ["date", "direction", "from_phone", "message_id", "to_phone"]);
});

test("a rejected key nulls calls and texts and says so, not 'add the texts scope'", async () => {
  const { opts } = stubDialpad({ textsStatus: 401, callsStatus: 401 });
  const got = await fetchDays(opts, ["2026-10-28"], "2026-11-02");
  assert.equal(got.calls, "rejected");
  assert.equal(got.texts, "failed");
  assert.ok(got.rows.every((r) => r.calls_inbound === null && r.texts_inbound === null && r.unique_inbound_callers === null));
  assertCountsOnly(
    buildResponse({ days: ["2026-10-28"], rows: got.rows, notes: [fillNote(NOTE.keyRejected, ["2026-10-28"])], now: new Date() })
  );
});
