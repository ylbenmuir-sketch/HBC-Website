import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og/render";
import { getResource, isPublishable, resources } from "@/lib/resources";
import { SHOW_DRAFT_CONTENT } from "@/lib/site-config";

/**
 * Per-article share card: the article's tag and read time as the eyebrow,
 * its headline as the headline, the excerpt beneath. Draft articles get a
 * card in draft builds only, the same gate as the page. See lib/og/render.tsx.
 */
export const alt = "Harmonized Brain Centers";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return resources
    .filter((r) => SHOW_DRAFT_CONTENT || isPublishable(r))
    .map((r) => ({ slug: r.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const article = getResource((await params).slug);
  if (!article) return renderOgCard({ eyebrow: "Resources", headline: "Harmonized Brain Centers" });
  return renderOgCard({
    eyebrow: `${article.tag} · ${article.readTime}`,
    headline: article.title,
    sub: article.excerpt,
  });
}
