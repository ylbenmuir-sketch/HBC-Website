import Link from "next/link";
import VideoEmbed from "./VideoEmbed";
import { type Video, videoPath } from "@/lib/videos";

/**
 * A content page's one video, below the fold (lib/videos.ts → `home`).
 *
 * The same facade as everywhere else — a committed poster, lazy, and no
 * YouTube request until the click — so it cannot touch the page's LCP. No
 * VideoObject here: the watch page is the one URL the video's markup lives
 * on, and this band links to it ("Watch on its own page →").
 *
 * Two shapes. `block` (the default) sits inside a section the page already
 * has, after its copy — the site's bands alternate plain / ivory strictly,
 * and a band of its own would put two of one tone side by side on most
 * templates. `section` is its own band, for a page with a gap to fill;
 * `tone` then keeps the alternation.
 */
export default function VideoBand({
  video,
  shape = "block",
  tone = "plain",
}: {
  video: Video;
  shape?: "block" | "section";
  tone?: "plain" | "ivory2";
}) {
  const body = (
    <>
      <div className="eyebrow rv">
        {video.story ? "A client story, on video" : "On video"}
      </div>
      <div className="rv" style={{ marginTop: 24 }}>
        <VideoEmbed video={video} sizes="(max-width: 760px) calc(100vw - 48px), 812px" />
      </div>
      {video.note && <p className="limit-line rv">{video.note}</p>}
      <div className="related rv">
        <Link href={videoPath(video)}>
          Watch on its own page <span className="arrow">&rarr;</span>
        </Link>
      </div>
    </>
  );
  if (shape === "block") return <div className="video-band video-band-block">{body}</div>;
  return (
    <section className={`sec video-band${tone === "ivory2" ? " sec-ivory2" : ""}`}>
      <div className="wrap" style={{ maxWidth: 900 }}>
        {body}
      </div>
    </section>
  );
}
