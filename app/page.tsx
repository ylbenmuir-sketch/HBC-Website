import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import PhotoFrame from "@/components/PhotoFrame";
import ProofBand from "@/components/ProofBand";
import ConcernCard from "@/components/ConcernCard";
import ConcernRail from "@/components/ConcernRail";
import Quote from "@/components/Quote";
import LocationCard from "@/components/LocationCard";
import FAQAccordion from "@/components/FAQAccordion";
import FinalCTA from "@/components/FinalCTA";
import GuideCta from "@/components/GuideCta";
import MobileCtaBar from "@/components/MobileCtaBar";
import { Btn, BrainMapCta, TalkCta } from "@/components/Buttons";
import ConfirmTag from "@/components/ConfirmTag";
import { locations } from "@/lib/locations";
import {
  ESTABLISHED_YEAR,
  EXPERIENCES_DISCLAIMER,
  FEATURE_CELEBRITY,
  FOUNDER_DISPLAY_NAME,
  FOUNDER_LAST_NAME,
  FOUNDER_QUOTE,
  FRANKLIN_OPENING,
  REVIEWS,
  SAME_DAY_CALLBACK,
  SAMPLE_QUOTES_NOTE,
  SHOW_DRAFT_CONTENT,
  START_TIMING,
  STAT_SESSIONS,
  TESTIMONIALS,
  TRISHA_APPROVAL_TAG,
  TRISHA_QUOTE,
  TRISHA_VIDEO_URL,
  VERIFIED_TESTIMONIALS,
  verifiedOr,
} from "@/lib/site-config";

export const metadata: Metadata = {
  title: {
    absolute: "You’ve tried everything. Your brain hasn’t — Harmonized Brain Centers",
  },
};

const homeConcerns = [
  {
    title: "Anxiety & nervous-system overload",
    audience: "Adults & children",
    points: [
      "Thoughts that won't quiet down",
      "Feeling constantly on edge",
      "Unable to relax even when life is calm",
    ],
    href: "/concerns/anxiety",
  },
  {
    title: "Focus, ADHD & follow-through",
    audience: "Adults & children",
    points: [
      "Struggling to stay on task",
      "Overwhelmed by multi-step responsibilities",
      "Work or schoolwork that stalls at 90%",
    ],
    href: "/concerns/focus-adhd",
  },
  {
    title: "Sleep difficulties",
    audience: "Adults & children",
    points: [
      "A mind that won't shut off at night",
      "Waking frequently",
      "Eight hours that feel like four",
    ],
    href: "/concerns/sleep",
  },
  {
    title: "Emotional regulation",
    audience: "Often children — and their parents",
    points: [
      "Becoming overwhelmed quickly",
      "Struggling with transitions",
      "Staying upset long after the moment",
    ],
    href: "/concerns/emotional-regulation",
  },
  {
    title: "Brain fog, memory & mental fatigue",
    audience: "Most often adults",
    points: [
      "Thinking that feels slow or cloudy",
      "Losing words mid-sentence",
      "Exhausted by normal responsibilities",
    ],
    href: "/concerns/brain-fog",
  },
  {
    title: "Stress & resilience",
    audience: "Most often adults",
    points: [
      "Functioning, but close to burnout",
      "Unable to recover after hard days",
      "Carrying stress physically",
    ],
    href: "/concerns/stress-resilience",
  },
];

const homeGoals = [
  "Calmer mornings, fewer standoffs",
  "Falling asleep more easily",
  "Greater focus at school or work",
  "Recovering from frustration faster",
  "More patience with the people you love",
  "Feeling more like yourself again",
];

const homeFaqs = [
  {
    q: "Is LENS safe? Does it hurt?",
    a: "LENS is gentle and noninvasive — nothing enters the body, and the feedback signal is far weaker than the everyday signals already around you. Most people, including young children, feel nothing at all during a session.",
  },
  {
    q: "Is this therapy or medical treatment?",
    a: "Neither. We're a wellness practice. LENS doesn't diagnose or treat medical conditions, and it works alongside — never in place of — your doctor, therapist, or school supports.",
  },
  {
    q: "How many sessions will I need?",
    a: "It genuinely varies. We check in on how you're doing at every visit, review progress together, and never ask you to commit to a long program up front.",
  },
];

export default function HomePage() {
  const [nashville, murfreesboro, franklin] = locations;
  const startTiming = verifiedOr(START_TIMING);
  const founderQuote = verifiedOr(FOUNDER_QUOTE);
  const sessionCount = verifiedOr(STAT_SESSIONS);
  const establishedYear = verifiedOr(ESTABLISHED_YEAR);
  const homeQuotes = SHOW_DRAFT_CONTENT ? TESTIMONIALS : VERIFIED_TESTIMONIALS;
  const showStories = homeQuotes.length > 0;
  const showReviewBand = REVIEWS.verified || SHOW_DRAFT_CONTENT;

  return (
    <div className="home">
      <section className="hero wrap">
        <div className="hero-grid">
          <div className="rv hero-copy">
            <div className="eyebrow">
              LENS Neurofeedback &middot; Nashville &amp; Murfreesboro
            </div>
            <h1>
              You&rsquo;ve tried everything.
              <br className="m-only" /> Your brain{" "}
              <em className="sage">hasn&rsquo;t.</em>
            </h1>
            <p className="sub">
              Gentle, drug-free neurofeedback for <b className="kw">anxiety</b>,{" "}
              <b className="kw">focus</b>, <b className="kw">sleep</b>, and{" "}
              <b className="kw">overwhelm</b> &mdash; for adults and kids across
              Middle Tennessee.
              {/* Both numbers are unverified facts, so the whole sentence is
                  gated rather than asserted; it returns once they are signed
                  off in site-config. */}
              {sessionCount && establishedYear && (
                <>
                  {" "}
                  {sessionCount} sessions since {establishedYear}.
                  <ConfirmTag>{STAT_SESSIONS.note!}</ConfirmTag>
                  <ConfirmTag>{ESTABLISHED_YEAR.note!}</ConfirmTag>
                </>
              )}
            </p>
            <div className="hero-ctas">
              <TalkCta />
              <BrainMapCta />
            </div>
            <p className="micro">
              {/* "today" is an operational promise, so it ships only once
                  SAME_DAY_CALLBACK is verified; production falls back to the
                  same sentence without the timeframe. */}
              {verifiedOr(SAME_DAY_CALLBACK) ? (
                <>
                  A real person calls you back today.
                  <ConfirmTag>{SAME_DAY_CALLBACK.note!}</ConfirmTag>
                </>
              ) : (
                <>A real person calls you back.</>
              )}{" "}
              Ask anything &mdash; including the skeptical questions.{" "}
              <Link href="/how-lens-works">See how LENS works &rarr;</Link>
            </p>
          </div>
          <div className="rv hero-media">
            <PhotoFrame
              src="/images/hero.jpg"
              alt="A calm LENS neurofeedback session at Harmonized Brain Centers"
              position="46% 24%"
              positionMobile="48% 18%"
              height={620}
              className="hero-ph"
              sizes="(max-width: 1060px) 100vw, 47vw"
              priority
            />
            <span className="hero-scrim" aria-hidden="true" />
          </div>
        </div>
      </section>

      <ProofBand
        stats={[
          {
            stat: STAT_SESSIONS.value,
            label: "LENS sessions provided across our centers",
            todo: STAT_SESSIONS.note,
            verified: Boolean(sessionCount),
          },
          {
            stat: "Two centers",
            label: "Nashville & Murfreesboro — Franklin coming soon",
          },
          {
            stat: "All ages",
            label: "Adults, teens, and children welcome",
          },
          {
            stat: `Since ${ESTABLISHED_YEAR.value}`,
            label: "Serving Middle Tennessee families",
            todo: ESTABLISHED_YEAR.note,
            verified: Boolean(establishedYear),
          },
        ]}
      />

      {/* Trisha Yearwood band — CONDITIONAL FEATURE. Renders only while
          FEATURE_CELEBRITY is true (draft mode, or the env flag once every
          permission is confirmed — see lib/site-config.ts). Embedding is
          disabled for this video: always a thumbnail linking out, never an
          iframe. The page is designed to feel complete without this band. */}
      {FEATURE_CELEBRITY && (
        <section className="sec-navy celeb-band">
          <div className="wrap celeb-grid">
            <div className="rv celeb-copy">
              <div
                className="eyebrow celeb-eyebrow"
                style={{ color: "var(--sage)" }}
              >
                In her own words
              </div>
              <div className="celeb-name">Trisha Yearwood</div>
              <div className="celeb-role">
                Grammy&reg;-winning artist &middot; on her experience at
                Harmonized
              </div>
              <div className="celeb-quote">&ldquo;{TRISHA_QUOTE}&rdquo;</div>
              <div
                className="celeb-cta"
                style={{
                  marginTop: 24,
                  display: "flex",
                  gap: 22,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <a
                  className="btn btn-invert"
                  style={{ padding: "13px 24px", fontSize: 14.5 }}
                  href={TRISHA_VIDEO_URL}
                  target="_blank"
                  rel="noopener"
                >
                  Watch her story <span className="arrow">→</span>
                </a>
                <span
                  style={{
                    color: "rgba(251,248,241,.5)",
                    fontSize: 13,
                    letterSpacing: ".06em",
                  }}
                >
                  Individual experiences vary &middot;{" "}
                  <ConfirmTag style={{ fontSize: 11 }}>
                    {TRISHA_APPROVAL_TAG}
                  </ConfirmTag>
                </span>
              </div>
            </div>
            <a
              className="celeb-video rv"
              href={TRISHA_VIDEO_URL}
              target="_blank"
              rel="noopener"
              aria-label="Watch Trisha Yearwood's story on YouTube"
            >
              <Image
                src="/images/trisha.jpg"
                alt=""
                fill
                sizes="220px"
                style={{ objectFit: "cover", objectPosition: "center 30%" }}
              />
              <span className="play">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M8 5.5v13l11-6.5-11-6.5z" fill="#1C2B3A" />
                </svg>
              </span>
              <span className="celeb-id m-only">
                <span className="celeb-id-name">Trisha Yearwood</span>
                <span className="celeb-id-role">
                  Grammy&reg;-winning artist &middot; her experience at
                  Harmonized
                </span>
              </span>
            </a>
          </div>
        </section>
      )}

      <section className="sec home-concerns">
        <div className="wrap">
          <div className="sec-head split rv">
            <div>
              <div className="eyebrow">What brings people to us</div>
              <h2>
                If any of this describes your daily life, you&rsquo;re in the
                right place.
              </h2>
            </div>
            <Btn href="/what-we-help-with" variant="ghost" arrow>
              Explore every concern
            </Btn>
          </div>
          <ConcernRail count={homeConcerns.length}>
            {homeConcerns.map((c) => (
              <ConcernCard key={c.href} {...c} />
            ))}
          </ConcernRail>
          <div className="family-row rv">
            <div className="fr-copy">
              <div className="eyebrow" style={{ color: "var(--sage)" }}>
                Children &amp; families
              </div>
              <h3>
                Bright kids who are trying hard &mdash; and still struggling.
              </h3>
              <p>
                Homework battles. Meltdowns over transitions. Teacher emails.
                Sensory overwhelm. A child starting to believe they&rsquo;re
                bad at school. There&rsquo;s nothing your child has to get
                right in a LENS session &mdash; and you&rsquo;re part of every
                check-in.
              </p>
              <Btn href="/children-families" variant="invert">
                How we work with children
              </Btn>
            </div>
            <PhotoFrame
              src="/images/child-session.jpg"
              alt="A child relaxing during a LENS session"
              position="60% 30%"
              positionMobile="68% 24%"
              style={{ minHeight: 340 }}
              sizes="(max-width: 1060px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      {/* Cost of inaction — the one place the site names it. One paragraph by
          design: specific pain with dignity, not stacked pain. */}
      <section className="sec home-stakes">
        <div className="wrap">
          <div className="sec-head rv">
            <div className="eyebrow">Why now</div>
            <h2>Waiting has a cost nobody adds up.</h2>
            <p className="sub">
              Another school year of teacher emails. Another year of 3 a.m.
              ceilings and afternoons that disappear into fog. Most people who
              call us have been managing this for years &mdash; and the thing
              they say most often afterward is that they wish they&rsquo;d
              called sooner.
            </p>
          </div>
          <div className="rv">
            <TalkCta />
          </div>
        </div>
      </section>

      <section className="sec sec-ivory2 home-goals">
        <div className="wrap goals-grid">
          <div className="rv">
            <div className="eyebrow">What could change</div>
            <h2 style={{ margin: "22px 0 18px" }}>
              The goals our clients name most often are small, concrete, and
              worth everything.
            </h2>
            <div className="note-sage">
              These are goals, not guarantees &mdash; every nervous system
              responds differently. Changes are reviewed at every visit, so
              progress is tracked consistently instead of relying on memory
              alone.
            </div>
          </div>
          <div className="rv">
            <ul className="goals-list">
              {homeGoals.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
            <Btn
              href="/what-we-help-with"
              variant="ghost"
              arrow
              style={{ marginTop: 26 }}
            >
              See what clients work toward, by concern
            </Btn>
          </div>
        </div>
      </section>

      <section className="sec home-lens">
        {/* Single column since the four-row sequence moved out; /how-lens-works
            carries it. Constrained so the measure stays readable. */}
        <div className="wrap" style={{ maxWidth: 940 }}>
          <div className="rv">
            <div className="eyebrow">How LENS works</div>
            <h2 style={{ margin: "22px 0 18px" }}>Feedback, not force.</h2>
            <p style={{ marginBottom: 16 }}>
              LENS &mdash; the Low Energy Neurofeedback System &mdash; uses
              small sensors to observe the brain&rsquo;s electrical activity,
              then returns a very low-energy feedback signal, far weaker than
              the everyday signals already around you. You simply sit
              comfortably &mdash; there&rsquo;s nothing to watch, practice, or
              perform.
            </p>
            <p className="sub" style={{ fontSize: 16 }}>
              LENS is a wellness service, not a medical treatment. Nothing is
              promised: your experience is reviewed over time, and your plan
              follows it.
            </p>
            <svg
              className="wave"
              width="360"
              height="44"
              viewBox="0 0 360 44"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M0 24 C10 4, 20 42, 32 21 S 52 2, 66 28 S 92 40, 112 20 S 148 12, 182 24 S 250 28, 300 23 S 340 22.5, 360 23"
                stroke="#5E7360"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
              <path
                d="M0 24 C10 4, 20 42, 32 21 S 52 2, 66 28"
                stroke="#A9853F"
                strokeWidth="1.6"
                strokeLinecap="round"
                opacity=".8"
              />
            </svg>
            <Btn href="/how-lens-works" variant="ghost" arrow>
              The full explanation
            </Btn>
          </div>
        </div>
      </section>

      <section className="sec sec-navy home-journey">
        <div className="wrap">
          <div className="sec-head rv">
            <div className="eyebrow">How it works</div>
            <h2>Three steps. No homework, no screens, nothing to perform.</h2>
          </div>
          {/* Column count follows the steps; the tablet/mobile rules override
              it untouched. Three is the whole plan — see the brief. */}
          <div
            className="journey rv"
            style={{ "--journey-cols": 3 } as CSSProperties}
          >
            {[
              {
                n: "1",
                h: "Talk",
                p: "A free phone call. Tell us what's going on — we'll tell you honestly whether LENS is a fit.",
              },
              {
                n: "2",
                h: "Map",
                p: "Your first visit: a real conversation, a baseline recording of brain activity, and a written plan you keep.",
                link: {
                  href: "/first-visit",
                  label: "See what the first visit is like",
                },
              },
              {
                n: "3",
                h: "Sessions",
                p: "Short, comfortable visits. Sleep, focus, and mood reviewed every time — your plan follows what you actually report.",
              },
            ].map((s) => (
              <div className="jstep" key={s.n}>
                <div className="n">{s.n}</div>
                <h3>{s.h}</h3>
                <p>
                  {s.p}
                  {s.link && (
                    <>
                      {" "}
                      <Link href={s.link.href}>{s.link.label} &rarr;</Link>
                    </>
                  )}
                </p>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: 52,
              display: "flex",
              gap: 26,
              alignItems: "center",
              flexWrap: "wrap",
            }}
            className="rv"
          >
            <TalkCta variant="invert" />
            {startTiming && (
              <span style={{ color: "rgba(251,248,241,.55)", fontSize: 15 }}>
                {startTiming} <ConfirmTag>{START_TIMING.note!}</ConfirmTag>
              </span>
            )}
          </div>
        </div>
      </section>

      {/* The Harmonized care model list moved to /about, which already carried
          a near-identical section. The founder note stays: the quote and the
          route to her story exist nowhere else on the site. Class retained so
          the mobile section order is untouched. */}
      <section className="sec home-care">
        <div className="wrap">
          <div className="founder-note rv">
            <PhotoFrame
              src="/images/founder.jpg"
              alt={`${FOUNDER_DISPLAY_NAME}, Founder & Clinical Director of Harmonized Brain Centers`}
              position="center 22%"
              height={230}
              sizes="200px"
            />
            <div>
              {founderQuote ? (
                <blockquote>
                  &ldquo;{founderQuote}&rdquo;{" "}
                  <ConfirmTag>{FOUNDER_QUOTE.note!}</ConfirmTag>
                </blockquote>
              ) : (
                <blockquote>
                  Harmonized began with one practitioner and a simple promise:
                  honest guidance, and a gentle option for every family.
                </blockquote>
              )}
              <cite>
                {FOUNDER_DISPLAY_NAME}{" "}
                {!FOUNDER_LAST_NAME.verified && (
                  <ConfirmTag>{FOUNDER_LAST_NAME.note!}</ConfirmTag>
                )}{" "}
                &middot; Founder &amp; Clinical Director &middot;{" "}
                <Link href="/about/founder">Her story →</Link>
              </cite>
            </div>
          </div>
        </div>
      </section>

      {showStories && (
        <section className="sec sec-ivory2 home-stories">
          <div className="wrap">
            <div className="sec-head split rv">
              <div>
                <div className="eyebrow">Client stories</div>
                <h2>
                  The changes people mention first are small &mdash; and
                  unmistakable.
                </h2>
              </div>
              <Btn href="/stories" variant="ghost" arrow>
                More client stories
              </Btn>
            </div>
            <div className="quote-grid rv">
              {homeQuotes.slice(0, 2).map((t) => (
                <Quote
                  key={t.text}
                  theme={t.theme}
                  text={t.text}
                  attribution={
                    t.firstName
                      ? `${t.firstName} ${t.lastInitial ?? ""} · ${t.relationship}`
                      : t.relationship
                  }
                  place={t.city}
                  sample={!t.verified}
                />
              ))}
            </div>
            {showReviewBand && (
              <div className="review-band rv">
                <div>
                  <strong>{REVIEWS.value.rating} ★</strong>
                  <span>Google rating across locations</span>
                  <ConfirmTag style={{ display: "block", marginTop: 4 }}>
                    {REVIEWS.note!}
                  </ConfirmTag>
                </div>
                <div>
                  <strong>{REVIEWS.value.count}</strong>
                  <span>From Nashville &amp; Murfreesboro clients</span>
                </div>
                <div>
                  <strong>Video stories</strong>
                  <span>Client interviews, in their own words</span>
                  <ConfirmTag style={{ display: "block", marginTop: 4 }}>
                    Film 2–3 short testimonials
                  </ConfirmTag>
                </div>
              </div>
            )}
            <p className="sample-note">
              {SHOW_DRAFT_CONTENT && VERIFIED_TESTIMONIALS.length === 0
                ? SAMPLE_QUOTES_NOTE
                : EXPERIENCES_DISCLAIMER}
            </p>
          </div>
        </section>
      )}

      <section className="sec home-locations">
        <div className="wrap">
          <div className="sec-head split rv">
            <div>
              <div className="eyebrow">Locations</div>
              <h2>
                One organization. Convenient centers across Middle Tennessee.
              </h2>
            </div>
            <Btn href="/locations" variant="ghost" arrow>
              All locations
            </Btn>
          </div>
          <div className="loc-grid rv">
            <LocationCard
              location={nashville}
              meta={
                <>
                  <b>Open &mdash; welcoming new clients</b>
                  <br />
                  A calm, comfortable center serving Davidson County.
                </>
              }
            />
            <LocationCard
              location={murfreesboro}
              plateSpecOverride="Murfreesboro interior — reception or session room, natural light"
              meta={
                <>
                  <b>Open &mdash; welcoming new clients</b>
                  <br />
                  The same standard of care, closer to home in Rutherford
                  County.
                </>
              }
            />
            <LocationCard
              location={franklin}
              plateSpecOverride="Franklin exterior — storefront at golden hour"
              meta={
                <>
                  <b>
                    Coming soon{" "}
                    <ConfirmTag>{FRANKLIN_OPENING.note!}</ConfirmTag>
                  </b>
                  <br />
                  Join the waitlist for founding-client openings.
                </>
              }
            />
          </div>
        </div>
      </section>

      <section className="sec sec-tight home-faq">
        <div className="wrap" style={{ maxWidth: 900 }}>
          <div className="sec-head rv">
            <div className="eyebrow">Before you call</div>
            <h2>The three questions everyone asks first.</h2>
          </div>
          <FAQAccordion items={homeFaqs} openFirst />
          <Btn href="/faq" variant="ghost" arrow style={{ marginTop: 30 }}>
            All questions, answered plainly
          </Btn>
        </div>
      </section>

      <FinalCTA />
      <GuideCta />
      <MobileCtaBar />
    </div>
  );
}
