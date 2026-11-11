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
  cleanHook,
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
    utm_term: null,
    fbclid: null,
    gclid: null,
    lead_source: "instagram",
    hook: null,
  });
});

test("ad click ids keep their case; utm_term is cleaned like the others (0020)", () => {
  const a = attributionFrom("?fbclid=IwAR3xY_z-9.Q&gclid=Cj0KCQ<x>&utm_term=Neuro%20Feedback", "");
  assert.equal(a.fbclid, "IwAR3xY_z-9.Q");
  assert.equal(a.gclid, "Cj0KCQx");
  assert.equal(a.utm_term, "neurofeedback");
  // A click id alone is a first touch, with its landing time for Meta's fbc.
  const s = mem();
  captureAttribution("?fbclid=IwAR3", "", s, 1700000000000);
  assert.deepEqual(attributionForSubmit("", "", s), { fbclid: "IwAR3", landed_at: 1700000000000 });
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
  captureAttribution("?utm_source=instagram&utm_campaign=bio", "", s, 1700000000000);
  assert.deepEqual(attributionForSubmit("", "", s), { utm_source: "instagram", utm_campaign: "bio", lead_source: "instagram", landed_at: 1700000000000 });
  assert.deepEqual(attributionForSubmit("?utm_source=ig", "", mem()), { utm_source: "ig", lead_source: "instagram" });
  assert.deepEqual(attributionForSubmit("", "", mem()), {});
  assert.deepEqual(attributionForSubmit("", "", null), {});
});

test("only the utm keys and click ids are read; other query parameters never ride along", () => {
  const a = attributionFrom("?utm_source=instagram&phone=6155550100&name=Jane%20Doe&email=jane@example.test&utm_content=bio-v2", "");
  assert.deepEqual(Object.keys(a).sort(), ["fbclid", "gclid", "hook", "lead_source", "utm_campaign", "utm_content", "utm_medium", "utm_source", "utm_term"]);
  assert.doesNotMatch(JSON.stringify(a), /jane|doe|555|0100|@/i);
  assert.equal(a.utm_content, "bio-v2");
});

test("hook: /start's headline code is a letter and a digit or two, never a word", () => {
  assert.equal(cleanHook("k1"), "k1");
  assert.equal(cleanHook(" A2 "), "a2");
  assert.equal(cleanHook("g12"), "g12");
  for (const bad of ["anxiety", "sleep", "k", "1k", "k1x", "k-1", "", null, 7]) assert.equal(cleanHook(bad), null, String(bad));
});

test("hook rides with the first touch, and the form's own page fills a first touch that had none", () => {
  const s = mem();
  captureAttribution("?h=k1&utm_source=facebook&utm_campaign=bm", "", s, 1000);
  const sent = attributionForSubmit("?h=a2", "", s);
  assert.equal(sent.hook, "k1");
  assert.equal(sent.utm_source, "facebook");

  const s2 = mem();
  captureAttribution("?utm_source=google", "", s2, 1000);
  assert.equal(attributionForSubmit("?h=a2", "", s2).hook, "a2");

  // h alone is a first touch; a word in h is not kept anywhere.
  const s3 = mem();
  captureAttribution("?h=a3", "", s3, 1000);
  assert.equal(attributionForSubmit("", "", s3).hook, "a3");
  assert.equal(attributionFrom("?h=insomnia", "").hook, null);
  assert.deepEqual(attributionForSubmit("?h=insomnia", "", mem()), {});
});
