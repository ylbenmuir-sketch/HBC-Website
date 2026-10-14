// Unit test for lib/name-case.ts. Run: npm test
//
// .mjs rather than .ts so the Next type-check never sees an import that ends
// in ".ts", which it would reject.

import { test } from "node:test";
import assert from "node:assert/strict";
import { capitalizeName } from "./name-case.ts";

test("first letter of every word goes up", () => {
  assert.equal(capitalizeName("ben muir"), "Ben Muir");
  assert.equal(capitalizeName("sarah jane mitchell"), "Sarah Jane Mitchell");
  assert.equal(capitalizeName("ben"), "Ben");
});

test("nothing is ever lowered", () => {
  assert.equal(capitalizeName("mcDonald"), "McDonald");
  assert.equal(capitalizeName("McDonald"), "McDonald");
  assert.equal(capitalizeName("mcdonald"), "Mcdonald");
  assert.equal(capitalizeName("BEN MUIR"), "BEN MUIR");
  assert.equal(capitalizeName("deShawn o'NEIL"), "DeShawn O'NEIL");
  assert.equal(capitalizeName("Ben Muir"), "Ben Muir");
});

test("a hyphen starts a word; an apostrophe does not", () => {
  assert.equal(capitalizeName("ana smith-jones"), "Ana Smith-Jones");
  assert.equal(capitalizeName("o'brien"), "O'brien");
});

test("whitespace collapses and the ends are trimmed", () => {
  assert.equal(capitalizeName("  ben   muir \n"), "Ben Muir");
  assert.equal(capitalizeName(""), "");
});

test("letters beyond ASCII", () => {
  assert.equal(capitalizeName("élodie ñúñez"), "Élodie Ñúñez");
  assert.equal(capitalizeName("zoë"), "Zoë");
});

test("non-letters are left alone", () => {
  assert.equal(capitalizeName("e2e-x-save-320 tester"), "E2e-X-Save-320 Tester");
  assert.equal(capitalizeName("TEST ben"), "TEST Ben");
});
