/**
 * Videos (components/VideoEmbed.tsx). Shaped like lib/resources.ts: one
 * record per video, the page reads the record, the schema reads the same
 * record (lib/schema.ts → videoObjectSchema), so the two cannot disagree.
 *
 * ## What a record is, and is not
 *
 * `id` is the YouTube video id and nothing else — the embed URL, the watch
 * URL and the poster's filename are all derived from it below, so there is
 * one string to get right. `posterPath` is a file in `public/images/videos/`
 * fetched once by `npm run fetch:posters` and committed: the page never asks
 * i.ytimg.com for anything at runtime (see the facade note in VideoEmbed).
 *
 * `durationSeconds` and `uploadDate` are Verifiables from lib/site-config.ts
 * because they are facts the markup publishes and nobody has confirmed them.
 * Draft renders the gold tag; production renders no duration and the schema
 * leaves both fields out. Do not type a guess into either — YouTube's own
 * page shows the duration, and a wrong `uploadDate` is a wrong claim in the
 * markup, not a cosmetic one.
 *
 * ## Why youtube-nocookie.com
 *
 * The embed is served from `www.youtube-nocookie.com`, YouTube's
 * privacy-enhanced host: it sets no advertising cookies until the visitor
 * plays, and nothing before that. The site's privacy notice describes a page
 * that does not hand a visitor to a third party for reading a form, and the
 * ordinary embed host would have done exactly that.
 */

import {
  type Verifiable,
  VIDEO_APPOINTMENT_ONE_DURATION,
  VIDEO_APPOINTMENT_ONE_UPLOAD_DATE,
} from "./site-config";

export type Video = {
  /** The YouTube video id — `youtube.com/watch?v=<id>`. */
  id: string;
  title: string;
  /** One or two plain sentences: what the video shows. Also the schema's
   *  `description`, so it must describe the video and not sell anything. */
  description: string;
  /** Running time in whole seconds, once Ben confirms it. */
  durationSeconds: Verifiable<number | null>;
  /** ISO day the video was published, once Ben confirms it. */
  uploadDate: Verifiable<string | null>;
  /** Site-root-relative path of the committed poster (`npm run fetch:posters`). */
  posterPath: string;
};

export const videos: Video[] = [
  {
    id: "FCUyUqzE3Dk",
    // Ben's title for the site (Oct 2026). The channel's own title is
    // "Your First Appointment at Harmonized Brain Centers: What to Expect";
    // the schema `name` carries the title the page renders, which is this one.
    title: "What to Expect: Appointment #1",
    description:
      "A walk through a first appointment at Harmonized Brain Centers, from the practice's own channel — what the visit looks like before anyone decides anything.",
    durationSeconds: VIDEO_APPOINTMENT_ONE_DURATION,
    uploadDate: VIDEO_APPOINTMENT_ONE_UPLOAD_DATE,
    posterPath: "/images/videos/FCUyUqzE3Dk.jpg",
  },
];

/** The record for an id. Throws rather than returning undefined: a page
 *  asking for a video that is not in the catalog is a build error, not a
 *  runtime "nothing rendered". */
export function getVideo(id: string): Video {
  const video = videos.find((v) => v.id === id);
  if (!video) throw new Error(`lib/videos.ts has no video with id "${id}"`);
  return video;
}

/** The privacy-enhanced embed. `autoplay` is added only by the facade, on
 *  click — the schema's `embedUrl` is the bare player. `rel=0` keeps the
 *  end screen to this channel's videos. */
export function embedUrl(video: Video, { autoplay = false } = {}): string {
  const params = new URLSearchParams({ rel: "0" });
  if (autoplay) params.set("autoplay", "1");
  return `https://www.youtube-nocookie.com/embed/${video.id}?${params}`;
}

/** The public watch page — for a plain link, never for an iframe. */
export function watchUrl(video: Video): string {
  return `https://www.youtube.com/watch?v=${video.id}`;
}

/** Verified running time in seconds, else null (draft mode shows the tag). */
export function videoDuration(video: Video): number | null {
  const seconds = video.durationSeconds.verified ? video.durationSeconds.value : null;
  return seconds && seconds > 0 ? seconds : null;
}

/** Verified upload date, else null. */
export function videoUploadDate(video: Video): string | null {
  return video.uploadDate.verified ? video.uploadDate.value : null;
}

/** 192 → "3:12"; 3725 → "1:02:05". For the caption. */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

/** 192 → "PT3M12S" — schema.org `duration` is ISO 8601. */
export function isoDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `PT${h > 0 ? `${h}H` : ""}${m > 0 ? `${m}M` : ""}${s > 0 || (h === 0 && m === 0) ? `${s}S` : ""}`;
}

/** The draft-mode tags for whatever is still unconfirmed on a record. */
export function videoConfirmTags(video: Video): string[] {
  return [video.durationSeconds, video.uploadDate]
    .filter((v) => !v.verified)
    .map((v) => v.note ?? "[CONFIRM]");
}
