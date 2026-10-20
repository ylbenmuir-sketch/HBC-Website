import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import FinalCTA from "@/components/FinalCTA";
import PageSchema from "@/components/PageSchema";
import VideoCard from "@/components/VideoCard";
import { hubTrail, pageMetadata } from "@/lib/pages";
import { VIDEO_GROUPS, videos } from "@/lib/videos";

// Title, description and the page's content date live in lib/pages.ts.
export const metadata: Metadata = pageMetadata("/videos");

/**
 * Every video in lib/videos.ts, on three shelves (VIDEO_GROUPS), each card
 * a link to the video's own page. Posters only — no player on this page, so
 * nothing from YouTube loads here at all.
 */
export default function VideosPage() {
  const trail = hubTrail("/videos");
  return (
    <>
      <PageSchema path="/videos" breadcrumb={trail} />
      <Breadcrumbs trail={trail} />
      <section className="page-hero center">
        <div className="wrap rv">
          <div className="eyebrow">Videos</div>
          <h1>LENS neurofeedback, on video.</h1>
          <p className="sub" style={{ maxWidth: "58ch" }}>
            Clients in their own words, short answers about LENS, and longer
            conversations about the brain &mdash; from our own channel.
          </p>
        </div>
      </section>

      {VIDEO_GROUPS.map((g, i) => {
        const shelf = videos.filter((v) => v.group === g.key);
        if (shelf.length === 0) return null;
        return (
          <section
            key={g.key}
            id={g.key}
            className={`sec vid-shelf${i % 2 === 1 ? " sec-ivory2" : ""}`}
          >
            <div className="wrap">
              <div className="sec-head rv">
                <div className="eyebrow">{g.eyebrow}</div>
                <h2>{g.heading}</h2>
                <p className="sub" style={{ fontSize: 17 }}>
                  {g.intro}
                </p>
              </div>
              <div className="res-grid vid-grid rv">
                {shelf.map((v) => (
                  <VideoCard key={v.id} video={v} />
                ))}
              </div>
            </div>
          </section>
        );
      })}

      <FinalCTA />
    </>
  );
}
