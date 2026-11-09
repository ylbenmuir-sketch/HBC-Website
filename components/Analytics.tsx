"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ANALYTICS_ENABLED, GA_ID, GOOGLE_ADS_ID, analyticsActive, contactLinkEvent, trackEvent } from "@/lib/analytics";
import { sendTap, tapAllowedHost, tapIgnoredPath, tapPayload } from "@/lib/tap";

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
 * `contact_link_click` comes from one listener on the document rather than
 * an onClick on every link: it catches every `tel:`, `mailto:` and `sms:` on
 * the site, including links in copy and ones added later, with nothing to
 * forget. The location is the nearest `data-link-location` ancestor (the
 * header, the footer, a location page's hero buttons, the form's
 * confirmation); anything untagged reports as "other". Capture phase, so a
 * handler that stops propagation cannot hide the tap.
 *
 * `afterInteractive`, so the tag never competes with the LCP image or the
 * hydration bundle on the critical path (SEO-AUDIT-3 §2.5).
 *
 * The tag is injected only once the browser has confirmed the hostname is
 * harmonizedbraincenterstn.com or www (lib/analytics.ts → ANALYTICS_HOSTS;
 * Ben, 2026-10-30): the Production build also answers at its *.vercel.app
 * alias, where nothing may be sent to GA. Decided in an effect, so the
 * server HTML never carries the loader and a preview or alias host makes no
 * GA request at all.
 */
export default function Analytics() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);
  const [active, setActive] = useState(false);

  // Re-read per route: an excluded path (ANALYTICS_EXCLUDED_PATHS) turns the
  // tag off while it is on screen and back on when the visitor leaves it.
  useEffect(() => {
    setActive(analyticsActive());
  }, [pathname]);

  useEffect(() => {
    if (!active) return;
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    trackEvent({ name: "page_view", params: { page_path: pathname } });
  }, [active, pathname]);

  useEffect(() => {
    if (!active) return;
    const onClick = (e: MouseEvent) => {
      const link =
        e.target instanceof Element
          ? e.target.closest('a[href^="tel:" i], a[href^="mailto:" i], a[href^="sms:" i]')
          : null;
      if (!link) return;
      const event = contactLinkEvent(
        link.getAttribute("href"),
        link.closest("[data-link-location]")?.getAttribute("data-link-location"),
        window.location.pathname
      );
      if (event) trackEvent(event);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [active]);

  // The tap log (lib/tap.ts; Ben, 2026-11-09): every tel:/sms: tap is also
  // posted to /api/track/tap with sendBeacon, so the server can pair it with
  // the call or text that followed. Its own listener, NOT gated on GA: a
  // visitor with gtag blocked still taps, and the server decides whether
  // this deployment records anything (tapLoggingEnabled). Same capture-phase
  // document listener, same data-link-location, same scheme-only read of
  // the href; the center comes from the line's digits and the digits stay
  // in the browser. Sent only from the site's own hosts and a local server.
  useEffect(() => {
    if (!tapAllowedHost(window.location.hostname)) return;
    const onTap = (e: MouseEvent) => {
      const link =
        e.target instanceof Element ? e.target.closest('a[href^="tel:" i], a[href^="sms:" i]') : null;
      if (!link) return;
      const path = window.location.pathname;
      if (tapIgnoredPath(path)) return;
      const tap = tapPayload(link.getAttribute("href"), link.closest("[data-link-location]")?.getAttribute("data-link-location"), path);
      if (tap) sendTap(tap);
    };
    document.addEventListener("click", onTap, true);
    return () => document.removeEventListener("click", onTap, true);
  }, []);

  if (!ANALYTICS_ENABLED || !active) return null;

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
gtag('config', ${JSON.stringify(GA_ID)}, { send_page_view: false });${
  GOOGLE_ADS_ID ? `\ngtag('config', ${JSON.stringify(GOOGLE_ADS_ID)}, { send_page_view: false });` : ""
}`}
      </Script>
    </>
  );
}
