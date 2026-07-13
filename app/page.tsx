import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import PhotoFrame from "@/components/PhotoFrame";
import ProofBand from "@/components/ProofBand";
import ConcernCard from "@/components/ConcernCard";
import Quote from "@/components/Quote";
import LocationCard from "@/components/LocationCard";
import FAQAccordion from "@/components/FAQAccordion";
import FinalCTA from "@/components/FinalCTA";
import { Btn, TalkCta } from "@/components/Buttons";
import ConfirmTag from "@/components/ConfirmTag";
import { locations } from "@/lib/locations";
import {
  PHONE_DISPLAY,
  REVIEWS,
  SAMPLE_QUOTES_NOTE,
  TRISHA_APPROVAL_TAG,
  TRISHA_QUOTE,
  TRISHA_VIDEO_URL,
  FOUNDER_DISPLAY_NAME,
} from "@/lib/site-config";

export const metadata: Metadata = {
  title: { absolute: "Feel like yourself again — Harmonized Brain Centers" },
};

const homeConcerns = [
  {
    title: "Anxiety & nervous-system overload",
    audience: "Adults & children",
    points: [
      "Thoughts that won't quiet down",
      "Feeling constantly on edge",
      "Overreacting to small stressors",
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
      "Procrastinating on things you care about",
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
      "Inconsistent, unpredictable sleep",
    ],
    href: "/concerns/sleep",
  },
  {
    title: "Emotional regulation",
    audience: "Often children — and their parents",
    points: [
      "Becoming overwhelmed quickly",
      "Intense reactions that are hard to stop",
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
      "Forgetting why you entered the room",
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
      "Wanting to handle normal stress normally",
    ],
    href: "/concerns/stress-resilience",
  },
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
    a: "It genuinely varies. We track how you feel at every visit, review progress together, and never ask you to commit to a long program up front.",
  },
];

export default function HomePage() {
  const [nashville, murfreesboro, franklin] = locations;

  return (
    <>
      <section className="hero wrap">
        <div className="hero-grid">
          <div className="rv">
            <div className="eyebrow">
              LENS Neurofeedback &middot; Adults &amp; Children &middot; Middle
              Tennessee
            </div>
            <h1>
              Feel like <em className="sage">yourself</em> again.
            </h1>
            <p className="sub">
              Gentle, noninvasive neurofeedback support for anxiety, focus and
              ADHD, sleep, emotional regulation, brain fog, and stress &mdash;
              delivered by trained practitioners at centers across Middle
              Tennessee.
            </p>
            <div className="hero-ctas">
              <TalkCta />
              <Btn href="/how-lens-works" variant="ghost" arrow>
                See how LENS works
              </Btn>
            </div>
            <p className="micro">
              A free, no-pressure conversation. Ask anything &mdash; including
              the skeptical questions.
            </p>
          </div>
          <div className="rv">
            <PhotoFrame
              src="/images/hero.jpg"
              alt="A calm LENS neurofeedback session at Harmonized Brain Centers"
              position="46% 24%"
              height={620}
              className="hero-ph"
              sizes="(max-width: 1060px) 100vw, 47vw"
              priority
            />
          </div>
        </div>
      </section>

      <ProofBand
        stats={[
          { stat: "140,000+", label: "LENS sessions provided across our centers" },
          {
            stat: "3 centers",
            label: "Nashville · Murfreesboro · Franklin (coming soon)",
          },
          {
            stat: "All ages",
            label: "Adults, teens, and children welcomed at every center",
          },
          {
            stat: "Since 2016",
            label: "Serving Middle Tennessee families for nearly a decade",
          },
        ]}
      />

      {/* Trisha Yearwood band — embedding is disabled for this video, so this
          is a thumbnail linking out to YouTube. Never replace with an iframe. */}
      <section className="sec-navy celeb-band">
        <div className="wrap celeb-grid">
          <div className="rv">
            <div className="eyebrow" style={{ color: "var(--sage)" }}>
              In her own words
            </div>
            <div className="celeb-name">Trisha Yearwood</div>
            <div className="celeb-role">
              Grammy&reg;-winning artist &middot; on her experience at
              Harmonized
            </div>
            <div className="celeb-quote">&ldquo;{TRISHA_QUOTE}&rdquo;</div>
            <div
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
          </a>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="sec-head split rv">
            <div>
              <div className="eyebrow">What we help with</div>
              <h2>
                If any of this describes your daily life, you&rsquo;re in the
                right place.
              </h2>
            </div>
            <Btn href="/what-we-help-with" variant="ghost" arrow>
              Explore every concern
            </Btn>
          </div>
          <div className="concern-grid rv">
            {homeConcerns.map((c) => (
              <ConcernCard key={c.href} {...c} />
            ))}
          </div>
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
                Sensory overwhelm. A child starting to say &ldquo;I&rsquo;m
                just bad at school.&rdquo; There&rsquo;s nothing your child has
                to get right in a LENS session, and a parent joins every
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
              style={{ minHeight: 340 }}
              sizes="(max-width: 1060px) 100vw, 50vw"
            />
          </div>
        </div>
      </section>

      <section className="sec sec-ivory2">
        <div className="wrap goals-grid">
          <div className="rv">
            <div className="eyebrow">What could change</div>
            <h2 style={{ margin: "22px 0 18px" }}>
              The goals our clients name most often are small, concrete, and
              worth everything.
            </h2>
            <div className="note-sage">
              These are the areas clients most often hope to support &mdash;
              framed honestly. LENS is not a guaranteed outcome, and every
              nervous system responds differently. We track your experience at
              every visit so progress is never a guessing game.
            </div>
          </div>
          <ul className="goals-list rv">
            <li>Calmer mornings, fewer standoffs</li>
            <li>Falling asleep more easily</li>
            <li>Greater focus at school or work</li>
            <li>Recovering from frustration faster</li>
            <li>Feeling less mentally exhausted</li>
            <li>Remembering conversations and tasks</li>
            <li>More patience with the people you love</li>
            <li>Handling normal stress without overwhelm</li>
            <li>Following through on what you start</li>
            <li>Feeling more like yourself again</li>
          </ul>
        </div>
      </section>

      <section className="sec">
        <div className="wrap lens-grid">
          <div className="rv">
            <div className="eyebrow">How LENS works</div>
            <h2 style={{ margin: "22px 0 18px" }}>Feedback, not force.</h2>
            <p style={{ marginBottom: 16 }}>
              LENS &mdash; the Low Energy Neurofeedback System &mdash; reads
              your brain&rsquo;s activity through small sensors and reflects a
              faint, imperceptible signal back to it: a clearer mirror the
              brain can use to notice its own stuck patterns and support its
              natural ability to settle and regulate.
            </p>
            <p className="sub" style={{ fontSize: 16 }}>
              Nothing is forced and nothing is added. It&rsquo;s a wellness
              service &mdash; not a medical treatment &mdash; and experiences
              vary.
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
          <div className="lens-seq rv">
            {[
              {
                n: "1",
                h: "Sit back",
                p: "A comfortable chair, a quiet room, small sensors placed gently on the scalp.",
              },
              {
                n: "2",
                h: "Nothing to perform",
                p: "No screens, tasks, or concentrating. Children don't have to sit perfectly still.",
              },
              {
                n: "3",
                h: "Brief by design",
                p: "Most visits fit inside a lunch break or a school pickup.",
              },
              {
                n: "4",
                h: "Reviewed with you",
                p: "Sleep, mood, focus, and energy are tracked at every visit — and your plan adjusts.",
              },
            ].map((r) => (
              <div className="row" key={r.n}>
                <div className="n">{r.n}</div>
                <div>
                  <h4>{r.h}</h4>
                  <p>{r.p}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="sec sec-navy">
        <div className="wrap">
          <div className="sec-head rv">
            <div className="eyebrow">The client journey</div>
            <h2>One clear path, the same at every center.</h2>
            <p className="sub">
              No referral needed, nothing to prepare, and you&rsquo;ll always
              know what comes next.
            </p>
          </div>
          <div className="journey rv">
            {[
              {
                n: "1",
                h: "Talk with us",
                p: "A free conversation — phone or in person. Ask anything.",
              },
              {
                n: "2",
                h: "Consult & map",
                p: "A gentle assessment of how your brain is currently working.",
              },
              {
                n: "3",
                h: "Begin sessions",
                p: "A personalized series of short, comfortable LENS visits.",
              },
              {
                n: "4",
                h: "Track what matters",
                p: "Sleep, focus, mood, and energy reviewed at every check-in.",
              },
              {
                n: "5",
                h: "Adjust as needed",
                p: "Your plan follows your experience — never a template.",
              },
            ].map((s) => (
              <div className="jstep" key={s.n}>
                <div className="n">{s.n}</div>
                <h3>{s.h}</h3>
                <p>{s.p}</p>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: 70,
              display: "flex",
              gap: 26,
              alignItems: "center",
            }}
            className="rv"
          >
            <Btn href="/first-visit" variant="invert">
              See what the first visit is like
            </Btn>
            <span style={{ color: "rgba(251,248,241,.55)", fontSize: 15 }}>
              Most new clients start within a week of their first call.
            </span>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="sec-head rv">
            <div className="eyebrow">The Harmonized care model</div>
            <h2>
              The same standard of care, at every center, from every
              practitioner.
            </h2>
          </div>
          <div className="care-grid rv">
            {[
              {
                h: "Trained to one standard",
                p: "Every practitioner completes the same founder-led LENS training and works from the same clinical playbook — so your experience doesn't depend on which center you walk into.",
              },
              {
                h: "Progress tracked at every visit",
                p: "A structured check-in on sleep, mood, focus, and energy opens every session. Your plan is adjusted from your data, not from habit.",
              },
              {
                h: "Team-based care",
                p: "Your practitioner stays with you, and the wider team reviews progress together — you're never dependent on a single person's availability.",
              },
              {
                h: "Honest by policy",
                p: "No large packages sold up front, no promised outcomes, and a plain answer if we think LENS isn't the right fit for you.",
              },
            ].map((c) => (
              <div className="care" key={c.h}>
                <h4>{c.h}</h4>
                <p>{c.p}</p>
              </div>
            ))}
          </div>
          <div className="founder-note rv">
            <PhotoFrame
              src="/images/founder.jpg"
              alt="Sheri, Founder & Clinical Director of Harmonized Brain Centers"
              position="center 22%"
              height={230}
              sizes="200px"
            />
            <div>
              <blockquote>
                &ldquo;We built Harmonized so that every family gets the same
                thing my first clients got: someone who listens longer than any
                appointment they&rsquo;ve ever had &mdash; and a gentle option
                that works with the brain, not against it.&rdquo;
              </blockquote>
              <cite>
                {FOUNDER_DISPLAY_NAME} &middot; Founder &amp; Clinical Director
                &middot; <Link href="/about/founder">Her story →</Link>
              </cite>
            </div>
          </div>
        </div>
      </section>

      <section className="sec sec-ivory2">
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
            <Quote
              theme="Focus · Children"
              text="For the first time in two years, homework isn't a fight. He sits down, does it, and moves on. I didn't realize how much tension had left the house until it was gone."
              attribution="Parent of a 9-year-old"
              place="Nashville"
            />
            <Quote
              theme="Sleep · Adults"
              text="I came in exhausted and skeptical. What sold me was that nobody oversold anything — they just kept asking how I was sleeping. By week four: better than I had in years."
              attribution="Adult client"
              place="Murfreesboro"
            />
          </div>
          <div className="review-band rv">
            <div>
              <strong>{REVIEWS.rating} ★</strong>
              <span>Google rating across locations</span>
              <span className="todo">{REVIEWS.ratingTodo}</span>
            </div>
            <div>
              <strong>{REVIEWS.count}</strong>
              <span>From Nashville &amp; Murfreesboro clients</span>
              <span className="todo">{REVIEWS.countTodoHome}</span>
            </div>
            <div>
              <strong>Video stories</strong>
              <span>Client interviews, in their own words</span>
              <span className="todo">{REVIEWS.videoTodoHome}</span>
            </div>
          </div>
          <p className="sample-note">{SAMPLE_QUOTES_NOTE}</p>
        </div>
      </section>

      <section className="sec">
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
                  <b>[Street address]</b>
                  <br />
                  Mon&ndash;Fri 9a&ndash;6p &middot; Sat by appt
                  <br />
                  {PHONE_DISPLAY}
                </>
              }
            />
            <LocationCard
              location={murfreesboro}
              plateSpecOverride="Murfreesboro interior — reception or session room, natural light"
              meta={
                <>
                  <b>[Street address]</b>
                  <br />
                  Mon&ndash;Fri 9a&ndash;6p &middot; Sat by appt
                  <br />
                  {PHONE_DISPLAY}
                </>
              }
            />
            <LocationCard
              location={franklin}
              plateSpecOverride="Franklin exterior — storefront at golden hour"
              meta={
                <>
                  <b>Opening [DATE — confirm]</b>
                  <br />
                  Join the waitlist for founding-client openings
                  <br />
                  {PHONE_DISPLAY}
                </>
              }
            />
          </div>
        </div>
      </section>

      <section className="sec sec-tight">
        <div className="wrap" style={{ maxWidth: 900 }}>
          <div className="sec-head rv">
            <div className="eyebrow">Before you call</div>
            <h2>The three questions everyone asks first.</h2>
          </div>
          <FAQAccordion items={homeFaqs} />
          <Btn href="/faq" variant="ghost" arrow style={{ marginTop: 30 }}>
            All questions, answered plainly
          </Btn>
        </div>
      </section>

      <FinalCTA />
    </>
  );
}
