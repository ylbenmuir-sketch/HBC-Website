// Server-side only (sharp, and node:zlib through lib/brain-map-raster.ts).
// Served by app/brain-map-sample.webp/route.ts; never imported by client code.
import sharp from "sharp";
import { heatFieldPng } from "./brain-map-raster";

/**
 * The small sample Brain Map on the homepage hero's floating card (Ben,
 * 2026-11-23): one static WebP, made at build time from the same dataset as
 * every other Brain Map on the site (lib/brain-map-sample.ts). No client
 * data — nothing here is a measurement of anyone.
 *
 * It is the painted field of /brain-map-field.png (lib/brain-map-raster.ts,
 * byte for byte), clipped to the head circle, under the head outline that
 * components/BrainMapHeat.tsx draws: the circle, the nose and the two ears,
 * at that component's own geometry. No site dots or labels: at 112px they
 * would be specks. Transparent outside the head.
 *
 * 224px square — twice the 112px it is shown at — and never over 10 KB:
 * the quality steps down until it fits, and the build fails if it cannot.
 */
export const SAMPLE_IMAGE_SHOWN_PX = 112;
export const SAMPLE_IMAGE_PX = SAMPLE_IMAGE_SHOWN_PX * 2;
export const SAMPLE_IMAGE_MAX_BYTES = 10 * 1024;

// components/BrainMapHeat.tsx's head: centre, radius, in its 640-wide viewBox.
const CX = 320;
const CY = 296;
const R = 236;
// A square window on that viewBox holding the nose tip (y 32) and both ears
// (x 73 … 567) with a little air: 520 units a side.
const VIEW = { x: 60, y: 20, size: 520 };
const INK = "#1C2B3A";
// The chart's 2-unit line would be under a pixel at this size.
const STROKE = 4.5;

function sampleSvg(): string {
  const field = Buffer.from(heatFieldPng()).toString("base64");
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${SAMPLE_IMAGE_PX}" height="${SAMPLE_IMAGE_PX}" viewBox="${VIEW.x} ${VIEW.y} ${VIEW.size} ${VIEW.size}">` +
    `<defs><clipPath id="head"><circle cx="${CX}" cy="${CY}" r="${R}"/></clipPath></defs>` +
    `<path d="M ${CX - R + 6} ${CY - 30} q -34 30 0 60" fill="none" stroke="${INK}" stroke-width="${STROKE}" stroke-linecap="round"/>` +
    `<path d="M ${CX + R - 6} ${CY - 30} q 34 30 0 60" fill="none" stroke="${INK}" stroke-width="${STROKE}" stroke-linecap="round"/>` +
    `<path d="M ${CX - 24} ${CY - R + 7} L ${CX} ${CY - R - 28} L ${CX + 24} ${CY - R + 7}" fill="#FBF8F1" stroke="${INK}" stroke-width="${STROKE}" stroke-linejoin="round"/>` +
    `<image xlink:href="data:image/png;base64,${field}" x="${CX - R}" y="${CY - R}" width="${R * 2}" height="${R * 2}" preserveAspectRatio="none" clip-path="url(#head)"/>` +
    `<circle cx="${CX}" cy="${CY}" r="${R}" fill="none" stroke="${INK}" stroke-width="${STROKE}"/>` +
    `</svg>`
  );
}

let cached: Promise<Uint8Array> | null = null;

/** The WebP bytes: 224×224, alpha, 10 KB at most. */
export function brainMapSampleWebp(): Promise<Uint8Array> {
  cached ??= (async () => {
    const svg = Buffer.from(sampleSvg());
    for (let quality = 82; quality >= 40; quality -= 6) {
      const out = await sharp(svg).resize(SAMPLE_IMAGE_PX, SAMPLE_IMAGE_PX).webp({ quality, alphaQuality: 90, effort: 6 }).toBuffer();
      if (out.length <= SAMPLE_IMAGE_MAX_BYTES) return new Uint8Array(out);
    }
    throw new Error(`brain map sample image: over ${SAMPLE_IMAGE_MAX_BYTES} bytes at every quality tried`);
  })();
  return cached;
}
