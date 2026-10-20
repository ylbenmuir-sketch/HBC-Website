"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import ConfirmTag from "./ConfirmTag";
import {
  type Video,
  embedUrl,
  formatDuration,
  videoConfirmTags,
  videoDuration,
} from "@/lib/videos";

/**
 * A YouTube video as a facade: the committed poster and a real play button,
 * and nothing from YouTube until the button is pressed.
 *
 * ## Why not an iframe
 *
 * The standard embed pulls roughly a megabyte of third-party JavaScript the
 * moment the page loads — before anyone has decided to watch — and does it
 * on a page whose real LCP sits at the floor (PERF-PASS.md). It also sets
 * cookies on arrival. Here the page ships one optimized JPEG (`npm run
 * fetch:posters`, served through next/image like every other photograph)
 * and a button; the iframe is created on click, from the privacy-enhanced
 * host, with `autoplay=1` so the click that created it is the click that
 * starts it. Nothing plays on arrival, on any device.
 *
 * ## The button is a button
 *
 * A real `<button>` with a label that names the video, so it is in the tab
 * order, operable from a keyboard, and read by a screen reader as what it
 * is. Once the player mounts, focus moves into it — the thing the visitor
 * was interacting with has gone, and focus must not fall to the body.
 *
 * ## Dressed like PhotoFrame
 *
 * Same 4px corners, the same gold hairline the eyebrows use, the ivory
 * ground — see the video block in globals.css. The caption carries the
 * title and, once verified, the running time; in draft mode the gold
 * [Confirm …] tags sit there too (lib/videos.ts).
 */
export default function VideoEmbed({
  video,
  sizes = "(max-width: 1060px) 100vw, 50vw",
  priority = false,
  caption = true,
}: {
  video: Video;
  /** next/image `sizes` for the poster — match the rendered column. */
  sizes?: string;
  /** Preload the poster. Only on a watch page, where the video is the page
   *  and its poster the LCP element; everywhere else it sits below the
   *  fold and loads lazily. */
  priority?: boolean;
  /** The title strip under the stage. Off on a watch page, whose H1 is the
   *  title and whose meta line carries the running time. */
  caption?: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const player = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (playing) player.current?.focus();
  }, [playing]);

  const seconds = videoDuration(video);
  const duration = seconds ? formatDuration(seconds) : null;
  const tags = videoConfirmTags(video);

  return (
    <figure className="video-frame">
      <div className="video-stage">
        {playing ? (
          <iframe
            ref={player}
            src={embedUrl(video, { autoplay: true })}
            title={video.sourceTitle}
            // Only what a player needs. The site-wide Permissions-Policy
            // (next.config.ts) denies camera, microphone, geolocation and
            // payment to every frame, and a video player asks for none of
            // them — verified in a production build, Oct 2026.
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
          />
        ) : (
          <>
            {/* Decorative: the caption names the video and the button is
                labelled, so the poster adds nothing a reader needs. */}
            <Image src={video.posterPath} alt="" fill sizes={sizes} priority={priority} />
            <button
              type="button"
              className="video-play"
              onClick={() => setPlaying(true)}
              aria-label={`Play video: ${video.title}${duration ? `, ${duration}` : ""}`}
            >
              <span className="video-play-disc" aria-hidden="true">
                <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5.5v13l11-6.5z" />
                </svg>
              </span>
              <span className="video-play-label" aria-hidden="true">
                Play{duration ? ` · ${duration}` : ""}
              </span>
            </button>
          </>
        )}
      </div>
      {caption && (
        <figcaption className="video-caption">
          <span className="video-title">{video.title}</span>
          {(duration || tags.length > 0) && (
            <span className="video-meta">
              {duration}
              {tags.map((tag) => (
                <ConfirmTag key={tag} style={{ marginLeft: duration ? 10 : 0 }}>
                  {tag}
                </ConfirmTag>
              ))}
            </span>
          )}
        </figcaption>
      )}
    </figure>
  );
}
