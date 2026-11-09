"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { captureAttribution } from "@/lib/attribution";

/**
 * Records the visit's first touch — the utm tags on the URL and whether the
 * referrer is Instagram — in sessionStorage, once (lib/attribution.ts), so
 * the contact form can save where the lead came from wherever on the site
 * it is finally sent. Renders nothing. Re-run per route: a visit that lands
 * on a page with no tags and later follows a tagged link still gets one
 * first touch, the tagged one.
 */
export default function UtmCapture() {
  const pathname = usePathname();
  useEffect(() => {
    let storage: Storage | null = null;
    try {
      storage = window.sessionStorage;
    } catch {
      storage = null;
    }
    captureAttribution(window.location.search, document.referrer, storage);
  }, [pathname]);
  return null;
}
