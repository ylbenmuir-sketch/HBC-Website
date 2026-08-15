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
    default: `You’ve tried everything. Your brain hasn’t — ${SITE_NAME}`,
    template: `%s — ${SITE_NAME}`,
  },
  // Mirrors the hero sub. The session-count sentence is deliberately left out:
  // it is gated on unverified facts, and metadata has no draft mode to hide it.
  description:
    "Gentle, drug-free neurofeedback for anxiety, focus, sleep, and overwhelm — for adults and kids across Middle Tennessee.",
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
