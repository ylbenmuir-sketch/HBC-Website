import {
  BRAIN_MAP_PRICE,
  COURSE_VARIES_NOTE,
  FIRST_VISIT_DURATION,
  FULL_COURSE,
  INSURANCE_POLICY,
  MAINTENANCE,
  MAINTENANCE_NOTE,
  PACKAGE_NOTE,
  PACKAGE_PRICE,
  PACKAGE_SAVING,
  PACKAGE_SESSIONS,
  RISK_REVERSAL,
  SESSION_LENGTH,
  SESSION_PRICE,
} from "./site-config";

/**
 * The 14 questions on /faq.
 *
 * Lifted out of app/faq/page.tsx so three consumers read one array: the
 * accordion, the FAQPage JSON-LD, and the site assistant's content index
 * (lib/chat/content-index.ts). The page keeps the richer `rendered` variants —
 * the inline links and [CONFIRM] tags are display concerns and stay in the
 * component — but the question and the plain answer live here.
 *
 * `a` was already plain text rather than JSX for the schema's sake (see the
 * `a`/`rendered` note in components/FAQAccordion.tsx), which is the same
 * reason it can be indexed: it is the answer a visitor sees, minus the markup
 * and minus anything draft-gated.
 *
 * `confirmTag` is the exception that proves that last clause, and is empty
 * today only because Ben confirmed the three facts that filled it. Three
 * answers here — session length, cost, insurance — used to render with a gold
 * [CONFIRM] tag beside them, and a tag is markup, so stripping the markup
 * stripped the only sign that the answer was unconfirmed and the assistant
 * indexed all three as settled fact. Should another answer ever need a tag,
 * record it here next to the answer it governs, the way lib/locations.ts
 * carries `communitiesTag`: it is a property of the copy, not of the accordion.
 */

export type SiteFaq = {
  q: string;
  a: string;
  /**
   * The [CONFIRM] tag app/faq/page.tsx renders beside this answer. Its
   * presence keeps the answer out of the assistant's index entirely — see the
   * `confirmTag` note in lib/chat/types.ts. Deleting the tag on confirmation
   * restores the answer to the assistant in the same edit.
   */
  confirmTag?: string;
};

export const SITE_FAQS: SiteFaq[] = [
  {
    q: "What is LENS neurofeedback?",
    a: "LENS — the Low Energy Neurofeedback System — uses small sensors to observe the brain's electrical activity and returns a brief, very low-energy feedback signal, far weaker than the everyday signals already around you. There's nothing to perform, and it's offered as a wellness service — not a medical treatment.",
  },
  {
    q: "Is it safe?",
    a: "LENS is gentle and noninvasive. Nothing enters the body, and the feedback signal is far weaker than the everyday signals already around you. We'll walk you through exactly what to expect before anything begins.",
  },
  {
    q: "Does it hurt?",
    a: "No. Most people — including young children — feel nothing at all during a session.",
  },
  {
    q: "Is it appropriate for children?",
    a: "Yes. There's nothing a child has to get right: no sitting perfectly still, no concentrating, no being corrected. Parents are welcome at every visit and every check-in.",
  },
  {
    q: "Do I have to do anything during the session?",
    a: "No. No screens to watch, tasks to complete, or skills to practice. You sit comfortably; many clients read or simply rest.",
  },
  {
    q: "How long is a session?",
    a: `Regular sessions run ${SESSION_LENGTH.value} — brief enough to fit a lunch break or a school pickup. Your first visit, the Brain Map, takes ${FIRST_VISIT_DURATION}, because it includes the full conversation and the recording.`,
  },
  {
    // Ben confirmed the course and the taper, so this answer states both
    // instead of hedging. The old copy — "it genuinely varies from person to
    // person" — was the whole answer, which meant the question a visitor was
    // really asking ("is this open-ended?") went unanswered on every page that
    // carried it. The variation is still here; it is now a caveat on the
    // protocol rather than a substitute for one. This array is what the site
    // assistant indexes (lib/chat/content-index.ts), so the answer it gives
    // changes with this edit and nothing has to be mirrored by hand.
    //
    // "A full course is", never "a typical course is": the number is the
    // recommended protocol, not an observed average. See FULL_COURSE.
    q: "How many sessions will I need?",
    a:
      `A full course is ${FULL_COURSE.value.sessions} sessions, then ` +
      `maintenance, and ${FULL_COURSE.value.children}. From there the ` +
      `schedule winds down rather than continuing indefinitely: ` +
      `${MAINTENANCE.value}. ${MAINTENANCE_NOTE} ${COURSE_VARIES_NOTE}`,
  },
  {
    q: "What does the first visit include?",
    a: "A real conversation about what’s going on, a baseline recording of brain activity, and a personalized plan explained in plain language — with every question answered before you decide anything.",
  },
  {
    q: "What kinds of concerns do clients come in with?",
    a: "Most commonly: anxiety and stress, focus and ADHD, sleep, emotional regulation, brain fog and memory, burnout, school struggles, and trauma-related stress.",
  },
  {
    q: "Is this therapy or medical treatment?",
    a: "Neither. We're a wellness practice. LENS doesn't diagnose or treat medical or psychiatric conditions, and it isn't a substitute for care from your doctor or therapist.",
  },
  {
    q: "Can I continue seeing my doctor or therapist?",
    a: "Please do. LENS is routinely used alongside other care, and we're glad to coordinate with providers you already trust. We never advise on medication.",
  },
  {
    q: "What does it cost?",
    a: `The phone call is free. The Brain Map — your first visit — is ${BRAIN_MAP_PRICE} and includes the full conversation, a baseline recording of brain activity, and a written plan you keep. Regular sessions are ${SESSION_PRICE}, and a ${PACKAGE_SESSIONS}-session package is ${PACKAGE_PRICE} — ${PACKAGE_SAVING} less than paying per session. ${PACKAGE_NOTE}`,
  },
  {
    q: "Does insurance cover it?",
    a: INSURANCE_POLICY,
  },
  {
    q: "What if I'm unsure whether it's right for me?",
    a: `That’s exactly what the free call is for. Bring the skeptical questions. ${RISK_REVERSAL}`,
  },
];
