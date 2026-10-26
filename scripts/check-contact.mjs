/**
 * End-to-end check of the three-step contact form, against a production
 * build and the real Supabase project.
 *
 *   npm run build
 *   MOCK_RESEND_LOG=/tmp/resend.jsonl MOCK_PLATFORM_LOG=/tmp/platform.jsonl \
 *     MOCK_SMS_LOG=/tmp/sms.jsonl \
 *     NODE_OPTIONS="--import ./scripts/contact-flow/mock-resend.mjs" \
 *     RESEND_API_KEY=re_test LEADS_FALLBACK=office@example.test \
 *     LEADS_NASHVILLE=nash@example.test LEADS_MURFREESBORO=boro@example.test \
 *     DIALPAD_API_KEY=test DIALPAD_SMS_FROM=+16155550100 \
 *     INQUIRY_API_BASE=http://platform.test INQUIRY_INTAKE_SECRET=test \
 *     npx next start -p 3123
 *   CHECK_BASE=http://127.0.0.1:3123 MOCK_RESEND_LOG=/tmp/resend.jsonl \
 *     MOCK_PLATFORM_LOG=/tmp/platform.jsonl MOCK_SMS_LOG=/tmp/sms.jsonl \
 *     DIALPAD_SMS_FROM=+16155550100 LEADS_FALLBACK=office@example.test \
 *     LEADS_NASHVILLE=nash@example.test LEADS_MURFREESBORO=boro@example.test \
 *     CHECK_CONTACT_ALLOW_PROJECT=<project ref> npm run check:contact
 *
 * What it drives, in a headless Chrome (scripts/layout/cdp.mjs), at 320px,
 * 768px and 1440px — the short step one (Ben, 2026-10-26): first name, a
 * phone OR an email, the center (required, nothing preselected), and the
 * optional "Who referred you?" and "Anything we should know?":
 *
 *   save   step one (phone + email, referral, note) → step two (who, concerns,
 *          time, Text, the consent box ticked, "How did you hear") → "Send
 *          These Details" → the confirmation
 *   skip   step one (phone + email only) → step two → "Skip for now" → the
 *          confirmation; once more at 390×844, where the confirmation must
 *          fit the screen with no scrolling (Ben, 2026-10-14)
 *   leave  step one with a PHONE ONLY → close the tab on step two (once, at
 *          390px), after first trying to submit with neither a phone nor an
 *          email, a malformed phone, and no center. Its name is typed in
 *          lower case, and must be saved and greeted capitalized
 *   email  step one with an EMAIL ONLY (390px) → step two shows no consent
 *          box and no reach choice; a referral answer reveals "Who referred
 *          you?" there → save
 *
 * and, without a browser, two real conversations with the assistant's
 * six-step booking flow over /api/chat (needs a build with
 * NEXT_PUBLIC_FEATURE_ASSISTANT=true) — name and number in one reply, a bad
 * email re-asked, the center by button and by typo, the read-back with its
 * buttons, "Fix something" once, then "Yes, text me" in one and "No, just
 * call" in the other — plus a POST that claims consent without the wording
 * (must not count) and the PATCH route's refusals. And the raw HTML of
 * /contact, fetched with no JavaScript, must carry the consent sentence as
 * one unbroken string — what a carrier's scanner reads.
 *
 * ## Text consent (lib/sms-consent.ts, A2P 10DLC)
 *
 * The box is on step two now (Ben, 2026-10-26), shown only when a phone was
 * given. The save paths tick it; the skip and leave paths never reach it. Every lead is checked both ways: the box is present
 * under the phone row, unchecked on load, its label is the exact wording;
 * the row records consent, the wording shown and (only on a yes) the time;
 * the email's "Texts:" line and the platform's no-consent line agree with it;
 * and a text goes out only on a yes — an unticked box, a "no" in the chat or
 * a forged `sms_consent: true` send NOTHING.
 *
 * ## The held staff email (Ben, 2026-10-15; lib/held-notification.ts)
 *
 * Two modes, chosen by whether CRON_SECRET is set for this check:
 *
 *   fail-safe (CRON_SECRET unset — the server's must be unset too): the
 *          release job cannot run, so step one sends the staff email at
 *          once, exactly as before the hold existed. Every assertion below
 *          is this mode's.
 *   hold   (CRON_SECRET set, the SAME value on the server, plus
 *          LEAD_HOLD_MS=45000 there; needs migration 0009 on the project):
 *          this check calls /api/cron/release-held-leads every 10 s as
 *          Vercel Cron would, so the server's heartbeat is fresh and step one
 *          HOLDS. Then: no staff email before step two; save → ONE email
 *          carrying the details and no "Details added"; skip → ONE email at
 *          once; leave → ONE email from the job at the hold mark; and a
 *          late page-two save after the job sent it → the threaded
 *          "Details added". Server rows are scoped to LEAD_HOLD_ENV (default
 *          "local"), so the job never touches a real lead.
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
 * Twelve rows, named `E2E-<run>-<Path>-<width> Tester` — the chat's are
 * `Etoe<run as letters>Yes|No Chat`, because the chat reads a name as
 * letters only — phone 0000000000, and two chat_sessions rows. The same preflight as scripts/chat-checklist.mjs:
 * CHECK_CONTACT_ALLOW_PROJECT must name the exact project ref in
 * SUPABASE_URL, which cannot be satisfied without looking at which project
 * that is. At the end, unless `--keep` is passed, the run deletes the rows it
 * created by id, then sweeps any `E2E-<this run>-` row an aborted path left
 * behind (this run's own prefixes, never another run's), and deletes its chat
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
// The app's own routing rules, so the expected inbox can never drift from
// what the route does. Node runs the .ts directly (types stripped).
import { routeLead } from "../lib/lead-routing.ts";
import { capitalizeName } from "../lib/name-case.ts";

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

/** Hold mode (see the header): the job's secret, the same as the server's. */
const CRON_SECRET = env.CRON_SECRET?.trim() || null;
const HOLD = Boolean(CRON_SECRET);
const HOLD_WAIT_MS = 45_000 + 25_000;

/** "E2E-x-save-320 Tester" → "E2E-x-save-320": what every greeting must use (lib/first-name.ts). */
const firstWord = (name) => name.trim().split(/\s+/)[0];
/** The run id as letters, for the chat's test names: the chat reads a name
 *  as letters only (lib/chat/booking-parse.ts), so "0414…" cannot be in it. */
const RUN_LETTERS = RUN.replace(/\d/g, (d) => "abcdefghij"[Number(d)]);
const CHAT_PREFIX = `Etoe${RUN_LETTERS}`;
const emailFor = (name) => `${firstWord(name).toLowerCase()}@example.test`;

/* ── Supabase REST (service role) ──────────────────────────────────────── */

// A dropped connection (a DNS blip, Oct 2026) is retried — once it aborted a
// run between its inserts and its cleanup and stranded the rows. Only
// network failures retry; an HTTP error answer is thrown at once.
async function fetchRetrying(url, init, tries = 4) {
  for (let i = 1; ; i++) {
    try {
      return await fetch(url, init);
    } catch (error) {
      if (i >= tries) throw error;
      await sleep(1000 * i);
    }
  }
}
const rest = async (path, init = {}) => {
  const res = await fetchRetrying(`${SUPABASE_URL}/rest/v1/${path}`, {
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
// Four kinds of email now (lib/lead-notification.ts). Told apart by subject:
// the staff notification names the lead ("New … — <center> — <name>"), the
// page-two update is the same subject with "Re: ", the visitor's
// confirmation has a fixed subject and goes to her address.
const VISITOR_SUBJECT = "We got your request — Harmonized Brain Centers";
const FROM = "Harmonized Brain Centers <leads@harmonizedbraincenterstn.com>";
const emailsNaming = (name) => emails().filter((e) => (e.body?.subject ?? "").includes(name) && !/^Re: /.test(e.body.subject));
const updatesNaming = (name) => emails().filter((e) => /^Re: /.test(e.body?.subject ?? "") && e.body.subject.includes(name));
const visitorEmailsTo = (address) => emails().filter((e) => e.body?.subject === VISITOR_SUBJECT && JSON.stringify(e.body.to) === JSON.stringify([address]));
/** What the mock answers for a Resend id's Message-ID (mock-resend.mjs). */
const mockMessageId = (resendId) => `<${resendId}@mock.resend.test>`;

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

// Ben's sentence for the Dialpad registration (2026-10-14), spelled out
// rather than imported, so a change to it has to be made twice on purpose.
// Straight apostrophe in "we'll" — character for character.
const CONSENT_SENTENCE = "I agree to receive texts from Harmonized Brain Centers at this number about my appointment and inquiry. Msg frequency varies. Msg & data rates may apply. Reply HELP for help, STOP to cancel. Optional — we'll call you either way.";
const FORM_CONSENT_TEXT = `${CONSENT_SENTENCE} SMS Terms · Privacy Policy`;
const CHAT_CONSENT_QUESTION = "Can Harmonized Brain Centers also text you about your appointment and inquiry? Msg frequency varies. Msg & data rates may apply. Reply HELP for help, STOP to cancel. Optional — we'll call you either way. SMS Terms: /sms-terms · Privacy Policy: /privacy-policy";
/** The carriers' required phrases, each of which must reach the raw HTML
 *  of /sms-terms as one unbroken string. (The form's consent box is on step
 *  two since 2026-10-26, so /contact's raw HTML no longer carries it.) */
const REQUIRED_PHRASES = [
  "Harmonized Brain Centers",
  "Msg frequency varies.",
  "Msg & data rates may apply.",
  "Reply HELP for help, STOP to cancel.",
];
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
async function expectRow(name, { center, helpingWho, concerns, note, referredBy = null, email = emailFor(name), phone = "0000000000", source = "form", bestTime = null, contactMethod = null, heardAbout = null, sourcePage = "/contact", consent, consentText = consent ? FORM_CONSENT_TEXT : null }) {
  const rows = await rowsNamed(name);
  expect(`${name}: exactly one row`, rows.length === 1, `${rows.length} row(s)`);
  const r = rows[0];
  if (!r) return null;
  created.push(r.id);
  expect(`${name}: type/source`, r.type === "consultation" && r.source === source, `${r.type}/${r.source}`);
  // An email-only lead: phone null once migration 0012 is applied, "" before
  // it (the route's fallback for the old shape check — see saveRow).
  if (phone === null) {
    expect(`${name}: no phone saved (null, or "" before migration 0012)`, r.phone === null || r.phone === "", JSON.stringify(r.phone));
    if (r.phone === "") console.log(`  · ${name}: saved with phone "" — migration 0012 is not applied on this database`);
  } else {
    expect(`${name}: phone saved`, r.phone === phone, r.phone);
  }
  expect(`${name}: preferred_center = ${JSON.stringify(center)}`, r.preferred_center === center, String(r.preferred_center));
  expect(`${name}: best_time = ${JSON.stringify(bestTime)}`, r.best_time === bestTime, String(r.best_time));
  // contact_method (migration 0011): "call" on every form row — stepOne
  // chooses Call — and null on a chat row. Skipped, and said so, on a
  // database where 0011 is not applied yet (the route then saves without it).
  if ("contact_method" in r) {
    const want = source === "form" ? contactMethod : null;
    expect(`${name}: contact_method = ${JSON.stringify(want)}`, r.contact_method === want, String(r.contact_method));
  } else {
    console.log(`  · ${name}: contact_method not checked — migration 0011 is not applied on this database`);
  }
  expect(`${name}: email = ${JSON.stringify(email)}`, r.email === email, String(r.email));
  expect(`${name}: source_page = ${sourcePage}`, r.source_page === sourcePage, String(r.source_page));
  expect(`${name}: helping_who = ${JSON.stringify(helpingWho)}`, r.helping_who === helpingWho, String(r.helping_who));
  expect(`${name}: concerns = ${JSON.stringify(concerns)}`, JSON.stringify(r.concerns) === JSON.stringify(concerns), JSON.stringify(r.concerns));
  expect(`${name}: note = ${JSON.stringify(note)}`, r.note === note, String(r.note));
  expect(`${name}: referred_by = ${JSON.stringify(referredBy)}`, r.referred_by === referredBy, String(r.referred_by));
  if ("heard_about" in r) {
    expect(`${name}: heard_about = ${JSON.stringify(heardAbout)}`, r.heard_about === heardAbout, String(r.heard_about));
  } else {
    console.log(`  · ${name}: heard_about not checked — migration 0012 is not applied on this database`);
  }
  expect(`${name}: sms_consent = ${consent}`, r.sms_consent === consent, String(r.sms_consent));
  expect(`${name}: sms_consent_text is ${consentText ? "the exact wording shown" : "null (never shown at step one)"}`, r.sms_consent_text === consentText, JSON.stringify(r.sms_consent_text));
  const at = r.sms_consent_at ? Date.parse(r.sms_consent_at) : null;
  expect(
    `${name}: sms_consent_at ${consent ? "stamped within the last 10 minutes" : "null"}`,
    consent ? at !== null && Date.now() - at < 10 * 60_000 && Date.now() - at > -60_000 : at === null,
    String(r.sms_consent_at)
  );
  return r;
}

const inboxFor = (center, source) =>
  routeLead({ type: "consultation", source, preferredCenter: center }, env, () => {}).to ?? "office@example.test";
const routeOf = (center, source) => routeLead({ type: "consultation", source, preferredCenter: center }, env, () => {}).route;

/**
 * Exactly one staff notification, in the branded template (HTML + text),
 * from "Harmonized Brain Centers", carrying the lead and pointing at the row;
 * and the row records the Message-ID it was delivered with.
 */
function expectEmail(name, row, { center, consent, source = "the contact form", phone = true, email = true, referredBy = null, heardAbout = null }) {
  const channel = source === "the contact form" ? "form" : "chat";
  const inbox = inboxFor(center, channel);
  const list = emailsNaming(name);
  expect(`${name}: exactly one notification email`, list.length === 1, `${list.length} email(s)`);
  const e = list[0];
  if (!e) return;
  const text = e.body.text ?? "";
  const html = e.body.html ?? "";
  expect(`${name}: email subject names the lead and center`, e.body.subject.includes(name) && e.body.subject.includes(center), e.body.subject);
  expect(`${name}: email is from "Harmonized Brain Centers"`, e.body.from === FROM, String(e.body.from));
  expect(`${name}: email has the branded HTML and a plain-text twin`, html.startsWith("<!doctype html>") && html.includes("BRAIN CENTERS") && text.length > 0);
  expect(`${name}: email's first line says "New call request"${channel === "chat" ? " … via chat" : ""}`, text.startsWith("NEW CALL REQUEST · ") && text.split("\n")[0].includes("via chat") === (channel === "chat"), JSON.stringify(text.split("\n")[0]));
  expect(`${name}: email carries the name whole${phone ? " and the phone formatted" : ""}`, text.includes(`\n${name}\n`) && text.includes("(000) 000-0000") === phone, JSON.stringify(text.slice(0, 200)));
  expect(`${name}: email has ${phone ? "a Call (tel:)" : "no Call"} and ${email ? "a Reply (mailto:)" : "no Reply"} button`, /href="tel:\+10000000000"[^>]*>Call</.test(html) === phone && /href="mailto:[^"]+"[^>]*>Reply</.test(html) === email);
  if (channel === "form") {
    const [, l1, l2] = text.split("\n");
    expect(`${name}: "Referred by" and "Heard about us" are the email's first lines (Ben, 2026-10-26)`, l1 === `Referred by: ${referredBy ?? "Not given"}`.replace("Referred by: ", "Referred by:".padEnd(13)) && l2 === `Heard about us: ${heardAbout ?? "Not given"}`, JSON.stringify([l1, l2]));
  }
  if (row) expect(`${name}: email points at the saved row`, /^Open saved request: \S+$/m.test(text) && text.includes(row.id));
  expect(`${name}: footer has no routing rule and no request id line`, !/Routed by|rule:|^Request /m.test(text + html), JSON.stringify(text.slice(-200)));
  expect(`${name}: email went to ${inbox}`, JSON.stringify(e.body.to).includes(inbox), JSON.stringify(e.body.to));
  const textsLine = text.split("\n").find((l) => l.startsWith("Texts OK?:")) ?? null;
  expect(`${name}: email says Texts OK? ${consent ? "Yes" : "No"}`, consent ? / Yes$/.test(textsLine ?? "") : / No — call or email only$/.test(textsLine ?? ""), JSON.stringify(textsLine));
  expect(`${name}: email shows the time in CT, never ISO`, / CT$/m.test(text) && !/\d{4}-\d{2}-\d{2}T\d{2}:/.test(text + html));
  expect(`${name}: the explanatory paragraph about the form is gone`, !text.includes("The form asks who the call is for"));
}

/** The row records the staff email's delivered Message-ID and the visitor email's outcome. */
async function expectEmailRecords(name, rowId, { visitor, details = null }) {
  const [r] = await rest(`consultation_requests?id=eq.${rowId}&select=notify_status,notify_message_id,notify_rfc_message_id,confirm_email_status,confirm_email_message_id,details_email_status`);
  if (!r) return expect(`${name}: row still there for the email records`, false);
  expect(`${name}: row stores the notification's delivered Message-ID`, r.notify_status === "sent" && r.notify_rfc_message_id === mockMessageId(r.notify_message_id), JSON.stringify(r));
  expect(`${name}: row records the visitor email as ${visitor ?? "not sent"}`, r.confirm_email_status === visitor && (visitor === "sent") === Boolean(r.confirm_email_message_id), JSON.stringify(r));
  expect(`${name}: row records the details email as ${details ?? "not sent"}`, r.details_email_status === details, JSON.stringify(r));
  return r;
}

/** One "We got your request", to her, Reply-To the route's first address. */
function expectVisitorEmail(name, address, { center, source = "form" }) {
  const list = visitorEmailsTo(address);
  expect(`${name}: exactly one confirmation email to the visitor`, list.length === 1, `${list.length} email(s)`);
  const e = list[0];
  if (!e) return;
  const route = routeOf(center, source);
  const line = route === "nashville" || route === "murfreesboro"
    ? `Someone from our ${route === "nashville" ? "Nashville" : "Murfreesboro"} center will reach out.`
    : "Someone from our team will reach out.";
  const tel = route === "murfreesboro" ? "tel:+16152032650" : "tel:+16153318762";
  expect(`${name}: visitor email says "Thanks, ${firstWord(name)}. We’ll reach out soon." and "${line}"`, e.body.text.startsWith(`Thanks, ${firstWord(name)}. We’ll reach out soon.\n${line}`), JSON.stringify(e.body.text.slice(0, 120)));
  expect(`${name}: visitor email Reply-To is ${inboxFor(center, source)} (the route's first address)`, e.body.reply_to === inboxFor(center, source), String(e.body.reply_to));
  expect(`${name}: visitor email has the center's tap-to-call, and the video as a hosted thumbnail linked to /watch/first-visit`, e.body.html.includes(`href="${tel}"`) && /<a href="[^"]*\/watch\/first-visit"[^>]*><img src="[^"]*\/email\/first-visit\.jpg"/.test(e.body.html) && e.body.html.includes("Watch: what your first visit looks like") && !e.body.html.includes("youtube.com"));
  expect(`${name}: visitor email is from "Harmonized Brain Centers"`, e.body.from === FROM, String(e.body.from));
}

/** The page-two update: same thread, same recipients, the answers. */
function expectUpdateEmail(name, row, { center, note, referredBy }) {
  const list = updatesNaming(name);
  expect(`${name}: exactly one "Details added" email`, list.length === 1, `${list.length} email(s)`);
  const u = list[0];
  const original = emailsNaming(name)[0];
  if (!u || !original) return;
  expect(`${name}: update subject is "Re: " + the original's`, u.body.subject === `Re: ${original.body.subject}`, u.body.subject);
  expect(`${name}: update goes to the original's recipients`, JSON.stringify(u.body.to) === JSON.stringify(original.body.to) && JSON.stringify(u.body.cc ?? []) === JSON.stringify(original.body.cc ?? []), JSON.stringify([u.body.to, original.body.to]));
  expect(`${name}: update's In-Reply-To and References name the original's Message-ID`, u.body.headers?.["In-Reply-To"] === row.notify_rfc_message_id && u.body.headers?.References === row.notify_rfc_message_id && Boolean(row.notify_rfc_message_id), JSON.stringify([u.body.headers, row.notify_rfc_message_id]));
  expect(`${name}: update carries the answers`, u.body.text.startsWith(`DETAILS ADDED · ${center}`) && (!note || u.body.text.includes(note)) && (referredBy === null || u.body.text.includes(`Referred by: ${referredBy}`)), JSON.stringify(u.body.text.slice(0, 300)));
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
    if (updated.note) expect(`${name}: update post carries the note`, String(second.body.message ?? "").endsWith(updated.note), JSON.stringify(second.body.message));
    if (updated.referredBy) {
      expect(`${name}: update post carries "Referred by:"`, String(second.body.message ?? "").includes(`Referred by: ${updated.referredBy}`), JSON.stringify(second.body.message));
    }
    expect(`${name}: update post carries no not-given flag`, !String(second.body.message ?? "").includes(NOT_GIVEN_LINE));
    const consentNow = updated.consent ?? consent;
    expect(`${name}: update post carries the consent answer as it is now (${consentNow ? "yes" : "no"})`, consentNow === !String(second.body.message ?? "").includes(NO_TEXT_CONSENT_LINE), JSON.stringify(second.body.message));
    if (updated.heardAbout) {
      expect(`${name}: update post carries "Heard about us:"`, String(second.body.message ?? "").includes(`Heard about us: ${updated.heardAbout}`), JSON.stringify(second.body.message));
    }
    expect(`${name}: update post keeps name/phone/center`, second.body.firstName === name && second.body.phone === "0000000000" && second.body.preferredCenter === center, JSON.stringify(second.body));
  }
}

/* ── the held staff email (hold mode only) ───────────────────────────────── */

/** Poll until `fn()` is truthy or the time is up; resolves to the last value. */
async function waitFor(fn, ms) {
  const t0 = Date.now();
  let v = await fn();
  while (!v && Date.now() - t0 < ms) {
    await sleep(500);
    v = await fn();
  }
  return v;
}

/** The release job, called as Vercel Cron calls it. */
async function tick() {
  const res = await fetch(`${BASE}/api/cron/release-held-leads`, { headers: { authorization: `Bearer ${CRON_SECRET}` } }).catch(() => null);
  return res?.status ?? 0;
}

/** Hold mode: the row says who sent its one email. */
async function expectReleasedBy(name, rowId, by) {
  const [r] = await rest(`consultation_requests?id=eq.${rowId}&select=notify_hold_state,notify_released_by,notify_had_details,notify_attempts`);
  const want = Array.isArray(by) ? by : [by];
  expect(`${name}: held email released by ${want.join(" or ")}`, r?.notify_hold_state === "released" && want.includes(r.notify_released_by), JSON.stringify(r));
  return r;
}

/**
 * Hold mode: a page-two save that arrives after the job already sent the
 * email → the threaded "Details added", exactly as before the hold.
 */
async function latePageTwo() {
  const name = `E2E-${RUN}-Late-0 Tester`;
  console.log(`\n▸ late page-two save, after the job sent the held email — ${name}`);
  const res = await fetch(`${BASE}/api/consultation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "consultation", source: "form", first_name: name, phone: "0000000000", email: emailFor(name), preferred_center: "Nashville", best_time: "Any time", website: "", source_page: "/contact", sms_consent: false, sms_consent_text: FORM_CONSENT_TEXT }),
  });
  const body = await res.json().catch(() => null);
  expect(`${name}: accepted (201)`, res.status === 201 && Boolean(body?.id), String(res.status));
  if (!body?.id) return;
  created.push(body.id);
  expect(`${name}: no staff email at step one (held)`, emailsNaming(name).length === 0, `${emailsNaming(name).length}`);
  const got = await waitFor(() => emailsNaming(name).length > 0, HOLD_WAIT_MS);
  expect(`${name}: the job sent it at the hold mark`, Boolean(got));
  await expectReleasedBy(name, body.id, ["cron", "sweep"]);
  const note = "E2E late note — added after the email went.";
  const patched = await fetch(`${BASE}/api/consultation/${body.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note }) });
  expect(`${name}: late page-two save accepted`, patched.status === 200, String(patched.status));
  await sleep(500);
  const [rec] = await rest(`consultation_requests?id=eq.${body.id}&select=notify_rfc_message_id,details_email_status`);
  expect(`${name}: still exactly one staff notification`, emailsNaming(name).length === 1, `${emailsNaming(name).length}`);
  expect(`${name}: details email recorded as sent`, rec?.details_email_status === "sent", JSON.stringify(rec));
  if (rec) expectUpdateEmail(name, rec, { center: "Nashville", note, referredBy: null });
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

/** Step two as the visitor sees it (Ben, 2026-10-26): the headline and the
 *  "optional details" line, the questions, and the quiet exit. */
async function expectStepTwo(page, name, two, { phone = true, email = true } = {}) {
  expect(`${name}: step two mounts and reveals (opacity 1, .in)`, two?.opacity === 1 && two.hasIn, JSON.stringify(two));
  expect(`${name}: step two headline is "Got it — we’ll reach out soon."`, two?.text === "Got it — we’ll reach out soon.", JSON.stringify(two?.text));
  const look = JSON.parse(await page.eval(`JSON.stringify((() => {
    const panel = document.querySelector(".form-step");
    const skip = panel.querySelector(".form-skip");
    return {
      lead: panel.querySelector(".step-two-lead")?.textContent.trim() ?? null,
      eyebrow: panel.querySelectorAll(".eyebrow").length,
      helping: panel.querySelectorAll("#helping-label + .chips [role=radio]").length,
      concerns: !!panel.querySelector("#concerns-label"),
      times: [...panel.querySelectorAll("button[id^=time-]")].map((b) => b.textContent.trim()),
      reach: [...panel.querySelectorAll("[id^=reach-]")].filter((b) => b.tagName === "BUTTON").map((b) => b.textContent.trim()),
      consent: !!panel.querySelector("#sms-consent"),
      heard: [...(panel.querySelector("#heard-about")?.options ?? [])].map((o) => o.textContent),
      laterReferral: !!panel.querySelector("#later-referral"),
      required: panel.querySelectorAll("[required], [aria-required=true]").length,
      selected: panel.querySelectorAll("[aria-checked=true], [aria-pressed=true]").length,
      skip: skip ? { text: skip.textContent.trim(), size: parseFloat(getComputedStyle(skip).fontSize), visible: skip.getBoundingClientRect().height > 0 } : null,
    };
  })())`));
  expect(`${name}: step two says "A few optional details help us prepare:"`, look.lead === "A few optional details help us prepare:", JSON.stringify(look.lead));
  expect(`${name}: step two asks who, what, and when — nothing required, nothing preselected`, look.helping === 3 && look.concerns && JSON.stringify(look.times) === JSON.stringify(["Any time", "Mornings", "Afternoons", "Evenings"]) && look.required === 0 && look.selected === 0 && look.eyebrow === 0, JSON.stringify(look));
  const wantReach = [...(phone ? ["Call", "Text"] : []), ...(email ? ["Email"] : [])];
  expect(`${name}: best way to reach is ${wantReach.length > 1 ? wantReach.join("/") : "not asked (one way given)"}`, JSON.stringify(look.reach) === JSON.stringify(wantReach.length > 1 ? wantReach : []), JSON.stringify(look.reach));
  expect(`${name}: the consent box is ${phone ? "there (a phone was given)" : "absent (no phone)"}`, look.consent === phone, JSON.stringify(look.consent));
  expect(`${name}: "How did you hear about us?" has the seven answers`, JSON.stringify(look.heard) === JSON.stringify(["Choose one", "Google search", "Referral from a friend or family", "Referral from a doctor or provider", "Instagram", "Facebook", "TikTok", "Other"]), JSON.stringify(look.heard));
  expect(`${name}: "Who referred you?" is not asked on step two until a referral is chosen`, look.laterReferral === false);
  expect(`${name}: "Skip for now" is there, small and quiet`, look.skip?.text === "Skip for now" && look.skip.visible && look.skip.size <= 14, JSON.stringify(look.skip));
}

/** The confirmation's headline: the first word of the name, capitalized. */
const CONFIRM_HEADING = (name) => `Thanks, ${firstWord(name)}. We’ll reach out soon.`;

/**
 * Step three is exactly four things (Ben, 2026-10-14): the headline, the
 * video, "Free call, no obligation.", and both centers' numbers as tel:
 * links. Everything it used to say is gone.
 */
async function expectConfirmation(page, name) {
  const look = JSON.parse(await page.eval(`JSON.stringify((() => {
    const p = document.querySelector(".form-step");
    const lines = [...p.querySelectorAll(".done-line")].map((l) => l.textContent.replace(/\\s+/g, " ").trim());
    return {
      heading: p.querySelector("h2")?.textContent.trim() ?? null,
      eyebrow: p.querySelectorAll(".eyebrow").length,
      video: p.querySelectorAll(".video-stage").length,
      lines,
      tels: [...p.querySelectorAll(".done-phones a")].map((a) => a.getAttribute("href")),
      telText: [...p.querySelectorAll(".done-phones a")].map((a) => a.textContent.trim()),
      gone: ["Your call is requested", "A few quick questions", "While you wait", "Nothing to decide yet", "Here’s what happens next", "We call you", "Helpful to have ready", "Pick a time"].filter((t) => p.textContent.includes(t)),
      steps: p.querySelectorAll(".lens-seq, h3, h4").length,
      children: [...p.children].map((c) => c.tagName.toLowerCase() + (c.className ? "." + String(c.className).split(" ")[0] : "")),
    };
  })())`));
  expect(`${name}: confirmation headline is "${CONFIRM_HEADING(name)}"`, look.heading === CONFIRM_HEADING(name), JSON.stringify(look.heading));
  expect(`${name}: confirmation lines are exactly Ben's two`, JSON.stringify(look.lines) === JSON.stringify(["Free call, no obligation.", "Want to talk now? Nashville (615) 331-8762 · Murfreesboro (615) 203-2650"]), JSON.stringify(look.lines));
  expect(`${name}: both numbers are tap-to-call`, JSON.stringify(look.tels) === JSON.stringify(["tel:+16153318762", "tel:+16152032650"]) && JSON.stringify(look.telText) === JSON.stringify(["(615) 331-8762", "(615) 203-2650"]), JSON.stringify([look.tels, look.telText]));
  expect(`${name}: confirmation is headline, video, two lines — nothing else`, look.eyebrow === 0 && look.video === 1 && look.steps === 0 && look.gone.length === 0 && look.children.length === 4, JSON.stringify(look));
}

/**
 * The confirmation fits a 390×844 screen with no scrolling: once the panel
 * has scrolled itself into place, its whole card sits between the sticky
 * header (if it is showing) and the bottom of the viewport, or any bar fixed
 * there.
 */
async function expectConfirmationFits(page, name) {
  await sleep(900); // the panel's smooth scroll, and the header's tuck
  const m = JSON.parse(await page.eval(`JSON.stringify((() => {
    const card = document.querySelector(".form-step").getBoundingClientRect();
    const header = document.querySelector("header.site")?.getBoundingClientRect();
    let floor = innerHeight;
    for (const el of document.querySelectorAll("body *")) {
      const cs = getComputedStyle(el);
      if (cs.position !== "fixed" || cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) === 0) continue;
      const r = el.getBoundingClientRect();
      if (r.height > 0 && r.width > innerWidth / 2 && r.bottom >= innerHeight - 1 && r.top > innerHeight / 2) floor = Math.min(floor, r.top);
    }
    return { w: innerWidth, h: innerHeight, top: Math.round(card.top), bottom: Math.round(card.bottom), height: Math.round(card.height), ceiling: Math.max(0, Math.round(header?.bottom ?? 0)), floor: Math.round(floor) };
  })())`));
  expect(`${name}: the whole confirmation fits ${m.w}×${m.h} with no scrolling (card ${m.top}–${m.bottom}, visible ${m.ceiling}–${m.floor})`, m.w === 390 && m.h === 844 && m.top >= m.ceiling && m.bottom <= m.floor, JSON.stringify(m));
}

/** The raw HTML, no JavaScript: what a crawler or a carrier's scanner reads. */
async function rawHtml() {
  console.log(`\n▸ raw HTML (no JavaScript)`);
  const terms = await fetch(`${BASE}/sms-terms`).then((r) => r.text());
  for (const phrase of REQUIRED_PHRASES) {
    expect(`/sms-terms raw HTML carries ${JSON.stringify(phrase)} unbroken`, terms.includes(phrase));
  }
  const html = await fetch(`${BASE}/contact`).then((r) => r.text());
  expect("/contact raw HTML: H1 is \"Let’s get you started\"", /<h1[^>]*>Let(’|&#x27;|&rsquo;)s get you started<\/h1>/.test(html), (html.match(/<h1[^>]*>.*?<\/h1>/) ?? [""])[0]);
  for (const id of ["first-name", "phone", "email", "center-nashville", "center-murfreesboro", "center-not-sure", "referred-by", "note"]) {
    expect(`/contact raw HTML: step one has #${id}`, html.includes(`id="${id}"`));
  }
  expect("/contact raw HTML: no center is preselected", !/id="center-[a-z-]+"[^>]*aria-checked="true"/.test(html) && !/aria-checked="true"[^>]*id="center-/.test(html));
  expect("/contact raw HTML: step one asks nothing else (no consent box, no reach or time choice)", !html.includes('id="sms-consent"') && !html.includes('id="reach-call"') && !html.includes('id="reach-text"') && !html.includes('id="best-time"'));
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
    void wrap;
    return {
      present: !!box,
      type: box?.type ?? null,
      checked: box?.checked ?? null,
      required: box?.required ?? null,
      label: label?.textContent ?? null,
      hrefs: [...(label?.querySelectorAll("a") ?? [])].map((a) => a.getAttribute("href")),
      onStepTwo: !!box?.closest(".form-step"),
    };
  })())`));
  expect(`${name}: consent box on step two, a checkbox, unchecked, not required`, look.present && look.onStepTwo && look.type === "checkbox" && look.checked === false && look.required === false, JSON.stringify(look));
  expect(`${name}: consent label is the exact wording`, look.label === FORM_CONSENT_TEXT, JSON.stringify(look.label));
  expect(`${name}: consent label links /sms-terms and /privacy-policy`, JSON.stringify(look.hrefs) === JSON.stringify(["/sms-terms", "/privacy-policy"]), JSON.stringify(look.hrefs));
  if (tick) {
    const r = await page.eval(`(() => { const b = document.querySelector("#sms-consent"); b.click(); return b.checked ? "ok" : "click did not check it"; })()`);
    if (r !== "ok") throw new Error(r);
  }
}

const CENTER_CHIP = { Nashville: "#center-nashville", Murfreesboro: "#center-murfreesboro", "Not sure yet": "#center-not-sure" };

/**
 * Step one (Ben, 2026-10-26): first name, phone and/or email, the optional
 * referral and note, then — after checking the form refuses a missing
 * center — the center chip, and "Send My Request".
 */
async function stepOne(page, width, name, { phone = true, email = emailFor(name), center = "Not sure yet", referral = null, note = null, typed = name, height = width <= 400 ? 700 : 900 } = {}) {
  await page.setViewport(width, height);
  await page.goto(`${BASE}/contact`, { settle: 400 });
  // goto() stamps `in` on every .rv that exists at load; the panels this
  // check cares about do not exist yet, so the reveal gate is still real.
  const fields = [["#first-name", typed], ...(phone ? [["#phone", "0000000000"]] : []), ...(email ? [["#email", email]] : []), ...(referral ? [["#referred-by", referral]] : []), ...(note ? [["#note", note]] : [])];
  for (const [sel, val] of fields) {
    const r = await page.eval(setValue(sel, val));
    if (r !== "ok") throw new Error(r);
  }
  const look = JSON.parse(await page.eval(`JSON.stringify((() => {
    const f = document.querySelector("form.form-card");
    return {
      labels: [...f.querySelectorAll("label")].filter((l) => !l.closest("[aria-hidden=true]")).map((l) => l.textContent.trim()),
      required: [...f.querySelectorAll("[required], [aria-required=true]")].map((e) => e.id || e.getAttribute("aria-labelledby")),
      centers: [...f.querySelectorAll("[id^=center-][role=radio]")].map((b) => [b.textContent.trim(), b.getAttribute("aria-checked")]),
      button: f.querySelector("button[type=submit]")?.textContent.trim(),
    };
  })())`));
  expect(`${name}: step one is first name, phone, email, center, "Who referred you? (optional)", "Anything we should know? (optional)"`, JSON.stringify(look.labels) === JSON.stringify(["First name", "Phone", "Email", "Which center?", "Who referred you? (optional)", "Anything we should know? (optional)"]), JSON.stringify(look.labels));
  expect(`${name}: step one requires only the name and the center (phone/email checked as either-or)`, JSON.stringify(look.required) === JSON.stringify(["first-name", "center-label"]), JSON.stringify(look.required));
  expect(`${name}: centers are Nashville · Murfreesboro · Not sure, none preselected`, JSON.stringify(look.centers) === JSON.stringify([["Nashville", "false"], ["Murfreesboro", "false"], ["Not sure", "false"]]), JSON.stringify(look.centers));
  expect(`${name}: the button reads "Send My Request"`, look.button === "Send My Request", String(look.button));
  const refused = await submitAndReadAlert(page);
  expect(`${name}: submitting without a center is refused in the browser`, /choose a center/i.test(refused ?? ""), JSON.stringify(refused));
  const chip = await page.eval(`(() => { const b = document.querySelector(${JSON.stringify(CENTER_CHIP[center])}); if (!b) return "no chip"; b.click(); return "ok"; })()`);
  if (chip !== "ok") throw new Error(chip);
  await sleep(100);
  const r = await page.eval(clickText("Send My Request"));
  if (r !== "ok") throw new Error(r);
}

/** Submit, then read the form's own error line (role=alert), if any. */
async function submitAndReadAlert(page) {
  const r = await page.eval(clickText("Send My Request"));
  if (r !== "ok") throw new Error(r);
  await sleep(150);
  return page.eval(`(() => document.querySelector('form [role="alert"]')?.textContent.trim() ?? null)()`);
}

const SAVE_NOTE = "E2E note — bedtime is the hard part.";
const SAVE_REFERRAL = "E2E referral — Dr. Smith";

async function pathSave(page, width) {
  const name = `E2E-${RUN}-Save-${width} Tester`;
  console.log(`\n▸ save path @ ${width}px — ${name}`);
  await stepOne(page, width, name, { center: "Murfreesboro", referral: SAVE_REFERRAL, note: SAVE_NOTE });
  const two = await waitPanel(page, "reach out soon");
  await expectStepTwo(page, name, two);
  expect(`${name}: step two heading took focus`, two?.focused === true);
  // The row exists before step two is shown.
  const rowsNow = await rowsNamed(name);
  expect(`${name}: row saved before step two was shown`, rowsNow.length === 1, `${rowsNow.length} row(s)`);
  const emailsNow = emailsNaming(name);
  if (HOLD) expect(`${name}: staff email HELD — none before step two`, emailsNow.length === 0, `${emailsNow.length} email(s)`);
  else expect(`${name}: lead email sent before step two was shown (release job not running → fail-safe)`, emailsNow.length === 1, `${emailsNow.length} email(s)`);
  expect(`${name}: platform forwarded before step two was shown`, forwardsNaming(name).length === 1, `${forwardsNaming(name).length} post(s)`);
  expectNoText(name, "step one (no consent asked there)");

  for (const t of ["My child", "Sleep", "Focus & ADHD", "Evenings", "Text"]) {
    const r = await page.eval(clickText(t));
    if (r !== "ok") throw new Error(r);
  }
  await consentBox(page, name, true);
  await page.eval(setValue("#heard-about", "Referral from a doctor or provider"));
  await sleep(100);
  const later = await page.eval(`!!document.querySelector("#later-referral")`);
  expect(`${name}: a referral answer does NOT re-ask "Who referred you?" when step one answered it`, later === false);
  await page.eval(clickText("Send These Details"));
  const three = await waitPanel(page, "We’ll reach out soon.");
  expect(`${name}: confirmation mounts and reveals (opacity 1, .in)`, three?.opacity === 1 && three.hasIn, JSON.stringify(three));
  const readVideo = () => page.eval(`JSON.stringify((() => { const b = document.querySelector(".video-play"); const img = document.querySelector(".video-stage img"); return { button: !!b, label: b?.getAttribute("aria-label"), poster: img?.currentSrc ?? null, posterLoaded: img ? img.complete && img.naturalWidth > 0 : false, iframes: document.querySelectorAll("iframe").length, phones: [...document.querySelectorAll(".form-step .done-phones a[href^='tel:']")].length }; })())`);
  let video = await readVideo();
  for (let i = 0; i < 25 && !JSON.parse(video).posterLoaded; i++) {
    await sleep(200);
    video = await readVideo();
  }
  const v = JSON.parse(video);
  expect(`${name}: play button present, labelled, no iframe before click`, v.button && /Play video: What to Expect/.test(v.label ?? "") && v.iframes === 0, video);
  expect(`${name}: poster served from this origin and decoded`, v.poster?.startsWith(`${BASE}/`) && v.posterLoaded, v.poster);
  expect(`${name}: both center numbers visible below the video`, v.phones === 2, `${v.phones} tel link(s)`);
  await expectConfirmation(page, name);
  await sleep(300);
  if (HOLD) await waitFor(() => emailsNaming(name).length > 0, 10_000);
  const row = await expectRow(name, { center: "Murfreesboro", helpingWho: "My child", concerns: ["Sleep", "Focus & ADHD"], note: SAVE_NOTE, referredBy: SAVE_REFERRAL, bestTime: "Evenings", contactMethod: "text", heardAbout: "Referral from a doctor or provider", consent: true });
  const heard = row && "heard_about" in row ? "Referral from a doctor or provider" : null;
  if (HOLD) {
    // One email, sent on the save, carrying page two — no "Details added".
    expectEmail(name, row, { center: "Murfreesboro", consent: true, referredBy: SAVE_REFERRAL, heardAbout: heard });
  } else {
    // Fail-safe: the step-one email carries step one only.
    expectEmail(name, row, { center: "Murfreesboro", consent: false, referredBy: SAVE_REFERRAL, heardAbout: null });
  }
  expect(`${name}: still exactly one notification after step two`, emailsNaming(name).length === 1, `${emailsNaming(name).length}`);
  if (row && HOLD) {
    await expectEmailRecords(name, row.id, { visitor: "sent", details: null });
    expectVisitorEmail(name, emailFor(name), { center: "Murfreesboro" });
    const text = emailsNaming(name)[0]?.body?.text ?? "";
    expect(`${name}: the one email carries page two`, text.includes("What they told us") && text.includes(SAVE_NOTE) && text.includes("Evenings") && text.includes("Best way to reach them: Text"), JSON.stringify(text.slice(0, 500)));
    expect(`${name}: no "Details added" email`, updatesNaming(name).length === 0, `${updatesNaming(name).length}`);
    await expectReleasedBy(name, row.id, "page_two");
  } else if (row) {
    const rec = await expectEmailRecords(name, row.id, { visitor: "sent", details: "sent" });
    expectVisitorEmail(name, emailFor(name), { center: "Murfreesboro" });
    if (rec) expectUpdateEmail(name, rec, { center: "Murfreesboro", note: SAVE_NOTE, referredBy: SAVE_REFERRAL });
  }
  // The box was ticked on step two: the confirmation text goes then, once.
  expectText(name, { from: env.DIALPAD_SMS_FROM_MURFREESBORO ?? env.DIALPAD_SMS_FROM ?? "+16155550100" });
  expectForward(name, { center: "Murfreesboro", consent: false, updated: { whoFor: "my_child", concerns: ["sleep", "focus_adhd"], note: SAVE_NOTE, referredBy: SAVE_REFERRAL, heardAbout: heard, consent: true } });
  return { name, row };
}

async function pathSkip(page, width, height) {
  const name = `E2E-${RUN}-Skip-${width}${height ? `x${height}` : ""} Tester`;
  console.log(`\n▸ skip path @ ${width}${height ? `×${height}` : ""}px — ${name}`);
  await stepOne(page, width, name, { center: "Nashville", ...(height ? { height } : {}) });
  const two = await waitPanel(page, "reach out soon");
  await expectStepTwo(page, name, two);
  // The quiet exit: the .form-skip link, not a button labelled anything else.
  const skipped = await page.eval(`(() => { const b = document.querySelector(".form-step .form-skip"); if (!b) return "missing .form-skip"; b.click(); return "ok"; })()`);
  expect(`${name}: the "Skip for now" link is clickable`, skipped === "ok", skipped);
  const three = await waitPanel(page, "We’ll reach out soon.");
  expect(`${name}: confirmation mounts and reveals (opacity 1, .in)`, three?.opacity === 1 && three.hasIn, JSON.stringify(three));
  await expectConfirmation(page, name);
  if (height) await expectConfirmationFits(page, name);
  await sleep(300);
  if (HOLD) {
    const got = await waitFor(() => emailsNaming(name).length > 0, 8_000);
    expect(`${name}: "Skip for now" sends the held email at once, with step one only`, Boolean(got));
  }
  const row = await expectRow(name, { center: "Nashville", helpingWho: null, concerns: [], note: null, consent: false });
  expectEmail(name, row, { center: "Nashville", consent: false });
  if (row) await expectEmailRecords(name, row.id, { visitor: "sent", details: null });
  if (row && HOLD) await expectReleasedBy(name, row.id, "skip");
  expectVisitorEmail(name, emailFor(name), { center: "Nashville" });
  expect(`${name}: "Skip for now" sends no "Details added" email`, updatesNaming(name).length === 0, `${updatesNaming(name).length}`);
  expectForward(name, { center: "Nashville", consent: false });
  expectNoText(name, "a skipped step two (the consent box never ticked)");
  return { name, row };
}

/** Phone only, typed lower case, refusals first, then the tab closes on step two. */
async function pathLeave(chrome, width) {
  // Typed in lower case; saved and greeted capitalized (lib/name-case.ts).
  const typed = `E2E-${RUN}-leave-${width} tester`;
  const name = capitalizeName(typed);
  expect(`capitalizeName(${JSON.stringify(typed)}) is ${JSON.stringify(`E2E-${RUN}-Leave-${width} Tester`)}`, name === `E2E-${RUN}-Leave-${width} Tester`, name);
  console.log(`\n▸ leave path (phone only) @ ${width}px — typed ${JSON.stringify(typed)}`);
  const page = await chrome.newPage();
  await page.init();
  // First the form's own refusals, in the browser. None may reach the server.
  await page.setViewport(width, 700);
  await page.goto(`${BASE}/contact`, { settle: 400 });
  await page.eval(setValue("#first-name", typed));
  await page.eval(`document.querySelector("#center-not-sure").click()`);
  const neither = await submitAndReadAlert(page);
  expect(`${name}: neither a phone nor an email is refused in the browser`, /phone number or an email/i.test(neither ?? ""), JSON.stringify(neither));
  await page.eval(setValue("#phone", "555-01"));
  const badPhone = await submitAndReadAlert(page);
  expect(`${name}: a malformed phone is refused in the browser`, /phone number doesn.t look right/i.test(badPhone ?? ""), JSON.stringify(badPhone));
  await page.eval(setValue("#phone", ""));
  await page.eval(setValue("#email", "not-an-address"));
  const badEmail = await submitAndReadAlert(page);
  expect(`${name}: a malformed email is refused in the browser`, /email address doesn.t look right/i.test(badEmail ?? ""), JSON.stringify(badEmail));
  expect(`${name}: the refusals wrote nothing`, (await rowsNamed(name)).length === 0 && (await rowsNamed(typed)).length === 0 && emailsNaming(name).length === 0 && forwardsNaming(name).length === 0);
  // Then the real thing: a phone, no email.
  await stepOne(page, width, name, { typed, email: null });
  const two = await waitPanel(page, "reach out soon");
  await expectStepTwo(page, name, two, { phone: true, email: false });
  await page.close();
  await sleep(500);
  if (HOLD) {
    expect(`${name}: tab closed on step two — nothing sent yet (held)`, emailsNaming(name).length === 0, `${emailsNaming(name).length}`);
    const got = await waitFor(() => emailsNaming(name).length > 0, HOLD_WAIT_MS);
    expect(`${name}: the release job sends it at the hold mark, with step one only`, Boolean(got));
  }
  const row = await expectRow(name, { center: "Not sure yet", helpingWho: null, concerns: [], note: null, email: null, consent: false });
  if (row && HOLD) await expectReleasedBy(name, row.id, ["cron", "sweep"]);
  expectEmail(name, row, { center: "Not sure yet", consent: false, email: false });
  if (row) await expectEmailRecords(name, row.id, { visitor: null, details: null });
  expect(`${name}: no visitor email (no address given)`, emails().filter((e) => e.body?.subject === VISITOR_SUBJECT && JSON.stringify(e.body.to).includes(firstWord(name).toLowerCase())).length === 0);
  expectForward(name, { center: "Not sure yet", consent: false });
  expectNoText(name, "a phone with no consent given");
}

/** Email only: no consent box, no reach choice; a referral answer asks "Who referred you?". */
async function pathEmailOnly(page, width) {
  const name = `E2E-${RUN}-Email-${width} Tester`;
  console.log(`\n▸ email-only path @ ${width}px — ${name}`);
  await stepOne(page, width, name, { phone: false, center: "Not sure yet" });
  const two = await waitPanel(page, "reach out soon");
  await expectStepTwo(page, name, two, { phone: false, email: true });
  await page.eval(setValue("#heard-about", "Referral from a friend or family"));
  await sleep(150);
  const later = await page.eval(`(() => { const i = document.querySelector("#later-referral"); return i ? document.querySelector('label[for="later-referral"]')?.textContent.trim() ?? "no label" : null; })()`);
  expect(`${name}: a referral answer asks "Who referred you?" when step one left it blank`, later === "Who referred you?", JSON.stringify(later));
  const LATER = "E2E later referral — Aunt May";
  await page.eval(setValue("#later-referral", LATER));
  await page.eval(clickText("Send These Details"));
  await waitPanel(page, "We’ll reach out soon.");
  await sleep(300);
  if (HOLD) await waitFor(() => emailsNaming(name).length > 0, 10_000);
  const row = await expectRow(name, { center: "Not sure yet", helpingWho: null, concerns: [], note: null, phone: null, referredBy: LATER, heardAbout: "Referral from a friend or family", consent: false });
  const heard = row && "heard_about" in row ? "Referral from a friend or family" : null;
  expectEmail(name, row, { center: "Not sure yet", consent: false, phone: false, ...(HOLD ? { referredBy: LATER, heardAbout: heard } : {}) });
  if (row) await expectEmailRecords(name, row.id, { visitor: "sent", details: HOLD ? null : "sent" });
  if (row && HOLD) await expectReleasedBy(name, row.id, "page_two");
  expectVisitorEmail(name, emailFor(name), { center: "Not sure yet" });
  // The platform contract needs a phone: an email-only lead is the email's alone.
  expect(`${name}: no platform post (the contract needs a phone)`, forwardsNaming(name).length === 0, `${forwardsNaming(name).length} post(s)`);
  expectNoText(name, "an email-only lead");
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
 * One whole booking conversation through /api/chat — the real six-step state
 * machine (lib/chat/booking.ts), not a replay of its POST body. Each
 * conversation comes from its own made-up client address so the route's
 * per-minute limit (12) is never what a run trips over.
 *
 *   yes: name + number in one reply → a bad email, re-asked with the example
 *        → "Franklin" (buttons again) → "Nashvile" (typo → Nashville) →
 *        who/what → "Afternoon" → read-back → "Fix something" → "Email" →
 *        a new address → read-back again → "Yes, text me"
 *   no:  name alone → number → email → "Come to me" (Concierge) → who/what →
 *        "Any time" → read-back → "No, just call"
 *
 * Every question is asserted word for word, with its buttons.
 */
const CENTER_BUTTONS = ["Nashville", "Murfreesboro", "Come to me", "Not sure"];
const TIME_BUTTONS = ["Morning", "Afternoon", "Any time"];
const CONFIRM_BUTTONS = ["Yes, text me", "No, just call", "Fix something"];
const FIX_BUTTONS = ["Name", "Phone", "Email", "Center", "Best time"];

async function chatConversation(consent, n) {
  // The first word differs between the two: texts are matched by their
  // "Hi <first word>," greeting.
  const typed = `${CHAT_PREFIX.toLowerCase()}${consent ? "yes" : "no"} chat`;
  const name = capitalizeName(typed);
  console.log(`\n▸ chat booking, ${consent ? "Yes, text me" : "No, just call"} — typed ${JSON.stringify(typed)}`);
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
    return { reply: String(body.reply ?? ""), buttons: body.buttons ?? null, lead: body.lead ?? null };
  };
  // `lead` is the widget's cue to send the GA4 lead events (lib/analytics.ts):
  // on the saved-booking turn and on no other.
  const turn = async (message, reply, buttons = null) => {
    const got = await say(message);
    if (got.lead !== null) expect(`${name}: ${JSON.stringify(message)} carries no lead marker`, false, JSON.stringify(got.lead));
    expect(`${name}: ${JSON.stringify(message)} → ${JSON.stringify(reply.length > 70 ? `${reply.slice(0, 67)}…` : reply)}`, got.reply === reply, JSON.stringify(got.reply));
    expect(`${name}:   buttons ${buttons ? buttons.join(" · ") : "none"}`, JSON.stringify(got.buttons) === JSON.stringify(buttons), JSON.stringify(got.buttons));
    return got;
  };

  const email = `${CHAT_PREFIX.toLowerCase()}${consent ? "yes" : "no"}@example.test`;
  const center = consent ? "Nashville" : "Concierge";
  const time = consent ? "Afternoon" : "Any time";
  const readBack = (address) => `Here’s what I have: ${name}, (000) 000-0000, ${address}, ${center}, ${time}. ${CHAT_CONSENT_QUESTION}`;

  await turn("I'd like to book a call", "What’s your name and the best number to reach you?");
  chatSessions.push(sessionId);
  if (consent) {
    await turn(`${typed} 0000000000`, "What email should we send your confirmation to?");
    await turn("my email is at gmail", "That doesn’t look like an email address — could you type it again, like name@gmail.com?");
    await turn(email, "Which center?", CENTER_BUTTONS);
    await turn("Franklin", "Our Franklin center isn’t open yet — Nashville and Murfreesboro are open now, or we can come to you. Which center?", CENTER_BUTTONS);
    await turn("Nashvile", "Who’s this for, and what’s going on? A sentence is plenty.");
  } else {
    await turn(typed, `Thanks, ${firstWord(name)}. What’s the best number to reach you?`);
    await turn("0000000000", "What email should we send your confirmation to?");
    await turn(email, "Which center?", CENTER_BUTTONS);
    await turn("Come to me", "Who’s this for, and what’s going on? A sentence is plenty.");
  }
  await turn("Myself — trouble sleeping", "Best time to call?", TIME_BUTTONS);
  let finalEmail = email;
  if (consent) {
    await turn("Afternoon", readBack(email), CONFIRM_BUTTONS);
    await turn("Fix something", "No problem — what would you like to change?", FIX_BUTTONS);
    await turn("Email", "What’s the right email?");
    finalEmail = `${CHAT_PREFIX.toLowerCase()}fixed@example.test`;
    await turn(finalEmail, readBack(finalEmail), CONFIRM_BUTTONS);
  } else {
    await turn("Any time", readBack(email), CONFIRM_BUTTONS);
  }
  const done = await say(consent ? "Yes, text me" : "No, just call");
  const want = consent
    ? `You’re all set, ${firstWord(name)}. Someone from our Nashville center will call you soon.`
    : `You’re all set, ${firstWord(name)}. Someone from our team will call you soon.`;
  expect(`${name}: booking saved, then "${want}"`, done.reply === want && done.buttons === null, JSON.stringify(done));
  expect(`${name}: the closing promises no "today"`, !/today/i.test(done.reply));
  expect(`${name}: the saved booking carries the GA4 lead marker, center only`, JSON.stringify(done.lead) === JSON.stringify({ saved: true, center }), JSON.stringify(done.lead));
  await sleep(300);
  // The wording stored is the question as asked, for a yes and a no alike.
  const row = await expectRow(name, { center, helpingWho: "Myself", concerns: [], note: "Myself — trouble sleeping", email: finalEmail, source: "chat", bestTime: time, sourcePage: "/", consent, consentText: CHAT_CONSENT_QUESTION });
  expectEmail(name, row, { center, consent, source: "the site assistant (chat)" });
  if (row) await expectEmailRecords(name, row.id, { visitor: "sent", details: null });
  expectVisitorEmail(name, finalEmail, { center, source: "chat" });
  // The chat already has who/what: the notification shows it, no update follows.
  const note = emailsNaming(name)[0]?.body?.text ?? "";
  expect(`${name}: chat notification shows "What they told us"`, note.includes("What they told us") && note.includes("Myself — trouble sleeping"), JSON.stringify(note.slice(0, 300)));
  expectForward(name, { center, consent, whoFor: "myself" });
  if (consent) expectText(name, { from: env.DIALPAD_SMS_FROM_NASHVILLE ?? env.DIALPAD_SMS_FROM ?? "+16155550100" });
  else expectNoText(name, `"No, just call"`);
  return row;
}

/** `sms_consent: true` without the wording is not consent — no text. */
async function forgedConsent() {
  const name = `E2E-${RUN}-Forged-0 Tester`;
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

/** A guide download: one notification to the guide inbox, never a visitor email. */
async function guideDownload() {
  const address = `e2e-${RUN}-guide@example.test`;
  console.log(`\n▸ guide download — ${address}`);
  const res = await fetch(`${BASE}/api/consultation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "guide", email: address, source_page: "/resources/homework-battles", website: "" }),
  });
  expect(`guide: accepted (201)`, res.status === 201, String(res.status));
  const body = await res.json().catch(() => null);
  if (body?.id) created.push(body.id);
  await sleep(300);
  const list = emails().filter((e) => (e.body?.subject ?? "").includes(address));
  const inbox = routeLead({ type: "guide", source: "form", preferredCenter: null }, env, () => {}).to ?? "office@example.test";
  expect(`guide: exactly one notification, to ${inbox}`, list.length === 1 && JSON.stringify(list[0].body.to).includes(inbox), JSON.stringify(list.map((e) => e.body.to)));
  const t = list[0]?.body?.text ?? "";
  expect(`guide: "Guide download", which guide, the address, the page, the time in CT`, t.startsWith("GUIDE DOWNLOAD") && t.includes("Why regulation fails") && t.includes(address) && t.includes("/resources/homework-battles") && / CT$/m.test(t), JSON.stringify(t.slice(0, 300)));
  expect(`guide: the address is a mailto link`, (list[0]?.body?.html ?? "").includes(`href="mailto:${address}"`));
  expect(`guide: NO visitor confirmation email`, visitorEmailsTo(address).length === 0, `${visitorEmailsTo(address).length}`);
  if (body?.id) {
    const [r] = await rest(`consultation_requests?id=eq.${body.id}&select=confirm_email_status,notify_route`);
    expect(`guide: row records no visitor email, route "guide"`, r?.confirm_email_status === null && r?.notify_route === "guide", JSON.stringify(r));
  }
}

/** The route's own email rule, without a browser: the form must send one. */
async function postRefusals() {
  console.log(`\n▸ POST refusals`);
  const name = `E2E-${RUN}-Refused-0 Tester`;
  const post = (payload) => fetch(`${BASE}/api/consultation`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "consultation", source: "form", first_name: name, preferred_center: "Nashville", website: "", source_page: "/contact", ...payload }) }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => null) }));
  const missing = await post({});
  expect("POST from the form with neither a phone nor an email is refused (400), and says so", missing.status === 400 && /phone number or an email/i.test(missing.body?.error ?? ""), JSON.stringify(missing));
  const noName = await post({ first_name: "", phone: "0000000000" });
  expect("POST from the form without a name is refused (400)", noName.status === 400, JSON.stringify(noName));
  const bad = await post({ phone: "0000000000", email: "not-an-address" });
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
  expect("PATCH with email is refused (400)", (await patch(row.id, { email: "mallory@example.test" })) === 400);
  expect("PATCH with an unknown best_time is refused (400)", (await patch(row.id, { best_time: "Midnight" })) === 400);
  expect("PATCH with an unknown contact_method is refused (400)", (await patch(row.id, { contact_method: "fax" })) === 400);
  expect("PATCH with an unknown heard_about is refused (400)", (await patch(row.id, { heard_about: "Myspace" })) === 400);
  expect("PATCH with sms_consent but no wording is refused (400)", (await patch(row.id, { sms_consent: true })) === 400);
  expect("PATCH withdrawing sms_consent is refused (400)", (await patch(row.id, { sms_consent: false, sms_consent_text: "x" })) === 400);
  expect("PATCH with an unknown helping_who is refused (400)", (await patch(row.id, { helping_who: "My dog" })) === 400);
  expect("PATCH with an empty body is refused (400)", (await patch(row.id, {})) === 400);
  expect("PATCH to an unknown id answers 404", (await patch("00000000-0000-4000-8000-000000000000", { note: "x" })) === 404);
  expect("PATCH to a non-uuid answers 404", (await patch("not-a-uuid", { note: "x" })) === 404);
  const [after] = await rest(`consultation_requests?id=eq.${row.id}&select=phone,email,first_name,preferred_center,best_time,contact_method,sms_consent`);
  expect("refused PATCHes changed nothing", after.phone === "0000000000" && after.email === row.email && after.first_name === row.first_name && after.preferred_center === row.preferred_center && after.best_time === row.best_time && after.contact_method === row.contact_method && after.sms_consent === row.sms_consent, JSON.stringify(after));
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
    const first = String(r.first_name ?? "");
    if (first.startsWith(`E2E-${RUN}-`) || first.startsWith(CHAT_PREFIX)) continue;
    out.set(r.id, createHash("sha256").update(JSON.stringify(r)).digest("hex"));
  }
  return out;
}
const before = await fingerprintOthers();
console.log(`fingerprinted ${before.size} existing row(s) — they must be untouched at the end`);
await rawHtml();

let chrome;
try {
  chrome = await launch();
} catch (error) {
  console.error(`\n  ${error.message}`);
  process.exit(1);
}

let ticker = null;
if (HOLD) {
  // Two beats close together open the server's gate (lib/held-notification.ts
  // → shouldHold); then one every 10 s, as Vercel Cron would every minute.
  const a = await tick();
  await sleep(1500);
  const b = await tick();
  console.log(`hold mode: release job answered ${a}, ${b}`);
  if (a !== 200 || b !== 200) {
    console.error("The release job refused — is CRON_SECRET the same on the server, and is migration 0009 applied?");
    process.exit(1);
  }
  ticker = setInterval(tick, 10_000);
} else {
  console.log("fail-safe mode (CRON_SECRET unset): staff emails go at step one, as before the hold");
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
  await pathSkip(page, 390, 844);
  await pathEmailOnly(page, 390);
  await pathLeave(chrome, 390);
  await chatConversation(true, 1);
  const chatRow = await chatConversation(false, 2);
  await forgedConsent();
  if (HOLD) await latePageTwo();
  await guideDownload();
  await postRefusals();
  if (saveRows[0]?.row) await patchRefusals(saveRows[0].row);
  if (chatRow) await patchChatRowRefused(chatRow);
} catch (error) {
  failures.push(`run aborted: ${error.message}`);
  console.error(error);
} finally {
  if (ticker) clearInterval(ticker);
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
  const stray = [
    ...(await rest(`consultation_requests?first_name=like.${encodeURIComponent(`E2E-${RUN}-*`)}`, { method: "DELETE" })),
    ...(await rest(`consultation_requests?first_name=like.${encodeURIComponent(`${CHAT_PREFIX}*`)}`, { method: "DELETE" })),
  ];
  if (stray.length > 0) {
    console.log(`swept ${stray.length} uncounted row(s) from this run`);
    failures.push(`${stray.length} test row(s) were written but never asserted`);
  }
  if (chatSessions.length > 0) {
    const gone = await rest(`chat_sessions?id=in.(${chatSessions.map((id) => `"${id}"`).join(",")})`, { method: "DELETE" });
    console.log(`deleted ${gone.length} of ${chatSessions.length} chat session(s)`);
  }
  const left = [
    ...(await rest(`consultation_requests?first_name=like.${encodeURIComponent(`E2E-${RUN}-*`)}&select=id`)),
    ...(await rest(`consultation_requests?first_name=like.${encodeURIComponent(`${CHAT_PREFIX}*`)}&select=id`)),
  ];
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
console.log("✓ contact flow: the short step one (name, phone OR email, center); the carrier phrases unbroken on /sms-terms; four form paths and two six-step chat bookings, one row, one email and one lead post each; a text only where the box was ticked or the chat said yes, none otherwise; names capitalized, first-word greetings, the referral saved, the quiet skip, the four-part confirmation fitting 390×844, every late panel revealed, the video plays; existing rows untouched.");
