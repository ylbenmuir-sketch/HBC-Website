// Unit tests for lib/giveaway/config.ts: every instant matches its Central
// label (CST, UTC−6 across the whole window), the six drawings, the
// claim-deadline rule (72 h; Sunday/Monday → Tuesday 5 pm CT), the prize
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
const { seedSql, seedBlockOf, prizeSyncSql, syncBlockOf } = await import("./seed-sql.ts");
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
  assert.equal(C.SCHEDULE.tuesdayCallToday.at.toISOString(), "2026-11-17T14:30:00.000Z");
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

test("prize values for the page: Monday $480, Wednesday $810 (pocket device TBD), the week over $6,000", () => {
  assert.equal(C.prizeRetailUsd(C.prizeFor("mon", "new_client")), 480);
  assert.equal(C.prizeRetailUsd(C.prizeFor("wed", "new_client")), 810);
  assert.equal(C.prizeHasUnpricedParts(C.prizeFor("wed", "new_client")), true, "pocket device + partner are TBD");
  assert.equal(C.prizeRetailUsd(C.prizeFor("grand", "new_client")), 150 + 12 * 165 + 399);
  const sum = C.PRIZES.filter((p) => p.version === "new_client").reduce((t, p) => t + C.prizeRetailUsd(p), 0);
  assert.equal(sum, 6744);
  assert.equal(C.prizeTotalFloorUsd(), 6000);
  assert.equal(C.prizeTotalFloorUsd("current_client"), Math.floor(C.PRIZES.filter((p) => p.version === "current_client").reduce((t, p) => t + C.prizeRetailUsd(p), 0) / 1000) * 1000);
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

test("the headline floor holds: the SMALLEST six-prize total (all current-client versions) is at least $6,000", () => {
  // "Over $6,000 in prizes" must stay true whichever version every winner
  // turns out to be. If a rate drops (the Hoolest went $429 → $399 on
  // 2026-11-03) this fails before the page can say something false.
  const min = C.PRIZES.filter((p) => p.version === "current_client").reduce((t, p) => t + C.prizeRetailUsd(p), 0);
  const max = C.PRIZES.filter((p) => p.version === "new_client").reduce((t, p) => t + C.prizeRetailUsd(p), 0);
  assert.equal(min, 6009);
  assert.equal(max, 6744);
  assert.ok(min >= 6000, `smallest total $${min} is under the $6,000 headline`);
  assert.ok(min >= C.prizeTotalFloorUsd("new_client"), "the headline floor is no higher than the smallest total");
  assert.equal(C.prizeTotalFloorUsd("new_client"), 6000);
  assert.equal(C.prizeTotalFloorUsd("current_client"), 6000);
});

test("grand prize after the Hoolest price change: $2,529 new client, $2,544 current client", () => {
  assert.equal(C.RATES.hoolestHandheld.usd, 399);
  assert.equal(C.prizeRetailUsd(C.prizeFor("grand", "new_client")), 2529);
  assert.equal(C.prizeRetailUsd(C.prizeFor("grand", "current_client")), 2544);
});

/* ── Claim deadline (decision 18) ───────────────────────────────────── */

test("claim deadline: 72 h, except Sunday/Monday → the following Tuesday 5 pm CT", () => {
  const dl = (slot) => C.claimDeadline(C.drawing(slot).at);
  assert.equal(C.formatCentralLabel(dl("mon")), "Thu Nov 19, 12:00 PM CT");
  assert.equal(C.formatCentralLabel(dl("tue")), "Fri Nov 20, 12:00 PM CT");
  assert.equal(C.formatCentralLabel(dl("wed")), "Sat Nov 21, 12:00 PM CT");
  // Thursday noon + 72 h = Sunday noon → Tuesday.
  assert.equal(C.formatCentralLabel(dl("thu")), "Tue Nov 24, 5:00 PM CT");
  // Friday noon + 72 h = Monday noon → Tuesday.
  assert.equal(C.formatCentralLabel(dl("fri")), "Tue Nov 24, 5:00 PM CT");
  // Saturday 5 pm + 72 h = Tuesday 5 pm — already right.
  assert.equal(C.formatCentralLabel(dl("grand")), "Tue Nov 24, 5:00 PM CT");
  assert.equal(dl("grand").toISOString(), "2026-11-24T23:00:00.000Z");
  // A redraw drawn Saturday 9:30 pm lands Tuesday 9:30 pm — not Sun/Mon, so untouched.
  assert.equal(C.formatCentralLabel(C.claimDeadline(new Date("2026-11-22T03:30:00Z"))), "Tue Nov 24, 9:30 PM CT");
  // A redraw drawn Sunday 3 pm would land Wednesday 3 pm — untouched.
  assert.equal(C.formatCentralLabel(C.claimDeadline(new Date("2026-11-22T21:00:00Z"))), "Wed Nov 25, 3:00 PM CT");
  // A redraw drawn Thursday 9 pm would land Sunday 9 pm → Tuesday 5 pm.
  assert.equal(C.formatCentralLabel(C.claimDeadline(new Date("2026-11-20T03:00:00Z"))), "Tue Nov 24, 5:00 PM CT");
  // A redraw drawn Tuesday 9 am → Friday 9 am, untouched.
  assert.equal(C.formatCentralLabel(C.claimDeadline(new Date("2026-11-17T15:00:00Z"))), "Fri Nov 20, 9:00 AM CT");
});

/* ── Prizes and rates (decision 16) ─────────────────────────────────── */

test("twelve prizes, two versions per slot, new_client has the Brain Map", () => {
  assert.equal(C.PRIZES.length, 12);
  for (const d of C.DRAWINGS) {
    const n = C.prizeFor(d.slot, "new_client");
    const c = C.prizeFor(d.slot, "current_client");
    assert.equal(n.brainMap, true);
    assert.equal(c.brainMap, false);
    assert.equal(n.vibroChair && c.vibroChair, true, "every prize session includes the chair");
  }
  assert.equal(C.prizeFor("grand", "new_client").sessions, 12);
  assert.equal(C.prizeFor("grand", "current_client").sessions, 13);
  assert.equal(C.prizeVersionFor(true), "current_client");
  assert.equal(C.prizeVersionFor(false), "new_client");
});

test("retail values are sums of the rates, never hand-typed", () => {
  const { brainMap, session, vibroChair, hoolestHandheld } = C.RATES;
  const per = session.usd + vibroChair.usd; // 165
  assert.equal(C.prizeRetailUsd(C.prizeFor("mon", "new_client")), brainMap.usd + 2 * per); // 480
  assert.equal(C.prizeRetailUsd(C.prizeFor("mon", "current_client")), 2 * per); // 330
  assert.equal(C.prizeRetailUsd(C.prizeFor("tue", "new_client")), 645);
  assert.equal(C.prizeRetailUsd(C.prizeFor("tue", "current_client")), 495);
  // Keychain retail is unconfirmed and unset → counts $0.
  assert.equal(C.prizeRetailUsd(C.prizeFor("wed", "new_client")), brainMap.usd + 4 * per);
  assert.equal(C.prizeRetailUsd(C.prizeFor("fri", "current_client")), 7 * per);
  assert.equal(C.prizeRetailUsd(C.prizeFor("grand", "new_client")), brainMap.usd + 12 * per + hoolestHandheld.usd); // 2529
  assert.equal(C.prizeRetailUsd(C.prizeFor("grand", "current_client")), 13 * per + hoolestHandheld.usd); // 2544
  // A changed rate changes every value: the keychain at $60 adds $60 to Wed–Fri.
  const rates = { ...C.RATES, hoolestKeychain: { usd: 60, confirmed: true } };
  assert.equal(C.prizeRetailUsd(C.prizeFor("wed", "current_client"), rates), 4 * per + 60);
  assert.equal(C.prizeRetailUsd(C.prizeFor("mon", "current_client"), rates), 2 * per);
  // Practitioner cost: $35 per session and per map.
  assert.equal(C.prizePractitionerCostUsd(C.prizeFor("mon", "new_client")), 3 * 35);
  assert.equal(C.prizePractitionerCostUsd(C.prizeFor("grand", "current_client")), 13 * 35);
  // The handheld's $399 is confirmed (Hoolest's published price, Ben 2026-11-03); only the keychain is open.
  assert.deepEqual(C.prizeUnconfirmedRates(C.prizeFor("grand", "new_client")), []);
  assert.deepEqual(C.prizeUnconfirmedRates(C.prizeFor("wed", "new_client")), ["hoolestKeychain"]);
  assert.deepEqual(C.prizeUnconfirmedRates(C.prizeFor("mon", "new_client")), []);
});

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

test("prize names read as Ben wrote them", () => {
  assert.equal(C.prizeName(C.prizeFor("mon", "new_client")), "Brain Map + 2 sessions");
  assert.equal(C.prizeName(C.prizeFor("wed", "current_client")), "4 sessions + Pocket vagus nerve stimulator by Hoolest");
  assert.equal(
    C.prizeName(C.prizeFor("grand", "new_client")),
    "Brain Map + 12 sessions + Handheld vagus nerve stimulator by Hoolest (yours to keep)"
  );
  assert.equal(C.prizeDescription(C.prizeFor("mon", "current_client")), "2 LENS sessions (every session includes the vibro chair)");
  assert.equal(C.prizeDescription(C.prizeFor("grand", "current_client")), "13 LENS sessions and a handheld vagus nerve stimulator by Hoolest, yours to keep (every session includes the vibro chair)");
  // Partner prizes are TBD (fix list rev 2): no name promises them.
  for (const p of C.PRIZES) assert.doesNotMatch(`${C.prizeName(p)} ${C.prizeDescription(p)}`, /partner/i);
  // The devices are named by what they are, never by what they do.
  for (const d of Object.values(C.DEVICES)) assert.doesNotMatch(d.name, /relax|calm|stress|anxiety|sleep|focus/i);
});

test("the breakdown: one row per part, the chair at $40 a session, TBD parts null and out of the sum, every sum = its value", () => {
  const mon = C.prizeBreakdown(C.prizeFor("mon", "new_client"));
  assert.deepEqual(mon.map((x) => [x.kind, x.count, x.usd]), [["brainMap", 1, 150], ["sessions", 2, 250], ["chair", 2, 80], ["partner", 1, null]]);
  assert.equal(mon.find((x) => x.kind === "chair").unitUsd, 40);
  const wed = C.prizeBreakdown(C.prizeFor("wed", "current_client"));
  assert.deepEqual(wed.map((x) => [x.kind, x.usd]), [["sessions", 500], ["chair", 160], ["keychain", null], ["partner", null]]);
  const grand = C.prizeBreakdown(C.prizeFor("grand", "new_client"));
  assert.deepEqual(grand.map((x) => [x.kind, x.usd]), [["brainMap", 150], ["sessions", 1500], ["chair", 480], ["handheld", 399], ["partner", null]]);
  // Every breakdown, both versions, sums exactly to the value the page shows.
  for (const p of C.PRIZES) {
    const parts = C.prizeBreakdown(p);
    assert.equal(C.breakdownSumUsd(parts), C.prizeRetailUsd(p), `${p.slot}/${p.version}`);
    const chair = parts.find((x) => x.kind === "chair");
    assert.equal(chair.usd, p.sessions * 40, `${p.slot}/${p.version} chair`);
  }
});

test("partners: six slots, none shown until named", () => {
  assert.equal(C.PARTNERS.length, 6);
  assert.deepEqual(C.PARTNERS.map((p) => p.slot), ["mon", "tue", "wed", "thu", "fri", "grand"]);
  for (const d of C.DRAWINGS) assert.equal(C.partnerFor(d.slot), null, `${d.slot} partner is TBD and hidden`);
});

/* ── Offer, modes, chat window ──────────────────────────────────────── */

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

test("migration 0010's seed block is exactly what the config generates", () => {
  const sql = readFileSync(new URL("../../supabase/migrations/0010_giveaway.sql", import.meta.url), "utf8");
  const block = seedBlockOf(sql);
  assert.ok(block, "seed markers present");
  assert.equal(block, seedSql());
  // Six drawings and twelve prizes per env, four envs.
  assert.equal((block.match(/:00:00\.000Z'\),? -- /g) ?? []).length, 6 * 4);
  assert.equal((block.match(/_client', '/g) ?? []).length, 12 * 4);
  // 'giveaway' joins the source constraint, and nothing is dropped except
  // that constraint (additive migration).
  assert.match(sql, /check \(source in \('form', 'chat', 'giveaway'\)\)/);
  const drops = sql.match(/^\s*(drop|alter table [^\n]* drop)\b.*$/gim) ?? [];
  assert.deepEqual(drops.map((d) => d.trim()), ["drop constraint if exists consultation_requests_source_check;"]);
});

test("the newest prize-sync migration (0013) is exactly what the config generates", () => {
  const sql = readFileSync(new URL("../../supabase/migrations/0013_giveaway_prize_values.sql", import.meta.url), "utf8");
  const block = syncBlockOf(sql);
  assert.ok(block, "sync markers present");
  assert.equal(block, prizeSyncSql());
  // No env filter: every env's rows follow config.
  assert.doesNotMatch(block, /env\s*=/);
  assert.match(block, /'grand', 'new_client', [^\n]*, 2529, /);
  assert.match(block, /'grand', 'current_client', [^\n]*, 2544, /);
});
