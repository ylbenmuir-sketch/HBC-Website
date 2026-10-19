import { HAS_STORY_VIDEOS } from "@/lib/videos";
import WhatItTakes from "@/components/WhatItTakes";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import PhotoFrame from "@/components/PhotoFrame";
import BrainMapStage from "@/components/BrainMapStage";
import BrainMapHeat from "@/components/BrainMapHeat";
import BrainMapBars from "@/components/BrainMapBars";
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
import CheckIcon from "@/components/CheckIcon";
import HeroConcernChips from "@/components/HeroConcernChips";
import HeroBrainMapJump from "@/components/HeroBrainMapJump";
import {
  locations,
  combinedReviewCount,
  hoursSummary,
  reviewCountLabel,
} from "@/lib/locations";
import { practitionerBandStat } from "@/lib/team";
import {
  BRAIN_MAP_CALLOUTS,
  BRAIN_MAP_CLAIM,
  BRAIN_MAP_HEATMAP_LIVE,
  BRAIN_MAP_NAME,
  BRAIN_MAP_POINTS,
  COURSE_VARIES_NOTE,
  ESTABLISHED_YEAR,
  FEATURE_CELEBRITY,
  FOUNDER_DISPLAY_NAME,
  FOUNDER_LAST_NAME,
  FOUNDER_QUOTE,
  FRANKLIN_OPENING,
  FULL_COURSE,
  HSA_FSA_ACCEPTED,
  REVIEWS,
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
import { pageMetadata } from "@/lib/pages";
import PageSchema from "@/components/PageSchema";

// Title, description and the page's content date live in lib/pages.ts.
export const metadata: Metadata = pageMetadata("/");

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
  trauma: {
    title: "Trauma-related stress",
    href: "/concerns/trauma",
  },
  performance: {
    title: "Performance & mental sharpness",
    href: "/concerns/performance",
  },
  migraines: {
    title: "Migraines",
    href: "/concerns/migraines",
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
  // The second row (Sept 2026). Performance and migraines are adult-grouped
  // by decision — performance's audience is executives, founders and
  // musicians; every line of migraine framing addresses an adult managing
  // their own medical care, concussion's reasoning exactly. Trauma joins
  // them for two reasons that arrived together: it was the one concern on
  // neither homepage group (and the one the footer note calls out as
  // link-starved), and its card is what takes the group from seven cards —
  // a ragged 4+2+span — to eight in two full rows, which is why concussion's
  // `fill` came off in the same edit.
  {
    ...concern.performance,
    points: [
      "Used to handle a lot more than this",
      "Word recall is a struggle",
      "Finishing by the deadline is a fight",
    ],
  },
  {
    ...concern.trauma,
    points: [
      "Vigilant in rooms where nothing is wrong",
      "Startling easily, settling slowly",
      "The past crowding the present",
    ],
  },
  // Adults only, and the reasoning is on the page rather than the audience:
  // every line of approved concussion copy addresses an adult in the second
  // person, and there is no parent-facing version of it to put on a card in
  // the group above. Youth sport is a real part of this audience and reaches
  // the page through search, the header and /what-we-help-with — none of which
  // is split by audience — rather than through a card whose bullets nobody has
  // written yet.
  {
    ...concern.concussion,
    points: [
      "Cleared by a doctor and still not right",
      "Fog that lifts and returns",
      "Light and noise that wear on you",
    ],
  },
  // Last, beside concussion — the two pages that start with a medical event,
  // and the pair the migraine card's own page links across to.
  {
    ...concern.migraines,
    points: [
      "Under a doctor's care, and staying there",
      "Headaches that date to a concussion",
      "A long list of things already tried",
    ],
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
    // Same three sentences as lib/faq.ts answer 10 — see the note there for
    // why it neither opens "Neither." nor opens on the boundary sentence.
    q: "Is this therapy or medical treatment?",
    a: "What we offer is neurofeedback: small sensors read the brain's electrical activity and return a brief, very low-energy feedback signal, with nothing to perform. LENS is offered as a wellness service, not medical treatment. It doesn't diagnose or treat medical conditions, and it works alongside — never in place of — your doctor, therapist, or school supports.",
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
      {/* No breadcrumb on the homepage — it is the root of every trail. */}
      <PageSchema path="/" />
      <section className="hero wrap">
        <div className="hero-grid">
          <div className="rv hero-copy">
            {/* One H1 that Google and a screen reader read as one sentence
                (Ben, 2026-10-19): "LENS Neurofeedback in Nashville &
                Murfreesboro: Help for anxiety, focus, and sleep — without
                medication." The eyebrow is the H1's first child, styled
                exactly as the standalone eyebrow was (gold line, small sans
                caps); " in " and ":" are in the DOM but visually hidden
                (`.vh`), and the middle dot between the two halves is CSS
                generated content (`.hero-kicker-dot`), so it is seen and not
                read. Nothing moved: the eyebrow box and the headline measure
                the same as before at 1440, 1024, 834, 390 and 320.

                The headline turns on the em dash, and the sage italic carries
                the pivot — the same shape as "nothing to perform." on
                /how-lens-works. "without medication." is Ben's wording
                (2026-10-19, reaffirmed): it was the pivot until 2026-10-15,
                came off beside /is-lens-safe's "not an alternative to
                medication", and he chose it back over the two since. The
                metadata description (app/layout.tsx, lib/pages.ts) and the
                chat mirror (lib/chat/site-copy.ts) follow this H1 — edit all.
                `&nbsp;` keeps the dash with "sleep"; `.tie` keeps the pivot
                on one line from 641px up (globals.css) — on a phone it may
                wrap as two words, never mid-word. */}
            <h1>
              <span className="eyebrow hero-kicker">
                <span className="hero-kicker-text">
                  LENS Neurofeedback<span className="vh"> in </span>{" "}
                  <span className="hero-kicker-dot" aria-hidden="true" />{" "}
                  Nashville &amp; Murfreesboro<span className="vh">:</span>
                </span>
              </span>{" "}
              <span className="hero-h1-text">
                Help for anxiety, focus, and sleep&nbsp;&mdash;{" "}
                <em className="sage">
                  <span className="tie">without medication.</span>
                </em>
              </span>
            </h1>
            {/* What the first visit is, in one sentence (Ben, 2026-10-19;
                "LENS neurofeedback" named in it the same day, for search).
                It replaced the one-line description of the organisation,
                which /about still carries. Mirrored in
                lib/chat/site-copy.ts — edit both. */}
            <p className="sub">
              Your first LENS neurofeedback visit starts with a Brain Map: a
              short recording that shows which areas of your brain are running
              smoothly, running hot, or running low, and what that means for
              everyday life.
            </p>
            {/* One row on a desktop: both buttons, then the HSA/FSA line to
                the right of the second (Ben, 2026-10-19). When the hero
                stacks (≤1060px) `.hero-ctas` is `display: contents` and the
                copy column orders its children: buttons, chips, HSA line —
                then the photo on a tablet, or over the photo on a phone,
                where the copy sits on the scrim (globals.css ≤760px). */}
            <div className="hero-ctas">
              <div className="hero-btns">
                <TalkCta />
                {/* "See What a Brain Map Shows ↓" → #brain-map (Ben,
                    2026-10-19). The priced BrainMapCta lives in the stage. */}
                <HeroBrainMapJump />
              </div>
              {/* One quiet line, not a button (Ben, 2026-10-16): a long-time
                  referral partner had only just learned we take HSA/FSA. */}
              <p className="hero-hsa">
                <CheckIcon className="hero-hsa-check" />
                {HSA_FSA_ACCEPTED}
              </p>
            </div>
            <HeroConcernChips />
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
            {/* Phones only (globals.css ≤760px): the navy scrim the copy
                sits on. `display: none` everywhere else. */}
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
          // Counted from the roster (lib/team.ts), never typed, so this cell
          // cannot drift from /about/team. It replaced "Two centers", which
          // survives in the label: the person count is the credential a
          // visitor weighing new practices actually needs, stated plainly —
          // no superlative, no comparison to anyone (Ben's positioning rule).
          {
            stat: practitionerBandStat(),
            label: "across Nashville & Murfreesboro — Franklin coming soon",
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
                {/* Only once there is a video behind it (lib/videos.ts →
                    HAS_STORY_VIDEOS, Ben 2026-10-15). */}
                {HAS_STORY_VIDEOS && (
                  <div>
                    <strong>Video stories</strong>
                    <span>Client interviews, in their own words</span>
                  </div>
                )}
              </div>
            )}
            {/* The "Individual experiences vary." line was removed from under
                the Google rating band (Ben, 2026-10-16): the disclaimer stays
                where it sits under client quotes/stories (/stories, the concern
                pages, the footer on every page) but not directly under the
                review stats. The dev-only sample-copy warning is kept for the
                design-review state where no verified quote exists. */}
            {SHOW_DRAFT_CONTENT && VERIFIED_TESTIMONIALS.length === 0 && (
              <p className="sample-note">{SAMPLE_QUOTES_NOTE}</p>
            )}
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

      {/* Time, money, effort — right after "How it works", the moment
          someone has the steps and is asking whether it is worth it (Ben,
          2026-10-15). Every figure from lib/site-config.ts. */}
      <WhatItTakes />

      {/* The Harmonized Brain Map — a 1-2-3 stage (Ben, 2026-10-19): Scan,
          Results, Plan, with one large visual that follows the step. Every
          visual draws from lib/brain-map-sample.ts — the same 21 numbers on
          the heat map, the bars and /brain-map — so they cannot disagree.
          The section keeps its id (#brain-map): the hero's "See What a Brain
          Map Shows" scrolls here, and `scroll-margin-top` lands it under the
          sticky header. /brain-map still owns the cluster and the full copy;
          this is the show, that is the page (the "About" link below the
          buttons). The Results callouts are Verifiables awaiting Sheri
          (BRAIN_MAP_CALLOUTS): production shows the numbered site and not
          the sentence until each is verified. BRAIN_MAP_CLAIM keeps its gate,
          under the caption. */}
      <section className="sec home-brain-map" id="brain-map">
        <div className="wrap">
          <BrainMapStage
            heatLive={BRAIN_MAP_HEATMAP_LIVE}
            head={
              <>
                <div className="eyebrow">{BRAIN_MAP_NAME}</div>
                <h2>See what your brain is doing, before anything else.</h2>
              </>
            }
            steps={[
              {
                title: "Scan.",
                text: (
                  <>
                    A short LENS recording measures {BRAIN_MAP_POINTS} sites
                    across your brain and shows which areas are running hot,
                    running low, or right in range.
                  </>
                ),
              },
              {
                title: "Results.",
                text: (
                  <>
                    We walk through your map with you, point by point and in
                    plain language, and connect what it shows to what you
                    notice day to day: sleep, focus, stress, mood.
                  </>
                ),
              },
              {
                title: "Plan.",
                text: (
                  <>
                    Your practitioner builds a plan from your map using the
                    Harmonized Method, our proprietary process, built in-house
                    from the ground up and refined over {STAT_SESSIONS.value}{" "}
                    LENS sessions. Sessions are brief and passive. LENS gives
                    the brain gentle feedback and lets it do the adjusting.{" "}
                    <em className="sage">Feedback, not force.</em>
                  </>
                ),
              },
            ]}
            heat={<BrainMapHeat />}
            bars={<BrainMapBars />}
            resultsHeat={
              <BrainMapHeat
                legend={false}
                callouts={BRAIN_MAP_CALLOUTS.map((c, i) => ({ n: i + 1, sites: c.sites }))}
              />
            }
            callouts={BRAIN_MAP_CALLOUTS.map((c, i) => ({
              n: i + 1,
              where: c.where,
              line: verifiedOr(c.line),
              note: c.line.note,
            }))}
            plan={
              <PhotoFrame
                src="/images/session-room.jpg"
                alt="A session room at Harmonized Brain Centers: a reclining session chair by a bright window, string lights along the wall, children's drawings pinned beside it"
                position="center 55%"
                aspect="16 / 10"
                style={{ height: "auto" }}
                sizes="(max-width: 1023px) calc(100vw - 72px), 720px"
              />
            }
            actions={
              <>
                <TalkCta />
                <BrainMapCta />
              </>
            }
            about={
              <Link href="/brain-map" className="bms-about">
                About the Harmonized Brain Map &rarr;
              </Link>
            }
            caption={
              <>
                A sample Brain Map &mdash; {BRAIN_MAP_POINTS} sites, measured in
                microvolts. Not a diagnosis.
                {brainMapClaim && (
                  <>
                    {" "}
                    {brainMapClaim}
                    <ConfirmTag>{BRAIN_MAP_CLAIM.note!}</ConfirmTag>
                  </>
                )}
              </>
            }
          />
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
                  Start at Nashville or Murfreesboro now and transfer when we
                  open.
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
          {/* The skepticism page, as one quiet line: the visitor it is for is
              the one who read the first answer above and still isn't sure. */}
          <p className="micro rv" style={{ marginTop: 18 }}>
            Skeptical? Read{" "}
            <Link href="/is-lens-safe">what we can and can&rsquo;t tell you</Link>
            .
          </p>
        </div>
      </section>

      <FinalCTA />
      <GuideCta headingLead="Four problems, one explanation. Read" />
      <MobileCtaBar />
    </div>
  );
}
