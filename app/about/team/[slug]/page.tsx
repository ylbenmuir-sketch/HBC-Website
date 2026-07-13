import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import PhotoFrame from "@/components/PhotoFrame";
import PlaceholderPlate from "@/components/PlaceholderPlate";
import FinalCTA from "@/components/FinalCTA";
import { Btn } from "@/components/Buttons";
import { team, getTeamMember } from "@/lib/team";

export function generateStaticParams() {
  return team
    .filter((m) => m.slug)
    .map((m) => ({ slug: m.slug as string }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const member = getTeamMember((await params).slug);
  if (!member) return {};
  return {
    title: `${member.name} — ${member.role}`,
    description: `${member.name}, ${member.role} at Harmonized Brain Centers.`,
  };
}

export default async function PractitionerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const member = getTeamMember((await params).slug);
  if (!member || !member.profile) notFound();
  const { profile } = member;

  return (
    <>
      <div className="wrap crumb">
        <Link href="/about">About</Link> &nbsp;/&nbsp;{" "}
        <Link href="/about/team">Our team</Link> &nbsp;/&nbsp; {member.name}
      </div>
      <section className="page-hero">
        <div className="wrap prac-hero">
          <div className="rv">
            {member.image ? (
              <PhotoFrame
                src={member.image.src}
                alt={`${member.name}, ${member.role}`}
                position={member.image.position}
                height={440}
                sizes="380px"
              />
            ) : (
              <PlaceholderPlate spec={member.plateSpec ?? ""} height={440} />
            )}
          </div>
          <div className="rv">
            <div className="eyebrow">{profile.eyebrow}</div>
            <h1>{member.name}</h1>
            <p className="sub">{profile.sub}</p>
            <div className="hero-ctas" style={{ marginTop: 32 }}>
              <Btn href="/contact">{profile.ctaLabel}</Btn>
              <Btn
                href={`/locations/${profile.locationSlug}`}
                variant="ghost"
                arrow
              >
                {profile.locationName}
              </Btn>
            </div>
          </div>
        </div>
      </section>

      <section className="sec">
        <div className="wrap duo">
          <div className="rv">
            <div className="eyebrow">Background</div>
            <p style={{ margin: "24px 0 18px" }}>{profile.background1}</p>
            <p className="sub" style={{ fontSize: 16 }}>
              {profile.background2}
            </p>
          </div>
          <div className="rv">
            <div className="eyebrow">At a glance</div>
            <div className="lens-seq" style={{ marginTop: 20 }}>
              <div className="row">
                <div className="n">—</div>
                <div>
                  <h4>Training</h4>
                  <p>{profile.glance.training}</p>
                </div>
              </div>
              <div className="row">
                <div className="n">—</div>
                <div>
                  <h4>Works most with</h4>
                  <p>{profile.glance.worksWith}</p>
                </div>
              </div>
              <div className="row">
                <div className="n">—</div>
                <div>
                  <h4>Location</h4>
                  <p>{profile.glance.location}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FinalCTA />
    </>
  );
}
