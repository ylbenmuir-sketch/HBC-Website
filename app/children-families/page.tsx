import Link from "next/link";
import type { Metadata } from "next";
import PhotoFrame from "@/components/PhotoFrame";
import PlaceholderPlate from "@/components/PlaceholderPlate";
import FinalCTA from "@/components/FinalCTA";
import { Btn, TalkCta } from "@/components/Buttons";

export const metadata: Metadata = {
  title: "Children & Families",
  description:
    "Gentle LENS neurofeedback for children and families — homework battles, meltdowns, hard transitions, and sensory overwhelm. Nothing a child has to get right, and a parent joins every check-in.",
};

export default function ChildrenFamiliesPage() {
  return (
    <>
      <div className="wrap crumb">
        <Link href="/what-we-help-with">What We Help With</Link> &nbsp;/&nbsp;
        Children &amp; families
      </div>
      <section className="page-hero">
        <div className="wrap split" style={{ alignItems: "center" }}>
          <div className="rv">
            <div className="eyebrow">Children &amp; families</div>
            <h1>
              Your child isn&rsquo;t lazy, broken, or &ldquo;bad at
              school.&rdquo;
            </h1>
            <p className="sub">
              Homework battles, meltdowns, hard transitions, sensory overwhelm
              &mdash; bright kids trying hard and still struggling. We work
              gently, and we work with the whole family.
            </p>
            <div className="hero-ctas" style={{ marginTop: 34 }}>
              <TalkCta />
              <Btn href="/first-visit" variant="ghost" arrow>
                A child&rsquo;s first visit
              </Btn>
            </div>
          </div>
          <div className="rv">
            <PhotoFrame
              src="/images/child-sensor.jpg"
              alt="A child with a small sensor gently placed during a LENS session"
              position="center 42%"
              height={460}
            />
          </div>
        </div>
      </section>

      <section className="sec">
        <div
          className="wrap"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 90 }}
        >
          <div className="rv">
            <div className="eyebrow">What parents are seeing</div>
            <ul
              className="goals-list"
              style={{ columnCount: 1, marginTop: 26 }}
            >
              <li>Homework battles and morning standoffs</li>
              <li>Trouble focusing at school</li>
              <li>Emotional meltdowns and hard transitions</li>
              <li>Sleep struggles</li>
              <li>Sensory overwhelm and low frustration tolerance</li>
              <li>A child who&rsquo;s trying hard — and starting to give up</li>
            </ul>
          </div>
          <div className="rv">
            <div className="eyebrow">Why kids do well here</div>
            <p style={{ margin: "26px 0 18px" }}>
              There is nothing a child has to get right in a LENS session. No
              sitting perfectly still, no concentrating, no being corrected.
              Kids read, draw, or just be kids while the session runs.
            </p>
            <p className="sub" style={{ fontSize: 16 }}>
              A parent joins every check-in, and we track what actually matters
              at home: mornings, homework, sleep &mdash; and how your child
              talks about themselves.
            </p>
            <div className="note-sage" style={{ marginTop: 24 }}>
              We coordinate happily with teachers, therapists, and
              pediatricians. LENS is a wellness service and never replaces
              their care.
            </div>
          </div>
        </div>
      </section>

      <section className="sec sec-ivory2">
        <div className="wrap">
          <div className="sec-head rv">
            <div className="eyebrow">Inside our children&rsquo;s rooms</div>
            <h2>Made for kids &mdash; without feeling childish.</h2>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.4fr 1fr 1fr",
              gap: 26,
            }}
            className="rv"
          >
            <PhotoFrame
              src="/images/child-session.jpg"
              alt="A child at ease during a LENS session"
              position="60% 30%"
              height={320}
              sizes="(max-width: 640px) 100vw, 40vw"
            />
            <PhotoFrame
              src="/images/art-wall.jpg"
              alt="The client drawing wall at the Nashville center"
              position="center 45%"
              height={320}
              sizes="(max-width: 640px) 100vw, 30vw"
            />
            <PlaceholderPlate
              spec="Parent and child in consultation with practitioner — warm, candid"
              height={320}
            />
          </div>
          <figcaption>
            The drawing wall at Nashville &mdash; every piece from a client,
            every piece earned
          </figcaption>
        </div>
      </section>

      <FinalCTA />
    </>
  );
}
