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
/* The guide (lead magnet)                                             */
/* ------------------------------------------------------------------ */

/**
 * The guide behind `components/GuideCta.tsx`.
 *
 * Named here rather than in the component because two unrelated places say
 * the title — the CTA a visitor reads, and the subject line of the signup
 * notification in `lib/lead-notification.ts` — and they drifted apart once
 * already: both shipped a placeholder title that outlived the guide it named.
 * One constant, one title.
 */
export const GUIDE_TITLE = "Why regulation fails";
export const GUIDE_SUBTITLE =
  "What's happening underneath attention problems, emotional reactivity, brain fog and poor sleep";

/**
 * The guide ships in two forms, and the HTML is the primary one.
 *
 * `GUIDE_HTML_PATH` is a standalone static page — its own markup, its own
 * inline styles, no Next route behind it. That is why it can be opened and
 * read on a phone in the ten seconds after a form submit, which a PDF cannot
 * honestly claim. `GUIDE_PATH` is the same guide as a file to keep.
 *
 * Both are served straight from `public/`, which is what makes delivery work
 * with nothing configured: no provider, no key, no verified sending domain,
 * so a signup is never taken against something we cannot hand over.
 *
 * The HTML hardcodes the PDF at its literal path in two places (a header
 * "save a copy" link and a button in the closing card). Renaming either file
 * means editing `public/guides/why-regulation-fails.html` in the same commit
 * — it is a static file, so nothing here or in the build will catch it.
 */
export const GUIDE_HTML_PATH = "/guides/why-regulation-fails.html";
export const GUIDE_PATH = "/guides/why-regulation-fails.pdf";

/**
 * What the file is called once it lands in her Downloads folder. The repo
 * path stays lowercase-hyphenated like every other served asset; this is the
 * name a person reads a week later, so it says whose guide it is.
 */
export const GUIDE_DOWNLOAD_NAME = "Harmonized-Why-Regulation-Fails.pdf";

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

/**
 * "Founder & Clinical Director" stays as written. Decided Aug 2026, Ben.
 *
 * Raised because the title sits on a practice whose own DISCLAIMER says
 * "not a medical clinic", and because it had just been found riding an
 * unconfirmed review credit in the article bylines. Both are real; neither
 * makes the title wrong.
 *
 * The reasoning, recorded so it is not reopened: an internal role title
 * describes a position inside this organisation. It does not assert a licence,
 * a registration, or a scope of practice, and nothing on the site pairs it
 * with a credential that would. The scope claim is made by DISCLAIMER, which
 * appears on every page and is explicit, and by TRAINING_CLAIM, which says
 * exactly what certification a practitioner holds and from whom. A reader
 * meets both before they could infer anything from a job title.
 *
 * What WOULD change this: pairing the title with a clinical credential
 * (Dr., MD, PhD, LCSW, "licensed"), or using it to justify a claim the
 * practice cannot otherwise make. Neither is present.
 *
 * Note for whoever edits it anyway — the string is written out in eight
 * places (here via lib/team.ts, lib/locations.ts twice, lib/schema.ts
 * jobTitle, and four alt/eyebrow strings in app/). It is not a constant, so a
 * change means finding all eight.
 */

/**
 * The founder's team-card bio — three claims about a named person.
 *
 * "Sets the clinical standard", "trains every practitioner" and "still keeps a
 * client schedule" are statements about what one identified individual does,
 * and none of them was confirmed. They shipped anyway because `bio` is a plain
 * string on TeamMember and the only gate there reads brackets — the same hole
 * the article bylines went through (lib/resources.ts → Byline).
 *
 * Gated exactly like FOUNDER_QUOTE below: unverified, so production renders no
 * bio at all and the card keeps the name, role, photo and link to her story,
 * all of which are true today. Confirm the sentence or replace it, then flip
 * the flag.
 */
export const FOUNDER_BIO: Verifiable = {
  value:
    "Sets the clinical standard, trains every practitioner, and still keeps a client schedule.",
  verified: false,
  note: "[Founder bio — confirm all three claims]",
};

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

/**
 * Google rating — confirmed by Ben: 5.0 at both open centers, with no rating
 * below five at either. That second half is the stronger fact and the one the
 * copy leans on ("every one of them five stars"); a 5.0 average alone would
 * not license it.
 *
 * **The rating is here; the counts are not.** They are per center, in
 * lib/locations.ts, for the reason the weeks are — 144 and 15 are two facts
 * and no sitewide constant can hold them both. The sitewide figure the review
 * bands print is `combinedReviewCount()`, summed from those, so the band and
 * the two location pages cannot disagree about how many reviews there are.
 *
 * One rating and not one per center because today there is genuinely one:
 * both centers sit at 5.0, so a per-center copy would be the same number
 * written twice. If they ever diverge, the rating moves into `reviews` beside
 * the count and this constant goes the way BUSINESS_HOURS did.
 *
 * `verified` still gates every review surface on the site — the homepage band,
 * the /stories band, and the line in each open center's hero.
 *
 * **No `AggregateRating` in the JSON-LD, deliberately.** Review markup a
 * business emits about itself, on its own site, is the self-serving case
 * Google names as a manual-action risk — and these figures are hand-entered
 * from a screen, not read from Google, so the markup would assert a precision
 * the data behind it doesn't have. The numbers are published as copy, where a
 * reader can go and check them, and asserted to no crawler as structured
 * fact. lib/schema.ts emits no rating node on any page; keep it that way.
 */
export const REVIEWS: Verifiable<{ rating: string }> = {
  value: { rating: "5.0" },
  verified: true,
  note: "[Confirm Google rating]",
};

/**
 * True when any review UI may render — the two bands and the per-center hero
 * line. Shaped like SHOW_PHONE above, and for the same reason: the gate is one
 * expression with one home, so flipping `REVIEWS.verified` back to false takes
 * every review surface off the site at once rather than three pages each
 * remembering to ask.
 */
export const SHOW_REVIEWS = REVIEWS.verified || SHOW_DRAFT_CONTENT;

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
    // REDACTED, not rewritten. The client said "working with Laura"; Laura is
    // not on the confirmed roster and nobody has confirmed she may be named on
    // the site, so the name is replaced with the role it refers to and nothing
    // else in the sentence moves. The name is not load-bearing here — what the
    // quote is about is brain fog, focus and fatigue, and the encouragement at
    // the end — so the testimonial keeps its meaning and its verified status.
    //
    // Do not restore the name on the assumption it was lost. It was taken out.
    text: "I had so many issues with brain fog, focus, and fatigue — working with my practitioner helped me feel like myself again. If you have any hesitations, let my story encourage you. Take the leap.",
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
 * Electrode sites recorded in a Brain Map — the 10-20 montage, so this is a
 * property of the recording rather than a number anyone chose.
 *
 * A plain constant rather than a `Verifiable`: it is not a claim awaiting
 * confirmation, and both graphics in the repo were checked against it (see the
 * GRAPHICS CORRECTIONS note above — "both carry the full 21 electrodes").
 *
 * Three literal 21s predate this and are NOT yet reading it: the homepage
 * brain-map paragraph and its image alt text (app/page.tsx), and the
 * "21-point recording" on /first-visit. Each is mirrored into the assistant's
 * index in lib/chat/site-copy.ts, so converting one means editing its mirror
 * string and adding a copy token in the same change — worth doing, out of
 * scope for the phase 15 copy replacement that introduced this.
 */
export const BRAIN_MAP_POINTS = 21;

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
 * The full course — the recommended protocol, confirmed by Ben.
 *
 * Every page that raised this hedged it as "it genuinely varies", which was
 * honest and useless in the same breath. Someone weighing the package price is
 * asking whether this is open-ended, and "it varies" is the answer that sounds
 * like yes. The protocol, published with the caveat below, answers the
 * question people are actually asking.
 *
 * **This is what a full course *is*, not what clients are observed to do.**
 * That distinction is why the constant is named FULL_COURSE and not
 * TYPICAL_COURSE, which is what it was called until this edit. "A typical
 * course is twelve sessions" is a claim about behaviour — it asserts that
 * people on average complete twelve — and nothing on this site measures
 * completion, so it was a number we could state but not support. The
 * recommended course is twelve sessions whether or not any given person
 * finishes it, which is true independent of completion rates and is the only
 * version of this fact the site can stand behind.
 *
 * Copy must therefore never reintroduce "typically", "most clients", "usually"
 * or "on average" around this number. Those words turn a protocol back into a
 * statistic, and the statistic is the one nobody here has.
 *
 * **`sessions` is its own number and not a reference to PACKAGE_SESSIONS**,
 * though both are 12 today. They are two facts that happen to coincide — what
 * a full course is, and how many sessions the package sells — and wiring one
 * to the other would mean repricing the package silently rewrote the protocol.
 * Copy states them separately and lets a reader put them together; nothing on
 * the site says "the package is exactly a course", because that sentence goes
 * wrong the moment either number moves.
 *
 * `children` is a clause about *course length*, not about how anyone responds.
 * "Children's courses are often shorter" is a fact about the schedule; "children
 * respond faster" would be an outcome claim wearing the same words, and this
 * file's whole job is not letting those two swap places.
 */
export const FULL_COURSE: Verifiable<{
  sessions: number;
  children: string;
}> = {
  value: { sessions: 12, children: "children’s courses are often shorter" },
  verified: true,
  note: "[Confirm full course length]",
};

/**
 * Maintenance, written as the taper it is — confirmed by Ben.
 *
 * One cadence rather than a service, because the fact a reader needs is that
 * the commitment winds *down*. "Maintenance sessions are available" reads as an
 * upsell bolted onto the end of a course; "weekly, then monthly, then a couple
 * of times a year" answers the open-ended question by itself, with no adjective
 * doing the persuading. State the cadence and leave it alone.
 */
export const MAINTENANCE: Verifiable = {
  value:
    "weekly sessions taper to monthly for three months, then quarterly or twice a year",
  verified: true,
  note: "[Confirm maintenance cadence]",
};

/**
 * The caveat that rides the course length wherever it appears.
 *
 * PACKAGE_NOTE's rule applied to the same class of risk: a protocol published
 * without it is a protocol read as a prediction, and the page that omits it is
 * the one someone quotes back. It states what is true about the range rather
 * than about the void — the phase 11d rule for limits, in lib/chat/answer.ts —
 * so it sets an expectation instead of withdrawing one.
 *
 * It says "the recommended course" rather than "the typical shape" for the
 * reason FULL_COURSE is named what it is: the caveat has to disclaim a
 * prediction, not a measurement, and the old wording quietly reasserted the
 * behavioural claim the number itself had just stopped making.
 */
export const COURSE_VARIES_NOTE =
  "That’s the recommended course rather than a promise — how many sessions " +
  "anyone needs varies, and we review it with you at every visit.";

/**
 * What maintenance costs, and what it is not part of.
 *
 * PACKAGE_NOTE's job for PACKAGE_NOTE's reason: state it wherever the taper
 * appears, or the page that leaves it off is the one where "then quarterly or
 * twice a year" reads as covered by the package price.
 *
 * SESSION_PRICE is interpolated rather than restated, and there is deliberately
 * no second price constant: maintenance is a regular session on a longer
 * interval, not a separate product, and a `MAINTENANCE_PRICE` sitting here
 * would be a figure free to drift away from the one it is supposed to equal.
 *
 * **"aren't part of", not "sit outside".** The first draft used the latter, and
 * the word `sit` put this string into the assistant's index carrying a term the
 * concern router depends on: "my son can't sit still long enough to finish
 * anything" routes to focus-adhd on the strength of `sit`, and one more
 * document containing the word lowered its IDF just enough to drop that
 * question's coverage below the gate (lib/chat/retrieve.ts, minCoverage). The
 * audit caught it as an off-topic no-match. Every string in this file is
 * indexed copy as well as page copy — a common word spent here is a word made
 * cheaper everywhere it is load-bearing.
 */
export const MAINTENANCE_NOTE =
  `Maintenance sessions are ${SESSION_PRICE}, the same as any regular session, ` +
  `and they aren’t part of the ${PACKAGE_SESSIONS}-session package.`;

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
 * What happens to what a client tells us — from Ben's client privacy notice,
 * confirmed.
 *
 * Here rather than typed into the one article that needed it, for
 * INSURANCE_POLICY's reason: this is an answer people quote back, and the
 * first page to restate it in slightly different words is the one that ends
 * up being wrong. A /privacy page, the contact form, the FAQ and the
 * assistant would each need it eventually.
 *
 * **Written as what we do, not as a legal claim, and deliberately narrower
 * than the notice it comes from.** The notice's own HIPAA framing is a
 * separate question Ben is reviewing, so nothing here names a statute, says
 * "compliance", or characterises the practice's regulatory status — this
 * describes a practice, and it would remain true whatever that review
 * concludes. Do not add any of that later without Ben saying so.
 *
 * Two standards, and they are not the same, so the sentence keeps them apart:
 * information goes to another provider **only at the client's request**, and
 * it is **never sold**, while marketing use requires explicit consent.
 *
 * Not in the assistant's index. It is a plain constant that no passage in
 * lib/chat/content-index.ts reads, which is a deliberate hold rather than an
 * oversight — a policy passage changes the retrieval corpus and wants the
 * before/after sweep run against it. Worth doing; not done here.
 */
export const INFORMATION_SHARING =
  "Nothing you tell us goes to anyone unless you ask us to send it. We don’t " +
  "sell it, and we don’t use it for marketing unless you’ve told us we can.";

/* ------------------------------------------------------------------ */
/* Privacy notice (/privacy-policy)                                    */
/* ------------------------------------------------------------------ */

/**
 * When the privacy notice last changed. A date a reader can check is the
 * difference between a policy and a page of assurances.
 *
 * Bump it when the notice itself changes — not when the site does.
 */
export const PRIVACY_EFFECTIVE_DATE = "2026-08-23";

/**
 * How long a form submission is kept before it is deleted.
 *
 * **Unverified, and the page drops the whole paragraph without it.** Retention
 * is an operational decision nobody has made: the Supabase table has no
 * expiry, `lib/chat/logging.ts` records that platform retention applies to the
 * server log until somebody chooses otherwise, and no figure exists anywhere
 * in this repository to read. A number invented here would be the one sentence
 * on the page a person could hold the practice to, which is exactly the
 * sentence not to guess at.
 */
export const PRIVACY_RETENTION: Verifiable = {
  value:
    "We keep consultation requests for [retention period] and guide sign-ups " +
    "for [retention period], then delete them.",
  verified: false,
  note: "[Retention period — confirm]",
};

/**
 * The promise to hand back or delete what somebody has sent us.
 *
 * **Unverified.** Every other claim on that page describes something the code
 * already does and can be checked against it. This one is a commitment about
 * how the practice will answer an email, it has no implementation anywhere,
 * and it is the kind of sentence that is quoted back. Ben confirms it or the
 * paragraph does not render.
 */
export const PRIVACY_ACCESS_REQUESTS: Verifiable = {
  value:
    "Ask us for a copy of what you’ve sent us, or ask us to delete it, and " +
    "we will — call or use the contact form and say so.",
  verified: false,
  note: "[Access & deletion requests — confirm]",
};

/**
 * Practitioner training, in Ben's words. It names a third party (OchsLabs) and
 * a certification period, so it is a claim about the practice that has to stay
 * exactly as approved; do not tighten it for rhythm. Deliberately carries no
 * ranking or superlative — Ben's instruction, and the same discipline
 * BRAIN_MAP_CLAIM is held to below.
 *
 * **"Certified" twice is deliberate — do not vary it for rhythm.** The
 * sentence used to read "then trained in-house for three months", and Ben
 * confirmed that the in-house step is a certification in its own right and not
 * a training period that precedes one. Two certifications is the fact: one
 * from the company that created LENS, one from Harmonized. Swapping the second
 * back to "trained" to avoid the repetition would understate the claim, which
 * is the direction this file is normally careful to err in — but understating
 * a credential a practitioner actually holds is its own kind of wrong, and
 * this is the wording that was approved.
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
  "that created LENS, then certified in-house over three months before seeing " +
  "clients on their own. Every session we’ve delivered has shaped how we train.";

/**
 * GRAPHICS CORRECTIONS — apply before either asset ships (Phase 7.5).
 *
 * These live in the artwork, not in code, which is exactly why they are
 * written down here: nothing else in the repo would catch them. The renders
 * are otherwise accurate — both carry the full BRAIN_MAP_POINTS electrodes.
 *
 * The bar chart's Pz (7.0) and F7 (47.0) used to be checked against the copy
 * on /how-lens-works, which named the same two sites and the thresholds they
 * sat either side of. Phase 15 replaced that copy with Fp1, Fp2, T4 and Cz,
 * and deliberately publishes no µV value against any of them — a threshold is
 * a line a reader can hold their own number up against. So the bar graph now
 * agrees with no page, which is one more reason it is placed on none.
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
 *    /how-lens-works now sets the register to match: "sustained attention",
 *    "impulse control", "emotional regulation", "sensory sensitivity". Label
 *    the graphic in those words and it agrees with the page it sits on.
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
