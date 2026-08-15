/**
 * All 8 concerns from what-we-help-with.html, data-driven.
 * The anxiety entry is seeded verbatim from concern-anxiety.html; the other
 * seven reuse its page structure with copy drawn from the overview mockups
 * (kept to the same no-hype standard — no medical claims, ever).
 */

export type ConcernFaq = { q: string; a: string };

export type Concern = {
  slug: string;
  /** Short name used in nav/cards, e.g. "Anxiety & stress". */
  shortTitle: string;
  /** Full display title, split so the em.sage italic word can be styled. */
  title: string;
  /** The italicized sage word/phrase within the title (rendered after titleLead). */
  titleLead: string;
  titleAccent: string;
  who: string;
  heroSub: string;
  /** Overview page (what-we-help-with) copy. */
  overview: {
    recognize: string;
    approach: string;
  };
  /** Detail page content. */
  goalsHeading: string;
  faqHeading: string;
  recognize: string[];
  howHelp: { p1: string; p2: string; note: string };
  goals: string[]; // "Common goal" quote cards
  faqs: ConcernFaq[];
  image: { src: string; position: string } | null;
  plateSpec?: string;
  /**
   * <title> for the page, always "Neurofeedback for X". Required, not
   * optional: the display `title` above is the on-page headline and reads as
   * a symptom ("Sleep difficulties"), which targets nothing — "neurofeedback"
   * is the qualifying word people actually search with. Required so a new
   * concern can't ship without one.
   *
   * Keep the "support" framing in metaDescription rather than here; a title
   * has no room to hedge, and the description is where the wellness
   * disclaimer stays consistent.
   */
  metaTitle: string;
  metaDescription: string;
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
    metaTitle: "Neurofeedback for Anxiety & Stress",
    metaDescription:
      "Gentle LENS neurofeedback support for anxiety and nervous-system overload — for people whose bodies stay on alert long after the moment has passed.",
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
    metaTitle: "Neurofeedback for ADHD & Focus",
    metaDescription:
      "Gentle LENS neurofeedback support for focus, ADHD, and follow-through — for kids and adults who try hard and still struggle to stay on task.",
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
        "Sleep is one of the first things we ask about at every visit, because it's often where clients notice change earliest. Your plan adjusts to what your nights are telling us.",
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
      p1: "A wired, on-alert evening doesn't stand down just because the lights went out. LENS sessions are quiet and passive — and sleep is often the first thing clients tell us has shifted, which is why we ask about it at every visit.",
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
        a: "It varies honestly — sleep is often where clients notice change earliest, sometimes within the first few sessions; for others it builds gradually. Your check-ins make progress visible either way.",
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
    metaTitle: "Neurofeedback for Sleep",
    metaDescription:
      "Gentle LENS neurofeedback support for sleep difficulties — for minds that won't shut off at night and mornings that never feel rested.",
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
    metaTitle: "Neurofeedback for Emotional Regulation",
    metaDescription:
      "Gentle LENS neurofeedback support for emotional regulation — for kids (and adults) who become overwhelmed quickly and recover slowly.",
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
    metaTitle: "Neurofeedback for Brain Fog & Memory",
    metaDescription:
      "Gentle LENS neurofeedback support for brain fog, memory, and mental fatigue — for thinking that feels slow, cloudy, or spent by mid-afternoon.",
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
    metaTitle: "Neurofeedback for Stress & Burnout",
    metaDescription:
      "Gentle LENS neurofeedback support for stress and resilience — for people functioning near burnout whose rest no longer restores.",
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
    metaTitle: "Neurofeedback for School Struggles",
    metaDescription:
      "Gentle LENS neurofeedback support for children and school struggles — for bright kids who are trying hard and still struggling.",
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
    metaTitle: "Neurofeedback for Trauma-Related Stress",
    metaDescription:
      "Gentle LENS neurofeedback support for trauma-related stress — quiet, predictable sessions that never ask you to retell or relive anything.",
  },
];

export function getConcern(slug: string): Concern | undefined {
  return concerns.find((c) => c.slug === slug);
}
