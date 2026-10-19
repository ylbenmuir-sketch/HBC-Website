import { BrainMapLegend } from "./BrainMapHeat";
import {
  BRAIN_MAP_BAND_COLORS,
  BRAIN_MAP_SITES,
  BRAIN_MAP_TYPICAL_MAX,
  BRAIN_MAP_TYPICAL_MIN,
  bandOf,
  brainMapSampleSummary,
} from "@/lib/brain-map-sample";

/**
 * The bar chart of the sample Brain Map — the same 21 numbers as the heat
 * map (lib/brain-map-sample.ts). It replaced the supplied artwork
 * (public/images/brain-map-chart.svg) on 2026-10-19 so the two cannot
 * disagree: one bar per site in montage order (front to back), coloured by
 * band, the 10–35 µV typical range shaded, and the legend the heat map
 * uses — "Lower · Typical range · Higher". No "rigidity / flexibility".
 *
 * Two drawings of the same data, and CSS shows one (`.bmb-v` from 760px up,
 * `.bmb-h` below): 21 upright bars with their labels need about 700px to
 * read, so phones get the chart turned on its side — one row per site, the
 * label beside its bar — which is taller, not narrower, and every one of
 * the 21 is legible at 320. Neither depends on a reveal or a script to draw.
 */
const SANS = "'DM Sans', system-ui, -apple-system, 'Segoe UI', sans-serif";
const MAX_UV = 45;

/** Upright bars — tablets and desktops. */
function Vertical() {
  // 720 units wide: the homepage stage shows it at about 570px, so 18-unit
  // labels read at 14px there (and /brain-map caps the box at 820px so they
  // never balloon).
  const W = 720, H = 450;
  const L = 56, Rr = 16, T = 58, B = 400;
  const plotW = W - L - Rr, plotH = B - T;
  const yOf = (uv: number) => B - (uv / MAX_UV) * plotH;
  const n = BRAIN_MAP_SITES.length;
  const slot = plotW / n;
  const bw = Math.min(22, slot * 0.64);
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} className="bmb-svg bmb-v" role="img" aria-label={brainMapSampleSummary()} fontFamily={SANS}>
      <rect x={L} y={yOf(BRAIN_MAP_TYPICAL_MAX)} width={plotW} height={yOf(BRAIN_MAP_TYPICAL_MIN) - yOf(BRAIN_MAP_TYPICAL_MAX)} fill="#8FA75A" opacity="0.13" />
      {[0, 10, 20, 30, 40].map((v) => (
        <g key={v}>
          <line x1={L} y1={yOf(v)} x2={W - Rr} y2={yOf(v)} stroke={v === BRAIN_MAP_TYPICAL_MIN || v === 30 ? "#E6E1D6" : "#E6E1D6"} strokeWidth="1" />
          <text x={L - 10} y={yOf(v) + 6} textAnchor="end" fontSize="17" fill="#5d6873">{v}</text>
        </g>
      ))}
      {[BRAIN_MAP_TYPICAL_MIN, BRAIN_MAP_TYPICAL_MAX].map((v) => (
        <line key={v} x1={L} y1={yOf(v)} x2={W - Rr} y2={yOf(v)} stroke="#8FA75A" strokeWidth="1" strokeDasharray="4 4" opacity="0.7" />
      ))}
      <text x={W - Rr - 8} y={yOf(BRAIN_MAP_TYPICAL_MAX) + 22} textAnchor="end" fontSize="17" fontWeight="500" fill="#596E5B">Typical range {BRAIN_MAP_TYPICAL_MIN}–{BRAIN_MAP_TYPICAL_MAX} µV</text>
      <text x={16} y={(T + B) / 2} fontSize="17" fill="#5d6873" textAnchor="middle" transform={`rotate(-90 16 ${(T + B) / 2})`}>µV</text>
      {BRAIN_MAP_SITES.map((s, i) => {
        const x = L + slot * i + (slot - bw) / 2;
        const y = yOf(s.uv);
        return (
          <g key={s.id}>
            <rect x={x} y={y} width={bw} height={B - y} rx={3} fill={BRAIN_MAP_BAND_COLORS[bandOf(s.uv)]} />
            <text x={x + bw / 2} y={B + 24} textAnchor="middle" fontSize="18" fontWeight="500" fill="#243240">{s.id}</text>
          </g>
        );
      })}
      <line x1={L} y1={B} x2={W - Rr} y2={B} stroke="#1C2B3A" strokeWidth="1" opacity="0.35" />
      <text x={L} y={30} fontSize="20" fontWeight="600" fill="#1C2B3A">Sample recording — {BRAIN_MAP_SITES.length} sites</text>
    </svg>
  );
}

/** Sideways bars — phones. */
function Horizontal() {
  // 330 units wide: at the 342px a 390px phone gives the chart one unit is
  // about one pixel, so 15.5-unit labels read at 15px (12.5px at 320).
  const row = 27, n = BRAIN_MAP_SITES.length;
  const W = 330, L = 50, Rr = 14, T = 44;
  const B = T + row * n;
  const H = B + 46;
  const plotW = W - L - Rr;
  const xOf = (uv: number) => L + (uv / MAX_UV) * plotW;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${W} ${H}`} className="bmb-svg bmb-h" role="img" aria-label={brainMapSampleSummary()} fontFamily={SANS}>
      <text x={L} y={22} fontSize="17" fontWeight="600" fill="#1C2B3A">Sample recording — {n} sites</text>
      <rect x={xOf(BRAIN_MAP_TYPICAL_MIN)} y={T - 6} width={xOf(BRAIN_MAP_TYPICAL_MAX) - xOf(BRAIN_MAP_TYPICAL_MIN)} height={B - T + 6} fill="#8FA75A" opacity="0.13" />
      {[BRAIN_MAP_TYPICAL_MIN, BRAIN_MAP_TYPICAL_MAX].map((v) => (
        <line key={v} x1={xOf(v)} y1={T - 6} x2={xOf(v)} y2={B} stroke="#8FA75A" strokeWidth="1" strokeDasharray="4 4" opacity="0.8" />
      ))}
      {BRAIN_MAP_SITES.map((s, i) => {
        const y = T + row * i;
        return (
          <g key={s.id}>
            <text x={L - 9} y={y + row / 2 + 5} textAnchor="end" fontSize="15.5" fontWeight="600" fill="#243240">{s.id}</text>
            <rect x={L} y={y + 5} width={xOf(s.uv) - L} height={row - 10} rx={3} fill={BRAIN_MAP_BAND_COLORS[bandOf(s.uv)]} />
          </g>
        );
      })}
      <line x1={L} y1={T - 6} x2={L} y2={B} stroke="#1C2B3A" strokeWidth="1" opacity="0.35" />
      {[0, 10, 20, 30, 40].map((v) => (
        <text key={v} x={xOf(v)} y={B + 20} textAnchor="middle" fontSize="14.5" fill="#5d6873">{v}</text>
      ))}
      <text x={xOf(MAX_UV / 2)} y={B + 40} textAnchor="middle" fontSize="14.5" fill="#5d6873">µV · typical range {BRAIN_MAP_TYPICAL_MIN}–{BRAIN_MAP_TYPICAL_MAX}</text>
    </svg>
  );
}

export default function BrainMapBars() {
  return (
    <div className="bmb">
      <Vertical />
      <Horizontal />
      <BrainMapLegend />
    </div>
  );
}
