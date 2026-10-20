/**
 * check:reveal — nothing on the site stays hidden behind the scroll reveal.
 *
 *   npm run build && npx next start -p 3123
 *   CHECK_BASE=http://127.0.0.1:3123 npm run check:reveal
 *   CHECK_BASE=http://127.0.0.1:3123 npm run check:reveal -- --routes /resources,/faq
 *
 * Every route in the sitemap, in a headless Chrome at 390×568 (scripts/
 * layout/cdp.mjs): the page loads with the viewport at the top, is then
 * scrolled to the bottom in screen-sized steps the way a thumb would, and
 * every `.rv` element must end up revealed — opacity 1, no `translateY`.
 * Then /resources with JavaScript disabled: the article cards must be
 * visible (the reveal is an enhancement, not a gate).
 *
 * Written for the 2026-10-20 bug: /resources on an iPhone showed its heading
 * and intro and a blank where the cards were, because the cards' grid is one
 * `.rv` thousands of pixels tall and the observer's 12% threshold could never
 * be met inside one phone screen. Exit 1 with the failures listed.
 */
import { launch } from "./layout/cdp.mjs";

const BASE = (process.env.CHECK_BASE ?? "http://127.0.0.1:3123").replace(/\/$/, "");
const routesArg = process.argv.indexOf("--routes");
const only = routesArg !== -1 ? process.argv[routesArg + 1].split(",") : null;
const failures = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function routes() {
  if (only) return only;
  const xml = await (await fetch(`${BASE}/sitemap.xml`)).text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => new URL(m[1]).pathname);
}

const HIDDEN = `(() => { const out = []; for (const el of document.querySelectorAll(".rv")) { const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); if (r.width === 0 && r.height === 0) continue; if (parseFloat(cs.opacity) < 0.98 || cs.visibility === "hidden") out.push((el.tagName.toLowerCase() + (el.className ? "." + String(el.className).trim().split(/\\s+/).slice(0, 3).join(".") : "")) + " @" + Math.round(r.top + scrollY) + " h" + Math.round(r.height)); } return JSON.stringify({ total: document.querySelectorAll(".rv").length, hidden: out }); })()`;

const chrome = await launch({ port: 9531 });
const page = await chrome.newPage();
await page.init();
// 390×568: the shortest common phone screen (an SE, or a larger phone with
// the browser's bars up). The 2026-10-20 bug depended on the first screen:
// an element whose top edge sat inside the viewport at load got the
// observer's initial entry and showed; one that sat just below never did,
// because its own 12% could not fit on a screen. A taller viewport can hide
// that, so the strict height is the one checked.
await page.setViewport(390, 568);

const list = await routes();
console.log(`check:reveal — ${list.length} route(s) at 390×568 against ${BASE}\n`);
for (const route of list) {
  await page.goto(`${BASE}${route}`, { settle: 700 });
  // Thumb-scroll to the bottom: a screen at a time, a beat for the observer.
  await page.eval(`(async () => { let y = 0; const step = Math.round(innerHeight * 0.85); while (y < document.documentElement.scrollHeight - innerHeight) { y += step; window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } window.scrollTo(0, document.documentElement.scrollHeight); return 1; })()`, { awaitPromise: true }).catch(async () => {
    // Older helper without awaitPromise: scroll synchronously in steps.
    const h = await page.eval("document.documentElement.scrollHeight");
    for (let y = 0; y < h; y += 700) { await page.eval(`window.scrollTo(0, ${y})`); await sleep(120); }
  });
  await sleep(900);
  const r = JSON.parse(await page.eval(HIDDEN));
  const ok = r.hidden.length === 0;
  console.log(`  ${ok ? "✓" : "✗"} ${route}  (${r.total} .rv${ok ? "" : `, ${r.hidden.length} still hidden`})`);
  if (!ok) {
    failures.push(route);
    for (const h of r.hidden.slice(0, 6)) console.log(`      ${h}`);
  }
}

// JavaScript off: the cards are simply there.
await page.send("Emulation.setScriptExecutionDisabled", { value: true });
await page.goto(`${BASE}/resources`, { settle: 700 });
const noJs = JSON.parse(await page.eval(`JSON.stringify({ cards: document.querySelectorAll(".res-card").length, visible: [...document.querySelectorAll(".res-card")].filter(c => { const cs = getComputedStyle(c); const r = c.getBoundingClientRect(); return parseFloat(cs.opacity) > 0.98 && cs.visibility !== "hidden" && r.height > 0; }).length, js: document.documentElement.classList.contains("js") })`));
const noJsOk = noJs.cards > 0 && noJs.visible === noJs.cards;
console.log(`\n  ${noJsOk ? "✓" : "✗"} /resources with JavaScript disabled: ${noJs.visible}/${noJs.cards} cards visible (html.js=${noJs.js})`);
if (!noJsOk) failures.push("/resources (no JS)");
await page.send("Emulation.setScriptExecutionDisabled", { value: false });

await chrome.close();
console.log(failures.length ? `\n✗ ${failures.length} route(s) leave reveal content hidden` : `\n✓ every .rv on every route is revealed after a scroll; /resources stands without JS`);
process.exit(failures.length ? 1 : 0);
