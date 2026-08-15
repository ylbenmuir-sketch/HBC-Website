import {
  BRAIN_MAP_PRICE,
  INSURANCE_TAG,
  PRICING_TAG,
  RISK_REVERSAL,
  SESSION_LENGTH_TAG,
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
 * `confirmTag` is the exception that proves that last clause. Three answers
 * render on /faq with a gold [CONFIRM] tag beside them, and the tag is markup
 * — so stripping the markup stripped the only sign that the answer is
 * unconfirmed, and the assistant indexed it as settled fact. The tag is
 * therefore recorded here, next to the answer it governs, the same way
 * lib/locations.ts carries `communitiesTag`: it is a property of the copy, not
 * of the accordion.
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
    a: "Most visits are over in well under an hour — brief enough to fit a lunch break or a school pickup.",
    confirmTag: SESSION_LENGTH_TAG,
  },
  {
    q: "How many sessions will I need?",
    a: "It genuinely varies from person to person. We track how you feel at every visit, review progress together, and never ask you to commit to a long program up front.",
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
    a: `The phone call is free. The Brain Map — your first visit — is ${BRAIN_MAP_PRICE} and includes the full conversation, a baseline recording of brain activity, and a written plan you keep. Session pricing is shared before you commit to anything.`,
    confirmTag: PRICING_TAG,
  },
  {
    q: "Does insurance cover it?",
    a: "As a wellness service, LENS is typically not covered by insurance. Many clients use HSA/FSA funds — we can provide documentation.",
    confirmTag: INSURANCE_TAG,
  },
  {
    q: "What if I'm unsure whether it's right for me?",
    a: `That’s exactly what the free call is for. Bring the skeptical questions. ${RISK_REVERSAL}`,
  },
];
