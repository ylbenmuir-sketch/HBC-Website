"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Reveal-on-scroll, honoring reduced motion (ported from design-reference/js/site.js).
 * Pages opt elements in with the `rv` class; this observer adds `in` on intersect.
 * Re-runs on every route change so newly rendered pages get observed too. With
 * reduced motion the CSS in globals.css shows everything immediately.
 *
 * ## Why it also watches the DOM
 *
 * A route change is not the only time an `.rv` element appears. Client
 * components swap their markup on state — a form replaced by its confirmation,
 * an accordion opening — and anything mounted after this effect ran was never
 * handed to the IntersectionObserver, so it kept `opacity: 0` forever. That is
 * not a slow reveal, it is a permanently invisible element, and it is worst on
 * exactly the markup that matters most: GuideCta's success state rendered as a
 * blank patch of ivory where the form had been, so a parent who submitted her
 * email saw the form vanish and nothing take its place. The row reached
 * Supabase every time; only the confirmation was missing.
 *
 * ContactForm had already hit this and worked around it by hard-coding `in`
 * into its success markup, which fixes one component and leaves the trap set
 * for the next one. The MutationObserver below fixes the class of bug: every
 * `.rv` that enters the document gets observed, whenever it arrives.
 *
 * Only childList is watched. Nothing in this codebase adds `rv` to an element
 * that is already in the document — the class ships in the markup — so
 * attribute mutations would be records to filter and never records to act on.
 */
export default function RevealOnScroll() {
  const pathname = usePathname();

  useEffect(() => {
    // Reduced motion has no reveal to run: globals.css gives `.rv` full opacity
    // outright. Adding `in` anyway keeps one code path and changes nothing.
    const animate =
      "IntersectionObserver" in window &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const io = animate
      ? new IntersectionObserver(
          (entries, observer) => {
            entries.forEach((en) => {
              if (en.isIntersecting) {
                en.target.classList.add("in");
                observer.unobserve(en.target);
              }
            });
          },
          { threshold: 0.12 }
        )
      : null;

    const track = (el: Element) =>
      io ? io.observe(el) : el.classList.add("in");

    // The root can itself be the `.rv` — a success panel mounts as one node,
    // not as a wrapper around one — so it is tested as well as searched.
    const trackTree = (root: Element | Document) => {
      if (root instanceof Element && root.classList.contains("rv")) track(root);
      root.querySelectorAll(".rv").forEach(track);
    };

    trackTree(document);

    const mo = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) trackTree(node as Element);
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      io?.disconnect();
    };
  }, [pathname]);

  return null;
}
