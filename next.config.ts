import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const nextConfig: NextConfig = {
  /** `X-Powered-By: Next.js` says nothing a visitor needs and one thing a
   *  scanner wants (SEO-AUDIT-3 §2.4). */
  poweredByHeader: false,

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
   * The ~55 individual WordPress posts are NOT here: the audit asked for one
   * pass with the GSC export open and the post list, and nobody has supplied
   * the list. The numeric auto-slugs (`/6200-2/` and the like) are retired
   * by pattern below; everything else under /post-sitemap falls through to
   * the 404, which is a routing page (app/not-found.tsx).
   *
   * 410s are rewrites to app/api/gone/route.ts, because a redirect cannot
   * carry that status.
   *
   * Probe (any local server, after `npm run build && npx next start`):
   *
   *   for p in /add-adhd/ /add-adhd /what-is-lens/ /about/ /concerns/ \
   *            /category/x/ /vibro-acoustic-chair/ /6200-2/; do
   *     curl -s -o /dev/null -w "%{http_code} $p -> %{redirect_url}\n" \
   *       "http://127.0.0.1:3123$p"; done
   *
   * Every legacy row answers 301 straight to its final destination, with or
   * without the slash; `/about/` answers 308 to `/about`; the 410 rows answer
   * 410 bare and 308-then-410 with the slash. Verified 2026-10-10 against
   * `next dev`.
   */
  async redirects() {
    // 301, not `permanent: true` — Next spells that as a 308. Both are
    // permanent to Google; 301 is the one every tool, CDN and two-year-old
    // link checker understands, and the one QUERY-TO-PAGE-MAP.md promises.
    const to = (sources: string[], destination: string) =>
      sources.map((source) => ({ source, destination, statusCode: 301 }));
    return [
      // Duplicate homepages.
      ...to(["/home", "/home-simple"], "/"),
      // The 10,900-impression LENS cluster, and the live site's #2 page by
      // clicks (/what-is-lens/: 3,712 impressions, 47 clicks in the Oct 2026
      // pull). The destination's body says "LENS therapy" and must keep to —
      // see the "both words" decision in QUERY-TO-PAGE-MAP.md.
      ...to(["/what-is-lens", "/lens-therapy"], "/lens-neurofeedback"),
      ...to(["/nashville_neurofeedback_therapy"], "/locations/nashville"),
      ...to(["/add-adhd", "/adhd", "/add-adhd-landing-page"], "/concerns/focus-adhd"),
      ...to(["/stressanxiety", "/stress"], "/concerns/anxiety"),
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
      ...to(["/what-we-help-with-1"], "/what-we-help-with"),
      // Category and tag archives — 20 thin URLs, all indexed. One rule.
      ...to(["/category/:path*", "/tag/:path*"], "/resources"),
      // The parent of eleven live URLs 404'd (SEO-AUDIT-3 §2.4).
      ...to(["/concerns"], "/what-we-help-with"),
      // Last: the trailing-slash normalisation Next used to do first, at the
      // 308 it used. The two 410 rows below reach their handler through this
      // rule when requested with the slash (308, then 410) — a redirect
      // cannot carry a 410, and a two-hop answer that ends in "gone" is the
      // right answer for a URL nobody should keep linking.
      { source: "/:path+/", destination: "/:path+", permanent: true },
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
    ];
  },

  async rewrites() {
    return [
      // 410 Gone — approved, Ben, Aug 2026. Furniture-shopping traffic the
      // practice cannot use; see the decision in QUERY-TO-PAGE-MAP.md.
      { source: "/vibro-acoustic-chair", destination: "/api/gone" },
      // WordPress's numeric auto-slugs (`/6200-2/`): ~30 of the ~55 posts.
      // Nothing to carry over, so they are retired by pattern.
      { source: "/:n(\\d+)-:m(\\d+)", destination: "/api/gone" },
      { source: "/:n(\\d+)", destination: "/api/gone" },
    ];
  },
};

export default nextConfig;
