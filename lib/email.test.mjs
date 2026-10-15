// Unit tests for the emails (lib/email/*, lib/lead-notification.ts): the
// threading headers, the Central-time format, the visitor's Reply-To rule,
// the "never for a guide" rule, and what actually goes to Resend — with
// fetch stubbed, so nothing is sent. Run: npm test
//
// lib/ imports are extensionless; the hook appends ".ts" for local
// specifiers (the same trick as scripts/answer-audit.mjs).

import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

registerHooks({
  resolve(spec, ctx, next) {
    const local = !ctx.parentURL?.includes("/node_modules/");
    if (local && spec.startsWith(".") && !/\.(ts|tsx|js|mjs|cjs|json)$/.test(spec)) {
      return next(`${spec}.ts`, ctx);
    }
    return next(spec, ctx);
  },
});

const F = await import("./email/format.ts");
const T = await import("./email/templates.ts");
const N = await import("./lead-notification.ts");
const { routeLead } = await import("./lead-routing.ts");

/* ── Central time ───────────────────────────────────────────────────── */

test("times are Central, human-readable, never ISO", () => {
  // 16:13 UTC on Oct 14 2026 is 11:13 AM CDT.
  assert.equal(F.formatCentral(new Date("2026-10-14T16:13:00Z")), "Wed Oct 14, 11:13 AM CT");
  // Winter: 15:05 UTC on Jan 6 2027 is 9:05 AM CST — same label.
  assert.equal(F.formatCentral(new Date("2027-01-06T15:05:00Z")), "Wed Jan 6, 9:05 AM CT");
  // Past midnight UTC is still the evening before in Nashville.
  assert.equal(F.formatCentral(new Date("2026-10-15T02:30:00Z")), "Wed Oct 14, 9:30 PM CT");
  assert.doesNotMatch(F.formatCentral(new Date()), /\d{4}-\d{2}-\d{2}T/);
});

/* ── Phones ─────────────────────────────────────────────────────────── */

test("phones: (615) 555-1234 and tel:+16155551234", () => {
  for (const typed of ["6155551234", "615.555.1234", "+1 615 555 1234", "(615) 555-1234"]) {
    assert.equal(F.displayPhone(typed), "(615) 555-1234", typed);
    assert.equal(F.telHref(typed), "tel:+16155551234", typed);
  }
  assert.equal(F.displayPhone("+44 20 7946 0958"), "+44 20 7946 0958");
});

/* ── From ───────────────────────────────────────────────────────────── */

test("From: 'Harmonized Brain Centers <address>', the name never doubled", () => {
  assert.equal(F.fromHeader("leads@harmonizedbraincenterstn.com"), "Harmonized Brain Centers <leads@harmonizedbraincenterstn.com>");
  assert.equal(
    F.fromHeader("Harmonized Brain Centers <leads@harmonizedbraincenterstn.com>"),
    "Harmonized Brain Centers <leads@harmonizedbraincenterstn.com>"
  );
});

/* ── Threading ──────────────────────────────────────────────────────── */

test("threading headers point at the original's Message-ID", () => {
  assert.deepEqual(F.threadHeaders("<abc-123@resend.example>"), {
    "In-Reply-To": "<abc-123@resend.example>",
    References: "<abc-123@resend.example>",
  });
  // Brackets added when the stored id lacks them.
  assert.deepEqual(F.threadHeaders("abc-123@resend.example"), {
    "In-Reply-To": "<abc-123@resend.example>",
    References: "<abc-123@resend.example>",
  });
  // Nothing to point at → no headers at all.
  assert.deepEqual(F.threadHeaders(null), {});
  assert.deepEqual(F.threadHeaders(""), {});
});

test("'Re: ' once, never twice", () => {
  assert.equal(F.replySubject("New free call request — Nashville — Sarah Mitchell"), "Re: New free call request — Nashville — Sarah Mitchell");
  assert.equal(F.replySubject("Re: New free call request — Nashville — Sarah Mitchell"), "Re: New free call request — Nashville — Sarah Mitchell");
  assert.equal(F.replySubject("TEST — New free call request — Nashville — TEST Ben"), "Re: TEST — New free call request — Nashville — TEST Ben");
});

/* ── The visitor's Reply-To ─────────────────────────────────────────── */

test("visitor Reply-To is the FIRST address of her lead's route", () => {
  const env = {
    LEADS_NASHVILLE: "denise@example.test, office@example.test",
    LEADS_MURFREESBORO: "kylie@example.test,boro-cc@example.test",
    LEADS_CONCIERGE: "ben@example.test",
    LEADS_FALLBACK: "front@example.test, cc@example.test",
  };
  const quiet = () => {};
  const replyFor = (preferredCenter) =>
    F.visitorReplyTo(routeLead({ type: "consultation", source: "form", preferredCenter }, env, quiet));
  assert.equal(replyFor("Nashville"), "denise@example.test");
  assert.equal(replyFor("Murfreesboro"), "kylie@example.test");
  assert.equal(replyFor("Concierge / at home"), "ben@example.test");
  assert.equal(replyFor("Not sure yet"), "front@example.test");
  // The route's own variable empty: the fallback the lead actually went to.
  assert.equal(
    F.visitorReplyTo(routeLead({ type: "consultation", source: "chat", preferredCenter: "Nashville" }, { LEADS_FALLBACK: "front@example.test" }, quiet)),
    "front@example.test"
  );
  assert.equal(F.visitorReplyTo({ to: null }), null);
});

/* ── Never for a guide ──────────────────────────────────────────────── */

test("the visitor is emailed for a saved call request — never a guide, and never otherwise", () => {
  const base = { type: "consultation", intent: "book", email: "sarah@example.test", saved: true, honeypotFilled: false };
  assert.equal(F.shouldEmailVisitor(base), true);
  assert.equal(F.shouldEmailVisitor({ ...base, type: "guide" }), false, "guide download");
  assert.equal(F.shouldEmailVisitor({ ...base, email: null }), false, "no address");
  assert.equal(F.shouldEmailVisitor({ ...base, email: "  " }), false, "blank address");
  assert.equal(F.shouldEmailVisitor({ ...base, saved: false }), false, "row not saved — she was shown an error");
  assert.equal(F.shouldEmailVisitor({ ...base, honeypotFilled: true }), false, "spam trap filled");
  assert.equal(F.shouldEmailVisitor({ ...base, intent: "more_info" }), false, "not a call request");
});

/* ── The templates ──────────────────────────────────────────────────── */

const NOW = new Date("2026-10-14T16:13:00Z");
const lead = {
  source: "chat",
  intent: "book",
  name: "Marcus <b>Reed</b>",
  phone: "6155550188",
  email: "mreed@icloud.com",
  preferredCenter: "Murfreesboro",
  bestTime: "Afternoon",
  smsConsent: false,
  sourcePage: "/",
  details: { helpingWho: "My child", concerns: [], note: "Homework <script>x</script> takes hours", referredBy: null },
  honeypotFilled: false,
};

test("staff notification: badges, buttons, formatted phone, CT time, escaped input", () => {
  const { html, text } = T.staffNotification({ lead, route: "murfreesboro", envVar: "LEADS_MURFREESBORO", saved: { rowId: "r1", url: "https://x.test/r1" }, now: NOW });
  assert.match(html, />Murfreesboro<\/span>/);
  assert.match(html, />via chat<\/span>/);
  assert.match(html, /href="tel:\+16155550188"[^>]*>Call</);
  assert.match(html, /href="mailto:mreed@icloud\.com"[^>]*>Reply</);
  assert.match(html, /\(615\) 555-0188/);
  assert.match(html, /Wed Oct 14, 11:13 AM CT/);
  assert.match(html, /What they told us/);
  assert.doesNotMatch(html, /<script>|<b>Reed/);
  assert.match(html, /&lt;script&gt;/);
  assert.match(text, /^Texts OK\?: +No/m);
  assert.match(text, /^NEW CALL REQUEST · Murfreesboro · via chat/m);
  assert.doesNotMatch(text + html, /\d{4}-\d{2}-\d{2}T\d{2}:/);
  assert.doesNotMatch(text, /The form asks who the call is for/);
});

test("staff notification without page-two details has no 'What they told us'", () => {
  const { html } = T.staffNotification({
    lead: { ...lead, source: "form", details: { helpingWho: null, concerns: [], note: null, referredBy: null } },
    route: "nashville", envVar: "LEADS_NASHVILLE", saved: null, now: NOW,
  });
  assert.doesNotMatch(html, /What they told us/);
  assert.doesNotMatch(html, />via chat</);
  assert.match(html, /NOT SAVED/);
});

const VIDEO = {
  watchUrl: "https://harmonizedbraincenterstn.com/watch/first-visit",
  imageUrl: "https://harmonizedbraincenterstn.com/email/first-visit.jpg",
  duration: "0:48",
};

test("visitor confirmation: headline, who calls, the video as the hero, then the call button", () => {
  const content = (route, phone) => ({
    firstName: "Sarah", route,
    centerPhone: phone,
    video: VIDEO,
    identityLine: "Harmonized Brain Centers · 197 Thompson Ln, Suite S, Nashville, TN 37211",
    siteUrl: "https://harmonizedbraincenterstn.com",
  });
  const nash = { label: "Nashville", display: "(615) 331-8762", tel: "tel:+16153318762" };
  const boro = { label: "Murfreesboro", display: "(615) 203-2650", tel: "tel:+16152032650" };
  let r = T.visitorConfirmation(content("nashville", nash));
  assert.match(r.text, /^Thanks, Sarah\. We’ll call you soon\.\nSomeone from our Nashville center will call\.\n/);
  assert.match(r.html, /href="tel:\+16153318762"/);
  // The video: our hosted thumbnail, linked (image AND caption) to our redirect.
  assert.match(r.html, /<a href="https:\/\/harmonizedbraincenterstn\.com\/watch\/first-visit"[^>]*><img src="https:\/\/harmonizedbraincenterstn\.com\/email\/first-visit\.jpg"/);
  assert.match(r.html, />Watch: what your first visit looks like · 0:48<\/a>/);
  assert.doesNotMatch(r.html, /youtube\.com/, "never a bare YouTube link — Gmail adds its own preview");
  // Order: headline → line → image → caption → "Want to talk now?" → call button.
  const card = r.html.slice(r.html.indexOf('class="hbc-card"'));
  const at = (needle) => card.indexOf(needle);
  assert.ok(at("We’ll call you soon.") < at("will call.") && at("will call.") < at("<img") && at("<img") < at("Watch: what") && at("Watch: what") < at("Want to talk now?") && at("Want to talk now?") < at("tel:+1"));
  assert.match(r.text, /Watch: what your first visit looks like · 0:48\nhttps:\/\/harmonizedbraincenterstn\.com\/watch\/first-visit/);
  r = T.visitorConfirmation(content("murfreesboro", boro));
  assert.match(r.text, /Someone from our Murfreesboro center will call\./);
  assert.match(r.html, /href="tel:\+16152032650"/);
  for (const route of ["concierge", "fallback"]) {
    r = T.visitorConfirmation(content(route, nash));
    assert.match(r.text, /^Thanks, Sarah\. We’ll call you soon\.\nSomeone from our team will call\./);
  }
  assert.doesNotMatch(r.text + r.html, /today/i);
  assert.equal(T.VISITOR_SUBJECT, "We got your request — Harmonized Brain Centers");
  // No duration verified → no "· 0:00" in the caption.
  assert.equal(T.videoCaption(null), "Watch: what your first visit looks like");
});

test("staff emails: the footer is the received time and 'Open saved request' — no route, no request id", () => {
  const saved = { rowId: "7d1c0e7e-3b9e-4c5a-9e52-0f6d2a1b9c11", url: "https://x.test/r1" };
  const all = [
    T.staffNotification({ lead, route: "murfreesboro", envVar: "LEADS_MURFREESBORO", saved, now: NOW }),
    T.detailsUpdate({ lead, route: "murfreesboro", envVar: "LEADS_MURFREESBORO", saved, now: NOW, originalSent: true }),
    T.guideNotification({ email: "a@example.test", guideTitle: "Why regulation fails", sourcePage: "/", envVar: "LEADS_GUIDE", route: "guide", saved, now: NOW }),
  ];
  for (const { html, text } of all) {
    assert.doesNotMatch(html + text, /Routed by|rule:/);
    assert.doesNotMatch(html + text, /Request 7d1c0e7e|Saved request: 7d1c0e7e/);
    assert.match(html, /href="https:\/\/x\.test\/r1"[^>]*>Open saved request</);
    assert.match(html, /Received Wed Oct 14, 11:13 AM CT/);
    assert.match(text, /^Open saved request: https:\/\/x\.test\/r1$/m);
    assert.match(text, /^Received Wed Oct 14, 11:13 AM CT$/m);
  }
});

/* ── What goes to Resend (fetch stubbed) ────────────────────────────── */

async function capture(fn, responses = {}) {
  const sent = [];
  const realFetch = globalThis.fetch;
  const saved = { ...process.env };
  process.env.RESEND_API_KEY = "re_test";
  process.env.LEADS_NOTIFY_FROM = "Harmonized Brain Centers <leads@harmonizedbraincenterstn.com>";
  globalThis.fetch = async (url, init = {}) => {
    const method = init.method ?? "GET";
    if (method === "GET") {
      return new Response(JSON.stringify(responses.get ?? { message_id: "<orig-1@resend.example>" }), { status: 200 });
    }
    sent.push(JSON.parse(String(init.body)));
    return new Response(JSON.stringify({ id: `re_${sent.length}` }), { status: 200 });
  };
  try {
    return { result: await fn(), sent };
  } finally {
    globalThis.fetch = realFetch;
    for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k];
    Object.assign(process.env, saved);
  }
}

const leadDetails = {
  source: "form", intent: "book", rowId: "7d1c0e7e-3b9e-4c5a-9e52-0f6d2a1b9c11",
  helpingWho: "My child", concerns: ["Sleep"], firstName: "Sarah Mitchell", phone: "6155550134",
  email: "sarah@example.test", preferredCenter: "Nashville", bestTime: "Any time", note: "Bedtime.",
  referredBy: "Dr. Patel", sourcePage: "/contact", smsConsent: true, honeypotFilled: false,
};
const recipients = { route: "nashville", envVar: "LEADS_NASHVILLE", to: "denise@example.test", cc: ["office@example.test"] };

test("lead notification: From name, HTML + text, and the delivered Message-ID read back", async () => {
  const { result, sent } = await capture(() =>
    N.sendLeadNotification(leadDetails, { ...recipients, warnings: [] }, "New free call request — Nashville — Sarah Mitchell", NOW)
  );
  assert.equal(sent.length, 1);
  assert.equal(sent[0].from, "Harmonized Brain Centers <leads@harmonizedbraincenterstn.com>");
  assert.deepEqual(sent[0].to, ["denise@example.test"]);
  assert.deepEqual(sent[0].cc, ["office@example.test"]);
  assert.equal(sent[0].reply_to, "sarah@example.test");
  assert.ok(sent[0].html.startsWith("<!doctype html>"));
  assert.ok(sent[0].text.length > 0);
  assert.equal(sent[0].headers, undefined, "no custom Message-ID is set");
  assert.equal(result.status, "sent");
  assert.equal(result.rfcMessageId, "<orig-1@resend.example>");
});

test("page-two update: same recipients, 'Re: ' subject, In-Reply-To and References", async () => {
  const { sent } = await capture(() =>
    N.sendDetailsUpdate({
      lead: leadDetails, recipients,
      subject: "New free call request — Nashville — Sarah Mitchell",
      originalSent: true, originalMessageId: "<orig-1@resend.example>", now: NOW,
    })
  );
  assert.equal(sent.length, 1);
  assert.deepEqual(sent[0].to, ["denise@example.test"]);
  assert.deepEqual(sent[0].cc, ["office@example.test"]);
  assert.equal(sent[0].subject, "Re: New free call request — Nashville — Sarah Mitchell");
  assert.deepEqual(sent[0].headers, { "In-Reply-To": "<orig-1@resend.example>", References: "<orig-1@resend.example>" });
  assert.match(sent[0].text, /^DETAILS ADDED · Nashville/);
  assert.match(sent[0].text, /Referred by: Dr\. Patel/);
});

test("page-two update when the original failed: sent on its own, no Re:, no thread headers", async () => {
  const { sent } = await capture(() =>
    N.sendDetailsUpdate({
      lead: leadDetails, recipients,
      subject: "New free call request — Nashville — Sarah Mitchell",
      originalSent: false, originalMessageId: null, now: NOW,
    })
  );
  assert.equal(sent[0].subject, "New free call request — Nashville — Sarah Mitchell");
  assert.equal(sent[0].headers, undefined);
  assert.match(sent[0].text, /this is the only email/);
  assert.match(sent[0].text, /\(615\) 555-0134/);
});

test("visitor confirmation: to her, Reply-To the route's first address, fixed subject", async () => {
  const { sent } = await capture(() =>
    N.sendVisitorConfirmation({
      to: "sarah@example.test",
      replyTo: F.visitorReplyTo(recipients),
      content: {
        firstName: "Sarah", route: "nashville",
        centerPhone: { label: "Nashville", display: "(615) 331-8762", tel: "tel:+16153318762" },
        video: VIDEO,
        identityLine: "Harmonized Brain Centers · 197 Thompson Ln, Suite S, Nashville, TN 37211",
        siteUrl: "https://harmonizedbraincenterstn.com",
      },
    })
  );
  assert.deepEqual(sent[0].to, ["sarah@example.test"]);
  assert.equal(sent[0].reply_to, "denise@example.test");
  assert.equal(sent[0].subject, "We got your request — Harmonized Brain Centers");
  assert.equal(sent[0].from, "Harmonized Brain Centers <leads@harmonizedbraincenterstn.com>");
});
