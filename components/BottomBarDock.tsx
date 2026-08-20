"use client";

import { useBottomBar } from "./BottomBarContext";
import StickyAskBar from "./StickyAskBar";

/**
 * One fixed footprint at the bottom of the viewport, with both bottom bars
 * stacked inside it.
 *
 * The two layers share a single CSS grid cell, so they are the same size in
 * the same place and the swap between them is a crossfade rather than an
 * unmount — the ask bar dissolving into the CTA bar reads as one bar changing
 * state. Because both layers are always in the DOM (hidden by `visibility`,
 * never by `display`) the dock's height does not move when they trade places,
 * and neither does the page: globals.css reserves that height at the foot of
 * the document off `body[data-bottombar]`.
 *
 * The CTA bar's markup is not rendered here. MobileCtaBar still owns it, and
 * still mounts on the homepage only — it portals into the slot below, so the
 * bar keeps its own scroll logic and its own route scope while giving up the
 * decision about whether it is on screen. That decision is BottomBarContext's.
 */
export default function BottomBarDock({
  askAvailable,
}: {
  askAvailable: boolean;
}) {
  const { active, compact, docked, setSlot } = useBottomBar();

  // Nothing to dock on this route: no assistant behind the flag and no CTA
  // bar mounted. Render nothing rather than an empty fixed element, so the
  // footer reserve and the scroll listener cost nothing either.
  if (!docked) return null;

  return (
    <div className={`bottombar${compact ? " is-compact" : ""}`}>
      <div className="bottombar-inner">
        {askAvailable && <StickyAskBar active={active === "ask"} />}
        <div
          className="bottombar-layer callbar-layer"
          data-on={active === "call"}
          ref={setSlot}
        />
      </div>
    </div>
  );
}
