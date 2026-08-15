import type { Metadata } from "next";
import PhotoFrame from "@/components/PhotoFrame";
import FinalCTA from "@/components/FinalCTA";
import ConfirmTag from "@/components/ConfirmTag";
import { BrainMapCta, TalkCta } from "@/components/Buttons";
import {
  BRAIN_MAP_NAME,
  BRAIN_MAP_PRICE,
  FIRST_VISIT_DURATION,
  FIRST_VISIT_DURATION_TAG,
  HSA_FSA_TAG,
  SHOW_DRAFT_CONTENT,
} from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Your First Visit",
  description:
    "No clipboard queue, no waiting-room limbo, no surprises. The first visit at Harmonized Brain Centers, minute by minute, for adults and for children.",
};

const fiveParts = [
  {
    n: "1",
    h: "You're greeted by name",
    p: "Someone is expecting you. Coffee, water, a comfortable seat — and a parent stays with a child the whole time.",
  },
  {
    n: "2",
    h: "We talk first",
    p: "What's going on, what you've tried, what you're hoping changes. This is the longest part on purpose.",
  },
  {
    n: "3",
    h: "A gentle baseline recording",
    p: "Small sensors take brief readings at a series of points — nothing invasive, nothing to feel. The recording helps guide the initial conversation and your starting plan.",
  },
  {
    n: "4",
    h: "Your plan, explained plainly",
    p: "What we noticed, what we'd suggest, what it costs, and what we'd track — in plain language, with every question answered.",
  },
  {
    n: "5",
    h: "You decide — without pressure",
    p: "Start that week, think it over, or decide it's not for you. No packages, no countdown offers, no follow-up pestering.",
  },
];

export default function FirstVisitPage() {
  return (
    <>
      <section className="page-hero">
        <div className="wrap split" style={{ alignItems: "center" }}>
          <div className="rv">
            <div className="eyebrow">Your first visit</div>
            <h1>Know exactly what to expect &mdash; before you ever walk in.</h1>
            <p className="sub">
              No clipboard queue, no waiting-room limbo, no surprises.
              Here&rsquo;s the first visit, minute by minute, for adults and
              for children.
            </p>
            <div className="hero-ctas" style={{ marginTop: 34 }}>
              <TalkCta />
              <BrainMapCta />
            </div>
            <p className="micro">
              {SHOW_DRAFT_CONTENT && (
                <>
                  Plan for {FIRST_VISIT_DURATION}{" "}
                  <ConfirmTag>{FIRST_VISIT_DURATION_TAG}</ConfirmTag> &middot;{" "}
                </>
              )}
              Nothing to prepare or bring
            </p>
          </div>
          <div className="rv">
            <PhotoFrame
              src="/images/checkin.jpg"
              alt="A warm check-in conversation at a Harmonized center"
              position="68% 35%"
              height={480}
            />
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap" style={{ maxWidth: 940 }}>
          <div className="sec-head rv">
            <div className="eyebrow">Minute by minute</div>
            <h2>The first appointment, in five parts.</h2>
          </div>
          <div
            className="lens-seq rv"
            style={{ borderTop: "1px solid var(--line)" }}
          >
            {fiveParts.map((s) => (
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

      <section className="sec sec-ivory2">
        <div className="wrap">
          <div className="sec-head rv">
            <div className="eyebrow">Good to know</div>
            <h2>The practical details.</h2>
          </div>
          <div className="care-grid rv">
            <div className="care">
              <h3>What it costs</h3>
              {/* Names what the $150 actually buys, item by item. The "no
                  packages or countdown offers" line from Phase 1 is gone on
                  purpose: part 5 of the five-part list above already says it,
                  and Phase 6 is the rule about saying a thing once. */}
              <p>
                The phone call is free. {BRAIN_MAP_NAME} &mdash; your first
                visit &mdash; is {BRAIN_MAP_PRICE} and includes the full
                conversation, a 21-point recording, your map explained point by
                point, and a written plan you keep. Session pricing is shared
                before you commit to anything.
              </p>
            </div>
            <div className="care">
              <h3>Insurance</h3>
              <p>
                As a wellness service, LENS is typically not covered by
                insurance. Many clients use HSA/FSA funds &mdash; we&rsquo;ll
                give you documentation. <ConfirmTag>{HSA_FSA_TAG}</ConfirmTag>
              </p>
            </div>
            <div className="care">
              <h3>Bringing a child</h3>
              <p>
                A parent joins everything. Kids can bring a book, a tablet, or
                a stuffed animal &mdash; comfort beats stillness here.
              </p>
            </div>
            <div className="care">
              <h3>After you leave</h3>
              <p>
                Most people simply go back to their day. We&rsquo;ll check how
                you slept and felt at the next visit &mdash; that&rsquo;s the
                data that shapes your plan.
              </p>
            </div>
          </div>
        </div>
      </section>

      <FinalCTA
        heading="Still have a question about the first visit? Just ask."
        sub="Call or send a note — a real person will answer it plainly."
      />
    </>
  );
}
