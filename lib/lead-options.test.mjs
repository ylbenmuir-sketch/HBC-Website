// Unit test for lib/lead-options.ts — the short step one's checks (Ben,
// 2026-10-26): any common US phone format is accepted; junk is not.
// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { looksLikeUsPhone, looksLikeEmail, isHeardAbout, isReferral, HEARD_ABOUT_OPTIONS } from "./lead-options.ts";

test("phone: every common US format is accepted", () => {
  for (const p of [
    "(615) 555-0134", "615-555-0134", "615.555.0134", "615 555 0134", "6155550134",
    "1-615-555-0134", "1 (615) 555-0134", "+1 615 555 0134", "+16155550134", "16155550134",
    "615-555-0134 x12", "(615) 555-0134 ext. 4", "615 555 0134 ext 204",
  ]) assert.equal(looksLikeUsPhone(p), true, p);
});

test("phone: too short, too long, letters, or a foreign 11-digit number is refused", () => {
  for (const p of ["555-0134", "615555013", "26155550134", "615555013499", "call me", "615-555-01a4", "sarah@example.com"]) {
    assert.equal(looksLikeUsPhone(p), false, p);
  }
});

test("email: loose shape check", () => {
  assert.equal(looksLikeEmail("zzfunneltest@example.com"), true);
  assert.equal(looksLikeEmail("no at sign"), false);
  assert.equal(looksLikeEmail("a@b"), false);
});

test("heard about: the seven answers, and the two referral ones", () => {
  assert.equal(HEARD_ABOUT_OPTIONS.length, 7);
  assert.equal(isHeardAbout("Google search"), true);
  assert.equal(isHeardAbout("google"), false);
  assert.deepEqual(HEARD_ABOUT_OPTIONS.filter(isReferral), ["Referral from a friend or family", "Referral from a doctor or provider"]);
});
