// Unit tests for lib/giveaway/email-normalize.ts. Run: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeEmail, emailDomain } from "./email-normalize.ts";

test("lower-case; Gmail dots and +tags folded; googlemail is gmail", () => {
  assert.equal(normalizeEmail(" Sarah.Mitchell+10years@Gmail.com "), "sarahmitchell@gmail.com");
  assert.equal(normalizeEmail("s.a.r.a.h@googlemail.com"), "sarah@gmail.com");
  assert.equal(normalizeEmail("Sarah.Mitchell@Example.Test"), "sarah.mitchell@example.test");
  assert.equal(normalizeEmail("sarah+tag@example.test"), "sarah+tag@example.test");
});

test("rejects shapes that are not an address", () => {
  for (const bad of ["", "sarah", "sarah@", "@gmail.com", "a b@c.d", "+@gmail.com", "x".repeat(250) + "@a.bc"]) {
    assert.equal(normalizeEmail(bad), null, JSON.stringify(bad));
  }
});

test("emailDomain", () => {
  assert.equal(emailDomain("sarah@example.test"), "example.test");
});
