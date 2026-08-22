"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PHONE_DISPLAY, PHONE_TEL, SHOW_PHONE } from "@/lib/site-config";
import { useBottomBar } from "./BottomBarContext";

/**
 * Restrained sticky bottom CTA, phones only (≤760px via CSS).
 * 52px tall plus safe-area padding. Appears once the hero has scrolled out of
 * view and retires while the end-of-page CTA band or footer is on screen, so
 * it never doubles the same ask; globals.css also hides the whole dock while
 * the menu drawer is open (body[data-menu-open]).
 *
 * It no longer decides whether anything else is allowed on screen. It reports
 * "I am showing" to BottomBarContext and renders its markup into
 * BottomBarDock's shared footprint; the controller works out that the ask bar
 * must yield, and the dock crossfades the two in place. This bar always wins
 * that tie — it is the primary conversion path — but it wins it in one
 * reducer now rather than in a pair of CSS rules that pointed at each other.
 *
 * The width gate is read here as well as declared in CSS. `.cta-bar` is
 * `display: none` above 760px, and a bar that cannot be seen must not be
 * telling the controller it owns the bottom of the screen — that would blank
 * the ask bar across the whole homepage at tablet and desktop widths for a
 * bar nobody can see. The media query and the JS have to agree, so they are
 * stated together: CALL_BAR_QUERY below, and the `@media (max-width: 760px)`
 * block in globals.css that gives `.cta-bar` its `display: flex`. The two
 * disagreeing is not a visual bug, it is an invisible one — the ask bar
 * simply stops existing on the homepage — so if the breakpoint moves, move
 * both.
 */
const CALL_BAR_QUERY = "(max-width: 760px)";

export default function MobileCtaBar() {
  const { registerCallBar, setCallBarActive, slot } = useBottomBar();
  const [scrolledIn, setScrolledIn] = useState(false);
  const [inRange, setInRange] = useState(false);
  const show = scrolledIn && inRange;

  // Tell the controller this route has a CTA bar at all, so the dock renders
  // and the footer reserves its height even while the bar is scrolled out.
  useEffect(() => registerCallBar(), [registerCallBar]);

  useEffect(() => {
    const mq = window.matchMedia(CALL_BAR_QUERY);
    const apply = () => setInRange(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const hero = document.querySelector(".hero");
    const end = document.querySelector(".final");
    const update = () => {
      const heroGone = hero
        ? hero.getBoundingClientRect().bottom < 0
        : window.scrollY > 400;
      // retire the bar once the end-of-page CTA band (and the footer after
      // it) approaches — they repeat the same ask
      const beforeEnd = end
        ? end.getBoundingClientRect().top > window.innerHeight * 0.8
        : true;
      setScrolledIn(heroGone && beforeEnd);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(() => {
    setCallBarActive(show);
    return () => setCallBarActive(false);
  }, [show, setCallBarActive]);

  // Kept only so the old launcher's yield rule still works if the launcher is
  // switched back on (SiteAssistant's SHOW_LEGACY_LAUNCHER). The controller
  // above is what the current bars read; nothing in the new dock consults
  // this attribute.
  useEffect(() => {
    if (show) document.body.dataset.ctaBar = "on";
    else delete document.body.dataset.ctaBar;
    return () => {
      delete document.body.dataset.ctaBar;
    };
  }, [show]);

  // The dock's slot only exists after it has rendered, which is a beat after
  // registerCallBar above on a route where nothing else docks.
  if (!slot) return null;

  return createPortal(
    <div className="cta-bar" aria-hidden={!show}>
      <Link className="cta-bar-btn" href="/contact" tabIndex={show ? 0 : -1}>
        Get a Free Call Today
      </Link>
      {SHOW_PHONE && (
        <a
          className="cta-bar-tel"
          href={`tel:${PHONE_TEL}`}
          tabIndex={show ? 0 : -1}
          aria-label={`Call ${PHONE_DISPLAY}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      )}
    </div>,
    slot
  );
}
