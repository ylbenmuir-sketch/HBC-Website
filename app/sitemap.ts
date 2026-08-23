import type { MetadataRoute } from "next";
import { SITE_URL, SHOW_DRAFT_CONTENT, isDraftText } from "@/lib/site-config";
import { concerns } from "@/lib/concerns";
import { locations } from "@/lib/locations";
import { resources, isPublishable, lastChanged } from "@/lib/resources";
import { team } from "@/lib/team";

/**
 * Content revision date, emitted as <lastmod> for every entry that has no date
 * of its own.
 *
 * Deliberately a hand-maintained constant, not `new Date()`: stamping build
 * time would tell Google every page changed on every deploy, and an
 * inaccurate lastmod is worse than none — it's the one field here Google
 * actually uses (changeFrequency and priority are ignored).
 *
 * It was applied to all 37 URLs, which told Google the same untruth in the
 * other direction: that every page on the site changed on one day. Articles
 * now carry their own dates from lib/resources.ts, so a third of the sitemap
 * says something true and specific. Concerns and locations still fall back
 * here, because neither type has a revision date yet.
 *
 * **Bump this when site content changes**, not when code does.
 */
const CONTENT_REVISION = new Date("2026-08-22");

/**
 * A calendar date, read as UTC. `new Date("2026-08-23")` already is UTC
 * midnight; this exists so the intent is stated rather than relied upon.
 */
const utcDate = (iso: string) => new Date(`${iso}T00:00:00Z`);

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
  const dynamicPaths: { path: string; lastModified?: Date }[] = [
    ...concerns.map((c) => ({ path: `/concerns/${c.slug}` })),
    ...locations.map((l) => ({ path: `/locations/${l.slug}` })),
    ...team
      .filter((m) => m.slug)
      .filter((m) => SHOW_DRAFT_CONTENT || !isDraftText(m.name))
      .map((m) => ({ path: `/about/team/${m.slug}` })),
    ...resources
      .filter((r) => SHOW_DRAFT_CONTENT || isPublishable(r))
      .map((r) => ({
        path: `/resources/${r.slug}`,
        lastModified: utcDate(lastChanged(r)),
      })),
  ];

  const entries: { path: string; lastModified?: Date }[] = [
    ...staticPaths.map((path) => ({ path })),
    ...dynamicPaths,
  ];

  return entries.map(
    ({ path, lastModified }) => ({
      url: `${SITE_URL}${path}`,
      lastModified: lastModified ?? CONTENT_REVISION,
      changeFrequency: "monthly" as const,
      priority: path === "" ? 1 : path === "/contact" ? 0.9 : 0.7,
    })
  );
}
