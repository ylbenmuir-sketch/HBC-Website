import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import PhotoFrame from "@/components/PhotoFrame";
import FinalCTA from "@/components/FinalCTA";
import { Btn } from "@/components/Buttons";
import ConfirmTag from "@/components/ConfirmTag";
import { FOUNDER_DISPLAY_NAME, SHOW_DRAFT_CONTENT } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Our Founder",
  // Derived so the description carries the surname the moment it verifies —
  // this is the page a search for the founder by name should land on.
  description: `${FOUNDER_DISPLAY_NAME}, Founder & Clinical Director — the clinical standard behind every Harmonized practitioner, and the reason the check-in question is always “how are you actually feeling?”`,
};

export default function FounderPage() {
  return (
    <>
      <Breadcrumbs
        trail={[{ label: "About", href: "/about" }, { label: "Our founder" }]}
      />
      <section className="page-hero">
        <div className="wrap split" style={{ alignItems: "center" }}>
          <div className="rv">
            <div className="eyebrow">Founder &amp; Clinical Director</div>
            <h1>{FOUNDER_DISPLAY_NAME}</h1>
            <p className="sub">
              The clinical standard behind every Harmonized practitioner
              &mdash; and the reason the check-in question is always &ldquo;how
              are you actually feeling?&rdquo;
            </p>
          </div>
          <div className="rv">
            <PhotoFrame
              src="/images/founder.jpg"
              alt={`${FOUNDER_DISPLAY_NAME}, Founder & Clinical Director of Harmonized Brain Centers`}
              position="center 20%"
              height={480}
            />
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap article rv">
          {SHOW_DRAFT_CONTENT ? (
            <>
              <p className="lede">
                [Founder story &mdash; 3&ndash;4 short paragraphs, drafted with
                Sheri: what led her to LENS, the first clients, the conviction
                that became the care model, and why the practice trains others
                rather than staying a solo practice.]
              </p>
              <blockquote>
                &ldquo;The measure of our work isn&rsquo;t a chart. It&rsquo;s
                how you actually feel, week to week.&rdquo;{" "}
                <ConfirmTag>[Founder to approve quote]</ConfirmTag>
              </blockquote>
              <p>
                [Paragraph on training the team: the curriculum, the
                apprenticeship, and what she looks for in a practitioner.]
              </p>
              <p>
                [Paragraph on what&rsquo;s next: Franklin, and bringing the
                same standard to more communities.]
              </p>
            </>
          ) : (
            <p className="lede">
              Sheri founded Harmonized Brain Centers to give Middle Tennessee
              families a gentle, honest option &mdash; and built a team trained
              to the same standard she set with her first clients. Her full
              story is coming to this page soon.
            </p>
          )}
        </div>
      </section>

      <section className="sec sec-ivory2">
        <div className="wrap split">
          <div className="rv">
            <PhotoFrame
              src="/images/sensors-adult.jpg"
              alt="Sensors gently placed during an adult LENS session"
              position="62% 30%"
              height={440}
            />
          </div>
          <div className="rv">
            <div className="eyebrow">Still in the room</div>
            <h2>Founder-led doesn&rsquo;t mean founder-only.</h2>
            <p>
              Sheri still sees clients and remains closely involved in
              practitioner training &mdash; and the Harmonized care model is
              designed so every client, at every center, gets the same
              standard she set.
            </p>
            <Btn href="/about/team" variant="ghost" arrow>
              Meet the whole team
            </Btn>
          </div>
        </div>
      </section>

      <FinalCTA />
    </>
  );
}
