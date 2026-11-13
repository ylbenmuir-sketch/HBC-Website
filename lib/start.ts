/**
 * /start, the ad landing page (Ben, 2026-11-11; ultra simple since
 * 2026-11-13): the copy for cold Meta and Google ad traffic, in one place.
 *
 * A health business. The headline shown is picked by the `h` query parameter,
 * and `h` is a CODE (k1, a2 …), never a word: the page address is what the
 * Meta pixel and GA report, so nothing in the URL, the <title> or the meta
 * tags may say what a visitor is dealing with. The headlines themselves are
 * neutral on purpose — "when homework is a daily battle", never "you have X".
 * The page title is the same for every variant (app/start/page.tsx).
 */

import { BRAIN_MAP_PRICE_USD, REVIEWS, REVIEW_COUNT_ROUNDED } from "./site-config";

/** One headline per code, six words or fewer (Ben, 2026-11-13). Nothing else varies. */
export type StartHook = { headline: string };

/** The default headline: no `h`, `h=g1`, or any code not listed below. */
export const START_DEFAULT_HOOK: StartHook = { headline: "See what your brain is doing." };

/**
 * Codes are a letter and one or two digits (lib/attribution.ts → cleanHook).
 * No headline says the visitor has anything, or takes anything: a2 is "a
 * drug-free look", not "without more pills". lib/start.test.mjs holds every
 * line to six words and to the words that may not appear.
 */
export const START_HOOKS: Record<string, StartHook> = {
  g1: START_DEFAULT_HOOK,
  k1: { headline: "When homework is a daily battle." },
  k2: { headline: "For kids who can’t calm down." },
  a1: { headline: "When your mind won’t turn off." },
  a2: { headline: "A drug-free look at sleep." },
  a3: { headline: "Clear the fog." },
  a4: { headline: "See what’s going on with focus." },
  a5: { headline: "A drug-free look at stress." },
  n1: { headline: "LENS starts with a brain map." },
};

/** The headline for an `h` value; anything missing or unknown gets the default. */
export function startHook(h: unknown): StartHook {
  const code = typeof h === "string" ? h.trim().toLowerCase() : "";
  return Object.prototype.hasOwnProperty.call(START_HOOKS, code) ? START_HOOKS[code] : START_DEFAULT_HOOK;
}

/**
 * The offer, as /start words it. Always "Brain Map Session" — never a
 * "clarity session" or a "free call" on this page. Every line the page and
 * its form print about the offer comes from here. Since 2026-11-13 (Ben: the
 * phone view was "too wordy and over stimulating") that is one line under
 * the headline, the same for every code, one guarantee sentence under the
 * button, and three short lines below.
 */
export const START_OFFER = {
  name: "Brain Map Session",
  line: `60-minute Brain Map Session · $${BRAIN_MAP_PRICE_USD} · written plan included`,
  button: "Request My Consultation",
  /** The only guarantee text on the page: centered under the button. */
  guarantee: "If we don’t deliver the map and the plan, you don’t pay.",
  /** The confirmation's one line, once the request is sent. Not on the form. */
  afterSend: "No payment today. We’ll call or text within 1 business day to pick a time.",
  getsHeading: "What you get",
  gets: ["A full map of your brain.", "A plain-English walkthrough.", "A written plan to take home."],
} as const;

/**
 * The quiet trust line under the offer line: "★ 5.0 · 160+ Google reviews".
 * The same review constants PROOF_LINE_SHORT is built from, so the figures
 * cannot disagree with the rest of the site. The star is kept apart from the
 * text because it alone takes the gold.
 */
export const START_TRUST = {
  star: "★",
  text: `${REVIEWS.value.rating} · ${REVIEW_COUNT_ROUNDED} Google reviews`,
} as const;

/** A short "where it is" note after a center's street address, when Ben has given one. */
export const START_CENTER_NOTE: Record<string, string> = {
  murfreesboro: "minutes off I-24",
};
