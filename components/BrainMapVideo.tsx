"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

/**
 * The video slot in /murfreesboro's hero (Ben, 2026-11-22): a compact 16:9
 * frame directly under the headline and the sentence.
 *
 * Until the clip exists (lib/murfreesboro.ts → BRAIN_MAP_VIDEO.src is
 * null) it is the poster — a real HBC photo — with "What is a Brain Map?"
 * and "Video coming soon." on it. Nothing to press, so nothing pretends to
 * be a player.
 *
 * With a clip: self-hosted <video>, no third-party script. It starts by
 * itself only muted, only once the page has finished loading and the slot
 * is on screen, and never for a visitor who asked for reduced motion or
 * reduced data — `preload="none"`, so not one byte of it is fetched before
 * that and the poster (next/image, below the transparent <video>) stays
 * the first paint. Captions are on from the start. Play/pause and
 * mute/unmute are real buttons on the frame. It never opens a dialog,
 * never takes the screen, and the form beside or under it does not depend
 * on it in any way.
 */
export type BrainMapVideoSource = {
  src: string | null;
  captions: string | null;
  poster: string;
  posterAlt: string;
  title: string;
  soon: string;
};

export default function BrainMapVideo({ video }: { video: BrainMapVideoSource }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  // The poster's label steps aside once the clip has been started.
  const [started, setStarted] = useState(false);
  const live = Boolean(video.src);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    if (reduceMotion || saveData) return;
    let io: IntersectionObserver | null = null;
    const arm = () => {
      io = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting) return;
          io?.disconnect();
          // Muted, always: a browser refuses anything else, and so do we.
          v.muted = true;
          v.play().catch(() => {});
        },
        { threshold: 0.5 }
      );
      io.observe(v);
    };
    if (document.readyState === "complete") arm();
    else window.addEventListener("load", arm, { once: true });
    return () => {
      window.removeEventListener("load", arm);
      io?.disconnect();
    };
  }, [live]);

  function showCaptions() {
    const track = ref.current?.textTracks?.[0];
    if (track) track.mode = "showing";
  }

  function togglePlay() {
    const v = ref.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }

  function toggleMute() {
    const v = ref.current;
    if (!v) return;
    const wasPlaying = !v.paused;
    v.muted = !v.muted;
    // A browser may pause a clip that began muted when its sound comes on;
    // this is a tap, so it may carry on.
    if (wasPlaying && v.paused) v.play().catch(() => {});
  }

  return (
    <figure className={`mb-video${live ? " mb-video-live" : ""}${started ? " mb-video-started" : ""}`}>
      <Image src={video.poster} alt={video.posterAlt} fill priority sizes="(min-width: 900px) 580px, 100vw" />
      {live && (
        <video
          ref={ref}
          muted
          playsInline
          preload="none"
          aria-label={video.title}
          onPlay={() => {
            setPlaying(true);
            setStarted(true);
            showCaptions();
          }}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
          onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
          onLoadedMetadata={showCaptions}
        >
          <source src={video.src ?? undefined} type={video.src?.endsWith(".webm") ? "video/webm" : "video/mp4"} />
          {video.captions && <track kind="captions" src={video.captions} srcLang="en" label="English" default />}
        </video>
      )}
      <figcaption className="mb-video-label">
        <span className="mb-video-title">{video.title}</span>
        {!live && <span className="mb-video-soon">{video.soon}</span>}
      </figcaption>
      {live && (
        <div className="mb-video-controls">
          <button type="button" onClick={togglePlay} aria-label={playing ? "Pause the video" : "Play the video"}>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              {playing ? <path d="M3 2h3.5v12H3zM9.5 2H13v12H9.5z" fill="currentColor" /> : <path d="M4 2l10 6-10 6z" fill="currentColor" />}
            </svg>
            <span>{playing ? "Pause" : "Play"}</span>
          </button>
          <button type="button" onClick={toggleMute} aria-pressed={!muted} aria-label={muted ? "Turn the sound on" : "Turn the sound off"}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M2 6h2.5L8 3v10L4.5 10H2z" fill="currentColor" />
              {muted ? (
                <path d="M10.5 6l4 4m0-4l-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              ) : (
                <path d="M10.5 5.5a3.5 3.5 0 0 1 0 5M12.3 3.5a6 6 0 0 1 0 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              )}
            </svg>
            <span>{muted ? "Unmute" : "Mute"}</span>
          </button>
        </div>
      )}
    </figure>
  );
}
