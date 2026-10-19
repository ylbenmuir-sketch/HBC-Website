import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import SlimFooter from "@/components/SlimFooter";
import RouteFooter from "@/components/RouteFooter";
import RevealOnScroll from "@/components/RevealOnScroll";
import { BottomBarProvider } from "@/components/BottomBarContext";
import BottomBarDock from "@/components/BottomBarDock";
import { SHARED_OPEN_GRAPH } from "@/lib/metadata";
import Analytics from "@/components/Analytics";
import AssistantLoader from "@/components/AssistantLoader";
import { BING_SITE_VERIFICATION, GOOGLE_SITE_VERIFICATION } from "@/lib/analytics";
import { FEATURE_ASSISTANT, SITE_NAME, SITE_URL } from "@/lib/site-config";
import "@/lib/content-validation";
import "@/lib/config-validation";
import "./globals.css";


/**
 * Cormorant upright. `adjustFontFallback: false`, with the fallback family
 * named instead: the metrics live in app/globals.css, swept rather than
 * copied, and they include the **italic** face `next/font` does not generate.
 * Without it an italic request fell back to a synthesised slant of the upright
 * fallback, ~14% too wide, which is what made the homepage H1 wrap to an extra
 * line until the real font arrived.
 *
 * Read the metrics block in globals.css before touching this call or the
 * italic one below: `adjustFontFallback: true` puts the untuned fallback back
 * in front of the tuned one and nothing here would say so.
 *
 * **DM Sans below keeps `next/font`'s own fallback, deliberately.** The sweep
 * tried tuned values for it and they were worse: its generated 104.53% held
 * more lines still across the site than the width-matched 102.86% did, which
 * is the same lesson the serif taught — the target is line-break parity, not
 * average character width, and for the sans the default already lands on it.
 * There is nothing to gain here and a set of numbers to maintain.
 */
const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal"],
  variable: "--font-cormorant",
  display: "swap",
  /**
   * Preloaded, and measured to stay that way (October 2026). Dropping this
   * preload alone moved real LCP by about −80 ms on the throttled phone,
   * but the face then arrives after first paint, and the tuned fallback
   * below holds only the headings still: the proof band's serif numerals,
   * the step numbers and the pull-quote marks swapped in the first viewport
   * on 8 of 23 templates, CLS 0.001–0.011, and Lighthouse's simulation
   * serialised the font behind the stylesheet for +300 ms of FCP on every
   * template. A five-route sample had missed it. PERF-PASS.md §9.
   */
  adjustFontFallback: false,
  fallback: ["Cormorant Tuned Fallback"],
});

/**
 * Cormorant italic, as its own instance so it can be **left out of the
 * preload** (`SEO-AUDIT-2.md` §8.2 C18: three preloaded faces, 110kB,
 * competing with the LCP image on the critical path). Splitting the styles is
 * the only way to preload one and not the other — `preload` is per instance.
 *
 * The italic is the right one to drop. It sets one accent phrase per hero and
 * the pull-quotes, roughly a line of text a page, against the upright face's
 * every heading and the sans's every paragraph; and now that the fallback
 * italic is metrically tuned (see globals.css), arriving late costs a glyph
 * change rather than a reflow. Preloaded weight falls 110kB → 72kB.
 *
 * **Anything italic and serif has to name `--serif-italic` explicitly.** A
 * family whose faces are all upright does not defer to the next family when
 * asked for italic — it synthesises a slant, which is both wrong-looking and
 * the wide-fallback bug this pass exists to remove. `em.sage` and the six
 * quote rules in globals.css carry it; a new italic serif rule needs it too.
 */
const cormorantItalic = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["italic"],
  variable: "--font-cormorant-italic",
  display: "swap",
  preload: false,
  adjustFontFallback: false,
  fallback: ["Cormorant Tuned Fallback"],
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `Help for anxiety, focus, and sleep — ${SITE_NAME}`,
    template: `%s — ${SITE_NAME}`,
  },
  // The homepage H1 and sub as one sentence, plus the free call. "Gentle" went
  // from the tagline in Oct 2026 (Ben: no softener in its place), and the cut
  // left this at 119 characters, so the two cities and the free call — both
  // concrete, both true — bring it back to 158. The session count is
  // deliberately not here — metadata has no draft mode, and this is not a
  // place to stack proof. Same string as the "/" entry in lib/pages.ts.
  description:
    "Help for anxiety, focus, and sleep — starting with a map of your brain. LENS neurofeedback for adults and kids in Nashville and Murfreesboro. First call free.",
  // Self-referencing canonical on every page. "./" is relative, so Next
  // resolves it per-route against metadataBase above — one declaration here
  // covers all 25 routes, including the dynamic concern/location/team/article
  // ones, and no generateMetadata has to restate it. This is what stops
  // ?utm_… / ?gclid= variants and any apex-vs-www drift from indexing as
  // separate URLs.
  alternates: {
    canonical: "./",
    // Feed discovery for the resources library — /resources/feed.xml.
    types: { "application/rss+xml": "/resources/feed.xml" },
  },
  // Spread, never restated. A route that declares its own `openGraph` replaces
  // this object wholesale rather than merging into it — see lib/metadata.ts.
  openGraph: { ...SHARED_OPEN_GRAPH, type: "website" },
  // Search Console and Bing Webmaster verification, each rendered only when
  // its token is set — see lib/analytics.ts. Nothing renders while they are
  // empty, which they are until Ben supplies them (SEO-AUDIT-3 P3).
  verification: {
    ...(GOOGLE_SITE_VERIFICATION ? { google: GOOGLE_SITE_VERIFICATION } : {}),
    ...(BING_SITE_VERIFICATION
      ? { other: { "msvalidate.01": BING_SITE_VERIFICATION } }
      : {}),
  },
};

export const viewport: Viewport = {
  themeColor: "#fbf8f1",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${cormorantItalic.variable} ${dmSans.variable}`}
    >
      <head>
        {/* The `js` class the reveal gate hangs off. Synchronous and first in
            <head> so it lands before the stylesheet can apply anything, which
            is the whole point: `.rv`'s hidden state is written as `html.js .rv`
            so it exists only in a browser that will run the observer that
            clears it. A no-JS visitor gets the page rather than a blank ivory
            screen. See the reveal-motion block in globals.css. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `document.documentElement.classList.add("js")`,
          }}
        />
      </head>
      {/* The dock's footprint, reserved in the server-rendered HTML rather than
          by an effect after hydration. BottomBarProvider still sets and clears
          this attribute — it has to, for the homepage CTA bar, which mounts on
          one route and is not known here — but when the assistant flag is on
          the dock is docked from the first frame, and the footer's reserve
          should be there from the first frame too. Applied at hydration it
          moved the end of every page. See the reserve block in globals.css.
          A route in ASSISTANT_SUPPRESSED_ROUTES (/contact) still gets it
          here — this layout cannot see the route — and the provider clears
          it at hydration, below the fold. */}
      <body data-bottombar={FEATURE_ASSISTANT ? "on" : undefined}>
        {/* One controller for everything anchored to the bottom of the
            viewport — the sticky ask bar, the homepage CTA bar, and the
            assistant panel that retires both. See BottomBarContext. */}
        <BottomBarProvider askAvailable={FEATURE_ASSISTANT}>
          {/* First focusable element in the document — see `.skip` in
              globals.css. `tabIndex={-1}` on <main> is what makes the jump
              move focus in every browser rather than only the scroll. */}
          <a href="#main" className="skip">
            Skip to content
          </a>
          {/* No JSON-LD here: every page renders its own single @graph —
              Organization and WebSite included — through <PageSchema>, so a
              route has exactly one block. See lib/schema.ts. */}
          <RevealOnScroll />
          <Header />
          <main id="main" tabIndex={-1}>
            {children}
          </main>
          <RouteFooter full={<Footer />} slim={<SlimFooter />} />
          {/* Site assistant — OFF. Renders only with
              NEXT_PUBLIC_FEATURE_ASSISTANT=true, which is set nowhere: not in
              .env.example, not in draft mode, not in dev. Wired in so Ben can
              audit it by flipping one variable in one environment, and so the
              flag is the only thing between it and a visitor. See
              phase-8-chatbot.md §6 and README → Site assistant.

              With the flag on, the widget's code is a separate chunk that
              AssistantLoader imports once the browser is idle — not at
              hydration, where a `next/dynamic` component rendered on the
              server still lands. With the flag off the chunk is never
              emitted into the page at all. */}
          {FEATURE_ASSISTANT && <AssistantLoader />}
          {/* Last in the body so the dock's fixed layers sit above the page
              without needing to outbid anything on z-index. The ask bar only
              exists behind the same flag as the assistant it opens — with the
              flag off this is the homepage CTA bar and nothing else. Whether
              the bar exists on *this* route is the provider's call (the flag
              minus ASSISTANT_SUPPRESSED_ROUTES), read from context. */}
          <BottomBarDock />
          {/* GA4, inert until NEXT_PUBLIC_GA_ID is set — lib/analytics.ts. */}
          <Analytics />
        </BottomBarProvider>
      </body>
    </html>
  );
}
