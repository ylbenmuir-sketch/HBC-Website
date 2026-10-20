import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Breadcrumbs from "@/components/Breadcrumbs";
import FinalCTA from "@/components/FinalCTA";
import PageSchema from "@/components/PageSchema";
import VideoCard from "@/components/VideoCard";
import VideoEmbed from "@/components/VideoEmbed";
import { TalkCta } from "@/components/Buttons";
import { SHARED_OPEN_GRAPH_WITHOUT_IMAGES } from "@/lib/metadata";
import { videoRef } from "@/lib/schema";
import { getResource, isPublishable } from "@/lib/resources";
import { EXPERIENCES_DISCLAIMER, SHOW_DRAFT_CONTENT } from "@/lib/site-config";
import {
  VIDEO_GROUPS,
  VIDEO_PAGES_DATE,
  formatDuration,
  formatUploadDate,
  getVideoBySlug,
  videoDuration,
  videoPath,
  videoUploadDate,
  videos,
} from "@/lib/videos";

/**
 * One page per video (VIDEO-MAP.md). The video is the page: it sits at the
 * top, under the H1, and this is the only URL whose graph carries its
 * VideoObject — the content page that also embeds it (VideoBand) does not —
 * so Google has one place to list it. Listed in sitemap.xml and, with its
 * video, in /video-sitemap.xml.
 */
export function generateStaticParams() {
  return videos.map((v) => ({ slug: v.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const video = getVideoBySlug((await params).slug);
  if (!video) return {};
  return {
    title: video.title,
    description: video.description,
    // Spread, not replaced — see the note on the article route. The poster
    // is the card: it is the frame a visitor will see on the page.
    openGraph: {
      ...SHARED_OPEN_GRAPH_WITHOUT_IMAGES,
      type: "video.other",
      images: [{ url: video.posterPath, alt: video.title }],
    },
  };
}

/** A related link whose target exists in this build: an article in draft
 *  is dropped rather than linked into the 404. */
function linkIsLive(href: string): boolean {
  const article = href.match(/^\/resources\/([^/]+)$/)?.[1];
  if (!article) return true;
  const r = getResource(article);
  return Boolean(r && (SHOW_DRAFT_CONTENT || isPublishable(r)));
}

export default async function WatchPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const video = getVideoBySlug((await params).slug);
  if (!video) notFound();

  const path = videoPath(video);
  const trail = [{ label: "Videos", href: "/videos" }, { label: video.title }];
  const group = VIDEO_GROUPS.find((g) => g.key === video.group)!;
  const seconds = videoDuration(video);
  const uploaded = videoUploadDate(video);
  const related = video.related.filter((l) => linkIsLive(l.href));
  // Up to three more from the same shelf, then the hub.
  const more = videos.filter((v) => v.group === video.group && v.id !== video.id).slice(0, 3);

  return (
    <>
      <PageSchema
        path={path}
        breadcrumb={trail}
        page={{
          type: "WebPage",
          name: `${video.title} — Harmonized Brain Centers`,
          description: video.description,
          dateModified: VIDEO_PAGES_DATE,
          image: video.posterPath,
          mainEntity: videoRef(path, video),
        }}
        video={video}
      />
      <Breadcrumbs trail={trail} />

      <section className="sec-tight watch">
        <div className="wrap">
          {/* `above-fold`: no `.page-hero` on this template, so the reveal
              exemption is marked by hand — the title and the player are the
              first screen, and the poster is the LCP element. */}
          <div className="rv above-fold">
            <div className="eyebrow">{group.eyebrow}</div>
            <h1>{video.title}</h1>
          </div>
          <div className="rv above-fold watch-stage">
            <VideoEmbed
              video={video}
              priority
              caption={false}
              sizes="(max-width: 760px) calc(100vw - 48px), 1000px"
            />
          </div>
          <div className="watch-body rv">
            {(seconds || uploaded) && (
              <div className="meta">
                {seconds && <>Video &middot; {formatDuration(seconds)}</>}
                {seconds && uploaded && " · "}
                {uploaded && (
                  <>
                    Published <time dateTime={uploaded}>{formatUploadDate(uploaded)}</time>
                  </>
                )}
              </div>
            )}
            <p className="lede">{video.description}</p>
            {video.note && <p className="limit-line">{video.note}</p>}
            {video.story && <p className="limit-line">{EXPERIENCES_DISCLAIMER}</p>}
            <div className="hero-ctas" style={{ marginTop: 30 }}>
              <TalkCta />
            </div>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="sec sec-ivory2">
          <div className="wrap" style={{ maxWidth: 1000 }}>
            <div className="eyebrow">Read next</div>
            <div className="related">
              {related.map((l) => (
                <Link key={l.href} href={l.href}>
                  {l.label} <span className="arrow">&rarr;</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {more.length > 0 && (
        <section className="sec">
          <div className="wrap">
            <div className="sec-head rv">
              <div className="eyebrow">More from {group.eyebrow}</div>
              <h2>Keep watching.</h2>
            </div>
            <div className="res-grid vid-grid rv">
              {more.map((v) => (
                <VideoCard key={v.id} video={v} />
              ))}
            </div>
            <div className="related rv">
              <Link href="/videos">
                All videos <span className="arrow">&rarr;</span>
              </Link>
            </div>
          </div>
        </section>
      )}

      <FinalCTA />
    </>
  );
}
