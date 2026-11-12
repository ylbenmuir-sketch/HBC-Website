import Link from "next/link";
import LimitLine from "@/components/LimitLine";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import PhotoFrame from "@/components/PhotoFrame";
import PlaceholderPlate from "@/components/PlaceholderPlate";
import Quote from "@/components/Quote";
import FAQAccordion from "@/components/FAQAccordion";
import FinalCTA from "@/components/FinalCTA";
import CompactReview from "@/components/CompactReview";
import GoogleReviewQuote from "@/components/GoogleReviewQuote";
import GuideCta from "@/components/GuideCta";
import { Btn, CtaReassure, TalkCta } from "@/components/Buttons";
import PageSchema from "@/components/PageSchema";
import ReadMore from "@/components/ReadMore";
import VideoBand from "@/components/VideoBand";
import { concerns, getConcern } from "@/lib/concerns";
import { EXPERIENCES_DISCLAIMER, PHONE_DISPLAY, PHONE_TEL, SHOW_PHONE, storyForConcern } from "@/lib/site-config";
import { articlesForConcern } from "@/lib/resources";
import { faqQuestions } from "@/lib/schema";
import { videoForPage } from "@/lib/videos";

export function generateStaticParams() {
  return concerns.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const concern = getConcern((await params).slug);
  if (!concern) return {};
  return {
    // `absolute`, so the root layout's " — Harmonized Brain Centers" template
    // does not apply. Same reasoning as /resources/[slug]: 27 characters of
    // suffix put every one of these titles into the 61-69 band Google starts
    // truncating, and the brand is not what the page competes on. A title that
    // already opens "Neurofeedback for …" identifies itself; og:site_name
    // carries the brand into link previews either way.
    title: { absolute: concern.metaTitle },
    description: concern.metaDescription,
  };
}

export default async function ConcernPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const concern = getConcern((await params).slug);
  if (!concern) notFound();

  const related = concern.related
    .map(getConcern)
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  const medical = concern.medicalFirst;

  // The articles that link up to this concern, linking back down. Derived from
  // their own handoff blocks, so the loop cannot half-close — see
  // articlesForConcern in lib/resources.ts.
  const reading = articlesForConcern(concern.slug);
  // Its one video, after the body copy — below the fold on every viewport
  // (lib/videos.ts → `home`, VIDEO-MAP.md).
  const video = videoForPage(`/concerns/${concern.slug}`);
  // One story in the client's own words, where one matches this concern
  // (lib/site-config.ts → storyForConcern): a permissioned client story on
  // three concerns, a labelled Google review on the other nine (Ben,
  // 2026-11-02). Null means the section is simply not there.
  const story = storyForConcern(concern.slug);
  const isGoogle = story?.source === "google";
  const trail = [
    { label: "What We Help With", href: "/what-we-help-with" },
    { label: concern.title },
  ];

  return (
    <>
      {/* One page node, typed FAQPage as well when the concern carries
          questions, with the Q&A as its mainEntity — rather than a second
          page-typed node for the same URL. */}
      <PageSchema
        path={`/concerns/${concern.slug}`}
        breadcrumb={trail}
        page={{
          type: concern.faqs.length > 0 ? ["WebPage", "FAQPage"] : "WebPage",
          name: concern.metaTitle,
          description: concern.metaDescription,
          dateModified: concern.dateModified,
          ...(concern.image ? { image: concern.image.src } : {}),
          ...(concern.faqs.length > 0
            ? { mainEntity: faqQuestions(concern.faqs) }
            : {}),
        }}
      />
      {/* On the two answer-first pages the crumb is hidden on phones
          (globals.css → `.crumb-desk`): it was 48–70px of the first screen. */}
      {concern.firstScreen ? (
        <div className="crumb-desk">
          <Breadcrumbs trail={trail} />
        </div>
      ) : (
        <Breadcrumbs trail={trail} />
      )}

      {/* The opening, both layouts (Ben, 2026-11-02): eyebrow, H1, the intro
          sentence, then — where the concern has a quote — the compact review
          (components/CompactReview.tsx) and Get Started directly under it,
          so the H1, the review and the button share the first screen at
          390×844. The full card keeps its place further down. */}
      {medical ? (
        /* The medical-first hero (concussion, migraines, depression).

           One column, no photo. The "start with a doctor" block follows the
           opening and the CTAs, styled as the widest and darkest text on the
           page — see `.medical-first` — because a warning styled like a
           footnote is read like one. Depression carries no `urgent` block
           (Ben, 2026-11-02): its opening runs straight into the lead. */
        <section className="page-hero concern-hero">
          <div className="wrap" style={{ maxWidth: 860 }}>
            <div className="rv">
              <div className="eyebrow">{concern.heroEyebrow}</div>
              <h1 style={{ maxWidth: "none" }}>
                {concern.titleLead}
                <em className="sage">{concern.titleAccent}</em>
              </h1>
              <p className="sub">{concern.heroSub}</p>
              {story && <CompactReview review={story} />}
              <div className="hero-ctas" style={{ marginTop: story ? 26 : 34 }}>
                <TalkCta />
                <Btn href="/how-lens-works" variant="ghost" arrow>
                  How LENS works
                </Btn>
                <CtaReassure />
              </div>
            </div>

            {medical.urgent && (
              <div className="medical-first rv">
                <p>{medical.urgent}</p>
              </div>
            )}

            <div className="medical-later rv">
              <p>{medical.laterLead}</p>
              <ul className="goals-list" style={{ columnCount: 1 }}>
                {concern.recognize.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <p>{medical.gap}</p>
            </div>
          </div>
        </section>
      ) : (
        <section className={`page-hero concern-hero${concern.firstScreen ? " concern-first" : ""}`}>
          <div className="wrap split" style={{ alignItems: "center" }}>
            {concern.firstScreen ? (
              /* The answer-first opening (Ben, 2026-11-12; lib/concerns.ts →
                 firstScreen): H1, the plain answer, one supporting line,
                 Get Started with "or text us" beside it, then the review.
                 "How LENS works" follows the review, below a phone's first
                 screen. The sms: link reports contact_link_click with
                 location concern_hero through the document listener
                 (components/Analytics.tsx) — nothing fires from here. */
              <div className="rv">
                <div className="eyebrow">Concern &middot; {concern.who}</div>
                <h1>
                  {concern.firstScreen.h1Lead}
                  <em className="sage">{concern.firstScreen.h1Accent}</em>
                </h1>
                <p className="concern-answer">{concern.firstScreen.answer}</p>
                <p className="sub">{concern.firstScreen.support}</p>
                <div className="concern-first-ctas" data-link-location="concern_hero">
                  <TalkCta />
                  {SHOW_PHONE && (
                    <a className="concern-text-us" href={`sms:${PHONE_TEL}`} aria-label={`Text us at ${PHONE_DISPLAY}`}>
                      or text us
                    </a>
                  )}
                </div>
                {story && <CompactReview review={story} />}
                <p className="concern-first-more">
                  <Btn href="/how-lens-works" variant="ghost" arrow>
                    How LENS works
                  </Btn>
                </p>
              </div>
            ) : (
            <div className="rv">
              <div className="eyebrow">Concern &middot; {concern.who}</div>
              <h1>
                {concern.titleLead}
                <em className="sage">{concern.titleAccent}</em>
              </h1>
              <p className="sub">{concern.heroSub}</p>
              {story && <CompactReview review={story} />}
              <div className="hero-ctas" style={{ marginTop: story ? 26 : 34 }}>
                <TalkCta />
                <Btn href="/how-lens-works" variant="ghost" arrow>
                  How LENS works
                </Btn>
                <CtaReassure />
              </div>
            </div>
            )}
            {/* The photo: beside the copy on a desktop, after it — under
                Get Started — once the grid stacks (globals.css ≤1060px). */}
            <div className="rv">
              {/* The LCP element on this template (SEO-AUDIT-3 §2.5). It
                  shipped `loading="lazy"` — a second of load delay before the
                  request even started under Lighthouse's throttle. `priority`
                  preloads it and sets fetchpriority=high. */}
              {concern.image ? (
                <PhotoFrame
                  src={concern.image.src}
                  alt={concern.image.alt ?? concern.title}
                  position={concern.image.position}
                  height={460}
                  sizes="(max-width: 1060px) 100vw, 47vw"
                  priority
                />
              ) : (
                <PlaceholderPlate spec={concern.plateSpec ?? ""} height={460} />
              )}
            </div>
          </div>
        </section>
      )}

      {/* "Who we work with" — straight after the opening, before anything
          else (Ben, 2026-10-15). Only where the concern has the copy. */}
      {concern.audience && (
        <section className="sec-tight audience">
          <div className="wrap">
            <div className="sec-head rv" style={{ marginBottom: 34 }}>
              <div className="eyebrow">Who we work with</div>
              <h2>{concern.audience.heading}</h2>
            </div>
            <div className="audience-grid rv">
              {concern.audience.cards.map((c) => (
                <div className="audience-card" key={c.h}>
                  <h3>{c.h}</h3>
                  <p>{c.p}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {medical ? (
        /* The body the approved copy asks for: the pattern, then who we see
           and what a first visit is. Its own headings are the copy's own bold
           lead-ins, so nothing here is a heading somebody wrote to hold the
           layout together. The `recognize` list is not repeated — it is
           published once, up in the block. */
        <>
          <section className="sec">
            <div className="wrap" style={{ maxWidth: 860 }}>
              <div className="sec-head rv" style={{ marginBottom: 26 }}>
                <div className="eyebrow">The pattern</div>
                <h2>Why this looks like the rest of our neurofeedback work.</h2>
              </div>
              <p className="rv">{concern.howHelp.p1}</p>
              {concern.bodyLink && (
                /* The honest first read, made prominent — see `bodyLink` in
                   lib/concerns.ts. A real button rather than a text link:
                   on /concerns/migraines this is the page's strongest and
                   most credible content, and it lives somewhere else. */
                <div className="rv" style={{ marginTop: 22 }}>
                  <Btn href={concern.bodyLink.href} variant="ghost" arrow>
                    {concern.bodyLink.label}
                  </Btn>
                </div>
              )}
              <LimitLine className="rv" />
              {video && <VideoBand video={video} />}
            </div>
          </section>

          <section className="sec sec-ivory2">
            <div className="wrap duo">
              <div className="rv">
                <div className="eyebrow">
                  {concern.whoEyebrow ?? "Physician referrals"}
                </div>
                <h2 style={{ margin: "22px 0 16px" }}>Who we see.</h2>
                <p>{concern.overview.approach}</p>
              </div>
              <div className="rv">
                <div className="eyebrow">Your first visit</div>
                <h2 style={{ margin: "22px 0 16px" }}>
                  What a first visit involves.
                </h2>
                <p>{concern.howHelp.p2}</p>
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className="sec">
          <div className="wrap duo">
            <div className="rv">
              <div className="eyebrow">You might recognize</div>
              <ul
                className="goals-list"
                style={{ columnCount: 1, marginTop: 26 }}
              >
                {concern.recognize.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
            <div className="rv">
              <div className="eyebrow">How LENS may help</div>
              <p style={{ margin: "26px 0 18px" }}>{concern.howHelp.p1}</p>
              <p className="sub" style={{ fontSize: 16 }}>
                {concern.howHelp.p2}
              </p>
              <LimitLine />
            </div>
          </div>
          {video && (
            <div className="wrap">
              <VideoBand video={video} />
            </div>
          )}
        </section>
      )}

      {/* Both bands drop whole when a concern ships without the copy for them,
          heading included — see `goalsHeading` in lib/concerns.ts. */}
      {/* The full review or client story, after the section on how LENS
          helps and before the goals (Ben, 2026-11-02), then the primary ask
          again — more than a screen below the hero's. The quote is the one
          /stories publishes — same words, same name; the compact card in
          the hero is its opening sentences. */}
      {story && (
        <section className="sec concern-story">
          <div className="wrap" style={{ maxWidth: 820 }}>
            <div className="sec-head rv" style={{ marginBottom: 26 }}>
              <div className="eyebrow">
                {isGoogle ? "From our Google reviews" : "A client’s own words"}
              </div>
            </div>
            <div className="rv">
              {isGoogle ? (
                <GoogleReviewQuote review={story} />
              ) : (
                <Quote
                  theme={story.theme}
                  text={story.text}
                  attribution={
                    story.firstName
                      ? `${story.firstName} ${story.lastInitial ?? ""} · ${story.relationship}`
                      : story.relationship
                  }
                  place={story.city}
                />
              )}
              <p className="sample-note" style={{ marginTop: 14 }}>{EXPERIENCES_DISCLAIMER}</p>
              <div className="hero-ctas" style={{ marginTop: 26 }}>
                <TalkCta />
              </div>
            </div>
          </div>
        </section>
      )}

      {concern.goals.length > 0 && (
        <section className="sec sec-ivory2">
          <div className="wrap">
            <div className="sec-head rv">
              <div className="eyebrow">What clients hope to support</div>
              <h2>{concern.goalsHeading}</h2>
            </div>
            <div className="trio-quotes rv">
              {concern.goals.map((g) => (
                <Quote key={g} theme="Common goal" text={g} />
              ))}
            </div>
          </div>
        </section>
      )}

      {concern.faqs.length > 0 && (
        <section className="sec">
          <div className="wrap" style={{ maxWidth: 900 }}>
            <div className="sec-head rv">
              <div className="eyebrow">Fair questions</div>
              <h2>{concern.faqHeading}</h2>
            </div>
            <FAQAccordion items={concern.faqs} />
          </div>
        </section>
      )}

      {/* Quiet cross-links, not a CTA — plain text links in the site's
          existing link language, deliberately subordinate to TalkCta below.
          These are what give trauma and stress-resilience inbound links from
          somewhere other than the hub. */}
      <section className="sec sec-ivory2">
        <div className="wrap" style={{ maxWidth: 900 }}>
          <div className="eyebrow">Related concerns</div>
          <div className="related">
            {related.map((c) => (
              <Link key={c.slug} href={`/concerns/${c.slug}`}>
                {c.shortTitle} <span className="arrow">&rarr;</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Plain, so the page keeps alternating against the ivory2 band above.
          Drops whole on a concern no article feeds — concussion, trauma and
          emotional-regulation today. */}
      <ReadMore articles={reading} />

      {/* Both cities, named once on every concern page, here — the CTA band
          is where a visitor is deciding whether to call, and "where are you"
          is the question that decides it (SEO-AUDIT-3 A1). The closing line
          is approved copy on the two medical-first pages and belongs with the
          ask, so there it stays as the sub and the cities go in the heading
          instead; everywhere else the standard sub carries them. */}
      <FinalCTA
        heading={
          medical
            ? "Talk to us first — Nashville or Murfreesboro. No commitment."
            : undefined
        }
        sub={
          medical
            ? "The first call is free, and if LENS isn't the right fit, we'll tell you that on the phone before you spend anything."
            : "Tell us what’s going on. We’ll listen, answer honestly, and tell you plainly whether LENS is a fit — on the phone, before you book anything at our Nashville or Murfreesboro center."
        }
      />
      <GuideCta headingLead={`${concern.guideHeading} Read`} />
    </>
  );
}
