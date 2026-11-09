"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { META_PIXEL_ID, metaAllowedPath } from "@/lib/meta";
import { META_PIXEL_ENABLED, metaPixelActive, reportMetaContact } from "@/lib/meta-pixel";

/**
 * The Meta Pixel (Ben, 2026-11-09) — rules in lib/meta.ts, gate in
 * lib/meta-pixel.ts. Renders nothing unless NEXT_PUBLIC_META_PIXEL_ID is set
 * in a production build.
 *
 * - The loader is injected the first time the visitor is on a general page
 *   on the site's own domain (decided in an effect, like GA), so a visit that
 *   only ever sees concern pages never loads it.
 * - Before init: autoConfig off (no automatic button/event scraping) and
 *   disablePushState (the pixel would otherwise send its own PageView on
 *   every in-site navigation, concern pages included). No advanced matching:
 *   init gets the id alone.
 * - The base code sends the first PageView; each later navigation to a
 *   general page sends one from the pathname effect.
 * - tel:/sms: taps → Contact (browser on general pages, server copy on any
 *   page but a blocked one), from one capture-phase listener like GA's.
 * - The noscript image renders only on general pages.
 */
export default function MetaPixel() {
  const pathname = usePathname();
  const [load, setLoad] = useState(false);
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (load || !metaPixelActive(pathname)) return;
    lastPath.current = pathname; // the base code's own PageView covers this page
    setLoad(true);
  }, [load, pathname]);

  useEffect(() => {
    if (!load || lastPath.current === pathname || !metaPixelActive(pathname)) return;
    lastPath.current = pathname;
    try {
      window.fbq?.("track", "PageView");
    } catch {
      // never surfaces
    }
  }, [load, pathname]);

  useEffect(() => {
    if (!META_PIXEL_ENABLED) return;
    const onTap = (e: MouseEvent) => {
      const link = e.target instanceof Element ? e.target.closest('a[href^="tel:" i], a[href^="sms:" i]') : null;
      if (link) reportMetaContact();
    };
    document.addEventListener("click", onTap, true);
    return () => document.removeEventListener("click", onTap, true);
  }, []);

  if (!META_PIXEL_ENABLED) return null;
  const id = JSON.stringify(META_PIXEL_ID);

  return (
    <>
      {load && (
        <Script id="meta-pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq.disablePushState = true;
fbq('set', 'autoConfig', false, ${id});
fbq('init', ${id});
fbq('track', 'PageView');`}
        </Script>
      )}
      {metaAllowedPath(pathname) && (
        <noscript>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            height="1"
            width="1"
            style={{ display: "none" }}
            alt=""
            src={`https://www.facebook.com/tr?id=${encodeURIComponent(META_PIXEL_ID)}&ev=PageView&noscript=1`}
          />
        </noscript>
      )}
    </>
  );
}
