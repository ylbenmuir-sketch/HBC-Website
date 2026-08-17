import { concerns, type Concern } from "../concerns";
import { SITE_FAQS } from "../faq";
import {
  communitiesServed,
  formattedAddress,
  locations,
  type Location,
} from "../locations";
import {
  BRAIN_MAP_NAME,
  BRAIN_MAP_POINTS,
  BRAIN_MAP_PRICE,
  DISCLAIMER,
  ESTABLISHED_YEAR,
  FIRST_VISIT_DURATION,
  INSURANCE_POLICY,
  PACKAGE_NOTE,
  PACKAGE_PRICE,
  PACKAGE_SAVING,
  PACKAGE_SESSIONS,
  PHONE,
  RISK_REVERSAL,
  SAME_DAY_CALLBACK,
  SESSION_LENGTH,
  SESSION_PRICE,
  STAT_SESSIONS,
  SITE_NAME,
  TRAINING_CLAIM,
  type Verifiable,
} from "../site-config";
import {
  MIRRORED_PAGES,
  type ConfirmTagName,
  type CopyToken,
} from "./site-copy";
import type { Passage } from "./types";

/**
 * The site assistant's knowledge base (phase-8-chatbot.md §2).
 *
 * Server-side only. This is the entire set of things the assistant knows: all
 * 8 concerns and their 24 FAQs, the 14 questions on /faq, the centers, the
 * four pages whose copy is mirrored in site-copy.ts, and the sitewide
 * policies. If a fact is not in here, the assistant does not have it — §2 is
 * explicit that a confident wrong answer about a wellness service is worse
 * than "I don't know."
 *
 * Everything except site-copy.ts is imported from the module that owns it, so
 * confirming a fact or rewriting an answer updates the page and the assistant
 * in the same edit.
 *
 * ## What is deliberately excluded
 *
 * Three gates, in the order they were needed. All three ignore
 * SHOW_DRAFT_CONTENT, so the index is identical in dev and production: a page
 * can render an unverified value behind a gold [CONFIRM] tag and a
 * conversation cannot, which means the only safe behaviour is not knowing it.
 *
 * - **Unverified facts** — `confirmed()`, for anything held in a `Verifiable`.
 *   Excluded today: the Google rating, the response-time and start-timing
 *   claims, the founder quote, the Brain Map differentiator claim, Franklin's
 *   opening date and street address, every [Name] practitioner.
 * - **Draft copy** — `draftFree()`, for data-driven strings still carrying a
 *   [bracketed] note.
 * - **Copy the site tags with a `ConfirmTag` sibling** — the `confirmTag`
 *   field, applied where CONTENT_INDEX is filtered out of ALL_PASSAGES at the
 *   foot of this file. The two gates above both read the *string*; this one
 *   covers the case neither can see, where the copy is plain text and the
 *   [CONFIRM] tag is the element next to it. `page:first-visit:insurance`
 *   passed both gates and had the assistant stating an HSA/FSA policy the page
 *   flags as unconfirmed on the same screen. See `confirmTag` in ./types.ts,
 *   and `CONFIRM_TAG_INVENTORY` in ./site-copy.ts for every tag on every page
 *   the index draws from.
 * - **Opening hours.** Confirmed, published on the location pages and emitted
 *   as `openingHoursSpecification` — and still deliberately not indexed. The
 *   two centers keep different weeks, so there is no single week to retrieve
 *   and a passage would have to be written twice; ./unanswerable.ts answers
 *   the question from lib/locations.ts instead, naming both weeks and the
 *   difference. A fact held as data does not become a passage just because it
 *   is now sayable.
 * - **Testimonials and the location quotes.** Verified quotes are real and
 *   permissioned, but a retrieved testimonial invites the assistant to imply
 *   an outcome, and §1 forbids predicting outcomes. Proof is the page's job,
 *   not the assistant's.
 * - **The homepage's three-question FAQ block.** A shortened restatement of
 *   /faq answers already indexed; two near-identical passages would compete
 *   with each other and cite the weaker page.
 */

/**
 * Verified values only, in every environment — unlike `verifiedOr()`, which
 * hands back drafts whenever SHOW_DRAFT_CONTENT is on. See the note above.
 *
 * Exported because ./answer.ts states two of these facts — the session count
 * and the founding year — as standing facts the model may use on any turn, and
 * a second copy of this two-line rule is how one of them would eventually
 * outlive its `verified: false`.
 */
export function confirmed<T>(v: Verifiable<T>): T | null {
  return v.verified ? v.value : null;
}

/**
 * The [CONFIRM] tags that gate indexed copy, resolved from the names
 * site-copy.ts records. Exhaustive over `ConfirmTagName`, so confirming a fact
 * and deleting its constant fails the build here — the passage cannot stay
 * excluded by accident once the reason for excluding it is gone.
 *
 * Empty because that is exactly what happened: it held five tags, Ben
 * confirmed all five, and each deletion broke this record until the passage it
 * was excluding came back. Passages excluded by a `ConfirmTag` today come from
 * data instead — `communitiesTag` on the two centers whose community list is
 * still unconfirmed.
 */
const CONFIRM_TAG_VALUES: Record<ConfirmTagName, string> = {};

/**
 * Words a visitor is likely to use that the site's own copy does not contain —
 * the site says "cost", people type "price"; it says "Anxiety &
 * nervous-system overload", people type "panic". These route a question to the
 * right passage and are never shown or quoted: they are search keys, not
 * content, and nothing here asserts that LENS addresses a named condition.
 *
 * ## What these are for (phase 11c)
 *
 * A visitor describes a symptom, not a category. Nobody types "emotional
 * regulation"; they type "she melts down over nothing". Six of the 33 questions
 * in `npm run check:answers` used to reach no model at all, and every one of
 * them failed **here** rather than at a threshold — the passage scored well and
 * simply was not *filed* under the words she used. The subject gate is what
 * rejected them, which is the gate working exactly as designed: a passage has
 * to be about something that was asked.
 *
 * So two kinds of entry live in these lists, and both are routing keys:
 *
 * 1. **The visitor's word for the site's word** — "tantrum" for "meltdown",
 *    "jumpy" for "startling easily", "wired" for "on alert".
 * 2. **The site's own word, made findable** — "homework", "stall", "standoff",
 *    "fuse" all appear in this concern's published copy and were reachable
 *    only through its prose. Filing them here is what lets a question about
 *    them land on the passage that already answers it.
 *
 * ## Two rules learned the hard way
 *
 * **A word can belong to more than one concern.** "Homework takes three hours"
 * is the focus page's own hero line *and* the children-school page's nightly
 * battle. Filing "homework" under one of them is what sent that question to
 * no-match. Where a word genuinely belongs to two concerns it is listed in
 * both, and BM25 decides which passage answers — both answers are right.
 *
 * **Stems, not words.** ./retrieve.ts stems the query and these lists with the
 * same crude function, so "meltdown" and "melts down" are *different tokens*:
 * one stems to `meltdown`, the other to `melt` + `down`. The alias list held
 * "meltdown" for months while every parent who wrote "she melts down" got
 * no-match. Where a phrase splits, both forms are listed.
 */
const CONCERN_ALIASES: Record<string, string[]> = {
  anxiety: [
    "anxious", "worry", "worried", "panic", "nervous", "edge", "tense", "racing", "calm",
    // "settle" and "relax" are how the page's own promise is worded back at
    // us ("tired of being told to just relax"); "alert" and "braced" are its
    // recognize lines. All four were reachable only through prose.
    "settle", "settled", "relax", "alert", "braced", "brace", "overreact", "unwind",
    // "Thoughts that won't quiet down — especially at night" is the first
    // recognize line on the page. "My thoughts won't quiet down at night"
    // scored coverage 1.0 against it and was rejected for not being filed
    // under a single word of itself.
    "thought", "quiet",
    // "I can't switch off" — Ben's call. Sleep ("a mind that won't shut off at
    // night") and stress-resilience ("a system that never stands down") both
    // had a claim on it, and the question fails the subject gate at coverage
    // 1.0, so whichever list holds the word wins it outright. Anxiety it is.
    // Only "switch": "off" is in "shut off", "off his medication" and "a day
    // off", and a word that common files the concern under other people's
    // questions.
    "switch", "off",
  ],
  "focus-adhd": [
    "adhd", "add", "attention", "concentrate", "distracted", "procrastinate", "task", "scattered",
    // "homework" is deliberately here AND on children-school — see the note
    // above. "sit" and "still" are this concern's own FAQ ("Does my child have
    // to sit still during a session?"), and the words a parent reaches for
    // first.
    "homework", "sit", "still", "restless", "fidget", "finish", "stall", "focused",
    "forgetful", "son", "daughter",
    // "Losing track mid-task" is the page's own line. "loses"/"losing" stem
    // apart, so both are listed.
    "start", "track", "lose", "losing",
  ],
  sleep: [
    "insomnia", "asleep", "awake", "night", "bed", "bedtime", "tired", "rest", "3am",
    // "wired" and "shut" are the page's own words ("a wired, on-alert
    // evening", "a mind that won't shut off"). "wake"/"waking" are listed
    // together because the stemmer takes them to different tokens.
    "wired", "shut", "wake", "waking", "restless", "exhausted", "nap", "sleepless",
    // NOT "son"/"daughter", though "my son wakes up several times a night" is
    // a real question that still misses (coverage 0.49). Adding them here put
    // the word on nine more passages, which lowered its IDF everywhere — and
    // that alone dropped "my son can't sit still long enough to finish
    // anything" from 0.51 back under the floor. An alias is not free to the
    // concern next door: a word spread across more passages is worth less to
    // every question that depends on it. Widen from the concern that owns the
    // word, not from all of them.
  ],
  "emotional-regulation": [
    "meltdown", "tantrum", "anger", "angry", "outburst", "upset", "transition", "regulate",
    // "melt" is the one that mattered: "she melts down" never matched
    // "meltdown". "fuse", "standoff" and "recovery" are the page's own words.
    "melt", "fuse", "standoff", "recovery", "patience", "snap", "snapping", "explode",
    "overwhelmed", "daughter", "son", "change", "calm",
  ],
  "brain-fog": [
    "fog", "foggy", "memory", "forget", "forgetful", "cloudy", "word", "recall", "fatigue",
    // "forgetting" stems to `forgett`, which neither "forget" nor
    // "forgetful" reaches — the same stem trap as meltdown/melt.
    "slow", "reread", "paragraph", "remember", "forgetting", "blank", "sharp",
  ],
  "stress-resilience": [
    "burnout", "burned", "overwhelm", "exhausted", "empty", "recover", "pressure",
    // The physical line — "carrying stress physically: jaw, shoulders, gut" —
    // and "restore", from the goal card.
    "restore", "jaw", "shoulder", "gut", "drained", "cope", "burn",
  ],
  "children-school": [
    "school", "homework", "teacher", "class", "grade", "student", "morning", "kid", "child",
    // Shared with emotional-regulation on purpose: "meltdowns over
    // transitions" is this page's own recognize line as well as that one's
    // subject.
    "battle", "standoff", "meltdown", "melt", "transition", "sensory", "frustration",
    "bright", "son", "daughter", "teen", "homeschool",
  ],
  // Not "safe": on this page the word belongs to "the past keeps the present
  // from feeling safe", and it would pull "Is LENS safe?" — a §7 accuracy
  // question with a plain answer on /faq — into trauma copy.
  trauma: [
    "trauma", "ptsd", "past", "vigilant", "startle", "flashback",
    // "jumpy" is what people type; the page says "startling easily". "guard"
    // is its own goal card ("sleep that isn't standing guard").
    "jumpy", "startling", "guard", "braced", "brace", "hypervigilant", "trigger",
  ],
};

/**
 * Routing hints for /faq, keyed by the question as written in lib/faq.ts.
 *
 * These are the site's most-asked questions and the ones visitors phrase least
 * like the page does — "how much", "medicare", "side effects", "is my kid too
 * young". Kept here rather than in lib/faq.ts because they are retrieval keys,
 * not page content; an edit to a question drops its keys and warns below.
 */
const FAQ_KEYWORDS: Record<string, string[]> = {
  "What is LENS neurofeedback?": ["lens", "neurofeedback", "low", "energy", "system", "signal", "sensor"],
  "Is it safe?": ["safe", "safety", "risk", "risky", "danger", "dangerous", "side", "effect", "harm"],
  "Does it hurt?": ["hurt", "pain", "painful", "uncomfortable", "needle", "shock", "feel"],
  "Is it appropriate for children?": ["child", "kid", "age", "old", "young", "toddler", "teen", "teenager", "son", "daughter", "year", "appropriate"],
  "Do I have to do anything during the session?": ["anything", "screen", "task", "practice", "homework", "effort", "participate", "passive"],
  "How long is a session?": ["long", "time", "minute", "hour", "duration", "length", "quick"],
  // Ben confirmed the course and the taper, so this answer now carries both —
  // and the question it has to be reachable by changed with it. "How many
  // sessions" was never the only way people ask; "is this ongoing", "do I have
  // to keep coming", "forever" are the same question asked by someone weighing
  // the package price, and before these keys they retrieved nothing.
  //
  // Deliberately NOT "long": that word belongs to "How long is a session?" two
  // entries up, and the note in ./unanswerable.ts records what happened the
  // last time the two competed — "how long is a session" landed here and got a
  // confident answer to a question nobody asked. Distinctive terms only.
  "How many sessions will I need?": ["many", "number", "often", "frequency", "week", "course", "program", "commit", "maintenance", "taper", "ongoing", "indefinitely", "forever", "monthly", "quarterly"],
  "What does the first visit include?": ["first", "visit", "include", "baseline", "recording", "plan", "conversation"],
  "What kinds of concerns do clients come in with?": ["concern", "kind", "issue", "problem", "reason", "symptom", "struggle"],
  "Is this therapy or medical treatment?": ["therapy", "medical", "treatment", "diagnose", "psychiatric", "substitute", "clinic", "counseling"],
  "Can I continue seeing my doctor or therapist?": ["doctor", "therapist", "psychiatrist", "counselor", "medication", "prescriber", "alongside", "coordinate", "continue", "keep", "stop"],
  "What does it cost?": ["cost", "price", "pricing", "much", "expensive", "afford", "pay", "fee", "payment", "dollar", "free"],
  "Does insurance cover it?": ["insurance", "cover", "coverage", "hsa", "fsa", "medicare", "medicaid", "reimburse", "claim", "bill"],
  "What if I'm unsure whether it's right for me?": ["unsure", "sure", "right", "fit", "skeptical", "doubt", "hesitant", "worth", "sceptical"],
};

/** Retrieval keys shared by every passage about a given center. */
const LOCATION_KEYWORDS = [
  "location",
  "located",
  "where",
  "address",
  "directions",
  "near",
  "nearby",
  "drive",
  "visit",
  "center",
  "office",
  "clinic",
];

function concernPassages(c: Concern): Passage[] {
  const href = `/concerns/${c.slug}`;
  const keywords = [
    ...c.slug.split("-"),
    ...(CONCERN_ALIASES[c.slug] ?? []),
  ];

  return [
    {
      id: `concern:${c.slug}:signs`,
      kind: "concern",
      title: c.title,
      href,
      question: `Do you help with ${c.shortTitle.toLowerCase()}?`,
      keywords,
      text: `${c.title} — ${c.who}. ${c.heroSub} ${c.overview.recognize} People describe: ${c.recognize.join("; ")}.`,
    },
    {
      id: `concern:${c.slug}:approach`,
      kind: "concern",
      title: c.title,
      href,
      keywords,
      text: `${c.overview.approach} ${c.howHelp.p1} ${c.howHelp.p2}`,
    },
    {
      // The wellness-service boundary, in the words this concern's own page
      // uses. Retrievable on its own so a question that edges toward treatment
      // finds the site's actual language rather than an approach paragraph.
      id: `concern:${c.slug}:limits`,
      kind: "concern",
      title: `${c.title} — what LENS is and isn't`,
      href,
      keywords: [...keywords, "treat", "treatment", "cure", "diagnose", "medication", "instead", "replace"],
      text: c.howHelp.note,
    },
    {
      id: `concern:${c.slug}:goals`,
      kind: "concern",
      title: `${c.title} — common goals`,
      href,
      keywords: [...keywords, "goal", "hope", "change", "better", "improve"],
      text: `${c.goalsHeading} ${c.goals.join(" ")}`,
    },
    ...c.faqs.map((faq, i): Passage => ({
      id: `concern:${c.slug}:faq:${i + 1}`,
      kind: "concern-faq",
      title: c.title,
      href,
      question: faq.q,
      keywords,
      text: faq.a,
      confirmTag: faq.confirmTag,
    })),
  ];
}

function locationPassages(loc: Location): Passage[] {
  const href = `/locations/${loc.slug}`;
  const keywords = [...LOCATION_KEYWORDS, loc.name.toLowerCase(), ...loc.county.toLowerCase().split(" ")];
  const passages: Passage[] = [];

  // formattedAddress() returns null while the street address or ZIP is still a
  // [placeholder], which is what keeps Franklin's address out of the index —
  // the same gate the page and the JSON-LD use.
  const address = formattedAddress(loc);
  const parking = loc.comingSoon ? null : draftFree(loc.cardExtra);

  if (loc.comingSoon) {
    passages.push({
      id: `location:${loc.slug}:coming-soon`,
      kind: "location",
      title: `${loc.name} — coming soon`,
      href,
      question: `Do you have a center in ${loc.name}?`,
      keywords: [...keywords, "open", "opening", "soon", "waitlist", "new"],
      // No opening date: FRANKLIN_OPENING is unverified, so "opening soon" —
      // which is where the page's own hero copy starts — is the whole of what
      // the site claims.
      text: `${loc.name}, ${loc.address.addressRegion}. ${loc.hero.sub}`,
    });
  } else {
    passages.push({
      id: `location:${loc.slug}:visiting`,
      kind: "location",
      title: `${SITE_NAME} — ${loc.name}`,
      href,
      question: `Where is your ${loc.name} center?`,
      keywords: [...keywords, "parking", "park", "street", "suite"],
      // Kept short and about the address. Length normalization means a
      // passage padded with the hero paragraph loses "where are you?" to a
      // shorter one that says less.
      text: [
        `Our ${loc.name} center serves ${loc.county}.`,
        address ? `The address is ${address}.` : null,
        parking ? `${parking}.` : null,
      ]
        .filter(Boolean)
        .join(" "),
    });
  }

  const communities = communitiesServed(loc);
  if (communities.length > 0) {
    passages.push({
      id: `location:${loc.slug}:area`,
      kind: "location",
      title: `${loc.name} — communities served`,
      href,
      keywords: [...keywords, ...communities.map((c) => c.toLowerCase()), "serve", "area", "travel", "transfer"],
      text: `${loc.name} serves ${communities.join(", ")}. ${draftFree(loc.planning.alsoNearby) ?? ""}`.trim(),
      // The location page prints this list with `communitiesTag` beside it —
      // "[Confirm list]" on Nashville and Murfreesboro today. Read from the
      // data rather than named in site-copy.ts, so a center that confirms its
      // list rejoins the index the moment the tag is dropped, one center at a
      // time. Franklin carries no tag and is unaffected.
      confirmTag: loc.planning.communitiesTag,
    });
  }

  return passages;
}

/** Copy that still carries a [bracketed] note is unresolved; drop it. */
function draftFree(s: string): string | null {
  return s.includes("[") ? null : s;
}

/**
 * Every center in one passage.
 *
 * "Where are you located?" is on §7's accuracy list and wants *both*
 * addresses; asked of per-center passages it returns whichever one scored
 * best, which is half an answer. Addresses ride formattedAddress(), so a
 * center whose address is still a [placeholder] is named without one rather
 * than invented.
 */
function allCentersPassage(): Passage {
  const open = locations.filter((l) => !l.comingSoon);
  const soon = locations.filter((l) => l.comingSoon);
  const lines = open.map((l) => {
    const address = formattedAddress(l);
    return address ? `${l.name} — ${address}` : `${l.name}, ${l.address.addressRegion}`;
  });

  return {
    id: "location:all",
    kind: "location",
    title: "Our centers",
    href: "/locations",
    question: "Where are you located?",
    keywords: [...LOCATION_KEYWORDS, ...locations.map((l) => l.name.toLowerCase()), "both", "all", "closest", "nearest"],
    text: [
      `${SITE_NAME} has ${open.length === 1 ? "one center" : `${open.length} centers`} open: ${lines.join("; ")}.`,
      soon.length > 0 ? `${soon.map((l) => l.name).join(" and ")} is coming soon.` : null,
      "You can transfer between centers at any time; your plan travels with you.",
    ]
      .filter(Boolean)
      .join(" "),
  };
}

function pagePassages(): Passage[] {
  const values: Record<CopyToken, string> = {
    BRAIN_MAP_NAME,
    BRAIN_MAP_POINTS: String(BRAIN_MAP_POINTS),
    BRAIN_MAP_PRICE,
    SESSION_PRICE,
    SESSION_LENGTH: SESSION_LENGTH.value,
    PACKAGE_SESSIONS: String(PACKAGE_SESSIONS),
    PACKAGE_PRICE,
    PACKAGE_SAVING,
    PACKAGE_NOTE,
    INSURANCE_POLICY,
    TRAINING_CLAIM,
  };
  return MIRRORED_PAGES.flatMap((page) =>
    // `mirror` is dropped: it exists for the drift check, not for retrieval.
    page.passages.map(
      (passage): Passage => ({
        id: passage.id,
        kind: "page",
        title: passage.title,
        href: page.href,
        question: passage.question,
        keywords: passage.keywords,
        text: passage.text.replace(
          /\{([A-Z_]+)\}/g,
          (whole, token: string) => values[token as CopyToken] ?? whole
        ),
        confirmTag: passage.confirmTag
          ? CONFIRM_TAG_VALUES[passage.confirmTag]
          : undefined,
      })
    )
  );
}

function policyPassages(): Passage[] {
  const passages: Passage[] = [
    {
      // Never paraphrased, never softened — the footer disclaimer is the one
      // piece of copy the site puts on every page, so it belongs to no single
      // page and carries no link.
      id: "policy:disclaimer",
      kind: "policy",
      title: "What Harmonized is",
      href: null,
      question: "Is this a medical clinic?",
      keywords: ["medical", "clinic", "doctor", "diagnose", "treat", "cure", "prevent", "wellness", "legal", "disclaimer", "condition"],
      text: DISCLAIMER,
    },
    {
      id: "policy:free-call",
      kind: "policy",
      title: "The free call",
      href: "/contact",
      question: "What happens on the free call?",
      keywords: ["call", "free", "phone", "talk", "consultation", "book", "appointment", "pressure", "sales", "unsure", "skeptical", "fit"],
      text: [
        "The phone call is free.",
        // "today" is an operational promise and rides SAME_DAY_CALLBACK, the
        // same way the homepage hero does.
        confirmed(SAME_DAY_CALLBACK)
          ? "A real person calls you back today."
          : "A real person calls you back.",
        "Ask anything — including the skeptical questions.",
        RISK_REVERSAL,
      ].join(" "),
    },
    {
      id: "policy:pricing",
      kind: "policy",
      title: "What it costs",
      href: "/first-visit",
      question: "How much does it cost?",
      keywords: [
        "cost", "price", "pricing", "much", "pay", "fee", "brain", "map",
        "first", "visit", "free", "session", "package", "12", "twelve", "save",
      ],
      // Every published price in one passage, because "how much is it" is one
      // question and answering it from three passages invites the model to
      // quote the first visit and stop. PACKAGE_NOTE rides the package price
      // here exactly as it does on the page — a conversation is the easiest
      // place of all to leave a caveat behind.
      text: [
        `The phone call is free.`,
        `${BRAIN_MAP_NAME} — the first visit — is ${BRAIN_MAP_PRICE} and takes ${FIRST_VISIT_DURATION}.`,
        `Regular sessions are ${SESSION_PRICE} and run ${SESSION_LENGTH.value}.`,
        `A ${PACKAGE_SESSIONS}-session package is ${PACKAGE_PRICE} — ${PACKAGE_SAVING} less than paying per session.`,
        PACKAGE_NOTE,
      ].join(" "),
    },
  ];

  const phone = confirmed(PHONE);
  if (phone) {
    passages.push({
      id: "policy:phone",
      kind: "policy",
      title: "Phone",
      href: "/contact",
      question: "What is your phone number?",
      keywords: ["phone", "number", "call", "text", "reach", "contact", "speak"],
      text: `You can reach ${SITE_NAME} at ${phone.display}.`,
    });
  }

  const sessions = confirmed(STAT_SESSIONS);
  const established = confirmed(ESTABLISHED_YEAR);
  const open = locations.filter((l) => !l.comingSoon).map((l) => l.name);
  const soon = locations.filter((l) => l.comingSoon).map((l) => l.name);
  passages.push({
    // Assembled from the same Verifiables the homepage proof band reads, since
    // the band's labels live in JSX props and cannot be mirrored.
    id: "policy:scale",
    kind: "policy",
    title: "Harmonized by the numbers",
    href: "/about",
    /*
     * The only passage here that had no `question`, which is why an audience
     * question had nowhere to land: "Adults, teens, and children are all seen"
     * is the sentence that answers one, and it was reachable only through
     * prose. Every concern page opens "Adults & children" (from `who`), so
     * those outscored it on the word and the subject gate then rejected the
     * lot — "Do you work with adults?" reached no model at all.
     *
     * Filed under the ages as well as the numbers. Deliberately NOT "who" or
     * "see": both belong to "who will I see?", which is the team's question
     * and keeps routing to /about's team passage. Nor "everyone" — it was
     * here for one draft, and its rarity put the numbers passage at the top of
     * "my son is snapping at everyone", ahead of the concern that answers it.
     * A word this vague matches the mood of a question rather than its subject.
     */
    question: "Do you work with adults, teens, and children?",
    keywords: [
      "experience", "established", "year", "session", "center", "since",
      "adult", "teen", "teenager", "children", "age",
    ],
    text: [
      sessions ? `${SITE_NAME} has provided ${sessions} LENS sessions across its centers.` : null,
      `${open.join(" and ")} ${open.length === 1 ? "is" : "are"} open${soon.length > 0 ? `, with ${soon.join(" and ")} coming soon` : ""}.`,
      "Adults, teens, and children are all seen.",
      established ? `Serving Middle Tennessee since ${established}.` : null,
    ]
      .filter(Boolean)
      .join(" "),
  });

  return passages;
}

/**
 * Everything the index would hold if nothing were gated. Kept separate from
 * CONTENT_INDEX below so the exclusions are one visible step rather than a
 * condition threaded through six builders — and so a passage that disappears
 * can be traced to the tag that removed it.
 */
const ALL_PASSAGES: Passage[] = [
  ...concerns.flatMap(concernPassages),
  ...SITE_FAQS.map(
    (faq, i): Passage => ({
      id: `faq:${i + 1}`,
      kind: "faq",
      title: "Frequently asked questions",
      href: "/faq",
      question: faq.q,
      keywords: FAQ_KEYWORDS[faq.q],
      text: faq.a,
      confirmTag: faq.confirmTag,
    })
  ),
  allCentersPassage(),
  ...locations.flatMap(locationPassages),
  ...pagePassages(),
  ...policyPassages(),
];

/**
 * Passages the site renders with a [CONFIRM] tag beside them, and the tag that
 * did it — the audit trail for everything CONTENT_INDEX drops. Exported to be
 * read directly: "why won't it answer insurance questions" should be one
 * lookup, not an afternoon.
 */
export const EXCLUDED_BY_CONFIRM_TAG: Array<{ id: string; confirmTag: string }> =
  ALL_PASSAGES.filter((p) => p.confirmTag).map((p) => ({
    id: p.id,
    confirmTag: p.confirmTag!,
  }));

export const CONTENT_INDEX: Passage[] = ALL_PASSAGES.filter((p) => !p.confirmTag);

// A FAQ_KEYWORDS key that matches no question is a question that was reworded
// and quietly lost its routing hints — retrieval still works, just worse, which
// is the kind of failure that never gets noticed without a line in the log.
const faqQuestions = new Set(SITE_FAQS.map((faq) => faq.q));
const orphanedKeys = Object.keys(FAQ_KEYWORDS).filter((q) => !faqQuestions.has(q));
if (orphanedKeys.length > 0) {
  console.warn(
    `[chat] FAQ_KEYWORDS has ${orphanedKeys.length} key(s) matching no question in lib/faq.ts: ${orphanedKeys.join("; ")}`
  );
}

