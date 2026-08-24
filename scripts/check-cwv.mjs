/**
 * Core Web Vitals probe — LCP, CLS, TBT and transfer size per template, on a
 * throttled mobile profile and a desktop one.
 *
 *   npm run build && npx next start -p 3123
 *   CHECK_BASE=http://127.0.0.1:3123 npm run check:cwv
 *   CHECK_BASE=http://127.0.0.1:3123 npm run check:cwv -- --routes /,/faq
 *   CHECK_BASE=http://127.0.0.1:3123 npm run check:cwv -- --runs 1
 *   CHECK_BASE=http://127.0.0.1:3123 npm run check:cwv -- --save baseline.json
 *   CHECK_BASE=http://127.0.0.1:3123 npm run check:cwv -- --baseline baseline.json
 *
 * ## When to run it
 *
 * Before shipping anything that changes the critical path: CSS that hides or
 * reveals content, a new above-the-fold image, a font change, a component that
 * mounts into the first viewport, or a `next.config.ts` image setting. Also
 * after any dependency bump that moves the Next runtime.
 *
 * It must run against a production build served by `next start`. `next dev`
 * ships an unminified bundle and rebuilds on demand; its numbers describe the
 * dev server, not the site.
 *
 * ## Why it exists
 *
 * `SEO-AUDIT-2.md` §2.1 found that `.rv { opacity: 0 }` — a reveal-on-scroll
 * rule — was holding LCP 1.5 seconds past the moment the hero image had
 * finished downloading, on every template, because LCP is measured at paint
 * and an element at zero opacity has not painted. Nothing in the repo could
 * have caught that: `check:layout` forces every reveal open before it measures
 * anything, precisely so it can audit boxes, which makes it blind to when the
 * reveal happens. This probe measures the unassisted page.
 *
 * ## What the numbers mean
 *
 * LCP and CLS are the two Core Web Vitals measurable in a lab. TBT is the lab
 * proxy for INP. Thresholds below are Google's "good" bar for the mobile
 * profile; the desktop pass is reported but not gated, since mobile is the
 * ranking-relevant one and always the slower of the two.
 *
 * These are lab numbers on localhost, where TTFB is ~2ms. Real hosting adds to
 * every LCP figure. Treat them as a regression signal and a relative
 * before/after, not as a prediction of field data.
 *
 * ## Repeatability
 *
 * Every figure is a **median of three runs**, and the scroll pass waits for the
 * page to stop shifting before each step rather than moving on a fixed timer.
 * Both exist for the same reason: a check that reports a different number each
 * time teaches people to ignore it. Before either, three consecutive homepage
 * runs returned CLS 0.0091, 0.0558 and 0.0091 — the ask bar's collapse
 * animation being caught once or twice depending on where a fixed-cadence
 * scroll happened to land mid-transition.
 *
 * Runs that still disagree are **printed, not smoothed**: any route whose LCP
 * spread exceeds 15% (or 150ms), whose CLS spread exceeds 0.02, or whose LCP
 * element was not the same element every time, is listed under the table. A
 * median that quietly hides an unstable page is the same failure in a better
 * disguise.
 *
 * `--runs 1` is the quick form while iterating on one route.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { launch } from "./layout/cdp.mjs";

const BASE = (process.env.CHECK_BASE ?? "http://localhost:3000").replace(/\/$/, "");

const argValue = (name) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : undefined;
};

/**
 * One route per distinct template, which is what a critical-path regression
 * actually varies by. Same nine `SEO-AUDIT-2.md` §2.1 measured, so its table
 * stays a usable baseline: home, concern, location, article, service, hub,
 * form, FAQ, stories.
 */
const DEFAULT_ROUTES = [
  "/",
  "/concerns/sleep",
  "/locations/nashville",
  "/resources/homework-battles",
  "/lens-neurofeedback",
  "/what-we-help-with",
  "/contact",
  "/faq",
  "/stories",
];

const ROUTES = (argValue("--routes") ?? DEFAULT_ROUTES.join(","))
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .map((p) => (p.startsWith("/") ? p : `/${p}`));

/**
 * Profiles match the audit's: a mid-tier phone on a slow connection, and a
 * desktop on a fast one. `cpuThrottle` multiplies against whatever this
 * machine is, so absolute numbers are not comparable between machines — a
 * before/after on one machine is.
 */
const PROFILES = {
  mobile: {
    width: 412,
    height: 823,
    cpuThrottle: 4,
    network: { downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8, latency: 150 },
    // Google's "good" bar. Gated.
    budget: { lcp: 2500, cls: 0.1, tbt: 300 },
  },
  desktop: {
    width: 1440,
    height: 900,
    cpuThrottle: 1,
    network: { downloadThroughput: (10 * 1024 * 1024) / 8, uploadThroughput: (10 * 1024 * 1024) / 8, latency: 20 },
    budget: null, // reported, not gated — mobile is always the slower pass
  },
};

/**
 * How many times each route is measured. The reported figure is the median.
 *
 * Three, not one, because a lab CWV number is a sample of a noisy process —
 * this is the same reason Lighthouse's own guidance is to run five times and
 * take the median. The settle-based scroll pass below removes the large,
 * structural source of variance; runs handle what is left, which is ordinary
 * scheduler jitter on a throttled renderer.
 *
 * `--runs 1` is the quick form for iterating on one route. Anything you would
 * quote to somebody, or save as a baseline, should be a median.
 */
const RUNS = Math.max(1, Number(argValue("--runs") ?? 3));

/** Median of a numeric sample. Even-length samples take the lower middle,
 *  so the value reported is always one that was actually measured. */
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor((xs.length - 1) / 2)];

const only = argValue("--profile");
const profiles = only ? [only] : ["mobile", "desktop"];
for (const name of profiles) {
  if (!PROFILES[name]) {
    console.error(`\n  unknown profile "${name}" — expected mobile or desktop\n`);
    process.exit(1);
  }
}

/**
 * Installed before navigation, so the observers exist before the first byte of
 * HTML is parsed. `buffered: true` alone is not enough for the scroll-driven
 * CLS pass: layout shifts fire as the page settles and a late observer misses
 * the ones that already happened.
 *
 * `longtask` entries give TBT — total time past 50ms in every long task
 * between navigation start and load. That is the lab proxy for INP; measuring
 * INP itself needs real input events, which this probe does not dispatch.
 */
const OBSERVERS = `
(() => {
  window.__cwv = { lcp: 0, lcpEl: "", cls: 0, tbt: 0, n: 0 };
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        window.__cwv.lcp = e.startTime;
        window.__cwv.lcpEl = e.element
          ? e.element.tagName.toLowerCase() +
            (e.element.className && typeof e.element.className === "string"
              ? "." + e.element.className.trim().split(/\\s+/).join(".")
              : "")
          : e.url || "(detached)";
      }
    }).observe({ type: "largest-contentful-paint", buffered: true });
  } catch {}
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        // Shifts within 500ms of a user interaction are excluded from CLS by
        // definition. This probe only scrolls, which does not count.
        if (!e.hadRecentInput) {
          window.__cwv.cls += e.value;
          // Bumped on every counted shift. The scroll pass waits on this
          // going quiet before it moves again — see settleScroll below.
          window.__cwv.n += 1;
        }
      }
    }).observe({ type: "layout-shift", buffered: true });
  } catch {}
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__cwv.tbt += Math.max(0, e.duration - 50);
    }).observe({ type: "longtask", buffered: true });
  } catch {}
})();
`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function measure(page, browser, url, profile) {
  const p = PROFILES[profile];

  await page.send("Emulation.setDeviceMetricsOverride", {
    width: p.width,
    height: p.height,
    deviceScaleFactor: 1,
    mobile: profile === "mobile",
    screenWidth: p.width,
    screenHeight: p.height,
  });
  await page.send("Emulation.setCPUThrottlingRate", { rate: p.cpuThrottle });
  await page.send("Network.emulateNetworkConditions", { offline: false, ...p.network });
  // Per navigation, so no run is measured against another run's warm cache.
  await page.send("Network.setCacheDisabled", { cacheDisabled: true });

  await page.send("Page.addScriptToEvaluateOnNewDocument", { source: OBSERVERS });

  let transfer = 0;
  const off = browser.onEvent((msg) => {
    if (msg.sessionId !== page.sessionId) return;
    if (msg.method === "Network.loadingFinished") transfer += msg.params.encodedDataLength ?? 0;
  });

  const loaded = new Promise((resolve) => {
    const stop = browser.onEvent((msg) => {
      if (msg.sessionId === page.sessionId && msg.method === "Page.loadEventFired") {
        stop();
        resolve();
      }
    });
    setTimeout(() => {
      stop();
      resolve();
    }, 40000);
  });

  await page.send("Page.navigate", { url });
  await loaded;

  // LCP can still move after load — a late-hydrating element repainting is
  // exactly the defect this probe exists to catch — so give it a beat before
  // reading, and again after the scroll.
  await sleep(1500);
  const paint = await page.eval("JSON.stringify(window.__cwv)");
  const atLoad = JSON.parse(paint);

  // CLS through a full slow scroll: shifts from lazy content and from
  // anything that mounts on scroll are part of the visitor's experience and
  // are not visible in a page that never moves.
  //
  // Each step waits for the page to stop shifting before taking the next one,
  // rather than moving on a fixed 120ms timer. That is not politeness, it is
  // what makes the number repeatable. The sticky ask bar collapses to a pill
  // on a scroll-direction run and expands again on the way back, animating
  // its width and min-height over 200ms — a real layout shift, and the site's
  // only remaining source of CLS. On a fixed cadence the next scroll landed
  // partway through that transition, so whether the run caught one crossfade
  // or two came down to timing: three consecutive homepage runs returned
  // 0.0091, 0.0558, 0.0091. Settling on quiet makes every step land at the
  // same offset with the same work already finished, which is the difference
  // between a check people read and a check people learn to ignore.
  await page.eval(
    `(async () => {
       const idle = async (quiet, cap) => {
         const start = performance.now();
         let seen = window.__cwv.n;
         let changed = performance.now();
         while (
           performance.now() - changed < quiet &&
           performance.now() - start < cap
         ) {
           await new Promise((r) => setTimeout(r, 40));
           if (window.__cwv.n !== seen) {
             seen = window.__cwv.n;
             changed = performance.now();
           }
         }
       };
       const step = Math.round(window.innerHeight * 0.5);
       const end = document.body.scrollHeight;
       for (let y = 0; y < end; y += step) {
         window.scrollTo(0, y);
         await idle(200, 1200);
       }
       window.scrollTo(0, 0);
       await idle(300, 1500);
       return 1;
     })()`,
    { awaitPromise: true }
  );
  const scrolled = JSON.parse(await page.eval("JSON.stringify(window.__cwv)"));

  off();
  await page.send("Emulation.setCPUThrottlingRate", { rate: 1 });

  return {
    lcp: Math.round(atLoad.lcp),
    lcpEl: atLoad.lcpEl,
    cls: Number(scrolled.cls.toFixed(4)),
    tbt: Math.round(atLoad.tbt),
    transferKb: Math.round(transfer / 1024),
  };
}

const baselinePath = argValue("--baseline");
const baseline = baselinePath ? JSON.parse(readFileSync(baselinePath, "utf8")) : null;

console.log(
  `\n  Core Web Vitals — ${BASE}` +
    (RUNS > 1 ? ` — median of ${RUNS} runs per route` : " — single run per route") +
    "\n"
);

const results = {};
/** Routes whose runs disagreed enough to be worth saying out loud. */
const unstable = [];
const chrome = await launch({ port: 9334 });
try {
  for (const profile of profiles) {
    const p = PROFILES[profile];
    console.log(
      `  ${profile} — ${p.width}x${p.height}, ${p.cpuThrottle}x CPU, ` +
        `${Math.round((p.network.downloadThroughput * 8) / 1024 / 1024 * 10) / 10} Mbps / ${p.network.latency}ms RTT\n`
    );
    console.log(
      `  ${"route".padEnd(34)} ${"LCP".padStart(7)} ${"CLS".padStart(7)} ${"TBT".padStart(6)} ${"kB".padStart(6)}  LCP element`
    );
    for (const route of ROUTES) {
      const samples = [];
      for (let run = 0; run < RUNS; run++) {
        // A fresh target per run: an observer installed on a reused page
        // survives the navigation and double-counts.
        const page = await chrome.newPage();
        await page.init();
        try {
          samples.push(await measure(page, chrome.browser, `${BASE}${route}`, profile));
        } catch (error) {
          console.log(
            `  ${route.padEnd(34)}  ERROR — ${error.message.split("\n")[0].slice(0, 60)}`
          );
        }
        await page.close();
      }
      if (samples.length === 0) continue;

      const row = {
        lcp: median(samples.map((s) => s.lcp)),
        // The element is a fact about the page, not a sample — it has been
        // identical across runs in every case measured. Taking the first is
        // honest as long as they agree, so disagreement is reported below.
        lcpEl: samples[0].lcpEl,
        cls: median(samples.map((s) => s.cls)),
        tbt: median(samples.map((s) => s.tbt)),
        transferKb: median(samples.map((s) => s.transferKb)),
        runs: samples.length,
      };
      results[`${profile}${route}`] = row;

      const was = baseline?.[`${profile}${route}`];
      const delta = was ? ` (${row.lcp - was.lcp >= 0 ? "+" : ""}${row.lcp - was.lcp} ms)` : "";
      console.log(
        `  ${route.padEnd(34)} ${String(row.lcp).padStart(5)}ms ${String(row.cls).padStart(7)} ${
          String(row.tbt).padStart(4)
        }ms ${String(row.transferKb).padStart(6)}  ${row.lcpEl.slice(0, 40)}${delta}`
      );

      // Spread is printed, never smoothed away. A median that hides a route
      // swinging between two values reports a stable number about an unstable
      // page, which is the failure this whole mechanism exists to avoid.
      //
      // A bimodal reading here is usually the page, not the probe: the
      // homepage font swap either lands before the fallback is painted or
      // after it, and a real visitor gets the same coin flip. Read a spread as
      // a finding to chase, not as a reason to re-run until it looks tidy.
      if (samples.length > 1) {
        const lcps = samples.map((s) => s.lcp);
        const clss = samples.map((s) => s.cls);
        const els = new Set(samples.map((s) => s.lcpEl));
        const lcpSpread = Math.max(...lcps) - Math.min(...lcps);
        const clsSpread = Math.max(...clss) - Math.min(...clss);
        if (lcpSpread > Math.max(150, row.lcp * 0.15)) {
          unstable.push(`${profile}${route} — LCP ${lcps.join(" / ")} ms`);
        }
        if (clsSpread > 0.02) {
          unstable.push(`${profile}${route} — CLS ${clss.join(" / ")}`);
        }
        if (els.size > 1) {
          unstable.push(`${profile}${route} — LCP element differed: ${[...els].join(" / ")}`);
        }
      }
    }
    console.log("");
  }
} finally {
  await chrome.close();
}

if (unstable.length) {
  console.log(
    `  ${unstable.length} measurement(s) varied across runs. The medians above stand;\n` +
      `  these are worth a look, because a page that measures two different ways\n` +
      `  is usually a page that behaves two different ways for a visitor too.\n`
  );
  for (const u of unstable) console.log(`    ${u}`);
  console.log("");
}

const savePath = argValue("--save");
if (savePath) {
  writeFileSync(savePath, JSON.stringify(results, null, 2));
  console.log(`  written to ${savePath}\n`);
}

// Only the mobile profile is gated. Desktop is reported for context and has
// never been the failing one.
const failures = [];
for (const [key, row] of Object.entries(results)) {
  if (!key.startsWith("mobile")) continue;
  const budget = PROFILES.mobile.budget;
  const route = key.slice("mobile".length);
  if (row.lcp > budget.lcp) failures.push(`${route} — LCP ${row.lcp}ms over ${budget.lcp}ms`);
  if (row.cls > budget.cls) failures.push(`${route} — CLS ${row.cls} over ${budget.cls}`);
  if (row.tbt > budget.tbt) failures.push(`${route} — TBT ${row.tbt}ms over ${budget.tbt}ms`);
}

if (failures.length === 0) {
  console.log("  every route inside the mobile budget.\n");
  process.exit(0);
}
console.log(`  ${failures.length} route(s) over budget:\n`);
for (const f of failures) console.log(`    ${f}`);
console.log("");
process.exit(1);
