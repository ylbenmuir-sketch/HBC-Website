import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RevealOnScroll from "@/components/RevealOnScroll";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";
import "@/lib/content-validation";
import "@/lib/config-validation";
import "./globals.css";

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
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
    // Same relative trick as the canonical above, for the same reason.
    url: "./",
    images: [{ url: "/images/hero.jpg", width: 1600, height: 1067 }],
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
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body>
        <RevealOnScroll />
        <Header />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
