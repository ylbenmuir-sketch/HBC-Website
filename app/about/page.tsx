import type { Metadata } from "next";
import PhotoFrame from "@/components/PhotoFrame";
import PlaceholderPlate from "@/components/PlaceholderPlate";
import ProofBand from "@/components/ProofBand";
import FinalCTA from "@/components/FinalCTA";
import { Btn } from "@/components/Buttons";

export const metadata: Metadata = {
  title: "About",
  description:
    "Harmonized Brain Centers is a team of trained LENS practitioners serving adults, children, and families across Middle Tennessee — one care model, multiple centers, and 140,000+ sessions of experience.",
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
            &mdash; one care model, multiple centers, and 140,000+ sessions of
            experience.
          </p>
        </div>
      </section>

      <ProofBand
        style={{ marginTop: 0, borderTop: 0 }}
        stats={[
          { stat: "140,000+", label: "sessions provided" },
          { stat: "3 centers", label: "and growing across the region" },
          {
            stat: "One standard",
            label: "founder-led training for every practitioner",
          },
          {
            stat: "Every visit",
            label: "progress tracked with a structured check-in",
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
              focus, sleep, anxiety, and overwhelm deserve an approach that
              works with the brain&rsquo;s own capacity to regulate &mdash; and
              a team that listens before it recommends anything.
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
              <h4>Practitioner training</h4>
              <p>
                Every practitioner completes the same founder-led LENS
                curriculum and apprenticeship before working independently.
              </p>
            </div>
            <div className="care">
              <h4>Structured progress tracking</h4>
              <p>
                A consistent seven-item check-in for adults and children opens
                every session &mdash; your plan follows your data.
              </p>
            </div>
            <div className="care">
              <h4>Team-based care</h4>
              <p>
                Practitioners review progress together. You&rsquo;re never
                dependent on one person&rsquo;s memory or availability.
              </p>
            </div>
            <div className="care">
              <h4>Responsible communication</h4>
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
              alt="Sheri, Founder & Clinical Director"
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
