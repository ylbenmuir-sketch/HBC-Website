import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import PlaceholderPlate from "@/components/PlaceholderPlate";
import FinalCTA from "@/components/FinalCTA";
import GuideCta from "@/components/GuideCta";
import { resources, isPublishable } from "@/lib/resources";
import { SHOW_DRAFT_CONTENT } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Resources",
  description:
    "Plain-language guides for parents and adults — written by our practitioners, reviewed against our no-hype standard.",
};

export default function ResourcesPage() {
  // Draft articles render in draft mode only; production lists finished ones.
  const list = resources.filter((r) => SHOW_DRAFT_CONTENT || isPublishable(r));
  return (
    <>
      <section className="page-hero center">
        <div className="wrap rv">
          <div className="eyebrow">Resources &amp; learning center</div>
          <h1>Understand the brain you live with.</h1>
          <p className="sub" style={{ maxWidth: "56ch" }}>
            Plain-language guides for parents and adults &mdash; written by our
            practitioners, reviewed against our no-hype standard.
          </p>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          {list.length === 0 && (
            <p className="sub rv" style={{ maxWidth: 620 }}>
              Our plain-language guides are being finished now &mdash; check
              back soon, or ask us your question directly and we&rsquo;ll
              answer it plainly.
            </p>
          )}
          <div className="res-grid rv">
            {list.map((r) => (
              <Link className="res-card" href={`/resources/${r.slug}`} key={r.slug}>
                {r.image ? (
                  <div className="ph" style={{ height: 210 }}>
                    <Image
                      src={r.image.src}
                      alt=""
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1060px) 50vw, 33vw"
                      style={{
                        objectFit: "cover",
                        objectPosition: r.image.position,
                      }}
                    />
                  </div>
                ) : (
                  <PlaceholderPlate spec={r.plateSpec ?? ""} height={210} />
                )}
                <div className="body">
                  <div className="tag">{r.tag}</div>
                  <h3>{r.title}</h3>
                  <p>{r.excerpt}</p>
                  <span className="read">Read →</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <FinalCTA />
      <GuideCta headingLead="Start with" />
    </>
  );
}
