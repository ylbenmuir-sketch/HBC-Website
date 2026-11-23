import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import PartnerBadge from "@/components/PartnerBadge";
import PhotoFrame from "@/components/PhotoFrame";
import BrainMapStage from "@/components/BrainMapStage";
import BrandName from "@/components/BrandName";
import BrainMapHeat from "@/components/BrainMapHeat";
import BrainMapBars from "@/components/BrainMapBars";
import { fmtUv, meanUv } from "@/lib/brain-map-sample";
import ConcernTabs from "@/components/ConcernTabs";
import Quote from "@/components/Quote";
import GoogleReviewQuote from "@/components/GoogleReviewQuote";
import HomeLocationCard from "@/components/HomeLocationCard";
import FAQAccordion, { type FaqItem } from "@/components/FAQAccordion";
import FinalCTA from "@/components/FinalCTA";
import GuideCta from "@/components/GuideCta";
import { Btn, TalkCta } from "@/components/Buttons";
import ConfirmTag from "@/components/ConfirmTag";
import CheckIcon from "@/components/CheckIcon";
import HeroBrainMapJump from "@/components/HeroBrainMapJump";
import { REFERRAL_FAQ, locations } from "@/lib/locations";
import { FIRST_VISIT_COST_SENTENCE, SITE_FAQS } from "@/lib/faq";
import { HOME_CONCERN_GROUPS, HOME_MORE_CONCERNS } from "@/lib/home-concerns";
import {
  AMEN_PARTNER_ENABLED,
  BRAIN_MAP_CALLOUTS,
  BRAIN_MAP_NAME,
  BRAIN_MAP_POINTS,
  ESTABLISHED_YEAR,
  EXPERIENCES_DISCLAIMER,
  FEATURE_CELEBRITY,
  FIRST_VISIT_DURATION,
  FOUNDER_DISPLAY_NAME,
  FOUNDER_LAST_NAME,
  FOUNDER_PAGE_PUBLISHED,
  FOUNDER_QUOTE,
  FRANKLIN_OPENING,
  GOOGLE_REVIEW_QUOTES,
  HSA_FSA_ACCEPTED,
  REVIEWS,
  REVIEW_COUNT_ROUNDED,
  SAMPLE_QUOTES_NOTE,
  SHOW_DRAFT_CONTENT,
  SHOW_REVIEWS,
  STAT_SESSIONS,
  TESTIMONIALS,
  TRISHA_APPROVAL_TAG,
  TRISHA_QUOTE,
  TRISHA_VIDEO_URL,
  VERIFIED_TESTIMONIALS,
  verifiedOr,
  PHONE_DISPLAY,
  PHONE_TEL,
  PROOF_LINE,
  SHOW_PHONE,
} from "@/lib/site-config";
import { pageMetadata } from "@/lib/pages";
import PageSchema from "@/components/PageSchema";

// Title, description and the page's content date live in lib/pages.ts.
export const metadata: Metadata = pageMetadata("/");

/*
 * The homepage, restructured (Ben, 2026-11-22) to ten sections in this
 * order: hero · trust row · "What brings you in?" tabs · the Brain Map band
 * · client stories · the team (or the founder) · locations · FAQ · the
 * closing band · the footer. The layout is new; the words are the site's
 * own. Where a new piece needed a short line that the homepage did not
 * already have, it is read from the page that owns it and the source is
 * named beside it — nothing here is a new claim.
 */

/** A sitewide answer by its question, so the accordion below quotes
 *  lib/faq.ts and cannot drift from /faq. */
function siteFaq(q: string): FaqItem {
  const found = SITE_FAQS.find((f) => f.q === q);
  if (!found) throw new Error(`homepage FAQ: no sitewide question "${q}"`);
  return { q: found.q, a: found.a };
}

// Five questions (Ben, 2026-11-22): what happens in a session, cost,
// children, how many visits, whether a referral is needed. Four are /faq's
// own entries; the referral one is the location pages' (lib/locations.ts).
// Every answer verbatim. No FAQPage schema on this page: /faq owns it.
const homeFaqs: FaqItem[] = [
  siteFaq("Do I have to do anything during the session?"),
  siteFaq("What does it cost?"),
  siteFaq("Is it appropriate for children?"),
  siteFaq("How many sessions will I need?"),
  REFERRAL_FAQ,
];

export default function HomePage() {
  const [nashville, murfreesboro, franklin] = locations;
  const sessionCount = verifiedOr(STAT_SESSIONS);
  const establishedYear = verifiedOr(ESTABLISHED_YEAR);
  const founderQuote = verifiedOr(FOUNDER_QUOTE);
  // The featured story is the first permissioned client story; beside it,
  // one public Google review, labelled as one (components/
  // GoogleReviewQuote.tsx). The sleep review: the story is a parent's about
  // focus and regulation, so the pair covers a child and an adult.
  const homeQuotes = SHOW_DRAFT_CONTENT ? TESTIMONIALS : VERIFIED_TESTIMONIALS;
  const featuredStory = homeQuotes[0];
  const googleReview = SHOW_REVIEWS
    ? GOOGLE_REVIEW_QUOTES.find((r) => r.concernCategory === "sleep" && r.verified)
    : undefined;
  const showStories = Boolean(featuredStory || googleReview);
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
            <p className="sub sub-desk">
              Your first LENS neurofeedback visit starts with a Brain Map: a
              short recording that shows which areas of your brain are running
              smoothly, running hot, or running low, and what that means for
              everyday life.
            </p>
            {/* The phone's shorter sentence (Ben, 2026-10-20) — the same
                claim in fewer words, still naming LENS neurofeedback for the
                mobile index. One of the two is shown per width (globals.css
                `.sub-desk` / `.sub-m`); the H1 is not repeated. */}
            <p className="sub sub-m">
              Start with a Brain Map: a short LENS neurofeedback recording that
              shows which areas of your brain run hot, run low, or sit right in
              range.
            </p>
            {/* One row on a desktop: both buttons, then the HSA/FSA line to
                the right of the second (Ben, 2026-10-19). When the hero
                stacks (≤1060px) `.hero-ctas` is `display: contents` and the
                copy column orders its children: buttons, chips, HSA line —
                then the photo on a tablet, or over the photo on a phone,
                where the copy sits on the scrim (globals.css ≤760px). */}
            {/* The phone hero is one action, one reassurance, one proof
                (Ben, 2026-11-02): eyebrow + H1, sentence, Get Started, the
                one-line reassurance, the proof line, then "See What a Brain
                Map Shows ↓" as a plain link. Nothing else — the "No
                pressure…" paragraph, the HSA/FSA row, the "Or call" line
                and the chips are `display: none` under 761px, and the chips
                have their own section right after the hero there. The DOM
                order below is the desktop's; the phone reorders it with
                `order` in the `.hero-copy` column (globals.css ≤760px). */}
            <div className="hero-ctas">
              <div className="hero-btns">
                <TalkCta />
                {/* "See What a Brain Map Shows ↓" → #brain-map (Ben,
                    2026-10-19). */}
                <HeroBrainMapJump />
              </div>
              {/* Phones only: the reassurance line directly under Get
                  Started (Ben, 2026-11-02), standing in for both the
                  "No pressure…" paragraph and the HSA/FSA row below. */}
              <p className="hero-reassure-m">
                <span>Free 10-minute call ·</span> <span>No pressure ·</span>{" "}
                <span>{HSA_FSA_ACCEPTED}</span>
              </p>
              {/* The "No pressure. We'll reach out…" line (CtaReassure) is
                  off this hero since 2026-11-23 (Ben). The concern pages
                  keep it under their TalkCta. */}
              {/* The one-line proof under the buttons, from 761px up (Ben,
                  2026-11-22): PROOF_LINE in lib/site-config.ts — the same
                  rating, review count, session count and founding year the
                  trust row under the hero prints, from the same constants.
                  Not on a phone, where the trust row is the next thing on
                  the screen (globals.css `.hero-proof`). */}
              <p className="hero-proof">{PROOF_LINE}</p>
              {/* The number itself, as a call and a text (Ben, 2026-11-02),
                  reporting contact_link_click with location "home_hero".
                  Not shown at any width since 2026-11-02 (Ben): the header
                  and the phone's action bar already carry Call and Text.
                  Kept in the markup with its location so it can come back
                  with one CSS rule. */}
              {SHOW_PHONE && (
                <p className="hero-phone" data-link-location="home_hero">
                  Or call <a href={`tel:${PHONE_TEL}`}>{PHONE_DISPLAY}</a>
                  {" · "}
                  <a href={`sms:${PHONE_TEL}`}>text us</a>
                </p>
              )}
              {/* One quiet line, not a button (Ben, 2026-10-16): a long-time
                  referral partner had only just learned we take HSA/FSA.
                  Desktop and tablet; the phone folds it into
                  `.hero-reassure-m`. */}
              <p className="hero-hsa">
                <CheckIcon className="hero-hsa-check" />
                {HSA_FSA_ACCEPTED}
              </p>
            </div>
          </div>
          <div className="rv hero-media">
            {/* Portrait source (1122x1402) where the old hero was landscape,
                so the crop values are re-derived rather than carried over: 28%
                puts both faces in the upper third of the 620px desktop frame
                and is the highest the crop can sit before the tablet width —
                where the same 620px frame goes full-bleed and crops hardest —
                starts cutting the top of her head. From 641 to 760px the
                frame is taller than the image is wide, so the image is
                height-constrained and only the horizontal half of
                positionMobile does anything — centered keeps both faces in.
                At 640px and under (2026-11-21) the frame is about 40% of the
                screen and as wide as it, and the crop is set in globals.css
                (`--ph-pos-active: 50% -17vw`), not here. `sizes` is 100vw
                there, which is the width the image renders at.

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
              quality={62}
            />
            {/* Phones only (globals.css ≤760px): the navy scrim the copy
                sits on. `display: none` everywhere else. */}
            <span className="hero-scrim" aria-hidden="true" />
            {/* The small card over the photo's corner (Ben's words,
                2026-11-22; no price). A desktop piece: `display: none`
                under 1061px, where the hero stacks (globals.css
                `.hero-float`). */}
            <p className="hero-float">
              Your Brain Map. <span>Your plan to keep.</span>
            </p>
          </div>
        </div>
      </section>

      {/* The trust row (Ben, 2026-11-22): four facts in one row on a
          desktop, two by two on a phone. It took the place of the proof line
          in the hero and of the Amen Clinics strip that sat here. Every
          value is read from lib/site-config.ts and gated like the surfaces
          it replaced; the Amen badge is the same component, with its logo
          as supplied, its one approved line and its partner_badge_click
          location ("home_strip") unchanged. */}
      <section className="trust-row">
        <div className="wrap">
          <ul className="trust-grid">
            {SHOW_REVIEWS && (
              <li>
                <span className="trust-fact">
                  {REVIEWS.value.rating}
                  <span className="trust-star" aria-hidden="true">
                    ★
                  </span>
                  <span className="vh">★</span> &middot; {REVIEW_COUNT_ROUNDED}{" "}
                  Google reviews
                </span>
              </li>
            )}
            {sessionCount && (
              <li>
                <span className="trust-fact">{sessionCount} LENS sessions</span>
              </li>
            )}
            {establishedYear && (
              <li>
                <span className="trust-fact">Since {establishedYear}</span>
              </li>
            )}
            {AMEN_PARTNER_ENABLED && (
              <li>
                <PartnerBadge location="home_strip" />
              </li>
            )}
          </ul>
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

      {/* "What brings you in?" — two tabs of concern cards beside a photo
          (Ben, 2026-11-22). It replaced the hero's chips, the phone's chip
          section and the bulleted concern grid. Each card's name is the
          concern's own title and its line is cut from that page's intro
          (lib/home-concerns.ts); a tap reports concern_chip_click, the
          chips' event (components/ConcernTabs.tsx). The eyebrow is the one
          the concerns section already carried. */}
      <section className="sec home-concerns" aria-labelledby="home-concerns-h">
        <div className="wrap">
          <div className="sec-head rv">
            <div className="eyebrow">What brings people to us</div>
            <h2 id="home-concerns-h">What brings you in?</h2>
          </div>
          <div className="rv">
            <ConcernTabs
              more={HOME_MORE_CONCERNS}
              groups={HOME_CONCERN_GROUPS.map((g) => ({
                id: g.id,
                label: g.label,
                cards: g.cards,
                photo: (
                  <PhotoFrame
                    src={g.photo.src}
                    alt={g.photo.alt}
                    position={g.photo.position}
                    className="hc-ph"
                    sizes="(max-width: 1060px) 100vw, 34vw"
                  />
                ),
              }))}
            />
          </div>
          <div className="rv hc-all">
            <Btn href="/what-we-help-with" variant="ghost" arrow>
              See everything we help with
            </Btn>
          </div>
        </div>
      </section>

            {/* How it works, as a compact strip (Ben, 2026-11-22): Talk, Map,
          Sessions — the heading and the three paragraphs exactly as the
          How it works section carried them, on one light band between the
          concerns and the Brain Map. Its two links ("See what the first
          visit is like", "See how LENS works") are in the "Your first
          visit" card below. Mirrored in lib/chat/site-copy.ts
          (page:home:steps) — edit both. */}
      <section className="home-steps" aria-labelledby="home-steps-h">
        <div className="wrap">
          <div className="home-steps-head rv">
            <div className="eyebrow">How it works</div>
            <h2 id="home-steps-h">
              Three steps. No homework, no screens, nothing to perform.
            </h2>
          </div>
          <ol className="home-steps-list rv">
            {[
              {
                h: "Talk",
                p: "A free call — or send the form and we'll call you. Tell us what's going on, and we'll tell you honestly whether LENS is a fit.",
              },
              {
                h: "Map",
                p: "Your first visit: you sit down with a practitioner, we record a baseline of your brain activity, we walk you through what we see, and you leave with a written plan.",
              },
              {
                h: "Sessions",
                p: "Short, comfortable visits. Sleep, focus, and mood reviewed every time — your plan follows what you actually report.",
              },
            ].map((step, i) => (
              <li key={step.h}>
                <span className="home-steps-n" aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <h3>{step.h}</h3>
                  <p>{step.p}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* The Harmonized Brain Map — the 1-2-3 stage (Ben, 2026-10-19): Scan,
          Results, Plan, with one large visual that follows the step. On a
          navy band since 2026-11-22: the copy and the three steps on one
          side, the map on the other, stacked under 1024px (globals.css
          `.bm-band`). Every visual draws from lib/brain-map-sample.ts — the
          same 21 numbers on the heat map, the bars and /brain-map. The
          section keeps its id (#brain-map): the hero's "See What a Brain Map
          Shows" scrolls here. Every line is approved copy; the caption is
          Ben's exact line.

          "Your first visit" is its own block directly under this band. */}
      <section className="sec sec-navy home-brain-map bm-band" id="brain-map">
        <div className="wrap">
          <BrainMapStage
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
                    Your practitioner builds a plan from your map using the{" "}
                    <BrandName />, our proprietary process, built in-house
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
            // "F7 · Left frontal · 41 µV · Higher" — the value is the
            // dataset's (the mean for a pair), never typed.
            callouts={BRAIN_MAP_CALLOUTS.map((c, i) => ({
              n: i + 1,
              head: `${c.sites.join(" / ")} · ${c.region} · ${fmtUv(meanUv(c.sites))} · ${c.band}`,
              text: c.sentence,
            }))}
            scanLine={
              <>
                {BRAIN_MAP_POINTS} sites &middot; Passive, nothing to do &middot;
                Not a diagnosis
              </>
            }
            plan={
              <PhotoFrame
                src="/images/session-wide.jpg"
                alt="A LENS session in progress at Harmonized Brain Centers: a practitioner places a small sensor behind a seated client's ear while he looks ahead, a bright window behind them"
                position="60% 35%"
                className="bms-plan-ph"
                sizes="(max-width: 1023px) calc(100vw - 72px), 720px"
              />
            }
            actions={<TalkCta variant="invert" />}
            about={
              <Link href="/brain-map" className="bms-about">
                About the Harmonized Brain Map &rarr;
              </Link>
            }
            caption={
              <>
                A sample Brain Map &mdash; {BRAIN_MAP_POINTS} sites, measured in
                microvolts. Not a diagnosis.
              </>
            }
          />
        </div>
      </section>

      {/* "Your first visit" — its own centred block directly under the
          Brain Map band (Ben, 2026-11-23; until then a small card inside
          the band, under the button). The one place the homepage prints the
          price, as body text (never a button, never the hero): the duration
          and HSA/FSA line from lib/site-config.ts, and the cost sentence as
          /faq's "What does it cost?" says it (lib/faq.ts →
          FIRST_VISIT_COST_SENTENCE). The two links are the ones the
          homepage's steps used for /first-visit and /how-lens-works. */}
      <section className="home-visit" aria-labelledby="home-visit-h">
        <div className="wrap">
          <div className="home-visit-in rv">
            <h3 className="home-visit-h" id="home-visit-h">
              Your first visit
            </h3>
            <p className="home-visit-facts">
              <span>
                {FIRST_VISIT_DURATION.charAt(0).toUpperCase() +
                  FIRST_VISIT_DURATION.slice(1)}
              </span>{" "}
              &middot; <span>Map + written plan</span> &middot;{" "}
              <span>{HSA_FSA_ACCEPTED}</span>
            </p>
            <p className="home-visit-cost">{FIRST_VISIT_COST_SENTENCE}</p>
            <p className="home-visit-links">
              <Link href="/first-visit">
                See what the first visit is like &rarr;
              </Link>
              <Link href="/how-lens-works">See how LENS works &rarr;</Link>
            </p>
          </div>
        </div>
      </section>

      {/* Client stories (Ben, 2026-11-22): the featured story and one Google
          review side by side, stacked on a phone. Both quoted exactly as
          they are everywhere else on the site; the heading, the link and
          the "Individual experiences vary." line are the ones the stories
          already carry (here and on /stories). */}
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
            <div className="story-pair rv">
              {featuredStory && (
                <Quote
                  theme={featuredStory.theme}
                  text={featuredStory.text}
                  attribution={
                    featuredStory.firstName
                      ? `${featuredStory.firstName} ${featuredStory.lastInitial ?? ""} · ${featuredStory.relationship}`
                      : featuredStory.relationship
                  }
                  place={featuredStory.city}
                  sample={!featuredStory.verified}
                />
              )}
              {googleReview && <GoogleReviewQuote review={googleReview} />}
            </div>
            <p className="sample-note rv">{EXPERIENCES_DISCLAIMER}</p>
            {SHOW_DRAFT_CONTENT && VERIFIED_TESTIMONIALS.length === 0 && (
              <p className="sample-note">{SAMPLE_QUOTES_NOTE}</p>
            )}
          </div>
        </section>
      )}

      {/* The team, or the founder — one section, one switch (Ben,
          2026-11-22): FOUNDER_PAGE_PUBLISHED in lib/site-config.ts, the
          same flag that publishes the rewritten founder page. False: the
          team version, in /about's own words — its eyebrow, its headline,
          its opening sentence and its photo. True: the founder version, in
          the approved founder page's words (components/FounderStory.tsx) —
          its eyebrow, her name, its opening sentence and her photo. */}
      <section className="sec home-team">
        <div className="wrap split">
          {FOUNDER_PAGE_PUBLISHED ? (
            <>
              <div className="rv">
                <PhotoFrame
                  src="/images/founder.jpg"
                  alt={`${FOUNDER_DISPLAY_NAME}, Founder & Clinical Director of Harmonized Brain Centers`}
                  position="center 20%"
                  height={460}
                />
              </div>
              <div className="rv">
                <div className="eyebrow">Founder &amp; Clinical Director</div>
                <h2>{FOUNDER_DISPLAY_NAME}</h2>
                <p>
                  The clinical standard behind every Harmonized practitioner
                  &mdash; and the reason the check-in question is always
                  &ldquo;how are you actually feeling?&rdquo;
                </p>
                <Btn href="/about/founder" variant="ghost" arrow>
                  The founder&rsquo;s story
                </Btn>
              </div>
            </>
          ) : (
            <>
              <div className="rv">
                <PhotoFrame
                  src="/images/session-wide.jpg"
                  alt="A wide view of a calm Harmonized session room"
                  position="center 40%"
                  height={460}
                />
              </div>
              <div className="rv">
                <div className="eyebrow">About Harmonized Brain Centers</div>
                <h2>
                  Large enough to trust. Personal enough to{" "}
                  <em className="sage">care.</em>
                </h2>
                <p>
                  Harmonized Brain Centers is a team of trained LENS
                  practitioners serving adults, children, and families across
                  Middle Tennessee &mdash; one care model, multiple centers
                  {sessionCount && (
                    <>, and {sessionCount} sessions of experience</>
                  )}
                  .
                </p>
                <Btn href="/about" variant="ghost" arrow>
                  About Harmonized Brain Centers
                </Btn>
              </div>
            </>
          )}
        </div>
        {/* The founder note, as the homepage carried it (Ben, 2026-11-22):
            her photo, the line, and "Her story" — the route to her page.
            Under the team version only; the founder version above is
            already hers. */}
        {!FOUNDER_PAGE_PUBLISHED && (
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
        )}
      </section>

      {/* Locations (Ben, 2026-11-22): the two open centers as cards — photo,
          address, hours, the center's own number as a call link — and
          Franklin as a slim strip under them rather than a third card. The
          strip's words are the Franklin card's own. */}
      <section className="sec sec-ivory2 home-locations">
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
          <div className="loc-grid home-loc-grid rv">
            <HomeLocationCard
              location={nashville}
              blurb="A calm, comfortable center serving Davidson County."
            />
            <HomeLocationCard
              location={murfreesboro}
              blurb="The same standard of care, closer to home in Rutherford County."
            />
          </div>
          <div className="franklin-strip rv">
            <p>
              <b>
                {franklin.name} <span className="soon">Coming soon</span>{" "}
                <ConfirmTag>{FRANKLIN_OPENING.note!}</ConfirmTag>
              </b>
              {/* The county, as the Franklin card and page name it. */}
              <span className="franklin-county">{franklin.county}</span>
              <span>
                Start at Nashville or Murfreesboro now and transfer when we
                open.
              </span>
            </p>
            <Link className="go" href={`/locations/${franklin.slug}`}>
              What&rsquo;s coming to {franklin.name} &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Five questions (see `homeFaqs` above), every answer verbatim. The
          heading is /faq's own label; the eyebrow and both lines under the
          accordion are the ones this section already carried. */}
      <section className="sec sec-tight home-faq">
        <div className="wrap" style={{ maxWidth: 900 }}>
          <div className="sec-head rv">
            <div className="eyebrow">Before you call</div>
            <h2>Frequently asked questions</h2>
          </div>
          <FAQAccordion items={homeFaqs} openFirst />
          <Btn href="/faq" variant="ghost" arrow style={{ marginTop: 30 }}>
            All questions, answered plainly
          </Btn>
          {/* The skepticism page, as one quiet line. */}
          <p className="micro rv" style={{ marginTop: 18 }}>
            Skeptical? Read{" "}
            <Link href="/is-lens-safe">what we can and can&rsquo;t tell you</Link>
            .
          </p>
        </div>
      </section>

      {/* The closing band, with its existing copy; on this page the number
          is a call link with a text link beside it (location "home_final"). */}
      <FinalCTA contactLinks />
      {/* The guide band, for the visitor who is not calling today — the same
          component, heading and events the homepage carried (Ben,
          2026-11-22), last before the footer. */}
      <GuideCta headingLead="Four problems, one explanation. Read" />
    </div>
  );
}
