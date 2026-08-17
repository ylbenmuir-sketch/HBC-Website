import type { Passage } from "./types";

/**
 * Copy from the four pages in §2's list that hold their words inline as JSX:
 * `/`, `/about`, `/first-visit`, `/how-lens-works`.
 *
 * Everything else in the index is imported from the module that owns it —
 * lib/concerns.ts, lib/faq.ts, lib/locations.ts, lib/site-config.ts — and so
 * cannot drift. These four can: a page component is not importable as data,
 * and extracting their prose into lib/ would mean re-typesetting paragraphs
 * that carry `&mdash;`, `&rsquo;` and `&nbsp;` for the sake of the assistant.
 * That trade is the wrong way round, so the copy is mirrored here instead and
 * `scripts/check-content-index.mjs` holds the mirror to the page:
 *
 *   npm run check:index
 *
 * Every `mirror` string must still appear, verbatim, in `sourceFile`. Edit a
 * paragraph on the page and forget this file and the check fails. Author new
 * mirrors from the page's own prose, never from memory:
 *
 *   npm run check:index -- --dump app/about/page.tsx
 *
 * Three rules for what goes in here:
 *
 * 1. **Unconditional copy only.** Anything whose rendering depends on a
 *    `Verifiable` is composed in content-index.ts from that Verifiable, so the
 *    draft gate is applied at the source rather than copied — a mirrored
 *    sentence has no way to know whether the fact inside it was confirmed.
 * 2. **No paraphrase.** `text` may add a colon or a full stop where a heading
 *    ran into a list, and nothing else. The mirror array is what proves it.
 * 3. **A passage is one unit of verification.** Where a page renders a
 *    [CONFIRM] tag against one item in a list, the passage is split so the
 *    tagged claim can be excluded on its own — see `confirmTag` below and
 *    `CONFIRM_TAG_INVENTORY` at the foot of this file. Bundling a tagged
 *    sentence with untagged ones forces a choice between asserting an
 *    unconfirmed fact and losing three confirmed ones.
 *
 * `href` is the page an answer should offer, which for homepage copy is the
 * deeper page the homepage itself points at — handing someone the homepage
 * answers nothing. `sourceFile` is where the words are published.
 */

/**
 * Values interpolated into mirrored copy, so a page's constants are not
 * transcribed into a second place. Written as `{TOKEN}` in `text`; substituted
 * in content-index.ts, which owns the imports.
 */
export const COPY_TOKENS = [
  "BRAIN_MAP_NAME",
  "BRAIN_MAP_POINTS",
  "BRAIN_MAP_PRICE",
  "SESSION_PRICE",
  "SESSION_LENGTH",
  "PACKAGE_SESSIONS",
  "PACKAGE_PRICE",
  "PACKAGE_SAVING",
  "PACKAGE_NOTE",
  "INSURANCE_POLICY",
  "TRAINING_CLAIM",
] as const;
export type CopyToken = (typeof COPY_TOKENS)[number];

/**
 * The lib/site-config.ts [CONFIRM] tags that gate mirrored copy, named rather
 * than imported — for the same reason `COPY_TOKENS` are. This file has to stay
 * importable by plain Node so `npm run check:index` can read it without a build
 * step, and Node's type stripping does not resolve extensionless imports.
 *
 * content-index.ts resolves each name to its constant through an exhaustive
 * `Record<ConfirmTagName, string>`, so a tag deleted from site-config.ts on
 * confirmation fails the build here rather than leaving a passage silently
 * excluded for good.
 *
 * **Empty is the correct state, not a disabled one.** It held five names —
 * session length, pricing, insurance, HSA/FSA, practitioner training — and
 * Ben confirmed all five, so each was deleted along with the passage exclusion
 * it justified. `ConfirmTagName` is therefore `never` today, which means no
 * mirrored passage can name a tag, which is exactly true of the four mirrored
 * pages right now. The gate that still matters is CONFIRM_TAG_INVENTORY at the
 * foot of this file: it fails the moment a page grows a tag, and adding the
 * name back here is the first step of dealing with it.
 */
export const CONFIRM_TAG_NAMES = [] as const satisfies readonly string[];
export type ConfirmTagName = (typeof CONFIRM_TAG_NAMES)[number];

export type MirroredPassage = Omit<Passage, "kind" | "href" | "confirmTag"> & {
  /**
   * Contiguous chunk(s) of the page's prose to verify. Defaults to `text`;
   * given explicitly when `text` joins pieces the page keeps apart — list
   * items, a heading and its paragraph, copy either side of a comment.
   *
   * `[]` means there is nothing to mirror because the page renders a constant
   * rather than prose — `<p>{INSURANCE_POLICY}</p>`. Drift is impossible in
   * that case: the page and the passage read the same export. The check script
   * verifies that claim rather than taking it, and rejects an empty mirror on
   * a passage whose text is anything other than copy tokens.
   */
  mirror?: string | string[];
  /**
   * The [CONFIRM] tag the page renders beside this copy. Set it and the
   * passage is kept out of the index entirely — see lib/chat/types.ts.
   */
  confirmTag?: ConfirmTagName;
};

export type MirroredPage = {
  /** Page file the copy is published in, relative to the repo root. */
  sourceFile: string;
  /** Page an answer drawing on this copy should offer. */
  href: string;
  passages: MirroredPassage[];
};

export const MIRRORED_PAGES: MirroredPage[] = [
  {
    sourceFile: "app/how-lens-works/page.tsx",
    href: "/how-lens-works",
    passages: [
      {
        id: "page:how-lens-works:what",
        title: "How LENS works",
        question: "What is LENS?",
        keywords: ["lens", "neurofeedback", "stand", "mean", "acronym"],
        text: "A gentle signal, a comfortable chair, and nothing to perform. LENS stands for Low Energy Neurofeedback System. Here’s the whole idea without the jargon — and exactly what a session feels like from the chair.",
      },
      {
        id: "page:how-lens-works:idea",
        // Was "feedback, not force", which the page no longer says. The
        // passage still answers the same questions — the keywords below are
        // the visitor's words for it ("equipment", "machine", "shock") and
        // outlive any one wording of the copy.
        title: "How LENS works — the sensor and the signal",
        question: "How does LENS work?",
        keywords: [
          "how",
          "work",
          "equipment",
          "machine",
          "sensor",
          "signal",
          "electrical",
          "stimulation",
          "shock",
          "safe",
          "hurt",
          "feel",
        ],
        text: "How LENS works. The sensor reads first. Small sensors sit on the scalp and read the brain’s electrical activity at that spot. Nothing goes in — the system is listening. Then it answers. Based on what it read, the system sends back a brief feedback signal, far weaker than the signal from the phone in your pocket, lasting a fraction of a second. That’s the whole thing. It’s called low-energy for a literal reason. The brain does the rest. The signal carries no instruction. What follows is your own nervous system responding to information about itself — which is why there’s nothing to practice, watch, or concentrate on. Most people, including young children, feel nothing at all. Sessions run {SESSION_LENGTH} in a comfortable chair.",
        mirror:
          "How LENS works The sensor reads first. Small sensors sit on the scalp and read the brain’s electrical activity at that spot. Nothing goes in — the system is listening. Then it answers. Based on what it read, the system sends back a brief feedback signal, far weaker than the signal from the phone in your pocket, lasting a fraction of a second. That’s the whole thing. It’s called low-energy for a literal reason. The brain does the rest. The signal carries no instruction. What follows is your own nervous system responding to information about itself — which is why there’s nothing to practice, watch, or concentrate on. Most people, including young children, feel nothing at all. Sessions run in a comfortable chair.",
      },
      {
        // Briefly split into a separate `:length` passage so the duration
        // could be excluded on its own while SESSION_LENGTH was unverified.
        // Ben confirmed it, so the walkthrough is whole again — and FAQ 6 now
        // gives the figure in minutes, which is the better answer to "how long
        // is a session" and outranks this passage for it.
        id: "page:how-lens-works:session",
        title: "What a session feels like",
        question: "What happens during a session?",
        keywords: [
          "session",
          "appointment",
          "visit",
          "happen",
          "expect",
          "long",
          "hour",
          "time",
          "chair",
        ],
        text: "A session, start to finish — what it feels like from the chair. Most visits are over in well under an hour. Arrive, a real check-in: Sleep, mood, focus, energy — how we know what's actually changing for you. Settle, sensors on, feet up: A comfortable chair and a few small sensors. No gel caps, no discomfort. Session, nothing to do: The feedback lasts moments; most people feel nothing. Kids can just be kids. Before you go, review & adjust: Your practitioner fine-tunes the plan; you leave knowing where things stand.",
        mirror: [
          "Most visits are over in well under an hour.",
          "A real check-in",
          "Sleep, mood, focus, energy — how we know what's actually changing for you.",
          "Sensors on, feet up",
          "A comfortable chair and a few small sensors. No gel caps, no discomfort.",
          "The feedback lasts moments; most people feel nothing. Kids can just be kids.",
          "Review & adjust",
          "Your practitioner fine-tunes the plan; you leave knowing where things stand.",
        ],
      },
      {
        /*
         * The framing of "Where we look, and why" — deliberately NOT the four
         * site descriptions the section is mostly made of.
         *
         * The page names Fp1, Fp2, T4 and Cz and says, for each, what a
         * practitioner would look at that site for. On a page that is right,
         * because the reader has the whole section in front of her, including
         * the paragraph saying no site is read on its own. In a conversation
         * the assistant hands back one passage, and a passage that pairs a
         * site with a set of symptoms is an interpretation waiting for someone
         * to supply their own reading.
         *
         * This was measured rather than assumed, and the measurement is the
         * reason. Indexing the four descriptions was tried, and
         * `check:answers --retrieval` passed — every guardrail held. What
         * changed is *what was holding them*:
         *
         * - "what is Cz", "what does Cz do", "is my T4 elevated" go from
         *   `nothing-known` — the word does not exist on this site, so no
         *   threshold can reach them — to `incidental` at coverage 0.55–1.00.
         *   Score and coverage both clear their floors; the only thing left
         *   refusing them is the subject gate, i.e. the fact that "cz" is not
         *   in the keyword list below. One plausible keyword edit, or one
         *   threshold nudge made for an unrelated question, and the answer to
         *   "is my T4 elevated" is the paragraph pairing T4 with a short fuse.
         * - "She's overwhelmed by noise and crowds" — a KNOWN_MISS in the
         *   audit — goes from weak-match (coverage 0.30, against a concern
         *   passage) to incidental against THIS one at coverage 0.73. Same
         *   single gate holding it.
         * - The symptom clauses are the concern pages' own language, so this
         *   passage joins the returned set for questions written to reach
         *   them: 2nd for "homework takes three hours and ends in tears", 3rd
         *   for "my projects stall at 90 percent". The top passage is still
         *   the right concern — which is why the audit passes — but the model
         *   is now handed electrode copy on a question about a child.
         *
         * A guardrail resting on one keyword's absence is not the same
         * guardrail as one resting on the word not existing. ./answer.ts
         * §"Out of bounds" would still tell the model to decline, but that is
         * a prompt, and the deterministic decline it replaces is not.
         *
         * So what is mirrored is the count and the caveat: how many points a
         * Brain Map records, and that the pattern across all of them — not any
         * one site — is what the plan is built from. That answers "what does
         * the brain map look at" and gives nothing to interpret.
         */
        id: "page:how-lens-works:map",
        title: "What the brain map tells us",
        question: "What does the brain map show?",
        // No "pz"/"f7" — the copy that named them is gone. No "mean",
        // "interpret", "result" or "reading" either: they filed this under
        // "what does my reading mean", which is a question this passage must
        // not be the answer to. checkRefusal() takes most phrasings of it
        // before retrieval; the rest belong in no-match.
        keywords: [
          "map",
          "brain",
          "point",
          "record",
          "site",
          "look",
          "show",
          "pattern",
          "plan",
        ],
        text: "Where we look, and why. A Brain Map records {BRAIN_MAP_POINTS} points. We don’t read any of these alone. One site tells you very little — the pattern across all {BRAIN_MAP_POINTS}, set against what you told us on the phone, is what your written plan is built from.",
        mirror: [
          "Where we look, and why A Brain Map records points.",
          "We don’t read any of these alone. One site tells you very little — the pattern across all , set against what you told us on the phone, is what your written plan is built from.",
        ],
      },
      {
        // The third paragraph of the old `:idea` passage, now its own section
        // and its own passage. Without it the rewrite would quietly take the
        // site's only statement of what clients report out of the assistant's
        // hands — and "what actually changes" is a question it gets.
        id: "page:how-lens-works:expect",
        title: "What to expect",
        question: "What do clients notice?",
        keywords: [
          "expect",
          "notice",
          "report",
          // Both forms: the stemmer takes "change" to `change` and "changes"
          // to `chang`, so "what actually changes" reached this passage at
          // coverage 1.0 and was rejected by the subject gate for not being
          // filed under a word of itself. Same trap as meltdown/melts down.
          "change",
          "changes",
          "difference",
          "result",
          "steadier",
          "clearly",
          "series",
        ],
        text: "What to expect. Clients commonly report sleeping more easily, feeling steadier, or thinking more clearly over a series of visits. How much changes varies from person to person, and we review what you’re actually noticing at every visit — that’s what the plan follows.",
        mirror:
          "What to expect Clients commonly report sleeping more easily, feeling steadier, or thinking more clearly over a series of visits. How much changes varies from person to person, and we review what you’re actually noticing at every visit — that’s what the plan follows.",
      },
      {
        id: "page:how-lens-works:is-is-not",
        title: "What LENS is — and what it isn’t",
        question: "Is LENS a medical treatment?",
        keywords: [
          "medical",
          "treatment",
          "cure",
          "diagnosis",
          "therapy",
          "stimulation",
          "guarantee",
          "replace",
          "medication",
          "doctor",
        ],
        text: "What LENS is — and what it isn’t. LENS is: Gentle and noninvasive — nothing enters the body. Passive — no concentrating or performing. Brief — sessions fit real, busy lives. Personalized from your check-ins, every visit. A wellness service alongside the care you trust. LENS is not: A medical treatment, diagnosis, or cure. Electrical stimulation — it reads far more than it sends. A screen-based training program to master. A guaranteed outcome — every brain responds differently. A replacement for your doctor, therapist, or school supports.",
        mirror: [
          "Gentle and noninvasive — nothing enters the body",
          "Passive — no concentrating or performing",
          "Brief — sessions fit real, busy lives",
          "Personalized from your check-ins, every visit",
          "A wellness service alongside the care you trust",
          "A medical treatment, diagnosis, or cure",
          "Electrical stimulation — it reads far more than it sends",
          "A screen-based training program to master",
          "A guaranteed outcome — every brain responds differently",
          "A replacement for your doctor, therapist, or school supports",
        ],
      },
    ],
  },
  {
    sourceFile: "app/first-visit/page.tsx",
    href: "/first-visit",
    passages: [
      {
        id: "page:first-visit:what",
        title: "Your first visit",
        question: "What is the first visit like?",
        keywords: [
          "first",
          "visit",
          "appointment",
          "expect",
          "prepare",
          "bring",
          "nervous",
        ],
        text: "Know exactly what to expect — before you ever walk in. No clipboard queue, no waiting-room limbo, no surprises. Here’s the first visit, minute by minute, for adults and for children. Nothing to prepare or bring.",
        mirror: [
          "Know exactly what to expect — before you ever walk in. No clipboard queue, no waiting-room limbo, no surprises. Here’s the first visit, minute by minute, for adults and for children.",
          "Nothing to prepare or bring",
        ],
      },
      {
        id: "page:first-visit:five-parts",
        title: "The first appointment, in five parts",
        question: "What happens at the first appointment?",
        keywords: [
          "first",
          "appointment",
          "happen",
          "step",
          "baseline",
          "recording",
          "plan",
          "pressure",
          "decide",
        ],
        text: "The first appointment, in five parts. You're greeted by name: Someone is expecting you. Coffee, water, a comfortable seat — and a parent stays with a child the whole time. We talk first: What's going on, what you've tried, what you're hoping changes. This is the longest part on purpose. A gentle baseline recording: Small sensors take brief readings at a series of points — nothing invasive, nothing to feel. The recording helps guide the initial conversation and your starting plan. Your plan, explained plainly: What we noticed, what we'd suggest, what it costs, and what we'd track — in plain language, with every question answered. You decide — without pressure: Start that week, think it over, or decide it's not for you. No packages, no countdown offers, no follow-up pestering.",
        mirror: [
          "The first appointment, in five parts.",
          "Someone is expecting you. Coffee, water, a comfortable seat — and a parent stays with a child the whole time.",
          "What's going on, what you've tried, what you're hoping changes. This is the longest part on purpose.",
          "Small sensors take brief readings at a series of points — nothing invasive, nothing to feel. The recording helps guide the initial conversation and your starting plan.",
          "What we noticed, what we'd suggest, what it costs, and what we'd track — in plain language, with every question answered.",
          "Start that week, think it over, or decide it's not for you. No packages, no countdown offers, no follow-up pestering.",
        ],
      },
      {
        id: "page:first-visit:cost",
        title: "What the first visit costs",
        question: "What does it cost?",
        keywords: [
          "cost",
          "price",
          "pricing",
          "fee",
          "much",
          "expensive",
          "afford",
          "pay",
          "money",
          "dollar",
          "free",
        ],
        text: "The phone call is free. {BRAIN_MAP_NAME} — your first visit — is {BRAIN_MAP_PRICE} and includes the full conversation, a 21-point recording, your map explained point by point, and a written plan you keep. Regular sessions are {SESSION_PRICE} and run {SESSION_LENGTH}. A {PACKAGE_SESSIONS}-session package is {PACKAGE_PRICE} — {PACKAGE_SAVING} less than paying per session. {PACKAGE_NOTE}",
        mirror:
          "The phone call is free. — your first visit — is and includes the full conversation, a 21-point recording, your map explained point by point, and a written plan you keep. Regular sessions are and run . A -session package is — less than paying per session.",
      },
      {
        id: "page:first-visit:insurance",
        title: "Insurance",
        question: "Does insurance cover it?",
        keywords: [
          "insurance",
          "insurer",
          "cover",
          "coverage",
          "hsa",
          "fsa",
          "superbill",
          "reimburse",
          "reimbursement",
          "claim",
          "bill",
          "self-pay",
          "network",
        ],
        // The passage that started all of this: the old sentence carried no
        // brackets, so every gate passed it and the assistant stated an
        // HSA/FSA policy the page flagged as unconfirmed two inches away. Ben
        // confirmed it, and the answer is now one constant that the page and
        // this passage both read — so there is no second copy left to drift.
        text: "{INSURANCE_POLICY}",
        mirror: [],
      },
      {
        id: "page:first-visit:child",
        title: "Bringing a child",
        question: "Can I bring my child?",
        keywords: [
          "child",
          "kid",
          "son",
          "daughter",
          "parent",
          "bring",
          "stay",
          "toy",
          "tablet",
          "book",
        ],
        text: "Bringing a child: A parent joins everything. Kids can bring a book, a tablet, or a stuffed animal — comfort beats stillness here.",
        mirror:
          "A parent joins everything. Kids can bring a book, a tablet, or a stuffed animal — comfort beats stillness here.",
      },
      {
        id: "page:first-visit:after",
        title: "After you leave",
        question: "What happens after a session?",
        keywords: [
          "after",
          "afterward",
          "recovery",
          "drive",
          "rest",
          "side",
          "effect",
          "next",
          "homework",
        ],
        text: "After you leave: Most people simply go back to their day. We’ll check how you slept and felt at the next visit — that’s the data that shapes your plan.",
        mirror:
          "Most people simply go back to their day. We’ll check how you slept and felt at the next visit — that’s the data that shapes your plan.",
      },
    ],
  },
  {
    sourceFile: "app/about/page.tsx",
    href: "/about",
    passages: [
      {
        id: "page:about:who",
        title: "About Harmonized Brain Centers",
        question: "Who are you?",
        keywords: [
          "about",
          "company",
          "practice",
          "team",
          "practitioner",
          "experience",
          "middle",
          "tennessee",
          // Who we see, not just who we are. "Do you work with adults?" is an
          // audience question, and this sentence answers it — but the words
          // were only in its prose, so every concern page's "Adults &
          // children" line outscored it and the subject gate then rejected
          // the lot. Not "work": the note on page:home:what applies here too.
          "adult",
          "child",
          "family",
          "serve",
        ],
        text: "Harmonized Brain Centers is a team of trained LENS practitioners serving adults, children, and families across Middle Tennessee — one care model, multiple centers, and well over a hundred thousand sessions of experience.",
      },
      {
        id: "page:about:why",
        title: "Why Harmonized exists",
        keywords: ["why", "exist", "start", "began", "story", "honest", "care", "model"],
        text: "Families deserved a gentle option — and an honest one. Harmonized began with a simple conviction: people struggling with focus, sleep, anxiety, and overwhelm deserve a gentle, noninvasive option — and a team that listens before it recommends anything. Today that conviction is a care model: the same training, the same structured check-ins, the same honest policies at every center — so the experience doesn’t depend on which door you walk through.",
      },
      {
        // Pulled out of the care-model grid when it was the only one of the
        // four items /about tagged as unconfirmed. Kept separate now that Ben
        // has confirmed it, because the answer he approved is a specific,
        // two-sentence claim — a certifying body, a named training period, a
        // session count — and "how are your practitioners trained" deserves to
        // retrieve that rather than a paragraph in which it is one item of
        // four. The wording is his and is not to be tightened; see
        // TRAINING_CLAIM in lib/site-config.ts.
        id: "page:about:training",
        title: "Practitioner training",
        question: "How are your practitioners trained?",
        keywords: [
          "training",
          "trained",
          "qualified",
          "credential",
          "certified",
          "certification",
          "ochslabs",
          "experience",
          "practitioner",
        ],
        text: "{TRAINING_CLAIM}",
        mirror: [],
      },
      {
        id: "page:about:care-model",
        title: "The Harmonized care model",
        question: "What is the same at every center?",
        keywords: [
          "standard",
          "consistent",
          "progress",
          "track",
          "check-in",
          "record",
          "note",
        ],
        text: "What’s identical at every center. Structured progress tracking: A consistent check-in on sleep, mood, focus, and energy opens every session — your plan follows what you report. Care that doesn’t rely on memory: Your plan and progress are documented at every step, so your care stays consistent across visits and centers. Responsible communication: No diagnoses, no promised outcomes, no pressure. If LENS isn’t the right fit, we say so — and help you find what is.",
        mirror: [
          "A consistent check-in on sleep, mood, focus, and energy opens every session — your plan follows what you report.",
          "Your plan and progress are documented at every step, so your care stays consistent across visits and centers.",
          "No diagnoses, no promised outcomes, no pressure. If LENS isn’t the right fit, we say so — and help you find what is.",
        ],
      },
      {
        id: "page:about:team",
        title: "The team",
        question: "Who will I see?",
        keywords: ["team", "practitioner", "staff", "standard"],
        text: "More hands, one standard. Harmonized is deliberately built to grow beyond any one person — practitioners across our centers, trained to the same standard, supported by the same systems.",
      },
    ],
  },
  {
    sourceFile: "app/page.tsx",
    href: "/how-lens-works",
    passages: [
      {
        id: "page:home:what",
        title: "What Harmonized offers",
        // No generic verbs — "help", "offer", "do". They route every "can you
        // help with X" to this passage whatever X is, which is the
        // confident-wrong-answer failure §2 is written against. A question
        // about something the site has never mentioned has to reach no-match.
        keywords: [
          "anxiety",
          "focus",
          "sleep",
          "medication",
          "adult",
          "kid",
          "tennessee",
          "neurofeedback",
        ],
        text: "Help for anxiety, focus, and sleep — without medication. Gentle LENS neurofeedback for adults and kids across Middle Tennessee.",
        mirror: [
          "Help for anxiety, focus, and sleep — without medication.",
          "Gentle LENS neurofeedback for adults and kids across Middle Tennessee.",
        ],
      },
    ],
  },
  {
    sourceFile: "app/page.tsx",
    href: "/what-we-help-with",
    passages: [
      {
        id: "page:home:why-now",
        title: "Why people wish they’d called sooner",
        keywords: ["wait", "sooner", "now", "why", "year", "long", "manage"],
        text: "Why people wish they’d called sooner. Another school year of teacher emails. Another year of 3 a.m. ceilings and afternoons that disappear into fog. Most people who call us have been managing this for years — and the thing they say most often afterward is that they wish they’d called sooner.",
      },
      {
        id: "page:home:goals",
        title: "What clients hope to change",
        question: "What could change?",
        keywords: [
          "goal",
          "hope",
          "change",
          "improve",
          "result",
          "outcome",
          "expect",
          "guarantee",
        ],
        text: "What clients hope to change: Calmer mornings, fewer standoffs. Falling asleep more easily. Greater focus at school or work. Recovering from frustration faster. More patience with the people you love. Feeling more like yourself again. These are goals, not guarantees — every nervous system responds differently. Changes are reviewed at every visit, so progress is tracked consistently instead of relying on memory alone.",
        mirror: [
          "Calmer mornings, fewer standoffs",
          "Falling asleep more easily",
          "Greater focus at school or work",
          "Recovering from frustration faster",
          "More patience with the people you love",
          "Feeling more like yourself again",
          "These are goals, not guarantees — every nervous system responds differently. Changes are reviewed at every visit, so progress is tracked consistently instead of relying on memory alone.",
        ],
      },
    ],
  },
  {
    sourceFile: "app/page.tsx",
    href: "/first-visit",
    passages: [
      {
        id: "page:home:steps",
        title: "How it works, in three steps",
        question: "How do I get started?",
        keywords: [
          "start",
          "begin",
          "step",
          "process",
          "first",
          "call",
          "book",
        ],
        text: "Three steps. No homework, no screens, nothing to perform. Talk: A free call — or send the form and we'll call you. Tell us what's going on, and we'll tell you honestly whether LENS is a fit. Map: Your first visit: you sit down with a practitioner, we record a baseline of your brain activity, we walk you through what we see, and you leave with a written plan. Sessions: Short, comfortable visits. Sleep, focus, and mood reviewed every time — your plan follows what you actually report.",
        mirror: [
          "Three steps. No homework, no screens, nothing to perform.",
          "A free call — or send the form and we'll call you. Tell us what's going on, and we'll tell you honestly whether LENS is a fit.",
          "Your first visit: you sit down with a practitioner, we record a baseline of your brain activity, we walk you through what we see, and you leave with a written plan.",
          "Short, comfortable visits. Sleep, focus, and mood reviewed every time — your plan follows what you actually report.",
        ],
      },
      {
        id: "page:home:brain-map",
        title: "The Harmonized Brain Map",
        question: "What do I walk away with?",
        keywords: [
          "map",
          "brain",
          "21",
          "point",
          "read",
          "keep",
          "walk",
          "away",
          "diagnosis",
        ],
        text: "You’ll see your own brain map. On your first visit we record activity at 21 points across your brain and turn it into a map you can actually read — where things are running hot, where they’re running quiet, and how that lines up with what you came in describing. We built this. A picture of electrical activity — not a diagnosis.",
        mirror: [
          "You’ll see your own brain map. On your first visit we record activity at 21 points across your brain and turn it into a map you can actually read — where things are running hot, where they’re running quiet, and how that lines up with what you came in describing. We built this.",
          "A picture of electrical activity — not a diagnosis.",
        ],
      },
    ],
  },
  {
    sourceFile: "app/page.tsx",
    href: "/children-families",
    passages: [
      {
        id: "page:home:children",
        title: "Children & families",
        question: "How do you work with children?",
        keywords: [
          "child",
          "kid",
          "son",
          "daughter",
          "school",
          "homework",
          "teacher",
          "meltdown",
          "transition",
          "sensory",
          "parent",
        ],
        text: "Help for kids who are struggling at school. Homework battles. Meltdowns over transitions. Teacher emails. Sensory overwhelm. A child starting to believe they’re bad at school. There’s nothing your child has to get right in a LENS session — and you’re part of every check-in.",
      },
    ],
  },
];

/**
 * Every `<ConfirmTag>` rendered by a page the assistant draws copy from, and
 * what the index does about it.
 *
 * This exists because of how the HSA/FSA passage got in. `draftFree()` reads
 * the string; the tag is a *sibling element*; the string is clean; the passage
 * indexes as settled fact. Nothing in the pipeline could see the difference,
 * and nothing would have caught the next one either — the pages carry sixteen
 * of these tags and the index draws copy from eight of the files holding them.
 *
 * So the tags are inventoried instead. `npm run check:index` extracts every
 * ConfirmTag payload from each file below and fails if the set differs from
 * what is declared here — a tag added, removed, or renamed forces someone to
 * come back to this table and say which it is:
 *
 * - **excluded** — indexed copy sits beside the tag, and the passage carries a
 *   `confirmTag` that keeps it out. Name the passage id.
 * - **not indexed** — the copy never reaches the index. Say why, because "it
 *   isn't in there" is exactly the belief that was wrong about HSA/FSA.
 * - **Verifiable-gated** — the tag renders `X.note`, and content-index.ts
 *   reads the same `X` through `confirmed()`. These need nothing: the gate is
 *   already on the value, which is what makes the plain-string tags below the
 *   dangerous ones. They are the whole reason this class of bug exists.
 *
 * Files with no tags are listed deliberately. `app/concerns/[slug]/page.tsx`
 * renders 24 indexed FAQs and no tag today; the empty entry is what fails the
 * check on the day one appears.
 */
export const CONFIRM_TAG_INVENTORY: Record<string, Record<string, string>> = {
  // The phase 15 copy replacement took the sentence that carried the session
  // count off this page ("a pattern we've seen across 140,000 sessions"), and
  // its ConfirmTag with it. The count itself is unaffected — STAT_SESSIONS is
  // verified, /about and the homepage proof band still render it, and
  // policy:scale still states it to the assistant.
  "app/how-lens-works/page.tsx": {},
  // Ben confirmed HSA/FSA and the first-visit duration; both tags are gone and
  // page:first-visit:insurance is back in the index.
  "app/first-visit/page.tsx": {},
  // Ben confirmed the training and review process; page:about:training carries
  // his approved wording and is back in the index.
  "app/about/page.tsx": {},
  "app/page.tsx": {
    "SAME_DAY_CALLBACK.note!": "Verifiable-gated — policy:free-call reads confirmed(SAME_DAY_CALLBACK)",
    "START_TIMING.note!": "not indexed — no passage carries the start-timing claim",
    "BRAIN_MAP_CLAIM.note!": "not indexed — the differentiator claim is in no passage",
    "FOUNDER_QUOTE.note!": "not indexed — the founder quote is in no passage",
    "FOUNDER_LAST_NAME.note!": "Verifiable-gated — and verified; FOUNDER_DISPLAY_NAME is not indexed regardless",
    "FRANKLIN_OPENING.note!": "Verifiable-gated — location:franklin:coming-soon omits the date by construction",
    "REVIEWS.note!": "not indexed — ratings and review counts are in no passage",
    TRISHA_APPROVAL_TAG: "not indexed — the celebrity band is in no passage",
    "Film 2–3 short testimonials": "not indexed — a production to-do, not a claim",
  },
  // Ben confirmed session length, pricing and insurance. All three tags are
  // gone, faq:6, faq:12 and faq:13 are back in the index, and the three
  // `rendered` overrides that existed only to hold the tags went with them.
  "app/faq/page.tsx": {},
  "app/locations/page.tsx": {
    "[Opening date — confirm]": "not indexed — location:franklin:coming-soon omits the date",
    CONCIERGE_TAG: "not indexed — concierge sessions are in no passage",
  },
  "app/locations/[slug]/page.tsx": {
    "[Opening date — confirm]": "not indexed — location:franklin:coming-soon omits the date",
    // `location.planning.communitiesTag` was here, holding
    // location:<slug>:area out of the index on both open centers. Ben's client
    // data replaced the guessed community lists, the tag and the field are
    // gone, and both passages are in the index — which is what lets the
    // assistant answer "do you serve Smyrna?" and "do you serve Franklin?".
  },
  "app/concerns/[slug]/page.tsx": {},
  "app/what-we-help-with/page.tsx": {},
};
