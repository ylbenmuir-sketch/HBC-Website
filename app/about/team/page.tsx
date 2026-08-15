import Link from "next/link";
import type { Metadata } from "next";
import PhotoFrame from "@/components/PhotoFrame";
import PlaceholderPlate from "@/components/PlaceholderPlate";
import FinalCTA from "@/components/FinalCTA";
import { team } from "@/lib/team";
import { SHOW_DRAFT_CONTENT, isDraftText } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Our Team",
  description:
    "Every Harmonized practitioner completes the same LENS training and works from the same care model. Here's who you'll meet.",
};

export default function TeamPage() {
  // Placeholder roster entries render in draft mode only.
  const members = team.filter(
    (m) => SHOW_DRAFT_CONTENT || (!isDraftText(m.name) && !isDraftText(m.bio))
  );
  return (
    <>
      <div className="wrap crumb">
        <Link href="/about">About</Link> &nbsp;/&nbsp; Our team
      </div>
      <section className="page-hero">
        <div className="wrap rv">
          <div className="eyebrow">Our team</div>
          <h1>
            Practitioners who will know your name &mdash; and your story.
          </h1>
          <p className="sub">
            Every Harmonized practitioner completes the same LENS training
            and works from the same care model. Here&rsquo;s who you&rsquo;ll
            meet.
          </p>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          <div className="team-grid rv">
            {members.map((m) => (
              <div className="member" key={m.name + m.role}>
                {m.image ? (
                  <PhotoFrame
                    src={m.image.src}
                    alt={`${m.name}, ${m.role}`}
                    position={m.image.position}
                    height={360}
                    sizes="(max-width: 640px) 100vw, (max-width: 1060px) 50vw, 33vw"
                  />
                ) : (
                  <PlaceholderPlate spec={m.plateSpec ?? ""} height={360} />
                )}
                <h3>{m.name}</h3>
                <div className="role">{m.role}</div>
                <p>{m.bio}</p>
                {m.founder && (
                  <Link
                    className="btn btn-ghost"
                    style={{ padding: "10px 4px", fontSize: 14 }}
                    href="/about/founder"
                  >
                    Her story <span className="arrow">→</span>
                  </Link>
                )}
                {m.slug && (
                  <Link
                    className="btn btn-ghost"
                    style={{ padding: "10px 4px", fontSize: 14 }}
                    href={`/about/team/${m.slug}`}
                  >
                    Profile <span className="arrow">→</span>
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <FinalCTA />
    </>
  );
}
