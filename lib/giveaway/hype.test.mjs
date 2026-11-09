/**
 * The drawing-week countdown emails (Ben, 2026-11-04): Mon–Fri 4 pm and
 * Sat 9 am. The countdown is calendar days to the grand drawing; every
 * value and time comes from config; the body is only what Ben's mockup has.
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

process.env.GIVEAWAY_HIDE_DRAFT_TAGS = "1";
const C = await import("./config.ts");
const E = await import("./emails.ts");
const S = await import("./sends.ts");
const { EMAILS } = await import("./copy.ts");

const footing = { identityLine: "Harmonized Brain Centers · 197 Thompson Ln, Suite S, Nashville, TN 37211", siteUrl: "https://example.test", unsubscribeUrl: "https://example.test/unsubscribe?t=X" };
const mail = (day, entries = 4) => E.hypeEmail({ day, entries, referralUrl: "https://example.test/10years?ref=HBC-AAAAAA", footing });
const strip = (html) => html.replace(/<style>[\s\S]*?<\/style>/, "").replace(/<[^>]+>/g, " ").replace(/&bull;/g, "•").replace(/\s+/g, " ");

test("countdown: Mon 5 DAYS, Tue 4, Wed 3, Thu 2, Fri TOMORROW, Sat TODAY", () => {
  assert.deepEqual(E.HYPE_DAYS.map(E.hypeDaysLeft), [5, 4, 3, 2, 1, 0]);
  const labels = E.HYPE_DAYS.map((d) => EMAILS.hype.countdown(E.hypeDaysLeft(d)));
  assert.deepEqual(labels, ["5 DAYS", "4 DAYS", "3 DAYS", "2 DAYS", "TOMORROW", "TODAY"]);
  for (const [i, d] of E.HYPE_DAYS.entries()) assert.match(mail(d).html, new RegExp(`>${labels[i]}<`), d);
});

test("send times: the five 4 pm dailies and Saturday 9 am, one job each", () => {
  assert.deepEqual(
    E.HYPE_DAYS.map((d) => C.formatCentralLabel(E.hypeSendAt(d))),
    ["Mon Nov 16, 4:00 PM CT", "Tue Nov 17, 4:00 PM CT", "Wed Nov 18, 4:00 PM CT", "Thu Nov 19, 4:00 PM CT", "Fri Nov 20, 4:00 PM CT", "Sat Nov 21, 9:00 AM CT"]
  );
  for (const d of E.HYPE_DAYS) assert.equal(S.dueAt(`daily_${d}`).getTime(), E.hypeSendAt(d).getTime(), d);
  assert.ok(E.hypeSendAt("sat") < C.drawing("grand").at, "Saturday's goes out before the grand drawing");
});

test("subjects and preview lines agree with the countdown", () => {
  assert.deepEqual(
    E.HYPE_DAYS.map((d) => mail(d).subject),
    [
      "5 days to the $2,839 grand prize",
      "4 days to the $2,839 grand prize",
      "3 days to the $2,839 grand prize",
      "2 days to the $2,839 grand prize",
      "Tomorrow at 5 PM: the $2,839 grand prize",
      "Today at 5 PM: the $2,839 grand prize",
    ]
  );
  assert.equal(mail("mon").preheader, "You're entered. It's drawn Saturday at 5 PM.");
  assert.equal(mail("tue").preheader, "A friend who joins today is in four drawings.");
  assert.equal(mail("sat", 7).preheader, "You're entered with 7 entries.");
});

test("the value is computed, the bullets are the grand prize, the openers are short", () => {
  assert.equal(C.prizeRetailUsd(C.prizeFor("grand")), 2838.85);
  assert.deepEqual(E.grandPrizeBullets(), ["Brain Map", "12 LENS sessions + vibro chair", "Hoolest VeRelief", "3 lymphatic therapy sessions", "3 BrainMD bottles"]);
  for (const d of E.HYPE_DAYS) {
    const t = strip(mail(d).html);
    for (const b of E.grandPrizeBullets()) assert.ok(t.includes(`• ${b}`), `${d}: ${b}`);
    assert.ok(t.includes("Grand prize · Saturday 5 PM"), d);
    assert.ok(EMAILS.hype.opener[d].split(/\s+/).length <= 8, `${d} opener ≤ 8 words`);
  }
});

test("Tomorrow · Noon: Mon–Thu only, the next daily prize and its value", () => {
  const rows = {
    mon: ["Brain Map + Skye Chiropractic gift + BrainMD", "$445"],
    tue: ["Brain Map + 3 LENS + BrainMD", "$570"],
    wed: ["Brain Map + 3 LENS + Hoolest Mini + BrainMD", "$669"],
    thu: ["Brain Map + 3 LENS + Amabel coaching + BrainMD", "$820"],
  };
  for (const d of E.HYPE_DAYS) {
    const t = strip(mail(d).html);
    if (rows[d]) {
      assert.ok(t.includes("Tomorrow · Noon"), d);
      assert.ok(t.includes(rows[d][0]) && t.includes(rows[d][1]), `${d}: ${t}`);
    } else assert.ok(!t.includes("Tomorrow ·"), d);
  }
});

test("the entrant's own count sits above the button; hints by day", () => {
  assert.match(strip(mail("tue", 1).html), /You have 1 entry Share and get 3 more entries Each friend who enters adds 3 to yours\./);
  assert.match(strip(mail("tue", 13).html), /You have 13 entries Share and get 3 more entries/);
  assert.ok(strip(mail("fri").html).includes("Friends must enter by 5 PM tomorrow."));
  assert.ok(strip(mail("sat").html).includes("Friends can enter until 5 PM. Thank-you gift arrives at 7 PM."));
  assert.ok(mail("wed").html.includes('href="https://example.test/10years?ref=HBC-AAAAAA"'));
});

test("nothing else in the body: no winner talk, no gift named, unsubscribe + address in the footer", () => {
  for (const d of E.HYPE_DAYS) {
    const e = mail(d);
    const t = strip(e.html);
    assert.doesNotMatch(t, /winner|you won|first visit|13th|being called/i, d);
    assert.ok(e.html.includes('href="https://example.test/unsubscribe?t=X"') && t.includes("197 Thompson Ln"), d);
    assert.match(e.text, /Unsubscribe: https:\/\/example\.test\/unsubscribe/, d);
  }
});

test("email-safe: 600px max, tables, no external CSS or web fonts", () => {
  const h = mail("mon").html;
  assert.match(h, /max-width:600px/);
  assert.doesNotMatch(h, /<link|@import|@font-face|<script/);
  assert.equal(C.HYPE_PRIZE_PHOTO_URL, null, "update this test (and remove the placeholder) when a photo is set");
  assert.match(h, /PRIZE PHOTO/);
});
