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

/**
 * One headline per code, six words or fewer. `lead` is set in the serif,
 * `tail` under it in the italic (Ben, 2026-11-13); `headline` is the two
 * together, for anything that wants the sentence.
 */
export type StartHook = { lead: string; tail: string; headline: string };

const hook = (lead: string, tail: string): StartHook => ({ lead, tail, headline: `${lead} ${tail}` });

/** The default headline: no `h`, `h=g1`, or any code not listed below. */
export const START_DEFAULT_HOOK: StartHook = hook("Get to know", "your brain.");

/**
 * Codes are a letter and one or two digits (lib/attribution.ts → cleanHook).
 * No headline says the visitor has anything, or takes anything: a2 is "a
 * drug-free look", not "without more pills". lib/start.test.mjs holds every
 * line to six words and to the words that may not appear.
 */
export const START_HOOKS: Record<string, StartHook> = {
  g1: START_DEFAULT_HOOK,
  k1: hook("When homework is", "a daily battle."),
  k2: hook("For kids who", "can’t calm down."),
  a1: hook("When your mind", "won’t turn off."),
  a2: hook("A drug-free look", "at sleep."),
  a3: hook("Clear", "the fog."),
  a4: hook("See what’s going on", "with focus."),
  a5: hook("A drug-free look", "at stress."),
  n1: hook("LENS starts with", "a brain map."),
};

/** The headline for an `h` value; anything missing or unknown gets the default. */
export function startHook(h: unknown): StartHook {
  const code = typeof h === "string" ? h.trim().toLowerCase() : "";
  return Object.prototype.hasOwnProperty.call(START_HOOKS, code) ? START_HOOKS[code] : START_DEFAULT_HOOK;
}

/**
 * The offer, as /start words it. Always "Brain Map Session" — never a
 * "clarity session" or a "free call" on this page. Every line the page and
 * its form print about the offer comes from here: the eyebrow, one
 * sentence under the headline (the same for every code), the offer half of
 * the row under it, the form's heading and line, the button and the one
 * guarantee sentence.
 */
export const START_OFFER = {
  name: "Brain Map Session",
  eyebrow: "The Brain Map Session",
  sub: "Sit down with a practitioner to understand your brain map and leave with a written plan.",
  meta: `60 minutes · $${BRAIN_MAP_PRICE_USD}`,
  formHeading: "Request your session",
  formSub: "We’ll call to find a time that works for you.",
  /** The button's words. The arrow after them is decoration (components/ContactForm.tsx). */
  button: "Request My Consultation",
  /** The only guarantee text on the page: centered under the button. */
  guarantee: "If we don’t deliver the map and the plan, you don’t pay.",
} as const;

/**
 * After the request is sent (Ben, 2026-11-13): two optional questions in
 * the page's own calm style, then a plain thank-you with the center's
 * number. /contact's longer step two (best time, best way to reach, how did
 * you hear, anything we should know) is not asked here; those columns stay
 * and are simply left empty by a /start lead.
 */
export const START_FOLLOW = {
  heading: "Got it — we’ll reach out soon.",
  sub: "Two quick questions, if you have a moment.",
  who: "Who is this for?",
  what: "What’s going on?",
  whatEmpty: "Select one",
  send: "Send",
  skip: "Skip",
  thanks: "Thank you. We’ll call you soon.",
} as const;

/**
 * "How it works", under the form (Ben, 2026-11-13): the sample heat map the
 * home page shows with its caption, and three numbered steps. Ben's words,
 * verbatim.
 */
export const START_HOW = {
  id: "how-it-works",
  heading: "How it works",
  caption: "Your brain map, in plain English.",
  steps: [
    "We measure all 21 sites of your brain to see what’s doing well, what’s in overdrive, and what’s underperforming.",
    "We walk you through your results and how they can show up in everyday life.",
    "We build a customized brain plan based on your results.",
  ],
} as const;

/**
 * The reviews half of the row under the headline: "★ 5.0 · 160+ Google reviews".
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
