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
    default: `Gentle neurofeedback for anxiety, focus, and sleep — ${SITE_NAME}`,
    template: `%s — ${SITE_NAME}`,
  },
  // Tracks the hero sub, and deliberately keeps two things the sub shed when
  // it was shortened: the service area and the session count. Those moved into
  // the proof band rather than off the site, and a meta description is the one
  // place local search can read them. Both facts are verified (STAT_SESSIONS,
  // ESTABLISHED_YEAR) — metadata has no draft mode, so only confirmed facts
  // belong here.
  description:
    "Gentle, drug-free neurofeedback for anxiety, focus, sleep, and overwhelm — adults and kids across Middle Tennessee. Over 140,000 sessions since 2016.",
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
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
