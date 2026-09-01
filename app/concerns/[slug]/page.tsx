import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import PhotoFrame from "@/components/PhotoFrame";
import PlaceholderPlate from "@/components/PlaceholderPlate";
import Quote from "@/components/Quote";
import FAQAccordion from "@/components/FAQAccordion";
import FinalCTA from "@/components/FinalCTA";
import GuideCta from "@/components/GuideCta";
import { Btn, TalkCta } from "@/components/Buttons";
import JsonLd from "@/components/JsonLd";
import ReadMore from "@/components/ReadMore";
import { concerns, getConcern } from "@/lib/concerns";
import { articlesForConcern } from "@/lib/resources";
import { faqPageSchema } from "@/lib/schema";

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

  return (
    <>
      {concern.faqs.length > 0 && <JsonLd data={faqPageSchema(concern.faqs)} />}
      <Breadcrumbs
        trail={[
          { label: "What We Help With", href: "/what-we-help-with" },
          { label: concern.title },
        ]}
      />

      {medical ? (
        /* The medical-first hero (only /concerns/concussion today).

           One column, no photo, and the CTAs *below* the block rather than
           above it. That order is the whole point: a visitor who hit their
           head on Saturday should reach "start with a doctor" before they
           reach anything inviting them to call us. The block is also the
           widest and darkest text on the page — see `.medical-first` — because
           a warning styled like a footnote is read like one. */
        <section className="page-hero">
          <div className="wrap" style={{ maxWidth: 860 }}>
            <div className="rv">
              <div className="eyebrow">{concern.heroEyebrow}</div>
              <h1 style={{ maxWidth: "none" }}>
                {concern.titleLead}
                <em className="sage">{concern.titleAccent}</em>
              </h1>
              <p className="sub">{concern.heroSub}</p>
            </div>

            <div className="medical-first rv">
              <p>{medical.urgent}</p>
            </div>

            <div className="medical-later rv">
              <p>{medical.laterLead}</p>
              <ul className="goals-list" style={{ columnCount: 1 }}>
                {concern.recognize.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
              <p>{medical.gap}</p>
            </div>

            <div className="hero-ctas rv" style={{ marginTop: 38 }}>
              <TalkCta />
              <Btn href="/how-lens-works" variant="ghost" arrow>
                How LENS works
              </Btn>
            </div>
          </div>
        </section>
      ) : (
        <section className="page-hero">
          <div className="wrap split" style={{ alignItems: "center" }}>
            <div className="rv">
              <div className="eyebrow">Concern &middot; {concern.who}</div>
              <h1>
                {concern.titleLead}
                <em className="sage">{concern.titleAccent}</em>
              </h1>
              <p className="sub">{concern.heroSub}</p>
              <div className="hero-ctas" style={{ marginTop: 34 }}>
                <TalkCta />
                <Btn href="/how-lens-works" variant="ghost" arrow>
                  How LENS works
                </Btn>
              </div>
            </div>
            <div className="rv">
              {concern.image ? (
                <PhotoFrame
                  src={concern.image.src}
                  alt={concern.title}
                  position={concern.image.position}
                  height={460}
                />
              ) : (
                <PlaceholderPlate spec={concern.plateSpec ?? ""} height={460} />
              )}
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
                <h2>Why this looks like the rest of our work.</h2>
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
              <div className="note-sage rv" style={{ marginTop: 30 }}>
                {concern.howHelp.note}
              </div>
            </div>
          </section>

          <section className="sec sec-ivory2">
            <div className="wrap duo">
              <div className="rv">
                <div className="eyebrow">Physician referrals</div>
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
              <div className="note-sage" style={{ marginTop: 24 }}>
                {concern.howHelp.note}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Both bands drop whole when a concern ships without the copy for them,
          heading included — see `goalsHeading` in lib/concerns.ts. */}
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

      {/* The closing line is approved copy on the concussion page and belongs
          with the ask, so it replaces the band's standard sub there. */}
      <FinalCTA
        sub={
          medical
            ? "The first call is free, and if LENS isn't the right fit, we'll tell you that on the phone before you spend anything."
            : undefined
        }
      />
      <GuideCta headingLead={`${concern.guideHeading} Read`} />
    </>
  );
}
