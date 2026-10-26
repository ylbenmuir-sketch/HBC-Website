// Unit test for lib/analytics.ts — the GA4 events (Ben, 2026-10-18): each one
// fires only on a saved submission, carries only fixed values and a path, and
// nothing at all is sent while NEXT_PUBLIC_GA_ID is unset.
// Run: npm test   (plain `node --test`; Node strips the types from the .ts)
//
// analytics.ts reads its environment once, at import, so each configuration
// is its own import: the query string makes Node load a fresh copy.

import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

/* ── A configured, production module and a fake gtag ────────────────── */

const saved = {
  GA: process.env.NEXT_PUBLIC_GA_ID,
  NODE_ENV: process.env.NODE_ENV,
  VERCEL: process.env.HBC_VERCEL_ENV,
};
process.env.NEXT_PUBLIC_GA_ID = "G-TEST123";
process.env.NODE_ENV = "production";
delete process.env.HBC_VERCEL_ENV;
const on = await import("./analytics.ts?enabled");

delete process.env.NEXT_PUBLIC_GA_ID;
const off = await import("./analytics.ts?no-ga-id");

process.env.NEXT_PUBLIC_GA_ID = "G-TEST123";
process.env.HBC_VERCEL_ENV = "preview";
const preview = await import("./analytics.ts?preview");

for (const [key, value] of [
  ["NEXT_PUBLIC_GA_ID", saved.GA],
  ["NODE_ENV", saved.NODE_ENV],
  ["HBC_VERCEL_ENV", saved.VERCEL],
]) {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

let sent = [];
beforeEach(() => {
  sent = [];
  globalThis.window = { gtag: (...args) => sent.push(args) };
});

/** What a visitor typed, planted in every input a builder could leak. */
const PII = {
  name: "Jane Doe",
  first_name: "Jane Doe",
  email: "jane@example.test",
  phone: "(615) 555-0100",
  note: "my son has trouble sleeping",
};
const PII_PATTERN = /jane|doe|example\.test|555|0100|sleeping|@/i;

/** Every event's parameters may hold these keys and nothing else. */
const ALLOWED_KEYS = {
  submit_lead_form: ["center", "lead_source", "page_path"],
  generate_lead: ["center", "lead_source", "page_path"],
  contact_link_click: ["link_type", "location", "page_path"],
  concern_chip_click: ["chip_label", "page_path"],
  brain_map_jump: ["page_path"],
  guide_download: ["page_path"],
};

function assertClean(calls) {
  for (const [command, name, params] of calls) {
    assert.equal(command, "event");
    assert.deepEqual(Object.keys(params).sort(), ALLOWED_KEYS[name], `${name} keys`);
    assert.doesNotMatch(JSON.stringify(params), PII_PATTERN, `${name} carries personal data`);
  }
}

/* ── The success gates ──────────────────────────────────────────────── */

test("consultationSaved: only a 2xx whose body says ok with a row id", () => {
  const { consultationSaved } = on;
  assert.equal(consultationSaved(true, { ok: true, id: "3f1c-uuid" }), true);
  // The route's failed save: 502 with an error message.
  assert.equal(consultationSaved(false, { error: "We couldn't send your request" }), false);
  assert.equal(consultationSaved(false, { ok: true, id: "3f1c-uuid" }), false);
  assert.equal(consultationSaved(true, { ok: true, id: null }), false);
  assert.equal(consultationSaved(true, { ok: true, id: "" }), false);
  assert.equal(consultationSaved(true, { ok: true }), false);
  assert.equal(consultationSaved(true, { id: "3f1c-uuid" }), false);
  assert.equal(consultationSaved(true, null), false);
  // A login page answering 200 for the route, parsed as nothing.
  assert.equal(consultationSaved(true, "<html>"), false);
});

test("chatBookingSaved: only the reply carrying the saved-booking marker", () => {
  const { chatBookingSaved } = on;
  assert.equal(
    chatBookingSaved(true, { reply: "You're all set", lead: { saved: true, center: "Murfreesboro" } }),
    "Murfreesboro"
  );
  // Every other turn, including the failed-booking reply, has no marker.
  assert.equal(chatBookingSaved(true, { reply: "Something went wrong saving that" }), null);
  assert.equal(chatBookingSaved(true, { reply: "x", lead: { saved: false, center: "Nashville" } }), null);
  assert.equal(chatBookingSaved(true, { reply: "x", lead: "Nashville" }), null);
  assert.equal(chatBookingSaved(false, { lead: { saved: true, center: "Nashville" } }), null);
  assert.equal(chatBookingSaved(true, null), null);
});

/* ── The events ─────────────────────────────────────────────────────── */

test("trackLeadSaved sends submit_lead_form and generate_lead with the same three parameters", () => {
  on.trackLeadSaved({ source: "form", center: "Murfreesboro", pagePath: "/contact" });
  assert.deepEqual(sent, [
    ["event", "submit_lead_form", { lead_source: "form", center: "Murfreesboro", page_path: "/contact" }],
    ["event", "generate_lead", { lead_source: "form", center: "Murfreesboro", page_path: "/contact" }],
  ]);
});

test("lead events never carry personal data, even when handed it", () => {
  // Extra fields, a center that is really free text, and a path with a query.
  on.trackLeadSaved({
    ...PII,
    source: "chat",
    center: "Jane Doe, jane@example.test",
    pagePath: "/contact?email=jane@example.test#(615) 555-0100",
  });
  assert.equal(sent.length, 2);
  assertClean(sent);
  assert.deepEqual(sent[0][2], { lead_source: "chat", center: "Not sure", page_path: "/contact" });
});

test("leadCenter maps both forms' answers onto the four reported values", () => {
  const { leadCenter } = on;
  // Contact form options.
  assert.equal(leadCenter("Not sure yet"), "Not sure");
  assert.equal(leadCenter("Nashville"), "Nashville");
  assert.equal(leadCenter("Murfreesboro"), "Murfreesboro");
  assert.equal(leadCenter("Concierge / at home"), "Concierge");
  // Chat values.
  assert.equal(leadCenter("Concierge"), "Concierge");
  assert.equal(leadCenter("Not sure"), "Not sure");
  // Anything else.
  assert.equal(leadCenter("Franklin"), "Not sure");
  assert.equal(leadCenter(undefined), "Not sure");
});

test("contact_link_click: link type from the scheme, never the number or address", () => {
  const phone = on.contactLinkEvent("tel:+16153318762", "header", "/locations/nashville");
  assert.deepEqual(phone, {
    name: "contact_link_click",
    params: { link_type: "phone", location: "header", page_path: "/locations/nashville" },
  });
  const email = on.contactLinkEvent("mailto:jane@example.test?subject=Hi", "footer", "/privacy-policy");
  assert.deepEqual(email.params, { link_type: "email", location: "footer", page_path: "/privacy-policy" });
  assert.equal(on.contactLinkEvent("TEL:+16153318762", null, "/").params.link_type, "phone");
  // The /contact "Text us" option.
  const sms = on.contactLinkEvent("sms:+16153318762", "contact options", "/contact");
  assert.deepEqual(sms.params, { link_type: "text", location: "contact options", page_path: "/contact" });
  assert.equal(on.contactLinkEvent("/contact", "header", "/"), null);
  assert.equal(on.contactLinkEvent("https://example.test", "header", "/"), null);
  assert.equal(on.contactLinkEvent(null, "header", "/"), null);
});

test("contact_link_click: every listed location passes, anything else is other", () => {
  for (const location of on.LINK_LOCATIONS) {
    assert.equal(on.contactLinkEvent("tel:+1", location, "/").params.location, location);
  }
  assert.equal(on.contactLinkEvent("tel:+1", undefined, "/").params.location, "other");
  assert.equal(on.contactLinkEvent("tel:+1", "jane@example.test", "/").params.location, "other");
});

test("contact_link_click, sent: no personal data in what reaches gtag", () => {
  on.trackEvent(on.contactLinkEvent("mailto:jane@example.test", "jane", "/contact?phone=6155550100"));
  on.trackEvent(on.contactLinkEvent("tel:(615) 555-0100", "confirmation", "/contact"));
  assert.equal(sent.length, 2);
  assertClean(sent);
});

test("concern_chip_click: the fixed label and the page; anything else is other", () => {
  on.trackEvent(on.concernChipEvent("Focus & ADHD", "/?utm=jane@example.test"));
  on.trackEvent(on.concernChipEvent("jane@example.test", "/"));
  assert.deepEqual(sent, [
    ["event", "concern_chip_click", { chip_label: "Focus & ADHD", page_path: "/" }],
    ["event", "concern_chip_click", { chip_label: "other", page_path: "/" }],
  ]);
  assertClean(sent);
  for (const label of on.CONCERN_CHIPS) assert.equal(on.concernChipEvent(label, "/").params.chip_label, label);
});

test("brain_map_jump: the page only", () => {
  on.trackEvent(on.brainMapJumpEvent("/?from=jane@example.test"));
  assert.deepEqual(sent, [["event", "brain_map_jump", { page_path: "/" }]]);
  assertClean(sent);
});

test("guide_download: the page only, never the address", () => {
  on.trackGuideDownload("/concerns/sleep?email=jane@example.test");
  assert.deepEqual(sent, [["event", "guide_download", { page_path: "/concerns/sleep" }]]);
  assertClean(sent);
});

/* ── Inert unless configured, and production only ───────────────────── */

test("NEXT_PUBLIC_GA_ID unset: nothing is sent, nothing throws", () => {
  assert.equal(off.ANALYTICS_ENABLED, false);
  off.trackLeadSaved({ source: "form", center: "Nashville", pagePath: "/contact" });
  off.trackGuideDownload("/");
  off.trackEvent(off.contactLinkEvent("tel:+1", "header", "/"));
  assert.deepEqual(sent, []);
});

test("a Vercel preview build sends nothing even with the ID set", () => {
  assert.equal(preview.ANALYTICS_ENABLED, false);
  preview.trackLeadSaved({ source: "chat", center: "Nashville", pagePath: "/" });
  assert.deepEqual(sent, []);
});

test("a missing or throwing gtag is a no-op, never an error", () => {
  delete globalThis.window.gtag;
  assert.doesNotThrow(() => on.trackLeadSaved({ source: "form", center: "Nashville", pagePath: "/" }));
  globalThis.window.gtag = () => {
    throw new Error("blocked");
  };
  assert.doesNotThrow(() => on.trackGuideDownload("/"));
});

/* ── The contact funnel (Ben, 2026-10-26) ───────────────────────────── */

test("funnel events: fixed names, form=contact, the path only, reasons and methods mapped onto their lists", async () => {
  const A = await import("./analytics.ts?funnel");
  assert.deepEqual(A.FUNNEL_STEPS, [
    "contact_view", "form_start", "step1_submit_attempt", "step1_success", "step1_error", "step2_success", "step2_skipped",
  ]);
  assert.deepEqual(A.funnelEvent("contact_view", "/contact?utm=x#a"), { name: "contact_view", params: { form: "contact", page_path: "/contact" } });
  assert.deepEqual(A.funnelEvent("step1_error", "/contact", { reason: "missing_contact" }).params, { form: "contact", page_path: "/contact", reason: "missing_contact" });
  assert.equal(A.funnelEvent("step1_error", "/contact", { reason: "sarah@example.com" }).params.reason, "server_error");
  assert.equal(A.funnelEvent("step2_skipped", "/contact", { method: "left_page" }).params.method, "left_page");
  assert.equal(A.funnelEvent("step2_skipped", "/contact", { method: "typed" }).params.method, "skip_link");
  assert.equal(A.funnelEvent("step1_success", "/contact", { center: "Not sure yet" }).params.center, "Not sure");
  // Nothing typed rides along on any other step.
  assert.deepEqual(Object.keys(A.funnelEvent("form_start", "/contact", { reason: "x", method: "y", center: "Nashville" }).params), ["form", "page_path"]);
});
