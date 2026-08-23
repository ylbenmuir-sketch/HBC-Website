/**
 * Metadata fragments shared across routes.
 *
 * ## Why this file exists
 *
 * Next merges `metadata` objects key by key, but only at the top level.
 * `openGraph` is one key, so a route that declares
 *
 *     openGraph: { type: "article" }
 *
 * does not add `type` to what the root layout declared — it **replaces the
 * whole object**. That is how all ten `/resources/[slug]` articles came to
 * ship with no `og:url`, no `og:image`, no `og:site_name` and no `og:locale`,
 * and with `twitter:card` degraded from `summary_large_image` to `summary`,
 * because Next derives the card type from the Open Graph image that was no
 * longer there. Every article shared as a bare text card. Nothing in the build
 * output said so; the tags were simply absent (SEO-AUDIT-2.md §2.2).
 *
 * The fix is not to remember. It is to have one object that every route
 * spreads, so overriding a single field cannot silently drop the rest.
 */
import { SITE_NAME } from "./site-config";

/**
 * Everything about an Open Graph card that does not vary by route.
 *
 * `type` is deliberately absent: it is the one field routes legitimately
 * differ on, and leaving it out means each caller has to state it, rather than
 * inheriting "website" onto an article by accident.
 */
export const SHARED_OPEN_GRAPH = {
  siteName: SITE_NAME,
  locale: "en_US",
  // Relative, like the canonical — Next resolves it per route against
  // `metadataBase`, so one declaration covers every URL on the site.
  url: "./",
  // A purpose-built 1200x630 — the size every platform crops to. The old
  // value pointed at /images/hero.jpg and declared it 1600x1067 when the file
  // is actually 1500x843, so previews cropped against the wrong aspect ratio.
  // Per-location and per-article images come later (SEO-AUDIT.md §6.3 item 33).
  images: [
    {
      url: "/images/og-default.jpg",
      width: 1200,
      height: 630,
      alt: "Harmonized Brain Centers — gentle LENS neurofeedback for adults, children, and families in Nashville and Murfreesboro",
    },
  ],
};
