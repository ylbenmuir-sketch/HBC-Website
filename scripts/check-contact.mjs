/**
 * End-to-end check of the three-step contact form, against a production
 * build and the real Supabase project.
 *
 *   npm run build
 *   MOCK_RESEND_LOG=/tmp/resend.jsonl MOCK_PLATFORM_LOG=/tmp/platform.jsonl \
 *     MOCK_SMS_LOG=/tmp/sms.jsonl \
 *     NODE_OPTIONS="--import ./scripts/contact-flow/mock-resend.mjs" \
 *     RESEND_API_KEY=re_test LEADS_NOTIFY_EMAIL=office@example.test \
 *     DIALPAD_API_KEY=test DIALPAD_SMS_FROM=+16155550100 \
 *     INQUIRY_API_BASE=http://platform.test INQUIRY_INTAKE_SECRET=test \
 *     npx next start -p 3123
 *   CHECK_BASE=http://127.0.0.1:3123 MOCK_RESEND_LOG=/tmp/resend.jsonl \
 *     MOCK_PLATFORM_LOG=/tmp/platform.jsonl MOCK_SMS_LOG=/tmp/sms.jsonl \
 *     DIALPAD_SMS_FROM=+16155550100 \
 *     CHECK_CONTACT_ALLOW_PROJECT=<project ref> npm run check:contact
 *
 * What it drives, in a headless Chrome (scripts/layout/cdp.mjs), at 320px,
 * 768px and 1440px:
 *
 *   save   step one → step two → "Save these details" → the video
 *   skip   step one → step two → "Skip for now" → the video
 *   leave  step one → close the tab (once, at 390px), after first trying
 *          to submit without an email and with a malformed one
 *
 * and, without a browser, two real conversations with the assistant's
 * booking flow over /api/chat (needs a build with
 * NEXT_PUBLIC_FEATURE_ASSISTANT=true) — one answering yes to the texts
 * question, one answering no — plus a POST that claims consent without the
 * wording (must not count) and the PATCH route's refusals.
 *
 * ## Text consent (lib/sms-consent.ts, A2P 10DLC)
 *
 * The save paths and the leave path tick the consent box; the skip paths
 * leave it unticked. Every lead is checked both ways: the box is present
 * under the phone row, unchecked on load, its label is the exact wording;
 * the row records consent, the wording shown and (only on a yes) the time;
 * the email's "Texts:" line and the platform's no-consent line agree with it;
 * and a text goes out only on a yes — an unticked box, a "no" in the chat or
 * a forged `sms_consent: true` send NOTHING.
 *
 * For every submission it asserts:
 *
 *   - exactly ONE row in consultation_requests, with the right columns —
 *     `helping_who` null and `concerns` empty unless step two saved them;
 *   - exactly ONE lead email (read from MOCK_RESEND_LOG), sent at step one,
 *     naming the row and carrying the (now required) email;
 *   - with consent, exactly ONE confirmation text (read from MOCK_SMS_LOG),
 *     byte-for-byte Ben's words with the HELP/STOP sentence, greeting by the
 *     FIRST word of the two-word test name, GSM-7 and two segments, from the
 *     chosen center's line; without consent, NO text;
 *   - the step-two headline and the step-three thank-you greet by the first
 *     word too, step two has no "optional" panel and no "(optional)" on the
 *     note, and the "Skip for now" exit is there and works;
 *   - the platform forward (read from MOCK_PLATFORM_LOG): one post at step
 *     one for every path — the skip and leave paths included — with the
 *     who-for stand-in and its flag line, and on the save path a second,
 *     labelled update post carrying the answers;
 *   - every late-mounting panel (step two, the video) is at opacity 1 — the
 *     reveal gate, components/RevealOnScroll.tsx;
 *   - on the desktop save path, that the play button loads the
 *     youtube-nocookie player and the player fetches media, with no
 *     Permissions-Policy violation in the console for any feature the site
 *     denies or the embed delegates (see POLICY_FEATURES).
 *
 * ## It writes to the database
 *
 * Ten rows, named `E2E-<run>-<path>-<width> Tester` (the chat's, which
 * asks a first name, has no surname), phone 0000000000, and two
 * chat_sessions rows. The same preflight as scripts/chat-checklist.mjs:
 * CHECK_CONTACT_ALLOW_PROJECT must name the exact project ref in
 * SUPABASE_URL, which cannot be satisfied without looking at which project
 * that is. At the end, unless `--keep` is passed, the run deletes the rows it
 * created by id, then sweeps any `E2E-<this run>-` row an aborted path left
 * behind (this run's own prefix, never another run's), and deletes its chat
 * sessions by id.
 *
 * The table holds real leads. Before anything is written, every row that is
 * not this run's is fingerprinted (a hash of the row — nothing is printed
 * or kept); after cleanup the same rows must exist with the same hash. That
 * is the "8 real rows survive untouched" check, made mechanical.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { launch } from "./layout/cdp.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.env.CHECK_BASE ?? "http://127.0.0.1:3123").replace(/\/$/, "");
const KEEP = process.argv.includes("--keep");
const RUN = new Date().toISOString().replace(/[-:T]/g, "").slice(4, 14);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ── env + preflight ───────────────────────────────────────────────────── */

function dotenv() {
  const out = {};
  const file = join(ROOT, ".env.local");
  if (!existsSync(file)) return out;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}
const env = { ...dotenv(), ...process.env };
const SUPABASE_URL = env.SUPABASE_URL;
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const MOCK_LOG = env.MOCK_RESEND_LOG;
const PLATFORM_LOG = env.MOCK_PLATFORM_LOG;
const SMS_LOG = env.MOCK_SMS_LOG;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set (.env.local or the environment).");
  process.exit(1);
}
const ref = /^https:\/\/([a-z0-9-]+)\.supabase\.co\/?$/i.exec(SUPABASE_URL)?.[1];
if (!ref || env.CHECK_CONTACT_ALLOW_PROJECT !== ref) {
  console.error(
    `\n  Refusing to write to this database.\n\n  SUPABASE_URL names project "${ref ?? "?"}". This check inserts rows into\n  consultation_requests. Set CHECK_CONTACT_ALLOW_PROJECT=${ref ?? "<ref>"} to confirm\n  that is the project you mean.\n`
  );
  process.exit(1);
}
if (!MOCK_LOG || !PLATFORM_LOG || !SMS_LOG) {
  console.error("MOCK_RESEND_LOG, MOCK_PLATFORM_LOG and MOCK_SMS_LOG must be set — the server must be started with scripts/contact-flow/mock-resend.mjs preloaded (see the header).");
  process.exit(1);
}

/** "E2E-x-save-320 Tester" → "E2E-x-save-320": what every greeting must use (lib/first-name.ts). */
const firstWord = (name) => name.trim().split(/\s+/)[0];
const emailFor = (name) => `${firstWord(name).toLowerCase()}@example.test`;

/* ── Supabase REST (service role) ──────────────────────────────────────── */

const rest = async (path, init = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`${path} → ${res.status} ${await res.text()}`);
  return res.json();
};
const rowsNamed = (name) =>
  rest(`consultation_requests?first_name=eq.${encodeURIComponent(name)}&select=*`);

/* ── the mock inbox ────────────────────────────────────────────────────── */

const emails = () =>
  existsSync(MOCK_LOG)
    ? readFileSync(MOCK_LOG, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l))
    : [];
const emailsNaming = (name) => emails().filter((e) => (e.body?.text ?? "").includes(`Name:      ${name}`) || (e.body?.subject ?? "").includes(name));

/* ── the mock platform door ────────────────────────────────────────────── */

const WHO_FOR_STAND_IN = "someone_else";
const NOT_GIVEN_LINE = "[Who the call is for: NOT GIVEN on the form";
const UPDATE_LINE = "[UPDATE — not a new lead.";
const forwards = () =>
  existsSync(PLATFORM_LOG)
    ? readFileSync(PLATFORM_LOG, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l))
    : [];
const forwardsNaming = (name) => forwards().filter((f) => f.body?.firstName === name);

/* ── the mock Dialpad line ─────────────────────────────────────────────── */

// Ben's words exactly, hyphen not em dash (lib/sms-confirmation.ts). Spelled
// out here rather than imported so a change to the text has to be made twice
// on purpose — this is the copy the registration's sample message quotes.
const SMS_EXACT = (first) => `Hi ${first}, this is Harmonized Brain Centers. We got your request and we'll reach out soon! Feel free to call or text us right here anytime - talk soon. Reply HELP for help, STOP to cancel.`;
const GSM7 = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
const GSM7_EXT = "^{}\\[~]|€\f";
/** { gsm7, units, segments } — 160 in one segment, 153 per segment beyond. */
function segments(text) {
  let units = 0;
  for (const c of text) {
    if (GSM7.includes(c)) units += 1;
    else if (GSM7_EXT.includes(c)) units += 2;
    else return { gsm7: false, units: [...text].length, segments: Math.ceil([...text].length / 67) };
  }
  return { gsm7: true, units, segments: units <= 160 ? 1 : Math.ceil(units / 153) };
}

/* ── the consent wording (lib/sms-consent.ts), as a reader sees it ─────── */

const FORM_CONSENT_TEXT = "Yes, text me appointment and inquiry updates from Harmonized Brain Centers at this number. Msg frequency varies. Msg & data rates may apply. Reply HELP for help, STOP to cancel. Optional — we’ll call you either way. SMS Terms · Privacy Policy";
const CHAT_CONSENT_QUESTION = "Last one: can Harmonized Brain Centers text you appointment and inquiry updates at that number? Msg frequency varies. Msg & data rates may apply. Reply HELP for help, STOP to cancel. Terms: /sms-terms · Privacy: /privacy-policy. Yes or no is fine — we’ll call you either way.";
const NO_TEXT_CONSENT_LINE = "[Texts: NO consent to text this number. Call or email only.]";
const texts = () =>
  existsSync(SMS_LOG)
    ? readFileSync(SMS_LOG, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l))
    : [];
const textsNaming = (name) => texts().filter((t) => String(t.body?.text ?? "").startsWith(`Hi ${firstWord(name)},`));

/* ── assertions ────────────────────────────────────────────────────────── */

const failures = [];
let passes = 0;
const created = [];
function expect(label, ok, detail = "") {
  if (ok) {
    passes += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
    console.log(`  ✗ ${label}${detail ? `\n      ${detail}` : ""}`);
  }
}

/** The row for a submission: exactly one, with the columns step one wrote. */
async function expectRow(name, { center, helpingWho, concerns, note, email = emailFor(name), source = "form", bestTime = "Any time", sourcePage = "/contact", consent, consentText = FORM_CONSENT_TEXT }) {
  const rows = await rowsNamed(name);
  expect(`${name}: exactly one row`, rows.length === 1, `${rows.length} row(s)`);
  const r = rows[0];
  if (!r) return null;
  created.push(r.id);
  expect(`${name}: type/source`, r.type === "consultation" && r.source === source, `${r.type}/${r.source}`);
  expect(`${name}: phone saved`, r.phone === "0000000000", r.phone);
  expect(`${name}: preferred_center = ${JSON.stringify(center)}`, r.preferred_center === center, String(r.preferred_center));
  expect(`${name}: best_time = ${JSON.stringify(bestTime)}`, r.best_time === bestTime, String(r.best_time));
  expect(`${name}: email = ${JSON.stringify(email)}`, r.email === email, String(r.email));
  expect(`${name}: source_page = ${sourcePage}`, r.source_page === sourcePage, String(r.source_page));
  expect(`${name}: helping_who = ${JSON.stringify(helpingWho)}`, r.helping_who === helpingWho, String(r.helping_who));
  expect(`${name}: concerns = ${JSON.stringify(concerns)}`, JSON.stringify(r.concerns) === JSON.stringify(concerns), JSON.stringify(r.concerns));
  expect(`${name}: note = ${JSON.stringify(note)}`, r.note === note, String(r.note));
  expect(`${name}: sms_consent = ${consent}`, r.sms_consent === consent, String(r.sms_consent));
  expect(`${name}: sms_consent_text is the exact wording shown`, r.sms_consent_text === consentText, JSON.stringify(r.sms_consent_text));
  const at = r.sms_consent_at ? Date.parse(r.sms_consent_at) : null;
  expect(
    `${name}: sms_consent_at ${consent ? "stamped within the last 10 minutes" : "null"}`,
    consent ? at !== null && Date.now() - at < 10 * 60_000 && Date.now() - at > -60_000 : at === null,
    String(r.sms_consent_at)
  );
  return r;
}

/** Exactly one email, carrying the lead and pointing at the row. */
function expectEmail(name, row, { center, consent, source = "the contact form", inbox = env.LEADS_NOTIFY_EMAIL ?? "office@example.test" }) {
  const list = emailsNaming(name);
  expect(`${name}: exactly one notification email`, list.length === 1, `${list.length} email(s)`);
  const e = list[0];
  if (!e) return;
  const text = e.body.text;
  expect(`${name}: email subject names the lead and center`, e.body.subject.includes(name) && e.body.subject.includes(center), e.body.subject);
  expect(`${name}: email body says the channel`, text.includes(`via ${source}.`));
  expect(`${name}: email body carries the phone`, text.includes("Phone:     0000000000"));
  if (row) expect(`${name}: email points at the saved row`, text.includes(`Saved request: ${row.id}`));
  expect(`${name}: email went to ${inbox}`, JSON.stringify(e.body.to).includes(inbox), JSON.stringify(e.body.to));
  expect(`${name}: email body carries the name whole`, text.includes(`Name:      ${name}`), JSON.stringify(text.split("\n").find((l) => l.startsWith("Name:"))));
  const textsLine = text.split("\n").find((l) => l.startsWith("Texts:")) ?? null;
  expect(`${name}: email says ${consent ? "OK to text" : "NO consent to text"}`, consent ? textsLine?.includes("OK to text") : textsLine?.includes("NO consent to text"), JSON.stringify(textsLine));
}

/**
 * The confirmation text: one per lead, in Ben's words, greeting by the first
 * word only, STOP last, from the chosen center's line (lib/center-routing.ts
 * — a center with no line of its own falls back to DIALPAD_SMS_FROM).
 */
function expectText(name, { from = env.DIALPAD_SMS_FROM ?? "+16155550100" }) {
  const list = textsNaming(name);
  expect(`${name}: exactly one confirmation text`, list.length === 1, `${list.length} text(s)`);
  const t = list[0];
  if (!t) return;
  const body = String(t.body.text ?? "");
  expect(`${name}: text is exactly Ben's words with HELP/STOP, first word of the name only`, body === SMS_EXACT(firstWord(name)) && !body.includes("Tester"), JSON.stringify(body));
  const seg = segments(body);
  expect(`${name}: text is GSM-7, two segments (${seg.units} units)`, seg.gsm7 && seg.segments === 2, JSON.stringify(seg));
  expect(`${name}: text goes to the number given`, JSON.stringify(t.body.to_numbers) === JSON.stringify(["+10000000000"]), JSON.stringify(t.body.to_numbers));
  expect(`${name}: text comes from ${from}`, t.body.from_number === from, String(t.body.from_number));
}

/** No consent, no text — not even the confirmation. */
function expectNoText(name, why) {
  const list = textsNaming(name);
  expect(`${name}: ${why} sends NO text`, list.length === 0, `${list.length} text(s): ${JSON.stringify(list.map((t) => t.body?.text))}`);
}

/**
 * The platform forward. Every consultation posts once at step one — with the
 * who-for stand-in and the flag line when the form has not asked yet — and
 * the save path posts a second time, labelled as an update, with the answers.
 */
function expectForward(name, { center, consent, whoFor = null, updated = null }) {
  const list = forwardsNaming(name);
  const want = updated ? 2 : 1;
  expect(`${name}: ${want} platform post(s)`, list.length === want, `${list.length} post(s)`);
  const first = list[0];
  if (!first) return;
  expect(`${name}: platform post carries the secret header`, first.secretPresent === true);
  expect(`${name}: platform post phone/center`, first.body.phone === "0000000000" && first.body.preferredCenter === center, JSON.stringify([first.body.phone, first.body.preferredCenter]));
  expect(`${name}: platform post honeypot present and empty`, first.body.website === "", JSON.stringify(first.body.website));
  expect(
    `${name}: platform post ${consent ? "carries no" : "carries the"} no-consent line`,
    consent ? !String(first.body.message ?? "").includes(NO_TEXT_CONSENT_LINE) : String(first.body.message ?? "").includes(NO_TEXT_CONSENT_LINE),
    JSON.stringify(first.body.message)
  );
  if (whoFor === null) {
    expect(`${name}: step-one post uses the who-for stand-in`, first.body.whoFor === WHO_FOR_STAND_IN, first.body.whoFor);
    expect(`${name}: step-one post flags who-for as not given, first line`, String(first.body.message ?? "").startsWith(NOT_GIVEN_LINE), JSON.stringify(first.body.message));
    expect(`${name}: step-one post is not labelled an update`, !String(first.body.message ?? "").includes(UPDATE_LINE));
  } else {
    expect(`${name}: post whoFor = ${whoFor}`, first.body.whoFor === whoFor, first.body.whoFor);
    expect(`${name}: post carries no not-given flag`, !String(first.body.message ?? "").includes(NOT_GIVEN_LINE), JSON.stringify(first.body.message));
  }
  if (updated) {
    const second = list[1];
    if (!second) return;
    expect(`${name}: update post is labelled, first line`, String(second.body.message ?? "").startsWith(UPDATE_LINE), JSON.stringify(second.body.message));
    expect(`${name}: update post whoFor = ${updated.whoFor}`, second.body.whoFor === updated.whoFor, second.body.whoFor);
    expect(`${name}: update post concerns = ${JSON.stringify(updated.concerns)}`, JSON.stringify(second.body.concerns) === JSON.stringify(updated.concerns), JSON.stringify(second.body.concerns));
    expect(`${name}: update post carries the note`, String(second.body.message ?? "").endsWith(updated.note), JSON.stringify(second.body.message));
    expect(`${name}: update post carries no not-given flag`, !String(second.body.message ?? "").includes(NOT_GIVEN_LINE));
    expect(`${name}: update post keeps the consent answer`, consent === !String(second.body.message ?? "").includes(NO_TEXT_CONSENT_LINE), JSON.stringify(second.body.message));
    expect(`${name}: update post keeps name/phone/center/time`, second.body.firstName === name && second.body.phone === "0000000000" && second.body.preferredCenter === center && second.body.bestTimeToCall === first.body.bestTimeToCall, JSON.stringify(second.body));
  }
}

/* ── browser helpers ───────────────────────────────────────────────────── */

const setValue = (selector, value) => `(() => {
  const el = document.querySelector(${JSON.stringify(selector)});
  if (!el) return "missing " + ${JSON.stringify(selector)};
  const proto = el.tagName === "SELECT" ? HTMLSelectElement.prototype : el.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, "value").set.call(el, ${JSON.stringify(value)});
  el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
  return "ok";
})()`;

const clickText = (text, tag = "button") => `(() => {
  const el = [...document.querySelectorAll(${JSON.stringify(tag)})].find((b) => b.textContent.trim().startsWith(${JSON.stringify(text)}));
  if (!el) return "missing button " + ${JSON.stringify(text)};
  el.click();
  return "ok";
})()`;

/** Wait for a panel whose heading contains `heading`, then report its reveal and its text. */
async function waitPanel(page, heading, timeout = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const state = await page.eval(`(() => {
      const h = [...document.querySelectorAll(".form-step h2")].find((x) => x.textContent.trim().includes(${JSON.stringify(heading)}));
      if (!h) return null;
      const panel = h.closest(".form-step");
      const cs = getComputedStyle(panel);
      return { opacity: Number(cs.opacity), hasIn: panel.classList.contains("in"), transform: cs.transform, top: panel.getBoundingClientRect().top, focused: document.activeElement === h, text: h.textContent.trim() };
    })()`);
    if (state && state.opacity === 1 && state.hasIn) return state;
    await sleep(120);
  }
  return await page.eval(`(() => {
    const h = [...document.querySelectorAll(".form-step h2")].find((x) => x.textContent.trim().includes(${JSON.stringify(heading)}));
    if (!h) return { missing: true };
    const panel = h.closest(".form-step"); const cs = getComputedStyle(panel);
    return { opacity: Number(cs.opacity), hasIn: panel.classList.contains("in"), transform: cs.transform, top: panel.getBoundingClientRect().top, text: h.textContent.trim() };
  })()`);
}

/** Step two as the visitor sees it: greeting, no reassurance panel, the exit. */
async function expectStepTwo(page, name, two) {
  expect(`${name}: step two mounts and reveals (opacity 1, .in)`, two?.opacity === 1 && two.hasIn, JSON.stringify(two));
  expect(`${name}: step two headline greets by the first word only`, two?.text?.startsWith(`Hi ${firstWord(name)}, your call is requested.`) && !two.text.includes("Tester"), JSON.stringify(two?.text));
  const look = JSON.parse(await page.eval(`JSON.stringify((() => {
    const panel = document.querySelector(".form-step");
    const skip = panel.querySelector(".form-skip");
    const noteLabel = panel.querySelector('label[for="note"]');
    return {
      sage: panel.querySelectorAll(".note-sage").length,
      optionalWords: (panel.textContent.match(/optional/gi) ?? []).length,
      noteLabel: noteLabel?.textContent.trim() ?? null,
      skip: skip ? { text: skip.textContent.trim(), size: parseFloat(getComputedStyle(skip).fontSize), color: getComputedStyle(skip).color, visible: skip.getBoundingClientRect().height > 0 } : null,
    };
  })())`));
  expect(`${name}: step two has no reassurance panel and never says "optional"`, look.sage === 0 && look.optionalWords === 0, JSON.stringify(look));
  expect(`${name}: note label is "In your own words", nothing after it`, look.noteLabel === "In your own words", JSON.stringify(look.noteLabel));
  expect(`${name}: "Skip for now" is there, small and quiet`, look.skip?.text === "Skip for now" && look.skip.visible && look.skip.size <= 14, JSON.stringify(look.skip));
}

/** The thank-you on step three greets by the first word too. */
async function expectThankYou(page, name) {
  const h3 = await page.eval(`(() => [...document.querySelectorAll(".form-step h3")].map((h) => h.textContent.trim()).find((t) => t.startsWith("Thank you")) ?? null)()`);
  expect(`${name}: step three thank-you greets by the first word only`, h3 === `Thank you, ${firstWord(name)}. Here’s what happens next.`, JSON.stringify(h3));
  const ready = await page.eval(`(() => { const p = document.querySelector(".form-step"); return p.textContent.includes("Helpful to have ready (not required):") && p.textContent.includes("What a typical hard day looks like") && document.querySelectorAll("h2.eyebrow").length === 0; })()`);
  expect(`${name}: "Helpful to have ready" sits in the card, and the second column is gone`, ready === true);
}

/**
 * The consent box as the visitor finds it: under the phone row, unchecked,
 * the exact wording in its label, links to both pages. Then tick it or not.
 */
async function consentBox(page, name, tick) {
  const look = JSON.parse(await page.eval(`JSON.stringify((() => {
    const box = document.querySelector("#sms-consent");
    const wrap = box?.closest(".sms-consent");
    const label = document.querySelector('label[for="sms-consent"]');
    const prev = wrap?.previousElementSibling;
    return {
      present: !!box,
      type: box?.type ?? null,
      checked: box?.checked ?? null,
      required: box?.required ?? null,
      label: label?.textContent ?? null,
      hrefs: [...(label?.querySelectorAll("a") ?? [])].map((a) => a.getAttribute("href")),
      underPhone: !!prev?.querySelector("#phone"),
    };
  })())`));
  expect(`${name}: consent box present, a checkbox, unchecked on load, not required`, look.present && look.type === "checkbox" && look.checked === false && look.required === false, JSON.stringify(look));
  expect(`${name}: consent label is the exact wording`, look.label === FORM_CONSENT_TEXT, JSON.stringify(look.label));
  expect(`${name}: consent label links /sms-terms and /privacy-policy`, JSON.stringify(look.hrefs) === JSON.stringify(["/sms-terms", "/privacy-policy"]), JSON.stringify(look.hrefs));
  expect(`${name}: consent box sits directly under the phone row`, look.underPhone, JSON.stringify(look));
  if (tick) {
    const r = await page.eval(`(() => { const b = document.querySelector("#sms-consent"); b.click(); return b.checked ? "ok" : "click did not check it"; })()`);
    if (r !== "ok") throw new Error(r);
  }
}

async function stepOne(page, width, name, { email = emailFor(name), center = "Not sure yet", consent = false } = {}) {
  await page.setViewport(width, width <= 400 ? 700 : 900);
  await page.goto(`${BASE}/contact`, { settle: 400 });
  await consentBox(page, name, consent);
  // goto() stamps `in` on every .rv that exists at load; the panels this
  // check cares about do not exist yet, so the reveal gate is still real.
  for (const [sel, val] of [["#name", name], ["#phone", "0000000000"], ["#email", email], ["#preferred-center", center]]) {
    const r = await page.eval(setValue(sel, val));
    if (r !== "ok") throw new Error(r);
  }
  const r = await page.eval(clickText("Request my free call"));
  if (r !== "ok") throw new Error(r);
}

/** Submit, then read the form's own error line (role=alert), if any. */
async function submitAndReadAlert(page) {
  const r = await page.eval(clickText("Request my free call"));
  if (r !== "ok") throw new Error(r);
  await sleep(150);
  return page.eval(`(() => document.querySelector('form [role="alert"]')?.textContent.trim() ?? null)()`);
}

async function pathSave(page, width) {
  const name = `E2E-${RUN}-save-${width} Tester`;
  console.log(`\n▸ save path @ ${width}px — ${name}`);
  await stepOne(page, width, name, { center: "Murfreesboro", consent: true });
  const two = await waitPanel(page, "call is requested");
  await expectStepTwo(page, name, two);
  expect(`${name}: step two heading took focus`, two?.focused === true);
  // Nothing pre-selected.
  const pre = await page.eval(`JSON.stringify({ radios: [...document.querySelectorAll('[role=radio][aria-checked=true]')].length, pressed: [...document.querySelectorAll('[aria-pressed=true]')].length })`);
  expect(`${name}: step two starts with nothing selected`, pre === '{"radios":0,"pressed":0}', pre);
  // The row exists before step two is shown.
  const rowsNow = await rowsNamed(name);
  expect(`${name}: row saved before step two was shown`, rowsNow.length === 1, `${rowsNow.length} row(s)`);
  const emailsNow = emailsNaming(name);
  expect(`${name}: lead email sent before step two was shown`, emailsNow.length === 1, `${emailsNow.length} email(s)`);
  expect(`${name}: platform forwarded before step two was shown`, forwardsNaming(name).length === 1, `${forwardsNaming(name).length} post(s)`);

  for (const t of ["My child"]) await page.eval(clickText(t));
  for (const t of ["Sleep", "Focus & ADHD"]) await page.eval(clickText(t));
  await page.eval(setValue("#note", "E2E note — bedtime is the hard part."));
  await page.eval(clickText("Save these details"));
  const three = await waitPanel(page, "While you wait for our call");
  expect(`${name}: video panel mounts and reveals (opacity 1, .in)`, three?.opacity === 1 && three.hasIn, JSON.stringify(three));
  const readVideo = () => page.eval(`JSON.stringify((() => { const b = document.querySelector(".video-play"); const img = document.querySelector(".video-stage img"); return { button: !!b, label: b?.getAttribute("aria-label"), poster: img?.currentSrc ?? null, posterLoaded: img ? img.complete && img.naturalWidth > 0 : false, iframes: document.querySelectorAll("iframe").length, phones: [...document.querySelectorAll(".form-step .note-sage a[href^='tel:']")].length }; })())`);
  let video = await readVideo();
  for (let i = 0; i < 25 && !JSON.parse(video).posterLoaded; i++) {
    await sleep(200);
    video = await readVideo();
  }
  const v = JSON.parse(video);
  expect(`${name}: play button present, labelled, no iframe before click`, v.button && /Play video: What to Expect/.test(v.label ?? "") && v.iframes === 0, video);
  expect(`${name}: poster served from this origin and decoded`, v.poster?.startsWith(`${BASE}/`) && v.posterLoaded, v.poster);
  expect(`${name}: both center numbers visible below the video`, v.phones === 2, `${v.phones} tel link(s)`);
  await expectThankYou(page, name);
  await sleep(300);
  const row = await expectRow(name, { center: "Murfreesboro", helpingWho: "My child", concerns: ["Sleep", "Focus & ADHD"], note: "E2E note — bedtime is the hard part.", consent: true });
  // Per-center routing (lib/center-routing.ts): a Murfreesboro lead goes to
  // LEADS_NOTIFY_EMAIL_MURFREESBORO when the server has it, else the default,
  // and its text comes from DIALPAD_SMS_FROM_MURFREESBORO the same way. Pass
  // the server's values to this check so it can say which it expects.
  expectEmail(name, row, { center: "Murfreesboro", consent: true, inbox: env.LEADS_NOTIFY_EMAIL_MURFREESBORO ?? env.LEADS_NOTIFY_EMAIL ?? "office@example.test" });
  expect(`${name}: still exactly one email after step two`, emailsNaming(name).length === 1, `${emailsNaming(name).length}`);
  expectText(name, { from: env.DIALPAD_SMS_FROM_MURFREESBORO ?? env.DIALPAD_SMS_FROM ?? "+16155550100" });
  expect(`${name}: still exactly one text after step two`, textsNaming(name).length === 1, `${textsNaming(name).length}`);
  expectForward(name, { center: "Murfreesboro", consent: true, updated: { whoFor: "my_child", concerns: ["sleep", "focus_adhd"], note: "E2E note — bedtime is the hard part." } });
  return { name, row };
}

async function pathSkip(page, width) {
  const name = `E2E-${RUN}-skip-${width} Tester`;
  console.log(`\n▸ skip path @ ${width}px — ${name}`);
  await stepOne(page, width, name, { center: "Nashville", consent: false });
  const two = await waitPanel(page, "call is requested");
  await expectStepTwo(page, name, two);
  // The quiet exit: the .form-skip link, not a button labelled anything else.
  const skipped = await page.eval(`(() => { const b = document.querySelector(".form-step .form-skip"); if (!b) return "missing .form-skip"; b.click(); return "ok"; })()`);
  expect(`${name}: the "Skip for now" link is clickable`, skipped === "ok", skipped);
  const three = await waitPanel(page, "While you wait for our call");
  expect(`${name}: video panel mounts and reveals (opacity 1, .in)`, three?.opacity === 1 && three.hasIn, JSON.stringify(three));
  await expectThankYou(page, name);
  await sleep(300);
  const row = await expectRow(name, { center: "Nashville", helpingWho: null, concerns: [], note: null, consent: false });
  expectEmail(name, row, { center: "Nashville", consent: false });
  // The skip path reaches the platform: step one is the lead.
  expectForward(name, { center: "Nashville", consent: false });
  // The box was left unticked: the lead lands everywhere else, and no text.
  expectNoText(name, "an unticked consent box");
  return { name, row };
}

async function pathLeave(chrome, width) {
  const name = `E2E-${RUN}-leave-${width} Tester`;
  console.log(`\n▸ leave path @ ${width}px — ${name}`);
  const page = await chrome.newPage();
  await page.init();
  // First the form's own refusals, in the browser: no email, then a bad one.
  // Neither may reach the server — the row count at the end says so.
  await page.setViewport(width, 700);
  await page.goto(`${BASE}/contact`, { settle: 400 });
  for (const [sel, val] of [["#name", name], ["#phone", "0000000000"], ["#preferred-center", "Not sure yet"]]) {
    const r = await page.eval(setValue(sel, val));
    if (r !== "ok") throw new Error(r);
  }
  const look = JSON.parse(await page.eval(`JSON.stringify((() => {
    const email = document.querySelector("#email");
    const label = document.querySelector('label[for="email"]');
    const form = email?.closest("form");
    return { required: email?.required ?? null, type: email?.type ?? null, label: label?.textContent.trim() ?? null, mentionsOptionalEmail: /add an email address|email\s*\(optional\)/i.test(form?.textContent ?? ""), disclosure: !!document.querySelector(".form-disclose"), inRowWithPhone: email?.parentElement?.parentElement === document.querySelector("#phone")?.parentElement?.parentElement };
  })())`));
  expect(`${name}: email is a required, visible field beside phone, and nothing calls it optional`, look.required === true && look.type === "email" && look.label === "Email" && !look.mentionsOptionalEmail && !look.disclosure && look.inRowWithPhone, JSON.stringify(look));
  const noEmail = await submitAndReadAlert(page);
  expect(`${name}: submitting without an email is refused in the browser`, /email/i.test(noEmail ?? ""), JSON.stringify(noEmail));
  await page.eval(setValue("#email", "not-an-address"));
  const badEmail = await submitAndReadAlert(page);
  expect(`${name}: a malformed email is refused in the browser`, /doesn.t look right/i.test(badEmail ?? ""), JSON.stringify(badEmail));
  expect(`${name}: the refusals wrote nothing`, (await rowsNamed(name)).length === 0 && emailsNaming(name).length === 0 && forwardsNaming(name).length === 0);
  // Then the real thing, with the box ticked.
  await stepOne(page, width, name, { consent: true });
  const two = await waitPanel(page, "call is requested");
  expect(`${name}: step two shown (then the tab closes)`, two?.opacity === 1, JSON.stringify(two));
  await page.close();
  await sleep(500);
  const row = await expectRow(name, { center: "Not sure yet", helpingWho: null, concerns: [], note: null, consent: true });
  expectEmail(name, row, { center: "Not sure yet", consent: true });
  expectForward(name, { center: "Not sure yet", consent: true });
  expectText(name, {});
}

/**
 * Click play with a real mouse event and watch what the player does.
 *
 * The YouTube iframe is cross-origin, so with site isolation it renders in
 * its own process and its network traffic is reported on *its* target, not
 * the page's. `Target.setAutoAttach` on the page session attaches to such
 * frames as they appear; each gets Network.enable and its events are counted
 * alongside the page's.
 */
/**
 * A Permissions-Policy line that matters: one about a feature the site denies
 * (next.config.ts) or the embed delegates (the iframe's `allow`). The player
 * also probes features nobody gave it and it does not need to play —
 * compute-pressure, from Oct 2026 — and logs a violation for each; those are
 * noise, and counting them would fail the check for a header that is right.
 */
const POLICY_FEATURES = ["camera", "microphone", "geolocation", "payment", "autoplay", "encrypted-media", "picture-in-picture", "fullscreen"];
const isPolicyViolation = (text) =>
  /permissions?[- ]policy|feature policy/i.test(text) && POLICY_FEATURES.some((f) => text.includes(f));

async function playVideo(chrome, page, name) {
  console.log(`\n▸ the video plays — ${name}`);
  const seen = { media: 0, embed: 0, violations: [], frames: 0 };
  const sessions = new Set([page.sessionId]);
  await page.send("Log.enable");
  await page.send("Target.setAutoAttach", { autoAttach: true, waitForDebuggerOnStart: false, flatten: true });
  const off = chrome.browser.onEvent((msg) => {
    if (msg.method === "Target.attachedToTarget" && msg.sessionId === page.sessionId) {
      const child = msg.params.sessionId;
      sessions.add(child);
      seen.frames += 1;
      chrome.browser.send("Network.enable", {}, child).catch(() => {});
      chrome.browser.send("Runtime.enable", {}, child).catch(() => {});
      chrome.browser.send("Log.enable", {}, child).catch(() => {});
      return;
    }
    if (!sessions.has(msg.sessionId)) return;
    if (msg.method === "Network.requestWillBeSent") {
      const u = msg.params.request.url;
      if (/youtube-nocookie\.com\/embed\//.test(u)) seen.embed += 1;
      if (/googlevideo\.com\/videoplayback|\/videoplayback\?/.test(u)) seen.media += 1;
    }
    if (msg.method === "Log.entryAdded" && isPolicyViolation(msg.params.entry.text)) {
      seen.violations.push(msg.params.entry.text);
    }
    if (msg.method === "Runtime.consoleAPICalled") {
      const text = msg.params.args.map((a) => a.value ?? a.description ?? "").join(" ");
      if (isPolicyViolation(text)) seen.violations.push(text);
    }
  });
  const box = await page.eval(`JSON.stringify((() => { const b = document.querySelector(".video-play"); b.scrollIntoView({ block: "center" }); const r = b.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; })())`);
  const { x, y } = JSON.parse(box);
  await sleep(200);
  for (const type of ["mouseMoved", "mousePressed", "mouseReleased"]) {
    await page.send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
  }
  const t0 = Date.now();
  while (Date.now() - t0 < 15000 && seen.media === 0) await sleep(250);
  // Keep watching a beat so the screenshot shows the player, not the swap.
  await sleep(1500);
  const shot = await page.screenshot({ fullPage: false });
  const { writeFileSync } = await import("node:fs");
  const shotPath = join(process.env.CHECK_SHOTS ?? ROOT, "contact-video-playing-1440.png");
  writeFileSync(shotPath, shot);
  console.log(`  · screenshot of the playing state: ${shotPath}`);
  off();
  const frame = await page.eval(`JSON.stringify((() => { const f = document.querySelector(".video-stage iframe"); return { present: !!f, src: f?.src ?? null, allow: f?.getAttribute("allow"), title: f?.title, focused: document.activeElement === f, buttonGone: !document.querySelector(".video-play") }; })())`);
  const f = JSON.parse(frame);
  expect(`${name}: click swaps the poster for the youtube-nocookie iframe`, f.present && /^https:\/\/www\.youtube-nocookie\.com\/embed\/FCUyUqzE3Dk\?/.test(f.src ?? "") && f.src.includes("autoplay=1") && f.buttonGone, frame);
  expect(`${name}: iframe is titled and focused`, f.title === "Your First Appointment at Harmonized Brain Centers: What to Expect" && f.focused, frame);
  expect(`${name}: the embed document was requested`, seen.embed >= 1, `${seen.embed}`);
  expect(`${name}: the player fetched media (playback started)`, seen.media >= 1, `${seen.media} videoplayback request(s) in 15s across ${seen.frames} attached frame(s)`);
  expect(`${name}: no Permissions-Policy violation logged`, seen.violations.length === 0, seen.violations.join(" | "));
}

/* ── the chat's write path, and the PATCH route's refusals ──────────────── */

const chatSessions = [];

/**
 * One whole booking conversation through /api/chat — the real state machine
 * (lib/chat/booking.ts), not a replay of its POST body. Each conversation
 * comes from its own made-up client address so the route's per-minute limit
 * (12) is never what a run trips over. The center and time are declined, the
 * shape migration 0004 had to keep working.
 */
async function chatConversation(answer, consent, n) {
  const name = `E2E-${RUN}-chat${consent ? "yes" : "no"}`;
  console.log(`\n▸ chat booking, texts answered ${JSON.stringify(answer)} — ${name}`);
  let sessionId;
  const say = async (message) => {
    const res = await fetch(`${BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": `10.99.${n}.${RUN.slice(-2) % 250}` },
      body: JSON.stringify({ message, page: "/", ...(sessionId ? { sessionId } : {}) }),
    });
    const body = await res.json().catch(() => null);
    if (res.status === 404) throw new Error("/api/chat answered 404 — the server was built with NEXT_PUBLIC_FEATURE_ASSISTANT off; check:contact needs it on");
    if (!res.ok) throw new Error(`/api/chat → ${res.status} ${JSON.stringify(body)}`);
    sessionId = body.sessionId;
    return String(body.reply ?? "");
  };
  await say("I'd like to book a call");
  await say("Myself");
  await say(name);
  await say("0000000000");
  await say("chat note");
  await say("skip");
  const asked = await say("skip");
  chatSessions.push(sessionId);
  expect(`${name}: the consent question is asked, exactly, after the center`, asked === CHAT_CONSENT_QUESTION, JSON.stringify(asked));
  const readBack = await say(answer);
  expect(
    `${name}: read-back ${consent ? "mentions" : "does not mention"} a text`,
    readBack.startsWith(`Let me read that back: ${name}, 0000000000.`) && readBack.includes("We’ll text that number") === consent,
    JSON.stringify(readBack)
  );
  const done = await say("yes");
  expect(`${name}: booking submitted`, done.startsWith(`You’re all set, ${name}.`), JSON.stringify(done));
  await sleep(300);
  // No email: the chat does not ask for one, and the route does not hold it
  // to the form's rule. The wording stored is the question as asked, for a
  // yes and a no alike.
  const row = await expectRow(name, { center: "Not sure yet", helpingWho: "Myself", concerns: [], note: "chat note", email: null, source: "chat", bestTime: null, sourcePage: "/", consent, consentText: CHAT_CONSENT_QUESTION });
  expectEmail(name, row, { center: "Not sure yet", consent, source: "the site assistant (chat)" });
  expectForward(name, { center: "Not sure yet", consent, whoFor: "myself" });
  if (consent) expectText(name, {});
  else expectNoText(name, `a ${JSON.stringify(answer)} to the chat's consent question`);
  return row;
}

/** `sms_consent: true` without the wording is not consent — no text. */
async function forgedConsent() {
  const name = `E2E-${RUN}-forged-0 Tester`;
  console.log(`\n▸ consent claimed without the wording — ${name}`);
  const res = await fetch(`${BASE}/api/consultation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "consultation", source: "form", first_name: name, phone: "0000000000", email: emailFor(name), preferred_center: "Nashville", best_time: "Any time", website: "", source_page: "/contact", sms_consent: true }),
  });
  expect(`${name}: still accepted (201) — consent is never a condition`, res.status === 201, String(res.status));
  await sleep(300);
  const rows = await rowsNamed(name);
  if (rows[0]) created.push(rows[0].id);
  expect(`${name}: recorded as NO consent, no wording, no time`, rows.length === 1 && rows[0].sms_consent === false && rows[0].sms_consent_text === null && rows[0].sms_consent_at === null, JSON.stringify(rows.map((r) => [r.sms_consent, r.sms_consent_text, r.sms_consent_at])));
  expectNoText(name, "a consent flag sent without the wording");
}

/** The route's own email rule, without a browser: the form must send one. */
async function postRefusals() {
  console.log(`\n▸ POST refusals`);
  const name = `E2E-${RUN}-refused-0 Tester`;
  const post = (payload) => fetch(`${BASE}/api/consultation`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "consultation", source: "form", first_name: name, phone: "0000000000", preferred_center: "Nashville", best_time: "Any time", website: "", source_page: "/contact", ...payload }) }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
  const missing = await post({});
  expect("POST from the form without an email is refused (400), and says so", missing.status === 400 && /email/i.test(missing.body?.error ?? ""), JSON.stringify(missing));
  const bad = await post({ email: "not-an-address" });
  expect("POST with a malformed email is refused (400)", bad.status === 400 && /doesn't look right/.test(bad.body?.error ?? ""), JSON.stringify(bad));
  await sleep(200);
  expect("refused POSTs wrote no row, sent no email, no post, no text", (await rowsNamed(name)).length === 0 && emailsNaming(name).length === 0 && forwardsNaming(name).length === 0 && textsNaming(name).length === 0);
}

async function patchRefusals(row) {
  console.log(`\n▸ PATCH refusals`);
  const patch = (id, payload) => fetch(`${BASE}/api/consultation/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) }).then((r) => r.status);
  expect("PATCH with phone is refused (400)", (await patch(row.id, { phone: "1111111111" })) === 400);
  expect("PATCH with first_name is refused (400)", (await patch(row.id, { first_name: "Mallory", note: "x" })) === 400);
  expect("PATCH with preferred_center is refused (400)", (await patch(row.id, { preferred_center: "Nashville" })) === 400);
  expect("PATCH with best_time is refused (400)", (await patch(row.id, { best_time: "Evenings" })) === 400);
  expect("PATCH with an unknown helping_who is refused (400)", (await patch(row.id, { helping_who: "My dog" })) === 400);
  expect("PATCH with an empty body is refused (400)", (await patch(row.id, {})) === 400);
  expect("PATCH to an unknown id answers 404", (await patch("00000000-0000-4000-8000-000000000000", { note: "x" })) === 404);
  expect("PATCH to a non-uuid answers 404", (await patch("not-a-uuid", { note: "x" })) === 404);
  const [after] = await rest(`consultation_requests?id=eq.${row.id}&select=phone,first_name,preferred_center,best_time`);
  expect("refused PATCHes changed nothing", after.phone === "0000000000" && after.first_name === row.first_name && after.preferred_center === row.preferred_center && after.best_time === row.best_time, JSON.stringify(after));
  expect("refused PATCHes posted nothing to the platform", forwardsNaming(row.first_name).length === 2, `${forwardsNaming(row.first_name).length} post(s)`);
}

async function patchChatRowRefused(chatRow) {
  const status = await fetch(`${BASE}/api/consultation/${chatRow.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note: "x" }) }).then((r) => r.status);
  expect("PATCH to a chat row answers 404 (form rows only)", status === 404, String(status));
}

/* ── run ───────────────────────────────────────────────────────────────── */

console.log(`check:contact against ${BASE}, project ${ref}, run ${RUN}${KEEP ? " (keeping rows)" : ""}`);
const health = await fetch(`${BASE}/contact`).then((r) => r.status).catch(() => 0);
if (health !== 200) {
  console.error(`${BASE}/contact → ${health}; start the production server first (see the header).`);
  process.exit(1);
}

/** Every row that is not this run's: id → hash. Nothing is printed or kept. */
async function fingerprintOthers() {
  const rows = await rest(`consultation_requests?select=*&order=id`);
  const out = new Map();
  for (const r of rows) {
    if (String(r.first_name ?? "").startsWith(`E2E-${RUN}-`)) continue;
    out.set(r.id, createHash("sha256").update(JSON.stringify(r)).digest("hex"));
  }
  return out;
}
const before = await fingerprintOthers();
console.log(`fingerprinted ${before.size} existing row(s) — they must be untouched at the end`);

let chrome;
try {
  chrome = await launch();
} catch (error) {
  console.error(`\n  ${error.message}`);
  process.exit(1);
}

let saveRows = [];
try {
  const page = await chrome.newPage();
  await page.init();
  for (const width of [320, 768, 1440]) {
    const saved = await pathSave(page, width);
    saveRows.push(saved);
    if (width === 1440) await playVideo(chrome, page, saved.name);
    await pathSkip(page, width);
  }
  await pathLeave(chrome, 390);
  await chatConversation("yes please", true, 1);
  const chatRow = await chatConversation("no thanks", false, 2);
  await forgedConsent();
  await postRefusals();
  if (saveRows[0]?.row) await patchRefusals(saveRows[0].row);
  if (chatRow) await patchChatRowRefused(chatRow);
} catch (error) {
  failures.push(`run aborted: ${error.message}`);
  console.error(error);
} finally {
  await chrome.close();
}

// The ids this run created, by exact id; then a sweep of THIS run's prefix
// for anything an aborted path wrote before it could be counted; then the
// chat sessions by id. Never another run's rows, never a looser pattern.
if (!KEEP) {
  if (created.length > 0) {
    const deleted = await rest(`consultation_requests?id=in.(${created.join(",")})`, { method: "DELETE" });
    console.log(`\ncleaned up ${deleted.length} of ${created.length} test row(s)`);
    if (deleted.length !== created.length) failures.push(`cleanup removed ${deleted.length} of ${created.length} rows`);
  }
  const stray = await rest(`consultation_requests?first_name=like.${encodeURIComponent(`E2E-${RUN}-*`)}`, { method: "DELETE" });
  if (stray.length > 0) {
    console.log(`swept ${stray.length} uncounted row(s) from this run`);
    failures.push(`${stray.length} test row(s) were written but never asserted`);
  }
  if (chatSessions.length > 0) {
    const gone = await rest(`chat_sessions?id=in.(${chatSessions.map((id) => `"${id}"`).join(",")})`, { method: "DELETE" });
    console.log(`deleted ${gone.length} of ${chatSessions.length} chat session(s)`);
  }
  const left = await rest(`consultation_requests?first_name=like.${encodeURIComponent(`E2E-${RUN}-*`)}&select=id`);
  expect("no row from this run is left in the table", left.length === 0, `${left.length} left`);
} else if (created.length > 0) {
  console.log(`\nkept ${created.length} test row(s): ${created.join(", ")}`);
}

const after = await fingerprintOthers();
const changed = [...before].filter(([id, hash]) => after.get(id) !== hash).length;
expect(`all ${before.size} pre-existing row(s) still present and byte-identical`, changed === 0, `${changed} missing or changed`);

const total = emails().length;
console.log(`\n${passes} check(s) passed, ${failures.length} failed; ${total} email(s) in ${MOCK_LOG}, ${forwards().length} platform post(s) in ${PLATFORM_LOG}, ${texts().length} text(s) in ${SMS_LOG} this server session`);
if (failures.length > 0) {
  console.log("\n❌  contact flow:\n");
  for (const f of failures) console.log(`  • ${f}`);
  process.exit(1);
}
console.log("✓ contact flow: three form paths and two chat bookings, one row, one email and one lead post each; a text only where the box was ticked or the chat said yes, none otherwise; first-word greetings, the quiet skip, every late panel revealed, the video plays; existing rows untouched.");
