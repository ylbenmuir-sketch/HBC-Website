/**
 * check:cta — every "See If It's a Fit" on a phone actually goes somewhere.
 *
 *   npm run build && npx next start -p 3123
 *   CHECK_BASE=http://127.0.0.1:3123 npm run check:cta
 *
 * In a headless Chrome at 390×844 (scripts/layout/cdp.mjs), with real touch
 * events at each button's centre, not element.click():
 *
 *   1. On /: open the menu drawer, tap its "See If It's a Fit" → the page
 *      navigates to /contact and the drawer is closed.
 *   2. On /contact: open the drawer, tap it → still /contact, the drawer is
 *      closed, and the form section (#send-a-message) is at the top of the
 *      screen (under the header offset). This was the dead tap of
 *      2026-10-20: a link to the page you are already on.
 *   3. On /: every other "See If It's a Fit" — the hero, the Brain Map
 *      stage, the final band, the sticky bottom bar once the hero has
 *      scrolled past — tapped in turn, each landing on /contact.
 *
 * Exit 1 with the failures listed; nothing is written anywhere.
 */
import { launch } from "./layout/cdp.mjs";

const BASE = (process.env.CHECK_BASE ?? "http://127.0.0.1:3123").replace(/\/$/, "");
const LABEL = "See If It\u2019s a Fit";
const failures = [];
const expect = (label, ok, detail = "") => {
  console.log(`  ${ok ? "✓" : "✗"} ${label}${ok || !detail ? "" : ` — ${detail}`}`);
  if (!ok) failures.push(label);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = await launch({ port: 9521 });
const page = await chrome.newPage();
await page.init();
await page.setViewport(390, 844);

async function tap(sel) {
  const r = await page.eval(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const b = e.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2, b.width, b.height]; })()`);
  if (!r) return null;
  const [x, y] = r;
  await page.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  await page.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  return r;
}
const path = () => page.eval("location.pathname");
const drawerOpen = () => page.eval(`document.querySelector(".drawer")?.classList.contains("open") ?? false`);

console.log(`check:cta — ${BASE} at 390×844\n`);

// 1. drawer on the homepage
await page.goto(`${BASE}/`, { settle: 900 });
await page.eval(`document.querySelector(".nav-burger").click()`);
await sleep(600);
expect("home: drawer opens", await drawerOpen());
const hit1 = await tap(".drawer .d-cta .nav-cta");
await sleep(1500);
expect("home: drawer CTA is tappable (on screen)", !!hit1 && hit1[2] > 40 && hit1[3] > 30, JSON.stringify(hit1));
expect("home: drawer CTA goes to /contact", (await path()) === "/contact", await path());
expect("home: drawer closed after the tap", !(await drawerOpen()));

// 2. drawer on /contact itself
await page.goto(`${BASE}/contact`, { settle: 900 });
await page.eval(`window.scrollTo(0, 0)`);
await page.eval(`document.querySelector(".nav-burger").click()`);
await sleep(600);
expect("contact: drawer opens", await drawerOpen());
await tap(".drawer .d-cta .nav-cta");
await sleep(1500);
expect("contact: still on /contact", (await path()) === "/contact", await path());
expect("contact: drawer closed after the tap", !(await drawerOpen()));
const formTop = await page.eval(`Math.round(document.getElementById("send-a-message").getBoundingClientRect().top)`);
expect("contact: form section scrolled to the top of the screen", formTop >= -4 && formTop <= 130, `top ${formTop}px`);

// 3. every other "See If It's a Fit" on the homepage
await page.goto(`${BASE}/`, { settle: 900 });
// Every rendered one outside the drawer and the bottom bar (the desktop
// header button is display:none at this width and is skipped).
const SPOTS = `[...document.querySelectorAll("a, button")].filter(e => e.textContent.trim().startsWith(${JSON.stringify(LABEL)}) && !e.closest(".drawer") && !e.closest(".cta-bar") && e.getBoundingClientRect().width > 0)`;
const spots = JSON.parse(
  await page.eval(`JSON.stringify(${SPOTS}.map((e, i) => ({ i, where: e.closest("header") ? "header" : (e.closest("section")?.className.split(" ").find(c => c !== "sec" && c !== "wrap") || "page"), href: e.getAttribute("href") })))`)
);
expect("home: found the hero, stage and final-band buttons", spots.length >= 3, JSON.stringify(spots.map((s) => s.where)));
for (const s of spots) {
  await page.goto(`${BASE}/`, { settle: 900 });
  await page.eval(`(() => { const e = ${SPOTS}[${s.i}]; e.setAttribute("data-cta-check", "t"); e.scrollIntoView({ block: "center", behavior: "instant" }); return 1; })()`);
  await sleep(500);
  const visible = await page.eval(`(() => { const e = document.querySelector('[data-cta-check="t"]'); const b = e.getBoundingClientRect(); const top = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2); return !!top && (top === e || e.contains(top)); })()`);
  expect(`home: "${LABEL}" in ${s.where} is on top where tapped`, visible);
  await tap('[data-cta-check="t"]');
  await sleep(1500);
  expect(`home: "${LABEL}" in ${s.where} goes to /contact`, (await path()) === "/contact", await path());
}
// the sticky bottom bar, which exists once the hero has scrolled past
await page.goto(`${BASE}/`, { settle: 900 });
await page.eval(`(() => { const h = document.querySelector(".hero"); window.scrollTo({ top: h.getBoundingClientRect().bottom + window.scrollY + 120, behavior: "instant" }); return 1; })()`);
await sleep(900);
const barOn = await page.eval(`document.querySelector(".callbar-layer")?.dataset.on === "true"`);
expect("home: sticky bottom bar shows after the hero", barOn);
if (barOn) {
  await tap(".cta-bar .cta-bar-btn");
  await sleep(1500);
  expect("home: sticky bottom bar CTA goes to /contact", (await path()) === "/contact", await path());
}

await chrome.close();
console.log(failures.length ? `\n✗ ${failures.length} failure(s)` : `\n✓ every "See If It's a Fit" works at 390`);
process.exit(failures.length ? 1 : 0);
