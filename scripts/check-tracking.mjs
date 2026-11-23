/**
 * check:tracking — the homepage's tap events, held to a fixture of today's
 * values (Ben, 2026-11-23).
 *
 *   NEXT_PUBLIC_GA_ID=G-CHECK00000 npm run build && npx next start -p 3123
 *   CHECK_BASE=http://127.0.0.1:3123 npm run check:tracking
 *   CHECK_BASE=http://127.0.0.1:3123 npm run check:tracking -- --update
 *
 * ## Why it needs the real hostname, and how it gets one without the site
 *
 * The GA4 tag and every event are gated twice (lib/analytics.ts): the build
 * must carry NEXT_PUBLIC_GA_ID, and the browser must be on
 * harmonizedbraincenterstn.com. A local server passes neither by default,
 * so nothing a visitor's tap reports could be tested before a deploy.
 *
 * This loads `https://harmonizedbraincenterstn.com/` in a headless Chrome
 * whose every request is paused (CDP `Fetch`) before it leaves the machine:
 *
 *   - a request to the site's own host is answered from CHECK_BASE — the
 *     local build — so the page believes it is on the real hostname;
 *   - `/api/track/*` is aborted (the tap log writes to the database);
 *   - any request that is not a GET or HEAD is aborted and FAILS the check
 *     (nothing here may submit a form);
 *   - every other host is aborted, the GA hosts among them. Production is
 *     never contacted and no hit is ever sent.
 *
 * The build must carry a TEST measurement id: the check refuses to run
 * against one built without an id, or built with the production id.
 *
 * ## What it does
 *
 * At 360, 390 and 1280px wide, with `window.dataLayer` stubbed before any
 * script runs and navigation blocked (a capture-phase listener on `window`
 * cancels the default of every link click, which also stops next/link; a
 * main-frame navigation that got through would be aborted in `Fetch`), it
 * clicks every one of these on `/`, hidden or not:
 *
 *   - `tel:`, `sms:` and `mailto:` links      → contact_link_click
 *   - the concern cards and the "More we help with" links
 *                                             → concern_chip_click
 *   - links to `#brain-map`                   → brain_map_jump
 *
 * and compares, link by link in document order, what was pushed to the
 * dataLayer with scripts/tracking-fixture.json (one list per width — the
 * phone action bar's two links exist only on a phone): the event name and its
 * parameters (`link_type`, `location`, `chip_label`, `page_path`), exactly
 * one event per click, each sent to the build's own id. It also expects one
 * `page_view` for `/` per load.
 *
 * Then every internal href on `/` is requested from CHECK_BASE and must
 * answer 200 — not a redirect, not a 404.
 *
 * `--update` rewrites the fixture from what the page does now. Do that only
 * for a change that was meant: the fixture is the record of what GA4 has
 * been receiving, and the reports run on those names and values.
 *
 * Exit 1 with the differences listed; 2 when the build cannot be checked.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { launch } from "./layout/cdp.mjs";

const BASE = (process.env.CHECK_BASE ?? "http://127.0.0.1:3123").replace(/\/$/, "");
const SITE = "https://harmonizedbraincenterstn.com";
const SITE_HOSTS = new Set(["harmonizedbraincenterstn.com", "www.harmonizedbraincenterstn.com"]);
/** The live property (public: it is in the production page source). Never the id under test. */
const PRODUCTION_GA_ID = "G-2KMRF93J9D";
const GA_HOST = /(^|\.)(googletagmanager\.com|google-analytics\.com|analytics\.google\.com|doubleclick\.net)$/;
const VIEWPORTS = [
  [360, 740],
  [390, 844],
  [1280, 800],
];
const UPDATE = process.argv.includes("--update");
const FIXTURE = join(dirname(fileURLToPath(import.meta.url)), "tracking-fixture.json");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const failures = [];
const expect = (label, ok, detail = "") => {
  console.log(`  ${ok ? "✓" : "✗"} ${label}${ok || !detail ? "" : ` — ${detail}`}`);
  if (!ok) failures.push(label);
};

// The local build must be up before anything else is worth doing.
try {
  const res = await fetch(`${BASE}/`, { redirect: "manual" });
  if (res.status !== 200) throw new Error(`GET / answered ${res.status}`);
} catch (error) {
  console.error(`check:tracking — nothing usable at ${BASE} (${error.message}). Build and start the site first.`);
  process.exit(2);
}

const chrome = await launch({ port: 9531 });
const page = await chrome.newPage();
await page.init();

// ---- every request is paused here; none leaves the machine --------------
const seen = { ga: [], track: [], external: [], unsafe: [], blockedNav: [] };
let blockNavigation = false;
const HOP_BY_HOP = new Set(["content-encoding", "content-length", "transfer-encoding", "connection", "keep-alive"]);

async function onPaused({ requestId, request, resourceType }) {
  const fail = (errorReason) => page.send("Fetch.failRequest", { requestId, errorReason }).catch(() => {});
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return fail("Aborted");
  }
  if (url.protocol === "data:" || url.protocol === "blob:" || url.protocol === "about:") {
    return page.send("Fetch.continueRequest", { requestId }).catch(() => {});
  }
  if (!SITE_HOSTS.has(url.hostname)) {
    (GA_HOST.test(url.hostname) ? seen.ga : seen.external).push(`${url.hostname}${url.pathname}${url.search}`);
    return fail("BlockedByClient");
  }
  if (url.pathname.startsWith("/api/track/")) {
    seen.track.push(`${request.method} ${url.pathname}`);
    return fail("BlockedByClient");
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    seen.unsafe.push(`${request.method} ${url.pathname}`);
    return fail("BlockedByClient");
  }
  if (blockNavigation && resourceType === "Document") {
    seen.blockedNav.push(url.pathname);
    return fail("Aborted");
  }
  try {
    const headers = {};
    for (const [k, v] of Object.entries(request.headers)) {
      const key = k.toLowerCase();
      if (key === "host" || key === "origin" || key === "referer" || key.startsWith("sec-") || key === "upgrade-insecure-requests") continue;
      headers[k] = v;
    }
    const res = await fetch(`${BASE}${url.pathname}${url.search}`, { method: request.method, headers, redirect: "manual" });
    const responseHeaders = [];
    res.headers.forEach((value, name) => {
      if (HOP_BY_HOP.has(name.toLowerCase())) return;
      responseHeaders.push({ name, value: name.toLowerCase() === "location" ? value.replace(BASE, SITE) : value });
    });
    const body = request.method === "HEAD" ? Buffer.alloc(0) : Buffer.from(await res.arrayBuffer());
    await page.send("Fetch.fulfillRequest", { requestId, responseCode: res.status, responseHeaders, body: body.toString("base64") });
  } catch {
    await fail("Failed");
  }
}
chrome.browser.onEvent((msg) => {
  if (msg.sessionId === page.sessionId && msg.method === "Fetch.requestPaused") void onPaused(msg.params);
});
await page.send("Fetch.enable", { patterns: [{ urlPattern: "*", requestStage: "Request" }] });

// Before any script of the page's own: the dataLayer the tag will push to,
// and the listener that keeps every link click on this page.
await page.send("Page.addScriptToEvaluateOnNewDocument", {
  source: `window.dataLayer = window.dataLayer || [];
window.addEventListener("click", function (e) {
  var a = e.target && e.target.closest ? e.target.closest("a") : null;
  if (a) e.preventDefault();
}, true);`,
});

/** dataLayer entries from `from` on, as plain arrays (gtag pushes `arguments`). */
const layer = async (from = 0) =>
  JSON.parse(await page.eval(`JSON.stringify(Array.prototype.slice.call(window.dataLayer, ${from}).map(function (a) { return Array.prototype.slice.call(a); }))`));

const TARGETS = `[...document.querySelectorAll("a[href]")].filter(function (a) {
  var h = a.getAttribute("href") || "";
  return /^(tel:|sms:|mailto:)/i.test(h) || a.matches(".hc-card, .hc-more a") || /#brain-map$/.test(h);
})`;

console.log(`check:tracking — ${SITE}/ served from ${BASE}\n`);

let gaId = null;
const perWidth = {};
const internal = new Set();

for (const [width, height] of VIEWPORTS) {
  console.log(`  ${width}px`);
  blockNavigation = false;
  await page.setViewport(width, height);
  await page.goto(`${SITE}/`, { settle: 1200 });
  blockNavigation = true;

  // The tag is injected in an effect once the hostname has been checked.
  let ready = false;
  for (let i = 0; i < 40 && !ready; i++) {
    ready = await page.eval(`typeof window.gtag === "function" && Array.prototype.some.call(window.dataLayer, function (a) { return a[0] === "config"; })`);
    if (!ready) await sleep(150);
  }
  if (!ready) {
    console.error(
      `\ncheck:tracking — the page at ${BASE} never started the GA4 tag on ${SITE}.\n` +
        `  The build has no measurement id. Rebuild with a TEST id and start it again:\n` +
        `    NEXT_PUBLIC_GA_ID=G-CHECK00000 npm run build && npx next start -p 3123\n`
    );
    await chrome.close();
    process.exit(2);
  }
  const start = await layer();
  const configured = start.filter((a) => a[0] === "config").map((a) => a[1]);
  gaId = configured.find((id) => /^G-/.test(id)) ?? null;
  if (!gaId || gaId === PRODUCTION_GA_ID) {
    console.error(`\ncheck:tracking — the build's measurement id is ${gaId ?? "missing"}; it must be a test id, never the production one.\n`);
    await chrome.close();
    process.exit(2);
  }
  const views = start.filter((a) => a[0] === "event" && a[1] === "page_view");
  expect(`${width}: one page_view for / on load, sent to ${gaId}`, views.length === 1 && views[0][2]?.page_path === "/" && views[0][2]?.send_to === gaId, JSON.stringify(views));

  const targets = JSON.parse(
    await page.eval(`JSON.stringify(${TARGETS}.map(function (a, i) {
      a.setAttribute("data-trk", String(i));
      var h = a.getAttribute("href");
      var loc = a.closest("[data-link-location]");
      return {
        kind: /^tel:/i.test(h) ? "tel" : /^sms:/i.test(h) ? "sms" : /^mailto:/i.test(h) ? "mailto" : /#brain-map$/.test(h) ? "brain_map" : "concern",
        href: h,
        where: loc ? loc.getAttribute("data-link-location") : null,
        label: (a.getAttribute("aria-label") || a.textContent || "").replace(/\\s+/g, " ").trim().slice(0, 80),
      };
    }))`)
  );

  const rows = [];
  for (let i = 0; i < targets.length; i++) {
    const before = (await layer()).length;
    await page.eval(`(function () { document.querySelector('[data-trk="${i}"]').click(); return 1; })()`);
    await sleep(60);
    const events = (await layer(before)).filter((a) => a[0] === "event");
    const sentTo = events.map((a) => a[2]?.send_to);
    rows.push({
      ...targets[i],
      events: events.map((a) => {
        const params = { ...a[2] };
        delete params.send_to;
        return { name: a[1], params };
      }),
      _sentTo: sentTo,
    });
  }
  const stillHome = await page.eval(`location.pathname`);
  expect(`${width}: ${rows.length} links clicked, still on /`, stillHome === "/", stillHome);
  expect(`${width}: exactly one event per click`, rows.every((r) => r.events.length === 1), rows.filter((r) => r.events.length !== 1).map((r) => `${r.kind} "${r.label}" → ${r.events.length}`).join("; "));
  expect(`${width}: every event is sent to ${gaId} only`, rows.every((r) => r._sentTo.every((id) => id === gaId)));
  perWidth[width] = rows.map(({ _sentTo, events, ...rest }) => ({ ...rest, event: events[0] ?? null, ...(events.length > 1 ? { extra: events.slice(1) } : {}) }));

  for (const href of JSON.parse(
    await page.eval(`JSON.stringify([...document.querySelectorAll("a[href]")].map(function (a) { return a.href; }))`)
  )) {
    let u;
    try {
      u = new URL(href);
    } catch {
      continue;
    }
    if (!/^https?:$/.test(u.protocol) || !SITE_HOSTS.has(u.hostname)) continue;
    internal.add(`${u.pathname}${u.search}`);
  }
}
await chrome.close();

// ---- the fixture ----------------------------------------------------------
const widths = VIEWPORTS.map(([w]) => w);
// One list per width: the phone action bar's Call and Text links exist only
// on a phone, so the lists are not the same length.
const current = { page: "/", links: Object.fromEntries(widths.map((w) => [w, perWidth[w]])) };
console.log("");

if (UPDATE) {
  writeFileSync(FIXTURE, `${JSON.stringify(current, null, 2)}\n`);
  console.log(`  fixture rewritten (${widths.map((w) => `${w}px: ${perWidth[w].length} links`).join(", ")}) → scripts/tracking-fixture.json`);
} else if (!existsSync(FIXTURE)) {
  expect("scripts/tracking-fixture.json exists (run once with --update)", false);
} else {
  const fixture = JSON.parse(readFileSync(FIXTURE, "utf8"));
  for (const w of widths) {
    const got = perWidth[w];
    const want = fixture.links?.[w] ?? [];
    const diffs = [];
    for (let i = 0; i < Math.max(got.length, want.length); i++) {
      const g = got[i];
      const x = want[i];
      if (JSON.stringify(g) === JSON.stringify(x)) continue;
      diffs.push(`#${i + 1}: expected ${x ? `${x.kind} "${x.label}" [${x.where ?? "—"}] → ${JSON.stringify(x.event)}` : "nothing"}; got ${g ? `${g.kind} "${g.label}" [${g.where ?? "—"}] → ${JSON.stringify(g.event)}` : "nothing"}`);
    }
    expect(`${w}: ${want.length} links report the fixture's events and parameters`, want.length > 0 && diffs.length === 0, `\n      ${diffs.slice(0, 12).join("\n      ")}${diffs.length > 12 ? `\n      … and ${diffs.length - 12} more` : ""}`);
  }
}

// What the fixture holds, by event — for the eye.
const tally = new Map();
const first = perWidth[widths[0]];
console.log(`\n    at ${widths[0]}px:`);
for (const l of first) {
  const e = l.event;
  const key = e ? `${e.name} ${JSON.stringify(Object.fromEntries(Object.entries(e.params).filter(([k]) => k !== "page_path")))}` : "(no event)";
  tally.set(key, (tally.get(key) ?? 0) + 1);
}
for (const [key, n] of tally) console.log(`    ${String(n).padStart(2)} × ${key}`);

// ---- nothing left the machine, nothing was submitted ------------------------
console.log("");
expect("no request other than GET/HEAD was made to the site (no form submitted)", seen.unsafe.length === 0, seen.unsafe.join(", "));
expect("no main-frame navigation was attempted after a click", seen.blockedNav.length === 0, seen.blockedNav.join(", "));
console.log(`    aborted: ${seen.ga.length} request(s) to GA hosts, ${seen.track.length} to /api/track/*, ${seen.external.length} to other hosts`);

// ---- every internal href on / answers 200, no redirect ----------------------
const paths = [...internal].sort();
const bad = [];
const queue = [...paths];
await Promise.all(
  Array.from({ length: 6 }, async () => {
    for (let p = queue.shift(); p !== undefined; p = queue.shift()) {
      try {
        const res = await fetch(`${BASE}${p}`, { redirect: "manual" });
        if (res.status !== 200) bad.push(`${p} → ${res.status}${res.headers.get("location") ? ` (${res.headers.get("location")})` : ""}`);
        await res.arrayBuffer();
      } catch (error) {
        bad.push(`${p} → ${error.message}`);
      }
    }
  })
);
console.log("");
expect(`${paths.length} internal hrefs on / answer 200 with no redirect`, bad.length === 0, `\n      ${bad.join("\n      ")}`);

console.log(failures.length ? `\n✗ ${failures.length} failure(s)` : `\n✓ tracking on / matches the fixture at ${widths.join(", ")}px`);
process.exit(failures.length ? 1 : 0);
