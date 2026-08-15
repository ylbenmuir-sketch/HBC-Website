import type { MetadataRoute } from "next";
import { SITE_URL, SHOW_DRAFT_CONTENT, isDraftText } from "@/lib/site-config";
import { concerns } from "@/lib/concerns";
import { locations } from "@/lib/locations";
import { resources, isPublishable } from "@/lib/resources";
import { team } from "@/lib/team";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = [
    "",
    "/what-we-help-with",
    "/adults",
    "/children-families",
    "/how-lens-works",
    "/first-visit",
    "/about",
    "/about/founder",
    "/about/team",
    "/locations",
    "/stories",
    "/faq",
    "/contact",
    "/resources",
  ];

  // Draft team profiles / articles are excluded outside draft mode — they
  // 404 in production builds (see the matching page-level gates).
  const dynamicPaths = [
    ...concerns.map((c) => `/concerns/${c.slug}`),
    ...locations.map((l) => `/locations/${l.slug}`),
    ...team
      .filter((m) => m.slug)
      .filter((m) => SHOW_DRAFT_CONTENT || !isDraftText(m.name))
      .map((m) => `/about/team/${m.slug}`),
    ...resources
      .filter((r) => SHOW_DRAFT_CONTENT || isPublishable(r))
      .map((r) => `/resources/${r.slug}`),
  ];

  return [...staticPaths, ...dynamicPaths].map((path) => ({
    url: `${SITE_URL}${path}`,
    changeFrequency: "monthly" as const,
    priority: path === "" ? 1 : path === "/contact" ? 0.9 : 0.7,
  }));
}
