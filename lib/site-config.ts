/**
 * Central site configuration.
 *
 * EVERY unverified fact on the site lives here. Gold [CONFIRM] / [Insert …]
 * tags render visibly until each value below is replaced with a verified
 * one — see README.md ("Replacing placeholders") for the full checklist.
 */

export const SITE_NAME = "Harmonized Brain Centers";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.harmonizedbraincenters.com"; // [CONFIRM domain]

/** Primary phone — placeholder until the real tracking/main line is confirmed. */
export const PHONE_DISPLAY = "(615) 000-0000"; // [CONFIRM phone number]
export const PHONE_TEL = "+16150000000"; // [CONFIRM phone number]

/** Trisha Yearwood feature (homepage). Embedding is disabled for this video —
 *  always link out, never iframe. */
export const TRISHA_VIDEO_URL = "https://www.youtube.com/shorts/fhmoa68_uHY";
export const TRISHA_QUOTE = "I feel like I am in my thirties again.";
export const TRISHA_APPROVAL_TAG = "[Confirm approval to feature name & likeness]";

/** Founder — last name unverified in the mockups. */
export const FOUNDER_FIRST_NAME = "Sheri";
export const FOUNDER_LAST_NAME_TAG = "[Last name — confirm]";
export const FOUNDER_DISPLAY_NAME = `${FOUNDER_FIRST_NAME} ${FOUNDER_LAST_NAME_TAG}`;

/** Review band (homepage + stories). */
export const REVIEWS = {
  rating: "[4.x]", // [Insert verified rating]
  ratingTodo: "Insert verified rating & count",
  count: "[N] reviews", // [Insert verified count]
  countTodoHome: "Link live review profiles",
  countTodoStories: "Link live profiles",
  videoTodoHome: "Film 2–3 short testimonials",
  videoTodoStories: "Film 2–3 short pieces",
};

/** Final CTA fine print. */
export const RESPONSE_TIME_NOTE = "A real person responds within one business day";
export const RESPONSE_TIME_TAG = "[CONFIRM]";

/** First visit / FAQ practical details. */
export const FIRST_VISIT_DURATION = "about [60–90] minutes";
export const FIRST_VISIT_DURATION_TAG = "[CONFIRM duration]";
export const SESSION_LENGTH_TAG = "[Confirm typical length]";
export const PRICING_TAG = "[Insert verified pricing]";
export const HSA_FSA_TAG = "[Confirm HSA/FSA policy]";
export const INSURANCE_TAG = "[Confirm policy]";
export const CONCIERGE_TAG = "[Confirm service area & pricing]";
export const CONTACT_RESPONSE_TAG = "[Confirm response time]";

/** Established year (proof band: "Since 2016"). */
export const ESTABLISHED_YEAR = 2016;

/** Footer disclaimer — preserve verbatim; never soften or remove. */
export const DISCLAIMER =
  "Harmonized Brain Centers is a wellness practice, not a medical clinic. LENS neurofeedback is offered as a wellness service and is not intended to diagnose, treat, cure, or prevent any medical or psychological condition. Information on this site is educational and is not a substitute for advice from a qualified healthcare provider. Individual experiences vary.";

/** Sample-copy note shown under testimonial grids until quotes are verified. */
export const SAMPLE_QUOTES_NOTE =
  "Quotes are sample copy for design review — replace with verified client quotes before launch. Individual experiences vary.";
export const SAMPLE_QUOTES_NOTE_STORIES =
  "All quotes are sample copy for design review — replace with verified client quotes before launch.";
