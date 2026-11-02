import Breadcrumbs from "@/components/Breadcrumbs";
import PhotoFrame from "@/components/PhotoFrame";
import FinalCTA from "@/components/FinalCTA";
import BrandName from "@/components/BrandName";
import PageSchema from "@/components/PageSchema";
import { TalkCta } from "@/components/Buttons";
import { founderRef, founderSchema } from "@/lib/schema";
import {
  BRAIN_MAP_NAME,
  BRAIN_MAP_POINTS,
  ESTABLISHED_YEAR,
  FOUNDER_DISPLAY_NAME,
  FOUNDER_FIRST_NAME,
  PHYSICIAN_REFERRALS,
  PROOF_LINE,
  STAT_SESSIONS,
  TRAINING_CLAIM,
} from "@/lib/site-config";

/**
 * The founder page, rewritten (Ben, 2026-11-02) — Sheri's story, plainly,
 * from facts already published on this site and nothing else: FOUNDER_BIO
 * (the Colorado origin, Tennessee, the Nashville schedule), ESTABLISHED_YEAR,
 * the care model copy on /about, TRAINING_CLAIM, PHYSICIAN_REFERRALS, the
 * concierge fact, the homepage's line about the Harmonized Method, and the
 * proof line. No new quotes: FOUNDER_QUOTE is still unverified and is not
 * here.
 *
 * One body, two routes. While FOUNDER_PAGE_PUBLISHED (lib/site-config.ts)
 * is false it renders at /about/founder/draft only — noindex, disallowed,
 * off the sitemap, linked from nowhere, excluded from GA — for Sheri to
 * read. Flip the switch and /about/founder renders it instead, with the
 * draft URL redirecting there. `draft` only changes the path the schema
 * and breadcrumb are built for; the words are the same.
 */
export default function FounderStory({ draft = false }: { draft?: boolean }) {
  const path = draft ? "/about/founder/draft" : "/about/founder";
  const trail = [{ label: "About", href: "/about" }, { label: "Our founder" }];
  return (
    <>
      {/* The schema is the same Person node the live page emits. The draft
          emits none: it is noindexed and off lib/pages.ts, so nothing
          structured describes a URL nobody should keep. */}
      {!draft && (
        <PageSchema path={path} breadcrumb={trail} mainEntity={founderRef()} nodes={[founderSchema()]} />
      )}
      <Breadcrumbs trail={trail} />
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
            <div className="hero-ctas" style={{ marginTop: 30 }}>
              <TalkCta />
            </div>
            <p className="micro founder-proof">{PROOF_LINE}</p>
          </div>
          <div className="rv">
            <PhotoFrame
              src="/images/founder.jpg"
              alt={`${FOUNDER_DISPLAY_NAME}, Founder & Clinical Director of Harmonized Brain Centers`}
              position="center 20%"
              height={480}
              priority
            />
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap article rv">
          <div className="eyebrow">How it started</div>
          <h2 style={{ margin: "22px 0 18px" }}>
            LENS came into {FOUNDER_FIRST_NAME}&rsquo;s life through family.
          </h2>
          <p className="lede">
            Her brother and sister-in-law opened a LENS practice in Colorado
            after her nephew&rsquo;s brain injury. She saw what the work did
            for her own family, trained as a practitioner, and brought it to
            Tennessee.
          </p>
          <p>
            In {ESTABLISHED_YEAR.value} she founded Harmonized Brain Centers on
            a simple conviction: people struggling with focus, sleep, anxiety,
            and overwhelm deserve a gentle, noninvasive option &mdash; and a
            team that listens before it recommends anything.
          </p>
          <p>
            She still keeps a client schedule in Nashville. The question she
            asks at the start of every session &mdash; how are you actually
            feeling? &mdash; is the question every Harmonized practitioner
            asks, because it is where the work begins.
          </p>
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
            <div className="eyebrow">The approach</div>
            <h2>Feedback, not force.</h2>
            <p>
              LENS stands for Low Energy Neurofeedback System. Small sensors
              read the brain&rsquo;s own electrical activity, and the system
              answers with a brief feedback signal far weaker than the one
              from the phone in your pocket. There is nothing to perform, and
              nothing to practice between visits.
            </p>
            <p>
              Every plan starts with {BRAIN_MAP_NAME}: a {BRAIN_MAP_POINTS}-point
              recording of brain activity, walked through with you point by
              point, and a written plan you keep. Your practitioner builds
              that plan using the <BrandName />, our proprietary process,
              built in-house from the ground up and refined over{" "}
              {STAT_SESSIONS.value} LENS sessions.
            </p>
            <p>
              Every session after that opens with a structured check-in on
              sleep, mood, focus, and energy &mdash; your plan follows what
              you report.
            </p>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap article rv">
          <div className="eyebrow">One standard</div>
          <h2 style={{ margin: "22px 0 18px" }}>
            Founder-led doesn&rsquo;t mean founder-only.
          </h2>
          <p>{TRAINING_CLAIM}</p>
          <p>
            {FOUNDER_FIRST_NAME} remains closely involved in practitioner
            training, and the Harmonized care model is designed so every
            client, at every center &mdash; Nashville, Murfreesboro, and
            Franklin when it opens &mdash; gets the same standard she set with
            her first clients. {PHYSICIAN_REFERRALS}
          </p>
          <p>
            For clients who would rather not travel, she is the practitioner
            for every concierge visit, bringing LENS to the home or office.
          </p>
          <p>
            No diagnoses, no promised outcomes, no pressure. If LENS
            isn&rsquo;t the right fit, we say so &mdash; and help you find
            what is.
          </p>
        </div>
      </section>

      <FinalCTA
        heading="Start with a conversation."
        sub="Tell us what’s going on. We’ll listen, answer honestly, and tell you plainly whether LENS is a fit — on the phone, before you book anything."
      />
    </>
  );
}
