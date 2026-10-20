import Link from "next/link";
import VideoBand from "@/components/VideoBand";
import { videoForPage } from "@/lib/videos";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import FAQAccordion, { type FaqItem } from "@/components/FAQAccordion";
import FinalCTA from "@/components/FinalCTA";
import Breadcrumbs from "@/components/Breadcrumbs";
import PageSchema from "@/components/PageSchema";
import { Btn } from "@/components/Buttons";
import ConfirmTag from "@/components/ConfirmTag";
import FaqHashOpener from "@/components/FaqHashOpener";
import { faqQuestions } from "@/lib/schema";
import { SITE_FAQS } from "@/lib/faq";
import { hubTrail, pageMetadata } from "@/lib/pages";

// Title, description and the page's content date live in lib/pages.ts.
export const metadata: Metadata = pageMetadata("/faq");

/**
 * The two answers that render richer than their plain text — an inline link.
 * Keyed by question so the copy stays in lib/faq.ts and only the markup lives
 * here; see the `a`/`rendered` note in components/FAQAccordion.tsx for why the
 * two must keep saying the same thing.
 *
 * Three more used to sit here carrying nothing but a [CONFIRM] tag — session
 * length, cost and insurance. Ben confirmed all three, so the tags went and
 * the overrides went with them: those answers now render straight from
 * lib/faq.ts, which is one fewer place for them to drift.
 */
const rendered: Record<string, ReactNode> = {
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
};

// A question still waiting on Ben carries its tag (lib/faq.ts → gated);
// such a question exists only in a draft build.
const faqs: FaqItem[] = SITE_FAQS.map((faq) => ({
  ...faq,
  rendered:
    rendered[faq.q] ??
    (faq.confirmTag ? (
      <>
        {faq.a} <ConfirmTag>{faq.confirmTag}</ConfirmTag>
      </>
    ) : undefined),
}));

/** The page's one video, below the fold (lib/videos.ts → `home`). */
const VIDEO = videoForPage("/faq");

export default function FaqPage() {
  const trail = hubTrail("/faq");
  return (
    <>
      {/* The WebPage node is typed FAQPage (lib/pages.ts) and carries the
          fourteen questions as its mainEntity — one page node, not two. */}
      <PageSchema path="/faq" breadcrumb={trail} mainEntity={faqQuestions(faqs)} />
      <Breadcrumbs trail={trail} />
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
          <FaqHashOpener />
          {/* The skepticism page: the two safety answers above, plus what the
              site refuses to claim and where the public reviews are. */}
          <div className="hero-ctas rv" style={{ marginTop: 40 }}>
            <Btn href="/is-lens-safe" variant="ghost" arrow>
              Still skeptical? What we can and can&rsquo;t tell you
            </Btn>
          </div>
          {VIDEO && <VideoBand video={VIDEO} />}
        </div>
      </section>
      <FinalCTA />
    </>
  );
}
