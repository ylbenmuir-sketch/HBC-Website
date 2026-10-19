/**
 * GIVEAWAY_HIDE_DRAFT_TAGS hides the "[DRAFT] " prefix on screen (local and
 * preview only) and unlocks nothing: COPY_IS_DRAFT stays true and the sender
 * still refuses outside a testing env, whatever the subject says.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";

registerHooks({
  resolve(spec, ctx, next) {
    const local = !ctx.parentURL?.includes("/node_modules/");
    if (local && spec.startsWith(".") && !/\.(ts|tsx|js|mjs|cjs|json)$/.test(spec)) return next(`${spec}.ts`, ctx);
    return next(spec, ctx);
  },
});

// The copy file bakes D() in at import, so the switch goes on first.
process.env.GIVEAWAY_HIDE_DRAFT_TAGS = "1";
process.env.GIVEAWAY_ENV = "local";
delete process.env.RESEND_API_KEY;

const { hideDraftTags } = await import("./draft.ts");
const copy = await import("./copy.ts");
const { sendGiveawayEmail } = await import("./send.ts");

test("hideDraftTags: only with the switch on, and never in production", () => {
  assert.equal(hideDraftTags({}), false);
  assert.equal(hideDraftTags({ GIVEAWAY_HIDE_DRAFT_TAGS: "1" }), true, "local by default");
  assert.equal(hideDraftTags({ GIVEAWAY_HIDE_DRAFT_TAGS: "1", VERCEL_ENV: "preview" }), true);
  assert.equal(hideDraftTags({ GIVEAWAY_HIDE_DRAFT_TAGS: "1", VERCEL_ENV: "production" }), false);
  assert.equal(hideDraftTags({ GIVEAWAY_HIDE_DRAFT_TAGS: "1", GIVEAWAY_ENV: "production" }), false);
  assert.equal(hideDraftTags({ GIVEAWAY_HIDE_DRAFT_TAGS: "0" }), false);
});

test("with the switch on the prefix is gone from the rendered copy, and COPY_IS_DRAFT is still true", () => {
  assert.equal(copy.COPY_IS_DRAFT, true);
  assert.equal(copy.D("Enter me"), "Enter me");
  assert.equal(copy.PAGES.tenYears.liveButton, "Enter me");
  assert.equal(copy.EMAILS.youreIn.subject.startsWith("[DRAFT]"), false);
});

test("the sender still refuses outside a testing env, even with a clean subject", async () => {
  const email = { subject: copy.EMAILS.youreIn.subject, html: "<p>x</p>", text: "x" };
  assert.equal(email.subject.includes("[DRAFT]"), false, "the subject carries no marker — the switch hid it");
  for (const env of ["production", "preview"]) {
    process.env.GIVEAWAY_ENV = env;
    const r = await sendGiveawayEmail({ to: "someone@example.test", email, marketing: false });
    assert.equal(r.status, "failed", env);
    assert.match(r.error, /refusing to send \[DRAFT\] copy/);
  }
  // A testing env may still send (here: not configured, because there is no key — never a real call).
  process.env.GIVEAWAY_ENV = "test";
  const r = await sendGiveawayEmail({ to: "someone@example.test", email, marketing: false });
  assert.equal(r.status, "not_configured");
});
