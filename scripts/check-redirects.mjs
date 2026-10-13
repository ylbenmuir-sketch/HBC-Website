/**
 * The legacy redirect map, requested row by row against a built server.
 *
 *   npm run build && npx next start -p 3123
 *   CHECK_BASE=http://127.0.0.1:3123 npm run check:redirects
 *
 * ## What it checks, per legacy URL, with and without the trailing slash
 *
 * - **One hop.** The first response is the final answer: a 301 whose
 *   Location is the expected destination, or a 410 with no Location at all.
 *   A 308 to the bare path that then 301s somewhere else is the chain
 *   SEO-AUDIT-2.md §2.6(b) warned about, and it fails here.
 * - **The right status.** 301 for every mapped row; 410 for the retired
 *   ones. The only 308 allowed is the trailing-slash rule, on a legacy URL
 *   that is already the new URL (`/faq/` → `/faq`).
 * - **A live destination.** Every destination is fetched once and must
 *   answer 200, so no row points into the 404.
 * - **No double coverage.** Every source string in next.config.ts
 *   `redirects()` and `rewrites()` must appear exactly once.
 *
 * ## Why the table lives here and not in next.config.ts
 *
 * This is the list as it was decided — Ben's rows from the old site's
 * sitemaps (2026-10-13) and the earlier approved rows in
 * QUERY-TO-PAGE-MAP.md — written against what each URL *should* do. The
 * config is the implementation. Keeping them apart means a mistaken edit to
 * the config fails here instead of being read back as correct. When a
 * decision changes, change both.
 */
import { readFileSync } from "node:fs";

const BASE = (process.env.CHECK_BASE ?? "http://localhost:3000").replace(/\/$/, "");

/** [legacy path without slash, destination, status]. `self` marks a legacy
 *  URL that is already the new URL: bare answers 200, slash 308s to bare. */
const ROWS = [
  // Pages (QUERY-TO-PAGE-MAP.md and SEO-AUDIT-2 §2.6).
  ["/home", "/", 301],
  ["/home-simple", "/", 301],
  ["/what-is-lens", "/lens-neurofeedback", 301],
  ["/lens-therapy", "/lens-neurofeedback", 301],
  ["/nashville_neurofeedback_therapy", "/locations/nashville", 301],
  ["/add-adhd", "/concerns/focus-adhd", 301],
  ["/adhd", "/concerns/focus-adhd", 301],
  ["/add-adhd-landing-page", "/concerns/focus-adhd", 301],
  ["/stressanxiety", "/concerns/anxiety", 301],
  ["/stress", "/concerns/stress-resilience", 301],
  ["/sleepproblems", "/concerns/sleep", 301],
  ["/sleep-disorder", "/concerns/sleep", 301],
  ["/concussion-and-tbi", "/concerns/concussion", 301],
  ["/concussion-tbi1", "/concerns/concussion", 301],
  ["/emotional-balance", "/concerns/emotional-regulation", 301],
  ["/emotional-balance22", "/concerns/emotional-regulation", 301],
  ["/depression", "/concerns/depression", 301],
  ["/depression1", "/concerns/depression", 301],
  ["/peakperformance", "/concerns/performance", 301],
  ["/self-development", "/concerns/performance", 301],
  ["/migrainesandpain", "/concerns/migraines", 301],
  ["/migraines-and-fibromyalgia", "/concerns/migraines", 301],
  ["/trisha-yearwood", "/stories", 301],
  ["/testimonials", "/stories", 301],
  ["/testimonials1", "/stories", 301],
  ["/faqs", "/faq", 301],
  ["/faq", "/faq", "self"],
  ["/blog", "/resources", 301],
  ["/advice-center", "/resources", 301],
  ["/refer-a-friend", "/contact", 301],
  ["/phoneschedule", "/contact", 301],
  ["/new-client-intake-form", "/contact", 301],
  ["/what-we-help-with-1", "/what-we-help-with", 301],
  ["/concerns", "/what-we-help-with", 301],
  ["/concierge", "/concierge", "self"],
  ["/category/anxiety", "/resources", 301],
  ["/tag/lens", "/resources", 301],
  ["/vibro-acoustic-chair", null, 410],

  // Posts (Ben, 2026-10-13, from the old site's sitemaps).
  ["/5-ways-neurofeedback-reduces-stress-and-anxiety", "/concerns/anxiety", 301],
  ["/types-of-adhd", "/concerns/focus-adhd", 301],
  ["/how-lens-neurofeedback-supports-better-sleep-in-nashville-and-murfreesboro", "/concerns/sleep", 301],
  ["/why-choose-lens-neurofeedback-for-anxiety-relief-in-nashville-and-murfreesboro", "/concerns/anxiety", 301],
  ["/boost-focus-and-productivity-with-lens-neurofeedback-in-nashville-and-murfreesboro", "/concerns/focus-adhd", 301],
  ["/overcoming-depression-with-lens-neurofeedback-in-nashville-and-murfreesboro", "/concerns/depression", 301],
  ["/how-lens-neurofeedback-helps-manage-add-adhd-in-nashville-and-murfreesboro", "/concerns/focus-adhd", 301],
  ["/traditional-neurofeedback-vs-lens-neurofeedback-why-lens-stands-out", "/lens-neurofeedback", 301],
  ["/achieving-peak-performance-with-lens", "/concerns/performance", 301],
  ["/how-low-energy-neurofeedback-works-a-simple-explanation", "/how-lens-works", 301],
  ["/chemical-vs-brainwaves-two-paths-to-brain-health", "/resources/lens-and-medication", 301],
  ["/sheri-rowney-being-interviewed-by-don-miller", "/about/founder", 301],
  ["/positive-outcomes-from-vibro-acoustic-therapy-research", null, 410],
  ["/suffering-from-anxiety-depression", "/concerns/anxiety", 301],
  ["/adhdadd-cant-be-cured-but-it-can-be-controlled", "/concerns/focus-adhd", 301],
  ["/concussion-do-you-know-the-symptoms", "/concerns/concussion", 301],
  ["/10-ways-to-look-forward-to-monday-mornings", "/concerns/stress-resilience", 301],
  ["/is-america-addicted-to-prescription-drugs", "/resources/lens-and-medication", 301],
  ["/new-nashville-lens-neurofeedback-90-success-rate-adhd-anxiety-depression", "/lens-neurofeedback", 301],
  ["/children-adhd-alternative-drugs", "/children-families", 301],
  ["/suffering-migraines-non-drug-treatment-can-help", "/concerns/migraines", 301],
  // Changed from Ben's list (/adults): the post is about depression.
  ["/last-non-drug-treatment-pmt-menopause-depression", "/concerns/depression", 301],

  // WordPress numeric auto-slugs, all 34 from the sitemap, retired by pattern.
  ...[
    6105, 6117, 6129, 6137, 6148, 6155, 6159, 6166, 6171, 6177, 6184, 6191,
    6196, 6200, 6204, 6210, 6215, 6220, 6226, 6234, 6239, 6243, 6251, 6257,
    6263, 6293, 6298, 6309, 6314, 6319, 6324, 6330, 6335, 6340,
  ].map((n) => [`/${n}-2`, null, 410]),
];

const failures = [];
const fail = (msg) => failures.push(msg);

// --- 1. Every source in next.config.ts appears once. ---------------------
const config = readFileSync(new URL("../next.config.ts", import.meta.url), "utf8");
const routeSection = config.slice(config.indexOf("async redirects()"));
const sources = [];
for (const m of routeSection.matchAll(/to\(\s*\[([^\]]*)\]/g)) {
  for (const s of m[1].matchAll(/"(\/[^"]*)"/g)) sources.push(s[1]);
}
for (const m of routeSection.matchAll(/source:\s*"(\/[^"]*)"/g)) sources.push(m[1]);
const seen = new Map();
for (const s of sources) seen.set(s, (seen.get(s) ?? 0) + 1);
for (const [s, n] of seen) if (n > 1) fail(`next.config.ts lists ${s} ${n} times`);

// --- 2. Every row, both slash forms, one hop. -----------------------------
const head = async (path) => {
  const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
  const loc = res.headers.get("location");
  return { status: res.status, location: loc ? new URL(loc, BASE).pathname : null };
};

const destinations = new Map();
const destinationOk = async (dest) => {
  if (!destinations.has(dest)) destinations.set(dest, head(dest));
  return destinations.get(dest);
};

const rowSources = new Set();
for (const [legacy, dest, status] of ROWS) {
  if (rowSources.has(legacy)) fail(`check table lists ${legacy} twice`);
  rowSources.add(legacy);
  for (const path of [legacy, `${legacy}/`]) {
    const r = await head(path);
    if (status === "self") {
      const want = path === legacy ? { status: 200, location: null } : { status: 308, location: dest };
      if (r.status !== want.status || r.location !== want.location) {
        fail(`${path}: ${r.status}${r.location ? ` → ${r.location}` : ""}, wanted ${want.status}${want.location ? ` → ${want.location}` : ""}`);
      }
      continue;
    }
    if (status === 410) {
      if (r.status !== 410 || r.location) {
        fail(`${path}: ${r.status}${r.location ? ` → ${r.location}` : ""}, wanted 410 in one hop`);
      }
      continue;
    }
    if (r.status !== status || r.location !== dest) {
      fail(`${path}: ${r.status}${r.location ? ` → ${r.location}` : ""}, wanted ${status} → ${dest}`);
    }
  }
  if (dest) {
    const d = await destinationOk(dest);
    if (d.status !== 200) fail(`destination ${dest} answers ${d.status}${d.location ? ` → ${d.location}` : ""}, not 200`);
  }
}

// --- 3. The catch-all still does its ordinary job. ------------------------
for (const path of ["/about", "/concerns/anxiety", "/locations/nashville"]) {
  const r = await head(`${path}/`);
  if (r.status !== 308 || r.location !== path) {
    fail(`${path}/: ${r.status}${r.location ? ` → ${r.location}` : ""}, wanted 308 → ${path}`);
  }
}

const bare = ROWS.length;
const gone = ROWS.filter((r) => r[2] === 410).length;
console.log(
  `check:redirects — ${bare} legacy URLs × 2 slash forms against ${BASE}: ` +
    `${bare - gone - ROWS.filter((r) => r[2] === "self").length} redirects, ${gone} gone, ` +
    `${destinations.size} destinations fetched.`
);
if (failures.length) {
  console.error(`\n${failures.length} failure(s):`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log("All rows answer in one hop; every destination is live; no source is listed twice.");
