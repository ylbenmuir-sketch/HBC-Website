// Unit tests for lib/giveaway/zip.ts. Run: npm test

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

const { isEligibleZip, isTennesseeZip, publicLabel, stateOfZip, zipInfo } = await import("./zip.ts");
const { ELIGIBLE_STATES, ELIGIBLE_STATE_CODES, eligibilityPhrase } = await import("./config.ts");

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

test("the eligible states are Tennessee and its eight neighbours, in one list", () => {
  assert.deepEqual(ELIGIBLE_STATE_CODES, ["TN", "KY", "VA", "NC", "GA", "AL", "MS", "AR", "MO"]);
  assert.equal(ELIGIBLE_STATES[0].name, "Tennessee");
  assert.equal(eligibilityPhrase(), "Tennessee and neighboring states (KY, VA, NC, GA, AL, MS, AR, MO)");
});

test("ZIP → state for all nine states; outside them → null", () => {
  const cases = [
    ["37064", "TN"], ["38104", "TN"], ["40202", "KY"], ["42101", "KY"], ["20101", "VA"], ["23220", "VA"], ["24201", "VA"],
    ["27601", "NC"], ["28801", "NC"], ["30301", "GA"], ["39901", "GA"], ["35203", "AL"], ["36602", "AL"],
    ["38671", "MS"], ["39201", "MS"], ["72201", "AR"], ["71601", "AR"], ["63101", "MO"], ["65801", "MO"],
  ];
  for (const [zip, state] of cases) assert.equal(stateOfZip(zip), state, zip);
  for (const zip of ["43215", "90210", "10001", "33101", "70112", "25301", "19103", "3706", "abcde"]) assert.equal(stateOfZip(zip), null, zip);
  assert.equal(isEligibleZip("40202"), true);
  assert.equal(isEligibleZip("43215"), false);
});

test("city and nearer center, in and out of state", () => {
  assert.deepEqual(zipInfo("37064"), { zip: "37064", eligible: true, state: "TN", city: "Franklin", nearestCenter: "nashville" });
  assert.deepEqual(zipInfo("37130"), { zip: "37130", eligible: true, state: "TN", city: "Murfreesboro", nearestCenter: "murfreesboro" });
  assert.deepEqual(zipInfo("37167"), { zip: "37167", eligible: true, state: "TN", city: "Smyrna", nearestCenter: "murfreesboro" });
  assert.deepEqual(zipInfo("37211"), { zip: "37211", eligible: true, state: "TN", city: "Nashville", nearestCenter: "nashville" });
  assert.deepEqual(zipInfo("37402"), { zip: "37402", eligible: true, state: "TN", city: "Chattanooga", nearestCenter: "murfreesboro" });
  assert.deepEqual(zipInfo("38104"), { zip: "38104", eligible: true, state: "TN", city: "Memphis", nearestCenter: "nashville" });
  // Unlisted Middle Tennessee → no city, Nashville.
  assert.deepEqual(zipInfo("37033"), { zip: "37033", eligible: true, state: "TN", city: null, nearestCenter: "nashville" });
  // The neighbours: a metro each, and an unlisted ZIP routed by the road in.
  assert.deepEqual(zipInfo("40202"), { zip: "40202", eligible: true, state: "KY", city: "Louisville", nearestCenter: "nashville" });
  assert.deepEqual(zipInfo("42101"), { zip: "42101", eligible: true, state: "KY", city: "Bowling Green", nearestCenter: "nashville" });
  assert.deepEqual(zipInfo("35801"), { zip: "35801", eligible: true, state: "AL", city: "Huntsville", nearestCenter: "murfreesboro" });
  assert.deepEqual(zipInfo("30301"), { zip: "30301", eligible: true, state: "GA", city: "Atlanta", nearestCenter: "murfreesboro" });
  assert.deepEqual(zipInfo("38671"), { zip: "38671", eligible: true, state: "MS", city: "Southaven", nearestCenter: "nashville" });
  assert.deepEqual(zipInfo("72201"), { zip: "72201", eligible: true, state: "AR", city: "Little Rock", nearestCenter: "nashville" });
  assert.deepEqual(zipInfo("63101"), { zip: "63101", eligible: true, state: "MO", city: "St. Louis", nearestCenter: "nashville" });
  assert.deepEqual(zipInfo("28801"), { zip: "28801", eligible: true, state: "NC", city: "Asheville", nearestCenter: "murfreesboro" });
  assert.deepEqual(zipInfo("24201"), { zip: "24201", eligible: true, state: "VA", city: "Bristol", nearestCenter: "murfreesboro" });
  assert.deepEqual(zipInfo("42501"), { zip: "42501", eligible: true, state: "KY", city: null, nearestCenter: "nashville" });
  assert.deepEqual(zipInfo("36301"), { zip: "36301", eligible: true, state: "AL", city: null, nearestCenter: "murfreesboro" });
  // Every eligible ZIP has a center; nothing is left unrouted.
  for (const zip of ["40003", "20101", "27006", "30002", "35004", "38601", "71601", "63001", "39813"]) assert.ok(zipInfo(zip).nearestCenter, zip);
  // Outside the nine → nothing.
  assert.deepEqual(zipInfo("43215"), { zip: "43215", eligible: false, state: null, city: null, nearestCenter: null });
});

test("public label: city, else the state from the ZIP, else Tennessee", () => {
  assert.equal(publicLabel("Jane", "Doe", "Franklin"), "Jane D., Franklin");
  assert.equal(publicLabel("Jane", "doe", null), "Jane D., Tennessee");
  assert.equal(publicLabel("Jane", "doe", null, "42501"), "Jane D., Kentucky");
  assert.equal(publicLabel(" Jane ", "", "Smyrna"), "Jane, Smyrna");
});
