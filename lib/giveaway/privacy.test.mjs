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

test("staff alerts carry no client status; the day's gift code instead", () => {
  const emails = read("lib/giveaway/emails.ts");
  const staff = emails.slice(emails.indexOf("export type StaffWinner"));
  assert.doesNotMatch(staff, STATUS);
  assert.match(staff, /GIFT_CODES\[input\.drawing\.slot\]/);
  assert.doesNotMatch(read("lib/giveaway/notify.ts"), STATUS);
  assert.doesNotMatch(read("lib/giveaway/sends.ts"), /tuesdayJob|tuesday_call_today/);
});

test("the site never asks new or current (Ben, 2026-11-03): no form field, no picker, no analytics", () => {
  assert.doesNotMatch(read("components/giveaway/TenYearsView.tsx"), /existing_client|ClientChoice|PathPicker|VersionToggle/);
  assert.doesNotMatch(read("lib/giveaway/web.ts"), /existing_client/);
  assert.doesNotMatch(read("lib/analytics.ts"), /giveaway_path_pick|giveawayPathPickEvent/);
});

test("the people and offers exports omit it", () => {
  const admin = read("lib/giveaway/admin-data.ts");
  const exports = admin.slice(admin.indexOf('header = ["id", "created_at", "email"'));
  assert.doesNotMatch(exports, /is_existing_client/);
  assert.doesNotMatch(read("app/admin/10years/entries/page.tsx"), STATUS);
});
