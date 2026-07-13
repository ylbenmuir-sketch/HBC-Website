import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RevealOnScroll from "@/components/RevealOnScroll";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";
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
    default: `Feel like yourself again — ${SITE_NAME}`,
    template: `%s — ${SITE_NAME}`,
  },
  description:
    "Gentle, noninvasive LENS neurofeedback support for anxiety, focus and ADHD, sleep, emotional regulation, brain fog, and stress — delivered by trained practitioners at centers across Middle Tennessee.",
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
    images: [{ url: "/images/hero.jpg", width: 1600, height: 1067 }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body>
        <RevealOnScroll />
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
