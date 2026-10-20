import BrainMapBars from "./BrainMapBars";
import BrainMapHeat from "./BrainMapHeat";
import BrainMapViews from "./BrainMapViews";
import { BRAIN_MAP_POINTS } from "@/lib/site-config";

/**
 * The Brain Map imagery in the /brain-map hero: the heat map, with the bar
 * chart one tap away — the homepage stage's Scan panel
 * (components/BrainMapStage.tsx) in the same white frame, through the same
 * component (components/BrainMapViews.tsx), drawn from the same dataset
 * (lib/brain-map-sample.ts). The two pages show one map: same isolines,
 * label placement, dot tooltips and legend, and the same 21 bars at every
 * width (upright from 760px, sideways below — see BrainMapBars).
 *
 * The heat map went live on 2026-10-20 (Ben): the coming-soon block that sat
 * under the chart, its "Your brain in full color" line and the claim it
 * carried are gone, along with the BRAIN_MAP_HEATMAP_LIVE switch.
 *
 * The caption is the homepage stage's, word for word.
 */
export default function BrainMapFigure({
  priority = false,
}: {
  /** Kept for the call sites; the inline SVGs need no preload. */
  priority?: boolean;
}) {
  void priority;
  return (
    <div className="bm-figure bmf">
      <div className="bmf-frame">
        <BrainMapViews heat={<BrainMapHeat />} bars={<BrainMapBars />} />
      </div>
      <p className="bms-caption">
        A sample Brain Map &mdash; {BRAIN_MAP_POINTS} sites, measured in
        microvolts. Not a diagnosis.
      </p>
    </div>
  );
}
