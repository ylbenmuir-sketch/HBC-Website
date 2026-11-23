/**
 * The giveaway's master switch (Ben, 2026-10-19): GIVEAWAY_ENGINE_ENABLED.
 *
 * OFF (unset, or anything but 1/true/on/yes) is the default and what
 * production runs until Ben turns it on. While it is off:
 *
 *   - /api/cron/giveaway answers 200 at once and touches nothing — migration
 *     0010 is not applied, so no giveaway table may ever be queried;
 *   - no scheduled email is sent;
 *   - /admin/10years and /10years/{enter,verify} answer 404;
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

/**
 * CLOSED FOR GOOD (Ben, 2026-11-23): every free Brain Map has been given
 * away. From this change on, on the live site and by default everywhere:
 *
 *   - /10years and every page under it except /10years/rules show the closed
 *     message (components/giveaway/ClosedView.tsx): no form, no countdown,
 *     no booking button — one button to /contact;
 *   - /contact?from=10years shows the same message, and an unused 10Y- code
 *     is refused with it, on the page and in /api/consultation. Nothing is
 *     voided: a code already redeemed keeps its booking. A winner's Brain Map
 *     gift certificate (GIFT-MON … GIFT-SAT) is a prize, not a free first
 *     visit code, and still books;
 *   - no email goes to an entrant: the cron neither schedules nor runs the
 *     scheduled sends (the Dec 1 reminder and the Dec 3 last call included),
 *     the /10years form route saves and sends nothing, and
 *     sendGiveawayEmail refuses any entrant email as a last line.
 *
 * Not touched: the drawing engine, winners, entries and their counts,
 * referrals, the admin screens, /unsubscribe, the staff winner alert, any
 * database row, any env var.
 *
 * The one way back is for the checks: GIVEAWAY_REOPEN_FOR_CHECKS=1 lets
 * scripts/check-giveaway.mjs and the lib tests drive the week that was. It
 * is never honoured on the production deployment.
 */
export const REOPEN_ENV = "GIVEAWAY_REOPEN_FOR_CHECKS";

export function giveawayClosed(env: Record<string, string | undefined> = process.env): boolean {
  if (env.VERCEL_ENV === "production") return true;
  return !ON.has((env[REOPEN_ENV] ?? "").trim().toLowerCase());
}

/** Ben's words, 2026-11-23. Final copy, never [DRAFT]. */
export const CLOSED_COPY = {
  heading: "We've given away all the free Brain Maps.",
  body: "Thank you for celebrating 10 years with us. The response was incredible, and every free spot is now taken. If you already booked, you're all set and we'll see you soon. Want to start your own Brain Map? Book a regular visit below.",
  button: "Book a Brain Map",
  href: "/contact",
  /** One line, where only a line fits (a refused code on a form post). */
  line: "We've given away all the free Brain Maps, and every free spot is now taken. If you already booked, you're all set. You can still book a regular visit.",
  /** Why an entrant email was not sent. */
  emailSkip: "giveaway closed: emails to entrants cancelled (Ben, 2026-11-23)",
} as const;
