/**
 * THE sample brain — one dataset that drives every Brain Map visual on the
 * site (Ben, 2026-10-19): the head-shaped heat map and the bar chart, on the
 * homepage stage and on /brain-map, so the two can never disagree.
 *
 * 21 sites of the 10-20 montage (BRAIN_MAP_POINTS), front to back, left to
 * right, with a microvolt amplitude for each. The shape is Ben's brief:
 * F7 clearly high (above 35 µV); Fp1, F3 and F8 upper range or mildly high;
 * C3, Cz, Pz, O1, Oz and O2 low (below 10 µV); everything else inside the
 * 10–35 µV typical range. It is a sample, not a client: nothing here is a
 * measurement of anyone.
 *
 * Positions are the standard 2-D projection of the montage on a unit head
 * (x right, y toward the nose), scaled so the rim sites sit inside the
 * outline. Dependency-free: imported by server components, the client
 * stage, and plain `node` tests alike.
 */

export type BrainMapBand = "low" | "typical" | "high";

export type BrainMapSite = {
  /** Montage label, e.g. "F7". */
  id: string;
  /** Unit-head position: x to the right, y toward the nose, |r| ≤ 1. */
  x: number;
  y: number;
  /** Amplitude in microvolts. */
  uv: number;
};

/** The typical range: below is "lower", above is "higher". */
export const BRAIN_MAP_TYPICAL_MIN = 10;
export const BRAIN_MAP_TYPICAL_MAX = 35;

/** Rim sites sit at this fraction of the head radius (as the renders do). */
const RIM = 0.86;

export const BRAIN_MAP_SITES: readonly BrainMapSite[] = [
  { id: "Fp1", x: -0.31 * RIM, y: 0.95 * RIM, uv: 36.0 },
  { id: "Fpz", x: 0, y: 1.0 * RIM, uv: 24.5 },
  { id: "Fp2", x: 0.31 * RIM, y: 0.95 * RIM, uv: 23.0 },
  { id: "F7", x: -0.81 * RIM, y: 0.59 * RIM, uv: 41.2 },
  { id: "F3", x: -0.4 * RIM, y: 0.5 * RIM, uv: 36.8 },
  { id: "Fz", x: 0, y: 0.5 * RIM, uv: 21.0 },
  { id: "F4", x: 0.4 * RIM, y: 0.5 * RIM, uv: 19.5 },
  { id: "F8", x: 0.81 * RIM, y: 0.59 * RIM, uv: 34.4 },
  { id: "T3", x: -1.0 * RIM, y: 0, uv: 17.5 },
  { id: "C3", x: -0.5 * RIM, y: 0, uv: 8.6 },
  { id: "Cz", x: 0, y: 0, uv: 7.9 },
  { id: "C4", x: 0.5 * RIM, y: 0, uv: 18.0 },
  { id: "T4", x: 1.0 * RIM, y: 0, uv: 16.5 },
  { id: "T5", x: -0.81 * RIM, y: -0.59 * RIM, uv: 15.0 },
  { id: "P3", x: -0.4 * RIM, y: -0.5 * RIM, uv: 13.5 },
  { id: "Pz", x: 0, y: -0.5 * RIM, uv: 8.8 },
  { id: "P4", x: 0.4 * RIM, y: -0.5 * RIM, uv: 14.5 },
  { id: "T6", x: 0.81 * RIM, y: -0.59 * RIM, uv: 16.0 },
  { id: "O1", x: -0.31 * RIM, y: -0.95 * RIM, uv: 7.4 },
  { id: "Oz", x: 0, y: -1.0 * RIM, uv: 6.8 },
  { id: "O2", x: 0.31 * RIM, y: -0.95 * RIM, uv: 7.9 },
];

export function bandOf(uv: number): BrainMapBand {
  if (uv < BRAIN_MAP_TYPICAL_MIN) return "low";
  if (uv > BRAIN_MAP_TYPICAL_MAX) return "high";
  return "typical";
}

/**
 * The three band colours, shared by the heat map, the bars and both legends:
 * the heat map's blue for lower, green for the typical range, orange for
 * higher. Legend wording is "Lower · Typical range · Higher" everywhere.
 */
export const BRAIN_MAP_BAND_COLORS: Record<BrainMapBand, string> = {
  low: "#4F7FAE",
  typical: "#8FA75A",
  high: "#D2693B",
};
export const BRAIN_MAP_BAND_LABELS: Record<BrainMapBand, string> = {
  low: "Lower",
  typical: "Typical range",
  high: "Higher",
};

/**
 * The continuous scale the heat map's field is painted with: the band
 * colours at the band centres, blending through the thresholds so the
 * picture reads as one surface rather than three flat zones.
 */
const SCALE: ReadonlyArray<[number, string]> = [
  [4, "#4F7FAE"],
  [9, "#8DB0CB"],
  [11, "#A9C3B0"],
  [16, "#8FA75A"],
  [28, "#8FA75A"],
  [33, "#CBC26A"],
  [36, "#E2A15C"],
  [42, "#D2693B"],
];

function hex(c: string): [number, number, number] {
  return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
}

/** Colour for a microvolt value, as [r, g, b] 0–255. */
export function colorForUv(uv: number): [number, number, number] {
  if (uv <= SCALE[0][0]) return hex(SCALE[0][1]);
  for (let i = 1; i < SCALE.length; i++) {
    const [v1, c1] = SCALE[i];
    if (uv <= v1) {
      const [v0, c0] = SCALE[i - 1];
      const t = (uv - v0) / (v1 - v0);
      const a = hex(c0), b = hex(c1);
      return [0, 1, 2].map((k) => Math.round(a[k] + (b[k] - a[k]) * t)) as [number, number, number];
    }
  }
  return hex(SCALE[SCALE.length - 1][1]);
}

/**
 * Amplitude at any point on the unit head, interpolated from the 21 sites
 * (inverse-distance weighting). The field the heat map paints.
 */
export function uvAt(x: number, y: number): number {
  let num = 0, den = 0;
  for (const s of BRAIN_MAP_SITES) {
    const d2 = (x - s.x) ** 2 + (y - s.y) ** 2;
    if (d2 < 1e-6) return s.uv;
    const w = 1 / (d2 * d2);
    num += w * s.uv;
    den += w;
  }
  return num / den;
}

/** The sites in a band, in montage order. */
export function sitesIn(band: BrainMapBand): BrainMapSite[] {
  return BRAIN_MAP_SITES.filter((s) => bandOf(s.uv) === band);
}

/** One sentence a screen reader (or a search engine) can use for either chart. */
export function brainMapSampleSummary(): string {
  const fmt = (b: BrainMapBand) => sitesIn(b).map((s) => s.id).join(", ");
  return (
    `Sample Brain Map, ${BRAIN_MAP_SITES.length} sites, amplitude in microvolts. ` +
    `Higher than the typical range of ${BRAIN_MAP_TYPICAL_MIN} to ${BRAIN_MAP_TYPICAL_MAX} microvolts: ${fmt("high")}. ` +
    `Lower: ${fmt("low")}. The rest are inside the typical range.`
  );
}
