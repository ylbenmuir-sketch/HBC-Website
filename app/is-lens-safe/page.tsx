import type { Metadata } from "next";
import { Fragment } from "react";
import FAQAccordion, { type FaqItem } from "@/components/FAQAccordion";
import FinalCTA from "@/components/FinalCTA";
import Breadcrumbs from "@/components/Breadcrumbs";
import PageSchema from "@/components/PageSchema";
import { Btn } from "@/components/Buttons";
import { faqQuestions } from "@/lib/schema";
import { SITE_FAQS } from "@/lib/faq";
import { LENS_IS_NOT } from "@/lib/lens";
import {
  locationReviewCount,
  locations,
  reviewCountLabel,
} from "@/lib/locations";
import { hubTrail, pageMetadata } from "@/lib/pages";
import {
  ESTABLISHED_YEAR,
  PHYSICIAN_REFERRALS,
  RISK_REVERSAL,
  STAT_SESSIONS,
  TRAINING_CLAIM,
  verifiedOr,
} from "@/lib/site-config";

/**
 * /is-lens-safe — the honest-disclosure page for the skepticism cluster
 * ("is lens therapy legit", "lens neurofeedback side effects", "does
 * neurofeedback work", "can neurofeedback be dangerous" — 489 impressions,
 * position 34, zero clicks in the Oct 2026 pull; QUERY-TO-PAGE-MAP.md).
 *
 * ## The posture, which is the whole page
 *
 * Every competing page answers "is it legit" with claims. This one answers
 * with disclosure: what the signal is, what people report, what this site
 * refuses to say and why, and where the reviews are that we cannot edit.
 * Nothing here is new copy about outcomes. The safety answers are
 * lib/faq.ts verbatim, the reports are the "many clients tell us" register
 * the site already uses, the boundary is stated as policy in our own voice
 * rather than as a legal disclaimer, and the reviews are linked out — never
 * republished, and never emitted as review or rating markup.
 *
 * ## One source, two consumers
 *
 * Each section's prose is held as strings and rendered from them, because
 * the same strings are the FAQPage `mainEntity` on the page node. A section
 * reworded in JSX and not in the schema is the drift the pattern exists to
 * prevent (see the `a`/`rendered` note in components/FAQAccordion.tsx).
 *
 * Not in the assistant's index. The two safety answers are already indexed
 * from lib/faq.ts, and the rest is boundary copy the assistant's own rules
 * (lib/chat/answer.ts) already hold it to; a second copy would compete with
 * the FAQ passages for the words it shares with them.
 */

// Title, description and the page's content date live in lib/pages.ts.
export const metadata: Metadata = pageMetadata("/is-lens-safe");

/** The two safety answers, from lib/faq.ts, unchanged. */
const SAFETY_QUESTIONS = ["Is it safe?", "Does it hurt?"];
const safetyFaqs: FaqItem[] = SITE_FAQS.filter((f) =>
  SAFETY_QUESTIONS.includes(f.q)
);

/**
 * What people report. Reports, never outcomes: every sentence is one the
 * site already publishes about what a visit is like, in the same words.
 */
const REPORTS = [
  "During a session, most people — including young children — feel nothing at all. Many clients tell us it's one of the calmest hours of their week: a quiet room, a comfortable chair, nothing to do or perform.",
  "Afterward, most people simply go back to their day. We ask how you slept and felt at the next visit — that's the data that shapes your plan.",
  "Over a series of visits, clients commonly report sleeping more easily, feeling steadier, or thinking more clearly. How much changes varies from person to person, and we review what you're actually noticing at every visit.",
  "What we won't do is turn those check-in notes into a side-effects list or a success rate. If you want to know what clients have told us after a session, ask on the free call — a practitioner will answer from the check-ins, not from a brochure.",
];

/**
 * The boundary, stated as policy. Each line is something a page built to
 * rank for "is it legit" would normally claim, and the reason we don't.
 */
const REFUSALS = [
  {
    wont: "We don't say LENS treats, cures, or prevents anything.",
    why: "Harmonized is a wellness practice, not a medical clinic, and the sentence in the footer isn't decoration — it's the scope of what we do.",
  },
  {
    wont: "We don't predict how it would go for you.",
    why: "Every nervous system responds differently. A prediction we can't stand behind is worth nothing to you, and worth less to a skeptic.",
  },
  {
    wont: "We don't publish success rates.",
    why: "Check-in notes aren't a study. Dressing them up as one would be the first dishonest thing on this site.",
  },
  {
    wont: "We don't position LENS as an alternative to medication or to therapy.",
    why: "It runs alongside the care you already have, and we never advise on medication — that stays between you and your prescriber.",
  },
  {
    wont: "We don't compare ourselves to other practices on whether it works.",
    why: "We'll tell you plainly what happens here. What happens elsewhere is a fair question to put to them.",
  },
];

/** The plain-text answer the schema carries for the section above. */
const REFUSALS_TEXT =
  "We won't answer that with a claim. " +
  REFUSALS.map((r) => `${r.wont} ${r.why}`).join(" ");

export default function IsLensSafePage() {
  const trail = hubTrail("/is-lens-safe");
  const establishedYear = verifiedOr(ESTABLISHED_YEAR);
  const sessionCount = verifiedOr(STAT_SESSIONS);
  const listings = locations.filter((l) => l.reviewReadUrl);

  /**
   * What a skeptic can check without taking our word for it. The two gated
   * figures drop their line rather than the paragraph when unverified.
   */
  const CHECKABLE = [
    TRAINING_CLAIM,
    PHYSICIAN_REFERRALS,
    establishedYear ? `Harmonized has served Middle Tennessee since ${establishedYear}.` : null,
    sessionCount ? `${sessionCount} LENS sessions have been provided across our centers.` : null,
    "Every review of Harmonized is public on Google, one listing per center, and none of it is republished here.",
  ].filter((s): s is string => Boolean(s));

  const reviewLines = listings.map((l) => {
    const count = locationReviewCount(l);
    return {
      slug: l.slug,
      href: l.reviewReadUrl!,
      label: count ? `${l.name} — ${reviewCountLabel(count)} on Google` : `${l.name} reviews on Google`,
    };
  });
  const REVIEWS_TEXT =
    "Every review of Harmonized is public on Google — one listing for each open center. We don't republish them on this site, so what you read there is exactly what Google shows everyone. " +
    reviewLines.map((r) => `${r.label}.`).join(" ");

  const WORTH_IT_TEXT = `That's exactly what the free call is for. Bring the skeptical questions. ${RISK_REVERSAL}`;

  /**
   * The page's own questions, as FAQPage mainEntity alongside the two reused
   * safety answers. No ratings, no review text — the review answer names the
   * listings and nothing from them.
   */
  const pageFaqs: FaqItem[] = [
    { q: "What does a LENS session feel like — during, and after?", a: REPORTS.join(" ") },
    { q: "Does LENS work?", a: REFUSALS_TEXT },
    { q: "Is LENS legit? What can I actually check?", a: CHECKABLE.join(" ") },
    { q: "Where are the reviews?", a: REVIEWS_TEXT },
    { q: "Is LENS worth it?", a: WORTH_IT_TEXT },
  ];

  return (
    <>
      {/* FAQPage node (lib/pages.ts types it) with the seven visible
          questions as mainEntity. No AggregateRating, no Review — see
          REVIEWS in lib/site-config.ts for why that stays true sitewide. */}
      <PageSchema
        path="/is-lens-safe"
        breadcrumb={trail}
        mainEntity={faqQuestions([...safetyFaqs, ...pageFaqs])}
      />
      <Breadcrumbs trail={trail} />

      <section className="page-hero center">
        <div className="wrap rv">
          <div className="eyebrow">Is it safe? Is it legit?</div>
          <h1 style={{ maxWidth: "20ch", margin: "0 auto" }}>
            Is LENS neurofeedback safe, legit, or worth it?{" "}
            <em className="sage">What we can and can&rsquo;t tell you.</em>
          </h1>
          <p className="sub" style={{ maxWidth: "60ch", margin: "24px auto 0" }}>
            Skeptical is a reasonable place to start. This is the honest
            version: what the signal is, what people say a session feels like,
            what this site refuses to claim, and where to read reviews we
            can&rsquo;t edit.
          </p>
        </div>
      </section>

      {/* 1. The signal — the two safety answers from /faq, unchanged, under
          the one line from the limits list that answers the question people
          are actually asking. */}
      <section className="sec">
        <div className="wrap" style={{ maxWidth: 900 }}>
          <div className="sec-head rv">
            <div className="eyebrow">What the signal is</div>
            <h2>Is LENS neurofeedback safe? What is the signal, and what isn&rsquo;t it?</h2>
            <p className="sub">
              The question underneath &ldquo;is it safe&rdquo; is usually
              &ldquo;what is it actually doing to my head.&rdquo; Not{" "}
              {LENS_IS_NOT[1].toLowerCase()}. The rest, in the words the FAQ
              uses:
            </p>
          </div>
          <FAQAccordion items={safetyFaqs} openFirst />
        </div>
      </section>

      {/* 2. What people report — the "many clients tell us" register. */}
      <section className="sec sec-ivory2">
        <div className="wrap" style={{ maxWidth: 880 }}>
          <div className="sec-head rv">
            <div className="eyebrow">What people report</div>
            <h2>What does a LENS session feel like &mdash; during, and after?</h2>
          </div>
          <div className="rv split-prose">
            {REPORTS.map((p) => (
              <p key={p}>{p}</p>
            ))}
            <p className="micro">
              Reports from check-ins, not outcomes. Individual experiences
              vary.
            </p>
          </div>
        </div>
      </section>

      {/* 3. The boundary, as policy. Styled up, not down: a wont/why list in
          the site's own voice, not a note-sage panel at the foot. */}
      <section className="sec">
        <div className="wrap" style={{ maxWidth: 900 }}>
          <div className="sec-head rv">
            <div className="eyebrow">Does it work?</div>
            <h2>
              Does LENS work? Here&rsquo;s what this site refuses to claim,
              and why.
            </h2>
            <p className="sub">
              Most pages built to answer &ldquo;is LENS legit&rdquo; answer
              with claims. This one answers with what we won&rsquo;t say.
              That&rsquo;s a policy, not a legal disclaimer, and it runs
              through every page here.
            </p>
          </div>
          <div
            className="lens-seq rv"
            style={{ borderTop: "1px solid var(--line)" }}
          >
            {REFUSALS.map((r, i) => (
              <div className="row" key={r.wont}>
                <div className="n">{i + 1}</div>
                <div>
                  <h3>{r.wont}</h3>
                  <p>{r.why}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3b. The "legit" half: what a skeptic can check without taking our
          word for it. Every line is approved copy or a gated figure. */}
      <section className="sec sec-ivory2">
        <div className="wrap" style={{ maxWidth: 880 }}>
          <div className="sec-head rv">
            <div className="eyebrow">Is it legit?</div>
            <h2>Is LENS legit? What can I actually check?</h2>
          </div>
          <ul className="goals-list rv" style={{ columnCount: 1 }}>
            {CHECKABLE.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* 4. The reviews, linked out. Never republished, never marked up.
          Same `rel="noopener"` and deliberate lack of `noreferrer` as the
          location pages — the referrer tells the Business Profile this
          traffic came from the site. */}
      <section className="sec">
        <div className="wrap" style={{ maxWidth: 880 }}>
          <div className="sec-head rv">
            <div className="eyebrow">The reviews</div>
            <h2>Where are the reviews?</h2>
            <p className="sub">
              Every review of Harmonized is public on Google &mdash; one
              listing for each open center. We don&rsquo;t republish them on
              this site, so what you read there is exactly what Google shows
              everyone.
            </p>
          </div>
          <p className="rv review-out">
            {reviewLines.map((r, i) => (
              <Fragment key={r.slug}>
                {i > 0 && " · "}
                <a href={r.href} target="_blank" rel="noopener">
                  {r.label} &rarr;
                </a>
              </Fragment>
            ))}
          </p>
          <div className="hero-ctas rv" style={{ marginTop: 40 }}>
            <Btn href="/stories" variant="ghost" arrow>
              Client stories, in their words
            </Btn>
            <Btn href="/lens-neurofeedback" variant="ghost" arrow>
              What LENS is
            </Btn>
            <Btn href="/faq" variant="ghost" arrow>
              The full FAQ
            </Btn>
          </div>
        </div>
      </section>

      {/* 5. The call is where the skeptical questions go. The band prints
          RISK_REVERSAL on its own line, which completes WORTH_IT_TEXT. */}
      <FinalCTA
        heading="Is LENS worth it? Bring that question to the call."
        sub="That's exactly what the free call is for. Bring the skeptical questions."
      />
    </>
  );
}
