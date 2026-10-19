// Unit tests for lib/giveaway/zip.ts. Run: npm test

import { test } from "node:test";
import assert from "node:assert/strict";
import { isTennesseeZip, publicLabel, zipInfo } from "./zip.ts";

test("Tennessee is 37010–38589, five digits only", () => {
  assert.equal(isTennesseeZip("37064"), true);
  assert.equal(isTennesseeZip("38589"), true);
  assert.equal(isTennesseeZip("37010"), true);
  assert.equal(isTennesseeZip("37009"), false);
  assert.equal(isTennesseeZip("38590"), false);
  assert.equal(isTennesseeZip("90210"), false);
  assert.equal(isTennesseeZip("3706"), false);
  assert.equal(isTennesseeZip("37064-1234"), false);
  assert.equal(isTennesseeZip("abcde"), false);
});

test("city and nearer center", () => {
  assert.deepEqual(zipInfo("37064"), { zip: "37064", tennessee: true, city: "Franklin", nearestCenter: "nashville" });
  assert.deepEqual(zipInfo("37130"), { zip: "37130", tennessee: true, city: "Murfreesboro", nearestCenter: "murfreesboro" });
  assert.deepEqual(zipInfo("37167"), { zip: "37167", tennessee: true, city: "Smyrna", nearestCenter: "murfreesboro" });
  assert.deepEqual(zipInfo("37211"), { zip: "37211", tennessee: true, city: "Nashville", nearestCenter: "nashville" });
  assert.deepEqual(zipInfo("37402"), { zip: "37402", tennessee: true, city: "Chattanooga", nearestCenter: "murfreesboro" });
  assert.deepEqual(zipInfo("38104"), { zip: "38104", tennessee: true, city: "Memphis", nearestCenter: "nashville" });
  // Unlisted Middle Tennessee → no city, Nashville.
  assert.deepEqual(zipInfo("37033"), { zip: "37033", tennessee: true, city: null, nearestCenter: "nashville" });
  // Outside the state → nothing.
  assert.deepEqual(zipInfo("30301"), { zip: "30301", tennessee: false, city: null, nearestCenter: null });
});

test("public label", () => {
  assert.equal(publicLabel("Jane", "Doe", "Franklin"), "Jane D., Franklin");
  assert.equal(publicLabel("Jane", "doe", null), "Jane D., Tennessee");
  assert.equal(publicLabel(" Jane ", "", "Smyrna"), "Jane, Smyrna");
});
