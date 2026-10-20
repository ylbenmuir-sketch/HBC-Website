/**
 * The giveaway's master switch (Ben, 2026-10-19): GIVEAWAY_ENGINE_ENABLED.
 *
 * OFF (unset, or anything but 1/true/on/yes) is the default and what
 * production runs until Ben turns it on. While it is off:
 *
 *   - /api/cron/giveaway answers 200 at once and touches nothing — migration
 *     0010 is not applied, so no giveaway table may ever be queried;
 *   - no scheduled email is sent;
 *   - /admin/10years and /10years/{claim,enter,verify} answer 404;
 *   - /unsubscribe shows its "unavailable" message for giveaway tokens;
 *   - the thank-you offer code at /contact is refused without a lookup;
 *   - /10years is the SHOWCASE (lib/giveaway/showcase.ts): the notify-me
 *     page with the [DRAFT] tags hidden, ?mode= for each later stage, forms
 *     that succeed on screen and write nothing.
 *
 * ON: the real giveaway — the page's mode follows the config clock from
 * Nov 9, and the showcase ends on its own. Before turning it on see
 * README → "10-year giveaway: turning the engine on".
 *
 * The lead/contact cron, the contact form and everything else on the site
 * never read this flag.
 */

// No next/server import: lib/giveaway/*.test.mjs load this under plain Node.

export const ENGINE_ENV = "GIVEAWAY_ENGINE_ENABLED";

const ON = new Set(["1", "true", "on", "yes"]);

export function giveawayEngineEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return ON.has((env[ENGINE_ENV] ?? "").trim().toLowerCase());
}

/** The plain 404 a route handler answers while the engine is off. */
export function engineOffResponse(): Response {
  return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store, max-age=0", "X-Robots-Tag": "noindex, nofollow" } });
}
