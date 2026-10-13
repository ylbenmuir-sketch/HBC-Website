import ConfirmTag from "./ConfirmTag";
import BrainMapChart from "./BrainMapChart";
import PhotoFrame from "./PhotoFrame";
import {
  BRAIN_MAP_HEATMAP_CLAIM,
  BRAIN_MAP_HEATMAP_LIVE,
  BRAIN_MAP_POINTS,
  verifiedOr,
} from "@/lib/site-config";

/**
 * The "what you walk away with" imagery — the one place it is decided, for
 * the homepage and /brain-map both.
 *
 * ## Today (BRAIN_MAP_HEATMAP_LIVE = false)
 *
 * The bar chart is the image, because it is what a client receives today:
 * amplitude at every one of the BRAIN_MAP_POINTS sites, read site by site.
 * The head-shaped heat map is not yet something a client is handed, so it
 * renders beneath the chart as a coming-soon preview — smaller, at reduced
 * opacity, under a "Coming soon" eyebrow — and never as part of the current
 * deliverable. The copy around it (the headline, the recording-and-plan
 * paragraph, the free-call CTA) is the page's own and sits above; nothing in
 * this block competes with it or suggests today's map is the lesser one.
 *
 * ## When the software ships (BRAIN_MAP_HEATMAP_LIVE = true)
 *
 * Flip the constant in lib/site-config.ts. The heat map returns as the
 * primary image, the coming-soon block disappears, and the chart leaves with
 * it — one change, both pages. Ben called the swap temporary, which is why it
 * is behind a constant and not a rewrite of two pages.
 *
 * ## The claim
 *
 * BRAIN_MAP_HEATMAP_CLAIM ("The first LENS practice in the country to show it
 * this way.") is a Verifiable: [CONFIRM] in draft, absent in production until
 * verified. The coming-soon line is written to stand without it.
 *
 * ## The chart at narrow widths
 *
 * Between 600px and 920px the figure scrolls sideways rather than shrinking
 * the chart past legibility; below 600px the whole chart fits the container
 * and the site-label group is hidden (Ben, 2026-10-13) — see `.bmc` in
 * globals.css and the note in BrainMapChart.tsx. The scroller is a
 * labelled, focusable region so a keyboard can reach it where it scrolls;
 * elsewhere it is simply the chart's box.
 */
export default function BrainMapFigure({
  priority = false,
}: {
  /**
   * Preload the heat map as this template's LCP image. Only meaningful while
   * the heat map is primary; the inline chart is not an LCP candidate and
   * needs nothing.
   */
  priority?: boolean;
}) {
  const heatMapAlt = `A sample Harmonized Brain Map — a head-shaped heat map showing electrical amplitude at ${BRAIN_MAP_POINTS} points across the brain`;

  if (BRAIN_MAP_HEATMAP_LIVE) {
    return (
      <div className="bm-figure">
        {/* Pinned to the render's own 1184×860 ratio (height auto overrides
            the .split 500px) so `cover` fills the frame without cropping —
            a cropped diagram loses electrode labels and the legend. */}
        <PhotoFrame
          src="/images/brain-map-heat.png"
          alt={heatMapAlt}
          aspect="1184 / 860"
          style={{ height: "auto" }}
          priority={priority}
        />
        <p className="micro">
          A picture of electrical activity &mdash; not a diagnosis.
        </p>
      </div>
    );
  }

  const claim = verifiedOr(BRAIN_MAP_HEATMAP_CLAIM);
  return (
    <div className="bm-figure">
      <figure className="bmc">
        <div
          className="bmc-scroll"
          role="region"
          aria-label="Sample recording chart"
          tabIndex={0}
        >
          <BrainMapChart />
        </div>
        <figcaption className="micro">
          A sample recording &mdash; {BRAIN_MAP_POINTS} sites, measured in
          microvolts. Not a diagnosis.
        </figcaption>
      </figure>
      <aside className="bm-soon" aria-label="Coming soon">
        <div className="bm-soon-img" aria-hidden="true">
          <PhotoFrame
            src="/images/brain-map-heat.png"
            alt=""
            aspect="1184 / 860"
            style={{ height: "auto" }}
            sizes="220px"
          />
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
