"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import {
  MOBILE_BAR_SUPPRESSED_ROUTES,
  PHONE_DISPLAY,
  PHONE_TEL,
  SHOW_PHONE,
} from "@/lib/site-config";
import { getLocation, locationPhone } from "@/lib/locations";
import { useBottomBar } from "./BottomBarContext";

/**
 * The phone's one action bar, on every route (Ben, 2026-11-02): Call ·
 * Text us · Get Started, plus a small chat button that opens the site
 * assistant where the assistant exists. It replaced two bars that each
 * covered half the site — the homepage's "Get Started" bar, which appeared
 * only once the hero had scrolled past, and the interior routes' "Ask us"
 * bar — with one that is there from the first frame.
 *
 * Phones only (<768px, read here as MOBILE_BAR_QUERY and declared again as
 * the `@media (max-width: 767px)` block in globals.css that gives `.cta-bar`
 * its `display: flex`; move both or neither). Above that the dock behaves as
 * it always did: the ask bar, behind its flag, on every route but the
 * suppressed ones. Not on /contact, which has its own Text/Call row, and
 * not on /admin or /10years, which have no business with a call bar
 * (MOBILE_BAR_SUPPRESSED_ROUTES in lib/site-config.ts).
 *
 * The number is the main line everywhere except the Murfreesboro page,
 * where it is that center's (lib/locations.ts is the source of truth for
 * both). Both links accept texts. Every tap reports contact_link_click with
 * location "mobile_bar" (components/Analytics.tsx reads the attribute).
 *
 * It does not decide whether it is on screen. It registers with
 * BottomBarContext while it is in range and the route allows it, reports
 * "showing", and renders into BottomBarDock's shared footprint, where the
 * controller gives it the "call" slot — which always wins over the ask bar
 * and yields only to the open assistant panel. The footer's reserve
 * (`body[data-bottombar]`, globals.css) is the bar's own height, so the
 * last line of every page can still be scrolled out from under it.
 */
const MOBILE_BAR_QUERY = "(max-width: 767px)";

function suppressedOn(pathname: string | null): boolean {
  if (!pathname) return false;
  return MOBILE_BAR_SUPPRESSED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
}

/** The number this route calls and texts: Murfreesboro's on its own page, the main line everywhere else. */
function phoneFor(pathname: string | null): { display: string; tel: string } {
  const match = pathname?.match(/^\/locations\/([^/]+)/);
  const location = match ? getLocation(match[1]) : undefined;
  const own = location && location.slug === "murfreesboro" ? locationPhone(location) : null;
  return own ?? { display: PHONE_DISPLAY, tel: PHONE_TEL };
}

export default function MobileActionBar() {
  const pathname = usePathname();
  const { registerCallBar, setCallBarActive, slot, askAvailable, openAssistant } = useBottomBar();
  const [inRange, setInRange] = useState(false);
  const allowed = !suppressedOn(pathname);
  const show = inRange && allowed;

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_BAR_QUERY);
    const apply = () => setInRange(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Registered only while it can be seen, so a desktop with the assistant
  // flag off does not reserve a footprint for a bar that is display:none.
  useEffect(() => {
    if (!show) return;
    return registerCallBar();
  }, [show, registerCallBar]);

  useEffect(() => {
    setCallBarActive(show);
    return () => setCallBarActive(false);
  }, [show, setCallBarActive]);

  if (!slot || !show) return null;
  const phone = phoneFor(pathname);

  return createPortal(
    <div className="cta-bar" data-link-location="mobile_bar">
      {SHOW_PHONE && (
        <>
          <a className="cta-bar-act" href={`tel:${phone.tel}`} aria-label={`Call ${phone.display}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
            <span>Call</span>
          </a>
          <a className="cta-bar-act" href={`sms:${phone.tel}`} aria-label={`Text ${phone.display}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H9l-4.5 4v-4A1.5 1.5 0 0 1 4 14.5v-9z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
            <span>Text us</span>
          </a>
        </>
      )}
      <Link className="cta-bar-btn" href="/contact">
        Get Started
      </Link>
      {askAvailable && (
        <button
          type="button"
          className="cta-bar-chat"
          aria-label="Ask us a question"
          onClick={() => openAssistant("")}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 4c-4.4 0-8 3.1-8 7 0 2.2 1.2 4.1 3 5.4V20l3.3-2.1c.5.1 1.1.1 1.7.1 4.4 0 8-3.1 8-7s-3.6-7-8-7z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
            <path d="M8.5 11h7M8.5 8.5h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>,
    slot
  );
}
