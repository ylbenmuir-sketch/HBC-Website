import { staticPages } from "@/lib/pages";
import { lastChanged, liveResources } from "@/lib/resources";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";

/**
 * RSS 2.0 for /resources — the push signal aggregators and some answer
 * engines poll where a sitemap is only pulled (SEO-AUDIT-3 §5.3, A11).
 * Published articles only, newest first, dated from the same fields the
 * Article nodes carry. Static at build; a new article is a new build.
 */
export const dynamic = "force-static";

const escape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const rfc822 = (iso: string) => new Date(`${iso}T12:00:00Z`).toUTCString();

export function GET() {
  const index = staticPages.find((p) => p.path === "/resources")!;
  const items = [...liveResources()]
    .sort((a, b) => (a.datePublished < b.datePublished ? 1 : -1))
    .map((r) => {
      const url = `${SITE_URL}/resources/${r.slug}`;
      return `    <item>
      <title>${escape(r.metaTitle)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${rfc822(r.datePublished)}</pubDate>
      <category>${escape(r.tag)}</category>
      <description>${escape(r.metaDescription)}</description>
    </item>`;
    });
  const newest = liveResources()
    .map(lastChanged)
    .sort()
    .at(-1);
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escape(`${SITE_NAME} — Resources`)}</title>
    <link>${SITE_URL}/resources</link>
    <description>${escape(index.description)}</description>
    <language>en-us</language>
    <atom:link href="${SITE_URL}/resources/feed.xml" rel="self" type="application/rss+xml" />
${newest ? `    <lastBuildDate>${rfc822(newest)}</lastBuildDate>\n` : ""}${items.join("\n")}
  </channel>
</rss>
`;
  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}
