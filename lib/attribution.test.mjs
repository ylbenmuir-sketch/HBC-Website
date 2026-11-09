// Unit tests for lib/attribution.ts: the Instagram lead source from a utm tag
// or the referrer, cleaned tags, first touch wins, and nothing personal.
// Run: npm test   (plain `node --test`; Node strips the types from the .ts)

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ATTRIBUTION_KEY,
  attributionForSubmit,
  attributionFrom,
  captureAttribution,
  cleanUtm,
  isInstagramReferrer,
  leadSourceFor,
} from "./attribution.ts";

const mem = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), map: m };
};

test("cleanUtm: lowercase, allow-listed characters, 64 at most", () => {
  assert.equal(cleanUtm(" Instagram "), "instagram");
  assert.equal(cleanUtm("bio<script>"), "bioscript");
  assert.equal(cleanUtm("x".repeat(80)).length, 64);
  assert.equal(cleanUtm(""), null);
  assert.equal(cleanUtm(42), null);
});

test("lead source: utm_source=instagram, or an instagram.com referrer", () => {
  assert.equal(leadSourceFor("instagram", ""), "instagram");
  assert.equal(leadSourceFor("ig", ""), "instagram");
  assert.equal(leadSourceFor(null, "https://l.instagram.com/?u=x"), "instagram");
  assert.equal(leadSourceFor(null, "https://www.instagram.com/"), "instagram");
  assert.equal(leadSourceFor("facebook", "https://facebook.com/"), null);
  assert.equal(leadSourceFor(null, "https://notinstagram.com/"), null);
  assert.equal(isInstagramReferrer("not a url"), false);
});

test("the bio link's attribution, as the row will store it", () => {
  const a = attributionFrom("?utm_source=instagram&utm_medium=social&utm_campaign=bio", "");
  assert.deepEqual(a, {
    utm_source: "instagram",
    utm_medium: "social",
    utm_campaign: "bio",
    utm_content: null,
    lead_source: "instagram",
  });
});

test("first touch wins; a later tagged page does not overwrite it", () => {
  const s = mem();
  assert.equal(captureAttribution("?utm_source=instagram&utm_medium=social&utm_campaign=bio", "", s)?.lead_source, "instagram");
  captureAttribution("?utm_source=facebook", "", s);
  assert.equal(JSON.parse(s.map.get(ATTRIBUTION_KEY)).utm_source, "instagram");
  // Untagged pages record nothing.
  const t = mem();
  assert.equal(captureAttribution("", "", t), null);
  assert.equal(t.map.has(ATTRIBUTION_KEY), false);
});

test("the submit body: stored first touch, else the page's own tags, else nothing", () => {
  const s = mem();
  captureAttribution("?utm_source=instagram&utm_campaign=bio", "", s);
  assert.deepEqual(attributionForSubmit("", "", s), { utm_source: "instagram", utm_campaign: "bio", lead_source: "instagram" });
  assert.deepEqual(attributionForSubmit("?utm_source=ig", "", mem()), { utm_source: "ig", lead_source: "instagram" });
  assert.deepEqual(attributionForSubmit("", "", mem()), {});
  assert.deepEqual(attributionForSubmit("", "", null), {});
});

test("only the four utm keys are read; other query parameters never ride along", () => {
  const a = attributionFrom("?utm_source=instagram&phone=6155550100&name=Jane%20Doe&email=jane@example.test&utm_content=bio-v2", "");
  assert.deepEqual(Object.keys(a).sort(), ["lead_source", "utm_campaign", "utm_content", "utm_medium", "utm_source"]);
  assert.doesNotMatch(JSON.stringify(a), /jane|doe|555|0100|@/i);
  assert.equal(a.utm_content, "bio-v2");
});
