import { useId } from "react";
import {
  BRAIN_MAP_BAND_COLORS,
  BRAIN_MAP_BAND_LABELS,
  BRAIN_MAP_SITES,
  BRAIN_MAP_TYPICAL_MAX,
  BRAIN_MAP_TYPICAL_MIN,
  brainMapSampleSummary,
} from "@/lib/brain-map-sample";
import { heatFieldDataUri } from "@/lib/brain-map-raster";

/**
 * The head-shaped heat map, drawn from lib/brain-map-sample.ts — the same 21
 * numbers as the bar chart (components/BrainMapBars.tsx). It replaced the
 * static render (public/images/brain-map-heat.png) on 2026-10-19 so the two
 * visuals cannot disagree.
 *
 * Inline SVG: the interpolated field is a small PNG the server computes
 * from the dataset (lib/brain-map-raster.ts), clipped to the head; the
 * outline, nose, ears, the 21 site dots and labels, and the legend are
 * vectors on top, so they stay crisp at any size. The legend is HTML
 * (BrainMapLegend, below), so its type holds 14.5px at every width; the
 * site labels are SVG text that globals.css enlarges under 1024px. Nothing
 * here is a measurement of anyone; the caption under it says so.
 *
 * `callouts`: numbered gold badges beside named sites (the stage's
 * "Results" step). Each entry marks one or more sites; the badge sits at
 * their centroid, nudged up and out.
 */
export type HeatCallout = { n: number; sites: string[] };

const VB_W = 640;
const CX = 320;
const CY = 296;
const R = 236;
const VB_H = CY + R + 40;

const SERIF = "'Cormorant Garamond', Georgia, serif";
const SANS = "'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif";

function toSvg(x: number, y: number): [number, number] {
  return [CX + x * R, CY - y * R];
}

export default function BrainMapHeat({
  callouts = [],
  className = "",
  legend = true,
}: {
  callouts?: HeatCallout[];
  className?: string;
  /** The colour bar and the three band names under the head. */
  legend?: boolean;
}) {
  const field = heatFieldDataUri();
  // Several heat maps share a page (the Scan and Results panels, /brain-map's
  // preview), and SVG ids are document-wide: a shared clipPath id made every
  // instance after the first clip its field to nothing. One id per instance.
  const clipId = `bmh-head-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const calloutSpots = callouts.map((c) => {
    const pts = c.sites.map((id) => BRAIN_MAP_SITES.find((s) => s.id === id)!).filter(Boolean);
    const mx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
    const my = pts.reduce((a, p) => a + p.y, 0) / pts.length;
    const [x, y] = toSvg(mx, my);
    // Badge to the left of a left-hemisphere (or midline) site, to the right
    // otherwise — beside the site, never over its label above.
    return { n: c.n, x, y, left: mx <= 0, up: my >= 0 };
  });
  return (
    <div className="bmh">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="xMidYMid meet"
      className={`bmh-svg${className ? ` ${className}` : ""}`}
      role="img"
      aria-label={brainMapSampleSummary()}
      fontFamily={SANS}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx={CX} cy={CY} r={R} />
        </clipPath>
      </defs>
      {/* ears and nose, behind the head */}
      <path d={`M ${CX - R + 6} ${CY - 30} q -34 30 0 60`} fill="none" stroke="#1C2B3A" strokeWidth="2.5" strokeLinecap="round" />
      <path d={`M ${CX + R - 6} ${CY - 30} q 34 30 0 60`} fill="none" stroke="#1C2B3A" strokeWidth="2.5" strokeLinecap="round" />
      <path d={`M ${CX - 26} ${CY - R + 8} L ${CX} ${CY - R - 30} L ${CX + 26} ${CY - R + 8}`} fill="#FBF8F1" stroke="#1C2B3A" strokeWidth="2.5" strokeLinejoin="round" />
      {/* the field, clipped to the head */}
      <image
        href={field}
        x={CX - R}
        y={CY - R}
        width={R * 2}
        height={R * 2}
        preserveAspectRatio="none"
        clipPath={`url(#${clipId})`}
        style={{ imageRendering: "auto" }}
      />
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="#1C2B3A" strokeWidth="2.5" />
      {/* the 21 sites */}
      {BRAIN_MAP_SITES.map((s) => {
        const [x, y] = toSvg(s.x, s.y);
        return (
          <g key={s.id}>
            <circle cx={x} cy={y} r={5} fill="#1C2B3A" />
            <text className="bmh-site" x={x} y={y - 12} textAnchor="middle" fontSize="18" fontWeight="600" fill="#1C2B3A">
              {s.id}
            </text>
          </g>
        );
      })}
      {/* numbered callouts (Results): a gold ring in the drawing marks the
          site; the numbered badge is HTML, below, so its type never shrinks
          with the SVG on a phone. */}
      {calloutSpots.map((c) => (
        <circle key={c.n} className="bmh-ring" cx={c.x} cy={c.y} r={16} fill="none" stroke="#a9853f" strokeWidth="3" />
      ))}
    </svg>
    {calloutSpots.length > 0 && (
      <ol className="bmh-badges" aria-hidden="true">
        {calloutSpots.map((c) => (
          <li
            key={c.n}
            className={`bmh-badge${c.left ? " is-left" : " is-right"}`}
            style={{ left: `${(c.x / VB_W) * 100}%`, top: `${(c.y / VB_H) * 100}%` }}
          >
            {c.n}
          </li>
        ))}
      </ol>
    )}
    {legend && <BrainMapLegend scale />}
    </div>
  );
}

/**
 * The legend both charts share, as HTML so its type is 14.5px at every
 * width (an SVG legend shrank with the drawing — 8px on a phone). `scale`
 * adds the heat map's colour bar with the 10 and 35 µV marks.
 */
export function BrainMapLegend({ scale = false }: { scale?: boolean }) {
  const bands: Array<keyof typeof BRAIN_MAP_BAND_COLORS> = ["low", "typical", "high"];
  return (
    <div className="bm-legend" aria-hidden="true">
      {scale && (
        <div className="bm-legend-scale">
          <span className="bm-legend-bar" />
          <span className="bm-legend-tick" style={{ left: "28%" }}>{BRAIN_MAP_TYPICAL_MIN} µV</span>
          <span className="bm-legend-tick" style={{ left: "77%" }}>{BRAIN_MAP_TYPICAL_MAX} µV</span>
        </div>
      )}
      <ul className="bm-legend-bands">
        {bands.map((b) => (
          <li key={b}>
            <i style={{ background: BRAIN_MAP_BAND_COLORS[b] }} />
            {BRAIN_MAP_BAND_LABELS[b]}
          </li>
        ))}
      </ul>
    </div>
  );
}
