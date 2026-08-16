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

export const SITE_NAME = "Harmonized Brain Centers";
/**
 * Canonical site URL — confirmed by Ben. The apex is canonical: `www` 301s to
 * it at the host, so every absolute URL the site emits (canonical tags,
 * og:url, sitemap, robots, JSON-LD) uses the apex form and nothing has to be
 * redirected after the fact. Override per-environment with NEXT_PUBLIC_SITE_URL
 * (no trailing slash) — see README → Environment variables.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://harmonizedbraincenterstn.com";

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

/**
 * Site assistant (phase-8-chatbot.md). **Off, and shipping off.**
 *
 * Unlike FEATURE_CELEBRITY, this does NOT fall open in draft mode: `next dev`
 * renders nothing either. The assistant talks to visitors about a wellness
 * service, and the gate is worth nothing if it opens the moment someone runs
 * the site locally. Set NEXT_PUBLIC_FEATURE_ASSISTANT=true deliberately, in
 * one environment at a time, to audit it.
 *
 * While it is false the widget does not render and /api/chat answers 404, so
 * there is no endpoint to probe and no model spend to incur.
 *
 * NEXT_PUBLIC_* is inlined at build time, so production needs the variable set
 * *and* a rebuild — see README → Deploying to Vercel.
 */
export const FEATURE_ASSISTANT =
  process.env.NEXT_PUBLIC_FEATURE_ASSISTANT === "true";

/** Embedding is disabled for this video — always link out, never iframe. */
export const TRISHA_VIDEO_URL = "https://www.youtube.com/shorts/fhmoa68_uHY";
export const TRISHA_QUOTE = "I feel like I am in my thirties again.";
export const TRISHA_APPROVAL_TAG =
  "[Confirm approval: name · likeness · image · quote · Grammy credit · commercial use]";

/* ------------------------------------------------------------------ */
/* Founder                                                             */
/* ------------------------------------------------------------------ */

export const FOUNDER_FIRST_NAME = "Sheri";
/** Founder surname — confirmed by Ben. */
export const FOUNDER_LAST_NAME: Verifiable = {
  value: "Rowney",
  verified: true,
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
 * The homepage and /stories both show all three, in the same three-column
 * `trio-quotes` grid. Nothing is padded to fill it: the grid follows the
 * verified quotes, so a fourth would appear on both pages and an unverified
 * one appears on neither in production.
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
 * Business hours are **per center**, in lib/locations.ts, and there is no
 * global week here on purpose.
 *
 * A single `BUSINESS_HOURS` lived here through phase 8, gating what the
 * assistant could say about when anyone answers. It was deleted when Ben
 * confirmed the real weeks, because they are not one week: Nashville runs
 * Tuesday to Friday plus Saturday morning, Murfreesboro Tuesday to Thursday.
 * A constant that averages them is wrong for both centers, and the visitor it
 * is most wrong for — free only on a Friday, or only on a Saturday — is
 * exactly the one asking.
 *
 * Each center now carries its own `hours: Verifiable<WeeklyHours>`, and every
 * reader goes through `locationHours()`: the location pages, the cards, the
 * `openingHoursSpecification` in each LocalBusiness, the assistant's hours
 * answer (lib/chat/unanswerable.ts) and its callback promise
 * (lib/chat/booking.ts `callbackExpectation`, which pools the centers into the
 * week the practice as a whole answers on). One fact, one home, per center.
 */
/**
 * Risk reversal — the objection-killer that replaces "free". Used verbatim in
 * both places it appears (the end-of-page CTA band and FAQ Q14), which is why
 * it lives here rather than being retyped. It is a promise about how the call
 * is conducted, not an unverified fact, so it is a plain constant.
 */
export const RISK_REVERSAL =
  "If we don’t think LENS is right for you, we’ll tell you on the phone — before you ever book or pay for anything.";

/** First visit (Brain Map) duration — confirmed by Ben. */
export const FIRST_VISIT_DURATION = "about 60 minutes";

/**
 * Typical length of a regular session — confirmed by Ben.
 *
 * Stays a `Verifiable` rather than reverting to a plain constant, for the same
 * reason each center's `hours` is one: the site assistant reads `verified` to
 * decide whether it may state a duration at all (lib/chat/unanswerable.ts). Now that
 * it is true, that check is dormant and the passages carrying the claim are
 * back in the index. If the figure ever needs re-confirming, flipping this one
 * flag takes the claim out of the assistant's mouth again without touching a
 * page.
 */
export const SESSION_LENGTH: Verifiable = {
  value: "about 30 minutes",
  verified: true,
  note: "[Confirm typical length]",
};

/**
 * Pricing — confirmed by Ben.
 *
 * One source for the CTA label, the `/first-visit` cost card, FAQ 12, the
 * assistant's pricing passage, and the §3 refusal that quotes the published
 * prices back at a discount request. Written as display strings because that
 * is the only form anything here uses; the arithmetic behind PACKAGE_SAVING is
 * checked in the comment rather than computed, so a change to one figure and
 * not the others is visible in review.
 *
 * 12 × $125 = $1,500, less $1,300 = $200 saved.
 */
export const BRAIN_MAP_PRICE = "$150";
export const SESSION_PRICE = "$125";
export const PACKAGE_SESSIONS = 12;
export const PACKAGE_PRICE = "$1,300";
export const PACKAGE_SAVING = "$200";

/**
 * Product name — always capitalized, always in full. One source so the CTA,
 * the homepage section, and the /first-visit cost card can't drift apart.
 */
export const BRAIN_MAP_NAME = "The Harmonized Brain Map";

/**
 * The package caveat, and the one rule about where it goes: Ben's instruction
 * is to state it **wherever the package price appears**. It lives here as one
 * string for that reason — a caveat retyped per page is a caveat that ends up
 * on two pages out of three, and the one it is missing from is the one that
 * reads as "$1,300 covers everything".
 *
 * Two facts, both his: the Brain Map is a separate first visit that does not
 * count toward the twelve, and it is required before regular sessions begin.
 */
export const PACKAGE_NOTE =
  `The Brain Map is separate from the package — it’s required before regular ` +
  `sessions begin, and it doesn’t count toward the ${PACKAGE_SESSIONS}.`;

/**
 * Insurance and payment, in Ben's words, verbatim.
 *
 * Replaces the [Confirm policy] / [Confirm HSA/FSA policy] pair. Held here
 * rather than typed into /faq and /first-visit separately because it is the
 * answer most likely to be quoted back at the practice, and the two pages
 * disagreeing about it — one saying "documentation", the other "superbill" —
 * is the drift this file exists to prevent.
 */
export const INSURANCE_POLICY =
  "We don’t bill insurance. Harmonized is self-pay. We accept HSA and FSA, and " +
  "we can provide a superbill if you want to submit for out-of-network " +
  "reimbursement.";

/**
 * Practitioner training, in Ben's words. It names a third party (OchsLabs) and
 * a training period, so it is a claim about the practice that has to stay
 * exactly as approved; do not tighten it for rhythm. Deliberately carries no
 * ranking or superlative — Ben's instruction, and the same discipline
 * BRAIN_MAP_CLAIM is held to below.
 *
 * **The last sentence names no number, on purpose.** It first read "More than
 * 150,000 sessions have shaped how we train", which contradicted
 * STAT_SESSIONS ("140,000+") — and /about renders both, this card and the
 * proof band, so the page disagreed with itself in two places a reader sees
 * at once. The fix is not to correct the figure to match: two copies of a
 * number drift the moment one is updated, and this file exists to stop that.
 * The count has exactly one home, STAT_SESSIONS, which the proof band on this
 * same page already renders. So the sentence says what the count is *for*
 * without restating it, and nothing here can ever disagree with it again.
 */
export const TRAINING_CLAIM =
  "Every Harmonized practitioner is certified through OchsLabs, the company " +
  "that created LENS, then trained in-house for three months before seeing " +
  "clients on their own. Every session we’ve delivered has shaped how we train.";

/**
 * GRAPHICS CORRECTIONS — apply before either asset ships (Phase 7.5).
 *
 * These live in the artwork, not in code, which is exactly why they are
 * written down here: nothing else in the repo would catch them. The renders
 * are otherwise accurate — both carry the full 21 electrodes, and the bar
 * chart's own values match the copy on /how-lens-works (Pz at 7.0, below
 * 10 µV; F7 at 47.0, above 35 µV).
 *
 * 1. DONE — "Ideal range" → "typical range". The shipped heat map reads
 *    "Typical range"; the shipped bar graph labels its bands by value
 *    (10 µV / 35 µV) and carries no evaluative wording. "Ideal" invited a
 *    client to read their own number as a verdict on themselves, which is the
 *    one thing a wellness practice cannot let a chart do.
 *
 * 2. DONE — heat-map legend now reads "Lower amplitude / Typical range /
 *    Higher amplitude" in place of "Under-engaged / Ideal / Over-engaged."
 *
 * 3. OPEN — the lobe graphic carries a labeling error: F3 is mislabeled as F8,
 *    producing two F8s and no F3. It also has an empty trailing bullet in the
 *    Frontal Lobe list. (The heat map is clean on both counts — one F3, one
 *    F8, all 21 electrodes present.)
 *
 * 4. OPEN — the lobe graphic uses diagnostic terms as electrode labels:
 *    "anxiety," "depression," "addiction." Soften to function words: "impulse
 *    control," "mood regulation," "attention and focus." Naming a condition
 *    next to an electrode implies the map detects it, which is a medical claim
 *    and contradicts DISCLAIMER at the bottom of this file.
 *
 * The corrected heat map ships on the homepage (/images/brain-map-heat.png).
 * /how-lens-works still renders PlaceholderPlate: items 3 and 4 above are
 * unfixed because that asset has not been supplied. The bar graph
 * (/images/brain-map-bars.png) is in the repo but not placed on any page.
 * See CONTENT-CHECKLIST.md → Photography.
 */

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

// PRICING_TAG, HSA_FSA_TAG, INSURANCE_TAG, TRAINING_CLAIM_TAG and
// FIRST_VISIT_DURATION_TAG were deleted when Ben confirmed the facts behind
// them. Their copy is above — SESSION_PRICE and the package figures,
// INSURANCE_POLICY, TRAINING_CLAIM, FIRST_VISIT_DURATION — and the passages
// they were holding out of the assistant's index are back in it.
export const CONCIERGE_TAG = "[Confirm service area & pricing]";
export const CONTACT_RESPONSE_TAG = "[Confirm response time]";

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
