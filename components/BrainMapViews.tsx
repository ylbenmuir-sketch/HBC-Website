"use client";

import { useState, type ReactNode } from "react";

/**
 * The sample Brain Map with its Map / Bars toggle — the homepage stage's
 * Scan panel (components/BrainMapStage.tsx) and the /brain-map hero
 * (components/BrainMapFigure.tsx) both render this, so the two pages show
 * the same heat map (isolines, labels, dot tooltips) and the same bar chart
 * from the one dataset, lib/brain-map-sample.ts. Map first.
 *
 * `onChoose` lets the stage stop its auto-advance when the toggle is used.
 */
export default function BrainMapViews({
  heat,
  bars,
  onChoose,
  children,
}: {
  heat: ReactNode;
  bars: ReactNode;
  onChoose?: () => void;
  /** Anything under the visual inside the same box (the stage's scan line). */
  children?: ReactNode;
}) {
  const [view, setView] = useState<"map" | "bars">("map");
  const choose = (v: "map" | "bars") => {
    onChoose?.();
    setView(v);
  };
  return (
    <div className="bms-scan">
      <div className="bms-toggle" role="group" aria-label="Show the sample as">
        <button type="button" aria-pressed={view === "map"} onClick={() => choose("map")}>
          Map
        </button>
        <button type="button" aria-pressed={view === "bars"} onClick={() => choose("bars")}>
          Bars
        </button>
      </div>
      <div className="bms-heat" hidden={view !== "map"}>
        {heat}
      </div>
      <div className="bms-bars" hidden={view !== "bars"}>
        {bars}
      </div>
      {children}
    </div>
  );
}
