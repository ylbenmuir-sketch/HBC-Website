import Link from "next/link";
import Image from "next/image";
import { type Video, formatDuration, videoDuration, videoPath } from "@/lib/videos";

/** A poster card for the hub and the "Keep watching" shelf. */
export default function VideoCard({
  video,
  heading = "h3",
}: {
  video: Video;
  heading?: "h2" | "h3";
}) {
  const seconds = videoDuration(video);
  const H = heading;
  return (
    <Link className="res-card vid-card" href={videoPath(video)}>
      <div className="ph">
        <Image
          src={video.posterPath}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1060px) 50vw, 33vw"
          style={{ objectFit: "cover" }}
        />
        <span className="vid-card-play" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5.5v13l11-6.5z" />
          </svg>
        </span>
      </div>
      <div className="body">
        <div className="tag">
          {video.short ? "Short" : "Video"}
          {seconds ? <> &middot; {formatDuration(seconds)}</> : null}
        </div>
        <H>{video.title}</H>
        <span className="read">Watch &rarr;</span>
      </div>
    </Link>
  );
}
