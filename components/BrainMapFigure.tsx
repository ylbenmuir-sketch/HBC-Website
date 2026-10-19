import ConfirmTag from "./ConfirmTag";
import BrainMapBars from "./BrainMapBars";
import BrainMapHeat from "./BrainMapHeat";
import {
  BRAIN_MAP_HEATMAP_CLAIM,
  BRAIN_MAP_HEATMAP_LIVE,
  BRAIN_MAP_POINTS,
  verifiedOr,
} from "@/lib/site-config";

/**
 * The Brain Map imagery on /brain-map — the heat map and the bar chart, both
 * drawn from lib/brain-map-sample.ts (one dataset, 2026-10-19), so the two
 * never disagree with each other or with the homepage stage
 * (components/BrainMapStage.tsx), which draws from the same file.
 *
 * ## Today (BRAIN_MAP_HEATMAP_LIVE = false)
 *
 * The bar chart is the image, because it is what a client receives today:
 * amplitude at every one of the BRAIN_MAP_POINTS sites. The head-shaped
 * heat map is not yet something a client is handed, so it renders beneath
 * as a coming-soon preview, under a "Coming soon" eyebrow.
 *
 * ## When the software ships (BRAIN_MAP_HEATMAP_LIVE = true)
 *
 * Flip the constant in lib/site-config.ts: the heat map becomes the image,
 * the coming-soon block disappears, and the chart leaves with it.
 *
 * ## The claim
 *
 * BRAIN_MAP_HEATMAP_CLAIM is a Verifiable: [CONFIRM] in draft, absent in
 * production until verified. The coming-soon line stands without it.
 *
 * The bar chart has two drawings of the same data and shows one per width
 * (upright from 760px, sideways below — see components/BrainMapBars.tsx);
 * all 21 bars draw at every width, with nothing to scroll and no reveal to
 * wait for.
 */
export default function BrainMapFigure({
  priority = false,
}: {
  /** Kept for the call sites; the inline SVGs need no preload. */
  priority?: boolean;
}) {
  void priority;
  if (BRAIN_MAP_HEATMAP_LIVE) {
    return (
      <div className="bm-figure">
        <div className="bmc-box bmh-box">
          <BrainMapHeat />
        </div>
        <p className="micro">
          A sample Brain Map &mdash; {BRAIN_MAP_POINTS} sites, measured in
          microvolts. Not a diagnosis.
        </p>
      </div>
    );
  }

  const claim = verifiedOr(BRAIN_MAP_HEATMAP_CLAIM);
  return (
    <div className="bm-figure">
      <figure className="bmc">
        <div className="bmc-box">
          <BrainMapBars />
        </div>
        <figcaption className="micro">
          A sample recording &mdash; {BRAIN_MAP_POINTS} sites, measured in
          microvolts. Not a diagnosis.
        </figcaption>
      </figure>
      <aside className="bm-soon" aria-label="Coming soon">
        <div className="bm-soon-img" aria-hidden="true">
          <BrainMapHeat />
        </div>
        <div className="bm-soon-copy">
          <div className="eyebrow">Coming soon</div>
          <p>
            Your brain in full color &mdash; the same recording, mapped.
            {claim && (
              <>
                {" "}
                {claim}
                <ConfirmTag>{BRAIN_MAP_HEATMAP_CLAIM.note!}</ConfirmTag>
              </>
            )}
          </p>
        </div>
      </aside>
    </div>
  );
}
