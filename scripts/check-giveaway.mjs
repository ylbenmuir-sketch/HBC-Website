/**
 * End-to-end check of the 10-year giveaway (GIVEAWAY-PLAN.md §7 Phase 4):
 * the whole week, compressed, against a production build — by moving the
 * giveaway's clock (lib/giveaway/clock.ts) rather than waiting for November.
 *
 *   npm run build
 *   npm run check:giveaway            # starts its own server on :3124
 *   CHECK_BASE=http://127.0.0.1:3124 npm run check:giveaway -- --attach
 *                                     # drive a server you started yourself
 *
 * The server it starts runs with GIVEAWAY_ENV=test and GIVEAWAY_REPO=memory
 * (the giveaway tables live in the process — lib/giveaway/memory-client.ts;
 * migration 0010 is not applied to the project yet), Resend and Dialpad
 * mocked (scripts/contact-flow/mock-resend.mjs), the admin code mocked
 * (GIVEAWAY_OTP_MOCK_CODE), and SUPABASE_URL emptied so NOTHING writes to
 * the real database — the /contact step validates the code and sends the
 * (mock) rescue email without saving a row. `--db` keeps Supabase for the
 * giveaway tables instead (env=test rows only) once 0010 exists.
 *
 * What it drives, with fetch (x-forwarded-for + user-agent set per
 * "person", since the limiter and the self-referral rule read them) and a
 * headless Chrome for the page itself:
 *
 *   today            /10years is a 404; /admin/10years is noindex + no-store
 *   Nov 10           notify-me: three signups + a non-Tennessee ZIP refused +
 *                    a honeypot swallowed; three verification emails; links
 *                    clicked (one twice); /10years now in the sitemap
 *   Nov 15 6 pm      cron → "It's live" to the three; A taps Sunday night
 *                    (early bird), B taps Monday afternoon (no early bird),
 *                    C never taps; Monday 9 am reminder to B and C
 *   Mon 8 am         live entries by form: D; E through D's link (+3/+1);
 *                    F from D's own device (voided); eleven more friends
 *                    (the 11th credits nothing); an unknown code; a sixth
 *                    attempt from one address refused by the limiter
 *   Mon noon …       six drawings: Monday (owner alert, winner email, claim
 *                    page, marked contacted → Tuesday re-send skipped),
 *                    Tuesday (staff alert, tax-form line), a deliberately
 *                    skipped minute (Wed + Thu drawn in one tick), Friday,
 *                    an unreachable winner → redraw with a reason, public-OK
 *                    toggle → the winners list names them, Saturday's grand
 *                    from every entry; daily emails each afternoon
 *   Nov 22           thank-you + offer to every non-winner
 *   Dec 1 / Dec 6    a code booked through /contact ("(10 years)" subject,
 *                    center from ZIP, redeemed; a second use refused);
 *                    after Dec 5 a code is refused as expired; unsubscribe
 *
 * and asserts, at the end: six drawings, each with exactly one current
 * winner; every pick re-verifies; the Resend mock holds exactly the
 * expected emails and nothing else; the Dialpad mock log is EMPTY.
 */

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { registerHooks } from "node:module";

registerHooks({
  resolve(spec, ctx, next) {
    const local = !ctx.parentURL?.includes("/node_modules/");
    if (local && spec.startsWith(".") && !/\.(ts|tsx|js|mjs|cjs|json)$/.test(spec)) return next(`${spec}.ts`, ctx);
    return next(spec, ctx);
  },
});

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ATTACH = process.argv.includes("--attach");
const USE_DB = process.argv.includes("--db");
const SKIP_BROWSER = process.argv.includes("--no-browser");
const PORT = Number(process.env.CHECK_PORT ?? 3124);
const BASE = (process.env.CHECK_BASE ?? `http://127.0.0.1:${PORT}`).replace(/\/$/, "");
const CRON_SECRET = process.env.CRON_SECRET ?? "check-giveaway-cron-secret";
const TOKEN_SECRET = process.env.GIVEAWAY_TOKEN_SECRET ?? "check-giveaway-token-secret-0123456789";
const OTP_CODE = "123456";
const ADMIN_EMAIL = "admin-check@example.test";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const C = await import(`${ROOT}/lib/giveaway/config.ts`);

/* ── the server ────────────────────────────────────────────────────────── */

const work = mkdtempSync(join(tmpdir(), "check-giveaway-"));
const RESEND_LOG = process.env.MOCK_RESEND_LOG ?? join(work, "resend.jsonl");
const SMS_LOG = process.env.MOCK_SMS_LOG ?? join(work, "sms.jsonl");
const PLATFORM_LOG = process.env.MOCK_PLATFORM_LOG ?? join(work, "platform.jsonl");

let server = null;
async function startServer() {
  const env = {
    ...process.env,
    PORT: String(PORT),
    NODE_OPTIONS: "--import ./scripts/contact-flow/mock-resend.mjs",
    MOCK_RESEND_LOG: RESEND_LOG,
    MOCK_SMS_LOG: SMS_LOG,
    MOCK_PLATFORM_LOG: PLATFORM_LOG,
    RESEND_API_KEY: "re_test",
    LEADS_FALLBACK: "office@example.test",
    LEADS_NASHVILLE: "nash@example.test",
    LEADS_MURFREESBORO: "boro@example.test",
    GIVEAWAY_ALERTS: "denise@example.test, kylie@example.test",
    GIVEAWAY_ALERTS_OWNER: "ben@example.test, denise@example.test",
    GIVEAWAY_ADMINS: ADMIN_EMAIL,
    GIVEAWAY_TOKEN_SECRET: TOKEN_SECRET,
    GIVEAWAY_OTP_MOCK_CODE: OTP_CODE,
    GIVEAWAY_ENV: "test",
    CRON_SECRET,
    DIALPAD_API_KEY: "test",
    DIALPAD_SMS_FROM: "+16155550100",
    INQUIRY_API_BASE: "http://platform.test",
    INQUIRY_INTAKE_SECRET: "test",
    GIVEAWAY_SITE_URL: BASE,
  };
  if (USE_DB) {
    delete env.GIVEAWAY_REPO;
  } else {
    env.GIVEAWAY_REPO = "memory";
    // Nothing may touch the real database: empty beats unset, because
    // `next start` fills unset keys from .env.local.
    env.SUPABASE_URL = "";
    env.SUPABASE_SERVICE_ROLE_KEY = "";
  }
  server = spawn("npx", ["next", "start", "-p", String(PORT)], { cwd: ROOT, env, stdio: ["ignore", "pipe", "pipe"] });
  const logPath = join(work, "server.log");
  server.stdout.on("data", (d) => writeFileSync(logPath, d, { flag: "a" }));
  server.stderr.on("data", (d) => writeFileSync(logPath, d, { flag: "a" }));
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(1000) });
      if (r.ok) return logPath;
    } catch {}
    await sleep(500);
  }
  throw new Error(`server did not answer on ${BASE}; see ${logPath}`);
}

/* ── helpers ───────────────────────────────────────────────────────────── */

const failures = [];
let passes = 0;
function expect(label, ok, detail = "") {
  if (ok) {
    passes += 1;
    console.log(`  ✓ ${label}`);
  } else {
    failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
    console.log(`  ✗ ${label}${detail ? `\n      ${detail}` : ""}`);
  }
}
const section = (title) => console.log(`\n${title}`);

/** A "person": their own address and browser, so the limiter and the
 *  self-referral rule see them as distinct. */
let ipCounter = 10;
const person = (name, email, extra = {}) => ({ name, email, ip: `203.0.113.${ipCounter++}`, ua: `check-giveaway/${name}`, ...extra });
const headersFor = (p, more = {}) => ({ "x-forwarded-for": p.ip, "user-agent": p.ua, ...more });

/** POST a form without following the redirect; returns {status, location}. */
async function postForm(path, fields, p, extraHeaders = {}) {
  const body = new URLSearchParams(fields);
  const r = await fetch(`${BASE}${path}`, { method: "POST", body, headers: { ...headersFor(p, extraHeaders), "content-type": "application/x-www-form-urlencoded" }, redirect: "manual" });
  return { status: r.status, location: r.headers.get("location") ?? "", res: r };
}
async function get(path, p = person("anon", ""), extra = {}) {
  const r = await fetch(`${BASE}${path}`, { headers: headersFor(p, extra), redirect: "manual" });
  return { status: r.status, text: await r.text(), headers: r.headers };
}
const cronAuth = { authorization: `Bearer ${CRON_SECRET}` };
let clockNow = null;
async function clock(now) {
  clockNow = now;
  const r = await fetch(`${BASE}/api/giveaway/test-clock`, { method: "POST", headers: { ...cronAuth, "content-type": "application/json" }, body: JSON.stringify({ now: now ? now.toISOString() : null }) });
  if (!r.ok) throw new Error(`clock → ${r.status}`);
  return r.json();
}
/** The winners list shows from close (the live page marks days "Drawn"
 *  instead), so a mid-week look at it reads the page as it will be at
 *  close, then puts the clock back. A page view only reads. */
async function peekClosed() {
  const back = clockNow;
  await clock(new Date(C.SCHEDULE.entriesClose.at.getTime() + 60_000));
  try {
    return await get("/10years");
  } finally {
    await clock(back);
  }
}
async function resetAll() {
  const r = await fetch(`${BASE}/api/giveaway/test-clock`, { method: "POST", headers: { ...cronAuth, "content-type": "application/json" }, body: JSON.stringify({ now: null, reset: true }) });
  return r.json();
}
async function dump(table) {
  const r = await fetch(`${BASE}/api/giveaway/test-clock?dump=${table}`, { headers: cronAuth });
  if (!r.ok) throw new Error(`dump ${table} → ${r.status}`);
  return (await r.json()).rows;
}
async function tick(label) {
  const r = await fetch(`${BASE}/api/cron/giveaway`, { headers: cronAuth });
  const j = await r.json();
  if (!r.ok) throw new Error(`cron (${label}) → ${r.status} ${JSON.stringify(j)}`);
  return j;
}
const ct = (y, m, d, h, min = 0) => C.centralToUtc(y, m, d, h, min);

/* ── the mock inbox ────────────────────────────────────────────────────── */

const emails = () => (existsSync(RESEND_LOG) ? readFileSync(RESEND_LOG, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
const texts = () => (existsSync(SMS_LOG) ? readFileSync(SMS_LOG, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l)) : []);
let mark = 0;
/** Emails since the last call. */
function newEmails() {
  const all = emails();
  const fresh = all.slice(mark);
  mark = all.length;
  return fresh;
}
const to = (e) => (Array.isArray(e.body?.to) ? e.body.to[0] : e.body?.to);
const linkIn = (e, pathPart) => {
  const m = String(e.body?.text ?? "").match(new RegExp(`${BASE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}${pathPart}[^\\s"<]+`));
  return m ? m[0] : null;
};
const unsubLinkIn = (e) => linkIn(e, "/unsubscribe");

/* ── the admin ─────────────────────────────────────────────────────────── */

let adminCookies = "";
function keepCookies(res) {
  const set = res.headers.getSetCookie?.() ?? [];
  const jar = new Map(adminCookies.split("; ").filter(Boolean).map((c) => c.split("=")));
  for (const c of set) {
    const [kv] = c.split(";");
    const [k, v] = kv.split("=");
    if (v === "" || /max-age=0/i.test(c)) jar.delete(k);
    else jar.set(k, v);
  }
  adminCookies = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
}
async function adminPost(path, fields) {
  const r = await fetch(`${BASE}${path}`, { method: "POST", body: new URLSearchParams(fields), headers: { cookie: adminCookies, "content-type": "application/x-www-form-urlencoded", "x-forwarded-for": "198.51.100.1" }, redirect: "manual" });
  keepCookies(r);
  return { status: r.status, location: r.headers.get("location") ?? "" };
}
async function adminGet(path) {
  const r = await fetch(`${BASE}${path}`, { headers: { cookie: adminCookies, "x-forwarded-for": "198.51.100.1" }, redirect: "manual" });
  keepCookies(r);
  return { status: r.status, text: await r.text(), headers: r.headers };
}
async function adminLogin() {
  const req = await adminPost("/admin/10years/request-code", { email: ADMIN_EMAIL });
  expect("admin: code requested (mock, no email)", req.status === 303 && /sent=1/.test(req.location), `${req.status} ${req.location}`);
  const bad = await adminPost("/admin/10years/verify", { code: "000000" });
  expect("admin: a wrong code is refused", /error=invalid/.test(bad.location), bad.location);
  const ok = await adminPost("/admin/10years/verify", { code: OTP_CODE });
  expect("admin: the right code signs in", ok.status === 303 && !/error/.test(ok.location), ok.location);
  const page = await adminGet("/admin/10years");
  expect("admin: dashboard shows the signed-in address", page.status === 200 && page.text.includes(ADMIN_EMAIL), String(page.status));
  expect("admin: dashboard is no-store + noindex", /no-store/.test(page.headers.get("cache-control") ?? "") && /noindex/.test(page.headers.get("x-robots-tag") ?? ""));
}

/* ── the run ───────────────────────────────────────────────────────────── */

let logPath = null;
try {
  if (!ATTACH) logPath = await startServer();
  const info = await (await fetch(`${BASE}/api/giveaway/test-clock`, { headers: cronAuth })).json();
  if (info.env !== "test" && info.env !== "local") throw new Error(`server env is "${info.env}" — refusing to run against it`);
  console.log(`check:giveaway against ${BASE} (env ${info.env}, ${info.memory ? "in-memory tables" : "database"}; logs in ${work})`);
  await resetAll();
  mark = emails().length;

  /* ── today: hidden ──────────────────────────────────────────────────── */
  section("Today (Oct 2026): nothing is public");
  expect("/10years answers 404", (await get("/10years")).status === 404);
  expect("/10years/claim/x answers 404", (await get("/10years/claim/x")).status === 404);
  expect("/10years/rules answers 404", (await get("/10years/rules")).status === 404);
  const site = await get("/sitemap.xml");
  expect("sitemap has no /10years, /unsubscribe or /admin", !/10years|unsubscribe|\/admin/.test(site.text));
  expect("robots.txt disallows /admin/", /Disallow: \/admin\//.test((await get("/robots.txt")).text));
  const admin = await get("/admin/10years");
  expect("/admin/10years answers 200, noindex, no-store", admin.status === 200 && /noindex/.test(admin.headers.get("x-robots-tag") ?? "") && /no-store/.test(admin.headers.get("cache-control") ?? ""));

  /* ── notify-me ──────────────────────────────────────────────────────── */
  section("Nov 10: notify-me");
  await clock(ct(2026, 11, 10, 10));
  const page = await get("/10years");
  expect("/10years answers 200 in notify-me mode", page.status === 200 && page.text.includes('action="/10years/signup"') && /Send me my entry link/.test(page.text), String(page.status));
  expect("sitemap now lists /10years", /\/10years<\/loc>/.test((await get("/sitemap.xml")).text));
  const A = person("A", "alice.notify@example.test");
  const B = person("B", "bob.notify@example.test", { existing: true });
  const Cc = person("C", "cara.notify@example.test");
  const signupFields = (p, extra = {}) => ({ first_name: p.name, last_name: "Tester", email: p.email, zip: "37064", age_rules: "on", ...(p.existing ? { existing_client: "on" } : {}), ...extra });
  for (const p of [A, B, Cc]) {
    const r = await postForm("/10years/signup", signupFields(p), p);
    expect(`${p.name}: notify signup → ?sent=1`, /\?sent=1$/.test(r.location), r.location);
  }
  const nonTn = await postForm("/10years/signup", signupFields(person("Z", "zed@example.test"), { zip: "30301" }), person("Z1", ""));
  expect("a non-Tennessee ZIP is refused with the polite message", /error=not_tennessee/.test(nonTn.location), nonTn.location);
  const bot = await postForm("/10years/signup", signupFields(person("Bot", "bot@example.test"), { website: "http://spam.example" }), person("Bot1", ""));
  expect("a filled honeypot is swallowed as a success", /\?sent=1$/.test(bot.location), bot.location);
  let fresh = newEmails();
  expect("three verification emails, none for the bot", fresh.length === 3 && !fresh.some((e) => to(e) === "bot@example.test"), `${fresh.length}`);
  const verifyLinks = Object.fromEntries(fresh.map((e) => [to(e), linkIn(e, "/10years/verify")]));
  expect("each verification email carries a /10years/verify link", Object.values(verifyLinks).every(Boolean));
  for (const p of [A, B, Cc]) {
    const v = await get(new URL(verifyLinks[p.email]).pathname + new URL(verifyLinks[p.email]).search, p);
    expect(`${p.name}: verification click confirms`, v.status === 200 && /data-ok="1"/.test(v.text));
  }
  const twice = await get(new URL(verifyLinks[A.email]).pathname + new URL(verifyLinks[A.email]).search, A);
  expect("a second click is still a confirmation", /data-ok="1"/.test(twice.text));
  expect("a garbage verify token is refused", /data-ok="0"/.test((await get("/10years/verify?t=nonsense")).text));
  const notifyRows = await dump("giveaway_notify");
  expect("three notify rows, all verified, nobody entered yet", notifyRows.length === 3 && notifyRows.every((r) => r.verified_at) && (await dump("giveaway_people")).length === 0, `${notifyRows.length}`);
  expect("no email was sent for the honeypot or the non-TN ZIP", newEmails().length === 0);

  /* ── It's live ──────────────────────────────────────────────────────── */
  section("Nov 15 6 pm: It's live");
  await clock(C.SCHEDULE.entriesOpen.at);
  const live = await tick("entries open");
  fresh = newEmails();
  expect("cron: the It's live job sent three emails", live.sends.sent === 3 && fresh.length === 3, JSON.stringify(live.sends));
  expect("It's live emails are marketing: unsubscribe link + List-Unsubscribe header", fresh.every((e) => unsubLinkIn(e) && e.body?.headers?.["List-Unsubscribe"]));
  const enterLinks = Object.fromEntries(fresh.map((e) => [to(e), linkIn(e, "/10years/enter/")]));
  expect("each carries a one-tap /10years/enter link", Object.values(enterLinks).every(Boolean));
  expect("the live page shows the entry form", /Enter me/.test((await get("/10years")).text));
  // A taps Sunday night → early bird.
  await clock(ct(2026, 11, 15, 21));
  const tapA = await get(new URL(enterLinks[A.email]).pathname, A);
  expect("A: Sunday-night tap enters with the early-bird bonus", /data-ok="1"/.test(tapA.text) && /early-bird/.test(tapA.text));
  const tapA2 = await get(new URL(enterLinks[A.email]).pathname, A);
  expect("A: a second tap adds nothing", /data-ok="1"/.test(tapA2.text));
  let youreIn = newEmails();
  expect("A: one You're in email, with the share link and the offer code", youreIn.length === 1 && /ref=HBC-/.test(youreIn[0].body.text) && /10Y-[A-Z0-9]{6}/.test(youreIn[0].body.text), `${youreIn.length}`);
  expect("A (not a client): no forward-to-a-friend line", !/Forward this to a friend/.test(youreIn[0]?.body.text ?? ""));
  // Monday 9 am: the reminder to B and C (not A).
  await clock(C.SCHEDULE.mondayReminder.at);
  const rem = await tick("Monday reminder");
  fresh = newEmails();
  expect("Monday 9 am: reminder to B and C only", rem.sends.sent === 2 && fresh.length === 2 && !fresh.some((e) => to(e) === A.email) && fresh.every((e) => /Today at noon/.test(e.body.subject)), JSON.stringify(rem.sends));
  // B taps Monday 2 pm → no early bird; C never taps.
  await clock(ct(2026, 11, 16, 14));
  const tapB = await get(new URL(enterLinks[B.email]).pathname, B);
  expect("B: Monday-afternoon tap enters without the early bird", /data-ok="1"/.test(tapB.text) && !/early-bird/.test(tapB.text));
  youreIn = newEmails();
  expect("B (a current client): You're in carries the forward line", youreIn.length === 1 && /Forward this to a friend/.test(youreIn[0].body.text));

  /* ── live entries + referrals ───────────────────────────────────────── */
  section("Mon Nov 16, 8 am: entries and referrals");
  await clock(ct(2026, 11, 16, 8));
  const D = person("D", "dan.entrant@example.test");
  let r = await postForm("/10years/signup", signupFields(D), D);
  expect("D: entry signup → ?sent=1", /\?sent=1$/.test(r.location), r.location);
  let [dVerify] = newEmails();
  const click = async (p, link) => get(new URL(link).pathname + new URL(link).search, p);
  const dv = await click(D, linkIn(dVerify, "/10years/verify"));
  expect("D: verified with 1 entry", /data-ok="1"/.test(dv.text) && /with 1 entry/.test(dv.text));
  const dIn = newEmails()[0];
  const dRef = dIn.body.text.match(/ref=(HBC-[A-Z0-9]{6})/)[1];
  const dCode = dIn.body.text.match(/(10Y-[A-Z0-9]{6})/)[1];
  // E through D's link.
  const E = person("E", "eve.friend@example.test");
  const refPage = await get(`/10years?ref=${dRef}`, E);
  expect("E: the referral link's page carries the hidden ref field", new RegExp(`name="ref" value="${dRef}"`).test(refPage.text));
  r = await postForm("/10years/signup", signupFields(E, { ref: dRef }), E);
  const ev = await click(E, linkIn(newEmails()[0], "/10years/verify"));
  expect("E: verified with 2 entries (+1 for the link)", /with 2 entries/.test(ev.text));
  expect("E: You're in says they came through a friend's link", /friend's link/.test(newEmails()[0]?.body.text ?? ""));
  let dCount = (await dump("giveaway_entries")).filter((e) => e.kind === "referral_bonus" && !e.void_reason).length;
  expect("D: holds 3 referral bonus entries", dCount === 3, `${dCount}`);
  // F from D's own device (same address and browser) → voided.
  const F = { ...person("F", "fake.friend@example.test"), ip: D.ip, ua: D.ua };
  r = await postForm("/10years/signup", signupFields(F, { ref: dRef }), F);
  const fv = await click(F, linkIn(newEmails()[0], "/10years/verify"));
  expect("F (same device as D): entered with 1 entry — the bonus is voided", /with 1 entry/.test(fv.text));
  newEmails();
  const voided = (await dump("giveaway_entries")).filter((e) => e.void_reason);
  expect("F's +1 exists as a voided row (logged, not dropped)", voided.length === 1 && /same device/.test(voided[0].void_reason));
  expect("an audit line names the self-referral", (await dump("giveaway_audit")).some((a) => a.action === "referral_voided"));
  // Eleven more friends: the 11th credits nothing.
  for (let i = 1; i <= 11; i++) {
    const G = person(`G${i}`, `friend${i}.of.dan@example.test`);
    r = await postForm("/10years/signup", signupFields(G, { ref: dRef }), G);
    const gv = await click(G, linkIn(newEmails()[0], "/10years/verify"));
    if (i === 11) expect("the 11th friend still gets their +1", /with 2 entries/.test(gv.text));
    newEmails();
  }
  dCount = (await dump("giveaway_entries")).filter((e) => e.kind === "referral_bonus" && !e.void_reason).length;
  expect("D: capped at 30 referral bonus entries (10 friends)", dCount === 30, `${dCount}`);
  expect("the cap is audited", (await dump("giveaway_audit")).some((a) => a.action === "referral_cap_reached"));
  // Unknown code: entered normally.
  const H = person("H", "hal.noref@example.test");
  r = await postForm("/10years/signup", signupFields(H, { ref: "HBC-ZZZZZZ" }), H);
  await click(H, linkIn(newEmails()[0], "/10years/verify"));
  newEmails();
  // The limiter: six attempts from one address within the hour.
  const spam = person("S", "spam@example.test");
  let limited = null;
  for (let i = 0; i < 6; i++) limited = await postForm("/10years/signup", signupFields({ ...spam, email: `spam${i}@example.test` }), spam);
  expect("a sixth attempt from one address in an hour is refused", /error=rate_limited/.test(limited.location), limited.location);
  newEmails();
  const peopleNow = await dump("giveaway_people");
  const verifiedNow = peopleNow.filter((p) => p.verified_at).length;
  expect("verified people so far: A, B, D, E, F, G1–G11, H = 17", verifiedNow === 17, `${verifiedNow}`);

  /* ── admin sign-in ──────────────────────────────────────────────────── */
  section("Admin sign-in");
  await adminLogin();

  /* ── the drawings ───────────────────────────────────────────────────── */
  section("Mon noon: the first drawing");
  await clock(C.drawing("mon").at);
  let run = await tick("Monday noon");
  expect("Monday drawn once", run.drawings.drawn.length === 1 && run.drawings.drawn[0].slot === "mon", JSON.stringify(run.drawings));
  fresh = newEmails();
  const alertMon = fresh.find((e) => /10 years — Monday winner/.test(e.body.subject));
  const winMon = fresh.find((e) => /You won Monday/.test(e.body.subject));
  expect("Monday: staff alert to the OWNER route (ben@, cc denise@)", alertMon && to(alertMon) === "ben@example.test" && JSON.stringify(alertMon.body.cc) === JSON.stringify(["denise@example.test"]), alertMon ? `${to(alertMon)} cc ${JSON.stringify(alertMon.body.cc)}` : "no alert");
  expect("Monday: winner email with a claim link, deadline Thursday noon", winMon && linkIn(winMon, "/10years/claim/") && /Thu Nov 19, 12:00 PM CT/.test(winMon.body.text), winMon ? winMon.body.text.slice(0, 200) : "no winner email");
  expect("exactly two emails for a drawing", fresh.length === 2, `${fresh.length}`);
  const again = await tick("Monday noon again");
  expect("a second tick the same minute draws nothing and sends nothing", again.drawings.drawn.length === 0 && newEmails().length === 0);
  let winners = await dump("giveaway_winners");
  const monWinner = winners.find((w) => w.status === "drawn");
  const monPerson = peopleNow.find((p) => p.id === monWinner.person_id);
  expect("Monday winner's prize version follows the existing-client box", monWinner.prize_version === (monPerson.is_existing_client ? "current_client" : "new_client"));
  // The claim page.
  const claimPath = new URL(linkIn(winMon, "/10years/claim/")).pathname;
  const claimPage = await get(claimPath, A);
  expect("claim page greets the winner and asks for a number", claimPage.status === 200 && /congratulations/.test(claimPage.text) && /name="phone"/.test(claimPage.text));
  const claimed = await postForm(`${claimPath}/submit`, { phone: "(615) 555-0101" }, A);
  expect("claim page accepts the number", /done=1/.test(claimed.location), claimed.location);
  winners = await dump("giveaway_winners");
  expect("the winner row is claimed with the phone", winners.find((w) => w.id === monWinner.id).status === "claimed" && winners.find((w) => w.id === monWinner.id).phone === "(615) 555-0101");
  expect("the winners list shows Monday as claimed ✓ (no name yet)", /Monday's winner: claimed/.test((await peekClosed()).text));
  // ADMIN_ACTIONS_MONDAY — filled in once the admin screens exist.
  await adminActionsAfterMonday(monWinner);

  section("Mon 4 pm: the daily email");
  await clock(C.drawing("mon").dailyEmailAt);
  run = await tick("Monday 4 pm");
  fresh = newEmails();
  expect(`daily email to every verified entrant (${verifiedNow})`, run.sends.sent === verifiedNow && fresh.length === verifiedNow, `${run.sends.sent}/${fresh.length}`);
  expect("daily email names Tuesday's prize, carries entries count and the unsubscribe link", fresh.every((e) => /Tuesday/.test(e.body.subject) && /entr(y|ies)/.test(e.body.text) && unsubLinkIn(e)));
  // Unsubscribe H from a daily email.
  const hDaily = fresh.find((e) => to(e) === H.email);
  const unsub = await get(new URL(unsubLinkIn(hDaily)).pathname + new URL(unsubLinkIn(hDaily)).search, H);
  expect("H: unsubscribe link works (200, no-store, noindex)", unsub.status === 200 && /unsubscribed/i.test(unsub.text) && /noindex/.test(unsub.headers.get("x-robots-tag") ?? ""));
  expect("H: unsubscribed_at is set", (await dump("giveaway_people")).find((p) => p.email === H.email).unsubscribed_at !== null);
  expect("a tampered unsubscribe link is refused", (await get("/unsubscribe?t=abc.def")).status === 400);

  section("Tue 8:30 am: the call-today re-send is skipped (Monday's winner contacted)");
  await clock(C.SCHEDULE.tuesdayCallToday.at);
  run = await tick("Tuesday 8:30");
  const sends = await dump("scheduled_sends");
  const tueJob = sends.find((s) => s.kind === "tuesday_call_today" && !s.person_id && !s.notify_id);
  expect("Tuesday re-send skipped with the reason", tueJob?.sent_at && /already/.test(tueJob.skipped_reason ?? ""), JSON.stringify(tueJob));
  expect("no email went out for it", newEmails().length === 0);

  section("Tue noon: the second drawing (staff route, tax form)");
  await clock(C.drawing("tue").at);
  run = await tick("Tuesday noon");
  fresh = newEmails();
  const alertTue = fresh.find((e) => /10 years — Tuesday winner/.test(e.body.subject));
  expect("Tuesday: alert to the STAFF route (denise@, cc kylie@)", alertTue && to(alertTue) === "denise@example.test" && JSON.stringify(alertTue.body.cc) === JSON.stringify(["kylie@example.test"]), alertTue ? `${to(alertTue)}` : "no alert");
  winners = await dump("giveaway_winners");
  const tueDrawingId = (await dump("giveaway_drawings")).find((d) => d.slot === "tue").id;
  const tueWinner = winners.find((w) => w.drawing_id === tueDrawingId);
  expect("Tuesday's winner is not Monday's", tueWinner.person_id !== monWinner.person_id);
  const tuePool = (await dump("giveaway_drawing_pool")).filter((p) => p.drawing_id === tueWinner.drawing_id);
  expect("Monday's winner is absent from Tuesday's frozen pool", !tuePool.some((p) => p.person_id === monWinner.person_id));
  const winTue = fresh.find((e) => /You won Tuesday/.test(e.body.subject));
  const tuePrize = (await dump("giveaway_prizes")).find((p) => p.id === tueWinner.prize_id);
  expect("the tax-form line appears exactly when the prize is over $600", Boolean(winTue) && /tax form/.test(winTue.body.text) === tuePrize.tax_form_required, `${tuePrize.name} $${tuePrize.retail_value_usd}`);
  if (tuePrize.tax_form_required) {
    const tax = await adminPost(`/admin/10years/actions/winner`, { winner_id: tueWinner.id, kind: "tax_form_received", on: "1" });
    expect("admin: tax form received toggled on Tuesday's >$600 prize", tax.status === 303 && !/error/.test(tax.location), tax.location);
    expect("the winner row records tax_form_received_at", (await dump("giveaway_winners")).find((w) => w.id === tueWinner.id).tax_form_received_at !== null);
  }
  await clock(C.drawing("tue").dailyEmailAt);
  run = await tick("Tuesday 4 pm");
  expect("Tuesday daily skips the unsubscribed entrant", run.sends.sent === verifiedNow - 1, `${run.sends.sent}`);
  newEmails();

  section("A skipped cron minute: Wed and Thu caught up in one tick");
  await clock(new Date(C.drawing("thu").at.getTime() + 3 * 60_000));
  run = await tick("Thursday 12:03");
  expect("Wednesday and Thursday drawn in one tick, in order", run.drawings.drawn.map((d) => d.slot).join(",") === "wed,thu", JSON.stringify(run.drawings.drawn));
  expect("Wednesday's daily email (4 pm) also caught up, once", run.sends.jobs >= 1 && run.sends.sent === verifiedNow - 1, JSON.stringify(run.sends));
  newEmails();
  await clock(C.drawing("thu").dailyEmailAt);
  await tick("Thursday 4 pm");
  newEmails();

  section("Fri noon: the fifth drawing, then an unreachable winner and a redraw");
  await clock(C.drawing("fri").at);
  run = await tick("Friday noon");
  expect("Friday drawn", run.drawings.drawn.length === 1 && run.drawings.drawn[0].slot === "fri");
  fresh = newEmails();
  const winFri = fresh.find((e) => /You won Friday/.test(e.body.subject));
  expect("Friday's claim deadline moved to Tuesday 5 pm (would land Monday)", winFri && /Tue Nov 24, 5:00 PM CT/.test(winFri.body.text));
  await clock(C.drawing("fri").dailyEmailAt);
  run = await tick("Friday 4 pm");
  fresh = newEmails();
  expect("Friday's daily email names Saturday's grand prize", fresh.length > 0 && fresh.every((e) => /Saturday/.test(e.body.subject)));
  // ADMIN_ACTIONS_REDRAW — Thursday's winner unreachable → redraw.
  const thuDrawing = (await dump("giveaway_drawings")).find((d) => d.slot === "thu");
  const thuWinnerBefore = (await dump("giveaway_winners")).find((w) => w.drawing_id === thuDrawing.id && w.status !== "redrawn");
  await clock(ct(2026, 11, 20, 15));
  await adminRedraw(thuDrawing, thuWinnerBefore);
  const thuAfter = (await dump("giveaway_winners")).filter((w) => w.drawing_id === thuDrawing.id);
  expect("Thursday: the first winner is marked redrawn with the reason, a new winner exists", thuAfter.length === 2 && thuAfter.some((w) => w.status === "redrawn" && /unreachable/.test(w.redraw_reason ?? "")) && thuAfter.some((w) => w.status === "drawn"), JSON.stringify(thuAfter.map((w) => w.status)));
  expect("Thursday's redraw picked someone else", thuAfter.find((w) => w.status === "drawn").person_id !== thuWinnerBefore.person_id);
  fresh = newEmails();
  expect("the redraw sent a new alert and a new winner email", fresh.some((e) => /10 years — Thursday winner/.test(e.body.subject)) && fresh.some((e) => /You won Thursday/.test(e.body.subject)));
  expect("the redrawn winner's deadline is Tuesday 5 pm (Fri 3 pm + 72 h = Mon)", /Tue Nov 24, 5:00 PM CT/.test(fresh.find((e) => /You won Thursday/.test(e.body.subject))?.body.text ?? ""));

  section("Sat 5 pm: the grand prize");
  await clock(C.drawing("grand").at);
  run = await tick("Saturday 5 pm");
  expect("the grand prize drawn once", run.drawings.drawn.length === 1 && run.drawings.drawn[0].slot === "grand");
  const drawings = await dump("giveaway_drawings");
  const grand = drawings.find((d) => d.slot === "grand");
  const allEntries = (await dump("giveaway_entries")).filter((e) => !e.void_reason);
  expect(`the grand pool is every valid entry of the week (${allEntries.length}), daily winners included`, grand.pool_size === allEntries.length, `${grand.pool_size}`);
  fresh = newEmails();
  expect("Saturday: alert to the OWNER route", fresh.some((e) => /GRAND PRIZE/.test(e.body.subject) && to(e) === "ben@example.test"));
  const closedPage = await get("/10years");
  expect("closed mode: no form, winners list present", !closedPage.text.includes('action="/10years/signup"') && /data-winners/.test(closedPage.text));
  const late = await postForm("/10years/signup", signupFields(person("L", "late@example.test")), person("L1", ""));
  expect("a signup after close is refused", /error=closed/.test(late.location), late.location);
  expect("a one-tap after close is refused", /data-ok="0"/.test((await get(new URL(enterLinks[Cc.email]).pathname, Cc)).text));

  section("Sun Nov 22: thank-you + offer");
  await clock(C.SCHEDULE.thankYouSend.at);
  run = await tick("Sunday thank-you");
  fresh = newEmails();
  const holders = new Set((await dump("giveaway_winners")).filter((w) => ["drawn", "contacted", "claimed"].includes(w.status)).map((w) => w.person_id));
  const people = await dump("giveaway_people");
  const expectThanks = people.filter((p) => p.verified_at && !p.unsubscribed_at && !holders.has(p.id)).length;
  expect(`thank-you to every non-winner who is subscribed (${expectThanks})`, run.sends.sent === expectThanks && fresh.length === expectThanks && fresh.every((e) => /Thank you/.test(e.body.subject) && /10Y-/.test(e.body.text)), `${run.sends.sent}/${fresh.length}`);
  expect("no winner got the thank-you", !fresh.some((e) => holders.has(people.find((p) => p.email === to(e))?.id)));

  section("Dec 1: an offer code booked through /contact");
  await clock(ct(2026, 12, 1, 10));
  const booking = (code, center = "Not sure yet") =>
    fetch(`${BASE}/api/consultation`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": "203.0.113.200" }, body: JSON.stringify({ source: "giveaway", offer_code: code, first_name: "TEST Dan Tester", phone: "0000000000", email: D.email, preferred_center: center, best_time: "Any time", source_page: "10years", sms_consent: false }) });
  let b = await booking(dCode);
  let bj = await b.json().catch(() => null);
  // Without a database (the default: SUPABASE_URL is emptied so nothing can
  // touch the real one) the route cannot save the row and answers 502 after
  // sending the rescue email and stamping the offer — which is exactly what
  // the next assertions check. With --db the row saves and it answers 200.
  expect(USE_DB ? "a valid code books (the lead is accepted)" : "a valid code is accepted (502 = no database to save the row; the rescue email and the redemption follow)", USE_DB ? b.ok : b.status === 502, `${b.status} ${JSON.stringify(bj)}`);
  fresh = newEmails();
  const staffLead = fresh.find((e) => /free call request \(10 years\)/.test(e.body.subject));
  expect("the staff lead email's subject says (10 years) and the center came from the ZIP (Nashville)", staffLead && /Nashville/.test(staffLead.body.subject), staffLead?.body.subject ?? fresh.map((e) => e.body.subject).join(" | "));
  expect("the offer is marked redeemed", (await dump("giveaway_offers")).find((o) => o.code === dCode)?.redeemed_at !== null);
  b = await booking(dCode);
  bj = await b.json().catch(() => null);
  expect("the same code a second time is refused as already used", b.status === 400 && /already been used/.test(bj?.error ?? ""), `${b.status} ${JSON.stringify(bj)}`);
  b = await booking("10Y-NOPE00");
  expect("an unknown code is refused", b.status === 400);
  newEmails();
  const otherCode = (await dump("giveaway_offers")).find((o) => o.code !== dCode).code;
  await clock(ct(2026, 12, 6, 9));
  b = await booking(otherCode);
  bj = await b.json().catch(() => null);
  expect("after Dec 5 a code is refused as expired", b.status === 400 && /expired/.test(bj?.error ?? ""), `${b.status} ${JSON.stringify(bj)}`);
  expect("after Dec 5 the page is the thank-you page", /Ten years\. Thank you|Talk with our team/.test((await get("/10years")).text));

  /* ── the audit ──────────────────────────────────────────────────────── */
  section("The audit");
  const finalDrawings = await dump("giveaway_drawings");
  const finalWinners = await dump("giveaway_winners");
  expect("six drawings, all drawn or redrawn", finalDrawings.length === 6 && finalDrawings.every((d) => d.status === "drawn" || d.status === "redrawn"), JSON.stringify(finalDrawings.map((d) => d.status)));
  expect("each drawing has exactly one current winner; seven winner rows in all", finalDrawings.every((d) => finalWinners.filter((w) => w.drawing_id === d.id && w.status !== "redrawn").length === 1) && finalWinners.length === 7, `${finalWinners.length}`);
  await adminReverifyAll(finalDrawings);
  expect("the Dialpad mock log is EMPTY — no giveaway path sent a text", texts().length === 0, `${texts().length} text(s)`);
  const all = emails();
  const kinds = {
    verify: all.filter((e) => /Confirm your (email|entry)/.test(e.body.subject)).length,
    itsLive: all.filter((e) => /^\[DRAFT\] It's live/.test(e.body.subject)).length,
    reminder: all.filter((e) => /Today at noon/.test(e.body.subject)).length,
    youreIn: all.filter((e) => /You're in\./.test(e.body.subject)).length,
    daily: all.filter((e) => /^\[DRAFT\] \w+'s (grand )?prize: |That was the last drawing/.test(e.body.subject)).length,
    winner: all.filter((e) => /You won/.test(e.body.subject)).length,
    thanks: all.filter((e) => /Thank you — and your first visit/.test(e.body.subject)).length,
    alerts: all.filter((e) => /^\[DRAFT\] 10 years — /.test(e.body.subject)).length,
    leads: all.filter((e) => /free call request \(10 years\)/.test(e.body.subject)).length,
  };
  const accounted = Object.values(kinds).reduce((a, b) => a + b, 0);
  console.log(`  emails: ${JSON.stringify(kinds)} = ${accounted} of ${all.length}`);
  expect("every email in the mock is one of the expected kinds", accounted === all.length, `${all.length - accounted} unexplained`);
  expect("7 winner emails (six drawings + one redraw), 7 staff alerts", kinds.winner === 7 && kinds.alerts === 7, `${kinds.winner}/${kinds.alerts}`);
  expect("every email went to an example.test address", all.every((e) => /@example\.test$/.test(to(e)) && (e.body.cc ?? []).every((c) => /@example\.test$/.test(c))));

  if (!SKIP_BROWSER) await browserChecks();
} catch (err) {
  failures.push(`crashed: ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
} finally {
  try {
    await clock(null);
  } catch {}
  if (server) {
    server.kill("SIGTERM");
    await sleep(500);
  }
}

console.log(`\n${passes} passed, ${failures.length} failed.`);
if (failures.length) {
  for (const f of failures) console.log(`  ✗ ${f}`);
  if (logPath) console.log(`\nserver log: ${logPath}\nmock inbox: ${RESEND_LOG}`);
  process.exit(1);
}
rmSync(work, { recursive: true, force: true });
console.log("✓ check:giveaway: the whole week ran end to end; no real email, no text, no production row.");

/* ── admin actions (the screens' route names) ──────────────────────────── */

async function adminActionsAfterMonday(monWinner) {
  // Mark Monday's winner contacted (Ben called); toggle public OK.
  const contacted = await adminPost(`/admin/10years/actions/winner`, { winner_id: monWinner.id, kind: "status", status: "contacted" });
  expect("admin: mark Monday's winner contacted", contacted.status === 303 && !/error/.test(contacted.location), contacted.location);
  const ok = await adminPost(`/admin/10years/actions/winner`, { winner_id: monWinner.id, kind: "public_ok", on: "1" });
  expect("admin: public OK toggled", ok.status === 303 && !/error/.test(ok.location), ok.location);
  const w = (await dump("giveaway_winners")).find((x) => x.id === monWinner.id);
  const label = w.public_label ?? "";
  expect("the winner row carries the public label 'First L., City'", w.public_ok && /^[A-Z][^,]*[A-Z]\., /.test(label), String(w.public_label));
  expect("the winners list names Monday's winner", Boolean(label) && new RegExp(`Monday: ${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test((await peekClosed()).text));
  if (w.tax_form_required) {
    const tax = await adminPost(`/admin/10years/actions/winner`, { winner_id: monWinner.id, kind: "tax_form_received", on: "1" });
    expect("admin: tax form received toggled", tax.status === 303 && !/error/.test(tax.location));
  }
  const page = await adminGet("/admin/10years/winners");
  expect("admin: winners screen lists the winner", page.status === 200 && Boolean(label) && page.text.includes(label));
}

async function adminRedraw(drawing, winner) {
  const attempt = await adminPost(`/admin/10years/actions/winner`, { winner_id: winner.id, kind: "call_attempt", outcome: "voicemail, day 1" });
  expect("admin: a call attempt is logged", attempt.status === 303 && !/error/.test(attempt.location), attempt.location);
  const un = await adminPost(`/admin/10years/actions/winner`, { winner_id: winner.id, kind: "status", status: "unreachable" });
  expect("admin: Thursday's winner marked unreachable", un.status === 303 && !/error/.test(un.location), un.location);
  const re = await adminPost(`/admin/10years/actions/redraw`, { drawing_id: drawing.id, reason: "unreachable after the deadline" });
  expect("admin: redraw with a reason accepted", re.status === 303 && !/error/.test(re.location), re.location);
  const audit = await dump("giveaway_audit");
  expect("the redraw is audited with the admin's email", audit.some((a) => a.action === "redrawn" && a.actor === ADMIN_EMAIL));
}

async function adminReverifyAll(drawings) {
  for (const d of drawings) {
    const r = await adminPost(`/admin/10years/actions/reverify`, { drawing_id: d.id });
    const path = r.location.replace(/^https?:\/\/[^/]+/, "").replace(/#.*$/, "");
    const page = await adminGet(path);
    // React puts <!-- --> between interpolations; strip them before matching.
    const plain = page.text.replace(/<!--\s*-->/g, "");
    const results = (plain.match(/winner [0-9a-f…]+: (ok|FAIL)/g) ?? []);
    expect(`admin: re-verify ${d.slot} reports every pick intact`, page.status === 200 && /reverify=/.test(path) && results.length >= 1 && !results.some((x) => /FAIL/.test(x)), `${page.status} ${path} ${results.join("; ")}`);
  }
  const csv = await adminGet("/admin/10years/actions/export/winners");
  expect("admin: winners CSV export downloads and is audited", csv.status === 200 && /text\/csv/.test(csv.headers.get("content-type") ?? "") && (await dump("giveaway_audit")).some((a) => a.action === "export_csv"), String(csv.status));
}

/* ── the page in a browser ─────────────────────────────────────────────── */

async function browserChecks() {
  section("The page in a browser (390 and 1440)");
  const { launch } = await import(`${ROOT}/scripts/layout/cdp.mjs`);
  const chrome = await launch({ port: 9357 });
  try {
    const page = await chrome.newPage();
    await page.init();
    for (const [mode, at] of [["notify-me", ct(2026, 11, 10, 10)], ["live", ct(2026, 11, 17, 9)]]) {
      await clock(at);
      for (const width of [390, 1440]) {
        await page.setViewport(width, width === 1440 ? 900 : 844);
        await page.goto(`${BASE}/10years`, { settle: 300 });
        const overflow = await page.eval("document.documentElement.scrollWidth > innerWidth");
        const form = await page.eval("Boolean(document.querySelector('form[action=\"/10years/signup\"]'))");
        const h1 = await page.eval("document.querySelector('h1')?.textContent ?? ''");
        expect(`${mode} at ${width}: form present, no sideways scroll`, form && !overflow, `overflow=${overflow} h1=${h1.slice(0, 60)}`);
        if (width === 1440) {
          // Ben, 2026-10-19: the whole page fits one 1440×900 screen.
          const tall = await page.eval("document.documentElement.scrollHeight");
          expect(`${mode} at 1440×900: the whole page fits one screen (${tall}px)`, tall <= 900, `${tall}px`);
        }
      }
    }
  } finally {
    await chrome.close();
    await clock(null);
  }
}
