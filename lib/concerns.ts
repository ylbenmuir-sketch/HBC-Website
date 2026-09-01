/**
 * All 11 concerns, data-driven. The first eight are from what-we-help-with.html:
 * the anxiety entry is seeded verbatim from concern-anxiety.html; the other
 * seven reuse its page structure with copy drawn from the overview mockups
 * (kept to the same no-hype standard — no medical claims, ever).
 *
 * Concussion is the ninth and the first that did not come from those mockups:
 * its copy is approved verbatim and it opens with a block telling a recently
 * injured visitor to see a doctor instead. See `medicalFirst`.
 *
 * Performance and migraines are the tenth and eleventh (Sept 2026, from Ben's
 * brief). Performance is written as a decline story on purpose — see the note
 * on its entry. Migraines is the second concern to carry `medicalFirst`, and
 * the strictest page on the site: it describes who comes in and never what
 * happens to them. Its rules are on the entry.
 */

import {
  BRAIN_MAP_NAME,
  BRAIN_MAP_POINTS,
  BRAIN_MAP_PRICE,
  COURSE_VARIES_NOTE,
  FIRST_VISIT_DURATION,
  FULL_COURSE,
  MAINTENANCE,
  PHYSICIAN_REFERRALS,
  RISK_REVERSAL,
  SESSION_LENGTH,
  SESSION_PRICE,
} from "./site-config";

export type ConcernFaq = {
  q: string;
  a: string;
  /**
   * A [CONFIRM] tag governing a claim this answer repeats, when the tag itself
   * lives on some other page. Empty today; it held the typical visit length
   * until Ben confirmed it.
   *
   * Concern pages render no [CONFIRM] tags of their own, but they do restate
   * facts that carry one elsewhere. A page can afford that: a visitor reading
   * it has the tagged page available to them in draft, and in production
   * neither page claims more than the practice has settled. The assistant
   * cannot — it quotes one passage with no page around it. So the tag travels
   * with the *claim* rather than with the page that happens to carry the
   * markup, and keeps every restatement out of the index together. See the
   * `confirmTag` note in lib/chat/types.ts.
   */
  confirmTag?: string;
};

export type Concern = {
  slug: string;
  /** Short name used in nav/cards, e.g. "Anxiety & stress". */
  shortTitle: string;
  /**
   * Full display title — breadcrumbs, cross-links, and the titles the
   * assistant's passages carry. Normally the same words as titleLead +
   * titleAccent below.
   */
  title: string;
  /**
   * The page's H1, split so the em.sage italic phrase can be styled
   * (rendered as titleLead then titleAccent).
   *
   * Usually this *is* `title`, one string cut in two. Concussion is the
   * exception: its approved H1 is a sentence ("Cleared by your doctor, and
   * still not right."), which is the right headline and the wrong breadcrumb,
   * so there the two fields carry different words on purpose.
   */
  titleLead: string;
  titleAccent: string;
  who: string;
  /**
   * The hero eyebrow, when "Concern · {who}" is not what the page should open
   * with. /concerns/concussion opens on "After a concussion", because the
   * audience word that matters there is *when*, not who.
   */
  heroEyebrow?: string;
  heroSub: string;
  /**
   * The block that has to be read before anything else on the page.
   *
   * /concerns/concussion carries one, and it is the reason this field exists
   * rather than a `note-sage` panel further down: some visitors arrive days
   * after a head injury, and for them the correct answer is a doctor, not
   * us. So the block sits between the lead and the page's own CTAs — nothing
   * on the page invites a call to us above it — and it is styled *up*, not
   * down. `.medical-first` in globals.css is deliberately larger and darker
   * than body copy; a footnote treatment here would be the failure.
   *
   * /concerns/migraines carries the second (Sept 2026): a sudden severe or
   * worst-ever headache is a medical emergency, and medical care leads that
   * page before anything about LENS — the same ordering, for the same
   * visitor-arriving-too-soon reason. Its `urgent` copy is mirrored by the
   * assistant's `headache` stop in lib/chat/safety.ts, the way concussion's
   * is mirrored by `head-injury`; edit one and the other moves in the same
   * commit.
   *
   * On concussion the three parts are one continuous piece of approved copy,
   * split only so the symptom sentences between them can be set as a list.
   * Do not soften, reorder, or move any of it below the fold — on either
   * page.
   */
  medicalFirst?: {
    /** "If your head injury was recent, start with a doctor…" */
    urgent: string;
    /** "This page is for later…" — what precedes the `recognize` list. */
    laterLead: string;
    /** "That gap — medically cleared, functionally not yourself…" */
    gap: string;
  };
  /** Overview page (what-we-help-with) copy. */
  overview: {
    recognize: string;
    approach: string;
  };
  /**
   * Detail page content.
   *
   * The two headings are optional because their sections are: an empty
   * `goals` or `faqs` array drops the whole band, heading included. Concussion
   * ships with both empty — its copy is approved verbatim and contains no goal
   * cards and no questions, and writing three of each for a page about brain
   * injury would mean inventing outcomes on the one page that must not carry
   * any. A heading with no cards under it renders an empty <h2>, which is
   * loud; that is the intended failure mode if the two ever fall out of step.
   */
  goalsHeading?: string;
  faqHeading?: string;
  recognize: string[];
  howHelp: { p1: string; p2: string; note: string };
  goals: string[]; // "Common goal" quote cards
  faqs: ConcernFaq[];
  image: { src: string; position: string } | null;
  plateSpec?: string;
  /**
   * A prominent cross-link rendered inside the medical-first body layout,
   * after `howHelp.p1` — for when another page is the honest first read.
   * Only /concerns/migraines carries one, pointing at /concerns/concussion:
   * post-concussion headache is that page's strongest and most honest angle,
   * and the concussion page (with its physician-referral relationship) is
   * the real credibility behind it. Ignored by the non-medical layout.
   */
  bodyLink?: { label: string; href: string };
  /**
   * Slugs of 3 concerns to cross-link at the foot of this page.
   *
   * Concern pages linked to nothing but the hub before this, which left
   * /concerns/trauma with exactly one referring page sitewide and
   * /concerns/stress-resilience with three. The pairings are the ones people
   * actually arrive carrying together (anxiety and sleep, focus and school),
   * not a round-robin — a link block that points everywhere says nothing
   * about which pages belong together.
   */
  related: string[];
  /**
   * <title> for the page, "Neurofeedback for X". Required, not
   * optional: the display `title` above is the on-page headline and reads as
   * a symptom ("Sleep difficulties"), which targets nothing — "neurofeedback"
   * is the qualifying word people actually search with. Required so a new
   * concern can't ship without one.
   *
   * **One standing exception — migraines — and it stays one.** Its title is
   * "Migraines & LENS Neurofeedback": a conjunction, not the pattern's "for".
   * "Neurofeedback *for* Migraines" is a treatment claim about a neurological
   * condition, made in the one field that has no room to hedge, and that page
   * may not make it at any volume. Approved by Ben (Sept 2026). Do not
   * "restore" the pattern there, and do not treat the exception as license
   * anywhere else — every other concern keeps "Neurofeedback for X".
   *
   * Keep the "support" framing in metaDescription rather than here; a title
   * has no room to hedge, and the description is where the wellness
   * disclaimer stays consistent.
   *
   * **This is the whole `<title>`.** app/concerns/[slug]/page.tsx sets it
   * `absolute`, so the root layout's " — Harmonized Brain Centers" template
   * does not append. The budget is therefore the full ~60 characters Google
   * renders, not 33.
   */
  metaTitle: string;
  metaDescription: string;
  /**
   * Lead-in for the GuideCta heading on this page, e.g. "Why calm doesn't
   * hold." The component appends the guide's title, so this is the framing
   * only — one sentence, ending in a period.
   *
   * Required, not optional. The same guide sits below the FinalCTA band on
   * all eight of these pages plus `/` and `/resources`, and shipping one
   * heading ten times was flagged in the SEO audit as cross-page duplication.
   * A default would let the eleventh concern quietly rejoin the duplicate.
   *
   * Every lead-in is drawn from the guide's own sections, so none of them
   * promises more than the guide delivers. Two are hedged deliberately:
   * brain-fog does not say "isn't age" (a claim about cognitive change we
   * don't get to make in a heading), and trauma stays descriptive rather
   * than diagnostic.
   */
  guideHeading: string;
};

export const concerns: Concern[] = [
  {
    slug: "anxiety",
    shortTitle: "Anxiety & stress",
    title: "Anxiety & nervous-system overload",
    titleLead: "Anxiety & nervous-system ",
    titleAccent: "overload",
    who: "Adults & children",
    heroSub:
      "For people whose bodies stay on alert long after the moment has passed — and who are tired of being told to just relax.",
    overview: {
      recognize:
        "A body that stays braced long after the stressful moment has passed. Racing thoughts at bedtime. Overreacting to small stressors, and unable to relax even when life is calm.",
      approach:
        "Sessions are calm by design — quiet room, comfortable chair, nothing asked of you. Many clients report a growing settledness they notice outside our walls first.",
    },
    goalsHeading: "The changes people in high alert most often name.",
    faqHeading: "Asked by almost everyone who comes in anxious.",
    recognize: [
      "Thoughts that won't quiet down — especially at night",
      "Feeling constantly on edge, braced for something",
      "Overreacting to small stressors, then replaying it",
      "Struggling to relax even when life is objectively calm",
      "Feeling mentally or physically stuck in high alert",
    ],
    howHelp: {
      p1: "An anxious nervous system often feels like a system working harder than it needs to. LENS sessions are quiet and passive — small sensors, a very low-energy feedback signal, nothing to perform — and many clients tell us they gradually feel more settled over a series of visits.",
      p2: "There's nothing to perform and nothing invasive. We check how settled you actually feel — sleep, tension, reactivity — at every visit, and let your experience guide the plan.",
      note: "LENS is a wellness service, not a treatment for anxiety disorders. It works alongside — never in place of — care from your doctor or therapist. Individual experiences vary.",
    },
    goals: [
      "Falling asleep without an hour of ceiling-staring.",
      "A body that stands down when the moment has passed.",
      "Handling a normal Tuesday like a normal Tuesday.",
    ],
    faqs: [
      {
        q: "Will the session itself make me anxious?",
        a: "It's one of the calmest hours of most clients' week: quiet room, comfortable chair, nothing to do or perform. You can bring a book, headphones, or a parent — whatever helps.",
      },
      {
        q: "Can I keep seeing my therapist?",
        a: "Please do. LENS is routinely used alongside therapy, and we're glad to coordinate with providers you already trust. We never advise on medication — that stays between you and your prescriber.",
      },
      {
        q: "When do people notice change?",
        a: "It varies honestly — some notice shifts in sleep or settledness within the first few sessions; for others it builds gradually. Your check-ins make progress visible either way.",
      },
    ],
    image: { src: "/images/relax.jpg", position: "center 40%" },
    related: ["sleep", "stress-resilience", "trauma"],
    metaTitle: "Neurofeedback for Anxiety & Stress",
    metaDescription:
      "Gentle LENS neurofeedback support for anxiety and nervous-system overload — for people whose bodies stay on alert long after the moment has passed.",
    guideHeading: "Why calm doesn't hold.",
  },
  {
    slug: "focus-adhd",
    shortTitle: "Focus & ADHD",
    title: "Focus, ADHD & follow-through",
    titleLead: "Focus, ADHD & ",
    titleAccent: "follow-through",
    who: "Adults & children",
    heroSub:
      "For bright kids whose homework takes three hours, and adults whose projects stall at 90 percent — people who care, try hard, and still can't stay on task.",
    overview: {
      recognize:
        "Homework that takes three hours and ends in tears. Projects that stall at 90 percent. Losing track mid-task, and procrastinating on things you genuinely care about.",
      approach:
        "LENS supports the brain's own capacity to settle and organize — nothing to practice, no tasks to perform. Focus and follow-through are tracked at every check-in.",
    },
    goalsHeading: "The changes people stuck at 90 percent most often name.",
    faqHeading: "Asked by almost everyone who comes in scattered.",
    recognize: [
      "Struggling to stay on task — at work or at school",
      "Overwhelmed by multi-step responsibilities",
      "Procrastinating on things you genuinely care about",
      "Work or schoolwork that stalls at 90 percent",
      "Losing track mid-task, mid-sentence, mid-plan",
    ],
    howHelp: {
      p1: "Struggling to focus often feels like working against your own noise. LENS asks nothing of you — nothing to practice, no screens to watch, no tasks to perform — and many clients report feeling clearer and steadier over a series of sessions.",
      p2: "Focus and follow-through are tracked at every check-in — homework, deadlines, the everyday specifics — and your plan adjusts to what's actually changing.",
      note: "LENS is a wellness service, not a treatment for ADHD or any diagnosis. It works alongside — never in place of — your doctor, therapist, or school supports. Individual experiences vary.",
    },
    goals: [
      "Homework that takes the time homework should take.",
      "Finishing the last 10 percent of what I start.",
      "Sitting down to work without an hour of circling first.",
    ],
    faqs: [
      {
        q: "Does my child have to sit still during a session?",
        a: "No. There's nothing a child has to get right in a LENS session — no sitting perfectly still, no concentrating, no being corrected. Kids read, draw, or just be kids while the session runs.",
      },
      {
        q: "Is this a substitute for school supports or medication?",
        a: "No. LENS is a wellness service and never replaces your doctor, therapist, or school supports. We never advise on medication — that stays between you and your prescriber.",
      },
      {
        q: "How do you know whether it's helping?",
        a: "Every visit opens with a structured check-in on focus, follow-through, and how the week actually went — homework, deadlines, mornings. Your plan follows that data, not a template.",
      },
    ],
    image: { src: "/images/child-session.jpg", position: "60% 30%" },
    related: ["children-school", "brain-fog", "emotional-regulation"],
    metaTitle: "Neurofeedback for ADHD & Focus",
    metaDescription:
      "Gentle LENS neurofeedback support for focus, ADHD, and follow-through — for kids and adults who try hard and still struggle to stay on task.",
    guideHeading: "Why trying harder stops working.",
  },
  {
    slug: "sleep",
    shortTitle: "Sleep",
    title: "Sleep difficulties",
    titleLead: "Sleep ",
    titleAccent: "difficulties",
    who: "Adults & children",
    heroSub:
      "For minds that won't shut off at night, 3 a.m. wakings with no reason, and eight hours that somehow feel like four.",
    overview: {
      recognize:
        "A mind that won't shut off at night. Waking at 3 a.m. for no reason. Sleeping many hours and still waking exhausted.",
      approach:
        // The causal clause is deliberately gone: "because it's often where
        // clients notice change earliest" ranked sleep against every other
        // domain for speed of change, which is a claim about results and one
        // nothing here measures. The rest is process and stands. Same cut in
        // howHelp.p1 and faqs[0] below; see the note above `goals`.
        "Sleep is one of the first things we ask about at every visit. Your plan adjusts to what your nights are telling us.",
    },
    goalsHeading: "The changes people running on empty most often name.",
    faqHeading: "Asked by almost everyone who comes in exhausted.",
    recognize: [
      "A mind that won't shut off at night",
      "Waking frequently — or at 3 a.m. for no reason",
      "Eight hours that feel like four",
      "Inconsistent, unpredictable sleep",
      "Waking exhausted no matter how long you slept",
    ],
    howHelp: {
      /*
       * "and sleep is often the first thing clients tell us has shifted" is
       * gone for the reason above. Its trailing clause — "which is why we ask
       * about it at every visit" — had that claim as its antecedent and could
       * not be left standing on its own.
       *
       * **The ask survives in p2**, which already opens "Sleep is one of the
       * first things we ask about at every visit. Your plan adjusts to what
       * your nights are telling us." That is the reason, one sentence later,
       * and it is why p1 does not restate it.
       *
       * Restating it here was tried and reverted. Every wording that kept the
       * ask in p1 had to name sleep or nights again, and this passage already
       * carries each of those twice — `concern:sleep:approach` concatenates
       * overview.approach, p1 and p2. A third "nights" raised the term
       * frequency enough to take the bare query `night` off
       * `concern:sleep:signs`, which is the passage that actually describes
       * the concern and the one HANDOFF-concern-passage-ties.md says should
       * win bare topic words. The ending here adds no sleep vocabulary at all
       * and the sweep comes back at zero.
       */
      p1: "A wired, on-alert evening doesn't stand down just because the lights went out. LENS sessions are quiet and passive — nothing to perform, and nothing to keep up with between visits.",
      p2: "Sleep is one of the first things we ask about at every visit. Your plan adjusts to what your nights are telling us — falling asleep, staying asleep, and how mornings actually feel.",
      note: "LENS is a wellness service, not a treatment for sleep disorders. It works alongside — never in place of — care from your doctor. Individual experiences vary.",
    },
    goals: [
      "Falling asleep without an hour of ceiling-staring.",
      "Sleeping through the night more often than not.",
      "Waking up actually feeling rested.",
    ],
    faqs: [
      {
        q: "When do people notice changes in sleep?",
        // The comparative is gone; the hedged range it was wrapped around is
        // untouched and still answers the question. The anxiety and brain-fog
        // versions of this answer are deliberately NOT edited: they say "some
        // notice … within the first few sessions", which is a range with no
        // claim about which domain moves first, and that is the distinction.
        a: "It varies honestly — sometimes within the first few sessions; for others it builds gradually. Your check-ins make progress visible either way.",
      },
      {
        q: "Do I have to do anything between sessions?",
        a: "No. There's nothing to practice and no homework. We'll simply ask how you've been sleeping at the next visit — that's the data that shapes your plan.",
      },
      {
        q: "Can this work alongside what my doctor recommends?",
        a: "Yes — LENS is routinely used alongside other care, and we're glad to coordinate with providers you already trust. We never advise on medication.",
      },
    ],
    image: { src: "/images/recline.jpg", position: "center 55%" },
    related: ["anxiety", "brain-fog", "stress-resilience"],
    metaTitle: "Neurofeedback for Sleep",
    metaDescription:
      "Gentle LENS neurofeedback support for sleep difficulties — for minds that won't shut off at night and mornings that never feel rested.",
    guideHeading: "Why eight hours isn't rest.",
  },
  {
    slug: "emotional-regulation",
    shortTitle: "Emotional regulation",
    title: "Emotional regulation",
    titleLead: "Emotional ",
    titleAccent: "regulation",
    who: "Often children — and their parents",
    heroSub:
      "For the child who becomes overwhelmed in seconds and stays upset for hours — and the parents living every meltdown alongside them.",
    overview: {
      recognize:
        "Becoming overwhelmed quickly. Intense reactions that are hard to stop. Struggling with transitions, and staying upset long after the original problem has passed.",
      approach:
        "There's nothing a child has to get right in a LENS session — which matters for kids tired of being corrected. Parents join every check-in.",
    },
    goalsHeading: "The changes families in the meltdown years most often name.",
    faqHeading: "Asked by almost every parent who calls us.",
    recognize: [
      "Becoming overwhelmed quickly",
      "Intense reactions that are hard to stop",
      "Struggling with transitions",
      "Staying upset long after the moment has passed",
      "A short fuse — and a long recovery",
    ],
    howHelp: {
      p1: "Big reactions often come from tipping into overwhelm faster than it's possible to recover. LENS sessions are gentle and passive — nothing to get right, nothing to perform — and many families tell us the hard moments gradually get shorter and end in recovery.",
      p2: "There's nothing a child has to get right in a LENS session — which matters for kids tired of being corrected. Parents join every check-in, and we track what matters at home: transitions, recoveries, and how the hard moments actually go.",
      note: "LENS is a wellness service and doesn't diagnose or treat any condition. It works alongside — never in place of — therapists, pediatricians, and school supports. Individual experiences vary.",
    },
    goals: [
      "Meltdowns that get shorter — and end in recovery.",
      "Transitions without a standoff.",
      "More patience with the people you love.",
    ],
    faqs: [
      {
        q: "What if my child melts down at the appointment?",
        a: "That's okay — truly. There's nothing a child has to get right here, and our practitioners work with overwhelmed kids every week. Comfort beats stillness, and a parent stays the whole time.",
      },
      {
        q: "Is this only for children?",
        a: "No. Plenty of adults come in for exactly this — a short fuse, a long recovery, staying upset past the moment. The sessions are the same gentle format at every age.",
      },
      {
        q: "Can you coordinate with our therapist or school?",
        a: "Happily. LENS works alongside — never in place of — the care and supports you already have, and we're glad to communicate with providers you trust.",
      },
    ],
    image: { src: "/images/child-sensor.jpg", position: "center 42%" },
    related: ["children-school", "anxiety", "trauma"],
    metaTitle: "Neurofeedback for Emotional Regulation",
    metaDescription:
      "Gentle LENS neurofeedback support for emotional regulation — for kids (and adults) who become overwhelmed quickly and recover slowly.",
    guideHeading: "Why it isn't discipline.",
  },
  {
    slug: "brain-fog",
    shortTitle: "Brain fog & memory",
    title: "Brain fog, memory & mental fatigue",
    titleLead: "Brain fog, memory & mental ",
    titleAccent: "fatigue",
    who: "Most often adults",
    heroSub:
      "For thinking that feels slow or cloudy, words that vanish mid-sentence, and a mind that's exhausted by responsibilities it used to handle easily.",
    overview: {
      recognize:
        "Thinking that feels slow or cloudy. Losing words mid-sentence. Forgetting why you entered the room, and feeling cognitively exhausted by normal responsibilities.",
      approach:
        "We start with a consultation and a baseline recording of brain activity, then track clarity, recall, and mental energy across your sessions.",
    },
    goalsHeading: "The changes people in the fog most often name.",
    faqHeading: "Asked by almost everyone who comes in cloudy.",
    recognize: [
      "Thinking that feels slow or cloudy",
      "Losing words mid-sentence",
      "Forgetting why you entered the room",
      "Rereading the same paragraph again and again",
      "Cognitively exhausted by normal responsibilities",
    ],
    howHelp: {
      p1: "A foggy brain often feels like a tired one — energy going to noise instead of the task in front of you. LENS sessions are brief and passive, and many clients report thinking feeling clearer and less effortful over a series of visits.",
      p2: "We start with a consultation and a baseline recording of brain activity, then track clarity, recall, and mental energy across your sessions — in everyday specifics, not vague impressions.",
      note: "LENS is a wellness service and doesn't diagnose or treat any medical condition. If you're concerned about cognitive change, talk with your doctor — LENS works alongside, never in place of, that care. Individual experiences vary.",
    },
    goals: [
      "Reading a full report without restarting the paragraph.",
      "Finding the word while the sentence still needs it.",
      "Mental energy that lasts past 2 p.m.",
    ],
    faqs: [
      {
        q: "How do you track something as vague as brain fog?",
        a: "By making it specific. Every visit opens with a structured check-in on clarity, recall, and mental energy — the paragraphs, conversations, and afternoons where fog actually shows up.",
      },
      {
        q: "Should I see my doctor first?",
        a: "If cognitive change worries you, yes — please do. LENS is a wellness service and never replaces medical evaluation. Many clients pursue both at once.",
      },
      {
        q: "When do people notice change?",
        a: "It varies honestly — some notice clearer mornings within a few sessions; for others it builds gradually. Your check-ins make progress visible either way.",
      },
    ],
    image: { src: "/images/glass-head.jpg", position: "center 40%" },
    related: ["sleep", "stress-resilience", "focus-adhd"],
    metaTitle: "Neurofeedback for Brain Fog & Memory",
    metaDescription:
      "Gentle LENS neurofeedback support for brain fog, memory, and mental fatigue — for thinking that feels slow, cloudy, or spent by mid-afternoon.",
    guideHeading: "Why the fog comes and goes.",
  },
  {
    slug: "stress-resilience",
    shortTitle: "Stress & resilience",
    title: "Stress & resilience",
    titleLead: "Stress & ",
    titleAccent: "resilience",
    who: "Most often adults",
    heroSub:
      "For people who are functioning — holding the job, the family, the calendar — and quietly running on empty.",
    overview: {
      recognize:
        "Functioning, but close to burnout. Rest that doesn't restore. Carrying stress physically, and unable to recover after difficult days.",
      approach:
        "Sessions are short enough to keep in a full life — and they ask nothing of you. For many clients, that genuine off-switch is where things begin to turn.",
    },
    goalsHeading: "The changes people near burnout most often name.",
    faqHeading: "Asked by almost everyone who comes in running on fumes.",
    recognize: [
      "Functioning, but close to burnout",
      "Rest that doesn't restore",
      "Carrying stress physically — jaw, shoulders, gut",
      "Unable to recover after difficult days",
      "Wanting to handle normal stress normally",
    ],
    howHelp: {
      p1: "A system that never stands down eventually wears down. LENS sessions ask nothing of you — a comfortable chair, a very low-energy feedback signal, a genuine pause — and many clients report recovering from hard days more easily over time.",
      p2: "Sessions are short enough to keep in a full life, and they ask nothing of you — no practicing, no performing. For many clients, that genuine off-switch is where things begin to turn.",
      note: "LENS is a wellness service, not a medical treatment for burnout or any condition. It works alongside — never in place of — care from your doctor or therapist. Individual experiences vary.",
    },
    goals: [
      "Hard days that don't cost the whole next day.",
      "Rest that actually restores.",
      "Handling normal stress without overwhelm.",
    ],
    faqs: [
      {
        q: "I barely have time for this. How long are visits?",
        a: "Most visits are over in well under an hour — brief enough to fit a lunch break. There's nothing to practice between sessions and no homework.",
      },
      {
        q: "Is this just relaxation?",
        a: "The sessions are calm, but the approach is more specific: LENS observes brain activity and delivers a structured, very low-energy feedback signal, and we track how you actually feel at every visit.",
      },
      {
        q: "What if LENS isn't the right fit for me?",
        a: "We'll say so in your first conversation — plainly — and point you toward what might serve you better. That's policy, not politeness.",
      },
    ],
    image: { src: "/images/sensors-adult.jpg", position: "62% 30%" },
    related: ["anxiety", "sleep", "brain-fog"],
    metaTitle: "Neurofeedback for Stress & Burnout",
    metaDescription:
      "Gentle LENS neurofeedback support for stress and resilience — for people functioning near burnout whose rest no longer restores.",
    guideHeading: "Why the same week lands differently.",
  },
  {
    slug: "children-school",
    shortTitle: "Children & school",
    title: "Children, school & transitions",
    titleLead: "Children, school & ",
    titleAccent: "transitions",
    who: "Children & teens",
    heroSub:
      "For the bright kid who can't show what they know — morning battles, meltdowns, sensory overwhelm, and a child trying hard and still struggling.",
    overview: {
      recognize:
        "A bright kid who can't show what they know. Morning battles, meltdowns, sensory overwhelm, low frustration tolerance — a child trying hard and still struggling.",
      approach:
        "Kids don't have to sit still, concentrate, or perform. We track what matters at home: mornings, homework, and how they talk about themselves.",
    },
    goalsHeading: "The changes parents most often hope to see.",
    faqHeading: "Asked by almost every parent who calls us.",
    recognize: [
      "A bright kid who can't show what they know",
      "Morning battles and homework standoffs",
      "Meltdowns over transitions",
      "Sensory overwhelm and low frustration tolerance",
      "A child starting to say “I'm just bad at school”",
    ],
    howHelp: {
      p1: "There is nothing a child has to get right in a LENS session. No sitting perfectly still, no concentrating, no being corrected — kids read, draw, or just be kids while the session runs.",
      p2: "A parent joins every check-in, and we track what actually matters at home: mornings, homework, sleep — and how your child talks about themselves.",
      note: "We coordinate happily with teachers, therapists, and pediatricians. LENS is a wellness service and never replaces their care. Individual experiences vary.",
    },
    goals: [
      "Calmer mornings, fewer standoffs.",
      "Homework without the nightly battle.",
      "A kid who stops saying they're “bad at school.”",
    ],
    faqs: [
      {
        q: "Does my child have to sit still?",
        a: "No. There's nothing a child has to get right here — no sitting perfectly still, no concentrating, no being corrected. Comfort beats stillness.",
      },
      {
        q: "Can I stay with my child?",
        a: "Always. A parent stays with a child the whole time, and joins every check-in.",
      },
      {
        q: "Will you talk to our school or pediatrician?",
        a: "Happily. We coordinate with teachers, therapists, and pediatricians — LENS is a wellness service and never replaces their care.",
      },
    ],
    image: { src: "/images/art-wall.jpg", position: "center 45%" },
    related: ["focus-adhd", "emotional-regulation", "anxiety"],
    metaTitle: "Neurofeedback for School Struggles",
    metaDescription:
      "Gentle LENS neurofeedback support for children and school struggles — for bright kids who are trying hard and still struggling.",
    guideHeading: "Why school is the hard part.",
  },
  {
    slug: "trauma",
    shortTitle: "Trauma-related stress",
    title: "Trauma-related stress",
    titleLead: "Trauma-related ",
    titleAccent: "stress",
    who: "Adults & children",
    heroSub:
      "For when the past keeps the present from feeling safe — staying vigilant in rooms where nothing is wrong, with sleep, focus, and calm carrying the weight.",
    overview: {
      recognize:
        "When the past keeps the present from feeling safe. Staying vigilant in rooms where nothing is wrong — with sleep, focus, and calm carrying the weight.",
      approach:
        "LENS doesn't require you to retell or relive anything. Sessions are quiet and predictable, and pair well with the therapy or support you already trust.",
    },
    goalsHeading: "The changes people carrying the past most often name.",
    faqHeading: "Asked by almost everyone who comes in braced.",
    recognize: [
      "Staying vigilant in rooms where nothing is wrong",
      "A body braced long after the danger has passed",
      "Sleep, focus, and calm carrying the weight",
      "Startling easily, settling slowly",
      "The past keeping the present from feeling safe",
    ],
    howHelp: {
      p1: "LENS doesn't require you to retell or relive anything. Sessions are quiet and predictable — small sensors, a comfortable chair, nothing asked of you — while the system delivers its very low-energy feedback signal. Many clients describe sessions themselves as calming.",
      p2: "Sessions pair well with the therapy or support you already trust, and we're glad to coordinate with providers you're working with. We track how settled you actually feel at every visit.",
      note: "LENS is a wellness service, not a treatment for PTSD or any condition. It works alongside — never in place of — care from your therapist or doctor. Individual experiences vary.",
    },
    goals: [
      "Sitting in an ordinary room and feeling ordinary.",
      "Startling less, settling faster.",
      "Sleep that isn't standing guard.",
    ],
    faqs: [
      {
        q: "Will I have to talk about what happened?",
        a: "No. LENS doesn't require you to retell or relive anything. Sessions are quiet and predictable, and you're always in control of what you share.",
      },
      {
        q: "Can I keep seeing my therapist?",
        a: "Please do. LENS is routinely used alongside therapy, and we're glad to coordinate with providers you already trust. We never advise on medication.",
      },
      {
        q: "What are the sessions like?",
        a: "Calm and predictable by design: a quiet room, a comfortable chair, small sensors, and nothing to do or perform. We'll walk you through everything before anything begins.",
      },
    ],
    image: { src: "/images/relax.jpg", position: "center 40%" },
    related: ["anxiety", "sleep", "emotional-regulation"],
    metaTitle: "Neurofeedback for Trauma-Related Stress",
    metaDescription:
      "Gentle LENS neurofeedback support for trauma-related stress — quiet, predictable sessions that never ask you to retell or relive anything.",
    guideHeading: "Why the alarm stays on.",
  },
  {
    /*
     * The tenth concern (Sept 2026), from Ben's brief, and the redirect
     * destination for the legacy /peakperformance/ and /self-development/
     * URLs. Three decisions worth recording:
     *
     * 1. **It is a decline story, not an optimization story.** Ben's call.
     *    The audience is executives, founders, and professional musicians —
     *    not people in crisis, people who used to operate at a level they
     *    can't reach now. Nothing on this page promises enhancement above
     *    baseline; "peak performance" is the query, not the promise, and it
     *    appears only in the metaDescription. The recognize list is Ben's own
     *    recognition language, near-verbatim.
     * 2. **The slug is `performance`, not `peak-performance`.** The
     *    concussion-recovery reasoning from QUERY-TO-PAGE-MAP applies: a URL
     *    that names an outcome asserts it, and a slug is not a place to put
     *    a caveat. Approved by Ben.
     * 3. **The medical rule-out is on the page twice** — a clause in the
     *    limits note and FAQ 1 — because the same picture (fog, recall,
     *    stress tolerance) can come from causes a doctor can test for, and
     *    that is what every concern page owes its reader.
     */
    slug: "performance",
    shortTitle: "Performance",
    // Not the H1 — the approved H1 is a sentence, like concussion's. This is
    // what breadcrumbs, cross-links and the assistant's passage titles say.
    title: "Performance & mental sharpness",
    titleLead: "You used to be able to handle ",
    titleAccent: "more than this.",
    who: "Executives, founders & musicians",
    heroSub:
      "For people who used to operate at a level they can't reach now — not a crisis, just a gap you can feel between how you worked then and how the same week goes today.",
    overview: {
      recognize:
        "Brain fog where there didn't use to be any. Word recall that's become a struggle. Stress that used to be easier to handle, creative flow that used to come, and work that no longer gets finished by the deadline.",
      approach:
        "Nothing about a session asks you to perform — no drills, no scores, nothing to practice between visits. We track the specifics you actually name, week to week: recall, deadlines, how a heavy day lands.",
    },
    goalsHeading:
      "The changes people operating below their own baseline most often name.",
    faqHeading: "Asked by almost everyone who used to handle more.",
    recognize: [
      "“I used to be able to handle a lot” — and it was true",
      "Brain fog, and word recall that's become a struggle",
      "Handling stress used to be easier than it is now",
      "Creative flow that used to come on its own",
      "Struggling to finish things by the deadline",
    ],
    howHelp: {
      p1: "Operating below your own baseline is its own kind of tiring — you know exactly where the level is, because you used to work at it. LENS sessions ask nothing of you: small sensors, a very low-energy feedback signal, nothing to perform and nothing to practice between visits. A strange fit for high performers, and a deliberate one.",
      p2: `Your first visit is ${BRAIN_MAP_NAME} — ${FIRST_VISIT_DURATION}, a ${BRAIN_MAP_POINTS}-point recording of brain activity, and a written plan you keep. It's a recording, not a test you can fail. After that, every visit tracks the specifics you named: recall, deadlines, stress recovery, how the week actually went.`,
      note: "LENS is a wellness service, not a treatment for any condition — and a marked change in memory or thinking is worth ruling out with your doctor, because the same picture can come from causes testing finds. LENS works alongside — never in place of — that care. Individual experiences vary.",
    },
    goals: [
      "Finishing by the deadline, without the all-nighter.",
      "A heavy week that lands like a heavy week used to.",
      "Walking off stage — or out of the boardroom — knowing it went the way it used to.",
    ],
    faqs: [
      {
        // The medical rule-out, asked the way this audience asks it. Not
        // "Could this be something medical?" — the guide's medical-first
        // passage asks nearly those words, and DUPLICATE_QUESTIONS caught
        // the collision at authoring time (0.67). The answer refuses
        // nothing — it says "worth ruling out" in the first sentence, which
        // is the honest version and the one the page owes.
        q: "Should I rule anything out first?",
        a: "Worth ruling out, genuinely. The picture on this page — fog, recall, stress tolerance — can come from causes a doctor can test for, and if the change has been fast or marked, start there. LENS is a wellness service and never replaces that evaluation; plenty of people pursue both at once.",
      },
      {
        q: "I don't have a diagnosis. Is this for me?",
        a: "Yes. No diagnosis is needed here, and most of the people this page describes don't have one — they have a gap between how they used to operate and how things go now. The first visit starts from your specifics, not from a label.",
      },
      {
        // The busy-executive question — time first, and the prices ride
        // along. Worded away from the sitewide "What does it cost?" and "How
        // long is a session?" so DUPLICATE_QUESTIONS_ALLOWED stays empty of
        // this page. Every figure interpolates.
        q: "How much time does this actually take?",
        a: `Regular sessions are ${SESSION_LENGTH.value}, brief enough to keep inside a working day, and your first visit — ${BRAIN_MAP_NAME}, ${BRAIN_MAP_PRICE} — runs ${FIRST_VISIT_DURATION}. A full course is ${FULL_COURSE.value.sessions} sessions at ${SESSION_PRICE} each, then maintenance: ${MAINTENANCE.value}. ${COURSE_VARIES_NOTE}`,
      },
    ],
    image: { src: "/images/ear-clip-adult.jpg", position: "center 40%" },
    related: ["brain-fog", "stress-resilience", "focus-adhd"],
    metaTitle: "Neurofeedback for High Performers",
    // "peak performance" lives here, in a decline frame — the query is
    // targeted without the title or the page promising the peak. 159 chars.
    metaDescription:
      "LENS neurofeedback support for executives, founders, and musicians searching for peak performance — people who used to operate at a level they can't reach now.",
    guideHeading: "Why handling it got harder.",
  },
  {
    /*
     * The ninth concern, and the only one whose copy was approved as a block
     * rather than assembled from the mockups. Everything below is verbatim.
     *
     * Three things about this entry are not like the other eight, and all
     * three are deliberate:
     *
     * 1. `medicalFirst` — the page leads with "start with a doctor". Some of
     *    the people who find this page are days out from a head injury, and
     *    for them the correct answer is emergency care. The assistant carries
     *    the same rule as a check that fires before retrieval, so a recent
     *    injury described in the chat never reaches a passage about LENS
     *    (`head-injury` in lib/chat/safety.ts).
     * 2. No goal cards. A "Common goal" quote on this page would be an
     *    outcome claim about a brain injury, which is the one thing the copy
     *    may never make. Empty rather than invented; the band drops. The FAQs
     *    below were approved separately and are not part of the block.
     * 3. No photo. `image: null` with no `plateSpec` — the hero is copy only,
     *    so nothing sits between the H1 and the medical-first block.
     *
     * Nothing here names a sport, a league, a team or a person. "Professional
     * athletes" is the ceiling on that claim and it is already at it.
     */
    slug: "concussion",
    shortTitle: "Concussion & TBI",
    // Not the H1 — see `titleLead` on the type. This is what breadcrumbs, the
    // related-concern links and the assistant's passage titles say.
    title: "Post-concussion symptoms",
    titleLead: "Cleared by your doctor, and ",
    titleAccent: "still not right.",
    // Mostly adults. Youth sport is a real slice of this audience, but every
    // line of approved copy addresses an adult in the second person, so the
    // audience line says what the page actually is.
    who: "Most often adults",
    heroEyebrow: "After a concussion",
    heroSub:
      "Most concussion recovery advice ends at the point where the scans come back clean. For a lot of people, that's not where the problem ends.",
    medicalFirst: {
      urgent:
        "If your head injury was recent, start with a doctor. Emergency care exists for a reason, and the first days after a head injury are not the time for anything else. Nothing here replaces that, and we'd tell you the same thing on the phone.",
      laterLead:
        "This page is for later. Weeks or months out. You've been checked, you've been cleared, and something still isn't back.",
      gap:
        "That gap — medically cleared, functionally not yourself — is where most people are told to wait it out. Some do recover on their own. Others are still waiting a year later.",
    },
    overview: {
      // The same four sentences the page sets as a list, run together — this
      // is the /what-we-help-with entry, which is prose.
      recognize:
        "The fog that lifts and returns. Light and noise that wear on you in a way they didn't before. Sleep that never fully recovered. A shorter fuse than you used to have, and the sense that you're working harder to do the same things.",
      // The referral line is the strongest credibility signal on the site, so
      // it is what the hub entry leads with rather than a description of the
      // sessions. Interpolated from site-config now that /about, both location
      // pages and the homepage proof band state it too — one sentence, one
      // home, so five pages cannot drift into five wordings.
      approach: `${PHYSICIAN_REFERRALS} We also see professional athletes, and people recovering from car accidents, months and sometimes years after the injury.`,
    },
    recognize: [
      "The fog that lifts and returns",
      "Light and noise that wear on you in a way they didn't before",
      "Sleep that never fully recovered",
      "A shorter fuse than you used to have, and the sense that you're working harder to do the same things",
    ],
    howHelp: {
      p1: "Post-concussion symptoms tend to cluster the same way attention, sleep, mood and mental fatigue cluster in everyone else: they're outputs of a nervous system struggling to regulate. That's why the person recovering from a car accident and the parent whose kid can't settle often describe surprisingly similar days.",
      // The point count interpolates like every other figure on the site, so
      // the page and lib/site-config.ts cannot disagree about the Brain Map.
      p2: `A ${BRAIN_MAP_POINTS}-point recording and a written plan you keep. We walk you through what we see, alongside what you tell us about how your days actually go.`,
      // The only sentence on this page that is not in the approved block. It
      // is here because all eight other concerns carry the same boundary, and
      // because it is the passage the assistant needs when someone asks "does
      // LENS help with concussion?" — without it that question has no limit to
      // answer with. Worded to say less than the others, not more: no verb
      // that could be read as treating an injury.
      note: "LENS is a wellness service. It doesn't treat concussion or brain injury of any kind, and it never stands in for the care of a doctor. Individual experiences vary.",
    },
    goals: [],
    /*
     * Six, and every one of them is a question this audience asks rather than
     * a question the layout wanted. The rules they are written under:
     *
     * - Nothing claims a recovery, an improvement, or a speed. Where a
     *   question invites one — "is it too late?" — the answer refuses the
     *   prediction in the first sentence rather than hedging its way around
     *   it, which is what makes that question safe to publish at all.
     * - Nothing compares LENS to another modality on whether it works. FAQ 2
     *   names vestibular and vision rehab because people ask about them by
     *   name; the only comparison it draws is what a session asks of you,
     *   which is a fact about our format and not a claim about theirs.
     * - Every figure interpolates. The course, the taper and the caveat that
     *   rides them come from lib/site-config.ts like everywhere else.
     * - FAQ 3 does not assert a safety finding about combining LENS with
     *   rehab. The site's own "Is it safe?" answer is about the signal being
     *   gentle and noninvasive, and this does not reach past it — it answers
     *   the practical question and hands the clinical one back to the team
     *   running the rehab.
     */
    faqs: [
      {
        // "after a concussion" is not decoration. Worded as the plain "What
        // happens at a first visit?" this passage *took* that question from
        // page:first-visit:five-parts sitewide — a concern FAQ's question is
        // weighted x3 and this passage is far shorter, so it won on both
        // counts, and a visitor asking a general question got an answer that
        // says "it isn't a medical assessment of your injury". The question a
        // concern FAQ asks has to be a question about that concern.
        q: "What should I expect the first time I come in after a head injury?",
        a: `The first visit is ${BRAIN_MAP_NAME}: ${FIRST_VISIT_DURATION}, a ${BRAIN_MAP_POINTS}-point recording of brain activity, and a written plan you keep. We walk you through what we see alongside what you tell us about how your days actually go. It isn't a medical assessment of your injury, and it isn't a test you can fail.`,
      },
      {
        q: "How is this different from vestibular or vision therapy?",
        a: "It's a different thing, and we don't do either one. Vestibular and vision rehab are clinical therapies delivered by clinicians. LENS is a wellness service, and a session asks nothing of you — no exercises, no drills, nothing to practice between visits. If you're doing either, keep doing it.",
      },
      {
        q: "Can I do this alongside rehab I'm already doing?",
        a: "Yes — that's usually how it goes. LENS is routinely used alongside other care, and we're glad to coordinate with providers you already trust. If your doctor or your rehab team has told you to hold off on anything, follow them; we'd say the same on the phone.",
      },
      {
        q: "How long do people usually come?",
        a: `A full course is ${FULL_COURSE.value.sessions} sessions, then maintenance — ${MAINTENANCE.value}. ${COURSE_VARIES_NOTE}`,
      },
      {
        q: "Do I need a referral?",
        a: "No. Physicians in Middle Tennessee do refer patients to us — we work from a standing referral list — but you don't need a referral to call. If you'd rather your doctor was in the loop, we're glad to coordinate with them.",
      },
      {
        q: "It's been over a year. Is it too late?",
        a: "We don't predict how it would go for anyone. What we can tell you is that people come to us months and sometimes years after the injury, and a practitioner will tell you honestly on the free call whether LENS is a fit.",
      },
    ],
    faqHeading: "Asked by almost everyone who comes in after a head injury.",
    image: null,
    // The clusters the copy names — attention, sleep, mood, mental fatigue —
    // rather than the concerns nearest alphabetically.
    related: ["brain-fog", "sleep", "emotional-regulation"],
    // 48 chars, and the whole title — the brand suffix no longer appends. It
    // was briefly cut to "…Post-Concussion Symptoms" (42) to buy back the 27
    // characters the template was taking; dropping the suffix bought them back
    // properly, so "& TBI" comes home. `post concussion symptoms` is still the
    // target query and still leads.
    metaTitle: "Neurofeedback for Post-Concussion Symptoms & TBI",
    metaDescription:
      // 158 chars, down from 186. The "Physician-referred." sentence is what
      // goes: it now has four other homes (see PHYSICIAN_REFERRALS), and the
      // doctor-first sentence is the one that must survive truncation on this
      // page of all pages.
      "LENS neurofeedback in Middle Tennessee for people cleared after a concussion or TBI who still aren't themselves. If your injury is recent, see a doctor first.",
    guideHeading: "Why these problems travel together.",
  },
  {
    /*
     * The eleventh concern (Sept 2026), and the highest-risk page on the
     * site: migraine is a neurological condition. The rules this entry is
     * written under, from Ben's brief — read them before editing a word:
     *
     * - **Never** say LENS helps, relieves, reduces, or treats migraines.
     *   Not hedged, not "many clients report", not "some find relief". No
     *   outcome claim in any form, anywhere on this page. That is why there
     *   is no "many clients tell us…" sentence here when every non-medical
     *   concern carries one.
     * - The page describes WHO COMES IN, not what happens to them. The
     *   recognize list is a list of arrivals, not symptoms we address.
     * - Medical care leads the page, before anything about LENS — the
     *   concussion ordering, via `medicalFirst`. The `urgent` copy is
     *   mirrored by the `headache` stop in lib/chat/safety.ts; the check and
     *   this entry ship together and move together.
     * - The `gap` paragraph is Ben's approved framing, near-verbatim. The
     *   free call is where "what would LENS do for mine?" gets answered —
     *   by a practitioner, not by this page and not by the assistant.
     * - No goal cards, concussion's reason exactly: a "common goal" quote on
     *   this page would be an outcome claim about a neurological condition.
     *   Empty rather than invented; the band drops.
     * - Post-concussion headache is the strongest and most honest angle, and
     *   the concussion page carries the credibility (the physician-referral
     *   relationship), so `bodyLink` sends readers there prominently.
     * - No photo: `image: null`, so nothing sits between the H1 and the
     *   medical-first block.
     */
    slug: "migraines",
    shortTitle: "Migraines",
    title: "Migraines",
    // The approved H1, a sentence like concussion's; breadcrumbs and
    // cross-links say "Migraines".
    titleLead: "After you've tried ",
    titleAccent: "a lot of other things.",
    who: "Most often adults",
    // The relationship is the eyebrow, the way "After a concussion" made
    // *when* the eyebrow: medical care is the frame this page sits inside.
    heroEyebrow: "Alongside your medical care",
    heroSub:
      "People come to us for migraines after they've tried a lot of other things — often already under a doctor's care, often with headaches that started after a concussion. We don't treat migraines. This page is about who comes in, not about what would happen for you.",
    medicalFirst: {
      // Mirrored by HEADACHE_EMERGENCY_REPLY in lib/chat/safety.ts (which
      // adds nothing — unlike concussion's, this block already carries the
      // 911 line, because the emergency it names can't wait for a phone).
      urgent:
        "A sudden, severe headache — or the worst headache of your life — is a medical emergency: call 911 or get to an emergency room now. The same goes for a headache with anything new alongside it — confusion, trouble seeing or speaking, weakness or numbness, a stiff neck with a fever. Nothing here comes before that, and we'd tell you the same thing on the phone.",
      laterLead:
        "This page is for the long haul. Migraines a doctor already knows about, that have been part of your life for a while:",
      // Ben's approved framing — build the page around this, don't soften it.
      gap:
        "People come to us for migraines after they've tried a lot of other things. Often they're already under a doctor's care — care that continues exactly as it is — and often the headaches started after a concussion. We don't treat migraines, and we won't tell you what LENS would do for yours. That's what the free call is for.",
    },
    overview: {
      // Who comes in — arrivals, not symptoms. This is the hub entry. It
      // joins the recognize list in the indexed `signs` passage, so it says
      // "date to" for the reason the list does — see the note there.
      recognize:
        "Headaches that date to a concussion and won't fully leave. Migraines that have outlasted years of good-faith attempts. A doctor or neurologist already involved — and staying involved.",
      approach: `We don't treat migraines, and we won't tell you what LENS would do for yours — that's what the free call is for. ${PHYSICIAN_REFERRALS} When the headaches date to a head injury, our concussion page describes that territory properly.`,
    },
    recognize: [
      // "date to", not "started after" — the heroSub already says "started
      // after a concussion", and this list joins it in the same indexed
      // passage (`signs`). Doubling "started" there put that passage into
      // the four for "I start things and never finish them", a focus-adhd
      // routing line with nothing migraine about it. Same reason this line
      // avoids a second "never".
      "Headaches that date to a concussion and won't fully leave",
      "Migraines that have outlasted years of good-faith attempts",
      "A doctor or neurologist already involved — and staying involved",
      "A list, somewhere, of everything that's already been tried",
    ],
    howHelp: {
      // "concussion" appears in exactly three passages of this concern —
      // signs, medical-first, and FAQ 2 — and deliberately not here or in
      // `approach`, which say "head injury" instead. Every extra passage
      // carrying the word lowers its IDF for the concussion page's own
      // routing; the sweep that shipped this entry measured the cost at
      // three and it is not free to grow.
      p1: "For many of the people this page describes, the story starts with a head injury — medically handled, and headaches that arrived with it and stayed. That picture sits close to the rest of our work: attention, sleep, mood, and mental fatigue clustering around a nervous system struggling to regulate. The headaches themselves stay your doctor's territory.",
      p2: `The first visit is ${BRAIN_MAP_NAME}: ${FIRST_VISIT_DURATION}, a ${BRAIN_MAP_POINTS}-point recording of brain activity, and a written plan you keep. It's a recording, not a test — and not a medical assessment of your headaches.`,
      // The one limitation sentence, concussion's register: worded to say
      // less than the other concerns' notes, not more.
      note: "LENS is a wellness service. It doesn't treat migraines or headaches of any kind, and it never stands in for the care of a doctor. Individual experiences vary.",
    },
    goals: [],
    faqs: [
      {
        q: "Do I stop seeing my doctor or neurologist?",
        a: "No — and we'd say so on the phone. Your medical care continues exactly as it is. LENS is a wellness service that runs alongside it; we're glad to coordinate with providers you already trust, and we never advise on medication.",
      },
      {
        // "read the concussion one first", not "starting with" — the
        // question already carries "started" at x3 weight (it has to, for
        // routing), and one more `start` in the answer was enough to lift
        // this passage into the four for the bare query "start", which
        // belongs to focus-adhd and the homepage steps.
        q: "My headaches started after a concussion. Which page should I read?",
        a: "Both — read the concussion one first. Post-concussion symptoms are the territory we know best, and that page says what this one can't: who comes in after a head injury, and what the first visit looks like weeks or months out.",
      },
      {
        // The refusal made into content, in Ben's words. This is the passage
        // the assistant needs when someone asks the question directly — the
        // answer is that the page won't answer it, and why.
        q: "What would LENS do for my migraines?",
        a: `We won't tell you — not to be cagey, but because we don't predict outcomes and we don't treat migraines. That's exactly what the free call is for: a practitioner talks it through with you honestly. ${RISK_REVERSAL}`,
      },
    ],
    faqHeading: "Asked by almost everyone who calls about migraines.",
    image: null,
    bodyLink: { label: "Read the concussion page", href: "/concerns/concussion" },
    related: ["concussion", "sleep", "stress-resilience"],
    // The one standing exception to "Neurofeedback for X" — see the note on
    // the type. A conjunction, because "for migraines" is a treatment claim
    // and a title has no room to hedge. Approved by Ben, Sept 2026.
    metaTitle: "Migraines & LENS Neurofeedback",
    // 160 chars. The boundary sentence leads so it survives truncation —
    // this page of all pages, concussion's reasoning.
    metaDescription:
      "We don't treat migraines. People come to us after they've tried a lot of other things — often under a doctor's care, often after a concussion. Middle Tennessee.",
    guideHeading: "Why the same systems keep coming up.",
  },
];

export function getConcern(slug: string): Concern | undefined {
  return concerns.find((c) => c.slug === slug);
}
