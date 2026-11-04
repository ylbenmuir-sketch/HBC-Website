/**
 * The six drawing-week countdown emails, rendered by the REAL builder
 * (lib/giveaway/emails.ts hypeEmail — the one the Mon–Fri 4 pm and Sat
 * 9 am jobs send), with sample data, for Ben to look at.
 *
 *   node scripts/render-hype-previews.mjs
 *
 * Writes docs/hype-previews/ (git-ignored):
 *   h1-mon … h6-sat .html / .txt          the email
 *   h1-mon-600.png, h1-mon-375.png …      screenshots (desktop 600, phone 375)
 *   index.html                            all six side by side
 *
 * And checks: the share button ends on the first 375×812 screen, nothing
 * scrolls sideways. Exit 1 if not. Nothing is sent. The [DRAFT] prefix is
 * hidden here as on the showcase (the engine is off locally).
 */

import { registerHooks } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
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

const G = await import(`${ROOT}/lib/giveaway/emails.ts`);
const GC = await import(`${ROOT}/lib/giveaway/config.ts`);
const { escapeHtml: esc } = await import(`${ROOT}/lib/email/format.ts`);
const { DBA_NAME } = await import(`${ROOT}/lib/sms-consent.ts`);
const { REGISTERED_ADDRESS_LINE } = await import(`${ROOT}/lib/sms-identity.ts`);
const { launch } = await import(`${ROOT}/scripts/layout/cdp.mjs`);

// ── Sample data ──
const N = 4;
const footing = {
  identityLine: `${DBA_NAME} · ${REGISTERED_ADDRESS_LINE}`,
  siteUrl: "https://harmonizedbraincenterstn.com",
  unsubscribeUrl: "https://harmonizedbraincenterstn.com/unsubscribe?t=SAMPLE",
};
const referralUrl = "https://harmonizedbraincenterstn.com/10years?ref=HBC-K7M2PQ";

const drafts = G.HYPE_DAYS.map((day, i) => {
  const e = G.hypeEmail({ day, entries: N, referralUrl, footing });
  const when = GC.formatCentralLabel(G.hypeSendAt(day)).replace(/ CT$/, "");
  return { day, file: `h${i + 1}-${day}`, when, ...e };
});

for (const d of drafts) {
  writeFileSync(join(OUT, `${d.file}.html`), d.html);
  writeFileSync(join(OUT, `${d.file}.txt`), `Subject: ${d.subject}\nPreview: ${d.preheader}\nSends: ${d.when} CT\n\n${d.text}\n`);
}

const chrome = await launch({ port: 9356 });
const tab = await chrome.newPage();
await tab.init();
const sizes = [];
for (const d of drafts) {
  for (const [w, h] of [[600, 900], [375, 812]]) {
    await tab.setViewport(w, h);
    await tab.goto(pathToFileURL(join(OUT, `${d.file}.html`)).href, { settle: 200 });
    const height = await tab.eval(`Math.ceil(document.documentElement.scrollHeight)`);
    const button = await tab.eval(`Math.ceil(document.querySelector("td.hbc-btn").getBoundingClientRect().bottom)`);
    const sideways = await tab.eval(`document.documentElement.scrollWidth > innerWidth`);
    writeFileSync(join(OUT, `${d.file}-${w}.png`), await tab.screenshot({ fullPage: true }));
    sizes.push({ file: d.file, w, h, height, button, sideways });
  }
}
await chrome.close();

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
<title>Countdown Emails</title>
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
  .frame { border:1px solid var(--line); border-radius:10px; overflow:hidden; }
  iframe { display:block; border:0; width:var(--w); height:var(--h); }
  .links { font-size:13px; padding:6px 2px; color:var(--muted); }
  .links a { color:inherit; }
</style>
</head>
<body style="--w:375px;--h:1000px">
<div class="top">
  <h1>Drawing-week countdown emails</h1>
  <p>Rendered by the real email builder with sample data: 4 entries, a sample share link. Mon–Fri replace the 4 PM daily email; Saturday 9 AM is the new send.</p>
  <div class="toggle" role="group" aria-label="Width">
    <button type="button" data-w="375" data-h="1000" aria-pressed="true">Phone 375</button>
    <button type="button" data-w="600" data-h="1120" aria-pressed="false">Desktop 600</button>
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

let bad = 0;
console.log(`countdown email previews → ${OUT}\n`);
for (const s of sizes) {
  const fold = s.w !== 375 || s.button <= s.h;
  if (!fold || s.sideways) bad++;
  console.log(
    `  ${fold && !s.sideways ? "✓" : "✗"} ${s.file.padEnd(7)} ${String(s.w).padStart(3)}px: ${s.height}px tall, button bottom ${s.button}px ${s.button <= s.h ? `(first ${s.w}×${s.h} screen, ${s.h - s.button}px spare)` : `(${s.button - s.h}px BELOW the first ${s.w}×${s.h} screen)`}${s.sideways ? " — SIDEWAYS SCROLL" : ""}`
  );
}
for (const d of drafts) console.log(`  ${d.file}: ${d.subject} | ${d.preheader}`);
if (bad) process.exit(1);
