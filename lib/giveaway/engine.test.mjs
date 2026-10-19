// The giveaway's rules, end to end over the in-memory client: notify-me and
// verification, the one-tap entry with the early bird, entry + double
// opt-in, referrals (+3 / +1, cap 10, self-referral and disposable voids),
// six drawings with frozen pools (daily-winner exclusion, grand takes
// everyone), idempotent runs and an interrupted draw, redraw from the frozen
// pool, re-verification, the claim deadline, and the scheduled sends with
// their receipts. Nothing is sent: the notifier and the sender record.
// Run: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

registerHooks({
  resolve(spec, ctx, next) {
    const local = !ctx.parentURL?.includes("/node_modules/");
    if (local && spec.startsWith(".") && !/\.(ts|tsx|js|mjs|cjs|json)$/.test(spec)) {
      return next(`${spec}.ts`, ctx);
    }
    return next(spec, ctx);
  },
});

const { memoryClient } = await import("./memory-client.ts");
const { GiveawayStore } = await import("./store.ts");
const P = await import("./people.ts");
const D = await import("./drawings.ts");
const S = await import("./sends.ts");
const C = await import("./config.ts");

const quiet = { log() {}, error() {} };
const fresh = () => new GiveawayStore(memoryClient(), "test");
const ctx = (now, ip = "1.1.1.1", ua = "ua-1") => ({ ipHash: `ip:${ip}`, uaHash: `ua:${ua}`, now });
const signup = (email, extra = {}) => ({ firstName: "Sarah", lastName: "Mitchell", email, zip: "37064", ageConfirmed: true, rulesAccepted: true, isExistingClient: false, marketingOptIn: false, ...extra });

/** A verified entrant at `now` (signup + click). */
async function entrant(store, email, now, extra = {}, c = ctx(now)) {
  const s = await P.entrySignup(store, signup(email, extra), c);
  assert.equal(s.ok, true, `signup ${email}`);
  const v = await P.verifyEntry(store, s.person.id, now);
  assert.equal(v.ok, true, `verify ${email}`);
  return v.person;
}

const T = {
  notify: new Date("2026-11-10T15:00:00Z"), // Tue Nov 10, notify-me week
  open: C.SCHEDULE.entriesOpen.at, // Sun Nov 15 6 pm CT
  sunNight: new Date("2026-11-16T03:00:00Z"), // Sun 9 pm CT
  monAm: new Date("2026-11-16T14:00:00Z"), // Mon 8 am CT
  mon: C.drawing("mon").at,
  monPm: new Date("2026-11-16T20:00:00Z"), // Mon 2 pm CT
  tue: C.drawing("tue").at,
  wed: C.drawing("wed").at,
  thu: C.drawing("thu").at,
  fri: C.drawing("fri").at,
  grand: C.drawing("grand").at,
};

/* ── Validation ─────────────────────────────────────────────────────── */

test("validation: Tennessee only, 18+, rules, a real address", () => {
  assert.equal(P.validateSignup(signup("a@b.co")).ok, true);
  assert.deepEqual(P.validateSignup(signup("a@b.co", { zip: "30301" })), { ok: false, reason: "not_tennessee" });
  assert.deepEqual(P.validateSignup(signup("a@b.co", { zip: "3706" })), { ok: false, reason: "invalid_zip" });
  assert.deepEqual(P.validateSignup(signup("a@b.co", { ageConfirmed: false })), { ok: false, reason: "age" });
  assert.deepEqual(P.validateSignup(signup("a@b.co", { rulesAccepted: false })), { ok: false, reason: "rules" });
  assert.deepEqual(P.validateSignup(signup("nope")), { ok: false, reason: "invalid_email" });
  assert.deepEqual(P.validateSignup(signup("a@b.co", { lastName: " " })), { ok: false, reason: "invalid_name" });
  const v = P.validateSignup(signup(" Sarah.M+x@Gmail.com ", { firstName: "  sarah  " }));
  assert.equal(v.value.email, "sarahm@gmail.com");
  assert.equal(v.value.city, "Franklin");
});

/* ── Notify-me → It's live tap ──────────────────────────────────────── */

test("notify-me: signup, verify once, the one-tap entry with the early bird before Monday noon", async () => {
  const store = fresh();
  const n = await P.notifySignup(store, signup("sarah@example.test", { isExistingClient: true }), ctx(T.notify));
  assert.equal(n.ok, true);
  assert.equal(n.alreadyVerified, false);
  // A repeat signup updates the row and sends another link; nobody is entered.
  const again = await P.notifySignup(store, signup("sarah@example.test", { firstName: "Sara", isExistingClient: true }), ctx(T.notify));
  assert.equal(again.row.id, n.row.id);
  assert.equal(again.row.first_name, "Sara");
  assert.equal((await store.select("giveaway_people", "id")).data.length, 0);

  // The tap before verification is refused; before entries open too.
  assert.deepEqual(await P.liveTap(store, n.row.id, T.sunNight), { ok: false, reason: "not_verified" });
  const v = await P.verifyNotify(store, n.row.id, T.notify);
  assert.equal(v.first, true);
  assert.equal((await P.verifyNotify(store, n.row.id, T.notify)).first, false);
  assert.deepEqual(await P.liveTap(store, n.row.id, new Date(T.open.getTime() - 1000)), { ok: false, reason: "not_open" });

  // Sunday night tap: person + base + early bird, offer issued, version current_client.
  const tap = await P.liveTap(store, n.row.id, T.sunNight);
  assert.equal(tap.ok, true);
  assert.equal(tap.first, true);
  assert.equal(tap.earlyBird, true);
  assert.equal(tap.person.verified_at, T.sunNight.toISOString());
  assert.equal(tap.person.is_existing_client, true);
  assert.match(tap.offer.code, /^10Y-/);
  assert.equal(await P.entryCount(store, tap.person.id), 2);
  // A second tap adds nothing.
  const tap2 = await P.liveTap(store, n.row.id, T.monPm);
  assert.equal(tap2.first, false);
  assert.equal(tap2.earlyBird, true);
  assert.equal(await P.entryCount(store, tap.person.id), 2);
  assert.equal((await store.select("giveaway_notify", "tapped_at, person_id").eq("id", n.row.id).single()).data.person_id, tap.person.id);
});

test("a tap after Monday noon gets no early bird; the link works all week", async () => {
  const store = fresh();
  const n = await P.notifySignup(store, signup("late@example.test"), ctx(T.notify));
  await P.verifyNotify(store, n.row.id, T.notify);
  const tap = await P.liveTap(store, n.row.id, T.monPm);
  assert.equal(tap.earlyBird, false);
  assert.equal(await P.entryCount(store, tap.person.id), 1);
  assert.deepEqual(await P.liveTap(store, n.row.id, new Date(T.grand.getTime() + 1000)), { ok: false, reason: "not_open" });
});

/* ── Entry + referrals ──────────────────────────────────────────────── */

test("entry: unverified until the click; the click is idempotent and issues the offer", async () => {
  const store = fresh();
  const s = await P.entrySignup(store, signup("marcus@example.test"), ctx(T.monAm));
  assert.equal(s.ok, true);
  assert.equal(s.person.verified_at, null);
  assert.match(s.person.referral_code, /^HBC-/);
  assert.equal(await P.entryCount(store, s.person.id), 0);
  const v1 = await P.verifyEntry(store, s.person.id, T.monAm);
  assert.equal(v1.first, true);
  assert.equal(v1.referredBonus, false);
  const v2 = await P.verifyEntry(store, s.person.id, T.monPm);
  assert.equal(v2.first, false);
  assert.equal(v2.offer.code, v1.offer.code);
  assert.equal(await P.entryCount(store, s.person.id), 1);
  // A repeat signup from a verified address changes nothing.
  const again = await P.entrySignup(store, signup("marcus@example.test", { firstName: "Mark" }), ctx(T.monPm));
  assert.equal(again.alreadyVerified, true);
  assert.equal(again.person.first_name, "Marcus".slice(0, 0) + "Sarah");
});

test("referrals: +3 for the referrer and +1 for the friend when the friend verifies; cap ten; self-referral voided", async () => {
  const store = fresh();
  const ref = await entrant(store, "referrer@example.test", T.monAm, {}, ctx(T.monAm, "9.9.9.9", "ua-ref"));
  // Ten friends credit; the eleventh does not.
  for (let i = 1; i <= 11; i++) {
    const friend = await P.entrySignup(store, signup(`friend${i}@example.test`, { ref: ref.referral_code }), ctx(T.monAm, `10.0.0.${i}`, `ua-${i}`));
    assert.equal(friend.person.referred_by_person_id, ref.id);
    const v = await P.verifyEntry(store, friend.person.id, T.monAm);
    assert.equal(v.referredBonus, true, `friend ${i} +1`);
    assert.equal(await P.entryCount(store, friend.person.id), 2);
  }
  assert.equal(await P.entryCount(store, ref.id), 1 + 10 * 3);
  const refRow = await P.personById(store, ref.id);
  assert.equal(refRow.referral_credits, 10);
  const capLog = (await store.select("giveaway_audit", "action").eq("action", "referral_cap_reached")).data;
  assert.equal(capLog.length, 1);
  // Lower-case referral code in the link still resolves.
  assert.equal((await P.personByReferralCode(store, ref.referral_code.toLowerCase())).id, ref.id);

  // Self-referral by the same device: the friend's +1 is voided (logged), the referrer gets nothing.
  const self = await P.entrySignup(store, signup("second-me@example.test", { ref: ref.referral_code }), ctx(T.monAm, "9.9.9.9", "ua-ref"));
  const sv = await P.verifyEntry(store, self.person.id, T.monAm);
  assert.equal(sv.referredBonus, false);
  assert.equal(await P.entryCount(store, self.person.id), 1);
  assert.equal(await P.entryCount(store, ref.id), 31);
  const voided = (await store.select("giveaway_entries", "void_reason").eq("person_id", self.person.id).eq("kind", "referred_bonus").single()).data;
  assert.match(voided.void_reason, /same device/);
  // A disposable address: voided too.
  const disp = await P.entrySignup(store, signup("x@mailinator.com", { ref: ref.referral_code }), ctx(T.monAm, "7.7.7.7", "ua-7"));
  assert.equal((await P.verifyEntry(store, disp.person.id, T.monAm)).referredBonus, false);
  // An unknown referral code: entered normally, no referrer.
  const nobody = await P.entrySignup(store, signup("nobody@example.test", { ref: "HBC-ZZZZZZ" }), ctx(T.monAm));
  assert.equal(nobody.person.referred_by_person_id, null);
});

test("a friend who signs up through a link but never verifies credits nothing", async () => {
  const store = fresh();
  const ref = await entrant(store, "ref@example.test", T.monAm);
  await P.entrySignup(store, signup("ghost@example.test", { ref: ref.referral_code }), ctx(T.monAm, "2.2.2.2", "ua-2"));
  assert.equal(await P.entryCount(store, ref.id), 1);
});

/* ── Drawings ───────────────────────────────────────────────────────── */

function recorder() {
  const results = [];
  return { results, notifier: { winnerDrawn: async (r) => results.push(r) } };
}

async function week(store) {
  // Five entrants Monday morning; two referred (+1 each, referrer +3 each).
  const a = await entrant(store, "a@example.test", T.monAm, {}, ctx(T.monAm, "1.1.1.1", "a"));
  const b = await entrant(store, "b@example.test", T.monAm, { ref: a.referral_code }, ctx(T.monAm, "1.1.1.2", "b"));
  const c = await entrant(store, "c@example.test", T.monAm, { ref: a.referral_code, isExistingClient: true }, ctx(T.monAm, "1.1.1.3", "c"));
  const d = await entrant(store, "d@example.test", T.monAm, {}, ctx(T.monAm, "1.1.1.4", "d"));
  const e = await entrant(store, "e@example.test", T.monAm, {}, ctx(T.monAm, "1.1.1.5", "e"));
  return { a, b, c, d, e };
}

test("Monday: the pool is every verified entry created before noon, weighted by row count; the run is idempotent", async () => {
  const store = fresh();
  const { a } = await week(store);
  // An entrant verified AFTER Monday noon is not in Monday's pool.
  await entrant(store, "late@example.test", T.monPm);
  const { notifier, results } = recorder();
  const run = await D.runDueDrawings(store, T.mon, "cron", notifier, quiet);
  assert.equal(run.due, 1);
  assert.equal(run.drawn.length, 1);
  const r = run.drawn[0];
  assert.equal(r.drawing.slot, "mon");
  // a: 1 base + 6 bonus; b, c: 2 each; d, e: 1 each = 13 positions.
  assert.equal(r.drawing.pool_size, 13);
  assert.equal(r.winner.status, "drawn");
  assert.equal(r.winner.claim_deadline_at, C.claimDeadline(T.mon).toISOString());
  assert.equal(r.winner.prize_version, r.person.is_existing_client ? "current_client" : "new_client");
  assert.match(r.claimToken, /^[A-Z0-9]{24}$/);
  assert.equal(results.length, 1);
  // A second tick the same minute, and a late one: nothing more is drawn.
  const again = await D.runDueDrawings(store, new Date(T.mon.getTime() + 60_000), "cron", notifier, quiet);
  assert.equal(again.drawn.length, 0);
  assert.equal(again.due, 0);
  assert.equal((await D.winnersOf(store, r.drawing.id)).length, 1);
  assert.equal(results.length, 1);
  // The pool was frozen in position order and hashes to the stored hash.
  const rv = await D.reverify(store, r.drawing.id);
  assert.equal(rv.hashOk, true);
  assert.deepEqual(rv.results.map((x) => x.ok), [true]);
  assert.equal(a.id.length, 36);
});

test("a daily winner leaves later daily pools but is in the grand pool; the grand drawing takes every entry", async () => {
  const store = fresh();
  const people = await week(store);
  const { notifier } = recorder();
  const mon = (await D.runDueDrawings(store, T.mon, "cron", notifier, quiet)).drawn[0];
  const monWinner = mon.person.id;
  const monEntries = await P.entryCount(store, monWinner);
  const tue = (await D.runDueDrawings(store, T.tue, "cron", notifier, quiet)).drawn[0];
  assert.equal(tue.drawing.slot, "tue");
  assert.equal(tue.drawing.pool_size, 13 - monEntries);
  assert.notEqual(tue.person.id, monWinner);
  const pool = (await store.select("giveaway_drawing_pool", "person_id").eq("drawing_id", tue.drawing.id)).data;
  assert.equal(pool.some((p) => p.person_id === monWinner), false);
  // A skipped cron minute: Wed, Thu, Fri all overdue at once are drawn in order, once each.
  const catchUp = await D.runDueDrawings(store, new Date(T.fri.getTime() + 3 * 60_000), "cron", notifier, quiet);
  assert.deepEqual(catchUp.drawn.map((r) => r.drawing.slot), ["wed", "thu", "fri"]);
  // The grand: everyone, daily winners included.
  const grand = (await D.runDueDrawings(store, T.grand, "cron", notifier, quiet)).drawn[0];
  assert.equal(grand.drawing.kind, "grand");
  assert.equal(grand.drawing.pool_size, 13);
  assert.equal(grand.winner.claim_deadline_at, "2026-11-24T23:00:00.000Z");
  const all = await D.allDrawings(store);
  assert.deepEqual(all.map((d) => d.status), ["drawn", "drawn", "drawn", "drawn", "drawn", "drawn"]);
  assert.equal(Object.keys(people).length, 5);
});

test("an interrupted draw (claimed, winner written, drawing not finalized) is finished, not repeated", async () => {
  const store = fresh();
  await week(store);
  const { notifier, results } = recorder();
  const mon = (await D.runDueDrawings(store, T.mon, "cron", notifier, quiet)).drawn[0];
  // Simulate the crash: the drawing row goes back to "drawing" with a stale claim.
  await store.update("giveaway_drawings", { status: "drawing", claimed_at: new Date(T.mon.getTime() - 10 * 60_000).toISOString() }).eq("id", mon.drawing.id);
  const rerun = await D.runDueDrawings(store, new Date(T.mon.getTime() + 60_000), "cron", notifier, quiet);
  assert.equal(rerun.drawn.length, 1);
  assert.equal(rerun.drawn[0].winner.id, mon.winner.id);
  assert.equal((await D.winnersOf(store, mon.drawing.id)).length, 1);
  assert.equal((await D.drawingById(store, mon.drawing.id)).status, "drawn");
  // Finishing does not re-notify.
  assert.equal(results.length, 1);
});

test("Draw now and an empty pool", async () => {
  const store = fresh();
  const { notifier } = recorder();
  const early = await D.drawNow(store, "mon", T.monAm, "ben@example.test", notifier, quiet);
  assert.deepEqual(early, { error: "its time has not come" });
  // Nobody entered: the row stays scheduled and the skip is audited.
  const empty = await D.runDueDrawings(store, T.mon, "cron", notifier, quiet);
  assert.equal(empty.drawn.length, 0);
  assert.match(empty.skipped[0].reason, /empty pool/);
  assert.equal((await D.drawingBySlot(store, "mon")).status, "scheduled");
  // Someone who verified before noon is in the pool; a Draw now after noon picks them.
  await entrant(store, "a@example.test", T.monAm);
  const now = await D.drawNow(store, "mon", T.monPm, "ben@example.test", notifier, quiet);
  assert.equal(now.drawing.slot, "mon");
  assert.equal(now.drawing.drawn_by, "ben@example.test");
  assert.deepEqual(await D.drawNow(store, "mon", T.monPm, "ben@example.test", notifier, quiet), { error: "already drawn" });
});

test("redraw: from the frozen pool, never the previous pick, with a reason, audited and re-verifiable", async () => {
  const store = fresh();
  await week(store);
  const { notifier, results } = recorder();
  const mon = (await D.runDueDrawings(store, T.mon, "cron", notifier, quiet)).drawn[0];
  assert.deepEqual(await D.redraw(store, mon.drawing.id, "   ", T.monPm, "ben@example.test", notifier, quiet), { error: "a reason is required" });
  // Someone who enters after the draw is NOT in the redraw: the pool is frozen.
  await entrant(store, "newcomer@example.test", T.monPm);
  const re = await D.redraw(store, mon.drawing.id, "unreachable after 72 hours", new Date("2026-11-19T18:30:00Z"), "ben@example.test", notifier, quiet);
  assert.equal(re.redraw, true);
  assert.notEqual(re.person.id, mon.person.id);
  assert.notEqual(re.person.email, "newcomer@example.test");
  const rows = await D.winnersOf(store, mon.drawing.id);
  assert.deepEqual(rows.map((w) => w.status), ["redrawn", "drawn"]);
  assert.equal(rows[0].redraw_reason, "unreachable after 72 hours");
  assert.equal((await D.drawingById(store, mon.drawing.id)).status, "redrawn");
  assert.equal(results.length, 2);
  // Thursday 1:30 pm + 72 h = Sunday → Tuesday 5 pm.
  assert.equal(re.winner.claim_deadline_at, "2026-11-24T23:00:00.000Z");
  const rv = await D.reverify(store, mon.drawing.id);
  assert.equal(rv.hashOk, true);
  assert.deepEqual(rv.results.map((x) => x.ok), [true, true]);
  // Tamper with a stored winner: re-verify notices.
  await store.update("giveaway_winners", { entry_id: mon.winner.entry_id }).eq("id", re.winner.id);
  assert.deepEqual((await D.reverify(store, mon.drawing.id)).results.map((x) => x.ok), [true, false]);
});

test("after a redraw the first pick is back in later daily pools; the new holder is out", async () => {
  const store = fresh();
  await week(store);
  const { notifier } = recorder();
  const mon = (await D.runDueDrawings(store, T.mon, "cron", notifier, quiet)).drawn[0];
  const re = await D.redraw(store, mon.drawing.id, "declined", T.monPm, "ben@example.test", notifier, quiet);
  const holders = await D.dailyHolders(store);
  assert.equal(holders.has(mon.person.id), false);
  assert.equal(holders.has(re.person.id), true);
});

test("winner updates: call log, contacted, public OK with label, tax form, the claim page", async () => {
  const store = fresh();
  await week(store);
  const { notifier } = recorder();
  const r = (await D.runDueDrawings(store, T.mon, "cron", notifier, quiet)).drawn[0];
  let w = await D.winnerByToken(store, r.claimToken);
  assert.equal(w.id, r.winner.id);
  assert.equal(await D.winnerByToken(store, "WRONG"), null);
  w = await D.updateWinner(store, w, { kind: "call_attempt", outcome: "voicemail" }, T.monPm, "denise@example.test");
  assert.equal(w.status, "drawn");
  assert.equal(w.call_attempts.length, 1);
  w = await D.updateWinner(store, w, { kind: "status", status: "contacted" }, T.monPm, "ben@example.test");
  assert.equal(w.status, "contacted");
  assert.ok(w.contacted_at);
  w = await D.claimWithPhone(store, w, "(615) 555-0100", T.monPm);
  assert.equal(w.status, "claimed");
  assert.equal(w.phone, "(615) 555-0100");
  w = await D.updateWinner(store, w, { kind: "public_ok", on: true, label: "Sarah M., Franklin" }, T.monPm, "ben@example.test");
  assert.equal(w.public_label, "Sarah M., Franklin");
  w = await D.updateWinner(store, w, { kind: "tax_form_received", on: true }, T.monPm, "ben@example.test");
  assert.ok(w.tax_form_received_at);
  const actions = (await store.select("giveaway_audit", "action").like("action", "winner_%")).data.map((a) => a.action);
  assert.deepEqual(actions, ["winner_call_attempt", "winner_status", "winner_claimed", "winner_public_ok", "winner_tax_form_received"]);
});

/* ── Scheduled sends ────────────────────────────────────────────────── */

function sender() {
  const sent = [];
  const deps = {
    send: async ({ to, email, marketing }) => {
      sent.push({ to, subject: email.subject, marketing });
      return { ok: true, messageId: `m-${sent.length}`, error: null };
    },
    footingFor: (email, marketing) => ({ identityLine: "HBC · addr", siteUrl: "https://example.test", unsubscribeUrl: marketing ? `https://example.test/unsubscribe?t=${email}` : null }),
    links: { enterUrl: (id) => `https://example.test/10years/enter/${id}`, referralUrl: (c) => `https://example.test/10years?ref=${c}`, bookUrl: (c) => `https://example.test/contact?code=${c}`, adminUrl: "https://example.test/admin/10years" },
    staffRecipients: () => ({ to: "denise@example.test", cc: ["ben@example.test"] }),
    log: quiet,
  };
  return { sent, deps };
}

test("sends: nine jobs scheduled once; It's live and the Monday reminder go to verified signups who have not tapped", async () => {
  const store = fresh();
  assert.equal(await S.scheduleJobs(store), 9);
  assert.equal(await S.scheduleJobs(store), 9);
  assert.equal((await store.select("scheduled_sends", "id")).data.length, 9);
  const n1 = await P.notifySignup(store, signup("one@example.test"), ctx(T.notify));
  const n2 = await P.notifySignup(store, signup("two@example.test"), ctx(T.notify));
  await P.notifySignup(store, signup("never-verified@example.test"), ctx(T.notify));
  await P.verifyNotify(store, n1.row.id, T.notify);
  await P.verifyNotify(store, n2.row.id, T.notify);
  const { sent, deps } = sender();
  // Nothing is due on Saturday.
  assert.deepEqual(await S.runDueSends(store, new Date("2026-11-14T18:00:00Z"), deps), { jobs: 0, sent: 0, skipped: 0, failed: 0 });
  const live = await S.runDueSends(store, T.open, deps);
  assert.deepEqual(live, { jobs: 1, sent: 2, skipped: 0, failed: 0 });
  assert.deepEqual(sent.map((s) => s.to).sort(), ["one@example.test", "two@example.test"]);
  assert.equal(sent[0].marketing, true);
  // Running again sends nothing more.
  assert.deepEqual(await S.runDueSends(store, new Date(T.open.getTime() + 60_000), deps), { jobs: 0, sent: 0, skipped: 0, failed: 0 });
  // One taps Sunday night; Monday 9 am the reminder goes only to the other.
  await P.liveTap(store, n1.row.id, T.sunNight);
  const reminder = await S.runDueSends(store, C.SCHEDULE.mondayReminder.at, deps);
  assert.deepEqual(reminder, { jobs: 1, sent: 1, skipped: 0, failed: 0 });
  assert.equal(sent.at(-1).to, "two@example.test");
  assert.match(sent.at(-1).subject, /Today at noon/);
});

test("sends: the daily email to every subscribed entrant with their count, receipts make a re-run a no-op; the thank-you skips prize holders; Tuesday skipped when contacted", async () => {
  const store = fresh();
  await S.scheduleJobs(store);
  await week(store);
  const unsub = await entrant(store, "unsub@example.test", T.monAm);
  await store.update("giveaway_people", { unsubscribed_at: T.monAm.toISOString() }).eq("id", unsub.id);
  const { notifier } = recorder();
  const mon = (await D.runDueDrawings(store, T.mon, "cron", notifier, quiet)).drawn[0];
  const { sent, deps } = sender();
  // The Sunday and Monday-morning jobs run first (nobody signed up for notify-me here).
  assert.deepEqual(await S.runDueSends(store, T.mon, deps), { jobs: 2, sent: 0, skipped: 0, failed: 0 });
  // Monday 4 pm: five entrants get the daily email; the unsubscribed one does not.
  const daily = await S.runDueSends(store, C.drawing("mon").dailyEmailAt, deps);
  assert.deepEqual(daily, { jobs: 1, sent: 5, skipped: 0, failed: 0 });
  assert.equal(sent.some((s) => s.to === "unsub@example.test"), false);
  assert.match(sent[0].subject, /Tuesday/);
  // A second run after a "crash" mid-job: the job row is reclaimed and every receipt is already there.
  await store.update("scheduled_sends", { sent_at: null, claimed_at: new Date(T.mon.getTime() - 60 * 60_000).toISOString() }).eq("kind", "daily_mon").is("person_id", null);
  const rerun = await S.runDueSends(store, new Date(C.drawing("mon").dailyEmailAt.getTime() + 60_000), deps);
  assert.deepEqual(rerun, { jobs: 1, sent: 0, skipped: 5, failed: 0 });
  assert.equal(sent.length, 5);
  // Tuesday 8:30: Monday's winner is still "drawn" → the staff re-send goes.
  const tue = await S.runDueSends(store, C.SCHEDULE.tuesdayCallToday.at, deps);
  assert.deepEqual(tue, { jobs: 1, sent: 1, skipped: 0, failed: 0 });
  assert.equal(sent.at(-1).to, "denise@example.test");
  assert.match(sent.at(-1).subject, /Monday's winner still needs a call/);
  // Had the winner been marked contacted, it would have been skipped.
  const store2 = fresh();
  await S.scheduleJobs(store2);
  await week(store2);
  const mon2 = (await D.runDueDrawings(store2, T.mon, "cron", notifier, quiet)).drawn[0];
  await D.updateWinner(store2, mon2.winner, { kind: "status", status: "contacted" }, T.monPm, "ben@example.test");
  const s2 = sender();
  await S.runDueSends(store2, C.drawing("mon").dailyEmailAt, s2.deps); // the earlier jobs
  assert.deepEqual(await S.runDueSends(store2, C.SCHEDULE.tuesdayCallToday.at, s2.deps), { jobs: 1, sent: 0, skipped: 1, failed: 0 });
  assert.equal((await store2.select("scheduled_sends", "skipped_reason").eq("kind", "tuesday_call_today").single()).data.skipped_reason, "Monday winner already contacted");
  // The Nov 22 thank-you: every subscribed entrant who is not holding a prize.
  await S.runDueSends(store, C.drawing("fri").dailyEmailAt, deps); // Tue–Fri dailies
  const before = sent.length;
  const thanks = await S.runDueSends(store, C.SCHEDULE.thankYouSend.at, deps);
  // Five subscribed entrants, less Monday's winner — unless the draw (random,
  // one in six) picked the unsubscribed entrant, who gets nothing either way.
  const expected = mon.person.email === "unsub@example.test" ? 5 : 4;
  assert.equal(thanks.jobs, 1);
  assert.equal(thanks.sent, expected);
  assert.equal(sent.length - before, expected);
  assert.equal(sent.slice(-expected).some((s) => s.to === mon.person.email), false);
  assert.match(sent.at(-1).subject, /Thank you/);
});
