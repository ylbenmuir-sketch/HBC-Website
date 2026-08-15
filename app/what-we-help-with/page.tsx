import Link from "next/link";
import type { Metadata } from "next";
import PhotoFrame from "@/components/PhotoFrame";
import FinalCTA from "@/components/FinalCTA";
import { concerns } from "@/lib/concerns";

export const metadata: Metadata = {
  title: "What We Help With",
  description:
    "The concerns that most often bring adults and children to Harmonized Brain Centers — described the way real families describe them. No diagnosis needed.",
};

/** Middle Tennessee photo interlude sits between the 4th and 5th entries, as in the mockup. */
const INTERLUDE_AFTER = 4;

export default function WhatWeHelpWithPage() {
  return (
    <>
      <section className="page-hero">
        <div className="wrap wwh-hero">
          <div className="rv">
            <div className="eyebrow">What we help with</div>
            <h1>
              Start with what you&rsquo;re <em className="sage">living</em>{" "}
              &mdash; not with a label.
            </h1>
            <p className="sub">
              You don&rsquo;t need a diagnosis to be here. These are the
              concerns that most often bring adults and children through our
              doors, described the way real families describe them.
            </p>
          </div>
          <div
            className="rv"
            style={{
              display: "flex",
              border: "1px solid var(--line)",
              borderRadius: 4,
              overflow: "hidden",
              background: "#fff",
            }}
          >
            <Link
              href="/adults"
              style={{
                flex: 1,
                textDecoration: "none",
                padding: "26px 28px",
                borderRight: "1px solid var(--line)",
              }}
            >
              <b
                style={{
                  display: "block",
                  fontFamily: "var(--serif)",
                  fontSize: 22,
                  color: "var(--navy)",
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                For adults
              </b>
              <span style={{ fontSize: 14, color: "var(--slate)" }}>
                Focus, sleep, stress, and feeling like yourself
              </span>
            </Link>
            <Link
              href="/children-families"
              style={{ flex: 1, textDecoration: "none", padding: "26px 28px" }}
            >
              <b
                style={{
                  display: "block",
                  fontFamily: "var(--serif)",
                  fontSize: 22,
                  color: "var(--navy)",
                  fontWeight: 600,
                  marginBottom: 4,
                }}
              >
                For children
              </b>
              <span style={{ fontSize: 14, color: "var(--slate)" }}>
                School, emotions, and calmer days at home
              </span>
            </Link>
          </div>
        </div>
      </section>

      <section className="sec-tight">
        <div className="wrap">
          {concerns.slice(0, INTERLUDE_AFTER).map((c) => (
            <ConcernEntry key={c.slug} {...entryProps(c)} />
          ))}

          <div
            className="rv"
            style={{ padding: "60px 0", borderBottom: "1px solid var(--line)" }}
          >
            <div className="eyebrow" style={{ marginBottom: 32 }}>
              Gentle at every age
            </div>
            <div className="trio-photos">
              <PhotoFrame
                src="/images/child-sensor.jpg"
                alt="A child with a small LENS sensor gently placed"
                position="center 42%"
                height={270}
                sizes="(max-width: 640px) 100vw, 33vw"
              />
              <PhotoFrame
                src="/images/ear-clip-adult.jpg"
                alt="An adult with an ear-clip sensor during a session"
                position="center 40%"
                height={270}
                sizes="(max-width: 640px) 100vw, 33vw"
              />
              <PhotoFrame
                src="/images/ear-clip-senior.jpg"
                alt="A senior client with an ear-clip sensor during a session"
                position="center 45%"
                height={270}
                sizes="(max-width: 640px) 100vw, 33vw"
              />
            </div>
            <figcaption style={{ textAlign: "center" }}>
              The same quiet, comfortable session &mdash; from grade school to
              grandparents
            </figcaption>
          </div>

          {concerns.slice(INTERLUDE_AFTER).map((c) => (
            <ConcernEntry key={c.slug} {...entryProps(c)} />
          ))}
        </div>
      </section>

      <section className="sec sec-ivory2">
        <div className="wrap split">
          <div className="rv">
            <div className="eyebrow">A note on honesty</div>
            <h2>We&rsquo;d rather earn your trust than your booking.</h2>
            <p>
              If what you&rsquo;re navigating isn&rsquo;t a fit for LENS,
              we&rsquo;ll say so in your first conversation &mdash; and point
              you toward what might serve you better. We work alongside
              therapists, physicians, and schools, not in place of them.
            </p>
            <div className="note-sage">
              We don&rsquo;t diagnose conditions or promise outcomes, and every
              person&rsquo;s experience is different. What we do promise:
              honest guidance, gentle sessions, and careful attention to how
              you actually feel.
            </div>
          </div>
          <div className="rv">
            <PhotoFrame
              src="/images/concierge.jpg"
              alt="A Harmonized practitioner in conversation with a client"
              position="center 38%"
              height={500}
            />
          </div>
        </div>
      </section>

      <FinalCTA heading="Not sure which of these is you? That's what the first conversation is for." />
    </>
  );
}

function entryProps(c: (typeof concerns)[number]) {
  return {
    slug: c.slug,
    title: c.title,
    who: c.who,
    recognize: c.overview.recognize,
    approach: c.overview.approach,
  };
}

function ConcernEntry({
  slug,
  title,
  who,
  recognize,
  approach,
}: {
  slug: string;
  title: string;
  who: string;
  recognize: string;
  approach: string;
}) {
  return (
    <div className="entry rv">
      <div>
        <h2>{title}</h2>
        <div className="who">{who}</div>
      </div>
      <div className="colB">
        <h3>You might recognize</h3>
        <p>{recognize}</p>
      </div>
      <div className="colA">
        <h3>How we approach it</h3>
        <p>{approach}</p>
        <Link href={`/concerns/${slug}`}>
          In depth <span className="arrow">→</span>
        </Link>
      </div>
    </div>
  );
}
