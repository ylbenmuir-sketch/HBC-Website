import Link from "next/link";
import type { Metadata } from "next";
import FAQAccordion, { type FaqItem } from "@/components/FAQAccordion";
import FinalCTA from "@/components/FinalCTA";
import ConfirmTag from "@/components/ConfirmTag";
import {
  SESSION_LENGTH_TAG,
  PRICING_TAG,
  INSURANCE_TAG,
} from "@/lib/site-config";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Every question about LENS neurofeedback, answered plainly — including the ones people are hesitant to ask.",
};

const faqs: FaqItem[] = [
  {
    q: "What is LENS neurofeedback?",
    a: "LENS — the Low Energy Neurofeedback System — reads your brain's activity through small sensors and reflects a faint, imperceptible signal back to it, supporting the brain's natural ability to settle and regulate. Nothing is forced, and there's nothing to perform.",
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
    a: "Yes. There's nothing a child has to get right: no sitting perfectly still, no concentrating, no being corrected. A parent joins every visit and every check-in.",
  },
  {
    q: "Do I have to do anything during the session?",
    a: "No. No screens to watch, tasks to complete, or skills to practice. You sit comfortably; many clients read or simply rest.",
  },
  {
    q: "How long is a session?",
    a: (
      <>
        Most visits are over in well under an hour — brief enough to fit a
        lunch break or a school pickup.{" "}
        <ConfirmTag>{SESSION_LENGTH_TAG}</ConfirmTag>
      </>
    ),
  },
  {
    q: "How many sessions will I need?",
    a: "It genuinely varies from person to person. We track how you feel at every visit, review progress together, and never ask you to commit to a long program up front.",
  },
  {
    q: "What does the first visit include?",
    a: (
      <>
        A real conversation about what&rsquo;s going on, a gentle brain map,
        and a personalized plan explained in plain language — with every
        question answered before you decide anything. See{" "}
        <Link href="/first-visit">Your First Visit</Link>.
      </>
    ),
  },
  {
    q: "What kinds of concerns do clients come in with?",
    a: (
      <>
        Most commonly: anxiety and stress, focus and ADHD, sleep, emotional
        regulation, brain fog and memory, burnout, school struggles, and
        trauma-related stress. See{" "}
        <Link href="/what-we-help-with">What We Help With</Link>.
      </>
    ),
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
    a: (
      <>
        The consultation conversation is free. Session and mapping pricing is
        straightforward and shared before you commit to anything.{" "}
        <ConfirmTag>{PRICING_TAG}</ConfirmTag>
      </>
    ),
  },
  {
    q: "Does insurance cover it?",
    a: (
      <>
        As a wellness service, LENS is typically not covered by insurance.
        Many clients use HSA/FSA funds — we can provide documentation.{" "}
        <ConfirmTag>{INSURANCE_TAG}</ConfirmTag>
      </>
    ),
  },
  {
    q: "What if I'm unsure whether it's right for me?",
    a: "That's exactly what the free conversation is for. Bring the skeptical questions — and if we think LENS isn't a good fit, we'll say so and point you toward what might serve you better.",
  },
];

export default function FaqPage() {
  return (
    <>
      <section className="page-hero center">
        <div className="wrap rv">
          <div className="eyebrow">Frequently asked questions</div>
          <h1>Every question, answered plainly.</h1>
          <p className="sub" style={{ maxWidth: "56ch" }}>
            Including the ones people are hesitant to ask. If yours isn&rsquo;t
            here, call &mdash; a real person answers during business hours.
          </p>
        </div>
      </section>
      <section className="sec">
        <div className="wrap" style={{ maxWidth: 900 }}>
          <FAQAccordion items={faqs} />
        </div>
      </section>
      <FinalCTA />
    </>
  );
}
