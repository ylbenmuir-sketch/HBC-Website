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
 * Two rules for what goes in here:
 *
 * 1. **Unconditional copy only.** Anything whose rendering depends on a
 *    `Verifiable` is composed in content-index.ts from that Verifiable, so the
 *    draft gate is applied at the source rather than copied — a mirrored
 *    sentence has no way to know whether the fact inside it was confirmed.
 * 2. **No paraphrase.** `text` may add a colon or a full stop where a heading
 *    ran into a list, and nothing else. The mirror array is what proves it.
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
export const COPY_TOKENS = ["BRAIN_MAP_NAME", "BRAIN_MAP_PRICE"] as const;
export type CopyToken = (typeof COPY_TOKENS)[number];

export type MirroredPassage = Omit<Passage, "kind" | "href"> & {
  /**
   * Contiguous chunk(s) of the page's prose to verify. Defaults to `text`;
   * given explicitly when `text` joins pieces the page keeps apart — list
   * items, a heading and its paragraph, copy either side of a comment.
   */
  mirror?: string | string[];
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
        title: "How LENS works — feedback, not force",
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
        text: "What the equipment does: small sensors observe the brain’s electrical activity, and the system returns a brief, very low-energy feedback signal — far weaker than the everyday signals already around you. What you experience: a comfortable chair and a short, quiet visit. There’s nothing to watch, practice, or concentrate on, and most people — including young children — feel nothing at all. What we hope to support, honestly: many clients report feeling calmer, sleeping more easily, or thinking more clearly over a series of sessions. Every nervous system responds differently, nothing is guaranteed, and we review what you notice at every visit.",
      },
      {
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
        id: "page:how-lens-works:map",
        title: "What the brain map tells us",
        question: "What does the brain map show?",
        keywords: [
          "map",
          "brain",
          "reading",
          "result",
          "mean",
          "diagnosis",
          "interpret",
          "pz",
          "f7",
        ],
        text: "What the map actually tells us. Pz is where analytical thinking and processing happen. What we’ve seen with clients whose Pz sits below 10 µV is difficulty switching that part on — logistical tasks that should be simple become a slog. F7 handles verbal expression. When we see F7 above 35 µV, that region is often overprocessing — and clients describe struggling to get out what they’re trying to say. None of that is a diagnosis.",
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
        text: "The phone call is free. {BRAIN_MAP_NAME} — your first visit — is {BRAIN_MAP_PRICE} and includes the full conversation, a 21-point recording, your map explained point by point, and a written plan you keep. Session pricing is shared before you commit to anything.",
        mirror:
          "The phone call is free. — your first visit — is and includes the full conversation, a 21-point recording, your map explained point by point, and a written plan you keep. Session pricing is shared before you commit to anything.",
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
          "reimburse",
          "claim",
          "receipt",
          "documentation",
        ],
        text: "As a wellness service, LENS is typically not covered by insurance. Many clients use HSA/FSA funds — we’ll give you documentation.",
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
        id: "page:about:care-model",
        title: "The Harmonized care model",
        question: "What is the same at every center?",
        keywords: [
          "training",
          "trained",
          "qualified",
          "standard",
          "consistent",
          "progress",
          "track",
          "check-in",
          "record",
          "note",
        ],
        text: "What’s identical at every center. Practitioner training: Every practitioner completes the same Harmonized LENS training before working independently. Structured progress tracking: A consistent check-in on sleep, mood, focus, and energy opens every session — your plan follows what you report. Care that doesn’t rely on memory: Your plan and progress are documented at every step, so your care stays consistent across visits and centers. Responsible communication: No diagnoses, no promised outcomes, no pressure. If LENS isn’t the right fit, we say so — and help you find what is.",
        mirror: [
          "Every practitioner completes the same Harmonized LENS training before working independently.",
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
        text: "Three steps. No homework, no screens, nothing to perform. Talk: A free phone call. Tell us what's going on — we'll tell you honestly whether LENS is a fit. Map: Your first visit: a real conversation, a baseline recording of brain activity, and a written plan you keep. Sessions: Short, comfortable visits. Sleep, focus, and mood reviewed every time — your plan follows what you actually report.",
        mirror: [
          "Three steps. No homework, no screens, nothing to perform.",
          "A free phone call. Tell us what's going on — we'll tell you honestly whether LENS is a fit.",
          "Your first visit: a real conversation, a baseline recording of brain activity, and a written plan you keep.",
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
