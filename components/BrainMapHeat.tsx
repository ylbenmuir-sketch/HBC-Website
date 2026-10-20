import { useId } from "react";
import HeatTooltips from "./HeatTooltips";
import {
  BRAIN_MAP_BAND_COLORS,
  BRAIN_MAP_BAND_LABELS,
  BRAIN_MAP_SAMPLE_VERSION,
  BRAIN_MAP_SITES,
  BRAIN_MAP_TYPICAL_MAX,
  BRAIN_MAP_TYPICAL_MIN,
  bandOf,
  brainMapSampleSummary,
  fmtUv,
  siteById,
} from "@/lib/brain-map-sample";

/**
 * The head-shaped heat map, drawn from lib/brain-map-sample.ts — the same 21
 * numbers as the bar chart (components/BrainMapBars.tsx), on the homepage
 * stage, /brain-map and /how-lens-works.
 *
 * Inline SVG over a painted field: the field (colour by microvolts, thin
 * white isolines every 3 µV) is a PNG the server computes from the dataset
 * (lib/brain-map-raster.ts → /brain-map-field.png), clipped to the head;
 * outline, nose, ears, the 21 site dots and labels are vectors on top. The
 * legend is HTML (BrainMapLegend) so its type holds 14.5px at every width.
 *
 * Labels sit above their dot in small, light sans; Fpz's goes below (the
 * nose marker is above it). Every site is a focusable group carrying its
 * tooltip text ("F7 · 41 µV · Higher"); components/HeatTooltips.tsx shows it
 * on hover, tap or focus.
 *
 * `callouts` (the stage's Results step): a numbered gold marker ON the
 * site — replacing its dot — or, for a pair, between the two; the HTML
 * badge keeps its size at any width and lets pointer events through to the
 * site beneath. Labels move out of a marker's way: a single site's label
 * steps to the side, a pair's lower site labels below its dot.
 */
export type HeatCallout = { n: number; sites: string[] };

const VB_W = 640;
const CX = 320;
const CY = 296;
const R = 236;
const VB_H = CY + R + 40;
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
  legend?: boolean;
}) {
  // SVG ids are document-wide and several heat maps share a page.
  const clipId = `bmh-head-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const singleAnchor = new Set(callouts.filter((c) => c.sites.length === 1).map((c) => c.sites[0]));
  const lowerOfPair = new Set(
    callouts
      .filter((c) => c.sites.length > 1)
      .map((c) => c.sites.map(siteById).sort((a, b) => a.y - b.y)[0].id)
  );
  const markers = callouts.map((c) => {
    const pts = c.sites.map(siteById);
    const mx = pts.reduce((a, p) => a + p.x, 0) / pts.length;
    const my = pts.reduce((a, p) => a + p.y, 0) / pts.length;
    const [x, y] = toSvg(mx, my);
    return { n: c.n, x, y };
  });

  return (
    <HeatTooltips className={className}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="bmh-svg"
        role="img"
        aria-label={brainMapSampleSummary()}
        fontFamily={SANS}
      >
        <defs>
          <clipPath id={clipId}>
            <circle cx={CX} cy={CY} r={R} />
          </clipPath>
        </defs>
        <path d={`M ${CX - R + 6} ${CY - 30} q -34 30 0 60`} fill="none" stroke="#1C2B3A" strokeWidth="2" strokeLinecap="round" />
        <path d={`M ${CX + R - 6} ${CY - 30} q 34 30 0 60`} fill="none" stroke="#1C2B3A" strokeWidth="2" strokeLinecap="round" />
        <path d={`M ${CX - 24} ${CY - R + 7} L ${CX} ${CY - R - 28} L ${CX + 24} ${CY - R + 7}`} fill="#FBF8F1" stroke="#1C2B3A" strokeWidth="2" strokeLinejoin="round" />
        <image
          href={`/brain-map-field.png?v=${BRAIN_MAP_SAMPLE_VERSION}`}
          x={CX - R}
          y={CY - R}
          width={R * 2}
          height={R * 2}
          preserveAspectRatio="none"
          clipPath={`url(#${clipId})`}
        />
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="#1C2B3A" strokeWidth="2" />
        {BRAIN_MAP_SITES.map((s) => {
          const [x, y] = toSvg(s.x, s.y);
          const band = bandOf(s.uv);
          const tip = `${s.id} · ${fmtUv(s.uv)} · ${BRAIN_MAP_BAND_LABELS[band]}`;
          const aside = singleAnchor.has(s.id);
          const below = s.id === "Fpz" || lowerOfPair.has(s.id);
          const lx = aside ? x + (s.x <= 0 ? -30 : 30) : x;
          const ly = aside ? y + 4.5 : below ? y + 26 : y - 11;
          const anchor = aside ? (s.x <= 0 ? "end" : "start") : "middle";
          return (
            <g
              key={s.id}
              className="bmh-site"
              data-site={s.id}
              data-tip={tip}
              tabIndex={0}
              role="img"
              aria-label={`${s.id}, ${fmtUv(s.uv).replace("µV", "microvolts")}, ${BRAIN_MAP_BAND_LABELS[band].toLowerCase()}`}
            >
              <circle cx={x} cy={y} r={14} fill="transparent" />
              {!aside && <circle cx={x} cy={y} r={3.2} fill="#1C2B3A" />}
              <text className="bmh-label" x={lx} y={ly} textAnchor={anchor} fontSize="13" fontWeight="500" fill="#1C2B3A" fillOpacity="0.82">
                {s.id}
              </text>
            </g>
          );
        })}
      </svg>
      {markers.length > 0 && (
        <ol className="bmh-badges" aria-hidden="true">
          {markers.map((m) => (
            <li key={m.n} className="bmh-badge" style={{ left: `${(m.x / VB_W) * 100}%`, top: `${(m.y / VB_H) * 100}%` }}>
              {m.n}
            </li>
          ))}
        </ol>
      )}
      {legend && <BrainMapLegend scale />}
    </HeatTooltips>
  );
}

/** The legend both charts share: HTML, 14.5px at every width. `scale` adds
 *  the colour bar with the 10 and 35 µV marks. */
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
