import { SITE_URL } from "@/lib/site-config";
import {
  embedUrl,
  videoDuration,
  videoPath,
  videoUploadDate,
  videos,
} from "@/lib/videos";

/**
 * Google's video sitemap: every watch page (app/videos/[slug]) with the one
 * video it is about. Referenced from robots.txt, and the URL to submit in
 * Search Console beside sitemap.xml (VIDEO-MAP.md).
 *
 * Every field comes from the same lib/videos.ts record the page and its
 * VideoObject read, so the three cannot disagree: `thumbnail_loc` is the
 * committed poster, `player_loc` the privacy-enhanced player the facade
 * loads. `duration` and `publication_date` appear only while verified, the
 * same rule the schema follows. Static at build; a new video is a new build.
 */
export const dynamic = "force-static";

const escape = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

export function GET() {
  const entries = videos.map((v) => {
    const seconds = videoDuration(v);
    const published = videoUploadDate(v);
    return `  <url>
    <loc>${SITE_URL}${videoPath(v)}</loc>
    <video:video>
      <video:thumbnail_loc>${SITE_URL}${v.posterPath}</video:thumbnail_loc>
      <video:title>${escape(v.sourceTitle)}</video:title>
      <video:description>${escape(v.description)}</video:description>
      <video:player_loc>${escape(embedUrl(v))}</video:player_loc>${
        seconds ? `\n      <video:duration>${seconds}</video:duration>` : ""
      }${published ? `\n      <video:publication_date>${published}</video:publication_date>` : ""}
    </video:video>
  </url>`;
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${entries.join("\n")}
</urlset>
`;
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
}
