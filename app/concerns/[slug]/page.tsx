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
import { concerns, getConcern } from "@/lib/concerns";
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
    title: concern.metaTitle,
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

  return (
    <>
      <JsonLd data={faqPageSchema(concern.faqs)} />
      <Breadcrumbs
        trail={[
          { label: "What We Help With", href: "/what-we-help-with" },
          { label: concern.title },
        ]}
      />
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

      <section className="sec">
        <div className="wrap" style={{ maxWidth: 900 }}>
          <div className="sec-head rv">
            <div className="eyebrow">Fair questions</div>
            <h2>{concern.faqHeading}</h2>
          </div>
          <FAQAccordion items={concern.faqs} />
        </div>
      </section>

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

      <FinalCTA />
      <GuideCta />
    </>
  );
}
