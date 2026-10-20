import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { SHOW_TEAM } from "./lib/site-config";

/**
 * The legacy paths that answer 410 Gone, as one regex alternation, written
 * once: `rewrites()` sends them to app/api/gone/route.ts, and the trailing-
 * slash catch-all at the end of `redirects()` steps around them so the slash
 * form reaches the rewrite in one hop. Literal slugs first, then WordPress's
 * numeric auto-slugs (`6200-2`, and `6200` for good measure).
 */
const GONE_PATTERN =
  "(?:vibro-acoustic-chair|positive-outcomes-from-vibro-acoustic-therapy-research|\\d+(?:-\\d+)?)";

/**
 * The legacy redirect sources as one regex alternation, for the trailing-slash
 * catch-all's lookahead: "/add-adhd" → "add-adhd", "/sitemap_index.xml" →
 * "sitemap_index\.xml", and a "/:path*" tail → any further segments.
 */
function legacyPattern(sources: string[]): string {
  return sources
    .map((source) =>
      source
        .replace(/^\//, "")
        .replace(/\/:path\*$/, "\u0000")
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
        .replace("\u0000", "(?:/[^/]+)*")
    )
    .join("|");
}

const nextConfig: NextConfig = {
  /** `X-Powered-By: Next.js` says nothing a visitor needs and one thing a
   *  scanner wants (SEO-AUDIT-3 §2.4). */
  poweredByHeader: false,

  /**
   * Which Vercel deployment this build is, inlined for the browser bundle:
   * Vercel sets `VERCEL_ENV` ("production" | "preview" | "development") at
   * build time, but only `NEXT_PUBLIC_*` reaches client code on its own.
   * lib/analytics.ts reads it so GA4 loads on the Production deployment and
   * never on a preview. Empty off Vercel.
   */
  env: {
    HBC_VERCEL_ENV: process.env.VERCEL_ENV ?? "",
  },

  /**
   * Pin the workspace root to this directory.
   *
   * Turbopack infers the root by walking up for lockfiles, finds a stray
   * 90-byte `package-lock.json` in the home directory — no package.json, no
   * node_modules, an orphan from an `npm install` run in the wrong place —
   * and picks *that* as the root, warning on every build. Naming the root
   * explicitly is the fix that lives in the repo: it holds regardless of what
   * else appears above this directory on anyone's machine.
   */
  turbopack: {
    root: dirname(fileURLToPath(import.meta.url)),
  },
  images: {
    /**
     * AVIF first, WebP second, and the browser takes the first it can decode.
     *
     * Next serves WebP only when this is unset, and every image on the site
     * goes through next/image. Measured on the hero: 46.6 kB JPEG becomes
     * 34.4 kB WebP, and AVIF typically lands 20-30% below WebP again — on the
     * one asset that is the LCP element of the homepage and is preloaded at
     * high priority (SEO-AUDIT-2.md §2.1).
     *
     * Order matters: this array is the order of the <source> elements Next
     * emits, and a browser takes the first format it supports. Safari has
     * shipped AVIF since 16.4 and everything else since 2021, so the WebP
     * entry is the floor rather than the common case.
     *
     * The cost is build time — AVIF encoding is slower than WebP, per image
     * per size — and it is paid once at build for a static site.
     */
    formats: ["image/avif", "image/webp"],
    /**
     * How long a browser (and Vercel's edge) may keep an optimized image
     * before asking again. Next's default is 60 seconds: every photo on the
     * site came back with `Cache-Control: public, max-age=60`, so a visitor
     * who read two pages a minute apart re-fetched the header-to-footer set
     * of images on the second one, and Lighthouse's `uses-long-cache-ttl`
     * listed all of them. Thirty-one days, not a year: the source files in
     * public/images are replaced in place occasionally, and a month is the
     * longest a stale copy may outlive its replacement. (Next's own advice
     * is to change the filename when an image changes; do that and the TTL
     * is moot.) Fonts and JS are content-hashed and already immutable; this
     * only touches /_next/image.
     */
    minimumCacheTTL: 2678400,
  },

  /**
   * Trailing slashes are handled by the LAST rule in `redirects()` below, not
   * by Next's built-in redirect.
   *
   * Every legacy WordPress URL ends in `/`, and Next's own slash-stripping
   * redirect is prepended ahead of every custom rule (load-custom-routes.js
   * `unshift`), so with it on, `/add-adhd/` would 308 to `/add-adhd` and only
   * then 301 to `/concerns/focus-adhd` — a two-hop chain on all ~110 legacy
   * URLs, which is exactly what SEO-AUDIT-2.md §2.6(b) warned about. Turning
   * the built-in off lets the legacy rules match the slash form directly
   * (one hop), and the catch-all at the end of the list restores the
   * `/about/` → `/about` behaviour for everything else. Verified with the
   * probe in the comment above `redirects()`.
   */
  skipTrailingSlashRedirect: true,

  /**
   * The legacy redirect map — SEO-AUDIT-2.md §2.6 and the "Redirects required
   * at launch" table in QUERY-TO-PAGE-MAP.md, written into code (SEO-AUDIT-3
   * A2). Untestable against the live domain until DNS moves off WordPress;
   * tested here against a local server with the probe below.
   *
   * Sources are written without the trailing slash. Next matches redirect
   * sources with the slash optional, so `/add-adhd` catches both `/add-adhd`
   * and `/add-adhd/` in one hop — which is the whole reason the built-in
   * slash redirect is off (see `skipTrailingSlashRedirect`).
   *
   * The row marked **default** is the one Ben has not decided (P6 in
   * SEO-AUDIT-3): `/refer-a-friend/` has no equivalent in the rebuild, so it
   * goes to /contact until he says otherwise. (`/concierge/` was the other;
   * /concierge is a page as of Oct 2026.)
   *
   * The individual WordPress posts are here too, as of 2026-10-13: Ben pulled
   * the list from the old site's sitemaps (56 URLs under /post-sitemap). The
   * 22 with a real slug each have a row below, grouped by destination; the
   * 34 numeric auto-slugs (`/6200-2/` and the like) are retired by pattern
   * in `rewrites()`. Two rows differ from the list Ben sent (`/stress/` and
   * the menopause post) and each says why in place. Anything in neither list
   * falls through to the 404, which is a routing page (app/not-found.tsx).
   *
   * 410s are rewrites to app/api/gone/route.ts, because a redirect cannot
   * carry that status.
   *
   * Probe: `npm run check:redirects` against a built server
   * (scripts/check-redirects.mjs). It requests every legacy URL in both slash
   * forms and fails on anything but one hop to the expected destination, a
   * destination that does not answer 200, or a source this file lists twice.
   *
   * Every legacy row answers 301 straight to its final destination, with or
   * without the slash; `/about/` answers 308 to `/about`; the 410 rows answer
   * 410 in one hop in both forms (see the catch-all). Verified 2026-10-13
   * against `next start`.
   */
  async redirects() {
    // 301, not `permanent: true` — Next spells that as a 308. Both are
    // permanent to Google; 301 is the one every tool, CDN and two-year-old
    // link checker understands, and the one QUERY-TO-PAGE-MAP.md promises.
    //
    // Every source `to()` sees is also collected, so the trailing-slash
    // catch-all at the end can step around it (see LEGACY below).
    const legacy: string[] = [];
    const to = (sources: string[], destination: string) => {
      legacy.push(...sources);
      return sources.map((source) => ({ source, destination, statusCode: 301 }));
    };
    return [
      // Duplicate homepages.
      ...to(["/home", "/home-simple"], "/"),
      // WordPress's feed and Yoast's sitemap index — what feed readers and
      // search consoles already hold for the old site (2026-10-15).
      ...to(["/feed"], "/resources/feed.xml"),
      ...to(["/sitemap_index.xml"], "/sitemap.xml"),
      // The 10,900-impression LENS cluster, and the live site's #2 page by
      // clicks (/what-is-lens/: 3,712 impressions, 47 clicks in the Oct 2026
      // pull). The destination's body says "LENS therapy" and must keep to —
      // see the "both words" decision in QUERY-TO-PAGE-MAP.md.
      ...to(["/what-is-lens", "/lens-therapy"], "/lens-neurofeedback"),
      ...to(["/nashville_neurofeedback_therapy"], "/locations/nashville"),
      ...to(["/add-adhd", "/adhd", "/add-adhd-landing-page"], "/concerns/focus-adhd"),
      ...to(["/stressanxiety"], "/concerns/anxiety"),
      // Was /concerns/anxiety until Oct 2026, a default written before the
      // stress page existed. Ben's list (2026-10-13) points it at the page
      // whose subject it is.
      ...to(["/stress"], "/concerns/stress-resilience"),
      ...to(["/sleepproblems", "/sleep-disorder"], "/concerns/sleep"),
      ...to(["/concussion-and-tbi", "/concussion-tbi1"], "/concerns/concussion"),
      ...to(["/emotional-balance", "/emotional-balance22"], "/concerns/emotional-regulation"),
      // The hub until Oct 2026 (approved, Ben, Aug 2026: "a destination is
      // read as an answer, and no concern page offers depression care").
      // Ben decided to build /concerns/depression in Oct 2026, so the answer
      // exists and the legacy URL points at it. Same reasoning, new fact.
      ...to(["/depression", "/depression1"], "/concerns/depression"),
      // Approved, Ben, Sept 2026 — direct, no chain through the other slug.
      ...to(["/peakperformance", "/self-development"], "/concerns/performance"),
      ...to(["/migrainesandpain", "/migraines-and-fibromyalgia"], "/concerns/migraines"),
      // Approved, Ben, Aug 2026: /stories until the celebrity permissions land.
      ...to(["/trisha-yearwood", "/testimonials", "/testimonials1"], "/stories"),
      ...to(["/faqs"], "/faq"),
      ...to(["/blog", "/advice-center"], "/resources"),
      // /concierge is a page again (Oct 2026), so its legacy URL needs no
      // row: the catch-all at the end turns `/concierge/` into `/concierge`.
      // **default** — flagged, still Ben's to confirm (P6). No equivalent
      // page exists; /contact is where someone sent by a friend would want
      // to end up, which is the nearest honest answer. Was the hub.
      ...to(["/refer-a-friend"], "/contact"),
      ...to(["/phoneschedule", "/new-client-intake-form"], "/contact"),
      // Guessed booking URLs (Ben, 2026-10-14). None of these was ever a page
      // on the WordPress site — each answered 404 there on 2026-10-14, and
      // its sitemap's only contact/booking pages are the four above plus
      // /contact/ itself (the catch-all) — but they are what people type and
      // what old bookmarks and directory listings guess, so they land on the
      // form rather than the 404.
      ...to(["/contact-us", "/schedule", "/book", "/free-consultation"], "/contact"),
      ...to(["/what-we-help-with-1"], "/what-we-help-with"),
      // Category and tag archives — 20 thin URLs, all indexed. One rule.
      ...to(["/category/:path*", "/tag/:path*"], "/resources"),
      // The parent of eleven live URLs 404'd (SEO-AUDIT-3 §2.4).
      ...to(["/concerns"], "/what-we-help-with"),

      // The 22 WordPress posts with a real slug (Ben, 2026-10-13, from the
      // old site's sitemaps). Each goes to the page that answers what the
      // post was about, grouped by destination. One row differs from Ben's
      // list and says why. The 23rd post on that list,
      // /positive-outcomes-from-vibro-acoustic-therapy-research/, is a 410
      // in `rewrites()` beside /vibro-acoustic-chair, for the same reason.
      ...to(
        [
          "/5-ways-neurofeedback-reduces-stress-and-anxiety",
          "/why-choose-lens-neurofeedback-for-anxiety-relief-in-nashville-and-murfreesboro",
          "/suffering-from-anxiety-depression",
        ],
        "/concerns/anxiety"
      ),
      ...to(
        [
          "/types-of-adhd",
          "/boost-focus-and-productivity-with-lens-neurofeedback-in-nashville-and-murfreesboro",
          "/how-lens-neurofeedback-helps-manage-add-adhd-in-nashville-and-murfreesboro",
          "/adhdadd-cant-be-cured-but-it-can-be-controlled",
        ],
        "/concerns/focus-adhd"
      ),
      ...to(
        ["/how-lens-neurofeedback-supports-better-sleep-in-nashville-and-murfreesboro"],
        "/concerns/sleep"
      ),
      // Changed from Ben's list, which sent the menopause post to /adults.
      // The post is about depression (PMT, menopause); /concerns/depression
      // is the page that answers it, and /adults is a menu of concerns that
      // never names menopause. Same rule as the /depression/ row above: a
      // destination is read as an answer.
      ...to(
        [
          "/overcoming-depression-with-lens-neurofeedback-in-nashville-and-murfreesboro",
          "/last-non-drug-treatment-pmt-menopause-depression",
        ],
        "/concerns/depression"
      ),
      ...to(["/achieving-peak-performance-with-lens"], "/concerns/performance"),
      ...to(["/concussion-do-you-know-the-symptoms"], "/concerns/concussion"),
      ...to(["/10-ways-to-look-forward-to-monday-mornings"], "/concerns/stress-resilience"),
      ...to(["/suffering-migraines-non-drug-treatment-can-help"], "/concerns/migraines"),
      // The comparison post goes to the comparison article, written
      // 2026-10-15 — it is the exact subject. (It went to /lens-neurofeedback
      // while the article was placeholder text.)
      ...to(
        ["/traditional-neurofeedback-vs-lens-neurofeedback-why-lens-stands-out"],
        "/resources/lens-vs-traditional-neurofeedback"
      ),
      ...to(
        ["/new-nashville-lens-neurofeedback-90-success-rate-adhd-anxiety-depression"],
        "/lens-neurofeedback"
      ),
      ...to(["/how-low-energy-neurofeedback-works-a-simple-explanation"], "/how-lens-works"),
      ...to(
        [
          "/chemical-vs-brainwaves-two-paths-to-brain-health",
          "/is-america-addicted-to-prescription-drugs",
        ],
        "/resources/lens-and-medication"
      ),
      ...to(["/sheri-rowney-being-interviewed-by-don-miller"], "/about/founder"),
      ...to(["/children-adhd-alternative-drugs"], "/children-families"),

      // The visitor confirmation email's video link (lib/email/visitor-
      // content.ts). Our own URL rather than YouTube's, so Gmail does not add
      // a preview card of its own; temporary, so it can point at another
      // video later without browsers having cached this one forever.
      { source: "/watch/first-visit", destination: "https://www.youtube.com/watch?v=FCUyUqzE3Dk", permanent: false },

      // The team pages, while SHOW_TEAM is off (lib/site-config.ts — Ben,
      // 2026-10-18: headshots aren't ready). Temporary on purpose: a 307 tells
      // Google the page is coming back, so nothing about /about/team is
      // forgotten. Collected with the legacy sources so the slash form is one
      // hop too. Turning SHOW_TEAM on removes both rows.
      ...(SHOW_TEAM
        ? []
        : (() => {
            const sources = ["/about/team", "/about/team/:path*"];
            legacy.push(...sources);
            return sources.map((source) => ({
              source,
              destination: "/about",
              permanent: false,
            }));
          })()),

      // Last: the trailing-slash normalisation Next used to do first, at the
      // 308 it used. The lookahead steps around the 410 paths: redirects run
      // before rewrites, so without it `/vibro-acoustic-chair/` was a 308 to
      // the bare path and only then a 410. Rewrite sources match the slash
      // optionally, the same as redirect sources, so the carved-out paths
      // answer 410 in one hop in both forms. GONE_PATTERN is the one list.
      //
      // It steps around every legacy source too (2026-10-15). `next start`
      // tries the rules in order, so `/add-adhd/` met its own 301 first; on
      // Vercel the catch-all answered first — `/add-adhd/` was a 308 to
      // `/add-adhd` and only then a 301, two hops on every legacy URL, while
      // the 410 paths (already excluded here) were one hop. Excluding the
      // legacy sources the same way makes the order irrelevant: the slash
      // form of a legacy URL can only match its own row.
      {
        source: `/:path((?!(?:${GONE_PATTERN}|${legacyPattern(legacy)})/$).+)/`,
        destination: "/:path",
        permanent: true,
      },
    ];
  },

  /**
   * Three hygiene headers on every response (SEO-AUDIT-3 A14). Not ranking
   * factors; the things anyone who checks expects to find. No CSP here: one
   * written in a config file would either break the inline reveal script in
   * app/layout.tsx and the GA4 loader or be loose enough to be decorative,
   * and HSTS belongs to the host, which owns the certificate.
   *
   * - `nosniff` — browsers honour the declared content type, so a response
   *   can never be re-read as a script.
   * - `strict-origin-when-cross-origin` — the browser default, stated: full
   *   referrer to our own pages, origin only to anyone else's.
   * - Permissions-Policy — the site never asks for a camera, microphone or
   *   location, so nothing embedded in it may either.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
        ],
      },
      // The giveaway's staff screens and the unsubscribe endpoint
      // (GIVEAWAY-PLAN.md §5, §6; 2026-10-18): never cached, never indexed.
      // The page metadata says noindex too; the header is what a crawler
      // obeys for a route handler's response and what a CDN obeys for both.
      // `/10years` (2026-10-19): a hidden page — see app/robots.ts.
      ...["/admin/:path*", "/unsubscribe", "/10years", "/10years/:path*"].map((source) => ({
        source,
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      })),
    ];
  },

  async rewrites() {
    return [
      // 410 Gone, one rule, the paths in GONE_PATTERN:
      // - /vibro-acoustic-chair — approved, Ben, Aug 2026. Furniture-shopping
      //   traffic the practice cannot use; the decision is in
      //   QUERY-TO-PAGE-MAP.md.
      // - /positive-outcomes-from-vibro-acoustic-therapy-research — the one
      //   post on the same subject (Ben, 2026-10-13), retired with it.
      // - WordPress's numeric auto-slugs (`/6200-2/`): 34 of the 56 posts.
      //   Nothing to carry over, so they are retired by pattern.
      { source: `/:gone(${GONE_PATTERN})`, destination: "/api/gone" },
    ];
  },
};

export default nextConfig;
