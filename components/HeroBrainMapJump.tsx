"use client";

import { usePathname } from "next/navigation";
import { brainMapJumpEvent, trackEvent } from "@/lib/analytics";

/**
 * The hero's secondary action (Ben, 2026-10-19): "See What a Brain Map
 * Shows" with a small down arrow, scrolling to the Brain Map stage
 * (#brain-map on app/page.tsx). A real link to the fragment, so it works
 * without JavaScript and is a plain anchor to assistive tech; with it, the
 * click smooth-scrolls (instantly under prefers-reduced-motion) and lands
 * the section under the sticky header — `.home-brain-map` carries the
 * `scroll-margin-top`. Reports `brain_map_jump` (not a Key event).
 *
 * It took the place of BrainMapCta in the hero; the priced "Book a First
 * Visit — $150" moved into the stage itself.
 */
export default function HeroBrainMapJump() {
  const pathname = usePathname();
  return (
    <a
      className="btn btn-ghost hero-jump"
      href="#brain-map"
      onClick={(e) => {
        trackEvent(brainMapJumpEvent(pathname));
        const target = document.getElementById("brain-map");
        if (!target) return;
        e.preventDefault();
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
        history.replaceState(null, "", "#brain-map");
      }}
    >
      See What a Brain Map Shows
      <span className="arrow hero-jump-arrow" aria-hidden="true">
        ↓
      </span>
    </a>
  );
}
