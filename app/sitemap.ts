import type { MetadataRoute } from "next";
import { SITE_URL, SHOW_DRAFT_CONTENT, isDraftText } from "@/lib/site-config";
import { concerns } from "@/lib/concerns";
import { locations } from "@/lib/locations";
import { staticPages } from "@/lib/pages";
import { resources, isPublishable, lastChanged } from "@/lib/resources";
import { team } from "@/lib/team";

/**
 * Every URL carries its own `lastmod`, read from the record that owns the
 * page: `dateModified` on each static page (lib/pages.ts), concern and
 * location record, and `lastChanged()` on each article. Nothing else is
 * emitted — `changefreq` and `priority` are ignored by Google and were
 * only ever noise beside the one field it reads (SEO-AUDIT-3 §2.4, A10).
 *
 * The dates are content dates, bumped by hand when the words change. The
 * sitemap used to stamp thirty URLs with one constant and nine articles
 * with another, which told Google the site's pages all changed on one of
 * two days; `lastmod` is used only while it is "consistently and verifiably
 * accurate", so that pattern was the signature of a sitemap to ignore.
 * **Never `new Date()` here** — a build date says every page changed on
 * every deploy, which is the same lie in the other direction.
 */

/**
 * A calendar date, read as UTC. `new Date("2026-08-23")` already is UTC
 * midnight; this exists so the intent is stated rather than relied upon.
 */
const utcDate = (iso: string) => new Date(`${iso}T00:00:00Z`);

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: { path: string; lastModified: string }[] = [
    ...staticPages.map((p) => ({ path: p.path, lastModified: p.dateModified })),
    ...concerns.map((c) => ({
      path: `/concerns/${c.slug}`,
      lastModified: c.dateModified,
    })),
    ...locations.map((l) => ({
      path: `/locations/${l.slug}`,
      lastModified: l.dateModified,
    })),
    // Draft team profiles / articles are excluded outside draft mode — they
    // 404 in production builds (see the matching page-level gates). No
    // profile carries a date of its own yet; none has copy to date.
    ...team
      .filter((m) => m.slug)
      .filter((m) => SHOW_DRAFT_CONTENT || !isDraftText(m.name))
      .map((m) => ({ path: `/about/team/${m.slug}`, lastModified: "2026-09-01" })),
    ...resources
      .filter((r) => SHOW_DRAFT_CONTENT || isPublishable(r))
      .map((r) => ({
        path: `/resources/${r.slug}`,
        lastModified: lastChanged(r),
      })),
  ];

  return entries.map(({ path, lastModified }) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
    lastModified: utcDate(lastModified),
  }));
}
