import Link from "next/link";
import type { Metadata } from "next";
import BrainMapFigure from "@/components/BrainMapFigure";
import PlaceholderPlate from "@/components/PlaceholderPlate";
import FinalCTA from "@/components/FinalCTA";
import Breadcrumbs from "@/components/Breadcrumbs";
import PageSchema from "@/components/PageSchema";
import { Btn, BrainMapCta, TalkCta } from "@/components/Buttons";
import { LENS_IS_NOT } from "@/lib/lens";
import { hubTrail, pageMetadata } from "@/lib/pages";
import {
  BRAIN_MAP_NAME,
  BRAIN_MAP_POINTS,
  BRAIN_MAP_PRICE,
  COURSE_VARIES_NOTE,
  FIRST_VISIT_DURATION,
  FULL_COURSE,
  SESSION_LENGTH,
  SESSION_PRICE,
} from "@/lib/site-config";

/**
 * /brain-map — the page that owns "brain map", "qEEG" and "EEG".
 *
 * ## Why it exists
 *
 * The brain-mapping cluster (432 impressions at position 22 in the Oct 2026
 * pull — QUERY-TO-PAGE-MAP.md) was landing on a homepage *section*, and a
 * section cannot rank for a term a page owns. So the section's copy, the
 * four-site "where we look" passage from /how-lens-works, and the render all
 * moved here; the homepage keeps a two-sentence handoff and /how-lens-works
 * a one-paragraph one. One cluster, one page — rule 1.
 *
 * The render is components/BrainMapFigure.tsx: the homepage stage's heat
 * map with its Map / Bars toggle, same dataset, same frame (2026-10-20). The
 * hero stacks the copy over it for the reason the homepage section gives it
 * three-fifths of the row — neither drawing is legible in half a column.
 *
 * ## The rule this page is written under
 *
 * The Brain Map is **a recording that guides a plan**. It is never called a
 * test, assessment, evaluation, screening or diagnostic — the words
 * QUERY-TO-PAGE-MAP.md rules out targeting — and the one section that names
 * "EEG" and "qEEG" does so to say what the words mean *here*, not to claim a
 * clinical procedure. Every figure interpolates from lib/site-config.ts.
 *
 * ## Mirrored
 *
 * Three passages of this page are in the assistant's index
 * (lib/chat/site-copy.ts → `page:brain-map:*`). Edit a paragraph here and
 * `npm run check:index` fails until the mirror moves with it.
 */

// Title, description and the page's content date live in lib/pages.ts.
export const metadata: Metadata = pageMetadata("/brain-map");

const recordingSteps = [
  {
    n: "1",
    h: "We talk first",
    p: "What's going on, what you've tried, what you're hoping changes. The conversation comes before any sensor, and it's the longest part on purpose.",
  },
  {
    n: "2",
    h: "Brief readings at each point",
    p: "Small sensors take brief readings at a standard set of points across the scalp — nothing invasive, nothing to feel, and nothing a child has to sit still for.",
  },
  {
    n: "3",
    h: "Your map, point by point",
    // "A chart you can read, site by site" — what a client is handed today;
    // the hero shows it as the heat map and, one tap away, the bars.
    p: "We turn the readings into a chart you can read, site by site, and walk you through it — where activity is running high, where it's running quiet, and how that lines up with what you came in describing.",
  },
  {
    n: "4",
    h: "Your written plan",
    p: "You leave with a plan you keep, in plain language, with every question answered.",
  },
];

export default function BrainMapPage() {
  const trail = hubTrail("/brain-map");
  return (
    <>
      <PageSchema path="/brain-map" breadcrumb={trail} />
      <Breadcrumbs trail={trail} />

      <section className="page-hero">
        <div className="wrap">
          <div className="rv" style={{ maxWidth: 760 }}>
            <div className="eyebrow">{BRAIN_MAP_NAME}</div>
            <h1>
              A recording of your brain&rsquo;s activity &mdash;{" "}
              <em className="sage">not a test.</em>
            </h1>
            <p className="sub">
              On your first visit we record electrical activity at{" "}
              {BRAIN_MAP_POINTS} points across your head, turn it into a map
              you can actually read, and build your written plan from it.
              Here&rsquo;s exactly what that involves, what it costs, and what
              it can&rsquo;t tell you.
            </p>
            <div className="hero-ctas" style={{ marginTop: 34 }}>
              <TalkCta />
              <BrainMapCta />
            </div>
            <p className="micro">
              {BRAIN_MAP_PRICE} &middot; Plan for {FIRST_VISIT_DURATION}{" "}
              &middot; It is your first visit
            </p>
          </div>
          <div className="rv">
            {/* The render (see GRAPHICS CORRECTIONS in lib/site-config.ts).
                Inline SVG over a small field PNG, so the H1 stays the LCP
                candidate; `priority` is a no-op kept for the call site. */}
            <BrainMapFigure priority />
          </div>
        </div>
      </section>

      {/* The rule, stated plainly and first. Three lead-ins in the order the
          thing happens: what it is, what it isn't, what it's for. Mirrored as
          page:brain-map:what. */}
      <section className="sec">
        <div className="wrap" style={{ maxWidth: 880 }}>
          <div className="sec-head rv">
            <div className="eyebrow">The rule we hold to</div>
            <h2>A recording that guides a plan.</h2>
          </div>
          <div className="rv split-prose">
            <p>
              <b>It&rsquo;s a recording.</b> Small sensors read the
              brain&rsquo;s electrical activity at each point, and nothing goes
              in &mdash; the same listening a LENS session starts with, held
              for a few moments at each site.
            </p>
            <p>
              <b>It isn&rsquo;t a test.</b> There&rsquo;s nothing to pass or
              fail, nothing it diagnoses, and no result that says what you
              have. Nobody here reads it for a condition, and we&rsquo;d tell
              you the same thing on the phone.
            </p>
            <p>
              <b>It guides a plan.</b> The pattern across all{" "}
              {BRAIN_MAP_POINTS} points, set against what you told us on the
              phone and in the room, is what your written plan is built from.
              The map tells us where to look. You tell us what matters.
            </p>
          </div>
        </div>
      </section>

      <section className="sec sec-ivory2">
        <div className="wrap" style={{ maxWidth: 940 }}>
          <div className="sec-head rv">
            <div className="eyebrow">What the recording involves</div>
            <h2>
              {BRAIN_MAP_POINTS} points, {FIRST_VISIT_DURATION}, and a
              conversation first.
            </h2>
          </div>
          <div
            className="lens-seq rv"
            style={{ borderTop: "1px solid var(--line)" }}
          >
            {recordingSteps.map((s) => (
              <div className="row" key={s.n}>
                <div className="n">{s.n}</div>
                <div>
                  <h3>{s.h}</h3>
                  <p>{s.p}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Where we look. Moved here from /how-lens-works (Oct 2026) with its
          grammar intact — read the note that travelled with it: each
          paragraph names a function, then says this is where we would LOOK
          when someone describes something. None of them says a site causes,
          indicates, or measures a symptom, and none may be rewritten into "T4
          explains a short fuse". The closing paragraph is the point of the
          section: one site on its own is not read at all. No site carries a
          value, because a published threshold is a line a reader holds their
          own map up against. Mirrored as page:brain-map:map. */}
      <section className="sec">
        <div className="wrap">
          <div className="sec-head rv">
            <h2>Where we look, and why</h2>
            <p className="sub">
              A Brain Map records {BRAIN_MAP_POINTS} points. Four we come back
              to most:
            </p>
          </div>
          <div className="split">
            <div className="rv">
              <p>
                <b>Fp1 &mdash; left frontal.</b> Sustained attention and
                getting started on things. When someone tells us about homework
                that takes three hours, or projects that stall at 90 percent,
                this is one of the first places we look.
              </p>
              <p>
                <b>Fp2 &mdash; right frontal.</b> Impulse control &mdash; the
                pause between wanting to do something and doing it. Parents
                describing a child who blurts, interrupts, or acts before
                thinking are describing something we&rsquo;d read here.
              </p>
              <p>
                <b>T4 &mdash; right temporal.</b> Emotional regulation and
                emotional memory. Someone with a short fuse, reactions that
                feel outsized, or a slow recovery after being upset is someone
                we&rsquo;d look here for.
              </p>
              <p>
                <b>Cz &mdash; central midline.</b> Sensory sensitivity. This is
                one we read when someone describes being overwhelmed by noise,
                tags, crowds, or transitions.
              </p>
              <p>
                We don&rsquo;t read any of these alone. One site tells you very
                little &mdash; the pattern across all {BRAIN_MAP_POINTS}, set
                against what you told us on the phone, is what your written
                plan is built from.
              </p>
            </div>
            <div className="rv">
              <PlaceholderPlate spec="Brain lobe function diagram" />
            </div>
          </div>
        </div>
      </section>

      {/* What the plan contains. Every card restates something the site
          already publishes — the first-visit five parts, the course, the
          taper caveat, the check-in — so nothing here is a promise the rest
          of the site does not make. Mirrored as page:brain-map:plan. */}
      <section className="sec sec-ivory2">
        <div className="wrap">
          <div className="sec-head rv">
            <div className="eyebrow">What you keep</div>
            <h2>What the written plan actually contains.</h2>
          </div>
          <div className="care-grid rv">
            <div className="care">
              <h3>What we noticed</h3>
              <p>
                What the recording shows, set against what you described. We
                walk you through the map point by point rather than handing
                you a report.
              </p>
            </div>
            <div className="care">
              <h3>What we&rsquo;d suggest</h3>
              <p>
                A recommended course. A full course is{" "}
                {FULL_COURSE.value.sessions} sessions, then maintenance, and{" "}
                {FULL_COURSE.value.children}. {COURSE_VARIES_NOTE}
              </p>
            </div>
            <div className="care">
              <h3>What it costs</h3>
              <p>
                Regular sessions are {SESSION_PRICE} and run{" "}
                {SESSION_LENGTH.value}. The full price list, including the
                package, is on{" "}
                <Link href="/first-visit">Your First Visit</Link>.
              </p>
            </div>
            <div className="care">
              <h3>What we&rsquo;d track</h3>
              <p>
                Sleep, mood, focus, energy &mdash; asked about at every visit,
                so the plan follows what you actually report rather than the
                map alone.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The words people search, and the boundary. "EEG" and "qEEG" appear
          here to say what they mean on this site — a recording of electrical
          activity — and nowhere else. The limits list is the same one
          /how-lens-works carries, read from lib/lens.ts so the two pages
          cannot drift. */}
      <section className="sec">
        <div className="wrap split" style={{ alignItems: "start" }}>
          <div className="rv">
            <div className="eyebrow">EEG, qEEG, brain mapping</div>
            <h2>What the words mean here.</h2>
            <p>
              People searching for an EEG brain map or a qEEG are usually
              looking for the same thing: a recording of the brain&rsquo;s
              electrical activity, shown as a map. That is what{" "}
              {BRAIN_MAP_NAME} is &mdash; {BRAIN_MAP_POINTS} points of
              electrical amplitude, shown site by site in a chart you can
              read.
            </p>
            <p>
              What it isn&rsquo;t is a medical test. It isn&rsquo;t ordered by
              a doctor, it isn&rsquo;t read for a diagnosis, and it
              doesn&rsquo;t come with a clinical report. It comes with a
              conversation and a plan.
            </p>
          </div>
          <div className="rv">
            <div className="eyebrow">What it can&rsquo;t tell you</div>
            <p style={{ margin: "22px 0 6px" }}>
              The map is part of LENS, and LENS is not:
            </p>
            <ul className="goals-list" style={{ columnCount: 1 }}>
              {LENS_IS_NOT.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>
        <div className="wrap">
          <div className="hero-ctas rv" style={{ marginTop: 44 }}>
            <Btn href="/first-visit" variant="ghost" arrow>
              The first visit, minute by minute
            </Btn>
            <Btn href="/how-lens-works" variant="ghost" arrow>
              How a session works
            </Btn>
            <Btn href="/faq" variant="ghost" arrow>
              The full FAQ
            </Btn>
          </div>
        </div>
      </section>

      <FinalCTA
        heading="Questions about the recording? Ask someone who reads them every day."
        sub="Call or send a note — a practitioner will tell you plainly what the map can and can't tell you, before you book anything."
      />
    </>
  );
}
