import type { Metadata } from "next";
import PhotoFrame from "@/components/PhotoFrame";
import FinalCTA from "@/components/FinalCTA";
import Breadcrumbs from "@/components/Breadcrumbs";
import PageSchema from "@/components/PageSchema";
import ConfirmTag from "@/components/ConfirmTag";
import { Btn, TalkCta } from "@/components/Buttons";
import { hubTrail, pageMetadata } from "@/lib/pages";
import {
  CONCIERGE_BRAIN_MAP,
  CONCIERGE_MINIMUM,
  CONCIERGE_PRACTITIONERS,
  CONCIERGE_PRICE,
  CONCIERGE_TRAVEL_RADIUS,
  SESSION_LENGTH,
  type Verifiable,
  verifiedOr,
} from "@/lib/site-config";

/**
 * /concierge — the premium tier: a LENS practitioner travels to the
 * client's home or business and runs sessions there, for one person or the
 * whole family in the same visit.
 *
 * ## What it owns
 *
 * "mobile neurofeedback", "in-home neurofeedback nashville", "neurofeedback
 * at home" — uncontested queries, and this page is written to take them
 * (title, H1, the "who it's for" cards). It is also where the legacy
 * `/concierge/` URL lands again, instead of the hub.
 *
 * ## The posture
 *
 * Lead with who it is for. It is more expensive than a center visit and
 * the page does not apologise for that: it is priced for the practitioner's
 * time and the travel, and for some households it is the only version of
 * LENS that fits. The page says what a center visit is for too, which is
 * the guide's job, not a discount.
 *
 * ## What it does not know
 *
 * Every number — the price, the travel radius, who travels, whether the
 * Brain Map can happen at home, the minimum booking — is a Verifiable in
 * lib/site-config.ts with an empty value. Draft renders the [CONFIRM] tag
 * where the fact will go; production hides the card. Nothing on the page
 * guesses at any of them: each is sent to the free call.
 *
 * Not in the assistant's index: four of its five facts are unconfirmed and
 * the fifth is a description. A visitor asking "do you come to the house?"
 * gets "I don't have that on the site" until the facts land, which is the
 * honest answer while they haven't.
 */

// Title, description and the page's content date live in lib/pages.ts.
export const metadata: Metadata = pageMetadata("/concierge");

const whoFor = [
  {
    h: "Families with more than one person in care",
    p: "Two kids and a parent, back to back, at the kitchen table — one visit instead of three trips.",
  },
  {
    h: "Someone who can't easily travel",
    p: "Mobility, health, age, or a child for whom the car ride is the hardest part of the appointment.",
  },
  {
    h: "A schedule a center visit doesn't fit",
    p: "The hour you have is the hour you're home. We work inside it.",
  },
  {
    h: "An employer bringing it on-site",
    p: "A practitioner on the premises for a team, on a schedule that fits the workday.",
  },
];

const visitSteps = [
  {
    n: "1",
    h: "The same first call",
    p: "Tell us who the visit is for and where you are. We'll tell you honestly whether concierge is the right fit — or whether a center visit is the simpler option.",
  },
  {
    n: "2",
    h: "A practitioner at your door",
    p: "The same certified practitioners and the same LENS equipment you'd see at a center, set up in whichever room is quietest.",
  },
  {
    n: "3",
    h: "Sessions, one after another",
    p: `Each session runs ${SESSION_LENGTH.value}. For a family, sessions run back to back in the same visit — nobody waits in a car.`,
  },
  {
    n: "4",
    h: "The same check-in",
    p: "Sleep, mood, focus, energy — asked about every visit, so each person's plan follows what they actually report.",
  },
];

/**
 * The five facts, each a Verifiable. A card renders in draft (tag in place
 * of the value) and in production only once confirmed; the closing line
 * under the grid is always true and does not depend on any of them.
 */
const facts: Array<{ h: string; lead: string; fact: Verifiable }> = [
  { h: "What it costs", lead: "Concierge pricing", fact: CONCIERGE_PRICE },
  { h: "How far we travel", lead: "Service area", fact: CONCIERGE_TRAVEL_RADIUS },
  { h: "Who comes to you", lead: "Practitioners", fact: CONCIERGE_PRACTITIONERS },
  { h: "Where the first visit happens", lead: "The Brain Map", fact: CONCIERGE_BRAIN_MAP },
  { h: "Minimum booking", lead: "Minimums", fact: CONCIERGE_MINIMUM },
];

export default function ConciergePage() {
  const trail = hubTrail("/concierge");
  const shown = facts.filter(({ fact }) => verifiedOr(fact) !== null);

  return (
    <>
      <PageSchema path="/concierge" breadcrumb={trail} />
      <Breadcrumbs trail={trail} />

      <section className="page-hero">
        <div className="wrap split" style={{ alignItems: "center" }}>
          <div className="rv">
            <div className="eyebrow">Concierge LENS &middot; In-home &amp; on-site</div>
            <h1>
              Mobile neurofeedback that{" "}
              <em className="sage">comes to you.</em>
            </h1>
            <p className="sub">
              A Harmonized practitioner travels to your home or your business
              and runs LENS sessions there &mdash; for one person, or for the
              whole family in a single visit. The same practitioners, the same
              equipment, the same check-in.
            </p>
            <div className="hero-ctas" style={{ marginTop: 34 }}>
              <TalkCta />
              <Btn href="/locations" variant="ghost" arrow>
                Or visit a center
              </Btn>
            </div>
            <p className="micro">
              Our premium tier &middot; Priced for the practitioner&rsquo;s
              time and the travel
            </p>
          </div>
          <div className="rv">
            <PhotoFrame
              src="/images/concierge.jpg"
              alt="A practitioner bringing LENS equipment to a client's home"
              position="center 38%"
              height={480}
              priority
            />
          </div>
        </div>
      </section>

      {/* Who it's for, first — the page leads with the visitor, not the
          price. The positioning paragraph under the grid is the one place
          the cost is framed, and it frames it rather than excusing it. */}
      <section className="sec">
        <div className="wrap">
          <div className="sec-head rv">
            <div className="eyebrow">Who it&rsquo;s for</div>
            <h2>Built for the households a center visit doesn&rsquo;t fit.</h2>
          </div>
          <div className="care-grid rv">
            {whoFor.map((w) => (
              <div className="care" key={w.h}>
                <h3>{w.h}</h3>
                <p>{w.p}</p>
              </div>
            ))}
          </div>
          <p className="rv" style={{ marginTop: 34, maxWidth: "66ch" }}>
            This is our premium tier. It&rsquo;s priced for the
            practitioner&rsquo;s time and the travel, and for some households
            it&rsquo;s the only version of LENS that actually fits. If a center
            visit works for you, the centers are the simpler option &mdash; and
            we&rsquo;ll say so on the phone.
          </p>
        </div>
      </section>

      <section className="sec sec-ivory2">
        <div className="wrap" style={{ maxWidth: 940 }}>
          <div className="sec-head rv">
            <div className="eyebrow">What a concierge visit looks like</div>
            <h2>The same session. A different front door.</h2>
          </div>
          <div
            className="lens-seq rv"
            style={{ borderTop: "1px solid var(--line)" }}
          >
            {visitSteps.map((s) => (
              <div className="row" key={s.n}>
                <div className="n">{s.n}</div>
                <div>
                  <h3>{s.h}</h3>
                  <p>{s.p}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The details. Each card is a Verifiable: draft shows the tag where
          the value will go, production shows the card only once confirmed.
          The closing line is the one thing here that is true today. */}
      <section className="sec">
        <div className="wrap">
          <div className="sec-head rv">
            <div className="eyebrow">The details</div>
            <h2>What to ask about on the call.</h2>
          </div>
          {shown.length > 0 && (
            <div className="care-grid rv">
              {shown.map(({ h, lead, fact }) => (
                <div className="care" key={h}>
                  <h3>{h}</h3>
                  <p>
                    {fact.verified ? (
                      fact.value
                    ) : (
                      <>
                        {lead}: <ConfirmTag>{fact.note!}</ConfirmTag>
                      </>
                    )}
                  </p>
                </div>
              ))}
            </div>
          )}
          <p className="rv" style={{ marginTop: 34, maxWidth: "66ch" }}>
            Pricing, the travel area, who comes, whether the first visit can
            happen at home, and any minimum booking are quoted on the free call
            &mdash; tell us where you are and who the visit is for. On the
            contact form, choose &ldquo;Concierge / at home&rdquo; as your
            preferred center.
          </p>
          <div className="note-sage rv" style={{ marginTop: 30, maxWidth: "70ch" }}>
            Concierge sessions are LENS &mdash; the same wellness service,
            with the same boundaries. It isn&rsquo;t medical care at home, and
            it never stands in for your doctor, therapist, or school supports.
          </div>
          <div className="hero-ctas rv" style={{ marginTop: 40 }}>
            <Btn href="/lens-neurofeedback" variant="ghost" arrow>
              What LENS is
            </Btn>
            <Btn href="/first-visit" variant="ghost" arrow>
              The first visit, minute by minute
            </Btn>
            <Btn href="/locations" variant="ghost" arrow>
              Our centers
            </Btn>
          </div>
        </div>
      </section>

      <FinalCTA
        heading="Tell us where you are and who the visit is for."
        sub="One conversation to find out whether concierge fits — or whether a center visit is simpler. No commitment either way."
      />
    </>
  );
}
