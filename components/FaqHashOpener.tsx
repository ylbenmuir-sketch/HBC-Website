"use client";

import { useEffect } from "react";

/**
 * Opens the answer a link points at. Each question on /faq is a closed
 * <details> with an id (components/FAQAccordion.tsx → faqAnchor), so
 * /faq#what-does-it-cost scrolls to the question but would leave the answer
 * shut — the "See full pricing" link from the "What it takes" strip would
 * land on a heading with nothing under it. Runs on load and on every hash
 * change; renders nothing.
 */
export default function FaqHashOpener() {
  useEffect(() => {
    const open = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id) return;
      const el = document.getElementById(id);
      if (el instanceof HTMLDetailsElement) {
        el.open = true;
        el.scrollIntoView({ block: "start" });
      }
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, []);
  return null;
}
