/**
 * Team data (team.html). The three practitioner profile pages under
 * /about/team/[slug] are seeded from practitioner.html — names and bios
 * are [placeholders] until the real roster is confirmed.
 */

import { FOUNDER_DISPLAY_NAME } from "./site-config";

export type TeamMember = {
  /** Profile slug under /about/team/, or null for members without a profile page. */
  slug: string | null;
  name: string;
  role: string;
  bio: string;
  image?: { src: string; position: string };
  plateSpec?: string;
  /** "founder" links the card to /about/founder instead of a profile page. */
  founder?: boolean;
  profile?: {
    eyebrow: string;
    sub: string;
    ctaLabel: string;
    locationSlug: string;
    locationName: string;
    background1: string;
    background2: string;
    glance: { training: string; worksWith: string; location: string };
  };
};

export const team: TeamMember[] = [
  {
    slug: null,
    founder: true,
    name: FOUNDER_DISPLAY_NAME,
    role: "Founder & Clinical Director",
    bio: "Sets the clinical standard, trains every practitioner, and still keeps a client schedule.",
    image: { src: "/images/founder.jpg", position: "center 22%" },
  },
  {
    slug: "practitioner-children-teens",
    name: "[Practitioner name]",
    role: "Practitioner · Children & Teens",
    bio: "[Two lines: why they love working with kids, and how they put nervous first-timers at ease.]",
    image: { src: "/images/practitioner-2.jpg", position: "32% 18%" },
    profile: {
      eyebrow: "Practitioner · Children & Teens · Nashville",
      sub: "[One-line personal summary — what clients say it's like to work with them.]",
      ctaLabel: "Request [First name]",
      locationSlug: "nashville",
      locationName: "Nashville center",
      background1:
        "[Paragraph: professional background, path to LENS, time with Harmonized.]",
      background2:
        "[Paragraph: approach with clients — especially anxious first-timers and children.]",
      glance: {
        training:
          "Harmonized LENS training curriculum · [certifications — confirm]",
        worksWith: "Children & teens · focus & school · emotional regulation",
        location: "Nashville · Tue–Sat",
      },
    },
  },
  {
    slug: "practitioner-murfreesboro",
    name: "[Practitioner name]",
    role: "Practitioner · Murfreesboro",
    bio: "[Two lines: background, years with Harmonized, and what clients say about working with them.]",
    plateSpec: "Practitioner portrait — natural light, ivory backdrop",
    profile: {
      eyebrow: "Practitioner · Murfreesboro",
      sub: "[One-line personal summary — what clients say it's like to work with them.]",
      ctaLabel: "Request [First name]",
      locationSlug: "murfreesboro",
      locationName: "Murfreesboro center",
      background1:
        "[Paragraph: professional background, path to LENS, time with Harmonized.]",
      background2: "[Paragraph: approach with clients.]",
      glance: {
        training:
          "Harmonized LENS training curriculum · [certifications — confirm]",
        worksWith: "[Focus areas — confirm]",
        location: "Murfreesboro · [Days — confirm]",
      },
    },
  },
  {
    slug: "practitioner-nashville",
    name: "[Practitioner name]",
    role: "Practitioner · Nashville",
    bio: "[Two lines.]",
    plateSpec: "Practitioner portrait — natural light, ivory backdrop",
    profile: {
      eyebrow: "Practitioner · Nashville",
      sub: "[One-line personal summary — what clients say it's like to work with them.]",
      ctaLabel: "Request [First name]",
      locationSlug: "nashville",
      locationName: "Nashville center",
      background1:
        "[Paragraph: professional background, path to LENS, time with Harmonized.]",
      background2: "[Paragraph: approach with clients.]",
      glance: {
        training:
          "Harmonized LENS training curriculum · [certifications — confirm]",
        worksWith: "[Focus areas — confirm]",
        location: "Nashville · [Days — confirm]",
      },
    },
  },
  {
    slug: null,
    name: "[Name]",
    role: "Client Care Coordinator",
    bio: "The first voice you'll hear on the phone — and the person who keeps scheduling painless.",
    plateSpec: "Client care coordinator portrait",
  },
  {
    slug: null,
    name: "Franklin team",
    role: "Now hiring · Coming soon",
    bio: "Practitioners for our Franklin center complete the same Harmonized training before opening day.",
    plateSpec: "Franklin team portrait — hiring",
  },
];

export function getTeamMember(slug: string): TeamMember | undefined {
  return team.find((m) => m.slug === slug);
}
