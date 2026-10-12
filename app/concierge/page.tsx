import type { Metadata } from "next";
import PhotoFrame from "@/components/PhotoFrame";
import FinalCTA from "@/components/FinalCTA";
import Breadcrumbs from "@/components/Breadcrumbs";
import PageSchema from "@/components/PageSchema";
import ConfirmTag from "@/components/ConfirmTag";
import { Btn, TalkCta } from "@/components/Buttons";
import { hubTrail, pageMetadata } from "@/lib/pages";
import {
  BRAIN_MAP_NAME,
  BRAIN_MAP_PRICE,
  CONCIERGE_BRAIN_MAP,
  CONCIERGE_MINIMUM,
  CONCIERGE_PACKAGE,
  CONCIERGE_PRACTITIONERS,
  CONCIERGE_PRICE,
  CONCIERGE_TRAVEL_RADIUS,
  FOUNDER_DISPLAY_NAME,
  SESSION_LENGTH,
  SESSION_PRICE,
  type Verifiable,
  usd,
  verifiedOr,
} from "@/lib/site-config";

/**
 * /concierge — the premium tier: the founder travels to the client's home
 * or business and runs LENS there, for one person or the whole family in
 * the same visit.
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
 * Lead with who it is for. The prices are published plainly — never
 * "contact us for pricing" — and the family math is the strongest thing on
 * the page, so it is worked out for the visitor rather than left as
 * arithmetic. The surcharge is framed as what it is: a modest amount for
 * the founder coming to you, not a luxury-tier markup. The page says what a
 * center visit is for too, which is the guide's job, not a discount.
 *
 * ## Every number is derived
 *
 * CONCIERGE_PRICE in lib/site-config.ts is the center rates plus the
 * surcharge, computed from the same numbers the rest of the site prints, so
 * nothing here can disagree with /first-visit. The family rows multiply
 * those. The one open fact — whether the package applies — is a Verifiable
 * with an empty value, and the page says nothing about the package in
 * either direction until it is answered.
 *
 * Not in the assistant's index yet: the concierge rates are a second price
 * list, and adding one to the corpus wants its own before/after sweep
 * against the pricing passages (policy:pricing, faq:12) before it ships.
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
    h: "The founder at your door",
    p: `${CONCIERGE_PRACTITIONERS.value} The same LENS equipment you'd see at a center, set up in whichever room is quietest.`,
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
 * The four non-price facts, each a Verifiable. A verified fact renders its
 * value; an unverified one renders its tag in draft and nothing in
 * production. The package question is the unverified one today.
 */
const facts: Array<{ h: string; lead: string; fact: Verifiable }> = [
  { h: "How far we travel", lead: "Service area", fact: CONCIERGE_TRAVEL_RADIUS },
  { h: "Who comes to you", lead: "Practitioner", fact: CONCIERGE_PRACTITIONERS },
  { h: "Where the first visit happens", lead: "The Brain Map", fact: CONCIERGE_BRAIN_MAP },
  { h: "Minimum booking", lead: "Minimums", fact: CONCIERGE_MINIMUM },
  { h: "The 12-session package", lead: "Package", fact: CONCIERGE_PACKAGE },
];

/** Household sizes for the worked example. Totals multiply the per-person rates. */
const HOUSEHOLDS = [
  { n: 1, label: "One person" },
  { n: 2, label: "Two of you" },
  { n: 3, label: "A family of three" },
  { n: 4, label: "A family of four" },
];

export default function ConciergePage() {
  const trail = hubTrail("/concierge");
  const price = CONCIERGE_PRICE.value;
  const surcharge = usd(price.surchargeUsd);
  const firstVisit = usd(price.firstVisitUsd);
  const session = usd(price.sessionUsd);
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
              {FOUNDER_DISPLAY_NAME}, our founder, travels to your home or your
              business and runs LENS sessions there &mdash; for one person, or
              for the whole family in a single visit. The same equipment, the
              same check-in, and our center rates plus {surcharge} per person,
              per session.
            </p>
            <div className="hero-ctas" style={{ marginTop: 34 }}>
              <TalkCta />
              <Btn href="/locations" variant="ghost" arrow>
                Or visit a center
              </Btn>
            </div>
            <p className="micro">
              First visit {firstVisit} per person &middot; Each session after{" "}
              {session} per person &middot; No minimum
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
          price. The paragraph under the grid frames the surcharge once,
          as what it is. */}
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
            This is our premium tier, and the premium is {surcharge} per
            person, per session on top of what the same visit costs at a
            center &mdash; a modest surcharge for the founder&rsquo;s time and
            the drive, not a luxury markup. If a center visit works for you,
            the centers are the simpler option, and we&rsquo;ll say so on the
            phone.
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

      {/* The prices, plainly. Per person first, then the family math worked
          out — a visitor should see what three or four people pay without
          doing arithmetic. Every figure multiplies the derived rates. */}
      <section className="sec">
        <div className="wrap">
          <div className="sec-head rv">
            <div className="eyebrow">What it costs</div>
            <h2>Center rates plus {surcharge} per person, per session.</h2>
            <p className="sub">
              Same price per person whether it&rsquo;s one of you or the whole
              family. No minimum sessions, no minimum people.
            </p>
          </div>
          <div className="care-grid rv">
            <div className="care">
              <h3>First visit &mdash; {firstVisit} per person</h3>
              <p>
                {BRAIN_MAP_NAME} and the full consultation, recorded at your
                home or office. {BRAIN_MAP_PRICE} at a center, plus{" "}
                {surcharge}.
              </p>
            </div>
            <div className="care">
              <h3>Each session after &mdash; {session} per person</h3>
              <p>
                A regular LENS session, {SESSION_LENGTH.value}. {SESSION_PRICE}{" "}
                at a center, plus {surcharge}.
              </p>
            </div>
          </div>

          <div className="sec-head rv" style={{ marginTop: 60 }}>
            <div className="eyebrow">The family math, worked out</div>
            <h2>What one visit costs for everyone in it.</h2>
          </div>
          <div
            className="lens-seq rv"
            style={{ borderTop: "1px solid var(--line)" }}
          >
            {HOUSEHOLDS.map(({ n, label }) => (
              <div className="row" key={n}>
                <div className="n">{n}</div>
                <div>
                  <h3>{label}</h3>
                  <p>
                    First visit {usd(price.firstVisitUsd * n)} &mdash;{" "}
                    {n === 1 ? "one Brain Map and consultation" : `${n} Brain Maps and consultations`}{" "}
                    in one trip. Each session after: {usd(price.sessionUsd * n)}{" "}
                    {n === 1 ? "." : `for all ${n}, back to back.`}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <p className="micro rv" style={{ marginTop: 22 }}>
            The {surcharge} is per person, per session, and that is the whole
            of the difference from a center visit.
          </p>
        </div>
      </section>

      {/* The details. Each card is a Verifiable: a confirmed fact renders its
          value, the open one renders its tag in draft and nothing in
          production. */}
      <section className="sec sec-ivory2">
        <div className="wrap">
          <div className="sec-head rv">
            <div className="eyebrow">The details</div>
            <h2>Where we come, who comes, and what you need to start.</h2>
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
            To start, tell us where you are and who the visit is for. On the
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
