/**
 * /murfreesboro, the Murfreesboro paid-ad landing page (Ben, 2026-11-22):
 * its copy and its video slot, in one place. A short opt-in page — the
 * rule it is cut by: anything that does not raise the share of qualified
 * visitors who send the form is not on it.
 *
 * It is /start's sibling, not its replacement: the same form, the same
 * headline codes (`h`, lib/start.ts), the same offer name and button. The
 * differences are here — one center, a headline of its own for a link that
 * names no code, a video slot, and the lines around the form.
 *
 * A health business, as on /start: the address is a place name, never a
 * condition, and the <title> and description are the same for every
 * headline (app/murfreesboro/page.tsx).
 */

import { BRAIN_MAP_PRICE_USD, REVIEWS, REVIEW_COUNT_ROUNDED } from "./site-config";
import { START_DEFAULT_HOOK, START_OFFER, startHook, type StartHook } from "./start";

export const MURFREESBORO_AD_PATH = "/murfreesboro";

/**
 * The headline for a link with no code (or g1), in the two-part shape
 * /start's take: `lead` is the large serif line, `tail` the smaller pine
 * italic line under it (Ben, 2026-11-23).
 */
export const MURFREESBORO_DEFAULT_HOOK: StartHook = {
  lead: "See which parts of your brain are in overdrive, and which are running low.",
  tail: "And what to do about it.",
  headline: "See which parts of your brain are in overdrive, and which are running low. And what to do about it.",
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
 * Ben's words (2026-11-22). The button is START_OFFER.button — one constant
 * for both pages. The guarantee here says "the written plan"; /start's own
 * sentence is unchanged.
 */
export const MURFREESBORO_OFFER = {
  eyebrow: `Murfreesboro · ${START_OFFER.name}`,
  /** One sentence pair under the headline — a line, not a paragraph. */
  sub: "A 60-minute Brain Map. You leave with your map and a written plan.",
  /** The one quiet line over the fields: why we ask for a number. */
  formSub: "We’ll call to find a time that works for you.",
  /**
   * One quiet line directly under the form's button. The review figures are the
   * site's own verified constants (lib/site-config.ts), never typed here.
   */
  quiet: `$${BRAIN_MAP_PRICE_USD} · 60 minutes · ★ ${REVIEWS.value.rating} from ${REVIEW_COUNT_ROUNDED} Google reviews`,
  /** Smaller, under that line. The only guarantee text on the page. */
  guarantee: "If we don’t deliver the map and the written plan, you don’t pay.",
} as const;

/**
 * The hero's video slot: "What is a Brain Map?"
 *
 * TODO(Ben): the video. When the 60–90 second clip is recorded, fill in the
 * three paths below and the page plays it — nothing else changes.
 *   src      the clip, self-hosted: an MP4 (H.264 + AAC, 720p, about
 *            1 Mbps so it is a few MB) under public/, e.g.
 *            "/videos/what-is-a-brain-map.mp4". Never a YouTube/Vimeo link.
 *   captions its WebVTT captions, e.g. "/videos/what-is-a-brain-map.vtt".
 *            The clip starts muted, so the captions carry it.
 *   poster   a 16:9 still, ideally a frame from the clip, in public/images.
 * While `src` is null the slot is the poster with one small centered badge
 * reading the title — no "coming soon", nothing to press (Ben, 2026-11-23).
 */
export const BRAIN_MAP_VIDEO: {
  src: string | null;
  captions: string | null;
  poster: string;
  posterAlt: string;
  title: string;
} = {
  src: null,
  captions: null,
  // A real HBC photo: a practitioner showing where the map's sites sit.
  poster: "/images/map-points.jpg",
  posterAlt: "A practitioner points to the labeled sites of a brain map on a glass model of a head",
  title: "What is a Brain Map?",
};
