// Unit tests for lib/murfreesboro.ts (Ben, 2026-11-22; the two-column page
// 2026-11-23): the Murfreesboro ad page keeps /start's headline codes, its
// own default headline, the exact button, card lines and guarantee, a form
// card with three required fields, and none of the words the page may not
// use.
// Run: npm test   (plain `node --test`; Node strips the types from the .ts)

import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { existsSync, readFileSync } from "node:fs";

registerHooks({
  resolve(spec, ctx, next) {
    const local = !ctx.parentURL?.includes("/node_modules/");
    if (local && spec.startsWith(".") && !/\.(ts|tsx|js|mjs|cjs|json)$/.test(spec)) return next(`${spec}.ts`, ctx);
    return next(spec, ctx);
  },
});

const M = await import("./murfreesboro.ts");
const { START_HOOKS, START_OFFER } = await import("./start.ts");
const { metaAllowedPath } = await import("./meta.ts");
const { assistantSuppressedOn, MOBILE_BAR_SUPPRESSED_ROUTES, REVIEWS, REVIEW_COUNT_ROUNDED, HSA_FSA_ACCEPTED, BRAIN_MAP_PRICE_USD } = await import("./site-config.ts");

const O = M.MURFREESBORO_OFFER;
const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("no code, g1 or an unknown code gets the page's own headline; an ad's code gets /start's line", () => {
  for (const h of [undefined, "", "g1", "zz9", "anxiety", ["k1"]]) assert.equal(M.murfreesboroHook(h), M.MURFREESBORO_DEFAULT_HOOK, String(h));
  assert.equal(M.MURFREESBORO_DEFAULT_HOOK.lead, "See which parts of your brain are in overdrive,");
  assert.equal(M.MURFREESBORO_DEFAULT_HOOK.tail, "and which are running low.");
  assert.equal(M.MURFREESBORO_DEFAULT_HOOK.headline, "See which parts of your brain are in overdrive, and which are running low.");
  for (const [code, hook] of Object.entries(START_HOOKS)) {
    if (code !== "g1") assert.equal(M.murfreesboroHook(code), hook, code);
  }
});

test("the left column's exact words", () => {
  assert.deepEqual(O.eyebrow, ["Murfreesboro, TN", "The Brain Map Session"]);
  assert.equal(O.sub, "Feeling foggy, wired, or worn out? In one 60-minute session, we record your brain’s activity, walk you through your map, and give you a written plan to keep.");
  assert.equal(O.photoChip, "A gentle recording. A real conversation.");
  assert.equal(O.keep.brand, "Harmonized");
  assert.equal(O.keep.tag, "Yours to keep");
  assert.deepEqual(O.keep.title, ["Your map.", "Your next steps."]);
  assert.deepEqual(O.keep.lines, ["Your brain’s activity", "Explained in plain English", "A personalized written plan"]);
  assert.equal(O.keep.mapLabel, "Illustrative map");
});

test("the form card's exact words", () => {
  assert.equal(START_OFFER.button, "Request My Consultation");
  assert.equal(O.card.eyebrow, "Your first step");
  assert.equal(O.card.pill, "60 minutes");
  assert.equal(O.card.title, "Start with a Brain Map.");
  assert.equal(O.card.price, "$150");
  assert.equal(O.card.priceWhat, "Your Brain Map + written plan");
  assert.equal(O.card.priceNote, "HSA & FSA accepted");
  assert.equal(O.card.formSub, "We’ll call to arrange your session and answer your questions. No payment today.");
  assert.deepEqual(Object.values(O.card.fields).map((f) => f.label), ["Full name", "Phone number", "Email address"]);
  assert.equal(O.card.quiet, "No payment today. No commitment to a package.");
  assert.equal(O.card.guarantee, "If we don’t deliver the map and the written plan, you don’t pay.");
});

test("the three reassurances", () => {
  assert.deepEqual(O.points, [
    { title: "Gentle. Nothing to perform.", text: "Small sensors record your brain’s activity. You simply sit comfortably." },
    { title: "Answers you can understand.", text: "We explain your map in plain language and give you a written plan to keep." },
    { title: "You choose what happens next.", text: "Ask every question. Take your plan home. Decide at your own pace." },
  ]);
});

test("price, reviews and HSA/FSA are the site's own constants", () => {
  assert.equal(O.card.price, `$${BRAIN_MAP_PRICE_USD}`);
  assert.equal(O.card.priceNote, HSA_FSA_ACCEPTED);
  assert.equal(O.reviews.rating, REVIEWS.value.rating);
  assert.equal(O.reviews.text, `from ${REVIEW_COUNT_ROUNDED} Google reviews`);
  assert.equal(`${O.reviews.rating} ${O.reviews.text}`, "5.0 from 160+ Google reviews");
});

test("words the page may not use", () => {
  const all = JSON.stringify([M.MURFREESBORO_DEFAULT_HOOK, O, M.MURFREESBORO_PHOTO]).toLowerCase();
  for (const w of ["visit", "clarity session", "book my brain map", "sheri", "rowney", "nashville", "cure", "diagnos", "treat", "coming soon", "design preview"]) assert.equal(all.includes(w), false, w);
  const page = read("../app/murfreesboro/page.tsx");
  const body = page.slice(page.indexOf("export default"));
  for (const w of ["Sheri", "Rowney", "Nashville", "Clarity Session", "Design preview"]) assert.equal(body.includes(w), false, w);
});

test("the path is a place name: the pixel's exact path, no assistant, no phone bar", () => {
  assert.equal(M.MURFREESBORO_AD_PATH, "/murfreesboro");
  assert.equal(metaAllowedPath("/murfreesboro"), true);
  assert.equal(metaAllowedPath("/murfreesboro/x"), false);
  assert.equal(assistantSuppressedOn("/murfreesboro"), true);
  assert.equal(MOBILE_BAR_SUPPRESSED_ROUTES.includes("/murfreesboro"), true);
});

test("the photo is a real HBC file in /public", () => {
  assert.equal(M.MURFREESBORO_PHOTO.src, "/images/session-wide.jpg");
  assert.equal(existsSync(new URL(`../public${M.MURFREESBORO_PHOTO.src}`, import.meta.url)), true);
});

// The page's structure, read from its source: copy, photo, then the form
// card — locked to one center, all three fields required — then the three
// reassurances. No dialog, no video slot, no bottom band.
test("the page: copy, photo, form card, reassurances; noindex; no dialog, band or JSON-LD", () => {
  const page = read("../app/murfreesboro/page.tsx");
  assert.match(page, /robots: \{ index: false, follow: false, nocache: true \}/);
  assert.match(page, /lockedCenter="Murfreesboro"/);
  assert.match(page, /\n\s+requireAll\n/);
  assert.match(page, /formHeading: null/);
  assert.match(page, /fields: o\.card\.fields/);
  assert.match(page, /quiet: o\.card\.quiet/);
  assert.match(page, /guarantee: o\.card\.guarantee/);
  // Phone order: the headline, the sentence and the photo come before the form.
  const at = (s) => { const i = page.indexOf(s); assert.notEqual(i, -1, s); return i; };
  assert.ok(at("<h1>") < at('className="mb-sub"'));
  assert.ok(at('className="mb-sub"') < at("<Image"));
  assert.ok(at("<Image") < at("<ContactForm"));
  assert.ok(at("<ContactForm") < at('className="mb-points"'));
  // The reviews row links to the center's own listing, read from its record.
  assert.match(page, /getLocation\("murfreesboro"\)\?\.reviewReadUrl/);
  assert.equal(/RequestDialog|BrainMapVideo|REQUEST_ANCHOR|mb-cta|mb-band|ld\+json|<video|<iframe/.test(page), false);
  assert.equal((page.match(/<h1>/g) ?? []).length, 1);
  assert.equal(existsSync(new URL("../components/RequestDialog.tsx", import.meta.url)), false);
});

test("the footer: name, address, phone, disclaimer, ©, Privacy and SMS Terms — no hours", () => {
  const footer = read("../components/MurfreesboroFooter.tsx");
  for (const s of ["DBA_NAME", "a.streetAddress", "locationPhone(center)", "{DISCLAIMER}", "&copy;", "PRIVACY_PATH", "SMS_TERMS_PATH"]) assert.ok(footer.includes(s), s);
  assert.equal(/formattedHours/.test(footer), false);
});

test("the form: three required fields on this page, no steps, consent unticked and never required", () => {
  const form = read("../components/ContactForm.tsx");
  assert.ok(form.includes('"Please add your phone number."'));
  assert.ok(form.includes('"Please add your email."'));
  // The email field is on the page whenever all three are required: no "optional" link.
  assert.match(form, /const showEmail = !isStart \|\| requireAll \|\|/);
  assert.match(form, /className="start-pair"/);
  assert.equal(/Step 1 of 2|Step 2 of 2|mb-steps|mb-back|mb-continue|What’s your name\?/.test(form), false);
  // One consent label, unticked by default, with no `required` on its box.
  assert.equal((form.match(/FORM_CONSENT_LABEL\}/g) ?? []).length, 1);
  assert.match(form, /const \[smsConsent, setSmsConsent\] = useState\(false\)/);
  const box = form.slice(form.indexOf('id="sms-consent"'), form.indexOf("<label htmlFor=\"sms-consent\">"));
  assert.equal(/required/.test(box), false);
});

test("nothing typed in the form reaches Meta: the Lead call carries an event id and nothing else", () => {
  const form = read("../components/ContactForm.tsx");
  assert.match(form, /trackMetaLead\(metaEventId\);/);
  assert.equal((form.match(/trackMetaLead\(/g) ?? []).length, 1);
});
