// Unit tests for lib/murfreesboro.ts (Ben, 2026-11-22): the Murfreesboro ad
// page keeps /start's headline codes, its own default headline, the exact
// button, quiet line and guarantee, an inline form with three required
// fields, and none of the words the page may not use.
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
const { assistantSuppressedOn, MOBILE_BAR_SUPPRESSED_ROUTES, REVIEWS, REVIEW_COUNT_ROUNDED } = await import("./site-config.ts");

test("no code, g1 or an unknown code gets the page's own headline; an ad's code gets /start's line", () => {
  for (const h of [undefined, "", "g1", "zz9", "anxiety", ["k1"]]) assert.equal(M.murfreesboroHook(h), M.MURFREESBORO_DEFAULT_HOOK, String(h));
  assert.equal(M.MURFREESBORO_DEFAULT_HOOK.lead, "See which parts of your brain are in overdrive, and which are running low.");
  assert.equal(M.MURFREESBORO_DEFAULT_HOOK.tail, "And what to do about it.");
  assert.equal(M.MURFREESBORO_DEFAULT_HOOK.headline, "See which parts of your brain are in overdrive, and which are running low. And what to do about it.");
  for (const [code, hook] of Object.entries(START_HOOKS)) {
    if (code !== "g1") assert.equal(M.murfreesboroHook(code), hook, code);
  }
});

test("the offer's exact words", () => {
  assert.equal(START_OFFER.button, "Request My Consultation");
  assert.equal(M.MURFREESBORO_OFFER.eyebrow, "Murfreesboro · Brain Map Session");
  assert.equal(M.MURFREESBORO_OFFER.sub, "A 60-minute Brain Map. You leave with your map and a written plan.");
  assert.equal(M.MURFREESBORO_OFFER.quiet, "$150 · 60 minutes · ★ 5.0 from 160+ Google reviews");
  assert.equal(M.MURFREESBORO_OFFER.guarantee, "If we don’t deliver the map and the written plan, you don’t pay.");
  assert.equal(M.MURFREESBORO_OFFER.formSub, "We’ll call to find a time that works for you.");
});

test("the review figures in the quiet line are the site's own constants", () => {
  assert.ok(M.MURFREESBORO_OFFER.quiet.includes(`★ ${REVIEWS.value.rating} from ${REVIEW_COUNT_ROUNDED} Google reviews`));
});

test("nothing under the hero: no bullets, no placeholder words", () => {
  assert.equal("MURFREESBORO_BULLETS" in M, false);
  assert.equal("soon" in M.BRAIN_MAP_VIDEO, false);
});

test("words the page may not use", () => {
  const all = [M.MURFREESBORO_DEFAULT_HOOK.headline, ...Object.values(M.MURFREESBORO_OFFER), M.BRAIN_MAP_VIDEO.title, M.BRAIN_MAP_VIDEO.posterAlt].join(" ").toLowerCase();
  for (const w of ["clarity session", "book my brain map", "rowney", "nashville", "cure", "diagnos", "treat", "coming soon"]) assert.equal(all.includes(w), false, w);
});

test("the path is a place name: the pixel's exact path, no assistant, no phone bar", () => {
  assert.equal(M.MURFREESBORO_AD_PATH, "/murfreesboro");
  assert.equal(metaAllowedPath("/murfreesboro"), true);
  assert.equal(metaAllowedPath("/murfreesboro/x"), false);
  assert.equal(assistantSuppressedOn("/murfreesboro"), true);
  assert.equal(MOBILE_BAR_SUPPRESSED_ROUTES.includes("/murfreesboro"), true);
});

test("the frame ships as the poster with its badge title, until a clip exists", () => {
  assert.equal(M.BRAIN_MAP_VIDEO.poster, "/images/map-points.jpg");
  assert.equal(M.BRAIN_MAP_VIDEO.title, "What is a Brain Map?");
  // When the clip is recorded this is the test to update, with the paths.
  assert.equal(M.BRAIN_MAP_VIDEO.src, null);
});

// The page's structure, read from its source: one centered column, the
// form inline under the frame — locked to one center, all three fields
// required — and no button-and-dialog, no steps, no bullets.
test("the page: an inline form under the frame, locked and all-required; no dialog, steps or bullets", () => {
  const page = readFileSync(new URL("../app/murfreesboro/page.tsx", import.meta.url), "utf8");
  assert.match(page, /<ContactForm/);
  assert.match(page, /lockedCenter="Murfreesboro"/);
  assert.match(page, /\n\s+requireAll\n/);
  assert.match(page, /formHeading: null/);
  assert.match(page, /quiet: MURFREESBORO_OFFER\.quiet/);
  assert.match(page, /guarantee: MURFREESBORO_OFFER\.guarantee/);
  // The frame comes before the form.
  assert.ok(page.indexOf("<BrainMapVideo") < page.indexOf("<ContactForm"));
  assert.equal(/RequestDialog|REQUEST_ANCHOR|mb-cta|stepped|mb-points|MURFREESBORO_BULLETS|<ul|<li/.test(page), false);
  assert.equal((page.match(/<h1>/g) ?? []).length, 1);
  assert.equal(existsSync(new URL("../components/RequestDialog.tsx", import.meta.url)), false);
});

test("the form: three required fields on this page, no steps, consent unticked and never required", () => {
  const form = readFileSync(new URL("../components/ContactForm.tsx", import.meta.url), "utf8");
  assert.ok(form.includes('"Please add your phone number."'));
  assert.ok(form.includes('"Please add your email."'));
  // The email field is on the page whenever all three are required: no "optional" link.
  assert.match(form, /const showEmail = !isStart \|\| requireAll \|\|/);
  assert.equal(/Step 1 of 2|Step 2 of 2|mb-steps|mb-back|mb-continue|What’s your name\?/.test(form), false);
  // One consent label, unticked by default, with no `required` on its box.
  assert.equal((form.match(/FORM_CONSENT_LABEL\}/g) ?? []).length, 1);
  assert.match(form, /const \[smsConsent, setSmsConsent\] = useState\(false\)/);
  const box = form.slice(form.indexOf('id="sms-consent"'), form.indexOf("<label htmlFor=\"sms-consent\">"));
  assert.equal(/required/.test(box), false);
});

test("nothing typed in the form reaches Meta: the Lead call carries an event id and nothing else", () => {
  const form = readFileSync(new URL("../components/ContactForm.tsx", import.meta.url), "utf8");
  assert.match(form, /trackMetaLead\(metaEventId\);/);
  assert.equal((form.match(/trackMetaLead\(/g) ?? []).length, 1);
});
