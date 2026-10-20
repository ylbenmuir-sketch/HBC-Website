import type { Metadata } from "next";
import VideoBand from "@/components/VideoBand";
import { videoForPage } from "@/lib/videos";
import PhotoFrame from "@/components/PhotoFrame";
import ConcernCard from "@/components/ConcernCard";
import Quote from "@/components/Quote";
import ProofBand from "@/components/ProofBand";
import LocationCard from "@/components/LocationCard";
import FinalCTA from "@/components/FinalCTA";
import Breadcrumbs from "@/components/Breadcrumbs";
import PageSchema from "@/components/PageSchema";
import { Btn, BrainMapCta, TalkCta } from "@/components/Buttons";
import { serviceRef, serviceSchema } from "@/lib/schema";
import { locations, hoursSummary } from "@/lib/locations";
import {
  BRAIN_MAP_NAME,
  BRAIN_MAP_POINTS,
  BRAIN_MAP_PRICE,
  COURSE_VARIES_NOTE,
  ESTABLISHED_YEAR,
  EXPERIENCES_DISCLAIMER,
  FIRST_VISIT_DURATION,
  FULL_COURSE,
  INSURANCE_POLICY,
  MAINTENANCE,
  MAINTENANCE_NOTE,
  PACKAGE_NOTE,
  PACKAGE_PRICE,
  PACKAGE_SAVING,
  PACKAGE_SESSIONS,
  SESSION_LENGTH,
  SESSION_PRICE,
  SHOW_DRAFT_CONTENT,
  SHOW_TEAM,
  STAT_SESSIONS,
  TESTIMONIALS,
  TRAINING_CLAIM,
  VERIFIED_TESTIMONIALS,
  verifiedOr,
} from "@/lib/site-config";
import { hubTrail, pageMetadata } from "@/lib/pages";

/**
 * /lens-neurofeedback — the modality page.
 *
 * ## What this page owns, and what it must not take
 *
 * QUERY-TO-PAGE-MAP.md rule 1 is one cluster, one page, and the page this
 * could most easily cannibalize is /how-lens-works. The split, decided before
 * a word was written:
 *
 *  - **Here:** what LENS *is*. Definition, passive-vs-active, the boundary
 *    question, who comes in, what a course costs and involves, where to get
 *    it. Targets `lens therapy`, `what is lens therapy`, `lens neurofeedback`.
 *  - **On `/how-lens-works`:** the *mechanism and the session*.
 *    Read/answer/respond in full, the four sites we come back to, what a visit
 *    feels like from the chair. Targets `how does LENS neurofeedback work`.
 *
 * So §2 compresses the mechanism into three sentences and hands off. The four
 * electrode sites and the four-step session walkthrough are deliberately NOT
 * restaged here — copying them over is how these two pages start competing.
 *
 * ## "LENS therapy" is the query, not a self-description
 *
 * The head term this page is built for is `lens therapy` — the one
 * non-branded query earning clicks in volume on the live site (1,101
 * impressions, 13 clicks in the Oct 2026 three-month pull; see
 * QUERY-TO-PAGE-MAP.md, "Measured, Oct 2026"). The site also answers "Is
 * this therapy or medical treatment?" with "LENS is offered as a wellness
 * service, not medical treatment" (lib/faq.ts — it used to open "Neither",
 * which contradicted the homepage's "Neurofeedback Therapy" title; P1 in
 * SEO-AUDIT-3). Both are true and they are not in tension, as long as the
 * phrase only ever appears as a question the page answers — which is what §4
 * is for. Nothing here describes what Harmonized offers as "LENS therapy," and
 * nothing added later should. This page is also the redirect target for the
 * legacy /what-is-lens/ and /lens-therapy/ URLs, so "LENS therapy" must keep
 * appearing in its body.
 *
 * ## The Brain Map is a recording
 *
 * Never a test, assessment, evaluation, screening, or diagnostic — the terms
 * QUERY-TO-PAGE-MAP.md rules out targeting, and a {BRAIN_MAP_POINTS}-point
 * recording is one careless noun away from reading as one. §6 says "recording"
 * and "map," and that is the whole vocabulary available to it.
 *
 * ## One limitation sentence
 *
 * In the FinalCTA sub, folded into the offer of the call, stated as scope and
 * not as absence — the phase 11d pattern (lib/chat/answer.ts). §4 does not
 * count against it: that section *is* the boundary question rather than a
 * caveat bolted onto an answer, and the count has never applied to those.
 */

// Title, description and the page's content date live in lib/pages.ts.
export const metadata: Metadata = pageMetadata("/lens-neurofeedback");

// Paragraph spacing for the two single-column prose sections (§2 and §4) is
// the shared `.split-prose` class in globals.css — the same 18px `.split p`
// gives, for prose that sits outside a .split.

/**
 * The nine concern pages, focus first.
 *
 * Focus and attention lead because that is the intent this page is built to
 * serve. The eight that follow carry the same card, the same two lines, and
 * the same visual weight, because anxiety, sleep and emotional regulation are
 * as much of the practice — this section is not an ADHD page with appendices.
 *
 * Every line below is lifted from the `recognize` array on the concern it
 * links to (lib/concerns.ts), so the card and the page it opens describe the
 * same thing in the same words.
 */
const concernCards = [
  {
    title: "Focus & ADHD",
    href: "/concerns/focus-adhd",
    points: [
      "Struggling to stay on task — at work or at school",
      "Losing track mid-task, mid-sentence, mid-plan",
    ],
  },
  {
    title: "Anxiety & stress",
    href: "/concerns/anxiety",
    points: [
      "Thoughts that won't quiet down — especially at night",
      "Feeling constantly on edge, braced for something",
    ],
  },
  {
    title: "Sleep",
    href: "/concerns/sleep",
    points: [
      "A mind that won't shut off at night",
      "Waking exhausted no matter how long you slept",
    ],
  },
  {
    title: "Emotional regulation",
    href: "/concerns/emotional-regulation",
    points: ["A short fuse — and a long recovery", "Struggling with transitions"],
  },
  {
    title: "Brain fog & memory",
    href: "/concerns/brain-fog",
    points: ["Thinking that feels slow or cloudy", "Losing words mid-sentence"],
  },
  {
    title: "Stress & resilience",
    href: "/concerns/stress-resilience",
    points: ["Functioning, but close to burnout", "Rest that doesn't restore"],
  },
  {
    title: "Children & school",
    href: "/concerns/children-school",
    points: [
      "A bright kid who can't show what they know",
      "Morning battles and homework standoffs",
    ],
  },
  {
    title: "Trauma-related stress",
    href: "/concerns/trauma",
    points: [
      "Staying vigilant in rooms where nothing is wrong",
      "Startling easily, settling slowly",
    ],
  },
  {
    title: "Post-concussion symptoms",
    href: "/concerns/concussion",
    points: [
      "The fog that lifts and returns",
      "Sleep that never fully recovered",
    ],
    // Nine cards fill this grid's three desktop columns exactly; it only goes
    // ragged once the columns drop to two, so the fill is scoped there.
    fill: "narrow" as const,
  },
];

/** The page's one video, below the fold (lib/videos.ts → `home`). */
const VIDEO = videoForPage("/lens-neurofeedback");

export default function LensNeurofeedbackPage() {
  const establishedYear = verifiedOr(ESTABLISHED_YEAR);
  const sessionCount = verifiedOr(STAT_SESSIONS);
  const quotes = SHOW_DRAFT_CONTENT ? TESTIMONIALS : VERIFIED_TESTIMONIALS;
  const nashville = locations.find((l) => l.slug === "nashville")!;
  const murfreesboro = locations.find((l) => l.slug === "murfreesboro")!;
  const nashvilleHours = hoursSummary(nashville);
  const murfreesboroHours = hoursSummary(murfreesboro);

  const trail = hubTrail("/lens-neurofeedback");
  return (
    <>
      {/* The page is about the Service node, not the Organization — the
          one page on the site whose subject is the thing offered. */}
      <PageSchema
        path="/lens-neurofeedback"
        breadcrumb={trail}
        about={serviceRef()}
        nodes={[serviceSchema({ description: metadata.description! })]}
      />
      <Breadcrumbs trail={trail} />

      <section className="page-hero">
        <div className="wrap split" style={{ alignItems: "center" }}>
          <div className="rv">
            <div className="eyebrow">LENS neurofeedback</div>
            <h1>
              What LENS neurofeedback is, and{" "}
              <em className="sage">who it&rsquo;s for.</em>
            </h1>
            <p className="sub">
              LENS stands for Low Energy Neurofeedback System &mdash; passive,
              brief, and with nothing to practice between visits.
            </p>
            <div className="hero-ctas" style={{ marginTop: 34 }}>
              <TalkCta />
              <BrainMapCta />
            </div>
            <p className="micro">
              Nashville &amp; Murfreesboro
              {establishedYear && <> &middot; Offered here since {establishedYear}</>}
            </p>
          </div>
          <div className="rv">
            <PhotoFrame
              src="/images/mother-daughter-lens-neurofeedback-nashville.jpg"
              alt="A mother and daughter during a LENS neurofeedback session"
              position="center 40%"
              height={480}
            />
          </div>
        </div>
      </section>

      {/* §2 — the definition, and the handoff. Three sentences of mechanism and
          no more: the full read/answer/respond sequence, the four sites and the
          session walkthrough all live on /how-lens-works, and this page links
          there rather than restating them. See the split at the top of this
          file. */}
      <section className="sec">
        <div className="wrap" style={{ maxWidth: 880 }}>
          <div className="sec-head rv">
            <div className="eyebrow">The short version</div>
            <h2>What LENS is.</h2>
          </div>
          <div className="rv split-prose">
            <p>
              <b>The name is literal.</b> Small sensors sit on the scalp and
              read the brain&rsquo;s electrical activity at that spot. Based on
              what it reads, the system returns a brief feedback signal &mdash;
              far weaker than the signal from the phone in your pocket, and
              lasting a fraction of a second. That is the entire exchange.
            </p>
            <p>
              <b>The signal carries no instruction.</b> What follows is your own
              nervous system responding to information about itself, which is
              why there is nothing to concentrate on, nothing to watch, and
              nothing to get right. Most people, including young children, feel
              nothing at all.
            </p>
            <p>
              <b>A session is short.</b> Regular sessions run{" "}
              {SESSION_LENGTH.value} in a comfortable chair. Many clients read
              or simply rest.
            </p>
            <p style={{ marginTop: 26 }}>
              <Btn href="/how-lens-works" variant="ghost" arrow>
                The mechanism in full
              </Btn>
            </p>
          </div>
        </div>
        {VIDEO && (
          <div className="wrap">
            <VideoBand video={VIDEO} />
          </div>
        )}
      </section>

      {/* §3 — the differentiator, drawn entirely by describing LENS.
          Nothing here asserts how any other practice or approach runs its
          sessions — there is no verified basis for it, and the closing
          paragraph turns that into something honest rather than papering over
          it. The full comparison is an article now
          (lib/resources.ts → lens-vs-traditional-neurofeedback, 2026-10-15),
          handed off with the button below rather than restated here as a
          table: one page per question. */}
      <section className="sec sec-ivory2">
        <div className="wrap split">
          <div className="rv">
            <h2>Passive feedback, not active training</h2>
            <p>
              The distinction that matters most in this category is between
              active training and passive feedback. LENS is passive.
            </p>
            <p>
              It is not a screen-based training program to master, not a set of
              exercises, and not a skill you build session over session. You
              are not asked to concentrate, perform, or practice anything
              between visits &mdash; there is nothing to get right, and nothing
              to keep up with at home.
            </p>
            <p>
              What that changes, practically: a session is short, a child does
              not have to sit still and succeed at something, and nobody leaves
              with homework.
            </p>
            <p>
              We don&rsquo;t publish comparisons of how other approaches run in
              practice. That varies by practice and by practitioner, and
              it&rsquo;s a fair question to put to whoever you&rsquo;re
              considering. What we can tell you plainly is what happens here.
            </p>
            <p style={{ marginTop: 26 }}>
              <Btn href="/resources/lens-vs-traditional-neurofeedback" variant="ghost" arrow>
                LENS vs. traditional neurofeedback
              </Btn>
            </p>
          </div>
          <div className="rv">
            <PhotoFrame
              src="/images/lens-device.jpg"
              alt="The LENS equipment used during a session"
              position="center 50%"
              height={460}
            />
          </div>
        </div>
      </section>

      {/* §4 — the boundary question, and the section that lets this page hold
          the `lens therapy` query without ever calling itself therapy. Both
          paragraphs are lib/faq.ts answers 10 and 11 in substance; the second
          carries "we never advise on medication" verbatim, which is also what
          keeps this page from reading anywhere as an alternative to one.

          This section is exempt from the one-limitation-sentence count: it *is*
          the boundary rather than a caveat attached to something else, and the
          phase 11d rule has never applied to those (lib/chat/answer.ts). */}
      <section className="sec">
        <div className="wrap" style={{ maxWidth: 820 }}>
          <div className="sec-head rv">
            <div className="eyebrow">Where LENS sits</div>
            <h2>Is LENS therapy, or medical treatment?</h2>
          </div>
          <div className="rv split-prose">
            <p>
              What we offer is neurofeedback: small sensors read the
              brain&rsquo;s electrical activity and return a brief, very
              low-energy feedback signal, with nothing to perform. LENS is
              offered as a wellness service, not medical treatment. It
              doesn&rsquo;t diagnose or treat medical or psychiatric
              conditions, and it isn&rsquo;t a substitute for care from your
              doctor or therapist.
            </p>
            <p>
              If you&rsquo;re already seeing someone, please keep seeing them.
              LENS is routinely used alongside other care, and we&rsquo;re glad
              to coordinate with providers you already trust. We never advise on
              medication.
            </p>
            {/* A ghost button rather than an inline link: globals.css gives
                anchors a distinguishing colour per context (details.faq .a a,
                .lens-seq p a, .crumb a) and there is no rule covering a link
                inside a `.sub`, so an inline one here would render as plain
                muted text with nothing to mark it clickable. Every other
                handoff on this page is this button, which is also the reason
                not to add a rule for one link. */}
            <p className="sub" style={{ fontSize: 16, marginTop: 22 }}>
              Safety, children, and what a session involves are the questions
              people usually ask next.
            </p>
            <div className="hero-ctas" style={{ marginTop: 26 }}>
              <Btn href="/faq" variant="ghost" arrow>
                Read the FAQ
              </Btn>
              {/* The honest-disclosure page for "is it safe / legit / worth
                  it" — the question this section opens belongs there in
                  full. */}
              <Btn href="/is-lens-safe" variant="ghost" arrow>
                Is LENS safe, legit, or worth it?
              </Btn>
            </div>
          </div>
        </div>
      </section>

      {/* §5 — who comes in. Focus leads; the other seven carry identical cards.
          The sub deliberately claims no ranking among them: lib/faq.ts answer 9
          lists anxiety first, so "focus is the most common" would contradict
          published copy. "Bring many people here" is true of all of them and
          ranks none. */}
      <section className="sec sec-ivory2">
        <div className="wrap">
          <div className="sec-head rv">
            <div className="eyebrow">Who comes to us</div>
            <h2>The reasons people come in.</h2>
            <p className="sub">
              People describe what&rsquo;s in front of them, not a diagnosis
              &mdash; and no diagnosis is needed to start. Focus and attention
              bring many people here; so do anxiety, sleep, and emotional
              regulation.
            </p>
          </div>
          <div className="concern-grid rv">
            {concernCards.map((c) => (
              <ConcernCard key={c.href} {...c} />
            ))}
          </div>
          <div
            className="hero-ctas rv"
            style={{ marginTop: 40, justifyContent: "center" }}
          >
            <Btn href="/adults" variant="ghost" arrow>
              For adults
            </Btn>
            <Btn href="/children-families" variant="ghost" arrow>
              For children &amp; families
            </Btn>
            <Btn href="/what-we-help-with" variant="ghost" arrow>
              All concerns
            </Btn>
          </div>
        </div>
      </section>

      {/* §6 — what a course involves. Every figure interpolates from
          lib/site-config.ts; nothing is typed as a literal. PACKAGE_NOTE rides
          the package price here as it does everywhere it appears, per Ben.

          Step 2 says "recording" and "map," and nothing else. See the Brain Map
          note at the top of this file.

          Steps 4 and 5 are the course and the taper, both confirmed by Ben and
          both read from lib/site-config.ts. They replaced a single step that
          said "it genuinely varies" and stopped — honest, and an answer to
          nothing. The order is deliberate: the wind-down lands before the
          price, because "is this open-ended?" is the question a reader is
          holding while they read what it costs. */}
      <section className="sec">
        <div className="wrap" style={{ maxWidth: 940 }}>
          <div className="sec-head rv">
            <div className="eyebrow">Start to finish</div>
            <h2>What a course of LENS looks like.</h2>
          </div>
          <div
            className="lens-seq rv"
            style={{ borderTop: "1px solid var(--line)" }}
          >
            <div className="row">
              <div className="n">1</div>
              <div>
                <h3>A phone call, free</h3>
                <p>
                  Tell us what&rsquo;s going on &mdash; what you&rsquo;ve tried,
                  and what you&rsquo;re hoping changes. Nothing is booked on
                  that call unless you want it to be.
                </p>
              </div>
            </div>
            <div className="row">
              <div className="n">2</div>
              <div>
                <h3>Your first visit &mdash; {BRAIN_MAP_NAME}</h3>
                <p>
                  Plan for {FIRST_VISIT_DURATION}. It&rsquo;s {BRAIN_MAP_PRICE},
                  and includes the full conversation, a {BRAIN_MAP_POINTS}-point
                  recording of brain activity, your map explained point by
                  point, and a written plan you keep.
                </p>
              </div>
            </div>
            <div className="row">
              <div className="n">3</div>
              <div>
                <h3>Regular sessions</h3>
                <p>
                  They run {SESSION_LENGTH.value}, at {SESSION_PRICE}. You sit
                  comfortably; there is nothing to practice in between.
                </p>
              </div>
            </div>
            <div className="row">
              <div className="n">4</div>
              <div>
                <h3>How many, and for how long</h3>
                <p>
                  A full course is {FULL_COURSE.value.sessions} sessions, then
                  maintenance, and {FULL_COURSE.value.children}.{" "}
                  {COURSE_VARIES_NOTE}
                </p>
              </div>
            </div>
            {/* The taper, as its own step. It is placed here — before the money
                — because the question it answers ("is this open-ended?") is the
                one a reader is holding while they read the next step, and an
                answer that arrives after the price arrives too late. Stated as
                cadence and nothing else: no adjective, no "and many clients
                choose to continue", which is the sentence that would turn a
                wind-down into an upsell. */}
            <div className="row">
              <div className="n">5</div>
              <div>
                <h3>Then it winds down</h3>
                {/* No lead-in verb: the heading already says what this is, and
                    MAINTENANCE.value opens with "weekly sessions taper", so any
                    framing clause here repeated either the heading or the verb.
                    A colon hands straight to the cadence. */}
                <p>
                  From there: {MAINTENANCE.value}. {MAINTENANCE_NOTE}
                </p>
              </div>
            </div>
            <div className="row">
              <div className="n">6</div>
              <div>
                <h3>Paying for it</h3>
                <p>
                  A {PACKAGE_SESSIONS}-session package is {PACKAGE_PRICE} &mdash;{" "}
                  {PACKAGE_SAVING} less than paying per session. {PACKAGE_NOTE}{" "}
                  {INSURANCE_POLICY}
                </p>
              </div>
            </div>
          </div>
          <div className="hero-ctas rv" style={{ marginTop: 40 }}>
            <Btn href="/first-visit" variant="ghost" arrow>
              The first visit, minute by minute
            </Btn>
          </div>
        </div>
      </section>

      {quotes.length > 0 && (
        <section className="sec sec-ivory2">
          <div className="wrap">
            <div className="sec-head rv">
              <div className="eyebrow">In their words</div>
              <h2>What clients report.</h2>
            </div>
            <div className="trio-quotes rv">
              {quotes.map((t) => (
                <Quote
                  key={t.text}
                  theme={t.theme}
                  text={t.text}
                  attribution={
                    t.firstName
                      ? `${t.firstName}${t.lastInitial ? ` ${t.lastInitial}` : ""}`
                      : undefined
                  }
                  place={t.relationship}
                  sample={!t.verified}
                />
              ))}
            </div>
            <p
              className="micro rv"
              style={{ marginTop: 28, textAlign: "center" }}
            >
              {EXPERIENCES_DISCLAIMER}
            </p>
            <div
              className="hero-ctas rv"
              style={{ marginTop: 30, justifyContent: "center" }}
            >
              <Btn href="/stories" variant="ghost" arrow>
                More client stories
              </Btn>
            </div>
          </div>
        </section>
      )}

      {/* §8 — who delivers it. TRAINING_CLAIM verbatim: it names a third party
          (OchsLabs) and a certification period, so it stays exactly as approved
          and is not tightened for rhythm. The proof band carries the session count
          and the year; TRAINING_CLAIM's closing sentence names the count's
          purpose without restating the figure, which is why the two can sit on
          one page without disagreeing. */}
      <section className="sec">
        <div className="wrap split">
          <div className="rv">
            <div className="eyebrow">Who delivers it</div>
            {/* "Certified through", not "trained by": TRAINING_CLAIM says
                practitioners are certified *through* OchsLabs and then
                certified again in-house. "Trained by the people who created
                LENS" implies OchsLabs staff do the training, which the claim
                does not say. The H2 names the OchsLabs half only — the second
                certification is Harmonized's own, and a heading claiming both
                would be the sentence below it, twice. */}
            <h2>Certified through the company that created LENS.</h2>
            <p>{TRAINING_CLAIM}</p>
            <div className="hero-ctas" style={{ marginTop: 30 }}>
              {SHOW_TEAM && (
                <Btn href="/about/team" variant="ghost" arrow>
                  Meet the team
                </Btn>
              )}
              <Btn href="/about" variant="ghost" arrow>
                About Harmonized
              </Btn>
            </div>
          </div>
          <div className="rv">
            <PhotoFrame
              src="/images/practitioner-2.jpg"
              alt="A Harmonized practitioner with a client"
              position="center 40%"
              height={440}
            />
          </div>
        </div>
        {/* Same two stats, and the same wording, the homepage band uses — the
            figures have one home each in lib/site-config.ts and the labels are
            copied rather than reworded so the two bands can't drift. Both ride
            their own gate: an unverified stat drops out of the grid entirely
            rather than rendering an empty cell (see ProofBand). */}
        <ProofBand
          style={{ marginTop: 70 }}
          stats={[
            {
              stat: STAT_SESSIONS.value,
              label: "LENS sessions provided across our centers",
              verified: Boolean(sessionCount),
            },
            {
              stat: `Since ${ESTABLISHED_YEAR.value}`,
              label: "Serving Middle Tennessee families",
              verified: Boolean(establishedYear),
            },
          ]}
        />
      </section>

      <section className="sec sec-ivory2">
        <div className="wrap">
          <div className="sec-head rv">
            <div className="eyebrow">Where to find us</div>
            <h2>LENS neurofeedback in Middle Tennessee.</h2>
            <p className="sub">
              Two open centers, both running the same care model and the same
              training.
            </p>
          </div>
          <div className="loc-grid rv">
            <LocationCard
              location={nashville}
              meta={
                <>
                  <b>Open &mdash; welcoming new clients</b>
                  <br />
                  Serving Davidson County.
                  {nashvilleHours && (
                    <>
                      <br />
                      {nashvilleHours}
                    </>
                  )}
                </>
              }
            />
            <LocationCard
              location={murfreesboro}
              meta={
                <>
                  <b>Open &mdash; welcoming new clients</b>
                  <br />
                  Serving Rutherford County.
                  {murfreesboroHours && (
                    <>
                      <br />
                      {murfreesboroHours}
                    </>
                  )}
                </>
              }
            />
          </div>
          <div
            className="hero-ctas rv"
            style={{ marginTop: 40, justifyContent: "center" }}
          >
            <Btn href="/locations" variant="ghost" arrow>
              All locations
            </Btn>
          </div>
        </div>
      </section>

      {/* The one limitation sentence on this page, folded into the offer of the
          call and stated as scope rather than absence — phase 11d. The band
          itself then carries RISK_REVERSAL, which is why the sub does not also
          promise an honest answer: that would be the same promise twice. */}
      <FinalCTA
        heading="The best way to find out is a conversation."
        sub="How much LENS helps varies from person to person, and it doesn’t replace anything you’re already doing. The call is the place to ask whether it fits your situation."
      />
    </>
  );
}
