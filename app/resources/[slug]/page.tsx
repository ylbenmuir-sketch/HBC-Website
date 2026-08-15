import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PhotoFrame from "@/components/PhotoFrame";
import PlaceholderPlate from "@/components/PlaceholderPlate";
import FinalCTA from "@/components/FinalCTA";
import { resources, getResource, isPublishable } from "@/lib/resources";
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
    title: article.title,
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
      <div className="wrap crumb">
        <Link href="/resources">Resources</Link> &nbsp;/&nbsp;{" "}
        {article.crumbLabel}
      </div>
      <section className="sec-tight">
        <div className="wrap article">
          <div className="rv">
            <div className="eyebrow">
              {article.tag} &middot; {article.readTime}
            </div>
            <h1>{article.title}</h1>
            <div className="meta">{article.byline}</div>
            <p className="lede">{article.lede}</p>
          </div>
          {article.image ? (
            <PhotoFrame
              src={article.image.src}
              alt={article.title}
              position={article.image.position}
              height={420}
              className="rv"
              sizes="(max-width: 760px) 100vw, 760px"
            />
          ) : (
            <PlaceholderPlate
              spec={article.plateSpec ?? ""}
              height={420}
              className="rv"
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
