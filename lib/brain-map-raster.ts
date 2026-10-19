// Server-side only: node:zlib. Imported by server components, never by the client stage.
import { deflateSync } from "node:zlib";
import { colorForUv, uvAt } from "./brain-map-sample";

/**
 * The heat map's painted field, as a small PNG data URI, computed once per
 * server process from lib/brain-map-sample.ts — the raster the SVG in
 * components/BrainMapHeat.tsx clips to the head. Rendered on the server
 * (pages are static, so at build), never shipped as code to the browser.
 *
 * 168×168 pixels over the unit square [-1, 1]²; the browser scales it up
 * with bilinear smoothing, which is what a topographic map wants. ~10 KB.
 */
const SIZE = 168;

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
  const crcInput = out.subarray(4, 8 + data.length);
  dv.setUint32(8 + data.length, crc32(crcInput));
  return out;
}

function encodePng(width: number, height: number, rgb: Uint8Array): Uint8Array {
  const raw = new Uint8Array((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0; // filter: none
    raw.set(rgb.subarray(y * width * 3, (y + 1) * width * 3), y * (width * 3 + 1) + 1);
  }
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, width);
  dv.setUint32(4, height);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const idat = new Uint8Array(deflateSync(raw, { level: 9 }));
  const parts = [sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", new Uint8Array())];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const png = new Uint8Array(total);
  let o = 0;
  for (const p of parts) { png.set(p, o); o += p.length; }
  return png;
}

let cached: string | null = null;

/** `data:image/png;base64,…` of the interpolated field over the unit square. */
export function heatFieldDataUri(): string {
  if (cached) return cached;
  const rgb = new Uint8Array(SIZE * SIZE * 3);
  for (let j = 0; j < SIZE; j++) {
    // Row 0 is the top of the image, which is the nose (y = +1).
    const y = 1 - (2 * (j + 0.5)) / SIZE;
    for (let i = 0; i < SIZE; i++) {
      const x = -1 + (2 * (i + 0.5)) / SIZE;
      const [r, g, b] = colorForUv(uvAt(x, y));
      const o = (j * SIZE + i) * 3;
      rgb[o] = r; rgb[o + 1] = g; rgb[o + 2] = b;
    }
  }
  cached = `data:image/png;base64,${Buffer.from(encodePng(SIZE, SIZE, rgb)).toString("base64")}`;
  return cached;
}
