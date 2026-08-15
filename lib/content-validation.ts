import {
  BRAIN_MAP_CLAIM,
  ESTABLISHED_YEAR,
  FOUNDER_LAST_NAME,
  FOUNDER_QUOTE,
  FRANKLIN_OPENING,
  PHONE,
  RESPONSE_TIME,
  REVIEWS,
  SAME_DAY_CALLBACK,
  SHOW_DRAFT_CONTENT,
  START_TIMING,
  STAT_SESSIONS,
  TESTIMONIALS,
} from "./site-config";

/**
 * Build-time content validation.
 *
 * Imported by app/layout.tsx, so it runs during every `next build`.
 * - Always logs a summary of unverified content so no placeholder is missed.
 * - Set REQUIRE_VERIFIED_CONTENT=true to make a production build FAIL while
 *   any required fact is still unverified (recommended for the launch build).
 *
 * The full human checklist lives in CONTENT-CHECKLIST.md.
 */

const unresolved: string[] = [];

function check(label: string, verified: boolean) {
  if (!verified) unresolved.push(label);
}

check("Primary phone number", PHONE.verified);
check("Founder last name", FOUNDER_LAST_NAME.verified);
check("Founder quote sign-off", FOUNDER_QUOTE.verified);
check("Session count (140,000+)", STAT_SESSIONS.verified);
check("Founding year (2016)", ESTABLISHED_YEAR.verified);
check("Google rating & review count", REVIEWS.verified);
check("Response-time claim", RESPONSE_TIME.verified);
check("Same-day callback promise", SAME_DAY_CALLBACK.verified);
check("Start-timing claim", START_TIMING.verified);
check("Franklin opening date", FRANKLIN_OPENING.verified);
check("Brain Map differentiator claim", BRAIN_MAP_CLAIM.verified);
check(
  "At least one verified testimonial",
  TESTIMONIALS.some((t) => t.verified)
);

export const UNRESOLVED_CONTENT = unresolved;

if (unresolved.length > 0) {
  const summary = `[content] ${unresolved.length} unverified fact(s): ${unresolved.join(
    "; "
  )} — see CONTENT-CHECKLIST.md`;
  if (process.env.REQUIRE_VERIFIED_CONTENT === "true") {
    throw new Error(summary);
  }
  if (!SHOW_DRAFT_CONTENT) {
    // Production build without draft content: the blocks above are hidden,
    // but surface the list loudly in the build log.
    console.warn(`\n⚠️  ${summary}\n   Unverified blocks are hidden in this build.\n`);
  } else {
    console.warn(`[content] draft mode — ${unresolved.length} unverified fact(s) render with gold tags.`);
  }
}
