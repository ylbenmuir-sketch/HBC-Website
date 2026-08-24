/**
 * Font-swap layout probe — what moves when the real faces replace the
 * fallback, and what the fallback's metrics should be so that nothing does.
 *
 *   npm run build && npx next start -p 3123
 *   CHECK_BASE=http://127.0.0.1:3123 npm run check:fonts
 *   CHECK_BASE=http://127.0.0.1:3123 npm run check:fonts -- --routes /,/faq
 *   CHECK_BASE=http://127.0.0.1:3123 npm run check:fonts -- --sweep
 *
 * ## What it does
 *
 * Loads every route twice: once with every `woff2` blocked, so what is painted
 * is the fallback, and once normally. The difference between the two geometries
 * is exactly what a visitor sees jump when the swap lands, and it is
 * deterministic — no timing, no run-to-run luck, no waiting to see which side
 * of the coin a load falls on.
 *
 * `check:cwv` measures the *consequence* (CLS, sometimes) and can only see it
 * on the loads where the swap happens to lose the race. This measures the
 * *mechanism*, on every load.
 *
 * ## What it gates
 *
 * **No heading inside a first viewport may change height at a mobile width.** A
 * heading that reflows moves everything under it, which is the whole of the
 * font-swap CLS this site had: the homepage H1 was 53px taller in the fallback
 * at 412px, because "without medication." needed 390px of a 364px column and
 * wrapped. Headings and body copy that rewrap *below* the fold are reported and
 * not gated — nothing visible moves, and no single size-adjust holds every line
 * on a site still. Fifteen of them do, and that is the honest state of it.
 *
 * Mobile is gated and desktop reported, the same split `check:cwv` uses and for
 * the same reason. **`/adults` at 1440px is a known exception** and is listed
 * rather than hidden: its H1 sits on the wrap boundary from the other side, so
 * the size-adjust that holds the homepage at 390px costs a line there. See the
 * fallback-metrics block in app/globals.css.
 *
 * ## `--sweep`
 *
 * Re-derives the two size-adjust values in that block instead of checking them.
 * For each candidate it swaps a fallback with those metrics into the page (the
 * real faces still blocked) and scores the geometry against the real-font
 * render, counting **only elements inside the first viewport**, because that is
 * what CLS counts. Prints the band that holds every route still, so the value
 * shipped can sit in the middle of it rather than on its edge.
 *
 * Run it when a headline's text or size changes, when a face changes, or when
 * `next/font` starts generating different fallback metrics. The numbers in
 * globals.css came out of this and should go back through it.
 */
import { launch } from "./layout/cdp.mjs";

const BASE = (process.env.CHECK_BASE ?? "http://localhost:3000").replace(/\/$/, "");
const argValue = (name) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const SWEEP = process.argv.includes("--sweep");

/**
 * Every template, plus the three pages whose heroes sit closest to a wrap
 * boundary. Wider than `check:cwv`'s nine, because a reflow is a property of
 * one page's words rather than of its template.
 */
const DEFAULT_ROUTES = [
  "/",
  "/locations/nashville",
  "/concerns/sleep",
  "/lens-neurofeedback",
  "/about",
  "/what-we-help-with",
  "/adults",
  "/how-lens-works",
  "/resources/homework-battles",
  "/contact",
  "/faq",
  "/stories",
  "/privacy-policy",
  "/children-families",
  "/first-visit",
];
const ROUTES = (argValue("--routes") ?? DEFAULT_ROUTES.join(","))
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .map((p) => (p.startsWith("/") ? p : `/${p}`));

/** 360 is the narrowest phone worth supporting; 412 is `check:cwv`'s. */
const VIEWPORTS = (argValue("--viewports") ?? "360x780,390x844,412x823,834x1112,1440x900")
  .split(",")
  .map((s) => s.split("x").map(Number));
const isMobile = (w) => w <= 500;

/** Documented, deliberate, and re-derived by `--sweep`: see globals.css. */
const KNOWN = new Set(["1440/adults"]);

const CANDIDATES = {
  normal: (argValue("--normals") ?? "92.5,92.8,93,93.2,93.5,94,94.5,95.23,96.98")
    .split(",")
    .map(Number),
  italic: (argValue("--italics") ?? "85,86,86.5,87,87.72,89").split(",").map(Number),
};

/**
 * Cormorant's own ascent and descent as fractions of its em, read off the
 * loaded face. Dividing these by a size-adjust gives the override that keeps
 * the substitute's em box the same shape after scaling.
 */
const REAL_ASCENT = 0.92392;
const REAL_DESCENT = 0.28698;

const GEOM = `JSON.stringify((() => {
  const els = [...document.querySelectorAll("h1,h2,h3,h4,.sub,.lede,.btn,.eyebrow,.micro,p,blockquote")];
  return els.map((el) => {
    const r = el.getBoundingClientRect();
    return {
      k: el.tagName.toLowerCase() + "." + (typeof el.className === "string" ? el.className.trim().split(/\\s+/).slice(0, 2).join(".") : ""),
      t: Math.round(r.top + scrollY),
      h: Math.round(r.height),
    };
  });
})())`;

/** Swap a fallback with these metrics in, over whatever the build ships. */
const injectFallback = (normal, italic) => `(() => {
  let s = document.getElementById("__fontsweep");
  if (!s) { s = document.createElement("style"); s.id = "__fontsweep"; document.head.appendChild(s); }
  s.textContent = \`
    @font-face { font-family: "Sweep"; font-style: normal; src: local("Times New Roman");
      ascent-override: ${((REAL_ASCENT / (normal / 100)) * 100).toFixed(2)}%;
      descent-override: ${((REAL_DESCENT / (normal / 100)) * 100).toFixed(2)}%;
      line-gap-override: 0%; size-adjust: ${normal}%; }
    @font-face { font-family: "Sweep"; font-style: italic;
      src: local("Times New Roman Italic"), local("TimesNewRomanPS-ItalicMT");
      ascent-override: ${((REAL_ASCENT / (italic / 100)) * 100).toFixed(2)}%;
      descent-override: ${((REAL_DESCENT / (italic / 100)) * 100).toFixed(2)}%;
      line-gap-override: 0%; size-adjust: ${italic}%; }
    :root, html { --serif: "Sweep", Georgia, serif !important;
                  --serif-italic: "Sweep", Georgia, serif !important;
                  --font-serif: "Sweep", Georgia, serif !important; }
  \`;
  return document.fonts.ready.then(() => document.body.offsetHeight);
})()`;

/**
 * One page, loaded and read.
 *
 * The cache is disabled per navigation for the same reason `check:cwv` does it,
 * and it is not optional here: a prefetch leaves the RSC flight payload for a
 * route in the shared profile cache, and a later navigation served that renders
 * a 50kB text blob with no `h1` in it — which reads as a page that does not
 * move. Hence the retry and the sanity test on what came back.
 */
async function read(chrome, url, w, h, { block = false } = {}) {
  let last = null;
  for (let attempt = 0; attempt < 4; attempt++) {
    const page = await chrome.newPage();
    await page.init();
    await page.setViewport(w, h);
    await page.send("Network.setCacheDisabled", { cacheDisabled: true });
    if (block) {
      await page.send("Network.setBlockedURLs", { urls: ["*.woff2", "*.woff", "*.ttf"] });
    }
    await page.goto(url, { settle: 500 });
    const ok = await page.eval(
      `document.body.scrollHeight > 500 && !!document.querySelector("h1")`
    );
    if (ok) return page;
    last = await page.eval("document.body.innerHTML.length");
    await page.close();
  }
  throw new Error(`${url} never rendered (last body was ${last} bytes)`);
}

/**
 * `viewportHeight` is what makes this a CLS measurement rather than a
 * curiosity. A heading that reflows below the fold pushes text nobody is
 * looking at; the same heading in the first viewport moves the page under a
 * reader's eye. Only the second is gated, and both are reported.
 */
const score = (real, fallback, viewportHeight) => {
  let worstHeading = 0;
  let heading = "";
  let worstBelow = 0;
  let below = "";
  let inFold = 0;
  let worstInFold = 0;
  let mover = "";
  fallback.forEach((e, i) => {
    const o = real[i];
    if (!o || o.k !== e.k) return;
    const moved = Math.abs(e.t - o.t);
    const visible = o.t < viewportHeight;
    if (visible) {
      inFold += moved;
      if (moved > worstInFold) {
        worstInFold = moved;
        mover = e.k;
      }
    }
    if (/^h[1-4]\./.test(e.k)) {
      const grew = Math.abs(e.h - o.h);
      if (visible && grew > worstHeading) {
        worstHeading = grew;
        heading = e.k;
      }
      if (!visible && grew > worstBelow) {
        worstBelow = grew;
        below = e.k;
      }
    }
  });
  return { worstHeading, heading, worstBelow, below, inFold, worstInFold, mover };
};

const chrome = await launch({ port: 9336 });
const failures = [];
const known = [];
const desktop = [];
const belowFold = [];

try {
  if (SWEEP) {
    console.log(
      `\n  Fallback metric sweep — ${BASE}\n` +
        `  scoring first-viewport movement against the real-font render\n`
    );
    const totals = new Map();
    const k = (n, i) => `${n}/${i}`;
    for (const n of CANDIDATES.normal) {
      for (const i of CANDIDATES.italic) {
        totals.set(k(n, i), { mobileWorst: 0, mobileDrift: 0, deskWorst: 0, deskDrift: 0 });
      }
    }
    for (const [w, h] of VIEWPORTS) {
      for (const route of ROUTES) {
        const realPage = await read(chrome, `${BASE}${route}`, w, h);
        const real = JSON.parse(await realPage.eval(GEOM));
        await realPage.close();
        const page = await read(chrome, `${BASE}${route}`, w, h, { block: true });
        for (const n of CANDIDATES.normal) {
          for (const i of CANDIDATES.italic) {
            await page.eval(injectFallback(n, i), { awaitPromise: true });
            const s = score(real, JSON.parse(await page.eval(GEOM)), h);
            const acc = totals.get(k(n, i));
            if (isMobile(w)) {
              acc.mobileDrift += s.inFold;
              acc.mobileWorst = Math.max(acc.mobileWorst, s.worstInFold);
            } else {
              acc.deskDrift += s.inFold;
              acc.deskWorst = Math.max(acc.deskWorst, s.worstInFold);
            }
          }
        }
        await page.close();
        console.log(`  swept ${String(w).padStart(4)}px ${route}`);
      }
    }
    const rows = [...totals.entries()]
      .map(([key, v]) => ({ key, ...v }))
      .sort(
        (a, b) =>
          a.mobileWorst - b.mobileWorst ||
          a.mobileDrift - b.mobileDrift ||
          a.deskWorst - b.deskWorst ||
          a.deskDrift - b.deskDrift
      );
    console.log(
      `\n  upright/italic     mobile worst / drift      desktop worst / drift\n`
    );
    for (const r of rows) {
      console.log(
        `  ${r.key.padEnd(16)} ${String(r.mobileWorst).padStart(8)}px ${String(r.mobileDrift).padStart(7)}px` +
          `      ${String(r.deskWorst).padStart(8)}px ${String(r.deskDrift).padStart(7)}px`
      );
    }
    console.log(
      `\n  Ship the middle of the band that holds mobile still, not its edge —\n` +
        `  a pair one step from a boundary is a headline edit away from moving.\n`
    );
  } else {
    console.log(
      `\n  Font-swap layout probe — ${BASE}\n` +
        `  fallback vs. real faces; headings are gated at mobile widths\n`
    );
    for (const [w, h] of VIEWPORTS) {
      console.log(
        `  ${String(w).padStart(4)}px  ${"route".padEnd(30)}  hero head Δh   in-fold worst   heading below fold`
      );
      for (const route of ROUTES) {
        const realPage = await read(chrome, `${BASE}${route}`, w, h);
        const real = JSON.parse(await realPage.eval(GEOM));
        await realPage.close();
        const page = await read(chrome, `${BASE}${route}`, w, h, { block: true });
        const fallback = JSON.parse(await page.eval(GEOM));
        await page.close();

        const s = score(real, fallback, h);
        console.log(
          `          ${route.padEnd(30)}  ${String(s.worstHeading).padStart(7)}px   ` +
            `${String(s.worstInFold).padStart(11)}px   ${(s.worstBelow ? `${s.below} ${s.worstBelow}px` : "").slice(0, 24)}`
        );

        if (s.worstBelow > 0) {
          belowFold.push(`${w}px ${route} — ${s.below} ${s.worstBelow}px`);
        }
        if (s.worstHeading > 0) {
          const entry = `${w}px ${route} — ${s.heading} ${s.worstHeading}px taller in the fallback`;
          if (KNOWN.has(`${w}${route}`)) known.push(entry);
          else if (isMobile(w)) failures.push(entry);
          else desktop.push(entry);
        }
      }
      console.log("");
    }
  }
} finally {
  await chrome.close();
}

if (SWEEP) process.exit(0);

if (known.length) {
  console.log(`  known and accepted (see the metrics block in app/globals.css):`);
  for (const entry of known) console.log(`    ${entry}`);
  console.log("");
}
if (desktop.length) {
  console.log(`  desktop headings that reflow — reported, not gated:`);
  for (const entry of desktop) console.log(`    ${entry}`);
  console.log("");
}
if (belowFold.length) {
  console.log(
    `  ${belowFold.length} heading(s) rewrap below the fold — reported, not gated: nothing\n` +
      `  visible moves, and no single size-adjust holds every line on the site still.\n`
  );
}
if (failures.length === 0) {
  console.log("  no heading in a first viewport reflows on the swap at a mobile width.\n");
  process.exit(0);
}
console.log(
  `  ${failures.length} heading(s) in a first viewport reflow on the swap at a mobile width:\n`
);
for (const entry of failures) console.log(`    ${entry}`);
console.log(
  `\n  Everything under them moves when the real font lands, on whichever\n` +
    `  share of loads the swap loses the race. Re-derive the fallback metrics\n` +
    `  with --sweep rather than adjusting them by eye.\n`
);
process.exit(1);
