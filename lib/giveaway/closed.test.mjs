/**
 * The giveaway is closed for good (Ben, 2026-11-23; lib/giveaway/engine.ts):
 * the switch is on by default and always on the production deployment; no
 * entrant email leaves; no free-first-visit code is accepted or even looked
 * up; the closed message is Ben's words.
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

process.env.GIVEAWAY_ENV = "test";
process.env.GIVEAWAY_ENGINE_ENABLED = "1";
delete process.env.GIVEAWAY_REOPEN_FOR_CHECKS;
delete process.env.VERCEL_ENV;

const { giveawayClosed, CLOSED_COPY } = await import("./engine.ts");
const { sendGiveawayEmail } = await import("./send.ts");
const { checkOffer, offerRefusalMessage } = await import("./offers.ts");

test("closed by default; the checks can reopen it; production never", () => {
  assert.equal(giveawayClosed({}), true);
  assert.equal(giveawayClosed({ GIVEAWAY_REOPEN_FOR_CHECKS: "1" }), false);
  assert.equal(giveawayClosed({ GIVEAWAY_REOPEN_FOR_CHECKS: "1", VERCEL_ENV: "preview" }), false);
  assert.equal(giveawayClosed({ GIVEAWAY_REOPEN_FOR_CHECKS: "1", VERCEL_ENV: "production" }), true);
  assert.equal(giveawayClosed({ GIVEAWAY_REOPEN_FOR_CHECKS: "0" }), true);
});

test("the closed message is Ben's words", () => {
  assert.equal(CLOSED_COPY.heading, "We've given away all the free Brain Maps.");
  assert.equal(
    CLOSED_COPY.body,
    "Thank you for celebrating 10 years with us. The response was incredible, and every free spot is now taken. If you already booked, you're all set and we'll see you soon. Want to start your own Brain Map? Book a regular visit below.",
  );
  assert.equal(CLOSED_COPY.button, "Book a Brain Map");
  assert.equal(CLOSED_COPY.href, "/contact");
});

test("no email goes to an entrant: refused before the provider is asked", async () => {
  const realFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    throw new Error("the provider must not be reached");
  };
  try {
    const footing = { identityLine: "x", siteUrl: "https://example.test", unsubscribeUrl: "https://example.test/unsubscribe?t=1" };
    for (const marketing of [true, false]) {
      const r = await sendGiveawayEmail({ to: "entrant@gmail.com", email: { subject: "Your free first visit: book by Sat, Dec 5", html: "<p>x</p>", text: "x" }, marketing, footing });
      assert.equal(r.status, "skipped");
      assert.equal(r.error, CLOSED_COPY.emailSkip);
    }
    assert.equal(calls, 0);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("an unused code is refused with the closed message, and no code is looked up", async () => {
  const store = { select() { throw new Error("no lookup while closed"); } };
  const r = await checkOffer("10Y-ABC123", new Date("2026-11-23T20:00:00Z"), store);
  assert.deepEqual(r, { ok: false, reason: "closed" });
  assert.equal(offerRefusalMessage("closed"), CLOSED_COPY.line);
  assert.match(CLOSED_COPY.line, /^We've given away all the free Brain Maps/);
});
