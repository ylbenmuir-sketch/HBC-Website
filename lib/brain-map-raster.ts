// Server-side only (node:zlib). Served by app/brain-map-field.png/route.ts;
// never imported by client code.
import { deflateSync } from "node:zlib";
import { colorForUv, uvAt } from "./brain-map-sample";

/**
 * The heat map's painted field as a PNG — the picture under the SVG head in
 * components/BrainMapHeat.tsx — computed once per server process from
 * lib/brain-map-sample.ts and served as a static image, so every heat map
 * on the site shares one cached file and the HTML carries no raster.
 *
 * 256×256 pixels over the unit square [-1, 1]². The colour is the band scale
 * at the interpolated microvolts; over it, thin white isolines every 3 µV
 * (6, 9, … 42), anti-aliased by the local gradient, which is what gave the
 * original render its clinical, topographic look (Ben, 2026-10-19).
 */
const SIZE = 256;
const LEVEL_STEP = 3;
const LEVEL_MIN = 6;
const LINE_HALF_WIDTH_PX = 0.55;
const LINE_ALPHA = 0.78;

function crc32(buf: Uint8Array): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  out.set(type.split("").map((ch) => ch.charCodeAt(0)), 4);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

function encodePng(width: number, height: number, rgb: Uint8Array): Uint8Array {
  const raw = new Uint8Array((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0;
    raw.set(rgb.subarray(y * width * 3, (y + 1) * width * 3), y * (width * 3 + 1) + 1);
  }
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, width);
  dv.setUint32(4, height);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const idat = new Uint8Array(deflateSync(raw, { level: 9 }));
  const parts = [sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", new Uint8Array())];
  const png = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    png.set(p, o);
    o += p.length;
  }
  return png;
}

let cached: Uint8Array | null = null;

/** The PNG bytes of the field with its isolines. */
export function heatFieldPng(): Uint8Array {
  if (cached) return cached;
  // The field first (row 0 is the nose, y = +1), then the lines from it.
  const v = new Float32Array(SIZE * SIZE);
  for (let j = 0; j < SIZE; j++) {
    const y = 1 - (2 * (j + 0.5)) / SIZE;
    for (let i = 0; i < SIZE; i++) {
      const x = -1 + (2 * (i + 0.5)) / SIZE;
      v[j * SIZE + i] = uvAt(x, y);
    }
  }
  const rgb = new Uint8Array(SIZE * SIZE * 3);
  for (let j = 0; j < SIZE; j++) {
    for (let i = 0; i < SIZE; i++) {
      const k = j * SIZE + i;
      const val = v[k];
      let [r, g, b] = colorForUv(val);
      // Distance to the nearest isoline, in pixels: |v − level| / |∇v|.
      const gx = (v[j * SIZE + Math.min(i + 1, SIZE - 1)] - v[j * SIZE + Math.max(i - 1, 0)]) / 2;
      const gy = (v[Math.min(j + 1, SIZE - 1) * SIZE + i] - v[Math.max(j - 1, 0) * SIZE + i]) / 2;
      const grad = Math.hypot(gx, gy) + 1e-6;
      const nearest = Math.round((val - LEVEL_MIN) / LEVEL_STEP) * LEVEL_STEP + LEVEL_MIN;
      const distPx = Math.abs(val - nearest) / grad;
      const a = Math.max(0, 1 - distPx / LINE_HALF_WIDTH_PX) * LINE_ALPHA;
      if (a > 0 && nearest >= LEVEL_MIN) {
        r = Math.round(r + (255 - r) * a);
        g = Math.round(g + (255 - g) * a);
        b = Math.round(b + (255 - b) * a);
      }
      rgb[k * 3] = r;
      rgb[k * 3 + 1] = g;
      rgb[k * 3 + 2] = b;
    }
  }
  cached = encodePng(SIZE, SIZE, rgb);
  return cached;
}
