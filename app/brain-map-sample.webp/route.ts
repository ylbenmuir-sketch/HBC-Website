import { brainMapSampleWebp } from "@/lib/brain-map-sample-image";

/**
 * /brain-map-sample.webp — the small sample Brain Map on the homepage hero's
 * floating card (lib/brain-map-sample-image.ts): rendered once at build from
 * lib/brain-map-sample.ts, 10 KB at most, served as a static, long-cached
 * image. app/page.tsx references it with the dataset's version in the query,
 * so a changed number is a new URL.
 */
export const dynamic = "force-static";

export async function GET() {
  const webp = await brainMapSampleWebp();
  return new Response(Buffer.from(webp), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
