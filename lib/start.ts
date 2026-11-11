/**
 * /start, the ad landing page (Ben, 2026-11-11): the copy for cold Meta and
 * Google ad traffic, in one place.
 *
 * A health business. The headline shown is picked by the `h` query parameter,
 * and `h` is a CODE (k1, a2 …), never a word: the page address is what the
 * Meta pixel and GA report, so nothing in the URL, the <title> or the meta
 * tags may say what a visitor is dealing with. The headlines themselves are
 * neutral on purpose — "when focus is a daily battle", never "you have X".
 * The page title is the same for every variant (app/start/page.tsx).
 */

import { BRAIN_MAP_PRICE_USD } from "./site-config";

export type StartHook = { headline: string; sub: string };

/** The default headline: no `h`, `h=g1`, or any code not listed below. */
export const START_DEFAULT_HOOK: StartHook = {
  headline: "See what your brain is actually doing.",
  sub: "A full brain map shows which areas are running hot, which are running quiet, and which are doing well. Then we hand you a written plan for what to do about it.",
};

export const START_HOOKS: Record<string, StartHook> = {
  g1: START_DEFAULT_HOOK,
  k1: {
    headline: "When focus and homework are a daily battle",
    sub: "A brain map shows which areas are running hot, running quiet, or doing well, so you know what’s really going on.",
  },
  k2: {
    headline: "For kids who can’t seem to calm down",
    sub: "See what’s running hot in your child’s brain, and get a written plan for what to do next.",
  },
  a1: {
    headline: "When your mind won’t turn off",
    sub: "See which areas of your brain are running hot, and leave with a written, step-by-step plan.",
  },
  a2: {
    headline: "Sleep help without more pills",
    sub: "A brain map shows what’s running hot or quiet, so we can work on the cause.",
  },
  a3: {
    headline: "Clear the fog. Get your focus back.",
    sub: "See which areas are running quiet, and get a written plan to change it.",
  },
};

/** The headline for an `h` value; anything missing or unknown gets the default. */
export function startHook(h: unknown): StartHook {
  const code = typeof h === "string" ? h.trim().toLowerCase() : "";
  return Object.prototype.hasOwnProperty.call(START_HOOKS, code) ? START_HOOKS[code] : START_DEFAULT_HOOK;
}

/**
 * The offer, as /start words it. Always "Brain Map Session" — never a
 * "clarity session" or a "free call" on this page. Every line the page and
 * its form print about the offer comes from here.
 */
export const START_OFFER = {
  name: "Brain Map Session",
  formHeading: `Book your Brain Map Session, $${BRAIN_MAP_PRICE_USD}`,
  button: "Request My Consultation",
  underButton: "No payment today. We’ll call or text within 1 business day to pick a time.",
  values: [
    "60-minute Brain Map Session",
    "A full map of your brain (or your child’s): what’s running hot, what’s running quiet, what’s doing well",
    "A plain-English walkthrough of your map",
    "A written, step-by-step plan to take home",
    "HSA/FSA accepted",
  ],
  guarantee:
    "Every Brain Map Session ends with your full brain map and a written, step-by-step plan in hand. If we don’t deliver both, you don’t pay.",
  steps: ["Send your request (30 seconds)", "We call to pick a time", "Leave with your brain map and plan"],
} as const;

/** The four questions under the form. The last one answers with the guarantee. */
export const START_FAQS: { q: string; a: string }[] = [
  {
    q: "Is it safe for kids?",
    a: "Yes. A brain map is a recording: small sensors read the brain’s own activity, and nothing enters the body. There’s nothing a child has to get right, and parents are welcome at every visit.",
  },
  {
    q: "Does my child have to do anything?",
    a: "No. No screens to watch, tasks to complete, or skills to practice. Your child sits comfortably while the map is recorded.",
  },
  {
    q: "Can I use HSA or FSA?",
    a: "Yes. HSA and FSA cards are accepted.",
  },
  {
    q: "What if it’s not a fit?",
    a: START_OFFER.guarantee,
  },
];

/**
 * The Google reviews /start quotes (lib/site-config.ts → googleReviewNamed):
 * one about a child, one from an adult. Exact words from the list the
 * concern pages quote; a name not in that list renders nothing.
 */
export const START_REVIEWERS: { firstName: string; center: "nashville" | "murfreesboro" }[] = [
  { firstName: "Marjorie", center: "nashville" },
  { firstName: "Tracy", center: "nashville" },
];

/** A short "where it is" note after a center's street address, when Ben has given one. */
export const START_CENTER_NOTE: Record<string, string> = {
  murfreesboro: "minutes off I-24",
};
