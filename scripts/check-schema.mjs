/**
 * Structured-data audit — one `@graph` per indexable route, anchored and
 * typed.
 *
 *   npm run build && npx next start -p 3123
 *   CHECK_BASE=http://127.0.0.1:3123 npm run check:schema
 *
 * Routes come from the running server's own sitemap, like check:links and
 * check:layout, so the list cannot go stale.
 *
 * What it asserts, per route (SEO-AUDIT-3 §3, A8):
 *
 * 1. Exactly one `<script type="application/ld+json">`, and it parses.
 * 2. It is a `@graph` with one Organization (`/#organization`) and one
 *    WebSite (`/#website`).
 * 3. Exactly one page node — a node whose `@id` is `<url>#webpage` — whose
 *    `url` is the page's canonical URL, with a `name`, a `description`, a
 *    `dateModified` and an `isPartOf` pointing at the WebSite.
 * 4. Every `@id` reference inside any node also carries `@type` and `name`
 *    (a bare `{"@id"}` is what most parsers outside Google cannot resolve).
 * 5. Every route except `/` carries a BreadcrumbList, and the page node's
 *    `breadcrumb` points at it.
 * 6. No `@context` on any node — it is declared once, on the graph.
 * 7. Every VideoObject (components/VideoEmbed.tsx → lib/schema.ts) has a
 *    `name`, a `description`, an `embedUrl` on the privacy-enhanced host,
 *    and a `thumbnailUrl` that is a same-origin image the server actually
 *    serves (the committed poster — `npm run fetch:posters`). `uploadDate`
 *    and `duration`, when present, are ISO 8601; when absent — they are
 *    Verifiables nobody has confirmed — the run says so, because Google
 *    needs `uploadDate` for the video rich result and silence here is how
 *    that stays unnoticed. `contentUrl` is the YouTube watch URL of the
 *    same id. No field may be an empty string. A page node that carries
 *    `video` must point at a VideoObject in its own graph.
 * 8. Every watch page (`/videos/<slug>`) carries exactly one VideoObject,
 *    with `uploadDate`, `duration`, `contentUrl`, `thumbnailUrl` and
 *    `embedUrl` all present, and its page node's `video` points at it.
 *
 * It does not validate against schema.org's vocabulary; the Rich Results
 * Test and the Schema Markup Validator do that on a live URL (SEO-AUDIT-3
 * B6). This is the drift guard for the structure the site chose.
 */
const BASE = (process.env.CHECK_BASE ?? "http://127.0.0.1:3123").replace(/\/$/, "");

async function text(url) {
  const res = await fetch(url, { redirect: "manual" });
  if (res.status !== 200) throw new Error(`${url} → ${res.status}`);
  return res.text();
}

function walk(node, visit, path = "$") {
  if (Array.isArray(node)) node.forEach((n, i) => walk(n, visit, `${path}[${i}]`));
  else if (node && typeof node === "object") {
    visit(node, path);
    for (const [k, v] of Object.entries(node)) walk(v, visit, `${path}.${k}`);
  }
}

const sitemap = await text(`${BASE}/sitemap.xml`);
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (urls.length === 0) throw new Error("sitemap listed no URLs");
const origin = new URL(urls[0]).origin;

const failures = [];
const notes = [];
let checked = 0;

/** `fetch` for a same-origin asset the markup claims exists — the poster. */
async function assetStatus(url) {
  try {
    const res = await fetch(url.replace(origin, BASE), { method: "GET", redirect: "manual" });
    return { status: res.status, type: res.headers.get("content-type") ?? "" };
  } catch (e) {
    return { status: 0, type: String(e.message) };
  }
}
for (const canonical of urls) {
  const route = canonical.replace(origin, "") || "/";
  const html = await text(`${BASE}${route}`);
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const fail = (msg) => failures.push(`${route}\n    ${msg}`);
  checked += 1;
  if (blocks.length !== 1) {
    fail(`${blocks.length} JSON-LD block(s); expected exactly one @graph`);
    continue;
  }
  let graph;
  try {
    const parsed = JSON.parse(blocks[0]);
    if (parsed["@context"] !== "https://schema.org" || !Array.isArray(parsed["@graph"])) {
      fail("the block is not a @graph with a schema.org @context");
      continue;
    }
    graph = parsed["@graph"];
  } catch (e) {
    fail(`JSON-LD does not parse: ${e.message}`);
    continue;
  }
  const byId = new Map(graph.filter((n) => n["@id"]).map((n) => [n["@id"], n]));
  const org = byId.get(`${origin}/#organization`);
  const site = byId.get(`${origin}/#website`);
  if (!org || org["@type"] !== "Organization") fail("no Organization node at /#organization");
  if (!site || site["@type"] !== "WebSite") fail("no WebSite node at /#website");
  const pageNode = byId.get(`${canonical}#webpage`);
  if (!pageNode) fail(`no page node at ${canonical}#webpage`);
  else {
    if (pageNode.url !== canonical) fail(`page node url is ${pageNode.url}, expected ${canonical}`);
    for (const field of ["name", "description", "dateModified"]) {
      if (!pageNode[field]) fail(`page node has no ${field}`);
    }
    if (pageNode.isPartOf?.["@id"] !== `${origin}/#website`) fail("page node isPartOf does not point at the WebSite");
    const types = [].concat(pageNode["@type"]);
    if (!types.some((t) => /Page$/.test(t))) fail(`page node type ${JSON.stringify(pageNode["@type"])} is not a *Page`);
  }
  const crumb = graph.find((n) => n["@type"] === "BreadcrumbList");
  if (route === "/") {
    if (crumb) fail("the homepage should carry no BreadcrumbList");
  } else {
    if (!crumb) fail("no BreadcrumbList");
    else if (pageNode && pageNode.breadcrumb?.["@id"] !== crumb["@id"]) fail("page node breadcrumb does not point at the BreadcrumbList");
  }
  // Rule 7 — videos.
  for (const node of graph.filter((n) => n["@type"] === "VideoObject")) {
    const where = `VideoObject ${node["@id"] ?? "(no @id)"}`;
    for (const field of ["@id", "name", "description", "embedUrl", "thumbnailUrl"]) {
      if (!node[field] || (Array.isArray(node[field]) && node[field].length === 0)) fail(`${where} has no ${field}`);
    }
    for (const [k, v] of Object.entries(node)) {
      if (v === "" || (Array.isArray(v) && v.some((x) => x === ""))) fail(`${where}: ${k} is an empty string`);
    }
    if (node.embedUrl && !/^https:\/\/www\.youtube-nocookie\.com\/embed\/[A-Za-z0-9_-]{11}(\?|$)/.test(node.embedUrl)) {
      fail(`${where}: embedUrl ${node.embedUrl} is not a youtube-nocookie.com embed`);
    }
    if (node.uploadDate !== undefined && !/^\d{4}-\d{2}-\d{2}(T[\d:.+Z-]+)?$/.test(String(node.uploadDate))) {
      fail(`${where}: uploadDate ${JSON.stringify(node.uploadDate)} is not an ISO 8601 date`);
    }
    if (node.duration !== undefined && !/^PT(?=\d)(\d+H)?(\d+M)?(\d+S)?$/.test(String(node.duration))) {
      fail(`${where}: duration ${JSON.stringify(node.duration)} is not an ISO 8601 duration`);
    }
    if (node.uploadDate === undefined) notes.push(`${route}: ${where} carries no uploadDate (unverified in lib/site-config.ts) — Google needs it for the video rich result`);
    if (node.duration === undefined) notes.push(`${route}: ${where} carries no duration (unverified in lib/site-config.ts)`);
    // contentUrl is the YouTube watch page of the same recording (Ben,
    // 2026-10-20) — never a file on this origin, never a different video.
    const vid = node.embedUrl?.match(/\/embed\/([A-Za-z0-9_-]{11})/)?.[1];
    if (node.contentUrl !== `https://www.youtube.com/watch?v=${vid}`) {
      fail(`${where}: contentUrl ${JSON.stringify(node.contentUrl)} is not the YouTube watch URL of the embedded video`);
    }
    for (const thumb of [].concat(node.thumbnailUrl ?? [])) {
      if (!String(thumb).startsWith(`${origin}/`)) {
        fail(`${where}: thumbnailUrl ${thumb} is not on this origin — posters are committed, never fetched from a third party`);
        continue;
      }
      const asset = await assetStatus(thumb);
      if (asset.status !== 200 || !asset.type.startsWith("image/")) {
        fail(`${where}: thumbnailUrl ${thumb} → HTTP ${asset.status} ${asset.type}; the poster is not being served`);
      }
    }
  }
  // Rule 8 — a watch page is the video's listing: exactly one VideoObject,
  // complete, and the page node points at it.
  if (/^\/videos\/[^/]+$/.test(route)) {
    const vids = graph.filter((n) => n["@type"] === "VideoObject");
    if (vids.length !== 1) fail(`watch page carries ${vids.length} VideoObjects, wanted 1`);
    for (const field of ["uploadDate", "duration", "contentUrl", "thumbnailUrl", "embedUrl"]) {
      if (vids[0] && vids[0][field] === undefined) fail(`watch page VideoObject has no ${field}`);
    }
    if (!pageNode?.video) fail("watch page node carries no `video`");
  }
  if (pageNode?.video) {
    const target = graph.find((n) => n["@type"] === "VideoObject" && n["@id"] === pageNode.video["@id"]);
    if (!target) fail(`page node's video points at ${pageNode.video["@id"]}, which is not a VideoObject in this graph`);
  }
  walk(graph, (node, path) => {
    if (node["@context"]) fail(`@context on a node at ${path}; it belongs on the graph only`);
    // A top-level node is `$[n]`; anything deeper that carries an @id is a
    // reference to another node, and has to be readable on its own.
    // A BreadcrumbList has no name to carry; every other referenced entity
    // (Organization, WebSite, WebPage, Person, LocalBusiness, Service) does.
    const topLevel = /^\$\[\d+\]$/.test(path);
    const named = node["@type"] === "BreadcrumbList" || Boolean(node.name);
    if ("@id" in node && !topLevel && (!node["@type"] || !named)) {
      fail(`bare @id reference at ${path}: ${JSON.stringify(node).slice(0, 80)}`);
    }
  });
}

if (failures.length > 0) {
  console.log(`\n❌  structured data — ${failures.length} problem(s) across ${checked} route(s):\n`);
  for (const f of failures) console.log(`  • ${f}`);
  process.exit(1);
}
for (const n of notes) console.log(`  note  ${n}`);
console.log(`✓ structured data: ${checked} route(s), one @graph each, anchored, typed, every reference named.`);
