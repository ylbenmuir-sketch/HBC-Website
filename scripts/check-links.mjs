/**
 * Internal link graph — inbound links, crawl depth, and PageRank share for
 * every indexable route.
 *
 *   npm run build && npx next start -p 3123
 *   CHECK_BASE=http://127.0.0.1:3123 npm run check:links
 *   CHECK_BASE=http://127.0.0.1:3123 npm run check:links -- --all-links
 *   CHECK_BASE=http://127.0.0.1:3123 npm run check:links -- --save graph.json
 *   CHECK_BASE=http://127.0.0.1:3123 npm run check:links -- --baseline graph.json
 *
 * ## When to run it
 *
 * After any change to what links to what: a new page, a new template block, a
 * change to the header or footer, a new article, a cluster reorganisation.
 * Also worth running before writing an article, to see which pages are
 * currently starved.
 *
 * Routes come from the running server's own sitemap, so the list cannot go
 * stale — the same trick `check:layout` uses.
 *
 * ## Why in-content links, not every <a> on the page
 *
 * By default this counts only links inside `<main>`, which excludes the header
 * mega-menu and the footer. That is the number that means something. Those two
 * put 36 identical links on all 37 routes, so a whole-document graph makes
 * every chrome-linked page score identically no matter what any page actually
 * says — SEO-AUDIT-2.md §4 measured a PageRank distribution flat to four
 * decimal places, with `/contact`, `/about/team` and `/concerns/anxiety` all
 * at exactly 3.52%. Google discounts boilerplate navigation against in-content
 * links, so the editorial graph is the one worth watching. `--all-links`
 * reproduces the whole-document version for comparison.
 *
 * ## What the columns mean
 *
 * - **in** — how many distinct routes link here from their `<main>`.
 * - **out** — how many distinct routes this one links to.
 * - **depth** — BFS hops from `/`, following in-content links only. Reported,
 *   never gated: in the `<main>`-only graph a page linked from the header on
 *   every route reads as unreachable, which is true of the editorial graph and
 *   false of the site.
 * - **rank** — damped PageRank (d = 0.85, 60 iterations) as a share of the
 *   whole graph, so the column sums to 100%. A node with no outbound links
 *   would be a sink, so its rank is redistributed evenly, which is the
 *   standard treatment and the reason `/contact` does not accumulate.
 *
 * Absolute rank values are only comparable within one run — adding a page
 * changes everyone's share. Compare classes of page against each other, and
 * compare a run against a `--baseline` from before a change.
 */
import { readFileSync, writeFileSync } from "node:fs";

const BASE = (process.env.CHECK_BASE ?? "http://localhost:3000").replace(/\/$/, "");

const argValue = (name) => {
  const i = process.argv.indexOf(name);
  return i > -1 ? process.argv[i + 1] : undefined;
};
const allLinks = process.argv.includes("--all-links");

const res = await fetch(`${BASE}/sitemap.xml`);
if (!res.ok) {
  console.error(`\n  ${BASE}/sitemap.xml returned ${res.status} — is the server running?\n`);
  process.exit(1);
}
const sitemap = await res.text();
const routes = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => new URL(m[1]).pathname)
  .map((p) => (p.length > 1 ? p.replace(/\/+$/, "") : p))
  .sort();

if (routes.length === 0) {
  console.error("\n  sitemap listed no URLs\n");
  process.exit(1);
}

const indexable = new Set(routes);

/** Links out of one page, deduped, restricted to indexable internal routes. */
async function outboundOf(route) {
  const html = await (await fetch(`${BASE}${route}`)).text();
  let scope = html;
  if (!allLinks) {
    const i = html.indexOf("<main>");
    const j = html.lastIndexOf("</main>");
    scope = i > -1 && j > i ? html.slice(i + 6, j) : "";
  }
  const out = new Set();
  const anchors = [];
  for (const m of scope.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const href = m[1].replace(/&amp;/g, "&");
    if (!href.startsWith("/") || href.startsWith("//")) continue;
    const path = href.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
    if (path === route || !indexable.has(path)) continue;
    out.add(path);
    anchors.push({ to: path, text: m[2].replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim() });
  }
  return { out: [...out], anchors };
}

const graph = new Map();
for (const route of routes) graph.set(route, (await outboundOf(route)).out);

/** Inbound count per route. */
const inbound = new Map(routes.map((r) => [r, 0]));
for (const [, outs] of graph) for (const to of outs) inbound.set(to, inbound.get(to) + 1);

/** BFS depth from the homepage. Infinity means unreachable in-content. */
const depth = new Map(routes.map((r) => [r, Infinity]));
depth.set("/", 0);
let frontier = ["/"];
while (frontier.length) {
  const next = [];
  for (const node of frontier) {
    for (const to of graph.get(node) ?? []) {
      if (depth.get(to) > depth.get(node) + 1) {
        depth.set(to, depth.get(node) + 1);
        next.push(to);
      }
    }
  }
  frontier = next;
}

/** Damped PageRank. Dangling nodes redistribute evenly rather than leaking. */
const N = routes.length;
const D = 0.85;
let rank = new Map(routes.map((r) => [r, 1 / N]));
for (let iter = 0; iter < 60; iter++) {
  const next = new Map(routes.map((r) => [r, 0]));
  let dangling = 0;
  for (const route of routes) {
    const outs = graph.get(route);
    if (outs.length === 0) {
      dangling += rank.get(route);
      continue;
    }
    const share = rank.get(route) / outs.length;
    for (const to of outs) next.set(to, next.get(to) + share);
  }
  for (const route of routes) {
    next.set(route, (1 - D) / N + D * (next.get(route) + dangling / N));
  }
  rank = next;
}

const rows = routes.map((route) => ({
  route,
  in: inbound.get(route),
  out: graph.get(route).length,
  depth: depth.get(route),
  rank: Number((rank.get(route) * 100).toFixed(4)),
}));

const baselinePath = argValue("--baseline");
const baseline = baselinePath
  ? new Map(JSON.parse(readFileSync(baselinePath, "utf8")).map((r) => [r.route, r]))
  : null;

console.log(
  `\n  internal link graph — ${BASE} — ${N} routes, ` +
    `${allLinks ? "whole document" : "<main> only, chrome excluded"}\n`
);
console.log(`  ${"route".padEnd(40)} ${"in".padStart(4)} ${"out".padStart(4)} ${"depth".padStart(5)} ${"rank%".padStart(7)}`);
for (const r of [...rows].sort((a, b) => b.rank - a.rank || a.route.localeCompare(b.route))) {
  const was = baseline?.get(r.route);
  const delta = was
    ? `  (in ${r.in - was.in >= 0 ? "+" : ""}${r.in - was.in}, rank ${
        r.rank - was.rank >= 0 ? "+" : ""
      }${(r.rank - was.rank).toFixed(4)})`
    : "";
  console.log(
    `  ${r.route.padEnd(40)} ${String(r.in).padStart(4)} ${String(r.out).padStart(4)} ${String(
      r.depth === Infinity ? "—" : r.depth
    ).padStart(5)} ${r.rank.toFixed(4).padStart(7)}${delta}`
  );
}

const savePath = argValue("--save");
if (savePath) {
  writeFileSync(savePath, JSON.stringify(rows, null, 2));
  console.log(`\n  written to ${savePath}`);
}

/**
 * Routes that are allowed to be starved, and why.
 *
 * Not a suppression list — an assertion. Each entry names a design decision
 * that costs a page its in-content inbound links, and the entries are printed
 * on every run so the decision stays visible rather than becoming the
 * absence of a warning nobody remembers turning off. Remove the line the day
 * the decision changes and the check starts asking again.
 */
const ACCEPTED = {
  "/privacy-policy":
    "linked from the footer, which is where people look for it — a privacy " +
    "notice earns its inbound links from chrome rather than from prose",
  "/locations/franklin":
    "coming-soon card points at the waitlist (/contact), not at the page — " +
    "deliberate; the route is still chrome-linked and in the sitemap",
};

/**
 * Failures, not warnings — inbound links only.
 *
 * One inbound link was the finding: all ten articles had exactly one apiece,
 * from the index, while every chrome-linked page had 36 (SEO-AUDIT-2.md §4).
 * That is the thing worth blocking on, because it is the thing that silently
 * happens again every time an article ships without a home.
 *
 * Depth is reported and not gated. In the `<main>`-only graph it measures
 * something different from what a crawler sees — a page linked from the header
 * on all 37 routes reads as unreachable here, which is true of the editorial
 * graph and false of the site. Read the column; do not let it fail a build.
 */
const orphans = rows.filter((r) => r.route !== "/" && r.in === 0 && !ACCEPTED[r.route]);
const starved = rows.filter((r) => r.route !== "/" && r.in === 1 && !ACCEPTED[r.route]);
const accepted = rows.filter((r) => ACCEPTED[r.route] && r.in <= 1);

console.log("");
if (accepted.length) {
  console.log(`  ${accepted.length} accepted:`);
  for (const r of accepted) console.log(`    ${r.route} — ${ACCEPTED[r.route]}`);
  console.log("");
}

const problems = [];
if (orphans.length) problems.push([`no in-content inbound link at all`, orphans]);
if (starved.length) problems.push([`exactly one in-content inbound link`, starved]);

if (problems.length === 0) {
  console.log("  every route has at least two in-content inbound links.\n");
  process.exit(0);
}
for (const [label, set] of problems) {
  console.log(`  ${set.length} route(s) — ${label}:`);
  for (const r of set) console.log(`    ${r.route}`);
  console.log("");
}
process.exit(1);
