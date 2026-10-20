import { heatFieldPng } from "@/lib/brain-map-raster";

/**
 * /brain-map-field.png — the heat map's painted field (lib/brain-map-raster.ts),
 * rendered once at build from lib/brain-map-sample.ts and served as a static,
 * long-cached image. components/BrainMapHeat.tsx references it with the
 * dataset's version in the query, so a changed number is a new URL.
 */
export const dynamic = "force-static";

export function GET() {
  const png = heatFieldPng();
  return new Response(Buffer.from(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
