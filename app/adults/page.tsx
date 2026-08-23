import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import PhotoFrame from "@/components/PhotoFrame";
import ConcernCard from "@/components/ConcernCard";
import FinalCTA from "@/components/FinalCTA";
import { Btn, TalkCta } from "@/components/Buttons";

export const metadata: Metadata = {
  title: "Neurofeedback for Adults",
  description:
    "Gentle LENS neurofeedback for adults — anxiety and stress, focus, sleep, brain fog, emotional regulation, and resilience. Short sessions, nothing to practice, no homework.",
};

const adultConcerns = [
  {
    title: "Anxiety & stress",
    points: ["On edge with no off-switch", "Racing thoughts at night"],
    href: "/concerns/anxiety",
  },
  {
    title: "Focus & ADHD",
    points: ["Stalling at 90% done", "Overwhelmed by multi-step work"],
    href: "/concerns/focus-adhd",
  },
  {
    title: "Sleep",
    points: ["Can't fall or stay asleep", "Rested is a memory"],
    href: "/concerns/sleep",
  },
  {
    title: "Brain fog & memory",
    points: ["Rereading the same paragraph", "Cognitively spent by 2 p.m."],
    href: "/concerns/brain-fog",
  },
  {
    title: "Emotional regulation",
    points: ["Snapping at people you love", "Staying upset past the moment"],
    href: "/concerns/emotional-regulation",
  },
  {
    title: "Performance & resilience",
    points: ["Rest that doesn't restore", "Wanting more margin, not more hacks"],
    href: "/concerns/stress-resilience",
  },
  // Seventh in a three-column grid, so it fills its own row rather than
  // leaving two empty cells beside it (ConcernCard's `fill`). Last, because it
  // is the one entry here that starts with a medical event rather than with
  // how a week feels.
  {
    title: "Post-concussion symptoms",
    points: ["Cleared, and still not yourself", "Fog that lifts and returns"],
    href: "/concerns/concussion",
    fill: "always" as const,
  },
];

export default function AdultsPage() {
  return (
    <>
      <Breadcrumbs
        trail={[
          { label: "What We Help With", href: "/what-we-help-with" },
          { label: "For adults" },
        ]}
      />
      <section className="page-hero">
        <div className="wrap split" style={{ alignItems: "center" }}>
          <div className="rv">
            <div className="eyebrow">For adults</div>
            <h1>
              Functioning isn&rsquo;t the same as{" "}
              <em className="sage">feeling like yourself.</em>
            </h1>
            <p className="sub">
              You&rsquo;re holding the job, the family, the calendar. And
              you&rsquo;re exhausted, foggy, wired at midnight, or a shorter
              version of yourself than you&rsquo;d like to be. That&rsquo;s
              what we work on.
            </p>
            <div className="hero-ctas" style={{ marginTop: 34 }}>
              <TalkCta />
            </div>
          </div>
          <div className="rv">
            <PhotoFrame
              src="/images/ear-clip-adult.jpg"
              alt="An adult client during a comfortable LENS session"
              position="center 40%"
              height={460}
            />
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="sec-head rv">
            <div className="eyebrow">Where adults start</div>
            <h2>The six concerns adults bring us most.</h2>
          </div>
          <div className="concern-grid rv">
            {adultConcerns.map((c) => (
              <ConcernCard key={c.title} {...c} />
            ))}
          </div>
        </div>
      </section>

      <section className="sec sec-ivory2">
        <div className="wrap split">
          <div className="rv">
            <PhotoFrame
              src="/images/recline.jpg"
              alt="A client reclining comfortably during a session"
              position="center 55%"
              height={480}
            />
          </div>
          <div className="rv">
            <div className="eyebrow">Built for full calendars</div>
            <h2>Short sessions. Nothing to practice. No homework.</h2>
            <p>
              Visits fit inside a lunch break, there&rsquo;s nothing to master
              between sessions, and your progress review takes minutes &mdash;
              because we&rsquo;ve been tracking it all along.
            </p>
            <Btn href="/first-visit" variant="ghost" arrow>
              What the first visit looks like
            </Btn>
          </div>
        </div>
      </section>

      <FinalCTA />
    </>
  );
}
