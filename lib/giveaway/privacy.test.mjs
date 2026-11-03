/**
 * Fix list rev 2, P1-8 (Ben, 2026-11-03): new/current-client status picks
 * the prize version and the gift and goes nowhere else — not into staff
 * alert emails, not to Google Analytics, not into the people or offers CSV
 * exports. The prize VERSION stays where fulfilment needs it (the winner
 * alert and the winners export). Official Rules §17 says so.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), "utf8");
const STATUS = /is_existing_client|isExistingClient|existing_client|existingClient/;

test("staff alerts carry no client status (the prize version stays)", () => {
  const emails = read("lib/giveaway/emails.ts");
  const staff = emails.slice(emails.indexOf("export type StaffWinner"));
  assert.doesNotMatch(staff, STATUS);
  assert.match(staff, /version: PrizeVersion/);
  assert.doesNotMatch(read("lib/giveaway/notify.ts"), STATUS);
  const sends = read("lib/giveaway/sends.ts");
  assert.doesNotMatch(sends.slice(sends.indexOf("async function tuesdayJob")), STATUS);
});

test("analytics never receives client status", () => {
  const a = read("lib/analytics.ts");
  const pick = a.split("\n").filter((l) => /giveaway_path_pick/.test(l)).join("\n");
  assert.ok(pick.length > 0);
  assert.doesNotMatch(pick, /choice|new|current|existing/i);
  const fn = a.slice(a.indexOf("export function giveawayPathPickEvent"), a.indexOf("}", a.indexOf("export function giveawayPathPickEvent")));
  assert.doesNotMatch(fn, /choice|existing/i);
  assert.doesNotMatch(read("components/giveaway/PathPicker.tsx").match(/trackEvent\([^)]*\)\)?/g).join(" "), /new|current|choice/);
});

test("the people and offers exports omit it; the winners export keeps prize_version", () => {
  const admin = read("lib/giveaway/admin-data.ts");
  const exports = admin.slice(admin.indexOf('header = ["id", "created_at", "email"'));
  assert.doesNotMatch(exports, /is_existing_client/);
  assert.match(exports, /"prize_version"/);
  assert.doesNotMatch(read("app/admin/10years/entries/page.tsx"), STATUS);
});
