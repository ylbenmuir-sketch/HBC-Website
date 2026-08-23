import type { Metadata } from "next";
import PhotoFrame from "@/components/PhotoFrame";
import PlaceholderPlate from "@/components/PlaceholderPlate";
import FinalCTA from "@/components/FinalCTA";
import { Btn, BrainMapCta, TalkCta } from "@/components/Buttons";
import { BRAIN_MAP_POINTS, SESSION_LENGTH } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "How LENS Neurofeedback Works",
  description:
    "LENS stands for Low Energy Neurofeedback System. The whole idea without the jargon — and exactly what a session feels like from the chair.",
};

const sessionSteps = [
  {
    eyebrow: "Arrive",
    h: "A real check-in",
    p: "Sleep, mood, focus, energy — how we know what's actually changing for you.",
  },
  {
    eyebrow: "Settle",
    h: "Sensors on, feet up",
    p: "A comfortable chair and a few small sensors. No gel caps, no discomfort.",
  },
  {
    eyebrow: "Session",
    h: "Nothing to do",
    p: "The feedback lasts moments; most people feel nothing. Kids can just be kids.",
  },
  {
    eyebrow: "Before you go",
    h: "Review & adjust",
    p: "Your practitioner fine-tunes the plan; you leave knowing where things stand.",
  },
];

const lensIsNot = [
  "A medical treatment, diagnosis, or cure",
  "Electrical stimulation — it reads far more than it sends",
  "A screen-based training program to master",
  "A guaranteed outcome — every brain responds differently",
  "A replacement for your doctor, therapist, or school supports",
];

export default function HowLensWorksPage() {
  return (
    <>
      <section className="page-hero center">
        <div className="wrap rv">
          <div className="eyebrow">How LENS works</div>
          <h1>
            A gentle signal, a comfortable chair, and{" "}
            <em className="sage">nothing to perform.</em>
          </h1>
          <p className="sub" style={{ maxWidth: "64ch" }}>
            LENS stands for Low Energy Neurofeedback System. Here&rsquo;s the
            whole idea without the jargon &mdash; and exactly what a session
            feels like from the chair.
          </p>
          <div
            className="hero-ctas"
            style={{ marginTop: 34, justifyContent: "center" }}
          >
            <TalkCta />
            <BrainMapCta />
          </div>
          <div style={{ maxWidth: 880, margin: "52px auto 0" }}>
            <svg viewBox="0 0 900 90" fill="none" width="100%" aria-hidden="true">
              <path
                d="M0 48 C14 8, 26 86, 42 42 S 66 2, 84 56 S 112 88, 132 40 S 164 10, 188 52 S 226 74, 258 44 S 310 26, 356 48 S 430 58, 500 46 S 620 42, 720 45 S 840 45.5, 900 45"
                stroke="#5E7360"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path
                d="M0 48 C14 8, 26 86, 42 42 S 66 2, 84 56 S 112 88, 132 40"
                stroke="#A9853F"
                strokeWidth="1.8"
                strokeLinecap="round"
                opacity=".8"
              />
            </svg>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11.5,
                letterSpacing: ".2em",
                textTransform: "uppercase",
                color: "var(--slate)",
                fontWeight: 600,
                marginTop: 12,
              }}
            >
              <span>Brain activity is electrical &mdash; and observable</span>
              <span style={{ color: "var(--sage-deep)" }}>
                The feedback signal is far weaker than everyday signals
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* The mechanism, in the order it happens: read, answer, respond. The
          three lead-ins are the sequence, not three topics — "The sensor reads
          first / Then it answers / The brain does the rest" is what makes the
          middle paragraph's "brief feedback signal" land as an answer to a
          reading rather than as something being done to someone. It replaced
          "What the equipment does / What you experience / What we hope to
          support, honestly", which sorted the same facts by how reassuring
          each one was. Session length interpolates; see SESSION_LENGTH. */}
      <section className="sec">
        <div className="wrap split">
          <div className="rv">
            <h2>How LENS works</h2>
            <p>
              <b>The sensor reads first.</b> Small sensors sit on the scalp and
              read the brain&rsquo;s electrical activity at that spot. Nothing
              goes in &mdash; the system is listening.
            </p>
            <p>
              <b>Then it answers.</b> Based on what it read, the system sends
              back a brief feedback signal, far weaker than the signal from the
              phone in your pocket, lasting a fraction of a second.
              That&rsquo;s the whole thing. It&rsquo;s called low-energy for a
              literal reason.
            </p>
            <p>
              <b>The brain does the rest.</b> The signal carries no
              instruction. What follows is your own nervous system responding
              to information about itself &mdash; which is why there&rsquo;s
              nothing to practice, watch, or concentrate on. Most people,
              including young children, feel nothing at all. Sessions run{" "}
              {SESSION_LENGTH.value} in a comfortable chair.
            </p>
          </div>
          <div className="rv">
            <PhotoFrame
              src="/images/glass-head.jpg"
              alt="A glass model of a head — the brain, seen clearly"
              position="center 40%"
              height={500}
            />
          </div>
        </div>
      </section>

      <section className="sec sec-ivory2">
        <div className="wrap">
          <div className="sec-head rv">
            <div className="eyebrow">A session, start to finish</div>
            <h2>What it feels like from the chair.</h2>
            <p className="sub">Most visits are over in well under an hour.</p>
          </div>
          <div className="steps4 rv">
            {sessionSteps.map((s) => (
              <div key={s.eyebrow}>
                <div className="eyebrow" style={{ fontSize: 11 }}>
                  {s.eyebrow}
                </div>
                <h3 style={{ margin: "14px 0 10px" }}>{s.h}</h3>
                <p style={{ fontSize: 15, color: "var(--slate)" }}>{s.p}</p>
              </div>
            ))}
          </div>
          <div className="trio-photos rv" style={{ marginTop: 70 }}>
            <figure>
              <PhotoFrame
                src="/images/ear-clip.jpg"
                alt="A small ear-clip sensor, gently placed"
                position="center 45%"
                height={280}
                sizes="(max-width: 640px) 100vw, 33vw"
              />
              <figcaption>Small sensors, gently placed</figcaption>
            </figure>
            <figure>
              <PhotoFrame
                src="/images/map-points.jpg"
                alt="A brain map, reviewed point by point"
                position="center 45%"
                height={280}
                sizes="(max-width: 640px) 100vw, 33vw"
              />
              <figcaption>Your map, point by point</figcaption>
            </figure>
            <figure>
              <PhotoFrame
                src="/images/lensware.jpg"
                alt="LENS software reviewed with a client"
                position="center 45%"
                height={280}
                sizes="(max-width: 640px) 100vw, 33vw"
              />
              <figcaption>Reviewed with you, every visit</figcaption>
            </figure>
          </div>
        </div>
      </section>

      {/* Where we look. The grammar of every site paragraph is load-bearing and
          is not to be tightened: each one names a function, then says this is
          where we would LOOK when someone describes something — "this is one of
          the first places we look", "something we'd read here", "someone we'd
          look here for", "this is one we read when". None of them says a site
          causes, indicates, or measures a symptom, and none may be rewritten
          into "T4 explains a short fuse". The closing paragraph is the whole
          point of the section: one site on its own is not read at all.

          It replaced the Pz/F7 pair, which drew the same line the same way but
          did it with two thresholds (below 10 µV, above 35 µV) — a number a
          reader can hold their own map up against, which is the one thing a
          published figure invites. The four sites here carry no values. */}
      <section className="sec">
        <div className="wrap">
          <div className="sec-head rv">
            <h2>Where we look, and why</h2>
            <p className="sub">
              A Brain Map records {BRAIN_MAP_POINTS} points. Four we come back
              to most:
            </p>
          </div>
          <div className="split">
            <div className="rv">
              <p>
                <b>Fp1 &mdash; left frontal.</b> Sustained attention and
                getting started on things. When someone tells us about homework
                that takes three hours, or projects that stall at 90 percent,
                this is one of the first places we look.
              </p>
              <p>
                <b>Fp2 &mdash; right frontal.</b> Impulse control &mdash; the
                pause between wanting to do something and doing it. Parents
                describing a child who blurts, interrupts, or acts before
                thinking are describing something we&rsquo;d read here.
              </p>
              <p>
                <b>T4 &mdash; right temporal.</b> Emotional regulation and
                emotional memory. Someone with a short fuse, reactions that
                feel outsized, or a slow recovery after being upset is someone
                we&rsquo;d look here for.
              </p>
              <p>
                <b>Cz &mdash; central midline.</b> Sensory sensitivity. This is
                one we read when someone describes being overwhelmed by noise,
                tags, crowds, or transitions.
              </p>
              <p>
                We don&rsquo;t read any of these alone. One site tells you very
                little &mdash; the pattern across all {BRAIN_MAP_POINTS}, set
                against what you told us on the phone, is what your written
                plan is built from.
              </p>
            </div>
            <div className="rv">
              <PlaceholderPlate spec="Brain lobe function diagram" />
            </div>
          </div>
        </div>
      </section>

      <section className="sec sec-tight sec-ivory2">
        <div className="wrap">
          <div className="sec-head rv" style={{ marginBottom: 0 }}>
            <h2>What to expect</h2>
            <p>
              Clients commonly report sleeping more easily, feeling steadier,
              or thinking more clearly over a series of visits. How much
              changes varies from person to person, and we review what
              you&rsquo;re actually noticing at every visit &mdash;
              that&rsquo;s what the plan follows.
            </p>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="sec-head rv">
            <div className="eyebrow">Setting expectations</div>
            <h2>What LENS is &mdash; and what it isn&rsquo;t.</h2>
          </div>
          <div
            className="half-row rv"
            style={{
              border: "1px solid var(--line)",
              borderRadius: 4,
              overflow: "hidden",
              background: "#fff",
            }}
          >
            <div
              style={{
                padding: "52px 54px",
                borderRight: "1px solid var(--line)",
              }}
            >
              <h3
                style={{
                  fontFamily: "var(--sans)",
                  fontSize: 14,
                  letterSpacing: ".2em",
                  textTransform: "uppercase",
                  color: "var(--sage-deep)",
                  marginBottom: 24,
                }}
              >
                LENS is
              </h3>
              <ul className="goals-list" style={{ columnCount: 1 }}>
                <li>Gentle and noninvasive — nothing enters the body</li>
                <li>Passive — no concentrating or performing</li>
                <li>Brief — sessions fit real, busy lives</li>
                <li>Personalized from your check-ins, every visit</li>
                <li>A wellness service alongside the care you trust</li>
              </ul>
            </div>
            <div style={{ padding: "52px 54px", background: "var(--navy)" }}>
              <h3
                style={{
                  fontFamily: "var(--sans)",
                  fontSize: 14,
                  letterSpacing: ".2em",
                  textTransform: "uppercase",
                  color: "var(--sage)",
                  marginBottom: 24,
                }}
              >
                LENS is not
              </h3>
              <ul style={{ listStyle: "none" }}>
                {lensIsNot.map((item, i) => (
                  <li
                    key={item}
                    style={{
                      padding: "13px 0 13px 28px",
                      position: "relative",
                      color: "rgba(251,248,241,.85)",
                      borderBottom:
                        i < lensIsNot.length - 1
                          ? "1px solid rgba(251,248,241,.12)"
                          : undefined,
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        left: 0,
                        top: 24,
                        width: 14,
                        height: 1.5,
                        background: "var(--gold)",
                      }}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {/* Fourteen inbound contextual links, more than any page on the site
              except /what-we-help-with and /contact, and one outbound — a
              near-terminal node forwarding almost nothing (SEO-AUDIT-2.md §4).
              Three handoffs in the site's ghost-button vocabulary, with the
              labels it already gives these destinations elsewhere. */}
          <div className="hero-ctas rv" style={{ marginTop: 44 }}>
            <Btn href="/lens-neurofeedback" variant="ghost" arrow>
              What LENS is
            </Btn>
            <Btn href="/first-visit" variant="ghost" arrow>
              Your first visit
            </Btn>
            <Btn href="/faq" variant="ghost" arrow>
              The full FAQ
            </Btn>
          </div>
        </div>
      </section>

      <FinalCTA heading="The best way to understand LENS is to talk with someone who does it every day." />
    </>
  );
}
