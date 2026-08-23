import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RevealOnScroll from "@/components/RevealOnScroll";
import JsonLd from "@/components/JsonLd";
import { BottomBarProvider } from "@/components/BottomBarContext";
import BottomBarDock from "@/components/BottomBarDock";
import dynamic from "next/dynamic";
import { organizationSchema } from "@/lib/schema";
import { SHARED_OPEN_GRAPH } from "@/lib/metadata";
import { FEATURE_ASSISTANT, SITE_NAME, SITE_URL } from "@/lib/site-config";
import "@/lib/content-validation";
import "@/lib/config-validation";
import "./globals.css";

/**
 * Split into its own chunk so the widget is not in the bundle every page
 * downloads. §6: it "must not block or degrade LCP". While
 * FEATURE_ASSISTANT is false the chunk is never requested at all.
 */
const SiteAssistant = dynamic(() => import("@/components/SiteAssistant"));

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
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
    default: `Help for anxiety, focus, and sleep without medication — ${SITE_NAME}`,
    template: `%s — ${SITE_NAME}`,
  },
  // The homepage H1 and sub as one sentence. The service area rides along in
  // the sub now, so the description no longer has to carry it separately. The
  // session count is deliberately not here — metadata has no draft mode, and
  // this is a one-sentence description by design, not a place to stack proof.
  description:
    "Help for anxiety, focus, and sleep without medication — gentle LENS neurofeedback for adults and kids across Middle Tennessee.",
  // Self-referencing canonical on every page. "./" is relative, so Next
  // resolves it per-route against metadataBase above — one declaration here
  // covers all 25 routes, including the dynamic concern/location/team/article
  // ones, and no generateMetadata has to restate it. This is what stops
  // ?utm_… / ?gclid= variants and any apex-vs-www drift from indexing as
  // separate URLs.
  alternates: { canonical: "./" },
  // Spread, never restated. A route that declares its own `openGraph` replaces
  // this object wholesale rather than merging into it — see lib/metadata.ts.
  openGraph: { ...SHARED_OPEN_GRAPH, type: "website" },
};

export const viewport: Viewport = {
  themeColor: "#fbf8f1",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable}`}>
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
          moved the end of every page. See the reserve block in globals.css. */}
      <body data-bottombar={FEATURE_ASSISTANT ? "on" : undefined}>
        {/* One controller for everything anchored to the bottom of the
            viewport — the sticky ask bar, the homepage CTA bar, and the
            assistant panel that retires both. See BottomBarContext. */}
        <BottomBarProvider askAvailable={FEATURE_ASSISTANT}>
          {/* The one Organization node, sitewide. Location pages reference it
              by @id rather than restating it — see lib/schema.ts. */}
          <JsonLd data={organizationSchema()} />
          <RevealOnScroll />
          <Header />
          <main>{children}</main>
          <Footer />
          {/* Site assistant — OFF. Renders only with
              NEXT_PUBLIC_FEATURE_ASSISTANT=true, which is set nowhere: not in
              .env.example, not in draft mode, not in dev. Wired in so Ben can
              audit it by flipping one variable in one environment, and so the
              flag is the only thing between it and a visitor. See
              phase-8-chatbot.md §6 and README → Site assistant. */}
          {FEATURE_ASSISTANT && <SiteAssistant />}
          {/* Last in the body so the dock's fixed layers sit above the page
              without needing to outbid anything on z-index. The ask bar only
              exists behind the same flag as the assistant it opens — with the
              flag off this is the homepage CTA bar and nothing else. */}
          <BottomBarDock askAvailable={FEATURE_ASSISTANT} />
        </BottomBarProvider>
      </body>
    </html>
  );
}
