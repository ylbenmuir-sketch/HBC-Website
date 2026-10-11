"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { ANALYTICS_ENABLED, GA_ID, trackEvent } from "@/lib/analytics";

/**
 * The GA4 tag, rendered only while NEXT_PUBLIC_GA_ID is set — see
 * lib/analytics.ts. Renders nothing at all otherwise, so the inert site is
 * the same HTML it was before this existed.
 *
 * `send_page_view: false` on the config call and a manual `page_view` from
 * the pathname effect: gtag's automatic page view fires once per full load,
 * and the App Router navigates without one, so an automatic view would count
 * the landing page and nothing after it. The effect fires on the first
 * render too, which is the one page view that replaces the automatic one.
 *
 * `afterInteractive`, so the tag never competes with the LCP image or the
 * hydration bundle on the critical path (SEO-AUDIT-3 §2.5).
 */
export default function Analytics() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!ANALYTICS_ENABLED) return;
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    trackEvent({ name: "page_view", params: { page_path: pathname } });
  }, [pathname]);

  if (!ANALYTICS_ENABLED) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
window.gtag = gtag;
gtag('js', new Date());
gtag('config', ${JSON.stringify(GA_ID)}, { send_page_view: false });`}
      </Script>
    </>
  );
}
