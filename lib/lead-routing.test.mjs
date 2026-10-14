// Unit test for lib/lead-routing.ts — every rule and both fallback steps.
// Run: npm test   (plain `node --test`; Node strips the types from the .ts)
//
// .mjs rather than .ts so the Next type-check never sees an import that ends
// in ".ts", which it would reject.

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ROUTE_ENV,
  notificationSubject,
  parseAddressList,
  recipientsFor,
  routeFor,
  routeLead,
  senderAddress,
} from "./lead-routing.ts";

const form = (preferredCenter, extra = {}) => ({
  type: "consultation",
  source: "form",
  preferredCenter,
  ...extra,
});

/** Every route's variable set to its own two-address list. */
const FULL_ENV = {
  LEADS_NASHVILLE: "nash@example.test, nash-cc@example.test",
  LEADS_MURFREESBORO: "boro@example.test,boro-cc1@example.test, boro-cc2@example.test",
  LEADS_CONCIERGE: "concierge@example.test",
  LEADS_MORE_INFO: "info@example.test, info-cc@example.test",
  LEADS_GUIDE: "guide@example.test",
  LEADS_FALLBACK: "fallback@example.test, fallback-cc@example.test",
  LEADS_NOTIFY_EMAIL: "legacy@example.test",
};

const quiet = () => {};

/* ── The rules ──────────────────────────────────────────────────────── */

test("ready to book, Nashville → LEADS_NASHVILLE", () => {
  assert.equal(routeFor(form("Nashville")), "nashville");
  const r = routeLead(form("Nashville"), FULL_ENV, quiet);
  assert.equal(r.envVar, "LEADS_NASHVILLE");
  assert.equal(r.to, "nash@example.test");
  assert.deepEqual(r.cc, ["nash-cc@example.test"]);
  assert.deepEqual(r.warnings, []);
});

test("ready to book, Murfreesboro → LEADS_MURFREESBORO; first is To, rest CC", () => {
  const r = routeLead(form("Murfreesboro"), FULL_ENV, quiet);
  assert.equal(r.route, "murfreesboro");
  assert.equal(r.envVar, "LEADS_MURFREESBORO");
  assert.equal(r.to, "boro@example.test");
  assert.deepEqual(r.cc, ["boro-cc1@example.test", "boro-cc2@example.test"]);
});

test("Concierge / at home → LEADS_CONCIERGE", () => {
  const r = routeLead(form("Concierge / at home"), FULL_ENV, quiet);
  assert.equal(r.route, "concierge");
  assert.equal(r.envVar, "LEADS_CONCIERGE");
  assert.equal(r.to, "concierge@example.test");
  assert.deepEqual(r.cc, []);
});

test("more information (not ready to book) → LEADS_MORE_INFO, whatever the center", () => {
  for (const center of ["Nashville", "Concierge / at home", null]) {
    const r = routeLead(form(center, { intent: "more_info" }), FULL_ENV, quiet);
    assert.equal(r.route, "more_info");
    assert.equal(r.envVar, "LEADS_MORE_INFO");
    assert.equal(r.to, "info@example.test");
  }
});

test("guide download → LEADS_GUIDE", () => {
  const r = routeLead(
    { type: "guide", source: "form", preferredCenter: null },
    FULL_ENV,
    quiet
  );
  assert.equal(r.route, "guide");
  assert.equal(r.envVar, "LEADS_GUIDE");
  assert.equal(r.to, "guide@example.test");
});

test("chat assistant leads → LEADS_FALLBACK, even with a routed center", () => {
  for (const center of ["Nashville", "Murfreesboro", "Concierge / at home", "Not sure yet"]) {
    const r = routeLead(
      { type: "consultation", source: "chat", preferredCenter: center },
      FULL_ENV,
      quiet
    );
    assert.equal(r.route, "fallback", center);
    assert.equal(r.envVar, "LEADS_FALLBACK");
    assert.equal(r.to, "fallback@example.test");
    assert.deepEqual(r.cc, ["fallback-cc@example.test"]);
  }
});

test("Franklin, Not sure yet, no center, unknown center → LEADS_FALLBACK", () => {
  for (const center of ["Franklin", "franklin please", "Not sure yet", null, "", "Brentwood"]) {
    const r = routeLead(form(center), FULL_ENV, quiet);
    assert.equal(r.route, "fallback", String(center));
    assert.equal(r.envVar, "LEADS_FALLBACK");
  }
});

test("center match is case-insensitive", () => {
  assert.equal(routeFor(form("NASHVILLE")), "nashville");
  assert.equal(routeFor(form("murfreesboro")), "murfreesboro");
});

/* ── The fallback chain ─────────────────────────────────────────────── */

test("step 1: a route's variable missing or empty → LEADS_FALLBACK, warning names it", () => {
  for (const route of ["nashville", "murfreesboro", "concierge", "more_info", "guide"]) {
    for (const value of [undefined, "", "   ", " , ; "]) {
      const env = { ...FULL_ENV, [ROUTE_ENV[route]]: value };
      const warned = [];
      const r = recipientsFor(route, env, (m) => warned.push(m));
      assert.equal(r.envVar, "LEADS_FALLBACK", `${route} ${JSON.stringify(value)}`);
      assert.equal(r.to, "fallback@example.test");
      assert.deepEqual(r.cc, ["fallback-cc@example.test"]);
      assert.equal(warned.length, 1);
      assert.match(warned[0], new RegExp(`${ROUTE_ENV[route]} is not set.*using LEADS_FALLBACK`));
    }
  }
});

test("step 2: LEADS_FALLBACK missing too → LEADS_NOTIFY_EMAIL, warning names both", () => {
  const env = { LEADS_NOTIFY_EMAIL: "legacy@example.test, legacy-cc@example.test" };
  const warned = [];
  const r = recipientsFor("nashville", env, (m) => warned.push(m));
  assert.equal(r.envVar, "LEADS_NOTIFY_EMAIL");
  assert.equal(r.to, "legacy@example.test");
  assert.deepEqual(r.cc, ["legacy-cc@example.test"]);
  assert.equal(warned.length, 2);
  assert.match(warned[0], /LEADS_NASHVILLE is not set.*using LEADS_FALLBACK/);
  assert.match(warned[1], /LEADS_FALLBACK is not set.*using LEADS_NOTIFY_EMAIL/);
});

test("a fallback-route lead with LEADS_FALLBACK missing → LEADS_NOTIFY_EMAIL, one warning", () => {
  const warned = [];
  const r = routeLead(form("Franklin"), { LEADS_NOTIFY_EMAIL: "legacy@example.test" }, (m) =>
    warned.push(m)
  );
  assert.equal(r.envVar, "LEADS_NOTIFY_EMAIL");
  assert.equal(r.to, "legacy@example.test");
  assert.equal(warned.length, 1);
  assert.match(warned[0], /LEADS_FALLBACK is not set.*using LEADS_NOTIFY_EMAIL/);
});

test("the warning fires on every lead, not just the first", () => {
  const warned = [];
  const env = { LEADS_FALLBACK: "fallback@example.test" };
  routeLead(form("Nashville"), env, (m) => warned.push(m));
  routeLead(form("Nashville"), env, (m) => warned.push(m));
  assert.equal(warned.length, 2);
});

test("everything empty → no recipient, three warnings, never throws", () => {
  const warned = [];
  const r = recipientsFor("murfreesboro", {}, (m) => warned.push(m));
  assert.equal(r.envVar, null);
  assert.equal(r.to, null);
  assert.deepEqual(r.cc, []);
  assert.equal(warned.length, 3);
  assert.match(warned[2], /LEADS_NOTIFY_EMAIL is not set.*no fallback left/);
});

/* ── Parsing ────────────────────────────────────────────────────────── */

test("address list: commas, semicolons, spaces, repeats, junk", () => {
  assert.deepEqual(parseAddressList(" a@x.com ,b@y.com;; c@z.com, A@x.com , oops "), {
    addresses: ["a@x.com", "b@y.com", "c@z.com"],
    ignored: 1,
  });
  assert.deepEqual(parseAddressList(undefined), { addresses: [], ignored: 0 });
});

test("a variable holding only junk counts as missing, and says so", () => {
  const warned = [];
  const r = recipientsFor("nashville", { ...FULL_ENV, LEADS_NASHVILLE: "front desk" }, (m) =>
    warned.push(m)
  );
  assert.equal(r.envVar, "LEADS_FALLBACK");
  assert.match(warned[0], /LEADS_NASHVILLE: 1 entry is not an email address/);
  assert.match(warned[1], /LEADS_NASHVILLE is not set/);
});

/* ── Subject and sender ─────────────────────────────────────────────── */

test("subject names the form, the center and the person", () => {
  assert.equal(
    notificationSubject({
      route: "nashville",
      source: "form",
      preferredCenter: "Nashville",
      name: "Jane Doe",
      email: "jane@example.test",
    }),
    "New free call request — Nashville — Jane Doe"
  );
  assert.equal(
    notificationSubject({
      route: "fallback",
      source: "chat",
      preferredCenter: "Murfreesboro",
      name: "Jane",
      email: null,
    }),
    "New chat assistant call request — Murfreesboro — Jane"
  );
  assert.equal(
    notificationSubject({
      route: "guide",
      source: "form",
      preferredCenter: null,
      name: null,
      email: "sarah@example.test",
    }),
    "New guide download — No center — sarah@example.test"
  );
  assert.equal(
    notificationSubject({
      route: "fallback",
      source: "form",
      preferredCenter: null,
      name: "Jane",
      email: null,
    }),
    "New free call request — No center chosen — Jane"
  );
});

test("TEST prefix when the name starts with TEST, and only then", () => {
  const base = { route: "nashville", source: "form", preferredCenter: "Nashville", email: null };
  assert.equal(
    notificationSubject({ ...base, name: "TEST — delete me" }),
    "TEST — New free call request — Nashville — TEST — delete me"
  );
  assert.ok(!notificationSubject({ ...base, name: "Tessa Testa" }).startsWith("TEST"));
  assert.ok(!notificationSubject({ ...base, name: "test lower" }).startsWith("TEST"));
});

test("subject cannot carry a newline", () => {
  const s = notificationSubject({
    route: "nashville",
    source: "form",
    preferredCenter: "Nashville",
    name: "Jane\r\nBcc: x@y.z",
    email: null,
  });
  assert.ok(!/[\r\n]/.test(s));
});

test("sender is always on harmonizedbraincenterstn.com", () => {
  assert.equal(
    senderAddress({}, quiet),
    "Harmonized Brain Centers Website <leads@harmonizedbraincenterstn.com>"
  );
  assert.equal(
    senderAddress({ LEADS_NOTIFY_FROM: "HBC <front@harmonizedbraincenterstn.com>" }, quiet),
    "HBC <front@harmonizedbraincenterstn.com>"
  );
  const warned = [];
  for (const bad of [
    "Harmonized Website <onboarding@resend.dev>",
    "leads@harmonizedbraincenters.com",
    "x@evil-harmonizedbraincenterstn.com",
  ]) {
    assert.match(
      senderAddress({ LEADS_NOTIFY_FROM: bad }, (m) => warned.push(m)),
      /<leads@harmonizedbraincenterstn\.com>$/
    );
  }
  assert.equal(warned.length, 3);
});
