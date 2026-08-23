import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-config";

/**
 * `/guides/` is disallowed, and the HTML guide carries `noindex` of its own.
 *
 * public/guides/ holds the lead magnet — 1,778 words of chrome-less copy plus
 * the PDF, at a public path, linked from nowhere and absent from the sitemap.
 * An indexed copy would compete with the concern pages it was written to
 * support and would give away the thing GuideCta's email gate exists to trade
 * for. The two measures cover different halves: the meta tag is what a crawler
 * that already has the URL obeys, and this line is what stops it fetching the
 * PDF, which cannot carry a meta tag at all.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/guides/"] },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
