import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import FounderStory from "@/components/FounderStory";
import { FOUNDER_DISPLAY_NAME, FOUNDER_PAGE_PUBLISHED } from "@/lib/site-config";

/**
 * The founder page's draft URL (Ben, 2026-11-02) — for Sheri to read before
 * it replaces /about/founder. Hidden five ways: noindex/nofollow here,
 * disallowed in app/robots.ts, absent from the sitemap (it is not in
 * lib/pages.ts), linked from nowhere on the site, and excluded from GA
 * (ANALYTICS_EXCLUDED_PATHS in lib/analytics.ts). Once FOUNDER_PAGE_PUBLISHED
 * is true this route only redirects to the live page.
 */
export const metadata: Metadata = {
  title: { absolute: `${FOUNDER_DISPLAY_NAME} — draft` },
  description: "A draft of the founder page, for review.",
  robots: { index: false, follow: false, nocache: true },
};

export default function FounderDraftPage() {
  if (FOUNDER_PAGE_PUBLISHED) permanentRedirect("/about/founder");
  return <FounderStory draft />;
}
