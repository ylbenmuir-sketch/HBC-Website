/**
 * /murfreesboro, the Murfreesboro paid-ad landing page (Ben, 2026-11-22;
 * two columns to his mockup since 2026-11-23): its copy and its photo, in
 * one place.
 *
 * It is /start's sibling, not its replacement: the same form, the same
 * headline codes (`h`, lib/start.ts), the same offer name and button. The
 * differences are here — one center, a headline of its own for a link that
 * names no code, and the lines around the form.
 *
 * A health business, as on /start: the address is a place name, never a
 * condition, and the <title> and description are the same for every
 * headline (app/murfreesboro/page.tsx).
 */

import { BRAIN_MAP_PRICE_USD, HSA_FSA_ACCEPTED, REVIEWS, REVIEW_COUNT_ROUNDED } from "./site-config";
import { START_DEFAULT_HOOK, START_OFFER, startHook, type StartHook } from "./start";

export const MURFREESBORO_AD_PATH = "/murfreesboro";

/**
 * The headline for a link with no code (or g1), in the two-part shape
 * /start's take: `lead` is the first line, `tail` the second, in sage
 * (Ben, 2026-11-23).
 */
export const MURFREESBORO_DEFAULT_HOOK: StartHook = {
  lead: "See which parts of your brain are in overdrive,",
  tail: "and which are running low.",
  headline: "See which parts of your brain are in overdrive, and which are running low.",
};

/**
 * The headline for an `h` value. A code an ad carries (k1, a2 …) gets the
 * same line /start gives it, so one set of ads can point at either page;
 * no code, g1 or an unknown one gets this page's own.
 */
export function murfreesboroHook(h: unknown): StartHook {
  const hook = startHook(h);
  return hook === START_DEFAULT_HOOK ? MURFREESBORO_DEFAULT_HOOK : hook;
}

/**
 * Ben's words (2026-11-23). Always "session", never "visit". The button is
 * START_OFFER.button — one constant for both pages. Price, review figures
 * and the HSA/FSA line are the site's own verified constants
 * (lib/site-config.ts), never typed here.
 */
export const MURFREESBORO_OFFER = {
  /** The eyebrow's two parts; the page sets a gold mark before and a slash between. */
  eyebrow: ["Murfreesboro, TN", `The ${START_OFFER.name}`],
  sub: "Feeling foggy, wired, or worn out? In one 60-minute session, we record your brain’s activity, walk you through your map, and give you a written plan to keep.",
  /** The reviews row, after the stars: the rating in bold, then the rest as the link. */
  reviews: { rating: REVIEWS.value.rating, text: `from ${REVIEW_COUNT_ROUNDED} Google reviews` },
  /** On the photo. */
  photoChip: "A gentle recording. A real conversation.",
  /** The cream card floating over the photo. */
  keep: {
    brand: "Harmonized",
    tag: "Yours to keep",
    title: ["Your map.", "Your next steps."],
    lines: ["Your brain’s activity", "Explained in plain English", "A personalized written plan"],
    /** Under the dot drawing: it is a picture of a map, not anyone's. */
    mapLabel: "Illustrative map",
  },
  /** The form card, top to bottom. */
  card: {
    eyebrow: "Your first step",
    pill: "60 minutes",
    title: "Start with a Brain Map.",
    price: `$${BRAIN_MAP_PRICE_USD}`,
    priceWhat: "Your Brain Map + written plan",
    priceNote: HSA_FSA_ACCEPTED,
    /** The line over the fields: why we ask for a number. */
    formSub: "We’ll call to arrange your session and answer your questions. No payment today.",
    fields: {
      name: { label: "Full name", placeholder: "Your first and last name" },
      phone: { label: "Phone number", placeholder: "(615) 555-0123" },
      email: { label: "Email address", placeholder: "you@example.com" },
    },
    /** Under the button, beside a small lock. */
    quiet: "No payment today. No commitment to a package.",
    /** Under that. The only guarantee text on the page. */
    guarantee: "If we don’t deliver the map and the written plan, you don’t pay.",
  },
  /** Under the hero, after a thin rule: three reassurances. */
  points: [
    { title: "Gentle. Nothing to perform.", text: "Small sensors record your brain’s activity. You simply sit comfortably." },
    { title: "Answers you can understand.", text: "We explain your map in plain language and give you a written plan to keep." },
    { title: "You choose what happens next.", text: "Ask every question. Take your plan home. Decide at your own pace." },
  ],
} as const;

/**
 * The hero photo: a real HBC session — a practitioner setting a sensor
 * behind a seated client's ear (public/images/session-wide.jpg, 1400×787).
 * Nobody is named, here or in the alt text.
 */
export const MURFREESBORO_PHOTO = {
  src: "/images/session-wide.jpg",
  alt: "A practitioner places a small sensor behind the ear of a client seated in an armchair, in a sunlit session room",
} as const;
