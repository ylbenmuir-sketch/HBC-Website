// Unit tests for lib/giveaway/config.ts: every instant matches its Central
// label (CST, UTC−6 across the whole window), the six drawings, the
// 72-hour response window (from staff's first attempt), the prize
// retail sums from the rates, the $600 tax flag per prize, the page modes,
// and that migration 0010's seed block is exactly what the config
// generates. Run: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

const C = await import("./config.ts");
const { prizeSyncSql, syncBlockOf } = await import("./seed-sql.ts");
const { readdirSync } = await import("node:fs");
const { formatCentral } = await import("../email/format.ts");

/* ── Instants ───────────────────────────────────────────────────────── */

test("every schedule instant matches its Central label", () => {
  for (const [name, i] of Object.entries(C.SCHEDULE)) {
    assert.equal(C.formatCentralLabel(i.at), i.ct, name);
    assert.equal(formatCentral(i.at), i.ct, `${name} via lib/email/format`);
    // CST only: the window is after Nov 1 2026.
    assert.equal(C.centralOffsetMinutes(i.at), -360, `${name} is CST`);
  }
});

test("the plan's UTC column: noon = 18:00Z, 5 pm = 23:00Z, 6 pm = 00:00Z next day", () => {
  assert.equal(C.SCHEDULE.entriesOpen.at.toISOString(), "2026-11-16T00:00:00.000Z");
  assert.equal(C.SCHEDULE.mondayReminder.at.toISOString(), "2026-11-16T15:00:00.000Z");
  // No Tuesday "call today" reminder any more (Ben, 2026-11-03).
  assert.equal("tuesdayCallToday" in C.SCHEDULE, false);
  assert.equal(C.SCHEDULE.entriesClose.at.toISOString(), "2026-11-21T23:00:00.000Z");
  assert.equal(C.SCHEDULE.offerEnd.at.toISOString(), "2026-12-06T05:59:59.000Z");
  assert.equal(C.SCHEDULE.notifyMeStart.at.toISOString(), "2026-11-09T06:00:00.000Z");
});

test("centralToUtc is DST-correct outside the window too", () => {
  // Oct 14 2026 11:13 AM is CDT (UTC−5): 16:13Z — the email test's fixture.
  assert.equal(C.centralToUtc(2026, 10, 14, 11, 13).toISOString(), "2026-10-14T16:13:00.000Z");
  // Jan 6 2027 9:05 AM is CST: 15:05Z.
  assert.equal(C.centralToUtc(2027, 1, 6, 9, 5).toISOString(), "2027-01-06T15:05:00.000Z");
});

/* ── Drawings ───────────────────────────────────────────────────────── */

test("six drawings: Mon–Fri at noon, Saturday grand at 5 pm, in order", () => {
  assert.equal(C.DRAWINGS.length, 6);
  assert.deepEqual(C.DRAWINGS.map((d) => d.kind), ["daily", "daily", "daily", "daily", "daily", "grand"]);
  for (const d of C.DRAWINGS) {
    assert.equal(C.formatCentralLabel(d.at), d.ct, d.slot);
    const p = C.centralParts(d.at);
    assert.equal(p.hour, d.kind === "grand" ? 17 : 12, d.slot);
    assert.equal(["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][p.weekday], d.dayName);
  }
  for (let i = 1; i < C.DRAWINGS.length; i++) assert.ok(C.DRAWINGS[i].at > C.DRAWINGS[i - 1].at);
  assert.equal(C.DRAWINGS[5].at.getTime(), C.SCHEDULE.entriesClose.at.getTime(), "entries close at the grand drawing");
  assert.equal(C.spokenCentral(C.drawing("mon").at), "Monday at noon");
  assert.equal(C.spokenCentral(C.drawing("grand").at), "Saturday at 5:00 pm");
  assert.equal(C.shortCentralTime(C.drawing("mon").at), "noon");
  assert.equal(C.shortCentralTime(C.drawing("grand").at), "5 pm");
  assert.equal(C.spokenCentralDateTime(C.SCHEDULE.entriesOpen.at), "Sunday, Nov 15 at 6 PM");
  assert.equal(C.spokenCentralRange(C.DRAWINGS[0].at, C.DRAWINGS[5].at), "November 16–21");
  assert.equal(C.spokenCentralRange(C.DRAWINGS[0].at, C.DRAWINGS[5].at, "short"), "Nov 16–21");
});

test("daily emails at 4 pm CT Mon–Fri, none for the grand drawing", () => {
  for (const d of C.DRAWINGS) {
    if (d.kind === "grand") {
      assert.equal(d.dailyEmailAt, null);
      continue;
    }
    assert.equal(C.formatCentralLabel(d.dailyEmailAt), C.DAILY_EMAIL_CT_LABELS[d.slot]);
    assert.equal(C.centralParts(d.dailyEmailAt).hour, 16);
  }
});

test("nextDrawing / drawingAfter", () => {
  assert.equal(C.nextDrawing(new Date("2026-11-16T17:59:00Z")).slot, "mon");
  assert.equal(C.nextDrawing(new Date("2026-11-16T18:00:00Z")).slot, "tue");
  assert.equal(C.nextDrawing(new Date("2026-11-20T18:00:00Z")).slot, "grand");
  assert.equal(C.nextDrawing(new Date("2026-11-21T23:00:00Z")), null);
  assert.equal(C.drawingAfter("fri").slot, "grand");
  assert.equal(C.drawingAfter("grand"), null);
});

test("the response window: 72 h from staff's first attempt; the earliest redraw is the draw + 72 h, no weekend shift", () => {
  assert.equal(C.RESPONSE_WINDOW_MS, 72 * 60 * 60_000);
  assert.equal(C.formatCentralLabel(C.earliestRedrawAt(C.drawing("mon").at)), "Thu Nov 19, 12:00 PM CT");
  // Friday noon + 72 h = Monday noon: no move to Tuesday any more.
  assert.equal(C.formatCentralLabel(C.earliestRedrawAt(C.drawing("fri").at)), "Mon Nov 23, 12:00 PM CT");
  assert.equal(C.earliestRedrawAt(C.drawing("grand").at).toISOString(), "2026-11-24T23:00:00.000Z");
  assert.equal("claimDeadline" in C, false);
});

/* ── Prizes and rates (decision 16) ─────────────────────────────────── */

test("the $2,000 tax threshold (2026): only the grand prize reaches it alone; a daily + grand winner is judged on both", () => {
  assert.equal(C.TAX_FORM_THRESHOLD_USD, 2000);
  const flags = Object.fromEntries(C.PRIZES.map((p) => [`${p.slot}/${p.version}`, C.prizeTaxFormRequired(p)]));
  for (const [k, v] of Object.entries(flags)) assert.equal(v, k.startsWith("grand/"), k);
  // At or over: exactly $2,000 needs the form, $1,999 does not.
  assert.equal(C.taxFormRequiredForTotal(2000), true);
  assert.equal(C.taxFormRequiredForTotal(1999), false);
  // Aggregated per person: Friday's biggest daily alone is under, any daily + the grand is over.
  const fri = C.prizeRetailUsd(C.prizeFor("fri", "new_client"));
  assert.equal(C.taxFormRequiredForTotal(fri), false);
  assert.equal(C.taxFormRequiredForTotal(fri + C.prizeRetailUsd(C.prizeFor("mon", "new_client"))), false, "two dailies, $1,785");
  assert.equal(C.taxFormRequiredForTotal(C.prizeRetailUsd(C.prizeFor("mon", "current_client")) + C.prizeRetailUsd(C.prizeFor("grand", "current_client"))), true);
});

test("offer window closes at Dec 5 11:59 pm CT; visits through Dec 31", () => {
  assert.equal(C.offerOpen(new Date("2026-12-06T05:59:59Z")), true);
  assert.equal(C.offerOpen(new Date("2026-12-06T06:00:00Z")), false);
  assert.equal(C.OFFER.normallyUsd, 150);
  assert.equal(C.OFFER.packageSessions, 12);
  assert.equal(C.OFFER.bonusSessionUsd, 125);
  assert.equal(C.formatCentralLabel(C.OFFER.visitBy.at), "Thu Dec 31, 11:59 PM CT");
});

test("the gift reveal: Sat Nov 21 7:00 PM CT, the reveal email at the same instant", () => {
  assert.equal(C.formatCentralLabel(C.GIFT_REVEAL_AT), "Sat Nov 21, 7:00 PM CT");
  assert.equal(C.GIFT_REVEAL_AT.toISOString(), "2026-11-22T01:00:00.000Z");
  assert.equal(C.SCHEDULE.thankYouSend.at.getTime(), C.GIFT_REVEAL_AT.getTime());
  assert.equal(C.giftRevealed(new Date("2026-11-22T00:59:59Z")), false);
  assert.equal(C.giftRevealed(new Date("2026-11-22T01:00:00Z")), true);
  // The grand drawing (5 pm) comes before the reveal (7 pm).
  assert.ok(C.SCHEDULE.entriesClose.at < C.GIFT_REVEAL_AT);
  assert.deepEqual(C.CLINIC_DAYS_AFTER_REVEAL.map((d) => C.centralParts(d).weekday), [1, 2]);
});

test("page modes switch on the config instants", () => {
  assert.equal(C.pageMode(new Date("2026-11-09T05:59:59Z")), "hidden");
  assert.equal(C.pageMode(new Date("2026-11-09T06:00:00Z")), "notify_me");
  assert.equal(C.pageMode(new Date("2026-11-15T23:59:59Z")), "notify_me");
  assert.equal(C.pageMode(new Date("2026-11-16T00:00:00Z")), "live");
  assert.equal(C.pageMode(new Date("2026-11-21T22:59:59Z")), "live");
  assert.equal(C.pageMode(new Date("2026-11-21T23:00:00Z")), "closed");
  assert.equal(C.pageMode(new Date("2026-12-06T05:59:59Z")), "closed");
  assert.equal(C.pageMode(new Date("2026-12-06T06:00:00Z")), "thank_you");
  // Today (Oct 18 2026) the page is hidden: 404.
  assert.equal(C.pageMode(new Date("2026-10-18T12:00:00Z")), "hidden");
});

test("chat is suppressed on /10years from Nov 9 through Dec 5", () => {
  assert.equal(C.chatSuppressedOn10Years(new Date("2026-11-09T05:59:59Z")), false);
  assert.equal(C.chatSuppressedOn10Years(new Date("2026-11-09T06:00:00Z")), true);
  assert.equal(C.chatSuppressedOn10Years(new Date("2026-12-06T05:59:59Z")), true);
  assert.equal(C.chatSuppressedOn10Years(new Date("2026-12-06T06:00:00Z")), false);
});

/* ── The migration's seed is the config ─────────────────────────────── */

/* ── The prize ladder (Ben, 2026-11-03): one prize per drawing ─────── */

const VALUES = { mon: 194.95, tue: 444.95, wed: 569.95, thu: 668.95, fri: 819.95, grand: 2838.85 };

test("each prize's value is exactly Ben's figure, computed from the rates", () => {
  assert.equal(C.PRIZES.length, 6);
  assert.deepEqual(C.PRIZES.map((p) => p.slot), ["mon", "tue", "wed", "thu", "fri", "grand"]);
  for (const p of C.PRIZES) assert.equal(C.prizeRetailUsd(p), VALUES[p.slot], p.slot);
  assert.deepEqual([C.RATES.brainMap.usd, C.RATES.session.usd, C.RATES.brainMdBottle.usd, C.RATES.vibroChair.usd, C.RATES.hoolestMini.usd, C.RATES.hoolestVeRelief.usd], [150, 125, 44.95, 40, 99, 199]);
});

test("the six prizes total $5,537.60; the headline reads Over $5,500 and a test guards it", () => {
  assert.equal(C.prizeTotalUsd(), 5537.6);
  assert.equal(C.prizeTotalFloorUsd(), 5500);
  assert.ok(C.prizeTotalUsd() >= C.prizeTotalFloorUsd(), "the headline floor is never above the total");
  assert.ok(C.prizeTotalUsd() >= 5500, "Over $5,500 must stay true");
});

test("every breakdown sums exactly to its value; the parts in Ben's order", () => {
  const kinds = (slot) => C.prizeBreakdown(C.prizeFor(slot)).map((x) => [x.kind, x.count, x.usd]);
  assert.deepEqual(kinds("mon"), [["brainMap", 1, 150], ["brainMd", 1, 44.95]]);
  assert.deepEqual(kinds("tue"), [["brainMap", 1, 150], ["partner", 1, 250], ["brainMd", 1, 44.95]]);
  assert.deepEqual(kinds("wed"), [["brainMap", 1, 150], ["sessions", 3, 375], ["brainMd", 1, 44.95]]);
  assert.deepEqual(kinds("thu"), [["brainMap", 1, 150], ["sessions", 3, 375], ["hoolest", 1, 99], ["brainMd", 1, 44.95]]);
  assert.deepEqual(kinds("fri"), [["brainMap", 1, 150], ["sessions", 3, 375], ["partner", 1, 250], ["brainMd", 1, 44.95]]);
  assert.deepEqual(kinds("grand"), [["brainMap", 1, 150], ["sessions", 12, 1500], ["hoolest", 1, 199], ["chair", 12, 480], ["partner", 3, 375], ["brainMd", 3, 134.85]]);
  for (const p of C.PRIZES) assert.equal(C.breakdownSumUsd(C.prizeBreakdown(p)), C.prizeRetailUsd(p), p.slot);
});

test("partner gifts: named, valued, redeemed with the partner; the Friday session may be gifted; dates TBD until Ben supplies them", () => {
  const g = C.PARTNER_GIFTS;
  assert.deepEqual([g.skye.partner, g.skye.unitUsd, g.skye.count], ["Skye Chiropractic", 250, 1]);
  assert.match(g.amabel.gift, /90-minute one-to-one Women's Health & Life Coaching session with Amabel Luers of Be Well with Amabel/);
  assert.match(g.amabel.terms, /may gift this session to a woman of their choice/);
  assert.deepEqual([g.envision.count, g.envision.unitUsd], [3, 125]);
  assert.match(g.envision.gift, /Assisted Lymphatic Therapy sessions with Victoria Bailey of Envision Thermography & Wellness/);
  for (const x of Object.values(g)) assert.equal(x.validThrough, null, `${x.id}: no date supplied yet`);
});

test("prize names; no old items anywhere", () => {
  assert.equal(C.prizeName(C.prizeFor("mon")), "Brain Map + 1 BrainMD bottle");
  assert.equal(C.prizeName(C.prizeFor("thu")), "Brain Map + 3 LENS sessions + Hoolest Mini + 1 BrainMD bottle");
  const all = C.PRIZES.map((p) => `${C.prizeName(p)} ${C.prizeDescription(p)}`).join(" ");
  assert.doesNotMatch(all, /keychain|pocket|handheld|yours to keep|every partner|TBD/i);
  for (const d of Object.values(C.DEVICES)) assert.doesNotMatch(d.name, /relax|calm|stress|anxiety|sleep|focus|pain/i);
});

test("gift codes: one per day, GIFT-MON … GIFT-SAT, case-insensitive", () => {
  assert.deepEqual(Object.values(C.GIFT_CODES), ["GIFT-MON", "GIFT-TUE", "GIFT-WED", "GIFT-THU", "GIFT-FRI", "GIFT-SAT"]);
  assert.equal(C.giftCodeSlot("gift-sat"), "grand");
  assert.equal(C.giftCodeSlot("GIFT-SUN"), null);
  assert.equal(C.giftCodeSlot("10Y-ABC123"), null);
});

test("tax: only the grand prize alone reaches $2,000", () => {
  for (const p of C.PRIZES) assert.equal(C.prizeTaxFormRequired(p), p.slot === "grand", p.slot);
});

/* ── Migrations: 0010 and 0013 are applied and frozen; the newest sync is the config ── */

test("the newest prize-sync migration is exactly what the config generates", () => {
  const dir = new URL("../../supabase/migrations/", import.meta.url);
  const syncs = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort().filter((f) => syncBlockOf(readFileSync(new URL(f, dir), "utf8")));
  const newest = syncs[syncs.length - 1];
  assert.equal(newest, "0017_prize_ladder_and_giveaway_code.sql");
  const block = syncBlockOf(readFileSync(new URL(newest, dir), "utf8"));
  assert.equal(block, prizeSyncSql());
  assert.doesNotMatch(block, /env\s*=/, "every env");
  assert.match(block, /'grand', [^\n]*, 2838\.85, /);
});

