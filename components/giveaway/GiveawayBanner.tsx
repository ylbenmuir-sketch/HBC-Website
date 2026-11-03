"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { BANNER_STORAGE_KEY, bannerHref, bannerModeAt, type BannerMode } from "@/lib/giveaway/banner";
import { trackEvent } from "@/lib/analytics";

/**
 * The site-wide 10-year banner (fix list rev 2, P0-7; lib/giveaway/banner.ts).
 * Server-rendered with all three messages; the inline <head> script has
 * already set <html data-hbc-banner> before first paint, and CSS shows the
 * one message that matches (or nothing). This component only:
 *   - re-decides on client-side navigation (the head script runs once per
 *     document, so a Link from / to /10years must hide it here);
 *   - dismisses for the tab session (sessionStorage), and
 *   - sends the two GA4 events, with the mode and nothing else.
 */

type Copy = { notify: string; live: string; closed: string; label: string; dismiss: string };

const MODES = ["notify", "live", "closed"] as const;

function readDismissed(): boolean {
  try {
    return sessionStorage.getItem(BANNER_STORAGE_KEY) === "0";
  } catch {
    return false;
  }
}

function currentMode(): BannerMode {
  const m = document.documentElement.getAttribute("data-hbc-banner");
  return m === "notify" || m === "live" || m === "closed" ? m : "off";
}

export default function GiveawayBanner({ copy }: { copy: Copy }) {
  const pathname = usePathname();
  const first = useRef(true);

  useEffect(() => {
    // The head script decided the first page; only later navigations need this.
    if (first.current) {
      first.current = false;
      return;
    }
    document.documentElement.setAttribute("data-hbc-banner", bannerModeAt(Date.now(), pathname ?? "/", readDismissed()));
  }, [pathname]);

  const dismiss = () => {
    const mode = currentMode();
    try {
      sessionStorage.setItem(BANNER_STORAGE_KEY, "0");
    } catch {
      // Private mode: it still hides for this page.
    }
    document.documentElement.setAttribute("data-hbc-banner", "off");
    if (mode !== "off") trackEvent({ name: "giveaway_banner_dismiss", params: { mode } });
  };

  return (
    <aside className="hbc10y-banner" aria-label={copy.label} data-giveaway-banner>
      <div className="hbc10y-banner-inner">
        {MODES.map((m) => (
          <a key={m} className="hbc10y-banner-link" data-copy={m} href={bannerHref(m)} onClick={() => trackEvent({ name: "giveaway_banner_click", params: { mode: m } })}>
            {copy[m]}
          </a>
        ))}
        <button type="button" className="hbc10y-banner-x" aria-label={copy.dismiss} onClick={dismiss}>
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true" focusable="false">
            <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </aside>
  );
}
