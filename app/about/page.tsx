import type { Metadata } from "next";
import PhotoFrame from "@/components/PhotoFrame";
import PlaceholderPlate from "@/components/PlaceholderPlate";
import ProofBand from "@/components/ProofBand";
import FinalCTA from "@/components/FinalCTA";
import { Btn } from "@/components/Buttons";
import {
  FOUNDER_DISPLAY_NAME,
  STAT_SESSIONS,
  TRAINING_CLAIM,
  verifiedOr,
} from "@/lib/site-config";

// Interpolated, not typed. This was a second hardcoded "140,000+" on the one
// page that also renders the proof band — the same duplication that let the
// practitioner-training card claim a different figure from the band two
// sections below it. The count has one home now: STAT_SESSIONS.
const sessionCount = verifiedOr(STAT_SESSIONS);

export const metadata: Metadata = {
  title: "About",
  // 154 chars. The old one ran to 200 and truncated mid-clause; the brand
  // name led it redundantly, since the title template already carries it.
  description:
    "A team of trained LENS practitioners serving adults, children, and families across Middle Tennessee — one care model, multiple centers" +
    (sessionCount ? `, ${sessionCount} sessions.` : "."),
};

export default function AboutPage() {
  return (
    <>
      <section className="page-hero center">
        <div className="wrap rv">
          <div className="eyebrow">About Harmonized Brain Centers</div>
          <h1>
            Large enough to trust. Personal enough to{" "}
            <em className="sage">care.</em>
          </h1>
          <p className="sub" style={{ maxWidth: "66ch" }}>
            Harmonized Brain Centers is a team of trained LENS practitioners
            serving adults, children, and families across Middle Tennessee
            &mdash; one care model, multiple centers, and well over a hundred
            thousand sessions of experience.
          </p>
        </div>
      </section>

      <ProofBand
        style={{ marginTop: 0, borderTop: 0 }}
        stats={[
          {
            stat: STAT_SESSIONS.value,
            label: "sessions provided",
            todo: STAT_SESSIONS.note,
          },
          {
            stat: "Two centers",
            label: "open today — Franklin coming soon",
          },
          {
            stat: "One standard",
            label: "the same training for every practitioner",
          },
          {
            stat: "Every visit",
            label: "progress reviewed with a structured check-in",
          },
        ]}
      />

      <section className="sec">
        <div className="wrap split">
          <div className="rv">
            <PhotoFrame
              src="/images/session-wide.jpg"
              alt="A wide view of a calm Harmonized session room"
              position="center 40%"
              height={500}
            />
          </div>
          <div className="rv">
            <div className="eyebrow">Why we exist</div>
            <h2>Families deserved a gentle option &mdash; and an honest one.</h2>
            <p>
              Harmonized began with a simple conviction: people struggling with
              focus, sleep, anxiety, and overwhelm deserve a gentle,
              noninvasive option &mdash; and a team that listens before it
              recommends anything.
            </p>
            <p>
              Today that conviction is a care model: the same training, the
              same structured check-ins, the same honest policies at every
              center &mdash; so the experience doesn&rsquo;t depend on which
              door you walk through.
            </p>
            <Btn href="/about/founder" variant="ghost" arrow>
              The founder&rsquo;s story
            </Btn>
          </div>
        </div>
      </section>

      <section className="sec sec-ivory2">
        <div className="wrap">
          <div className="sec-head rv">
            <div className="eyebrow">The Harmonized care model</div>
            <h2>What&rsquo;s identical at every center.</h2>
          </div>
          <div className="care-grid rv">
            <div className="care">
              <h3>Practitioner training</h3>
              <p>{TRAINING_CLAIM}</p>
            </div>
            <div className="care">
              <h3>Structured progress tracking</h3>
              <p>
                A consistent check-in on sleep, mood, focus, and energy opens
                every session &mdash; your plan follows what you report.
              </p>
            </div>
            <div className="care">
              <h3>Care that doesn&rsquo;t rely on memory</h3>
              <p>
                Your plan and progress are documented at every step, so your
                care stays consistent across visits and centers.
              </p>
            </div>
            <div className="care">
              <h3>Responsible communication</h3>
              <p>
                No diagnoses, no promised outcomes, no pressure. If LENS
                isn&rsquo;t the right fit, we say so &mdash; and help you find
                what is.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap split">
          <div className="rv">
            <div className="eyebrow">The team</div>
            <h2>More hands, one standard.</h2>
            <p>
              Harmonized is deliberately built to grow beyond any one person
              &mdash; practitioners across our centers, trained to the same
              standard, supported by the same systems.
            </p>
            <Btn href="/about/team" variant="ghost" arrow>
              Meet the team
            </Btn>
          </div>
          <div
            className="rv"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 22,
            }}
          >
            <PhotoFrame
              src="/images/founder.jpg"
              alt={`${FOUNDER_DISPLAY_NAME}, Founder & Clinical Director`}
              position="center 22%"
              height={300}
              sizes="(max-width: 1060px) 50vw, 25vw"
            />
            <PhotoFrame
              src="/images/practitioner-2.jpg"
              alt="A Harmonized practitioner"
              position="32% 18%"
              height={300}
              sizes="(max-width: 1060px) 50vw, 25vw"
            />
            <PlaceholderPlate
              spec="Practitioner portrait — natural light"
              height={300}
            />
            <PlaceholderPlate
              spec="Practitioner portrait — natural light"
              height={300}
            />
          </div>
        </div>
      </section>

      <FinalCTA />
    </>
  );
}
