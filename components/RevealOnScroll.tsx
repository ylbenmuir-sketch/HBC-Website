"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Reveal-on-scroll, honoring reduced motion (ported from design-reference/js/site.js).
 * Pages opt elements in with the `rv` class; this observer adds `in` on intersect.
 * Re-runs on every route change so newly rendered pages get observed too. With
 * reduced motion the CSS in globals.css shows everything immediately.
 */
export default function RevealOnScroll() {
  const pathname = usePathname();

  useEffect(() => {
    const els = document.querySelectorAll(".rv");
    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    ) {
      els.forEach((e) => e.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, [pathname]);

  return null;
}
