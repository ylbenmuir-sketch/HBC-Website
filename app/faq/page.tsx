import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import FAQAccordion, { type FaqItem } from "@/components/FAQAccordion";
import FinalCTA from "@/components/FinalCTA";
import ConfirmTag from "@/components/ConfirmTag";
import JsonLd from "@/components/JsonLd";
import { faqPageSchema } from "@/lib/schema";
import { SITE_FAQS } from "@/lib/faq";
import {
  BRAIN_MAP_PRICE,
  SESSION_LENGTH_TAG,
  PRICING_TAG,
  INSURANCE_TAG,
} from "@/lib/site-config";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Every question about LENS neurofeedback, answered plainly — including the ones people are hesitant to ask.",
};

/**
 * The five answers that render richer than their plain text — an inline link
 * or a [CONFIRM] tag. Keyed by question so the copy stays in lib/faq.ts and
 * only the markup lives here; see the `a`/`rendered` note in
 * components/FAQAccordion.tsx for why the two must keep saying the same thing.
 */
const rendered: Record<string, ReactNode> = {
  "How long is a session?": (
    <>
      Most visits are over in well under an hour — brief enough to fit a lunch
      break or a school pickup.{" "}
      <ConfirmTag>{SESSION_LENGTH_TAG}</ConfirmTag>
    </>
  ),
  "What does the first visit include?": (
    <>
      A real conversation about what&rsquo;s going on, a baseline recording of
      brain activity, and a personalized plan explained in plain language — with
      every question answered before you decide anything. See{" "}
      <Link href="/first-visit">Your First Visit</Link>.
    </>
  ),
  "What kinds of concerns do clients come in with?": (
    <>
      Most commonly: anxiety and stress, focus and ADHD, sleep, emotional
      regulation, brain fog and memory, burnout, school struggles, and
      trauma-related stress. See{" "}
      <Link href="/what-we-help-with">What We Help With</Link>.
    </>
  ),
  "What does it cost?": (
    <>
      The phone call is free. The Brain Map — your first visit — is{" "}
      {BRAIN_MAP_PRICE} and includes the full conversation, a baseline recording
      of brain activity, and a written plan you keep. Session pricing is shared
      before you commit to anything. <ConfirmTag>{PRICING_TAG}</ConfirmTag>
    </>
  ),
  "Does insurance cover it?": (
    <>
      As a wellness service, LENS is typically not covered by insurance. Many
      clients use HSA/FSA funds — we can provide documentation.{" "}
      <ConfirmTag>{INSURANCE_TAG}</ConfirmTag>
    </>
  ),
};

const faqs: FaqItem[] = SITE_FAQS.map((faq) => ({
  ...faq,
  rendered: rendered[faq.q],
}));

export default function FaqPage() {
  return (
    <>
      <JsonLd data={faqPageSchema(faqs)} />
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
          <FAQAccordion items={faqs} openFirst />
        </div>
      </section>
      <FinalCTA />
    </>
  );
}
