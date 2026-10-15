// Unit tests for the held staff notification (lib/held-notification.ts):
// one staff email per form lead — on a page-two save, on Skip, or after two
// minutes — never twice, retried when it fails, and never held at all when
// the release job cannot run. The database is an in-memory table with the
// same claim rule as the real conditional UPDATE; the sender is a stub.
// Nothing is sent. Run: npm test
//
// lib/ imports are extensionless; the hook appends ".ts" for local
// specifiers (the same trick as lib/email.test.mjs).

import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

registerHooks({
  resolve(spec, ctx, next) {
    // next has no "exports" map; plain ESM needs the file name.
    if (spec === "next/server") return next("next/server.js", ctx);
    const local = !ctx.parentURL?.includes("/node_modules/");
    if (local && spec.startsWith(".") && !/\.(ts|tsx|js|mjs|cjs|json)$/.test(spec)) {
      return next(`${spec}.ts`, ctx);
    }
    return next(spec, ctx);
  },
});

const H = await import("./held-notification.ts");

const quiet = { log() {}, error() {} };
const T0 = new Date("2026-10-15T15:00:00Z");
const at = (seconds) => new Date(T0.getTime() + seconds * 1000);
const RECIPIENTS = { route: "nashville", envVar: "LEADS_NASHVILLE", to: "denise@example.test", cc: [], warnings: [] };

/* ── an in-memory consultation_requests ─────────────────────────────── */

function memoryStore() {
  const rows = new Map();
  const beats = new Map();
  const store = {
    rows,
    beats,
    insert(id, fields = {}) {
      rows.set(id, {
        id, created_at: T0.toISOString(), first_name: "Sarah Mitchell", phone: "6155550134",
        email: "sarah@example.test", preferred_center: "Nashville", best_time: "Any time",
        helping_who: null, concerns: [], note: null, referred_by: null, source_page: "/contact",
        sms_consent: false, notify_route: null, notify_env: null, notify_to: null, notify_cc: null,
        notify_hold_state: null, notify_held_until: null, notify_hold_env: null, notify_claimed_at: null,
        notify_attempts: 0, notify_failures: [], notify_status: null, notify_released_by: null,
        notify_had_details: null, ...fields,
      });
    },
    /** The page-two PATCH's own UPDATE: the details, then the row as it is. */
    saveDetails(id, details) {
      const r = rows.get(id);
      Object.assign(r, details);
      return r.notify_hold_state;
    },
    async hold(id, { until, env, recipients }) {
      const r = rows.get(id);
      if (!r) return false;
      Object.assign(r, {
        notify_hold_state: "held", notify_held_until: until, notify_hold_env: env,
        notify_route: recipients.route, notify_env: recipients.envVar, notify_to: recipients.to, notify_cc: recipients.cc,
      });
      return true;
    },
    // Synchronous check-and-set: the same "only one caller wins" the
    // conditional UPDATE gives under Postgres's row lock.
    async claim(id, { now, staleBefore }) {
      const r = rows.get(id);
      if (!r) return null;
      const stale = r.notify_hold_state === "sending" && r.notify_claimed_at && r.notify_claimed_at < staleBefore;
      if (r.notify_hold_state !== "held" && !stale) return null;
      r.notify_hold_state = "sending";
      r.notify_claimed_at = now;
      return structuredClone(r);
    },
    async released(id, { by, result, hadDetails, attempts }) {
      Object.assign(rows.get(id), {
        notify_hold_state: "released", notify_released_by: by, notify_had_details: hadDetails,
        notify_attempts: attempts, notify_claimed_at: null, notify_status: result.status,
        notify_message_id: result.messageId, notify_rfc_message_id: result.rfcMessageId,
      });
    },
    async failed(id, { state, result, attempts, failures }) {
      Object.assign(rows.get(id), {
        notify_hold_state: state, notify_attempts: attempts, notify_failures: failures,
        notify_claimed_at: null, notify_status: result.status, notify_error: result.error,
      });
    },
    async due({ env, now, staleBefore, limit }) {
      return [...rows.values()]
        .filter((r) => r.notify_hold_env === env)
        .filter((r) =>
          (r.notify_hold_state === "held" && r.notify_held_until <= now) ||
          (r.notify_hold_state === "sending" && r.notify_claimed_at < staleBefore)
        )
        .slice(0, limit)
        .map((r) => r.id);
    },
    async state(id) {
      return rows.get(id)?.notify_hold_state ?? null;
    },
    async heartbeat(name) {
      return beats.get(name) ?? null;
    },
    async beat(name, now) {
      const prev = beats.get(name);
      beats.set(name, { lastRunAt: now, previousRunAt: prev?.lastRunAt ?? null });
    },
  };
  return store;
}

/** A stub sender: records every email it is asked for; `plan` fails some. */
function stubSender(plan = []) {
  const sent = [];
  let call = 0;
  const send = async (row, recipients) => {
    const outcome = plan[call++] ?? "sent";
    if (outcome === "throw") throw new Error("boom");
    if (outcome !== "sent") return { status: outcome, messageId: null, error: `Resend 500 ${outcome}`, rfcMessageId: null };
    sent.push({ row, recipients });
    return { status: "sent", messageId: `re_${sent.length}`, error: null, rfcMessageId: `<re_${sent.length}@mock>` };
  };
  return { send, sent };
}

/** Step one for a form lead, held (the job is healthy). */
async function heldLead(store, id = "lead-1") {
  store.insert(id);
  const ok = await store.hold(id, { until: at(120), env: "production", recipients: RECIPIENTS });
  assert.equal(ok, true);
  return id;
}

/* ── step one: hold, or send now ────────────────────────────────────── */

const healthy = { lastRunAt: at(-20), previousRunAt: at(-80) };
const base = { type: "consultation", source: "form", saved: true, honeypotFilled: false, cronSecretSet: true, heartbeat: healthy, now: T0 };

test("held: a saved form lead while the release job runs every minute", () => {
  assert.deepEqual(H.shouldHold(base), { hold: true });
});

test("cron not configured → NOT held, sent at step one as before (fail safe)", () => {
  const no = (input) => {
    const d = H.shouldHold({ ...base, ...input });
    assert.equal(d.hold, false, JSON.stringify(input));
    return d.reason;
  };
  assert.match(no({ cronSecretSet: false }), /CRON_SECRET not set/);
  assert.match(no({ heartbeat: null }), /never run/);
  assert.match(no({ heartbeat: undefined }), /unreadable/);
  // The job stopped: last run 10 minutes ago.
  assert.match(no({ heartbeat: { lastRunAt: at(-600), previousRunAt: at(-660) } }), /last ran 600 s ago/);
  // Only the daily backstop has run (a day between beats) — or just one run.
  assert.match(no({ heartbeat: { lastRunAt: at(-30), previousRunAt: at(-86400) } }), /not running every minute/);
  assert.match(no({ heartbeat: { lastRunAt: at(-30), previousRunAt: null } }), /not running every minute/);
  // Never held for these, whatever the job is doing.
  assert.match(no({ source: "chat" }), /chat/);
  assert.match(no({ type: "guide" }), /not a call request/);
  assert.match(no({ saved: false }), /only copy/);
  assert.match(no({ honeypotFilled: true }), /spam/);
});

test("the hold length is two minutes; a test server may shorten it, never lengthen it", () => {
  assert.equal(H.HOLD_MS, 120_000);
  assert.equal(H.holdMs({}), 120_000);
  assert.equal(H.holdMs({ LEAD_HOLD_MS: "30000" }), 30_000);
  assert.equal(H.holdMs({ LEAD_HOLD_MS: "600000" }), 120_000);
  assert.equal(H.holdMs({ LEAD_HOLD_MS: "1" }), 120_000);
  assert.equal(H.holdEnv({ VERCEL_ENV: "production" }), "production");
  assert.equal(H.holdEnv({}), "local");
  assert.equal(H.holdEnv({ LEAD_HOLD_ENV: "check-contact", VERCEL_ENV: "production" }), "check-contact");
});

/* ── the four ways it is sent ───────────────────────────────────────── */

test("save path: page two saved while held → ONE email, with the details, no update", async () => {
  const store = memoryStore();
  const { send, sent } = stubSender();
  const id = await heldLead(store);
  const state = store.saveDetails(id, { helping_who: "My child", concerns: ["Sleep"], note: "Bedtime." });
  let updates = 0;
  const outcome = await H.onPageTwoSaved(store, send, id, state, async () => { updates++; }, {}, quiet);
  assert.equal(outcome, "sent_with_details");
  assert.equal(sent.length, 1);
  assert.equal(sent[0].row.helping_who, "My child");
  assert.equal(sent[0].row.note, "Bedtime.");
  assert.equal(updates, 0, "no 'Details added' — the details are in the one email");
  const r = store.rows.get(id);
  assert.equal(r.notify_hold_state, "released");
  assert.equal(r.notify_released_by, "page_two");
  assert.equal(r.notify_had_details, true);
  assert.equal(r.notify_status, "sent");
  assert.equal(r.notify_rfc_message_id, "<re_1@mock>");
  // The cron that comes later finds nothing.
  assert.deepEqual(await H.releaseDue(store, send, { env: "production", by: "cron", now: at(180) }, quiet), { due: 0, sent: 0, failed: 0 });
  assert.equal(sent.length, 1);
});

test("skip path: Skip while held → ONE email at once, without details", async () => {
  const store = memoryStore();
  const { send, sent } = stubSender();
  const id = await heldLead(store);
  const r = await H.releaseHeld(store, send, id, "skip", at(10), quiet);
  assert.deepEqual(r, { claimed: true, sent: true, hadDetails: false, state: "released" });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].recipients.to, "denise@example.test", "the recipients written at step one");
  assert.equal(store.rows.get(id).notify_released_by, "skip");
  // A second Skip (double click) or the cron: nothing more.
  assert.deepEqual(await H.releaseHeld(store, send, id, "skip", at(11), quiet), { claimed: false });
  await H.releaseDue(store, send, { env: "production", by: "cron", now: at(180) }, quiet);
  assert.equal(sent.length, 1);
});

test("2-minute timeout: neither saved nor skipped → the job sends it at 2 min, not before", async () => {
  const store = memoryStore();
  const { send, sent } = stubSender();
  const id = await heldLead(store);
  assert.deepEqual(await H.releaseDue(store, send, { env: "production", by: "cron", now: at(60) }, quiet), { due: 0, sent: 0, failed: 0 });
  assert.equal(sent.length, 0, "not at one minute");
  assert.deepEqual(await H.releaseDue(store, send, { env: "production", by: "cron", now: at(121) }, quiet), { due: 1, sent: 1, failed: 0 });
  assert.equal(sent.length, 1);
  assert.equal(store.rows.get(id).notify_released_by, "cron");
  // Only its own deployment's job sends it: a local test server never does.
  const other = memoryStore();
  await heldLead(other, "lead-2");
  assert.deepEqual(await H.releaseDue(other, send, { env: "local", by: "cron", now: at(500) }, quiet), { due: 0, sent: 0, failed: 0 });
});

test("late page-two save: after the job sent it → the threaded 'Details added' update, as today", async () => {
  const store = memoryStore();
  const { send, sent } = stubSender();
  const id = await heldLead(store);
  await H.releaseDue(store, send, { env: "production", by: "cron", now: at(125) }, quiet);
  assert.equal(sent.length, 1);
  const state = store.saveDetails(id, { note: "Added late." });
  assert.equal(state, "released");
  let updates = 0;
  const outcome = await H.onPageTwoSaved(store, send, id, state, async () => { updates++; }, {}, quiet);
  assert.equal(outcome, "details_update");
  assert.equal(updates, 1);
  assert.equal(sent.length, 1, "no second staff notification");
});

test("page-two save on a lead that was never held (fallback at step one) → the update, as today", async () => {
  const store = memoryStore();
  const { send, sent } = stubSender();
  store.insert("lead-old", { notify_status: "sent" });
  let updates = 0;
  assert.equal(await H.onPageTwoSaved(store, send, "lead-old", null, async () => { updates++; }, {}, quiet), "details_update");
  assert.equal(updates, 1);
  assert.equal(sent.length, 0);
});

test("page-two save while a send is in flight → waits for it, then the update", async () => {
  const store = memoryStore();
  const { send, sent } = stubSender();
  const id = await heldLead(store);
  await store.claim(id, { now: at(121), staleBefore: at(0) }); // the job claimed it
  const state = store.saveDetails(id, { note: "Mid-send." });
  assert.equal(state, "sending");
  let updates = 0;
  let ticks = 0;
  const outcome = await H.onPageTwoSaved(store, send, id, state, async () => { updates++; }, {
    sleep: async () => {
      // The job's send finishes on the second poll.
      if (++ticks === 2) await store.released(id, { by: "cron", result: { status: "sent", messageId: "re_x", error: null, rfcMessageId: "<x>" }, hadDetails: false, attempts: 1 });
    },
  }, quiet);
  assert.equal(outcome, "details_update");
  assert.equal(updates, 1);
  assert.equal(sent.length, 0, "this save sent no second notification");
});

test("page-two save while an in-flight send FAILS → this save sends the whole lead, with the details", async () => {
  const store = memoryStore();
  const { send, sent } = stubSender();
  const id = await heldLead(store);
  await store.claim(id, { now: at(121), staleBefore: at(0) });
  const state = store.saveDetails(id, { helping_who: "Myself" });
  let updates = 0;
  const outcome = await H.onPageTwoSaved(store, send, id, state, async () => { updates++; }, {
    sleep: async () => {
      if (store.rows.get(id).notify_hold_state === "sending") {
        await store.failed(id, { state: "held", result: { status: "failed", messageId: null, error: "Resend 500" }, attempts: 1, failures: [] });
      }
    },
  }, quiet);
  assert.equal(outcome, "sent_with_details");
  assert.equal(sent.length, 1);
  assert.equal(sent[0].row.helping_who, "Myself");
  assert.equal(updates, 0);
});

/* ── failures and doubles ───────────────────────────────────────────── */

test("failed send: logged on the row, retried on the next run, sent once it works", async () => {
  const store = memoryStore();
  const { send, sent } = stubSender(["failed", "throw", "sent"]);
  const id = await heldLead(store);
  let r = await H.releaseDue(store, send, { env: "production", by: "cron", now: at(121) }, quiet);
  assert.deepEqual(r, { due: 1, sent: 0, failed: 1 });
  let row = store.rows.get(id);
  assert.equal(row.notify_hold_state, "held", "back in the queue");
  assert.equal(row.notify_attempts, 1);
  assert.equal(row.notify_failures.length, 1);
  assert.equal(row.notify_failures[0].by, "cron");
  assert.equal(row.notify_failures[0].status, "failed");
  assert.match(row.notify_failures[0].error, /Resend 500/);
  r = await H.releaseDue(store, send, { env: "production", by: "cron", now: at(181) }, quiet);
  assert.deepEqual(r, { due: 1, sent: 0, failed: 1 });
  row = store.rows.get(id);
  assert.equal(row.notify_attempts, 2);
  assert.match(row.notify_failures[1].error, /threw: Error/, "a sender that throws is a failure like any other");
  r = await H.releaseDue(store, send, { env: "production", by: "cron", now: at(241) }, quiet);
  assert.deepEqual(r, { due: 1, sent: 1, failed: 0 });
  row = store.rows.get(id);
  assert.equal(row.notify_hold_state, "released");
  assert.equal(row.notify_attempts, 3);
  assert.equal(row.notify_failures.length, 2, "the log of failures is kept");
  assert.equal(sent.length, 1);
});

test("a send still failing a day later stops retrying, marked gave_up / failed, logged loudly", async () => {
  const store = memoryStore();
  const { send } = stubSender(["failed"]);
  const id = await heldLead(store);
  const errors = [];
  const r = await H.releaseHeld(store, send, id, "cron", new Date(T0.getTime() + H.GIVE_UP_MS + 60_000), { log() {}, error: (m) => errors.push(m) });
  assert.equal(r.state, "gave_up");
  assert.equal(store.rows.get(id).notify_hold_state, "gave_up");
  assert.equal(store.rows.get(id).notify_status, "failed");
  assert.match(errors[0], /GAVE UP lead=lead-1/);
});

test("no double send: Skip, a page-two save and the job all racing → exactly one email", async () => {
  const store = memoryStore();
  const { send, sent } = stubSender();
  const id = await heldLead(store);
  const outcomes = await Promise.all([
    H.releaseHeld(store, send, id, "skip", at(121), quiet),
    H.releaseDue(store, send, { env: "production", by: "cron", now: at(121) }, quiet),
    H.releaseHeld(store, send, id, "sweep", at(121), quiet),
  ]);
  assert.equal(sent.length, 1);
  assert.equal(outcomes.filter((o) => o.claimed === true || o.sent === 1).length, 1);
  // And nothing afterwards.
  await H.releaseDue(store, send, { env: "production", by: "cron", now: at(600) }, quiet);
  assert.equal(sent.length, 1);
});

test("a sender that died mid-send: its claim goes stale and the next run sends it", async () => {
  const store = memoryStore();
  const { send, sent } = stubSender();
  const id = await heldLead(store);
  await store.claim(id, { now: at(121), staleBefore: at(0) }); // claimed, then the process died
  assert.deepEqual(await H.releaseDue(store, send, { env: "production", by: "cron", now: at(180) }, quiet), { due: 0, sent: 0, failed: 0 }, "a fresh claim is left alone");
  const later = new Date(at(121).getTime() + H.CLAIM_STALE_MS + 1000);
  assert.deepEqual(await H.releaseDue(store, send, { env: "production", by: "cron", now: later }, quiet), { due: 1, sent: 1, failed: 0 });
  assert.equal(sent.length, 1);
});

test("Skip on a row that is not held (chat, never held, already sent) does nothing", async () => {
  const store = memoryStore();
  const { send, sent } = stubSender();
  store.insert("chat-row", { notify_status: "sent" });
  assert.deepEqual(await H.releaseHeld(store, send, "chat-row", "skip", at(5), quiet), { claimed: false });
  assert.deepEqual(await H.releaseHeld(store, send, "no-such-row", "skip", at(5), quiet), { claimed: false });
  assert.equal(sent.length, 0);
});

/* ── the cron endpoint ──────────────────────────────────────────────── */

test("the release endpoint refuses without CRON_SECRET (503) and with the wrong bearer (401)", async () => {
  const { runReleaseJob } = await import("./release-job.ts");
  const saved = process.env.CRON_SECRET;
  const errors = console.error;
  console.error = () => {};
  try {
    delete process.env.CRON_SECRET;
    let res = await runReleaseJob(new Request("http://x.test/api/cron/release-held-leads", { headers: { authorization: "Bearer anything" } }), "minute");
    assert.equal(res.status, 503);
    process.env.CRON_SECRET = "s3cret-value";
    res = await runReleaseJob(new Request("http://x.test/api/cron/release-held-leads"), "minute");
    assert.equal(res.status, 401);
    res = await runReleaseJob(new Request("http://x.test/api/cron/release-held-leads", { headers: { authorization: "Bearer wrong" } }), "minute");
    assert.equal(res.status, 401);
  } finally {
    console.error = errors;
    if (saved === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = saved;
  }
});
