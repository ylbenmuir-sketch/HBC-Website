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
import {
  locations,
  combinedReviewCount,
  hoursSummary,
  reviewCountLabel,
} from "@/lib/locations";
import {
  BRAIN_MAP_CLAIM,
  COURSE_VARIES_NOTE,
  ESTABLISHED_YEAR,
  EXPERIENCES_DISCLAIMER,
  FEATURE_CELEBRITY,
  FOUNDER_DISPLAY_NAME,
  FOUNDER_LAST_NAME,
  FOUNDER_QUOTE,
  FRANKLIN_OPENING,
  FULL_COURSE,
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
  // Category + geography first. The old title stacked "anxiety, focus, sleep"
  // — the exact three keywords its own concern spokes target — while carrying
  // neither "neurofeedback" nor a place name, so no page on the site targeted
  // "neurofeedback nashville". The homepage takes the geo+category query; the
  // concern pages keep the symptom queries.
  //
  // `absolute` because the brand is not appended: the title is already long,
  // and og:site_name carries the brand in link previews. The H1 is unchanged
  // — it's a conversion asset, and it isn't the title's job to match it.
  //
  // og:title and twitter:title are derived from this by Next, so they follow
  // automatically — don't restate them here.
  // 53 characters. It was 75 — past the ~580px Google renders, so the tail
  // ("Focus & Sleep") was being cut off in the result anyway. What survives is
  // what the homepage is actually competing for: the exact `neurofeedback
  // therapy` target and both city names. The three symptom words move to the
  // description, which has room for them, and to the concern spokes that own
  // those queries.
  title: {
    absolute: "Neurofeedback Therapy in Nashville & Murfreesboro, TN",
  },
};

// What a concern *is* — title and destination — lives here once. Anxiety and
// Sleep appear in both audience groups below, and this is what keeps the two
// copies from drifting: neither group restates a title or an href, so a rename
// or a route change lands on both cards at the same time.
//
// Bullets are the deliberately variable part, supplied per group. The same
// concern sounds different depending on who's describing it, and a card whose
// symptoms are written for the reader in front of it is the whole reason the
// section is split by audience.
const concern = {
  anxiety: {
    title: "Anxiety & nervous-system overload",
    href: "/concerns/anxiety",
  },
  focusAdhd: {
    title: "Focus, ADHD & follow-through",
    href: "/concerns/focus-adhd",
  },
  sleep: {
    title: "Sleep difficulties",
    href: "/concerns/sleep",
  },
  emotionalRegulation: {
    title: "Emotional regulation",
    href: "/concerns/emotional-regulation",
  },
  brainFog: {
    title: "Brain fog, memory & mental fatigue",
    href: "/concerns/brain-fog",
  },
  stressResilience: {
    title: "Stress & resilience",
    href: "/concerns/stress-resilience",
  },
  concussion: {
    title: "Post-concussion symptoms",
    href: "/concerns/concussion",
  },
};

// The audience split, defined once. Each group is a label and an anchor id,
// and both are used twice — the jump link renders the label and points at the
// id, the group renders the id and repeats the label as its heading. Written
// out longhand that is four literals to keep in step for two facts, and the
// two copies of the label are the pair most likely to drift, because a
// heading gets renamed where a jump link three lines up does not.
const concernGroups = {
  child: { id: "for-your-child", label: "For your child" },
  // "For adults", not "For you": the two headings are read as a pair, and
  // "For your child / For you" made the second one mean "not the child" only
  // by contrast with the first. The id follows the label so a shared anchor
  // link still describes where it lands.
  adult: { id: "for-adults", label: "For adults" },
} as const;

// Kids first — most visitors arrive as a parent, and the family row that
// follows this group is the page's children-and-families route.
const childConcerns = [
  {
    ...concern.anxiety,
    points: [
      "Thoughts that won't quiet down",
      "Feeling constantly on edge",
      "Unable to relax even when life is calm",
    ],
  },
  {
    ...concern.focusAdhd,
    points: [
      "Struggling to stay on task",
      "Overwhelmed by multi-step responsibilities",
      "Work or schoolwork that stalls at 90%",
    ],
  },
  {
    ...concern.sleep,
    points: [
      "A mind that won't shut off at night",
      "Waking frequently",
      "Eight hours that feel like four",
    ],
  },
  {
    ...concern.emotionalRegulation,
    points: [
      "Becoming overwhelmed quickly",
      "Struggling with transitions",
      "Staying upset long after the moment",
    ],
  },
];

// Anxiety and Sleep repeat here on purpose — they're genuinely both audiences,
// and both cards point at the same concern page. The bullets are written the
// way an adult describes it, so the repeat reads as a cross-listing rather
// than a copy/paste of the card three screens up.
const adultConcerns = [
  {
    ...concern.brainFog,
    points: [
      "Thinking that feels slow or cloudy",
      "Losing words mid-sentence",
      "Exhausted by normal responsibilities",
    ],
  },
  {
    ...concern.stressResilience,
    points: [
      "Functioning, but close to burnout",
      "Unable to recover after hard days",
      "Carrying stress physically",
    ],
  },
  {
    ...concern.anxiety,
    points: [
      "Wired at midnight, flat by morning",
      "Bracing for the day before it starts",
      "Tension you notice in your body first",
    ],
  },
  {
    ...concern.sleep,
    points: [
      "Falling asleep fine, awake at 3 a.m.",
      "Coffee doing the work sleep should",
      "Eight hours that feel like four",
    ],
  },
  // Adults only, and the reasoning is on the page rather than the audience:
  // every line of approved concussion copy addresses an adult in the second
  // person, and there is no parent-facing version of it to put on a card in
  // the group above. Youth sport is a real part of this audience and reaches
  // the page through search, the header and /what-we-help-with — none of which
  // is split by audience — rather than through a card whose bullets nobody has
  // written yet.
  //
  // `fill` because this makes five cards in a four-column grid. It spans the
  // second row rather than sitting alone in a quarter of it; see ConcernCard.
  {
    ...concern.concussion,
    points: [
      "Cleared by a doctor and still not right",
      "Fog that lifts and returns",
      "Light and noise that wear on you",
    ],
    fill: "always" as const,
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
    // Shortened for the homepage — the taper's full cadence and the pricing
    // note live on /faq and /lens-neurofeedback, and this accordion is three
    // questions deep by design. What it must not do is disagree with them, so
    // the course length and the wind-down both come from the constants rather
    // than being summarised in prose that drifts.
    q: "How many sessions will I need?",
    a:
      `A full course is ${FULL_COURSE.value.sessions} sessions, then ` +
      `maintenance, and ${FULL_COURSE.value.children}. The schedule winds ` +
      `down rather than continuing indefinitely. ${COURSE_VARIES_NOTE}`,
  },
];

export default function HomePage() {
  const [nashville, murfreesboro, franklin] = locations;
  // The centers keep different weeks, and the locations row is where the two
  // sit side by side — so the hours belong on the card, read from
  // lib/locations.ts like every other card fact. Null while a week is
  // unconfirmed, which drops the line rather than leaving a blank one.
  const nashvilleHours = hoursSummary(nashville);
  const murfreesboroHours = hoursSummary(murfreesboro);
  const startTiming = verifiedOr(START_TIMING);
  const brainMapClaim = verifiedOr(BRAIN_MAP_CLAIM);
  const founderQuote = verifiedOr(FOUNDER_QUOTE);
  const sessionCount = verifiedOr(STAT_SESSIONS);
  const establishedYear = verifiedOr(ESTABLISHED_YEAR);
  const homeQuotes = SHOW_DRAFT_CONTENT ? TESTIMONIALS : VERIFIED_TESTIMONIALS;
  const showStories = homeQuotes.length > 0;
  // The band's own subject is the reviews, so it is gated on there being a
  // count to print rather than on SHOW_REVIEWS alone — `combinedReviewCount()`
  // already folds that gate in, and returns null when no center has any. That
  // also removes the non-null assertion the old two-part gate needed.
  const reviewCount = combinedReviewCount();
  const showReviewBand = reviewCount !== null;

  return (
    <div className="home">
      <section className="hero wrap">
        <div className="hero-grid">
          <div className="rv hero-copy">
            <div className="eyebrow">
              LENS Neurofeedback &middot; Nashville &amp; Murfreesboro
            </div>
            {/* The sage italic is back: this headline turns on the em dash,
                and "without medication" is the differentiator it turns on —
                the same shape as "nothing to perform." on /how-lens-works. The
                previous plain headline had no pivot, which is why it carried
                no accent. */}
            <h1>
              Help for anxiety, focus, and sleep &mdash;{" "}
              <em className="sage">without medication.</em>
            </h1>
            {/* No .kw spans: the concern keywords they marked are in the H1
                now, and the sub carries category and location instead. */}
            <p className="sub">
              Gentle LENS neurofeedback for adults and kids across Middle
              Tennessee.
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
                  {/* Explicit {" "}: JSX drops whitespace that spans a line
                      break, so without it the tag rendered hard against the
                      full stop — "back today.[CONFIRM …]". */}
                  A real person calls you back today.{" "}
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
            {/* Portrait source (1122x1402) where the old hero was landscape,
                so the crop values are re-derived rather than carried over: 28%
                puts both faces in the upper third of the 620px desktop frame
                and is the highest the crop can sit before the tablet width —
                where the same 620px frame goes full-bleed and crops hardest —
                starts cutting the top of her head. On phones the frame is
                taller than the image is wide, so the image is
                height-constrained and only the horizontal half of
                positionMobile does anything — centered keeps both faces in.

                Filename and alt are the SEO surface for this image: a
                keyword-descriptive file name (not "Mom and daughter.png") and
                alt text that describes what's actually pictured while naming
                the service and the metro. Alt does not claim this is a
                session or a result — it isn't one. */}
            <PhotoFrame
              src="/images/mother-daughter-lens-neurofeedback-nashville.jpg"
              alt="Mother and teenage daughter talking calmly together at home — the everyday calm families seek from LENS neurofeedback in Nashville, TN"
              position="50% 28%"
              positionMobile="50% 28%"
              height={620}
              className="hero-ph"
              sizes="(max-width: 1060px) 100vw, 47vw"
              priority
            />
            <span className="hero-scrim" aria-hidden="true" />
          </div>
        </div>
      </section>

      {/* Trisha Yearwood band — CONDITIONAL FEATURE. Renders only while
          FEATURE_CELEBRITY is true (draft mode, or the env flag once every
          permission is confirmed — see lib/site-config.ts). Embedding is
          disabled for this video: always a thumbnail linking out, never an
          iframe. The page is designed to feel complete without this band.

          Sits directly under the hero in the DOM. It used to sit below the
          proof band and get lifted here by a mobile-only `order` override;
          the DOM now says what the page means, so that override is gone and
          phone and desktop read the same sequence. */}
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
                // 220px is only true above 760. Below it, globals.css gives
                // .celeb-video `width: auto; align-self: stretch; margin: 0
                // -24px` — it goes full-bleed, edge to edge. The bare "220px"
                // had the browser fetching a 256px-wide source for a 390px
                // slot (780px at 2x), which is the blurriest image on the
                // site and looks like nothing at all on desktop, where it was
                // written. Same breakpoint as the rule that causes it.
                sizes="(max-width: 760px) 100vw, 220px"
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
          // The referral claim, in the band's own two-part shape. Both halves
          // are words from PHYSICIAN_REFERRALS — the band cannot hold the
          // sentence, and this is a compression of it rather than a rewrite.
          // The full sentence is on /about and both location pages.
          {
            stat: "Physician-referred",
            label: "We work from a standing referral list",
          },
        ]}
      />

      <section className="sec home-concerns">
        <div className="wrap">
          <div className="sec-head split rv">
            <div>
              <div className="eyebrow">What brings people to us</div>
              <h2>The concerns we see most.</h2>
              {/* Plain in-page anchors — no JS, no toggle, nothing hidden.
                  Both groups are always in the HTML; these only move the
                  viewport, so they work with JS off and are crawlable. */}
              <div className="concern-jump">
                {[concernGroups.child, concernGroups.adult].map((g) => (
                  <Btn key={g.id} href={`#${g.id}`} variant="ghost">
                    {g.label} <span className="arrow">↓</span>
                  </Btn>
                ))}
              </div>
            </div>
            <Btn href="/what-we-help-with" variant="ghost" arrow>
              Explore every concern
            </Btn>
          </div>

          <div className="concern-group" id={concernGroups.child.id}>
            <h3 className="concern-group-head rv">{concernGroups.child.label}</h3>
            <ConcernRail
              count={childConcerns.length}
              cols={4}
              label="Concerns we see in children"
            >
              {childConcerns.map((c) => (
                <ConcernCard key={c.href} headingLevel={4} {...c} />
              ))}
            </ConcernRail>
            {/* Stays welded to this group's grid: it's the children route, and
                the border-top: 0 seam is what welds it. */}
            <div className="family-row rv">
              <div className="fr-copy">
                <div className="eyebrow" style={{ color: "var(--sage)" }}>
                  Children &amp; families
                </div>
                <h4>Help for kids who are struggling at school.</h4>
                <p>
                  Homework battles. Meltdowns over transitions. Teacher emails.
                  Sensory overwhelm. A child starting to believe they&rsquo;re
                  bad at school. There&rsquo;s nothing your child has to get
                  right in a LENS session &mdash; and you&rsquo;re part of
                  every check-in.
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

          <div className="concern-group" id={concernGroups.adult.id}>
            <h3 className="concern-group-head rv">{concernGroups.adult.label}</h3>
            <ConcernRail
              count={adultConcerns.length}
              cols={4}
              label="Concerns we see in adults"
            >
              {adultConcerns.map((c) => (
                <ConcernCard key={c.href} headingLevel={4} {...c} />
              ))}
            </ConcernRail>
          </div>
        </div>
      </section>

      {/* Proof follows the problem: the concern cards name what's wrong, so
          the quotes from people who had the same thing land here rather than
          five sections later. */}
      {showStories && (
        <section className="sec sec-ivory2 home-stories">
          <div className="wrap">
            <div className="sec-head split rv">
              <div>
                <div className="eyebrow">Client stories</div>
                <h2>What clients say.</h2>
              </div>
              <Btn href="/stories" variant="ghost" arrow>
                More client stories
              </Btn>
            </div>
            <div className="trio-quotes rv">
              {homeQuotes.map((t) => (
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
                </div>
                <div>
                  {/* Summed from the per-center counts in lib/locations.ts,
                      never typed: this band and the two location pages state
                      the same reviews, and a hand-written total is the copy
                      that goes stale the first time one center's changes. */}
                  <strong>{reviewCountLabel(reviewCount)}</strong>
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

      {/* How it works follows the stories: the quotes are what makes someone
          want to know what actually happens, and this is the answer. Phase 14
          moved the whole section here from below the goals list — the DOM is
          the only thing that says section order on this page (the mobile layer
          is a plain flex column with no `order` overrides), so phone and
          desktop moved together. */}
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
                p: "A free call — or send the form and we'll call you. Tell us what's going on, and we'll tell you honestly whether LENS is a fit.",
              },
              {
                n: "2",
                h: "Map",
                p: "Your first visit: you sit down with a practitioner, we record a baseline of your brain activity, we walk you through what we see, and you leave with a written plan.",
                link: {
                  href: "/first-visit",
                  label: "See what the first visit is like",
                },
              },
              {
                n: "3",
                h: "Sessions",
                p: "Short, comfortable visits. Sleep, focus, and mood reviewed every time — your plan follows what you actually report.",
                link: {
                  href: "/how-lens-works",
                  label: "See how LENS works",
                },
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

      {/* The Harmonized Brain Map — the site's largest differentiator, and what
          makes the $150 tangible. Directly after the three-step module again:
          step 2 is called "Map" and names the thing without showing it, so this
          is the section that shows it. Phase 14 moved the steps up behind the
          stories and left this where it was, which broke that pairing for one
          commit; the two travel together. The claim sentence is gated like
          every other unverified fact — production drops it and the paragraph
          still reads complete. */}
      <section className="sec home-brain-map">
        <div className="wrap split">
          <div className="rv">
            <div className="eyebrow">What you walk away with</div>
            <h2>You&rsquo;ll see your own brain map.</h2>
            <p>
              On your first visit we record activity at 21 points across your
              brain and turn it into a map you can actually read &mdash; where
              things are running hot, where they&rsquo;re running quiet, and how
              that lines up with what you came in describing. We built this.
              {brainMapClaim && (
                <>
                  {" "}
                  {brainMapClaim}
                  <ConfirmTag>{BRAIN_MAP_CLAIM.note!}</ConfirmTag>
                </>
              )}
            </p>
            <div className="hero-ctas" style={{ marginTop: 30 }}>
              <TalkCta />
              <BrainMapCta />
            </div>
          </div>
          <div className="rv">
            {/* Pinned to the render's own 1184×860 ratio (height auto overrides
                the .split 500px) so `cover` fills the frame without cropping —
                a cropped diagram loses electrode labels and the legend. */}
            <PhotoFrame
              src="/images/brain-map-heat.png"
              alt="A sample Harmonized Brain Map — a head-shaped heat map showing electrical amplitude at 21 points across the brain"
              aspect="1184 / 860"
              style={{ height: "auto" }}
            />
            {/* Not gated: the framing has to travel with the image, whether the
                image is the real render or the plate standing in for it. */}
            <p className="micro">
              A picture of electrical activity &mdash; not a diagnosis.
            </p>
          </div>
        </div>
      </section>

      {/* Cost of inaction — the one place the site names it. One paragraph by
          design: specific pain with dignity, not stacked pain. */}
      <section className="sec home-stakes">
        <div className="wrap">
          <div className="sec-head rv">
            <div className="eyebrow">Why now</div>
            <h2>Why people wish they&rsquo;d called sooner.</h2>
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
              What clients hope to change.
            </h2>
          </div>
          <div className="rv">
            <ul className="goals-list">
              {homeGoals.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
            {/* The caveat reads as a footnote to the list it qualifies, rather
                than a sage panel competing with the heading for attention. */}
            <p className="micro">
              These are goals, not guarantees &mdash; every nervous system
              responds differently. Changes are reviewed at every visit, so
              progress is tracked consistently instead of relying on memory
              alone.
            </p>
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
                  {nashvilleHours && (
                    <>
                      <br />
                      {nashvilleHours}
                    </>
                  )}
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
                  {murfreesboroHours && (
                    <>
                      <br />
                      {murfreesboroHours}
                    </>
                  )}
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
      <GuideCta headingLead="Four problems, one explanation. Read" />
      <MobileCtaBar />
    </div>
  );
}
