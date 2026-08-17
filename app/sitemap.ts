import type { MetadataRoute } from "next";
import { SITE_URL, SHOW_DRAFT_CONTENT, isDraftText } from "@/lib/site-config";
import { concerns } from "@/lib/concerns";
import { locations } from "@/lib/locations";
import { resources, isPublishable } from "@/lib/resources";
import { team } from "@/lib/team";

/**
 * Content revision date, emitted as <lastmod> on every entry.
 *
 * Deliberately a hand-maintained constant, not `new Date()`: stamping build
 * time would tell Google every page changed on every deploy, and an
 * inaccurate lastmod is worse than none — it's the one field here Google
 * actually uses (changeFrequency and priority are ignored).
 *
 * **Bump this when site content changes**, not when code does.
 */
const CONTENT_REVISION = new Date("2026-08-16");

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPaths = [
    "",
    "/what-we-help-with",
    "/adults",
    "/children-families",
    "/lens-neurofeedback",
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
    lastModified: CONTENT_REVISION,
    changeFrequency: "monthly" as const,
    priority: path === "" ? 1 : path === "/contact" ? 0.9 : 0.7,
  }));
}
