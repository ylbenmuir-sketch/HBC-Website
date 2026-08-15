/**
 * Central site configuration + content-verification system.
 *
 * EVERY unverified fact on the site lives here as a `Verifiable` value.
 * - In development (or with NEXT_PUBLIC_SHOW_DRAFT_CONTENT=true) unverified
 *   values render with visible gold [CONFIRM] tags so nothing hides.
 * - In production builds, unverified values DO NOT RENDER — the blocks that
 *   depend on them are hidden entirely, so no bracketed placeholder or fake
 *   number can ship. See lib/content-validation.ts and CONTENT-CHECKLIST.md.
 *
 * To verify a fact: replace `value`, set `verified: true`.
 */

export type Verifiable<T = string> = {
  value: T;
  verified: boolean;
  /** Dev-only gold tag text shown next to (or instead of) the value. */
  note?: string;
};

/** True when draft/unverified content may render (dev, or staging opt-in). */
export const SHOW_DRAFT_CONTENT =
  process.env.NODE_ENV !== "production" ||
  process.env.NEXT_PUBLIC_SHOW_DRAFT_CONTENT === "true";

/** Render helper: the verified value, else null in production. */
export function verifiedOr<T>(v: Verifiable<T>): T | null {
  return v.verified || SHOW_DRAFT_CONTENT ? v.value : null;
}

/** True if a content string still carries an internal [bracketed] note. */
export function isDraftText(s: string | undefined | null): boolean {
  return !!s && s.includes("[");
}

/**
 * Production-safe text: returns the string, or null when it's unresolved
 * draft copy and draft content is disabled. Use for data-driven strings
 * (locations, team, resources) that may still contain [bracketed] notes.
 */
export function draftText(s: string): string | null {
  return isDraftText(s) && !SHOW_DRAFT_CONTENT ? null : s;
}

export const SITE_NAME = "Harmonized Brain Centers";
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.harmonizedbraincenters.com"; // [CONFIRM domain]

/* ------------------------------------------------------------------ */
/* Contact                                                             */
/* ------------------------------------------------------------------ */

/** Primary phone — confirmed by Ben. */
export const PHONE: Verifiable<{ display: string; tel: string }> = {
  value: { display: "(615) 331-8762", tel: "+16153318762" },
  verified: true,
  note: "[Confirm phone number]",
};
export const PHONE_DISPLAY = PHONE.value.display;
export const PHONE_TEL = PHONE.value.tel;
export const PHONE_VERIFIED = PHONE.verified;
/** True when any phone UI (header tel, call buttons) may render. */
export const SHOW_PHONE = PHONE.verified || SHOW_DRAFT_CONTENT;

/* ------------------------------------------------------------------ */
/* Feature flags — conditional sections                                */
/* ------------------------------------------------------------------ */

/**
 * Celebrity feature (Trisha Yearwood band).
 * DO NOT enable in production until ALL of the following are confirmed in
 * writing: name, likeness, image/video, quote, "Grammy-winning artist"
 * identification, and commercial website context. Set
 * NEXT_PUBLIC_FEATURE_CELEBRITY=true only after every permission is on file.
 * The homepage is designed to feel complete without this section.
 */
export const FEATURE_CELEBRITY =
  process.env.NEXT_PUBLIC_FEATURE_CELEBRITY === "true" || SHOW_DRAFT_CONTENT;

/** Embedding is disabled for this video — always link out, never iframe. */
export const TRISHA_VIDEO_URL = "https://www.youtube.com/shorts/fhmoa68_uHY";
export const TRISHA_QUOTE = "I feel like I am in my thirties again.";
export const TRISHA_APPROVAL_TAG =
  "[Confirm approval: name · likeness · image · quote · Grammy credit · commercial use]";

/* ------------------------------------------------------------------ */
/* Founder                                                             */
/* ------------------------------------------------------------------ */

export const FOUNDER_FIRST_NAME = "Sheri";
export const FOUNDER_LAST_NAME: Verifiable = {
  value: "",
  verified: false,
  note: "[Last name — confirm]",
};
/** Production-safe display name: first name only until the surname is verified. */
export const FOUNDER_DISPLAY_NAME = FOUNDER_LAST_NAME.verified
  ? `${FOUNDER_FIRST_NAME} ${FOUNDER_LAST_NAME.value}`
  : FOUNDER_FIRST_NAME;

/** Founder quote — softened draft; needs the founder's personal sign-off. */
export const FOUNDER_QUOTE: Verifiable = {
  value:
    "We built Harmonized so that every family gets what my first clients got: someone who truly listens, honest guidance, and a gentle option that never asks them to push through.",
  verified: false,
  note: "[Founder to approve final wording]",
};

/* ------------------------------------------------------------------ */
/* Proof / statistics                                                  */
/* ------------------------------------------------------------------ */

/** Session count — confirmed by Ben. */
export const STAT_SESSIONS: Verifiable = {
  value: "140,000+",
  verified: true,
  note: "[Verify session count]",
};

/** Established year ("Since 2016") — confirmed by Ben. */
export const ESTABLISHED_YEAR: Verifiable<number> = {
  value: 2016,
  verified: true,
  note: "[Confirm founding year]",
};

/* ------------------------------------------------------------------ */
/* Reviews & testimonials                                              */
/* ------------------------------------------------------------------ */

/** Google review block — hidden in production until both values verified. */
export const REVIEWS: Verifiable<{ rating: string; count: string }> = {
  value: { rating: "[4.x]", count: "[N] reviews" },
  verified: false,
  note: "[Insert verified rating & count, link live profiles]",
};

export type Testimonial = {
  theme: string;
  text: string;
  /** e.g. "Parent of a 9-year-old", "Adult client" */
  relationship: string;
  city?: string;
  firstName?: string;
  lastInitial?: string;
  concernCategory?: string;
  image?: { src: string; position?: string };
  videoUrl?: string;
  /** Sample copy renders in dev only; only verified quotes ship. */
  verified: boolean;
};

/**
 * Client testimonials — real quotes, written permission confirmed by Ben.
 *
 * Quoted verbatim; do not tighten or paraphrase permissioned copy. No `city`
 * is recorded because none was given with the permission — an invented one
 * would be a fabricated detail on an endorsement.
 *
 * The homepage shows the first two (its grid is two columns); /stories shows
 * all three (its grid is three). Nothing is padded to fill either.
 */
export const TESTIMONIALS: Testimonial[] = [
  {
    theme: "Focus & regulation · Children",
    text: "Our seven-year-old struggled for years to self-regulate. We came in VERY skeptical. Four weeks in we saw nothing and were ready to give up — the very next week, everything lifted. The rage episodes were gone. He was communicating better, relating to his siblings better. Our family was at peace.",
    relationship: "Parent of a 7-year-old",
    firstName: "Andreanna",
    lastInitial: "R.",
    concernCategory: "focus-adhd",
    verified: true,
  },
  {
    theme: "Brain fog & overwhelm · Adults",
    text: "Today was my 12th session and my brain is back. The biggest thing is that I'm no longer overstimulated by everything. My ability to multitask is back and I don't have to write everything down. My brain fog is gone.",
    relationship: "Adult client",
    firstName: "Rachel",
    lastInitial: "S.",
    concernCategory: "brain-fog",
    verified: true,
  },
  {
    theme: "Brain fog & fatigue · Adults",
    text: "I had so many issues with brain fog, focus, and fatigue — working with Laura helped me feel like myself again. If you have any hesitations, let my story encourage you. Take the leap.",
    relationship: "Adult client",
    firstName: "Sarah Ruth",
    lastInitial: "H.",
    concernCategory: "brain-fog",
    verified: true,
  },
];

export const VERIFIED_TESTIMONIALS = TESTIMONIALS.filter((t) => t.verified);

export const SAMPLE_QUOTES_NOTE =
  "Sample copy for design review — will not render in production. Replace with verified client quotes.";
export const SAMPLE_QUOTES_NOTE_STORIES = SAMPLE_QUOTES_NOTE;

/** Individual-experiences disclaimer shown with any testimonial content. */
export const EXPERIENCES_DISCLAIMER = "Individual experiences vary.";

/* ------------------------------------------------------------------ */
/* Operational claims                                                  */
/* ------------------------------------------------------------------ */

export const RESPONSE_TIME: Verifiable = {
  value: "A real person responds within one business day",
  verified: false,
  note: "[Confirm response time]",
};
// Back-compat aliases (interior pages)
export const RESPONSE_TIME_NOTE = RESPONSE_TIME.value;
export const RESPONSE_TIME_TAG = RESPONSE_TIME.note!;

export const START_TIMING: Verifiable = {
  value: "Most new clients start within a week of their first call.",
  verified: false,
  note: "[Confirm typical start timing]",
};

/**
 * Same-day callback. The offer copy leans on this ("a real person calls you
 * back today"), which makes it an operational promise, not a tagline — it can
 * only ship once the centers can actually keep it. Gated like every other
 * unverified fact: production drops the "today" claim and the copy falls back
 * to the promise without a timeframe. Narrower than RESPONSE_TIME above (one
 * business day), which stays the wording used on interior pages.
 */
export const SAME_DAY_CALLBACK: Verifiable = {
  value: "Same-day callback",
  verified: true,
  note: "[Confirm same-day callback]",
};

/**
 * Risk reversal — the objection-killer that replaces "free". Used verbatim in
 * both places it appears (the end-of-page CTA band and FAQ Q14), which is why
 * it lives here rather than being retyped. It is a promise about how the call
 * is conducted, not an unverified fact, so it is a plain constant.
 */
export const RISK_REVERSAL =
  "If we don’t think LENS is right for you, we’ll tell you on the phone — before you ever book or pay for anything.";

/** First visit / FAQ practical details. */
export const FIRST_VISIT_DURATION = "about [60–90] minutes";
export const FIRST_VISIT_DURATION_TAG = "[CONFIRM duration]";
export const SESSION_LENGTH_TAG = "[Confirm typical length]";
/**
 * Brain Map (first visit) price — settled in the conversion brief, so it is a
 * known value rather than a Verifiable. One source for the CTA label and the
 * `/first-visit` cost copy. Per-session pricing is still unconfirmed and keeps
 * PRICING_TAG below.
 */
export const BRAIN_MAP_PRICE = "$150";

/**
 * Product name — always capitalized, always in full. One source so the CTA,
 * the homepage section, and the /first-visit cost card can't drift apart.
 */
export const BRAIN_MAP_NAME = "The Harmonized Brain Map";

/**
 * The differentiator claim. Deliberately hedged: "as far as we know" is
 * defensible today, a bare "the first in the country" is not — do not write
 * that anywhere until the basis for it is verified. Gated like every other
 * unverified fact, so production simply drops the sentence.
 */
export const BRAIN_MAP_CLAIM: Verifiable = {
  value:
    "As far as we know, no other LENS practice in the country puts it in your hands.",
  verified: false,
  note: "[Confirm basis for the claim]",
};

export const PRICING_TAG = "[Insert verified pricing]";
export const HSA_FSA_TAG = "[Confirm HSA/FSA policy]";
export const INSURANCE_TAG = "[Confirm policy]";
export const CONCIERGE_TAG = "[Confirm service area & pricing]";
export const CONTACT_RESPONSE_TAG = "[Confirm response time]";

/** Practitioner training / care-model wording — operational, needs sign-off. */
export const TRAINING_CLAIM_TAG = "[Confirm training & review process]";

/* ------------------------------------------------------------------ */
/* Locations                                                           */
/* ------------------------------------------------------------------ */

/** Franklin opening date — hidden until verified ("Coming soon" only). */
export const FRANKLIN_OPENING: Verifiable = {
  value: "",
  verified: false,
  note: "[Opening date — confirm]",
};

/* ------------------------------------------------------------------ */
/* Legal                                                               */
/* ------------------------------------------------------------------ */

/** Footer disclaimer — preserve verbatim; never soften or remove. */
export const DISCLAIMER =
  "Harmonized Brain Centers is a wellness practice, not a medical clinic. LENS neurofeedback is offered as a wellness service and is not intended to diagnose, treat, cure, or prevent any medical or psychological condition. Information on this site is educational and is not a substitute for advice from a qualified healthcare provider. Individual experiences vary.";
