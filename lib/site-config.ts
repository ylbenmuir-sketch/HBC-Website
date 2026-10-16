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

/**
 * Primary email — supplied by Ben, 23 August 2026, and the first address this
 * site publishes anywhere. The note on PRIVACY_ACCESS_REQUESTS below said the
 * address was Ben's to supply and that it belonged in this file; this is that
 * note being answered rather than overruled.
 *
 * Shaped like PHONE above, and gated the same way, because it is the same kind
 * of fact: a contact route a visitor may act on, which is wrong to publish
 * unless somebody confirmed it. Unverifying it takes the address out of the
 * privacy notice's access paragraph and that paragraph falls back to the
 * phone-and-form wording it carried before — see PRIVACY_ACCESS_REQUESTS.
 *
 * **It is published in exactly one place: that paragraph.** Not the footer,
 * not /contact, not the NAP block on either location page, and not as `email`
 * on the schema nodes. Each of those is a defensible place for it and none of
 * them was asked for — a footer address is an address every scraper on the
 * internet has, which is a decision to take deliberately rather than to
 * acquire as a side effect of the privacy page needing a route.
 */
export const EMAIL: Verifiable = {
  value: "ben@harmonizedbraincenterstn.com",
  verified: true,
  note: "[Confirm email address]",
};
export const EMAIL_ADDRESS = EMAIL.value;
/** True when any email UI (currently the privacy access paragraph) may render. */
export const SHOW_EMAIL = EMAIL.verified || SHOW_DRAFT_CONTENT;

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

/**
 * Routes the assistant stays off, even with the flag on.
 *
 * /contact (Ben, 2026-10-13): the sticky ask bar loads at full height and
 * only collapses on scroll, so on a 1366×768 desktop it sat over the form's
 * submit row. The fix is not a shorter bar or a tighter form — the bar is
 * unchanged everywhere else, and the form's fold budget has been re-cut
 * enough — it is that a page whose whole job is the call request does not
 * also offer a chat field under it. Nothing docks on this route: no ask bar,
 * no assistant chunk, no footer reserve.
 *
 * Path prefixes, matched the way the layout audit matches them: the route
 * itself and anything beneath it. Read by components/BottomBarContext.tsx,
 * which is the one place that decides what is at the bottom of the screen.
 */
export const ASSISTANT_SUPPRESSED_ROUTES = ["/contact"] as const;

/** True when the assistant must not render on this pathname. */
export function assistantSuppressedOn(pathname: string | null): boolean {
  if (!pathname) return false;
  return ASSISTANT_SUPPRESSED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

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
 * The founder's team-card bio — claims about a named person, so it stays a
 * `Verifiable` even now that it is verified: a bio that ever needs
 * re-confirming comes off the card with one flag, the way the previous
 * wording did.
 *
 * Rewritten September 2026 from the bio on the practice's previous site, per
 * Ben's roster brief, and confirmed by Ben on the deployed preview — the
 * Colorado origin story included. What the old bio said that this one
 * deliberately does
 * not: "the nation's leading LENS practitioner" (no ranking or superlative
 * claims anywhere on this site), her personal session count (unverified),
 * and "opened in 2015" (the founding year is 2016 — ESTABLISHED_YEAR, below,
 * which this string cannot interpolate without reordering the file, so it
 * names no year and the proof band states it instead). "Keeps a client
 * schedule in Nashville" is confirmed by Ben's center assignment, which
 * lists her at the Nashville center like any other practitioner.
 *
 * The previous value — "Sets the clinical standard, trains every
 * practitioner, and still keeps a client schedule" — shipped unverified and
 * was gated off; the first two of its three claims were never confirmed and
 * are not restated here.
 */
export const FOUNDER_BIO: Verifiable = {
  value:
    "LENS came into her life through family — her brother and sister-in-law " +
    "opened a LENS practice in Colorado after her nephew's brain injury. She " +
    "trained as a practitioner, brought the work to Tennessee, and still " +
    "keeps a client schedule in Nashville.",
  verified: true,
  note: "[Founder bio — Ben to review wording]",
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

/*
 * SAME_DAY_CALLBACK ("a real person calls you back today") was retired on
 * 2026-10-14 (Ben): the site, the assistant and the emails make no
 * callback-timing promise — "calls you back soon", never "today".
 */

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
 * answer (lib/chat/unanswerable.ts). (The assistant's booking flow used to
 * pool the weeks into a callback promise; since 2026-10-14 it promises no
 * time at all — "will call you soon", never "today".) One fact, one home,
 * per center.
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

/** The session length as a number, for "What it takes"'s "30 min"; the
 *  sentence form below is built from it, so the two can't disagree. */
export const SESSION_MINUTES = 30;

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
  value: `about ${SESSION_MINUTES} minutes`,
  verified: true,
  note: "[Confirm typical length]",
};

/**
 * Pricing — confirmed by Ben.
 *
 * One source for the CTA label, the `/first-visit` cost card, FAQ 12, the
 * assistant's pricing passage, the §3 refusal that quotes the published
 * prices back at a discount request — and, since Oct 2026, the concierge
 * rates, which are these two figures plus a surcharge (CONCIERGE_PRICE
 * below). That is why the two center rates are numbers first and display
 * strings second: the concierge page adds to them, and a string cannot be
 * added to. Every other reader still uses the `$`-formatted export it
 * always did. The package figures stay display strings; the arithmetic
 * behind PACKAGE_SAVING is checked in the comment rather than computed, so
 * a change to one figure and not the others is visible in review.
 *
 * 12 × $125 = $1,500, less $1,300 = $200 saved.
 */
export const usd = (n: number) => `$${n.toLocaleString("en-US")}`;
export const BRAIN_MAP_PRICE_USD = 150;
export const SESSION_PRICE_USD = 125;
export const BRAIN_MAP_PRICE = usd(BRAIN_MAP_PRICE_USD);
export const SESSION_PRICE = usd(SESSION_PRICE_USD);
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
 * Every "21" on the site reads it now (Oct 2026): the homepage handoff and
 * its image alt, /first-visit's cost card, and all of /brain-map. The
 * mirrors in lib/chat/site-copy.ts carry it as the {BRAIN_MAP_POINTS} copy
 * token, so the pages and the assistant cannot disagree about the count.
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
 * Two FAQ answers only Ben can give (2026-10-15). Both questions — "What if it
 * isn't working for me?" and "Do people feel anything after a session?" —
 * stay off /faq, the FAQPage schema, llms.txt and the assistant's index in
 * production until these are verified (lib/faq.ts), and
 * REQUIRE_VERIFIED_CONTENT=true names both (lib/content-validation.ts).
 *
 * Do not draft either. The refund policy is a promise about money; what
 * clients report after a session is a claim about effects. Each must be
 * Ben's own words, pasted into `value` with `verified: true`.
 */
export const UNUSED_SESSIONS_POLICY: Verifiable<string | null> = {
  value: null,
  verified: false,
  note: "[CONFIRM: stop / refund policy for unused package sessions]",
};
export const AFTER_SESSION_REPORT: Verifiable<string | null> = {
  value: null,
  verified: false,
  note: "[CONFIRM: what clients most commonly report after a session — founder to supply]",
};

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
/* Credibility                                                         */
/* ------------------------------------------------------------------ */

/**
 * The physician-referral claim — approved copy, and the strongest credibility
 * signal the practice has.
 *
 * It lived in one place: the `overview.approach` field of `/concerns/concussion`
 * in lib/concerns.ts, which put it on the concussion page and its hub entry
 * and nowhere else. A doctor-refers-to-us claim is not a concussion fact. It
 * belongs wherever somebody is deciding whether to trust the practice, which
 * is /about, both location pages, and the homepage proof band
 * (SEO-AUDIT-2.md §5, §8.2 C11).

 * Here, in one place, for INSURANCE_POLICY's reason: a sentence restated on
 * five pages is a sentence that will read five different ways within a year,
 * and this one is a claim about other people's behaviour. Do not paraphrase it
 * at a call site.
 *
 * A plain constant, not a `Verifiable`. It is approved copy already on the
 * live site, not a fact awaiting confirmation.
 *
 * The concussion page still carries it, and still carries the sentence about
 * athletes and car accidents that follows it — that page's copy is approved as
 * a block and moving the line off it would be an edit to approved copy rather
 * than a placement decision.
 */
export const PHYSICIAN_REFERRALS =
  "Physicians in Middle Tennessee refer patients to us — we work from a " +
  "standing referral list.";

/* ------------------------------------------------------------------ */
/* Privacy notice (/privacy-policy)                                    */
/* ------------------------------------------------------------------ */

/**
 * When the privacy notice last changed. A date a reader can check is the
 * difference between a policy and a page of assurances.
 *
 * Bump it when the notice itself changes — not when the site does.
 */
export const PRIVACY_EFFECTIVE_DATE = "2026-10-15";

/**
 * How long a form submission is kept before it is deleted — confirmed by Ben.
 *
 * Two periods, because they are two different things: a consultation request
 * is a conversation that may still be live, and its clock runs from the last
 * time anybody was in touch rather than from the day it arrived. A guide
 * sign-up is an email address that asked for a PDF, and nothing follows it.
 *
 * Written as what we do, and it ends by saying what happens at the end of the
 * period, because a retention sentence that names a number and stops has told
 * a reader the least interesting half of it.
 *
 * **Nothing here implements this yet.** The Supabase table has no expiry and
 * there is no deletion job; the sentence describes a practice somebody carries
 * out. If that changes — a scheduled purge, a different period — this constant
 * and the job have to move together, and this is the copy a person will hold
 * the practice to.
 */
export const PRIVACY_RETENTION: Verifiable = {
  value:
    "We keep consultation requests for 24 months from the last time we were " +
    "in touch, and guide sign-ups for 12 months. At the end of that we delete " +
    "them.",
  verified: true,
  note: "[Retention period — confirm]",
};

/**
 * The promise to say what we hold about someone, and to delete it — confirmed
 * by Ben.
 *
 * **Deliberately promises no timeframe.** "We'll respond within X days" is the
 * natural next clause and it is not confirmed, so it is not here. An
 * unqualified "we will" is a commitment the practice can keep; a deadline
 * nobody has agreed to is one it might not.
 *
 * **Three routes now, because Ben supplied an address.** This note used to
 * record that the site published no email address anywhere, and that inventing
 * one — Resend's shared test sender from a code comment, or the commented-out
 * `LEADS_NOTIFY_EMAIL` in .env.example — would have been publishing a route
 * nobody reads. EMAIL above closes that: a real inbox, confirmed, and this is
 * the one paragraph on the site that renders it. Email leads because it is the
 * route that suits this particular request — a data question is a thing a
 * person wants in writing, with a copy of what they sent.
 *
 * **The routes are gated on SHOW_EMAIL, and the fallback is the wording that
 * shipped before.** Unverifying EMAIL does not leave a sentence pointing at an
 * address the site is no longer sure of; it restores "Call us or use the
 * contact form", which is a true sentence in its own right. That is the whole
 * reason the copy is assembled here rather than typed as one literal.
 *
 * The address is rendered as a `mailto:` link by the privacy page, which
 * splits this string on EMAIL_ADDRESS to find it. Keep the address in the
 * sentence verbatim — no formatting, no line break through it — or it renders
 * as plain text, which is a degradation rather than a break.
 */
export const PRIVACY_ACCESS_REQUESTS: Verifiable = {
  value:
    "You can ask us what we hold about you, and you can ask us to delete it. " +
    "Either way, we will. " +
    (SHOW_EMAIL
      ? `Email us at ${EMAIL_ADDRESS}, call us, or use the contact form, `
      : "Call us or use the contact form ") +
    "and say that’s what you’re asking about.",
  verified: true,
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
 *    /brain-map now sets the register to match: "sustained attention",
 *    "impulse control", "emotional regulation", "sensory sensitivity". Label
 *    the graphic in those words and it agrees with the page it sits on.
 *
 * Where the renders sit (Oct 2026): the bar chart Ben supplied
 * (public/images/brain-map-chart.svg, inlined as components/BrainMapChart.tsx)
 * is the primary image on /brain-map and the homepage, because it is what a
 * client receives today; the corrected heat map (/images/brain-map-heat.png)
 * renders beneath it as a coming-soon preview. BRAIN_MAP_HEATMAP_LIVE below
 * swaps them back. /brain-map renders the PlaceholderPlate for the lobe
 * graphic beside the four-site section (moved there from /how-lens-works,
 * Oct 2026): items 3 and 4 above are unfixed because that asset has not been
 * supplied. The older bar graph (/images/brain-map-bars.png) is in the repo
 * but not placed on any page. See CONTENT-CHECKLIST.md → Photography.
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

/**
 * BRAIN MAP IMAGERY — the temporary swap (Ben, 2026-10-13).
 *
 * What a client receives today is the bar chart: amplitude at each of the
 * BRAIN_MAP_POINTS sites. The head-shaped heat map is the software that is
 * still coming. So the chart is the primary image in the "what you walk away
 * with" block on the homepage and /brain-map, and the heat map is a
 * coming-soon preview beneath it — one component decides this,
 * components/BrainMapFigure.tsx, and this constant is its only input.
 *
 * **When the heat-map software ships, set this to `true`.** The heat map
 * returns as the primary image on both pages, the coming-soon block (and
 * BRAIN_MAP_HEATMAP_CLAIM with it) disappears, and the chart goes with it.
 * Nothing else needs touching; the build-time check below stops asking for
 * the claim the same moment. README → "The Brain Map imagery" has the
 * procedure.
 */
export const BRAIN_MAP_HEATMAP_LIVE = false;

/**
 * The coming-soon line's claim. Confirmed by Ben (2026-10-13) in this exact
 * wording — "the only", not "the first" — so it ships in production. It
 * stays a `Verifiable` so that flipping `verified` back to false takes the
 * sentence off both pages and fails the REQUIRE_VERIFIED_CONTENT build in
 * one move; the line it follows ("Your brain in full color — the same
 * recording, mapped.") reads complete without it. Only rendered while
 * BRAIN_MAP_HEATMAP_LIVE is false — the block it sits in is the coming-soon
 * preview. Still the one superlative on the site that BRAIN_MAP_CLAIM's
 * note warns against: approved wording, do not tighten or extend it.
 */
export const BRAIN_MAP_HEATMAP_CLAIM: Verifiable = {
  value: "The only LENS practice in the country to show it this way.",
  verified: true,
  note: "[Confirm basis for the claim]",
};

// PRICING_TAG, HSA_FSA_TAG, INSURANCE_TAG, TRAINING_CLAIM_TAG and
// FIRST_VISIT_DURATION_TAG were deleted when Ben confirmed the facts behind
// them. Their copy is above — SESSION_PRICE and the package figures,
// INSURANCE_POLICY, TRAINING_CLAIM, FIRST_VISIT_DURATION — and the passages
// they were holding out of the assistant's index are back in it.
export const CONTACT_RESPONSE_TAG = "[Confirm response time]";

/* ------------------------------------------------------------------ */
/* Concierge (/concierge)                                              */
/* ------------------------------------------------------------------ */

/**
 * The concierge service: the founder travels to the client's home or
 * business and runs LENS there, for one person or a household in the same
 * visit. Five facts confirmed by Ben (Oct 2026); one still open.
 *
 * Each stays a `Verifiable` even now that it is verified, for the reason the
 * hours and the session length do: /concierge reads `verified`, so a fact
 * that ever needs re-confirming comes off the page with one flag, and
 * lib/content-validation.ts lists every one by name on the launch gate.
 */

/**
 * Concierge pricing — confirmed by Ben: the center rates plus a surcharge
 * per person, per session, the same whether one person or the whole family
 * is seen. **Derived from BRAIN_MAP_PRICE_USD and SESSION_PRICE_USD**, never
 * typed: a change to a center rate moves the concierge rate with it, and
 * the two cannot drift. Today: $150 + $100 = $250 for the first visit (the
 * Brain Map and consultation), $125 + $100 = $225 for each session after.
 *
 * The surcharge is a modest one for the founder's time and the drive — the
 * page frames it that way, not as a luxury markup. Do not add a family
 * discount or a travel fee here without Ben confirming it exists.
 */
export const CONCIERGE_SURCHARGE_USD = 100;
export const CONCIERGE_PRICE: Verifiable<{
  surchargeUsd: number;
  firstVisitUsd: number;
  sessionUsd: number;
}> = {
  value: {
    surchargeUsd: CONCIERGE_SURCHARGE_USD,
    firstVisitUsd: BRAIN_MAP_PRICE_USD + CONCIERGE_SURCHARGE_USD,
    sessionUsd: SESSION_PRICE_USD + CONCIERGE_SURCHARGE_USD,
  },
  verified: true,
  note: "[CONFIRM concierge pricing]",
};

/** Service area — confirmed by Ben, verbatim. */
export const CONCIERGE_TRAVEL_RADIUS: Verifiable = {
  value:
    "Middle Tennessee — generally within about an hour of our Nashville or " +
    "Murfreesboro centers. Farther by arrangement.",
  verified: true,
  note: "[CONFIRM travel radius or service area from each center]",
};

/**
 * Who comes — confirmed by Ben: the founder herself. Positioning, not a
 * limitation — it is the reason the tier costs more — so the sentence says
 * who and why, and nothing about how soon. Do not add "usually within the
 * week" or any availability claim; none is confirmed.
 */
export const CONCIERGE_PRACTITIONERS: Verifiable = {
  value:
    `${FOUNDER_DISPLAY_NAME}, our founder and Clinical Director, is the ` +
    `practitioner for every concierge visit.`,
  verified: true,
  note: "[CONFIRM which practitioners travel]",
};

/** The Brain Map at home — confirmed by Ben: yes, no center visit needed to start. */
export const CONCIERGE_BRAIN_MAP: Verifiable = {
  // Not "your first visit": the phrase is what "how much is the first
  // visit" routes on, and it pulled this passage into that question's four.
  value:
    "Yes. The Brain Map can be recorded at your home or office; no center " +
    "visit is required to start.",
  verified: true,
  note: "[CONFIRM whether the first visit (the Brain Map) can happen at home]",
};

/** Minimums — confirmed by Ben: none, of either kind. */
export const CONCIERGE_MINIMUM: Verifiable = {
  // Ben's words. Not "minimum number of": "number" is the phone passage's
  // key, and it pulled this one into "what's your phone number".
  value: "No minimum. No minimum sessions, no minimum people.",
  verified: true,
  note: "[CONFIRM minimum booking or household minimum]",
};

/**
 * Whether the 12-session package applies to concierge visits — undecided
 * (Oct 2026). Until it is, /concierge says nothing about the package in
 * either direction: not "the package applies", not "the package is
 * center-only". Draft renders the tag; production renders nothing.
 */
export const CONCIERGE_PACKAGE: Verifiable = {
  value: "",
  verified: false,
  note: "[CONFIRM whether the 12-session package applies to concierge visits]",
};

/** The practice's YouTube channel — supplied by Ben, Oct 2026. In the Organization's `sameAs`. */
export const YOUTUBE_CHANNEL_URL = "https://www.youtube.com/@HarmonizedBrainCentersTN";

/* ------------------------------------------------------------------ */
/* Videos (lib/videos.ts)                                              */
/* ------------------------------------------------------------------ */

/**
 * "What to Expect: Appointment #1" (YouTube FCUyUqzE3Dk) — the video shown
 * after a contact-form submission. Its running time and upload date are
 * facts the schema publishes (VideoObject `duration` / `uploadDate`), so
 * they are Verifiables: both confirmed by Ben from YouTube Studio,
 * 2026-10-13. Flip `verified` back to false and the caption drops the
 * duration and the schema omits both fields rather than guess
 * (lib/schema.ts rule 1).
 */
export const VIDEO_APPOINTMENT_ONE_DURATION: Verifiable<number | null> = {
  // 48, not 49: YouTube Studio rounds up, the player reports 0:48, and the
  // caption and the VideoObject should match the file (Ben, 2026-10-13).
  value: 48,
  verified: true,
  note: "[Confirm video running time, in seconds]",
};
export const VIDEO_APPOINTMENT_ONE_UPLOAD_DATE: Verifiable<string | null> = {
  value: "2025-04-30",
  verified: true,
  note: "[Confirm video upload date, YYYY-MM-DD]",
};

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
