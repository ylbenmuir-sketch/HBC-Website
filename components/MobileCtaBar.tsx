"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PHONE_DISPLAY, PHONE_TEL, SHOW_PHONE } from "@/lib/site-config";

/**
 * Restrained sticky bottom CTA, phones only (≤760px via CSS). 52px tall plus
 * safe-area padding. Appears once the hero has scrolled out of view and
 * retires while the end-of-page CTA band or footer is on screen, so it never
 * doubles the same ask; globals.css also hides it while the menu drawer is
 * open (body[data-menu-open]). Entrance is a small fade/rise that the global
 * reduced-motion gate disables.
 */
export default function MobileCtaBar() {
  const [show, setShow] = useState(false);

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
      setShow(heroGone && beforeEnd);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return (
    <div className={`cta-bar${show ? " show" : ""}`} aria-hidden={!show}>
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
    </div>
  );
}
