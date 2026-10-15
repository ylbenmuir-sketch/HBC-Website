/**
 * Every email, rendered with realistic sample data, written to
 * email-previews/ (git-ignored) and screenshotted at 390 and 640 wide in a
 * headless Chrome — then measured: each must fit a 390×844 phone screen
 * without scrolling (Ben, 2026-10-14).
 *
 *   npm run preview:emails
 *
 * Nothing is sent. The templates are pure (lib/email/templates.ts); this
 * calls them directly, with a fixed "now" so the CT timestamp is stable.
 *
 * The 390-wide check measures the email's own document. A mail app adds its
 * header (sender, subject) above it — the report prints the height so the
 * margin left for that is visible, not assumed.
 */

import { registerHooks } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// lib/ imports are extensionless; append ".ts" for local specifiers only
// (the same hook scripts/answer-audit.mjs uses).
registerHooks({
  resolve(spec, ctx, next) {
    const local = !ctx.parentURL?.includes("/node_modules/");
    if (local && spec.startsWith(".") && !/\.(ts|tsx|js|mjs|cjs|json)$/.test(spec)) {
      return next(`${spec}.ts`, ctx);
    }
    return next(spec, ctx);
  },
});

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "email-previews");
mkdirSync(OUT, { recursive: true });

const T = await import(`${ROOT}/lib/email/templates.ts`);
const { visitorContent } = await import(`${ROOT}/lib/email/visitor-content.ts`);
const { notificationSubject } = await import(`${ROOT}/lib/lead-routing.ts`);
const { replySubject } = await import(`${ROOT}/lib/email/format.ts`);
const { launch } = await import(`${ROOT}/scripts/layout/cdp.mjs`);

/** Wed Oct 14 2026, 11:13 AM in Nashville. */
const NOW = new Date("2026-10-14T16:13:00Z");
const ROW = "4f0c2a91-7d3e-4b8a-9c51-2e6f8d0b7a13";
const SAVED = {
  rowId: ROW,
  url: `https://supabase.com/dashboard/project/brwyfneahhhkymytkvpx/editor/17487?filter=${encodeURIComponent(`id:eq:${ROW}`)}`,
};
const none = { helpingWho: null, concerns: [], note: null, referredBy: null };

const nashvilleForm = {
  source: "form",
  intent: "book",
  name: "Sarah Mitchell",
  phone: "6155550134",
  email: "sarah.mitchell@gmail.com",
  preferredCenter: "Nashville",
  bestTime: "Any time",
  smsConsent: true,
  sourcePage: "/concerns/adhd",
  details: none,
  honeypotFilled: false,
};
const boroChat = {
  source: "chat",
  intent: "book",
  name: "Marcus Reed",
  phone: "(615) 555-0188",
  email: "mreed@icloud.com",
  preferredCenter: "Murfreesboro",
  bestTime: "Afternoon",
  smsConsent: false,
  sourcePage: "/locations/murfreesboro",
  details: {
    helpingWho: "My child",
    concerns: [],
    note: "My son is 9 — homework takes hours and ends in tears most nights.",
    referredBy: null,
  },
  honeypotFilled: false,
};
const pageTwo = {
  ...nashvilleForm,
  details: {
    helpingWho: "My child",
    concerns: ["Focus & ADHD", "Sleep"],
    note: "Mornings are hard and bedtime is a battle. Her teacher suggested we look into this.",
    referredBy: "Dr. Patel, Vanderbilt Pediatrics",
  },
};

const subjectFor = (lead, route) =>
  notificationSubject({ route, source: lead.source, preferredCenter: lead.preferredCenter, name: lead.name, email: lead.email });

const emails = [
  {
    file: "1-staff-nashville-form",
    subject: subjectFor(nashvilleForm, "nashville"),
    ...T.staffNotification({ lead: nashvilleForm, route: "nashville", envVar: "LEADS_NASHVILLE", saved: SAVED, now: NOW }),
  },
  {
    file: "2-staff-murfreesboro-chat",
    subject: subjectFor(boroChat, "murfreesboro"),
    ...T.staffNotification({ lead: boroChat, route: "murfreesboro", envVar: "LEADS_MURFREESBORO", saved: SAVED, now: NOW }),
  },
  {
    file: "3-page-two-update",
    subject: replySubject(subjectFor(pageTwo, "nashville")),
    ...T.detailsUpdate({ lead: pageTwo, route: "nashville", envVar: "LEADS_NASHVILLE", saved: SAVED, now: NOW, originalSent: true }),
  },
  {
    file: "3b-page-two-update-original-failed",
    subject: subjectFor(pageTwo, "nashville"),
    ...T.detailsUpdate({ lead: pageTwo, route: "nashville", envVar: "LEADS_NASHVILLE", saved: SAVED, now: NOW, originalSent: false }),
  },
  {
    file: "4-visitor-confirmation",
    subject: T.VISITOR_SUBJECT,
    ...T.visitorConfirmation(visitorContent("Sarah Mitchell", "nashville")),
  },
  {
    file: "5-guide-download",
    subject: notificationSubject({ route: "guide", source: "form", preferredCenter: null, name: null, email: "jlee.family@gmail.com" }),
    ...T.guideNotification({ email: "jlee.family@gmail.com", guideTitle: "Why regulation fails", sourcePage: "/resources/homework-battles", envVar: "LEADS_GUIDE", route: "guide", saved: SAVED, now: NOW }),
  },
];

// The visitor email's thumbnail is an absolute URL on the live domain
// (lib/email/visitor-content.ts), which may not serve it yet; the preview
// loads the committed file instead, so the image is measured at its real
// height.
const { SITE_URL } = await import(`${ROOT}/lib/site-config.ts`);
const localAssets = (html) => html.replaceAll(`${SITE_URL}/email/`, pathToFileURL(join(ROOT, "public/email")).href + "/");

for (const e of emails) {
  writeFileSync(join(OUT, `${e.file}.html`), localAssets(e.html));
  writeFileSync(join(OUT, `${e.file}.txt`), `Subject: ${e.subject}\n\n${e.text}\n`);
}

const chrome = await launch({ port: 9355 });
const page = await chrome.newPage();
await page.init();
const results = [];
for (const e of emails) {
  const url = pathToFileURL(join(OUT, `${e.file}.html`)).href;
  for (const width of [390, 640]) {
    await page.setViewport(width, 844);
    await page.goto(url, { settle: 200 });
    await page.eval(`Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; })))`);
    // The email's own extent — scrollHeight would report the viewport.
    const height = await page.eval(`Math.ceil(document.querySelector("table.hbc-bg").getBoundingClientRect().bottom)`);
    const overflowX = await page.eval(`document.documentElement.scrollWidth > innerWidth`);
    writeFileSync(join(OUT, `${e.file}-${width}.png`), await page.screenshot({ fullPage: true }));
    results.push({ file: e.file, width, height, overflowX });
  }
}
// Dark mode, once each at 390 (Apple Mail honours prefers-color-scheme).
await page.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });
for (const e of emails) {
  await page.setViewport(390, 844);
  await page.goto(pathToFileURL(join(OUT, `${e.file}.html`)).href, { settle: 200 });
  writeFileSync(join(OUT, `${e.file}-390-dark.png`), await page.screenshot({ fullPage: true }));
}
await chrome.close();

let failed = 0;
console.log(`email previews → ${OUT}\n`);
for (const r of results) {
  const fits = r.width !== 390 || r.height <= 844;
  if (!fits || r.overflowX) failed += 1;
  console.log(
    `  ${fits && !r.overflowX ? "✓" : "✗"} ${r.file.padEnd(36)} ${String(r.width).padStart(3)}px wide: ${r.height}px tall${r.width === 390 ? ` (${844 - r.height}px to spare on 844)` : ""}${r.overflowX ? " — SIDEWAYS SCROLL" : ""}`
  );
}
if (failed) {
  console.log(`\n${failed} preview(s) do not fit.`);
  process.exit(1);
}
console.log("\n✓ every email fits a 390×844 screen without scrolling, and none scrolls sideways.");
