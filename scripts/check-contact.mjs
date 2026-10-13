/**
 * End-to-end check of the three-step contact form, against a production
 * build and the real Supabase project.
 *
 *   npm run build
 *   MOCK_RESEND_LOG=/tmp/resend.jsonl MOCK_PLATFORM_LOG=/tmp/platform.jsonl \
 *     NODE_OPTIONS="--import ./scripts/contact-flow/mock-resend.mjs" \
 *     RESEND_API_KEY=re_test LEADS_NOTIFY_EMAIL=office@example.test \
 *     INQUIRY_API_BASE=http://platform.test INQUIRY_INTAKE_SECRET=test \
 *     npx next start -p 3123
 *   CHECK_BASE=http://127.0.0.1:3123 MOCK_RESEND_LOG=/tmp/resend.jsonl \
 *     MOCK_PLATFORM_LOG=/tmp/platform.jsonl \
 *     CHECK_CONTACT_ALLOW_PROJECT=<project ref> npm run check:contact
 *
 * What it drives, in a headless Chrome (scripts/layout/cdp.mjs), at 320px,
 * 768px and 1440px:
 *
 *   save   step one → step two → "Save these details" → the video
 *   skip   step one → step two → "Skip" → the video
 *   leave  step one → close the tab (once, at 390px)
 *
 * and, without a browser, the chat's write path (the exact body
 * lib/chat/booking.ts submits, with the center declined) and the PATCH
 * route's refusals. For every submission it asserts:
 *
 *   - exactly ONE row in consultation_requests, with the right columns —
 *     `helping_who` null and `concerns` empty unless step two saved them;
 *   - exactly ONE lead email (read from MOCK_RESEND_LOG), sent at step one,
 *     naming the row;
 *   - the platform forward (read from MOCK_PLATFORM_LOG): one post at step
 *     one for every path — the skip and leave paths included — with the
 *     who-for stand-in and its flag line, and on the save path a second,
 *     labelled update post carrying the answers;
 *   - every late-mounting panel (step two, the video) is at opacity 1 — the
 *     reveal gate, components/RevealOnScroll.tsx;
 *   - on the desktop save path, that the play button loads the
 *     youtube-nocookie player and the player fetches media, with no
 *     Permissions-Policy violation in the console.
 *
 * ## It writes to the database
 *
 * Seven rows, named `E2E-<run>-<path>-<width>`, phone 0000000000. The same
 * preflight as scripts/chat-checklist.mjs: CHECK_CONTACT_ALLOW_PROJECT must
 * name the exact project ref in SUPABASE_URL, which cannot be satisfied
 * without looking at which project that is. The rows this run created are
 * deleted at the end, by id, unless `--keep` is passed. Nothing else in the
 * table is read beyond the rows this run named.
 */

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
if (!MOCK_LOG || !PLATFORM_LOG) {
  console.error("MOCK_RESEND_LOG and MOCK_PLATFORM_LOG must be set — the server must be started with scripts/contact-flow/mock-resend.mjs preloaded (see the header).");
  process.exit(1);
}

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
async function expectRow(name, { center, helpingWho, concerns, note, email = null, source = "form", bestTime = "Any time", sourcePage = "/contact" }) {
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
  return r;
}

/** Exactly one email, carrying the lead and pointing at the row. */
function expectEmail(name, row, { center, source = "the contact form", inbox = env.LEADS_NOTIFY_EMAIL ?? "office@example.test" }) {
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
}

/**
 * The platform forward. Every consultation posts once at step one — with the
 * who-for stand-in and the flag line when the form has not asked yet — and
 * the save path posts a second time, labelled as an update, with the answers.
 */
function expectForward(name, { center, whoFor = null, updated = null }) {
  const list = forwardsNaming(name);
  const want = updated ? 2 : 1;
  expect(`${name}: ${want} platform post(s)`, list.length === want, `${list.length} post(s)`);
  const first = list[0];
  if (!first) return;
  expect(`${name}: platform post carries the secret header`, first.secretPresent === true);
  expect(`${name}: platform post phone/center`, first.body.phone === "0000000000" && first.body.preferredCenter === center, JSON.stringify([first.body.phone, first.body.preferredCenter]));
  expect(`${name}: platform post honeypot present and empty`, first.body.website === "", JSON.stringify(first.body.website));
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

/** Wait for a panel whose heading starts with `heading`, then report its reveal. */
async function waitPanel(page, heading, timeout = 8000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    const state = await page.eval(`(() => {
      const h = [...document.querySelectorAll(".form-step h2")].find((x) => x.textContent.trim().startsWith(${JSON.stringify(heading)}));
      if (!h) return null;
      const panel = h.closest(".form-step");
      const cs = getComputedStyle(panel);
      return { opacity: Number(cs.opacity), hasIn: panel.classList.contains("in"), transform: cs.transform, top: panel.getBoundingClientRect().top, focused: document.activeElement === h };
    })()`);
    if (state && state.opacity === 1 && state.hasIn) return state;
    await sleep(120);
  }
  return await page.eval(`(() => {
    const h = [...document.querySelectorAll(".form-step h2")].find((x) => x.textContent.trim().startsWith(${JSON.stringify(heading)}));
    if (!h) return { missing: true };
    const panel = h.closest(".form-step"); const cs = getComputedStyle(panel);
    return { opacity: Number(cs.opacity), hasIn: panel.classList.contains("in"), transform: cs.transform, top: panel.getBoundingClientRect().top };
  })()`);
}

async function stepOne(page, width, name, { email = null, center = "Not sure yet" } = {}) {
  await page.setViewport(width, width <= 400 ? 700 : 900);
  await page.goto(`${BASE}/contact`, { settle: 400 });
  // goto() stamps `in` on every .rv that exists at load; the panels this
  // check cares about do not exist yet, so the reveal gate is still real.
  for (const [sel, val] of [["#first-name", name], ["#phone", "0000000000"], ["#preferred-center", center]]) {
    const r = await page.eval(setValue(sel, val));
    if (r !== "ok") throw new Error(r);
  }
  if (email) {
    const r = await page.eval(clickText("+ Add an email address"));
    if (r !== "ok") throw new Error(r);
    await sleep(50);
    await page.eval(setValue("#email", email));
  }
  const r = await page.eval(clickText("Request my free call"));
  if (r !== "ok") throw new Error(r);
}

async function pathSave(page, width) {
  const name = `E2E-${RUN}-save-${width}`;
  console.log(`\n▸ save path @ ${width}px — ${name}`);
  await stepOne(page, width, name, { email: `${name.toLowerCase()}@example.test`, center: "Murfreesboro" });
  const two = await waitPanel(page, "Your call is requested");
  expect(`${name}: step two mounts and reveals (opacity 1, .in)`, two?.opacity === 1 && two.hasIn, JSON.stringify(two));
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
  await sleep(300);
  const row = await expectRow(name, { center: "Murfreesboro", helpingWho: "My child", concerns: ["Sleep", "Focus & ADHD"], note: "E2E note — bedtime is the hard part.", email: `${name.toLowerCase()}@example.test` });
  // Per-center routing (lib/center-routing.ts): a Murfreesboro lead goes to
  // LEADS_NOTIFY_EMAIL_MURFREESBORO when the server has it, else the default.
  // Pass the server's value to this check so it can say which it expects.
  expectEmail(name, row, { center: "Murfreesboro", inbox: env.LEADS_NOTIFY_EMAIL_MURFREESBORO ?? env.LEADS_NOTIFY_EMAIL ?? "office@example.test" });
  expect(`${name}: still exactly one email after step two`, emailsNaming(name).length === 1, `${emailsNaming(name).length}`);
  expectForward(name, { center: "Murfreesboro", updated: { whoFor: "my_child", concerns: ["sleep", "focus_adhd"], note: "E2E note — bedtime is the hard part." } });
  return { name, row };
}

async function pathSkip(page, width) {
  const name = `E2E-${RUN}-skip-${width}`;
  console.log(`\n▸ skip path @ ${width}px — ${name}`);
  await stepOne(page, width, name, { center: "Nashville" });
  const two = await waitPanel(page, "Your call is requested");
  expect(`${name}: step two mounts and reveals (opacity 1, .in)`, two?.opacity === 1 && two.hasIn, JSON.stringify(two));
  await page.eval(clickText("Skip"));
  const three = await waitPanel(page, "While you wait for our call");
  expect(`${name}: video panel mounts and reveals (opacity 1, .in)`, three?.opacity === 1 && three.hasIn, JSON.stringify(three));
  await sleep(300);
  const row = await expectRow(name, { center: "Nashville", helpingWho: null, concerns: [], note: null });
  expectEmail(name, row, { center: "Nashville" });
  // The skip path reaches the platform: step one is the lead.
  expectForward(name, { center: "Nashville" });
  return { name, row };
}

async function pathLeave(chrome, width) {
  const name = `E2E-${RUN}-leave-${width}`;
  console.log(`\n▸ leave path @ ${width}px — ${name}`);
  const page = await chrome.newPage();
  await page.init();
  await stepOne(page, width, name);
  const two = await waitPanel(page, "Your call is requested");
  expect(`${name}: step two shown (then the tab closes)`, two?.opacity === 1, JSON.stringify(two));
  await page.close();
  await sleep(500);
  const row = await expectRow(name, { center: "Not sure yet", helpingWho: null, concerns: [], note: null });
  expectEmail(name, row, { center: "Not sure yet" });
  expectForward(name, { center: "Not sure yet" });
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
    if (msg.method === "Log.entryAdded" && /permissions?[- ]policy|feature policy/i.test(msg.params.entry.text)) {
      seen.violations.push(msg.params.entry.text);
    }
    if (msg.method === "Runtime.consoleAPICalled") {
      const text = msg.params.args.map((a) => a.value ?? a.description ?? "").join(" ");
      if (/permissions?[- ]policy|feature policy/i.test(text)) seen.violations.push(text);
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

async function chatWritePath() {
  const name = `E2E-${RUN}-chat-0`;
  console.log(`\n▸ chat write path — ${name}`);
  // Exactly the BookingSubmission lib/chat/booking.ts builds, with the center
  // and time declined (null) — the shape migration 0004 had to keep working.
  const res = await fetch(`${BASE}/api/consultation`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "consultation", source: "chat", helping_who: "Myself", first_name: name, phone: "0000000000", note: "chat note", best_time: null, preferred_center: null, source_page: "/" }),
  });
  const body = await res.json().catch(() => null);
  expect(`${name}: chat POST answers 201 with an id`, res.status === 201 && typeof body?.id === "string", `${res.status} ${JSON.stringify(body)}`);
  await sleep(300);
  const row = await expectRow(name, { center: "Not sure yet", helpingWho: "Myself", concerns: [], note: "chat note", source: "chat", bestTime: null, sourcePage: "/" });
  expectEmail(name, row, { center: "Not sure yet", source: "the site assistant (chat)" });
  expectForward(name, { center: "Not sure yet", whoFor: "myself" });
  return row;
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
  const chatRow = await chatWritePath();
  if (saveRows[0]?.row) await patchRefusals(saveRows[0].row);
  if (chatRow) await patchChatRowRefused(chatRow);
} catch (error) {
  failures.push(`run aborted: ${error.message}`);
  console.error(error);
} finally {
  await chrome.close();
}

// Only ids this run created, by exact id — never by pattern.
if (!KEEP && created.length > 0) {
  const ids = created.join(",");
  const deleted = await rest(`consultation_requests?id=in.(${ids})`, { method: "DELETE" });
  console.log(`\ncleaned up ${deleted.length} of ${created.length} test row(s)`);
  if (deleted.length !== created.length) failures.push(`cleanup removed ${deleted.length} of ${created.length} rows`);
} else if (created.length > 0) {
  console.log(`\nkept ${created.length} test row(s): ${created.join(", ")}`);
}

const total = emails().length;
console.log(`\n${passes} check(s) passed, ${failures.length} failed; ${total} email(s) in ${MOCK_LOG}, ${forwards().length} platform post(s) in ${PLATFORM_LOG} this server session`);
if (failures.length > 0) {
  console.log("\n❌  contact flow:\n");
  for (const f of failures) console.log(`  • ${f}`);
  process.exit(1);
}
console.log("✓ contact flow: three paths, one row, one email and one lead post each, every late panel revealed, the video plays.");
