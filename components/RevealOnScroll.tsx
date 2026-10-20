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
/**
 * ## Why the threshold is 0, and why there is a scroll fallback
 *
 * The observer used `threshold: 0.12` — reveal once 12% of the element is on
 * screen. That ratio is of the *element's own area*, and some `.rv` elements
 * are whole sections: /resources' card grid is one `.rv` about 5,700px tall
 * on a phone. Twelve percent of that is more than a phone screen with the
 * browser's bars showing, so the callback never fired and iPhone Safari
 * showed the heading, the intro and a blank page below (Ben, 2026-10-20).
 * The same arithmetic threatened every tall `.rv` container on the site.
 *
 * Now: any pixel of the element inside the viewport reveals it (threshold
 * 0, the viewport trimmed 6% at the bottom so a reveal still reads as a
 * reveal), and a passive scroll/resize pass reveals anything whose top has
 * entered the screen, so even an observer that never reports leaves nothing
 * hidden. The content is in the HTML either way: without JavaScript there is
 * no `html.js` and the hidden state is never applied.
 */
export default function RevealOnScroll() {
  const pathname = usePathname();

  useEffect(() => {
    // Reduced motion has no reveal to run: globals.css gives `.rv` full opacity
    // outright. Adding `in` anyway keeps one code path and changes nothing.
    const animate =
      "IntersectionObserver" in window &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const reveal = (el: Element) => el.classList.add("in");

    const io = animate
      ? new IntersectionObserver(
          (entries, observer) => {
            entries.forEach((en) => {
              if (en.isIntersecting) {
                reveal(en.target);
                observer.unobserve(en.target);
              }
            });
          },
          { threshold: 0, rootMargin: "0px 0px -6% 0px" }
        )
      : null;

    const track = (el: Element) => (io ? io.observe(el) : reveal(el));

    // The belt to the observer's braces: whatever has scrolled into the
    // screen is shown, observer or no observer.
    let frame = 0;
    const sweep = () => {
      frame = 0;
      const limit = window.innerHeight * 0.94;
      document.querySelectorAll(".rv:not(.in)").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top < limit && r.bottom > 0) reveal(el);
      });
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(sweep);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    const first = window.setTimeout(sweep, 400);

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
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.clearTimeout(first);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [pathname]);

  return null;
}
