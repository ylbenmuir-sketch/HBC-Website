import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import PhotoFrame from "@/components/PhotoFrame";
import PlaceholderPlate from "@/components/PlaceholderPlate";
import FinalCTA from "@/components/FinalCTA";
import { Btn } from "@/components/Buttons";
import { resources, getResource, isPublishable, bylineText } from "@/lib/resources";
import { SHOW_DRAFT_CONTENT } from "@/lib/site-config";

export function generateStaticParams() {
  // Draft articles build in draft mode only.
  return resources
    .filter((r) => SHOW_DRAFT_CONTENT || isPublishable(r))
    .map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const article = getResource((await params).slug);
  if (!article) return {};
  return {
    // metaTitle, not title: the on-page headline is written to be read and
    // targets nothing anybody types. See the field note in lib/resources.ts.
    title: article.metaTitle,
    description: article.metaDescription,
    openGraph: { type: "article" },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const article = getResource((await params).slug);
  if (!article) notFound();
  if (!SHOW_DRAFT_CONTENT && !isPublishable(article)) notFound();

  return (
    <>
      <Breadcrumbs
        trail={[
          { label: "Resources", href: "/resources" },
          { label: article.crumbLabel },
        ]}
      />
      <section className="sec-tight">
        <div className="wrap article">
          {/* `above-fold`: the article template has no `.page-hero`, so the
              exemption is marked by hand. The header block holds the mobile
              LCP element (`p.lede`); the image below it is the desktop one,
              where 420px of it sits inside a 900px-tall first screen. Both are
              exempt from the reveal gate for the reason in globals.css. */}
          <div className="rv above-fold">
            <div className="eyebrow">
              {article.tag} &middot; {article.readTime}
            </div>
            <h1>{article.title}</h1>
            <div className="meta">{bylineText(article.byline)}</div>
            <p className="lede">{article.lede}</p>
          </div>
          {article.image ? (
            <PhotoFrame
              src={article.image.src}
              alt={article.title}
              position={article.image.position}
              height={420}
              className="rv above-fold"
              sizes="(max-width: 760px) 100vw, 760px"
            />
          ) : (
            <PlaceholderPlate
              spec={article.plateSpec ?? ""}
              height={420}
              className="rv above-fold"
              style={{ margin: "40px 0" }}
            />
          )}
          <div className="rv">
            {article.body.map((block, i) => {
              switch (block.type) {
                case "h2":
                  return <h2 key={i}>{block.text}</h2>;
                case "blockquote":
                  return <blockquote key={i}>{block.text}</blockquote>;
                case "note":
                  return (
                    <div className="note-sage" key={i}>
                      {block.text}
                    </div>
                  );
                // Ghost buttons rather than inline anchors — `.article p` has
                // no link rule, so an inline link renders as plain body text.
                // Same handoff pattern as /lens-neurofeedback.
                case "links":
                  return (
                    <div key={i} style={{ margin: "40px 0" }}>
                      <p className="sub" style={{ fontSize: 16 }}>
                        {block.text}
                      </p>
                      <div className="hero-ctas" style={{ marginTop: 18 }}>
                        {block.items.map((l) => (
                          <Btn key={l.href} href={l.href} variant="ghost" arrow>
                            {l.label}
                          </Btn>
                        ))}
                      </div>
                    </div>
                  );
                default:
                  return <p key={i}>{block.text}</p>;
              }
            })}
          </div>
        </div>
      </section>

      <FinalCTA heading={article.finalHeading} sub={article.finalSub} />
    </>
  );
}
