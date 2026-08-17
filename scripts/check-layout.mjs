/**
 * Layout audit — clipped text, overlap, and overflow, on every route at every
 * phone and tablet width.
 *
 *   npm run dev
 *   CHECK_BASE=http://localhost:3000 npm run check:layout
 *   CHECK_BASE=http://localhost:3000 npm run check:layout -- --widths 390
 *   CHECK_BASE=http://localhost:3000 npm run check:layout -- --routes /locations
 *
 * Needs Google Chrome installed; it drives a headless instance over the
 * DevTools protocol (scripts/layout/cdp.mjs) with no npm dependency.
 *
 * ## Scoping a run
 *
 * A full sweep is the expensive check in this repo by an order of magnitude —
 * minutes, against seconds for every other one — and most changes touch two or
 * three routes. `--routes` takes path prefixes and tests only what matches, so
 * a location-page change sweeps four routes instead of twenty-six. `--widths`
 * narrows the other axis.
 *
 * A prefix matches the route itself and everything under it: `--routes
 * /locations` covers `/locations` and all three `/locations/[slug]` pages.
 * Several are comma-separated. A filter that matches **nothing** is a failure,
 * not an empty pass — a mistyped prefix must never report as a clean run,
 * which is the same mistake in a different costume as the scrollWidth audit
 * this file replaced.
 *
 * Scope the run to what changed; sweep everything before shipping.
 *
 * ## Why this exists, and what it replaces
 *
 * Phase 9's overflow audit asked `document.documentElement.scrollWidth` and
 * reported every page clean. That number answers one question — *can the page
 * be scrolled sideways* — and a clipped element answers it "no", because
 * `overflow: hidden` is exactly the thing that stops content from widening the
 * document. Text was being cut off while the audit said the site was fine.
 *
 * Two things had to change. Measure the **text**, via Range rects, rather than
 * the element containing it: an element whose own overflow is visible keeps
 * `scrollWidth === clientWidth` however far its text hangs out, and its box
 * stays whatever width its parent gave it, so an element-box audit misses the
 * same case for the same reason. And measure it against **the box that is
 * actually allowed to contain it** — the nearest clipping ancestor's padding
 * box — rather than against the document.
 *
 * The four detectors are exercised against injected faults before they are
 * trusted; the fault cases are in the phase 14 report. `documentElement
 * .scrollWidth` stays at the viewport width for all four.
 *
 * ## What it deliberately does not report
 *
 * - Anything inside an element that scrolls horizontally on purpose. The
 *   concern rail is one: at ≤760px `.concern-grid` is an overflow-x: auto,
 *   scroll-snapping row, and its later cards are meant to be off-screen.
 * - A closed `<details>`. Chrome lays its answer out with
 *   content-visibility: hidden, so every collapsed FAQ answer reports a rect
 *   sitting on top of the question below it.
 * - Inline elements' bounding boxes. A link that wraps across three lines has
 *   a box as wide as the paragraph and as tall as all three, which "overlaps"
 *   every other link in it while nothing is on top of anything — overlap is
 *   compared line box against line box.
 * - `-webkit-line-clamp` truncation, which is a deliberate one.
 *
 * Routes come from the running server's own sitemap, so the list cannot go
 * stale — note that draft-gated pages are in it under `npm run dev` and not in
 * a production build, which is the difference between 35 routes and 26.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { launch } from "./layout/cdp.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const BASE = (process.env.CHECK_BASE ?? "http://localhost:3000").replace(/\/$/, "");

const argValue = (name) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : undefined;
};

const WIDTHS = (argValue("--widths") ?? "320,390,414,834").split(",").map(Number);
const verbose = process.argv.includes("--verbose");

/** Path prefixes, normalized the way sitemap routes are: leading slash, no
 *  trailing one, so `--routes locations/` and `--routes /locations` agree. */
const ROUTE_FILTERS = (argValue("--routes") ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .map((p) => (p.startsWith("/") ? p : `/${p}`))
  .map((p) => (p.length > 1 ? p.replace(/\/+$/, "") : p));

/** A prefix covers the route itself and everything beneath it — `/locations`
 *  selects `/locations` and `/locations/nashville`, but not `/locations-map`. */
const selected = (route) =>
  ROUTE_FILTERS.length === 0 ||
  ROUTE_FILTERS.some((f) => route === f || route.startsWith(`${f}/`));

const probe = readFileSync(new URL("./layout/probe.js", import.meta.url), "utf8");

/**
 * Refuse to run while a dev server and a production server are both up on this
 * project.
 *
 * They share one `.next`. `next dev` rewrites it continuously, so a production
 * server started from a build is serving a directory that is being replaced
 * underneath it — and the failure is not a crash. Both servers keep answering,
 * the sweep completes, and the result describes neither the build that was
 * verified nor the source on disk. That cost a full production pass in the
 * location-pages phase: a verified build was overwritten by a dev server on
 * another port, and nothing anywhere said so.
 *
 * Only servers whose working directory is *this* project count, so two
 * unrelated apps are none of this check's business. If the mode or the cwd
 * can't be resolved the run continues — a check that can't see clearly should
 * not be the thing that blocks work. `--allow-concurrent-servers` overrides.
 */
function serversHere() {
  let out;
  try {
    out = execFileSync("ps", ["-Ao", "pid=,command="], { encoding: "utf8" });
  } catch {
    return []; // no ps, no opinion
  }
  const found = [];
  for (const line of out.split("\n")) {
    const m = line.match(/^\s*(\d+)\s+(.*)$/);
    if (!m) continue;
    const [, pid, command] = m;
    if (Number(pid) === process.pid) continue;
    // Shell wrappers carry whatever they were asked to run in their own
    // command line, including this script's name and the very strings matched
    // below. They are not servers.
    if (/^\/bin\/(z|ba)?sh\b/.test(command)) continue;
    if (command.includes("check-layout")) continue;
    const mode = /\bnext\s+dev\b/.test(command)
      ? "dev"
      : /\bnext\s+start\b/.test(command)
        ? "start"
        : null;
    if (mode && cwdOf(pid) === ROOT) found.push({ pid, mode });
  }
  return found;
}

function cwdOf(pid) {
  try {
    const out = execFileSync("lsof", ["-a", "-p", String(pid), "-d", "cwd", "-Fn"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const line = out.split("\n").find((l) => l.startsWith("n"));
    return line ? line.slice(1) : null;
  } catch {
    return null;
  }
}

if (!process.argv.includes("--allow-concurrent-servers")) {
  const servers = serversHere();
  const dev = servers.filter((s) => s.mode === "dev");
  const start = servers.filter((s) => s.mode === "start");
  if (dev.length > 0 && start.length > 0) {
    console.error(
      `\n  a dev server and a production server are both running against this project's .next\n` +
        `\n    next dev    pid ${dev.map((s) => s.pid).join(", ")}` +
        `\n    next start  pid ${start.map((s) => s.pid).join(", ")}\n` +
        `\n  next dev rewrites .next continuously, so the production server is serving` +
        `\n  a build that is being replaced underneath it. Neither one crashes and the` +
        `\n  sweep still completes — it just stops describing anything real.\n` +
        `\n  Stop one of them, rebuild if it was the production one, and re-run.` +
        `\n  --allow-concurrent-servers if you know they're unrelated.\n`
    );
    process.exit(1);
  }
}

async function routes() {
  const res = await fetch(`${BASE}/sitemap.xml`);
  if (!res.ok) throw new Error(`${BASE}/sitemap.xml → ${res.status}`);
  const xml = await res.text();
  const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => new URL(m[1]).pathname)
    .map((p) => (p.length > 1 ? p.replace(/\/$/, "") : p));
  return [...new Set(paths)].sort();
}

const all = await routes();
const list = all.filter(selected);

// An empty selection exits non-zero. Falling through would audit nothing and
// print "no clipped text, no overlap" — a mistyped prefix reading as a pass.
if (list.length === 0) {
  console.error(
    `\n  --routes ${ROUTE_FILTERS.join(", ")} matched none of the ${all.length} routes in the sitemap.\n\n` +
      all.map((r) => `    ${r}`).join("\n") +
      "\n"
  );
  process.exit(1);
}

console.log(
  ROUTE_FILTERS.length > 0
    ? `${list.length} of ${all.length} route(s) matching ${ROUTE_FILTERS.join(", ")} × ${WIDTHS.join(", ")}px\n`
    : `${list.length} route(s) from ${BASE}/sitemap.xml × ${WIDTHS.join(", ")}px\n`
);

// Every way launch() fails is a condition the person running this can fix —
// a stale browser on the port, or Chrome not installed where cdp.mjs looks.
// Printed as the sentence it is, rather than as a stack trace through a
// protocol driver that has nothing to do with the problem.
let chrome;
try {
  chrome = await launch();
} catch (error) {
  console.error(`\n  ${error.message}`);
  process.exit(1);
}
let page = await chrome.newPage();
await page.init();

const findings = [];
let audited = 0;
for (const width of WIDTHS) {
  await page.setViewport(width, 900);
  for (const route of list) {
    // A 404 renders a short, tidy page and audits perfectly clean. Without
    // this, a sweep reports "every route fine" for routes that aren't there.
    const status = (await fetch(BASE + route, { redirect: "manual" })).status;
    if (status !== 200) {
      console.log(`  ${String(width).padStart(4)}  ${route.padEnd(46)} HTTP ${status} — NOT AUDITED`);
      findings.push({ route, width, kind: "not-audited", detail: `HTTP ${status}` });
      continue;
    }
    // One route must not be able to end the run. A page laid out in a window
    // as tall as itself can take the renderer down, and a crash on route 30
    // used to lose the twenty-nine clean results before it.
    try {
    await page.setViewport(width, 900);
    await page.goto(BASE + route, { settle: 500 });

    // Two things have to be settled before anything is measured.
    //
    // The images: making the window as tall as the document pulls every
    // lazily-loaded image into it at once, and they arrive over the next
    // second or so, each reflowing what is below it. Measuring before they
    // land reads rects off one layout and paint off another.
    //
    // The height: the probe's obscured-text check uses elementFromPoint,
    // which only answers for the visible viewport, and scrolling is ignored
    // under a device-metrics override. A window as tall as the document puts
    // the whole page in view at once. Asserted below rather than assumed —
    // if any box moves between the two window heights, the run says so.
    const waitImages = () =>
      page.eval(
        `new Promise((resolve) => {
           const done = () => [...document.images].every((i) => i.complete);
           if (done()) return resolve(1);
           const t = setInterval(() => { if (done()) { clearInterval(t); resolve(1); } }, 100);
           setTimeout(() => { clearInterval(t); resolve(0); }, 15000);
         })`,
        { awaitPromise: true }
      );
    // Fixed elements are excluded on purpose: the sticky CTA bar and the
    // assistant launcher are anchored to the window, so of course they move
    // when the window changes height. Everything else must not.
    const geometry = () =>
      page.eval(
        `JSON.stringify([...document.body.querySelectorAll('*')]
           .filter(e => { for (let n = e; n; n = n.parentElement) if (getComputedStyle(n).position === 'fixed') return false; return true; })
           .map(e => { const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top + scrollY), Math.round(r.width), Math.round(r.height)]; }))`
      );

    await waitImages();
    const before = JSON.parse(await geometry());
    const docHeight = await page.eval("document.documentElement.scrollHeight");
    await page.setViewport(width, Math.min(docHeight, 30000));
    await page.eval("window.scrollTo(0,0), 1");
    await waitImages();
    const after = JSON.parse(await geometry());
    // A box that exists in one state and not the other is not a layout shift:
    // `content-visibility` skips laying out what is off-screen, so every
    // collapsed FAQ answer is 0×0 in a short window and a real box in a tall
    // one. Only boxes that exist in both states and disagree count.
    const moved = before.filter((b, i) => {
      const a = after[i];
      if (!a) return false;
      if ((b[2] === 0 && b[3] === 0) || (a[2] === 0 && a[3] === 0)) return false;
      return b.join() !== a.join();
    });
    if (before.length !== after.length || moved.length > 0) {
      console.log(
        `  ${String(width).padStart(4)}  ${route.padEnd(46)} ${moved.length} box(es) move with viewport height — obscured-text results are not trustworthy here`
      );
    }

    const out = JSON.parse(await page.eval(probe));
    audited += 1;
    for (const f of out.findings) findings.push({ route, width, ...f });
    if (verbose || out.findings.length) {
      console.log(
        `  ${String(width).padStart(4)}  ${route.padEnd(46)} ${
          out.findings.length ? `${out.findings.length} finding(s)` : "clean"
        }`
      );
    }
    } catch (error) {
      console.log(
        `  ${String(width).padStart(4)}  ${route.padEnd(46)} ERROR — NOT AUDITED: ${error.message.split("\n")[0].slice(0, 90)}`
      );
      findings.push({ route, width, kind: "not-audited", detail: error.message.split("\n")[0] });
      // The renderer may be gone; a fresh target costs a second and is the
      // difference between finishing the sweep and reporting a stub.
      try {
        await page.close();
      } catch { /* already gone */ }
      page = await chrome.newPage();
      await page.init();
    }
  }
}
await chrome.close();

const real = findings.filter((f) => f.kind !== "not-audited");
const missing = findings.filter((f) => f.kind === "not-audited");

console.log(`\n  ${audited} page/width combination(s) audited`);
if (missing.length) {
  console.log(`  ${missing.length} skipped — see the HTTP lines above`);
}

if (real.length === 0) {
  console.log("\n  no clipped text, no overlap, nothing past the viewport.\n");
  process.exit(0);
}

console.log(`\n  ${real.length} finding(s):\n`);
for (const f of real) {
  console.log(`  ${f.kind}  —  ${f.route} @ ${f.width}px`);
  console.log(`    ${f.selector}`);
  console.log(`    ${f.detail}`);
  if (f.text) console.log(`    "${f.text}"`);
  console.log("");
}
process.exit(1);
