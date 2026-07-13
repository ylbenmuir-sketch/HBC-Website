import type { Metadata } from "next";
import PhotoFrame from "@/components/PhotoFrame";
import FinalCTA from "@/components/FinalCTA";

export const metadata: Metadata = {
  title: "How LENS Works",
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
            Your brain already knows how to settle. LENS gives it a{" "}
            <em className="sage">clearer mirror.</em>
          </h1>
          <p className="sub" style={{ maxWidth: "64ch" }}>
            LENS stands for Low Energy Neurofeedback System. Here&rsquo;s the
            whole idea without the jargon &mdash; and exactly what a session
            feels like from the chair.
          </p>
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
              <span>A brain working harder than it needs to</span>
              <span style={{ color: "var(--sage-deep)" }}>
                The same brain, running more efficiently
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap split">
          <div className="rv">
            <div className="eyebrow">The idea, plainly</div>
            <h2>Feedback, not force.</h2>
            <p>
              Through stress, strain, or simply life, the brain can settle into
              patterns that work against you &mdash; staying on alert when
              nothing&rsquo;s wrong, or fogging over when you need to think.
            </p>
            <p>
              During a session, small sensors read your brain&rsquo;s activity
              in real time, and the system reflects a faint, imperceptible
              signal back &mdash; a mirror the brain can use to notice its own
              stuck patterns.
            </p>
            <p>
              What happens next is up to your brain, not the machine. Given
              clearer information, brains tend to do what they were built to
              do: reorganize, settle, and run more efficiently.
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
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              borderTop: "1px solid var(--line)",
            }}
            className="rv"
          >
            {sessionSteps.map((s, i) => (
              <div
                key={s.eyebrow}
                style={{
                  padding: `40px ${i === 3 ? 0 : 34}px 10px ${i === 0 ? 0 : 34}px`,
                  borderRight: i < 3 ? "1px solid var(--line)" : undefined,
                }}
              >
                <div className="eyebrow" style={{ fontSize: 11 }}>
                  {s.eyebrow}
                </div>
                <h3 style={{ margin: "14px 0 10px" }}>{s.h}</h3>
                <p style={{ fontSize: 15, color: "var(--slate)" }}>{s.p}</p>
              </div>
            ))}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 26,
              marginTop: 70,
            }}
            className="rv"
          >
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

      <section className="sec">
        <div className="wrap">
          <div className="sec-head rv">
            <div className="eyebrow">Setting expectations</div>
            <h2>What LENS is &mdash; and what it isn&rsquo;t.</h2>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              border: "1px solid var(--line)",
              borderRadius: 4,
              overflow: "hidden",
              background: "#fff",
            }}
            className="rv"
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
        </div>
      </section>

      <FinalCTA heading="The best way to understand LENS is to talk with someone who does it every day." />
    </>
  );
}
