/**
 * The roster — confirmed by Ben, September 2026.
 *
 * Eleven people: nine practitioners and two office managers, plus the
 * Franklin hiring card. Five practitioners have published bios, rewritten
 * here to this site's content rules from the bios on the practice's previous
 * site (harmonizedbraincenterstn.com/about) and confirmed by Ben on the
 * deployed preview. Six people are confirmed by
 * name and role only — their bios stay [placeholders], which is what keeps
 * their cards out of production until Ben supplies copy (see the gate in
 * app/about/team/page.tsx).
 *
 * What was deliberately NOT carried over from the old site's bios, per Ben:
 * the "nation's leading LENS practitioner" superlative (no ranking claims
 * anywhere on this site), the founder's personal session count (unverified),
 * and the per-person certification lines — every practitioner's training is
 * one fact with one home, TRAINING_CLAIM in lib/site-config.ts, stated once
 * on the pages rather than restated per bio.
 *
 * **This file is where each person's facts live.** The location pages'
 * team sections and the locations-index practitioner lines derive from
 * `centers` below (see teamForCenter / practitionersAt), and the proof
 * bands' practitioner count derives from `kind` (see practitionerCount) —
 * so a hire, a departure, or a center move is one edit here and every
 * surface follows.
 */

import { FOUNDER_BIO, FOUNDER_DISPLAY_NAME, verifiedOr } from "./site-config";

/** The two open centers. Franklin joins when it has anyone to assign. */
export type CenterSlug = "nashville" | "murfreesboro";

export type TeamMember = {
  /** Profile slug under /about/team/, or null for members without a profile page. */
  slug: string | null;
  name: string;
  /**
   * What this entry is, for the derived counts:
   * - "practitioner" counts toward the proof bands' practitioner figure —
   *   the founder included, because she keeps a client schedule and Ben's
   *   center assignment lists her at Nashville like any other practitioner;
   * - "office" renders on team surfaces but is never counted as a
   *   practitioner — an office manager in the practitioner count would be
   *   the band overclaiming by two;
   * - "hiring" is the Franklin card: not a person, listed on /about/team
   *   only, in no center's team and no count.
   */
  kind: "practitioner" | "office" | "hiring";
  /**
   * Which centers this person works from — confirmed by Ben. One entry per
   * person however many centers they cover, which is what lets the proof
   * band count people while the two location pages each list everyone who
   * works there: Laura Scott and Kathy Wike appear on both pages and are
   * counted once.
   */
  centers: CenterSlug[];
  role: string;
  /**
   * One or two lines under the role. **May be empty**, and an empty one
   * renders no paragraph rather than an empty tag — that is how a bio held
   * behind a `Verifiable` degrades without taking the whole card with it.
   * A bio still carrying [brackets] keeps the whole card out of production
   * (the /about/team and location-page gates read it).
   */
  bio: string;
  image?: { src: string; position: string };
  plateSpec?: string;
  /** "founder" links the card to /about/founder instead of a profile page. */
  founder?: boolean;
  /**
   * Profile-page data for /about/team/[slug]. Nobody carries one today: the
   * placeholder profiles this file used to hold were seeded before the real
   * roster existed, and the confirmed roster arrived without the per-person
   * copy a profile needs (background paragraphs, working days, focus areas).
   * The route and this field stay, so a profile is one data entry away.
   */
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

/**
 * The placeholder bios below share one pattern on purpose: [brackets] are the
 * gate, and the text inside them is the brief for whoever writes the real
 * copy. Portraits: only the founder has a confirmed photo on file, so every
 * other card renders a PlaceholderPlate until portraits are shot —
 * /images/practitioner-2.jpg is a real photo of an unidentified practitioner
 * and must not be attributed to a named person without confirmation.
 */
export const team: TeamMember[] = [
  {
    slug: null,
    founder: true,
    kind: "practitioner",
    centers: ["nashville"],
    name: FOUNDER_DISPLAY_NAME,
    role: "Founder & Clinical Director",
    // Rewritten from the old site's bio per Ben's roster brief — see
    // FOUNDER_BIO in ./site-config for what changed and why.
    bio: verifiedOr(FOUNDER_BIO) ?? "",
    image: { src: "/images/founder.jpg", position: "center 22%" },
  },
  {
    slug: null,
    kind: "practitioner",
    centers: ["murfreesboro"],
    name: "Christiana Vorst",
    role: "LENS Practitioner",
    // Built from Ben's confirmed specialization alone: her bio on the old
    // site could not be retrieved when this roster was written, so nothing
    // here is carried over from copy nobody re-read. Flesh out from her real
    // bio when Ben supplies it — without adding certifications (TRAINING_CLAIM
    // owns those) or outcome claims.
    bio: "Specializes in kids, teens, and young adults — the years when boundaries, self-esteem, and big transitions are hardest to navigate alone.",
    plateSpec: "Practitioner portrait — natural light, ivory backdrop",
  },
  {
    slug: null,
    kind: "practitioner",
    centers: ["nashville", "murfreesboro"],
    name: "Kathy Wike",
    role: "LENS Practitioner",
    // Her account of her own time as a client is testimony, and stays inside
    // what she can say about herself — nothing here claims what LENS does.
    bio: "A client before she was a practitioner — she came to LENS in a season of deep grief, and what those sessions meant to her is why she trained. Her background is in early childhood and elementary education.",
    plateSpec: "Practitioner portrait — natural light, ivory backdrop",
  },
  {
    slug: null,
    kind: "practitioner",
    centers: ["nashville"],
    name: "Gwen Minton",
    role: "LENS Practitioner",
    bio: "A Licensed Master Social Worker with more than fifteen years in practice, and a certified life coach — she has spent her career listening to people in hard seasons.",
    plateSpec: "Practitioner portrait — natural light, ivory backdrop",
  },
  {
    slug: null,
    kind: "practitioner",
    centers: ["nashville"],
    name: "Brenna Perkins",
    role: "LENS Practitioner",
    bio: "A former client, with a Belmont University degree in Journalism and Media Studies — curious about people's stories long before she was hearing them in a session room.",
    plateSpec: "Practitioner portrait — natural light, ivory backdrop",
  },
  {
    slug: null,
    kind: "practitioner",
    centers: ["nashville", "murfreesboro"],
    name: "Laura Scott",
    role: "LENS Practitioner",
    bio: "[Two lines — background, path to LENS, what clients say about working with her. Ben to supply.]",
    plateSpec: "Practitioner portrait — natural light, ivory backdrop",
  },
  {
    slug: null,
    kind: "practitioner",
    centers: ["nashville"],
    name: "Danielle Turner",
    role: "LENS Practitioner",
    bio: "[Two lines — background, path to LENS, what clients say about working with her. Ben to supply.]",
    plateSpec: "Practitioner portrait — natural light, ivory backdrop",
  },
  {
    slug: null,
    kind: "practitioner",
    centers: ["nashville"],
    name: "Amanda Thomas",
    role: "LENS Practitioner",
    bio: "[Two lines — background, path to LENS, what clients say about working with her. Ben to supply.]",
    plateSpec: "Practitioner portrait — natural light, ivory backdrop",
  },
  {
    slug: null,
    kind: "practitioner",
    centers: ["nashville"],
    name: "Ben Muir",
    role: "LENS Practitioner",
    bio: "[Two lines — background, path to LENS, what clients say about working with him. Ben to supply.]",
    plateSpec: "Practitioner portrait — natural light, ivory backdrop",
  },
  {
    slug: null,
    kind: "office",
    centers: ["nashville"],
    name: "Denise Miller",
    role: "Office Manager",
    bio: "[One line — what she handles, and how she keeps scheduling painless. Ben to supply.]",
    plateSpec: "Office manager portrait — natural light",
  },
  {
    slug: null,
    kind: "office",
    centers: ["murfreesboro"],
    name: "Kylie Mason",
    role: "Office Manager",
    bio: "[One line — what she handles, and how she keeps scheduling painless. Ben to supply.]",
    plateSpec: "Office manager portrait — natural light",
  },
  {
    slug: null,
    kind: "hiring",
    centers: [],
    name: "Franklin team",
    role: "Now hiring · Coming soon",
    bio: "Practitioners for our Franklin center complete the same Harmonized training before opening day.",
    plateSpec: "Franklin team portrait — hiring",
  },
];

export function getTeamMember(slug: string): TeamMember | undefined {
  return team.find((m) => m.slug === slug);
}

/**
 * Everyone who works at this center, in roster order — founder first, then
 * practitioners, then office staff. The location pages' team sections read
 * this instead of keeping their own card lists, which is how Murfreesboro's
 * section stopped shipping a hand-written roster that could disagree with
 * /about/team about who works there. Callers apply the same [placeholder]
 * gate the team page does; this returns the roster, not the publishable
 * subset.
 */
export function teamForCenter(center: CenterSlug): TeamMember[] {
  return team.filter((m) => m.kind !== "hiring" && m.centers.includes(center));
}

/**
 * Practitioner names for this center's locations-index card — practitioners
 * only, because the card line begins "Practitioners:" and an office manager
 * under that label would be the site misdescribing a colleague's job.
 */
export function practitionersAt(center: CenterSlug): string[] {
  return team
    .filter((m) => m.kind === "practitioner" && m.centers.includes(center))
    .map((m) => m.name);
}

/**
 * How many practitioners the practice has — the proof bands' figure, counted
 * from the roster rather than stored, so the band cannot drift from the team
 * page the way a typed "nine" would the day someone joins or leaves. People
 * working both centers are one entry above, so nobody is counted twice.
 *
 * Counts the confirmed roster, not the published bios: the six people whose
 * cards are still [placeholder]-gated are confirmed staff (names and roles
 * from Ben), and the count is a fact about the practice, not about how much
 * copy has been written yet.
 */
export function practitionerCount(): number {
  return team.filter((m) => m.kind === "practitioner").length;
}

/** "nine" — for the assistant's by-the-numbers sentence. */
const COUNT_WORDS = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight",
  "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen",
  "sixteen", "seventeen", "eighteen", "nineteen", "twenty",
];
export function practitionerCountWord(): string {
  const n = practitionerCount();
  return COUNT_WORDS[n] ?? String(n);
}

/**
 * "Nine practitioners" — the stat cell both proof bands render, built here so
 * the two bands cannot word it differently. Deliberately no superlative and
 * no comparison to anyone: the count is the credential, stated plainly.
 */
export function practitionerBandStat(): string {
  const word = practitionerCountWord();
  return `${word.charAt(0).toUpperCase()}${word.slice(1)} practitioners`;
}
