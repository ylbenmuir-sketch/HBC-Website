/**
 * The six drawing-week hype DRAFTS, rendered with the real giveaway email
 * template (lib/email/templates.ts: page, footer, colors, the dark-mode
 * classes) so Ben can see them before anything is built.
 *
 *   node scripts/render-hype-previews.mjs
 *
 * Writes docs/hype-previews/ (git-ignored):
 *   h1-mon … h6-sat .html / .txt          the email
 *   h1-mon-600.png, h1-mon-375.png …      screenshots (desktop 600, phone 375)
 *   prize-photo-placeholder.png           the photo slot until there's a photo
 *   index.html                            all six side by side
 *
 * Layout: rev 3 (Ben's mockup, 2026-11-03). The body is ONLY:
 *   countdown badge + $2,838.85 + "Grand prize · Saturday 5 PM"
 *   prize photo (full card width)
 *   one bold opener (≤ 8 words)
 *   the 5-item checklist, every day
 *   "Tomorrow · Noon" row with a short prize name and value (Mon–Thu)
 *   "You have {n} entries", the button, one hint line
 * The countdown is calendar days to Sat Nov 21 (Mon 5 … Fri TOMORROW, Sat
 * TODAY), checked against the drawing date in config.
 *
 * Sample data: 4 entries and a sample share link. Nothing is sent; the
 * engine is untouched. Every dollar figure is checked against config.
 */

import { registerHooks } from "node:module";
import { mkdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

registerHooks({
  resolve(spec, ctx, next) {
    const local = !ctx.parentURL?.includes("/node_modules/");
    if (local && spec.startsWith(".") && !/\.(ts|tsx|js|mjs|cjs|json)$/.test(spec)) return next(`${spec}.ts`, ctx);
    return next(spec, ctx);
  },
});

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "docs/hype-previews");
mkdirSync(OUT, { recursive: true });

const T = await import(`${ROOT}/lib/email/templates.ts`);
const { escapeHtml: esc } = await import(`${ROOT}/lib/email/format.ts`);
const GC = await import(`${ROOT}/lib/giveaway/config.ts`);
const { SHARED } = await import(`${ROOT}/lib/giveaway/copy.ts`);
const { DBA_NAME } = await import(`${ROOT}/lib/sms-consent.ts`);
const { REGISTERED_ADDRESS_LINE } = await import(`${ROOT}/lib/sms-identity.ts`);
const { launch } = await import(`${ROOT}/scripts/layout/cdp.mjs`);
const { C, SANS } = T;

// ── Sample data ──
const N = 4;
const SHARE = "https://harmonizedbraincenterstn.com/10years?ref=HBC-K7M2PQ";
const UNSUB = "https://harmonizedbraincenterstn.com/unsubscribe?t=SAMPLE";
const identityLine = `${DBA_NAME} · ${REGISTERED_ADDRESS_LINE}`;

// ── Facts, from config ──
const usd = (n) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const value = (slot) => usd(GC.prizeRetailUsd(GC.prizeFor(slot)));
const GRAND = value("grand");
if (GRAND !== "$2,838.85") throw new Error(`grand prize is ${GRAND} in config`);

/** Calendar days (Central) from a send to the grand drawing. */
const grandAt = GC.drawing("grand").at;
const dayNo = (d) => {
  const p = GC.centralParts(d);
  return Date.UTC(p.year, p.month - 1, p.day) / 86_400_000;
};
const badgeFor = (sendAt) => {
  const n = dayNo(grandAt) - dayNo(sendAt);
  return n === 0 ? "TODAY" : n === 1 ? "TOMORROW" : `${n} DAYS`;
};

// ── Pieces ──
const PHOTO = "prize-photo-placeholder.png"; // swap for the real photo's URL
const CHECKLIST = ["Brain Map", "12 LENS sessions + vibro chair", "Hoolest VeRelief", "3 lymphatic therapy sessions", "3 BrainMD bottles"];
const BUTTON = "Share and get 3 more entries";
const HINT_DEFAULT = "Each friend who enters adds 3 to yours.";

const heroRow = (badge) =>
  `<tr><td class="hbc-panel" align="center" bgcolor="${C.ivory}" style="background:${C.ivory};padding:18px 20px 16px;text-align:center;">` +
  `<span style="display:inline-block;background:${C.goldInk};color:${C.white};font-family:${SANS};font-size:13px;font-weight:700;letter-spacing:0.16em;line-height:1;padding:7px 12px 7px 14px;border-radius:3px;">${esc(badge)}</span>` +
  `<div class="hbc-name" style="font-family:${SANS};font-size:46px;font-weight:800;color:${C.navy};line-height:1.05;letter-spacing:-0.02em;padding-top:12px;">${esc(GRAND)}</div>` +
  `<div class="hbc-muted" style="font-family:${SANS};font-size:16px;color:${C.slate};line-height:1.3;padding-top:6px;letter-spacing:0.01em;">Grand prize · Saturday 5 PM</div>` +
  `</td></tr>`;

const photoRow = () =>
  `<tr><td style="padding:0;font-size:0;line-height:0;"><img src="${PHOTO}" width="558" alt="The grand prize" style="display:block;width:100%;max-width:558px;height:auto;border:0;"></td></tr>`;

const opener = (t) => `<div class="hbc-name" style="font-family:${SANS};font-size:21px;font-weight:700;color:${C.navy};line-height:1.3;">${esc(t)}</div>`;

const checklist = () =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;">${CHECKLIST.map(
    (item) =>
      `<tr><td valign="top" class="hbc-yes" style="font-family:${SANS};font-size:17px;font-weight:700;color:${C.sageDeep};padding:3px 14px 3px 0;line-height:1.35;">&#10003;</td><td class="hbc-text" style="font-family:${SANS};font-size:17px;color:${C.ink};padding:3px 0;line-height:1.35;">${esc(item)}</td></tr>`
  ).join("")}</table>`;

const tomorrowRow = ([name, slot]) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:16px;border-top:1px solid ${C.line};border-bottom:1px solid ${C.line};"><tr>` +
  `<td valign="middle" style="padding:12px 0;"><div class="hbc-panel-title" style="font-family:${SANS};font-size:13px;font-weight:700;letter-spacing:0.12em;color:${C.goldInk};line-height:1.3;">TOMORROW · NOON</div><div class="hbc-text" style="font-family:${SANS};font-size:16px;color:${C.ink};line-height:1.35;padding-top:2px;">${esc(name)}</div></td>` +
  `<td valign="middle" align="right" class="hbc-name" style="font-family:${SANS};font-size:17px;font-weight:700;color:${C.navy};padding:12px 0 12px 12px;white-space:nowrap;">${esc(value(slot))}</td>` +
  `</tr></table>`;

/** Full-width bulletproof button (the template's hbc-btn class keeps dark mode). */
const shareBlock = (hint) =>
  `<div class="hbc-muted" style="font-family:${SANS};font-size:16px;color:${C.slate};text-align:center;line-height:1.3;padding-bottom:10px;">You have <strong class="hbc-name" style="color:${C.ink};">${N} entries</strong></div>` +
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="hbc-btn" align="center" bgcolor="${C.navy}" style="background:${C.navy};border:1px solid ${C.navy};border-radius:6px;"><a href="${esc(SHARE)}" style="display:block;padding:15px 12px;font-family:${SANS};font-size:18px;font-weight:700;color:${C.white};text-decoration:none;line-height:1.2;text-align:center;">${esc(BUTTON)}</a></td></tr></table>` +
  `<div class="hbc-muted" style="font-family:${SANS};font-size:15px;color:${C.slate};text-align:center;line-height:1.35;padding-top:10px;">${esc(hint)}</div>`;

const foot = () => T.footer([`${esc(identityLine)} · <a href="${UNSUB}" style="color:${C.slate};">${esc(SHARED.unsubscribe)}</a>`]);

// ── The six drafts ──
const ct = (m, d, h) => GC.centralToUtc(2026, m, d, h, 0);
const drafts = [
  {
    file: "h1-mon",
    sendAt: ct(11, 16, 16),
    when: "Mon Nov 16, 4:00 PM",
    subject: `5 days to the ${GRAND} grand prize`,
    preheader: "You're entered. It's drawn Saturday at 5 PM.",
    opener: "Day one is drawn. You're still in.",
    tomorrow: ["Brain Map + Skye Chiro gift + BrainMD", "tue"],
    hint: HINT_DEFAULT,
  },
  {
    file: "h2-tue",
    sendAt: ct(11, 17, 16),
    when: "Tue Nov 17, 4:00 PM",
    subject: `4 days to the ${GRAND} grand prize`,
    preheader: "A friend who joins today is in four drawings.",
    opener: "Two drawings down. You're still in.",
    tomorrow: ["Brain Map + 3 LENS + BrainMD", "wed"],
    hint: HINT_DEFAULT,
  },
  {
    file: "h3-wed",
    sendAt: ct(11, 18, 16),
    when: "Wed Nov 18, 4:00 PM",
    subject: `3 days to the ${GRAND} grand prize`,
    preheader: "Halfway through the week, and you're entered.",
    opener: "Halfway through the week. Still in.",
    tomorrow: ["Brain Map + 3 LENS + Hoolest Mini + BrainMD", "thu"],
    hint: HINT_DEFAULT,
  },
  {
    file: "h4-thu",
    sendAt: ct(11, 19, 16),
    when: "Thu Nov 19, 4:00 PM",
    subject: `2 days to the ${GRAND} grand prize`,
    preheader: "One daily drawing left, then Saturday.",
    opener: "One daily drawing left before Saturday.",
    tomorrow: ["Brain Map + 3 LENS + Amabel coaching + BrainMD", "fri"],
    hint: HINT_DEFAULT,
  },
  {
    file: "h5-fri",
    sendAt: ct(11, 20, 16),
    when: "Fri Nov 20, 4:00 PM",
    subject: `Tomorrow at 5 PM: the ${GRAND} grand prize`,
    preheader: "Friends can still get in before 5 PM tomorrow.",
    opener: "Daily drawings done. Tomorrow's the big one.",
    tomorrow: null,
    hint: "Friends must enter by 5 PM tomorrow.",
  },
  {
    file: "h6-sat",
    sendAt: ct(11, 21, 9),
    when: "Sat Nov 21, 9:00 AM (optional new send)",
    subject: `Today at 5 PM: the ${GRAND} grand prize`,
    preheader: `You're entered with ${N} entries.`,
    opener: "Today's the day. You're entered.",
    tomorrow: null,
    hint: "Friends can enter until 5 PM. Thank-you gift arrives at 7 PM.",
  },
];

const EXPECTED_BADGES = ["5 DAYS", "4 DAYS", "3 DAYS", "2 DAYS", "TOMORROW", "TODAY"];
drafts.forEach((d, i) => {
  d.badge = badgeFor(d.sendAt);
  if (d.badge !== EXPECTED_BADGES[i]) throw new Error(`${d.file}: badge ${d.badge}, expected ${EXPECTED_BADGES[i]}`);
  const words = d.opener.split(/\s+/).length;
  if (words > 8) throw new Error(`${d.file}: opener is ${words} words`);
  // The subject's number must agree with the badge.
  const m = /^(\d+) days/.exec(d.subject);
  if (m && `${m[1]} DAYS` !== d.badge) throw new Error(`${d.file}: subject says ${m[1]} days, badge ${d.badge}`);
});

for (const d of drafts) {
  const body = `${opener(d.opener)}${checklist()}${d.tomorrow ? tomorrowRow(d.tomorrow) : ""}`;
  const rows = [heroRow(d.badge), photoRow(), T.section(body, "20px 24px 0"), T.section(shareBlock(d.hint), "18px 24px 0"), `<tr><td style="height:20px;font-size:0;line-height:0;">&nbsp;</td></tr>`, foot()];
  d.html = T.page({ title: d.subject, preheader: d.preheader, rows });
  d.text = T.textOf([
    `${d.badge} · ${GRAND}`,
    "Grand prize · Saturday 5 PM",
    "",
    d.opener,
    ...CHECKLIST.map((i) => `✓ ${i}`),
    d.tomorrow ? `Tomorrow · Noon: ${d.tomorrow[0]} (${value(d.tomorrow[1])})` : null,
    "",
    `You have ${N} entries`,
    `${BUTTON}: ${SHARE}`,
    d.hint,
    "",
    identityLine,
    `${SHARED.unsubscribe}: ${UNSUB}`,
  ]);
  writeFileSync(join(OUT, `${d.file}.html`), d.html);
  writeFileSync(join(OUT, `${d.file}.txt`), `Subject: ${d.subject}\nPreview: ${d.preheader}\nSends: ${d.when}\n\n${d.text}\n`);
}

const chrome = await launch({ port: 9356 });
const tab = await chrome.newPage();
await tab.init();

// ── The photo placeholder: a striped 2.2:1 image at 2× (1116 × 506) ──
const tmp = mkdtempSync(join(tmpdir(), "hype-ph-"));
writeFileSync(
  join(tmp, "ph.html"),
  `<!doctype html><html><body style="margin:0"><div style="width:1116px;height:506px;display:flex;align-items:center;justify-content:center;background:repeating-linear-gradient(135deg,#efe5d1 0 26px,#f7f1e5 26px 52px);font:500 50px -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#a99d86;">Prize photo</div></body></html>`
);
await tab.setViewport(1116, 506);
await tab.goto(pathToFileURL(join(tmp, "ph.html")).href, { settle: 100 });
writeFileSync(join(OUT, PHOTO), await tab.screenshot({ fullPage: false }));

// ── Screenshots + the first-screen check ──
const sizes = [];
for (const d of drafts) {
  for (const [w, h] of [[600, 900], [375, 812]]) {
    await tab.setViewport(w, h);
    await tab.goto(pathToFileURL(join(OUT, `${d.file}.html`)).href, { settle: 200 });
    await tab.eval(`Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; })))`, { awaitPromise: true });
    const height = await tab.eval(`Math.ceil(document.querySelector("table.hbc-bg").getBoundingClientRect().bottom)`);
    const button = await tab.eval(`Math.ceil(document.querySelector("td.hbc-btn").getBoundingClientRect().bottom)`);
    const sideways = await tab.eval(`document.documentElement.scrollWidth > innerWidth`);
    writeFileSync(join(OUT, `${d.file}-${w}.png`), await tab.screenshot({ fullPage: true }));
    sizes.push({ file: d.file, w, h, height, button, sideways });
  }
}
await chrome.close();

// ── The side-by-side page ──
const card = (d) => `
<article class="col">
  <header class="inbox"><span class="when">${esc(d.when)}</span> · Subject: ${esc(d.subject)}<div class="pre">Preview: ${esc(d.preheader)}</div></header>
  <div class="frame"><iframe src="${d.file}.html" title="${esc(d.subject)}" loading="lazy"></iframe></div>
  <footer class="links"><a href="${d.file}.html">HTML</a> · <a href="${d.file}-600.png">600 png</a> · <a href="${d.file}-375.png">375 png</a> · <a href="${d.file}.txt">text</a></footer>
</article>`;

writeFileSync(
  join(OUT, "index.html"),
  `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Hype Email Drafts</title>
<style>
  :root { --bg:#f4f1ea; --card:#fff; --ink:#1c2b3a; --muted:#5d6b78; --line:#e2dccf; --gold:#7a5d24; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --bg:#11181f; --card:#1a232c; --ink:#f1ece2; --muted:#a9b2ba; --line:#2c3843; --gold:#d2b77c; } }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:15px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  .top { padding:20px 16px 8px; max-width:1100px; }
  h1 { font-size:20px; margin:0 0 4px; }
  .top p { margin:4px 0; color:var(--muted); }
  .toggle { display:inline-flex; border:1px solid var(--line); border-radius:8px; overflow:hidden; margin-top:10px; }
  .toggle button { font:inherit; padding:6px 14px; border:0; background:var(--card); color:var(--ink); cursor:pointer; }
  .toggle button[aria-pressed="true"] { background:var(--ink); color:var(--bg); }
  .row { display:flex; gap:16px; overflow-x:auto; padding:12px 16px 24px; scroll-snap-type:x proximity; }
  .col { flex:0 0 auto; width:calc(var(--w) + 2px); max-width:calc(100vw - 32px); scroll-snap-align:start; display:flex; flex-direction:column; }
  .inbox { color:var(--gold); font-weight:700; font-size:14px; padding:0 2px 8px; min-height:60px; }
  .when { text-transform:uppercase; }
  .pre { color:var(--muted); font-weight:400; }
  .frame { border:1px solid var(--line); border-radius:10px; background:#f4eee1; overflow:hidden; }
  iframe { display:block; border:0; width:var(--w); height:var(--h); }
  .links { font-size:13px; padding:6px 2px; color:var(--muted); }
  .links a { color:inherit; }
</style>
</head>
<body style="--w:375px;--h:900px">
<div class="top">
  <h1>Drawing-week hype emails: drafts, rev 3</h1>
  <p>Six drafts in the real giveaway email template, laid out to Ben's mockup. Sample data: 4 entries, a sample share link. Not built, not sent.</p>
  <p>Mon–Fri replace the words of the 4 PM daily email. Saturday 9 AM would be a new send.</p>
  <div class="toggle" role="group" aria-label="Width">
    <button type="button" data-w="375" data-h="900" aria-pressed="true">Phone 375</button>
    <button type="button" data-w="600" data-h="1000" aria-pressed="false">Desktop 600</button>
  </div>
</div>
<main class="row">${drafts.map(card).join("")}
</main>
<script>
  document.querySelectorAll(".toggle button").forEach((b) => b.addEventListener("click", () => {
    document.body.style.setProperty("--w", b.dataset.w + "px");
    document.body.style.setProperty("--h", b.dataset.h + "px");
    document.querySelectorAll(".toggle button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  }));
</script>
</body>
</html>
`
);

console.log(`hype previews → ${OUT}\n`);
for (const s of sizes)
  console.log(
    `  ${s.sideways ? "✗" : "✓"} ${s.file.padEnd(7)} ${String(s.w).padStart(3)}px: ${s.height}px tall, button bottom ${s.button}px ${s.button <= s.h ? `(on the first ${s.w}×${s.h} screen, ${s.h - s.button}px spare)` : `(${s.button - s.h}px BELOW the first screen)`}${s.sideways ? " — SIDEWAYS SCROLL" : ""}`
  );
for (const d of drafts) console.log(`  ${d.file}: [${d.badge}] ${d.subject} | ${d.preheader}`);
