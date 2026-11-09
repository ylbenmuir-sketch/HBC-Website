/**
 * The two emails a form submit sends (Ben, 2026-11-09): "You're on the list" (a reminder,
 * not an entry) and "You're in" (the entry). Both carry the one-click unsubscribe; only the
 * entry email says "entered". And production links never point at a vercel.app preview.
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
const E = await import("./emails.ts");
const C = await import("./config.ts");
const S = await import("./send.ts");

const footing = { identityLine: "Harmonized Brain Centers · Nashville, TN", siteUrl: "https://harmonizedbraincenterstn.com", unsubscribeUrl: "https://harmonizedbraincenterstn.com/unsubscribe?t=X" };

test("You're on the list: reminder wording, the new small line, the unsubscribe link (HTML and text)", () => {
  const m = E.notifyOnListEmail({ firstName: "Ann", pageUrl: "https://harmonizedbraincenterstn.com/10years", footing });
  for (const body of [m.text, m.html]) {
    assert.match(body, /You(?:'|&#39;|&#x27;)re getting this because you asked for a reminder about the 10-year giveaway at/);
    assert.doesNotMatch(body, /because you entered/);
    assert.match(body, /Didn(?:'|&#39;|&#x27;)t sign up\? Ignore this email or unsubscribe below\./);
    assert.doesNotMatch(body, /Every reminder after it/);
    assert.match(body, /harmonizedbraincenterstn\.com\/unsubscribe\?t=X/);
  }
});

test("You're in: keeps the 'entered' wording and carries the unsubscribe link", () => {
  const m = E.youreInEmail({ firstName: "Ann", referredBonus: false, nextDrawing: C.DRAWINGS[0], referralUrl: "https://harmonizedbraincenterstn.com/10years?ref=HBC-AAAAAA", footing });
  assert.match(m.text, /because you entered the 10-year giveaway at/);
  assert.doesNotMatch(m.text, /asked for a reminder/);
  assert.match(m.text, /unsubscribe\?t=X/);
});

test("siteUrl: production never uses a vercel.app address; previews keep theirs", () => {
  assert.equal(S.siteUrl({ VERCEL_ENV: "production", GIVEAWAY_SITE_URL: "https://hbc-website-git-x-team.vercel.app" }), "https://harmonizedbraincenterstn.com");
  assert.equal(S.siteUrl({ VERCEL_ENV: "production", GIVEAWAY_SITE_URL: "https://harmonizedbraincenterstn.com/" }), "https://harmonizedbraincenterstn.com");
  assert.equal(S.siteUrl({ VERCEL_ENV: "preview", GIVEAWAY_SITE_URL: "https://hbc-website-git-x-team.vercel.app" }), "https://hbc-website-git-x-team.vercel.app");
});

/* ── The new look (Ben, 2026-11-09) ──────────────────────────────────── */
const { statSync } = await import("node:fs");
const CAL = await import("./calendar.ts");

test("notify email: one hosted image (the banner, with alt text), under ~100 KB with it", () => {
  const m = E.notifyOnListEmail({ firstName: "Ann", pageUrl: "https://harmonizedbraincenterstn.com/10years", footing });
  const imgs = m.html.match(/<img\b[^>]*>/g) ?? [];
  assert.equal(imgs.length, 1);
  assert.match(imgs[0], /src="https:\/\/harmonizedbraincenterstn\.com\/email\/10years-banner\.png"/);
  assert.match(imgs[0], /alt="Harmonized Brain Centers — 10-year giveaway"/);
  assert.doesNotMatch(m.html, /cid:|data:image/);
  const banner = statSync(new URL("../../public/email/10years-banner.png", import.meta.url)).size;
  assert.ok(Buffer.byteLength(m.html) + banner < 100_000, `${Buffer.byteLength(m.html)} + ${banner}`);
});

test("notify email: the prize teaser comes from config (total, grand + the two richest daily prizes)", () => {
  const m = E.notifyOnListEmail({ firstName: "Ann", pageUrl: "https://harmonizedbraincenterstn.com/10years", footing });
  assert.match(m.text, new RegExp(`Over \\$${C.prizeTotalFloorUsd().toLocaleString("en-US").replace(",", "\\,")} in prizes`));
  const h = E.notifyHighlights();
  assert.equal(h.length, 3);
  assert.match(h[0].label, /Grand prize/);
  const want = (slot) => `$${Math.round(C.prizeRetailUsd(C.prizeFor(slot))).toLocaleString("en-US")}`;
  assert.equal(h[0].value, want("grand"));
  const daily = C.DRAWINGS.filter((d) => d.kind === "daily").map((d) => C.prizeRetailUsd(C.prizeFor(d.slot))).sort((a, b) => b - a);
  assert.deepEqual(h.slice(1).map((x) => Number(x.value.replace(/[$,]/g, ""))), daily.slice(0, 2).map(Math.round));
  assert.ok(h.every((x) => /^\$[\d,]+$/.test(x.value)), "whole dollars");
  assert.equal(h[0].value, "$2,839");
  for (const x of h) assert.ok(m.text.includes(x.value) && m.html.includes(x.value));
});

test("notify email: date block, both calendar links and the share link carry the UTM tags", () => {
  const m = E.notifyOnListEmail({ firstName: "Ann", pageUrl: "https://harmonizedbraincenterstn.com/10years", footing });
  assert.match(m.text, /SUNDAY · NOV 15 · 6 PM CENTRAL — Entries open/);
  assert.match(m.text, /\/10years\/calendar\/google\?utm_source=email&utm_medium=giveaway&utm_campaign=notify_calendar/);
  assert.match(m.text, /\/10years\/entries-open\.ics\?utm_source=email&utm_medium=giveaway&utm_campaign=notify_calendar/);
  assert.match(m.text, /Know someone who'd love this\? Share the giveaway: https:\/\/harmonizedbraincenterstn\.com\/10years\?utm_source=email&utm_medium=referral&utm_campaign=notify_share/);
  assert.match(m.html, /utm_campaign=notify_share/);
});

test("the other giveaway emails share the banner and footer, wording unchanged", () => {
  const y = E.youreInEmail({ firstName: "Ann", referredBonus: false, nextDrawing: C.DRAWINGS[0], referralUrl: "https://x.test/r", footing });
  const l = E.itsLiveEmail({ firstName: "Ann", enterUrl: "https://x.test/e", firstDrawing: C.DRAWINGS[0], footing });
  for (const m of [y, l]) {
    assert.equal((m.html.match(/<img\b/g) ?? []).length, 1);
    assert.match(m.html, /10years-banner\.png/);
    assert.match(m.html, /197 Thompson Ln|Harmonized Brain Centers · /);
  }
});

test("calendar: a 15-minute event at entries open, UTC, the /10years link in its description; Google link matches", () => {
  const e = CAL.entriesOpenEvent("https://harmonizedbraincenterstn.com");
  assert.equal(e.start.toISOString(), C.SCHEDULE.entriesOpen.at.toISOString());
  assert.equal(e.end - e.start, 15 * 60_000);
  assert.equal(e.title, "HBC 10-year giveaway — entries open");
  const ics = CAL.icsText(e, new Date("2026-11-09T12:00:00Z"));
  assert.match(ics, /DTSTART:20261116T000000Z\r\nDTEND:20261116T001500Z/);
  assert.ok(ics.split("\r\n").every((l) => Buffer.byteLength(l, "utf8") <= 75), "lines folded at 75 octets");
  assert.match(ics.replace(/\r\n /g, ""), /DESCRIPTION:.*https:\/\/harmonizedbraincenterstn\.com\/10years\?utm_source=email&utm_medium=giveaway&utm_campaign=notify_calendar/);
  const g = new URL(CAL.googleCalendarUrl(e));
  assert.equal(g.searchParams.get("dates"), "20261116T000000Z/20261116T001500Z");
  assert.equal(g.searchParams.get("ctz"), "America/Chicago");
});
