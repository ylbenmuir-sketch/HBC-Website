import { PHONE_DISPLAY } from "./site-config";

/**
 * Location data. Nashville is seeded from location-nashville.html;
 * Murfreesboro and Franklin reuse the same detail template, data-driven.
 * Address fields stay as [placeholders] until confirmed — they also feed
 * the LocalBusiness JSON-LD on each location page.
 */

export type TeamCard = {
  name: string;
  role: string;
  bio: string;
  image?: { src: string; position: string };
  plateSpec?: string;
};

export type Location = {
  slug: string;
  name: string;
  county: string;
  comingSoon: boolean;
  /** JSON-LD address — [placeholders] until confirmed. */
  address: {
    streetAddress: string;
    addressLocality: string;
    addressRegion: string;
    postalCode: string;
  };
  hoursLines: string[];
  phone: string;
  /** Card meta extras (locations index). */
  cardExtra: string;
  practitionersLine: string;
  hero: {
    eyebrow: string;
    titleLead: string;
    titleAccent: string; // italic sage word ("" for none)
    titleTail: string;
    sub: string;
    arrivalLines: string[];
  };
  image?: { src: string; position: string };
  plateSpec?: string;
  space: {
    heading: string;
    sub: string;
    photos: Array<
      | { kind: "photo"; src: string; position: string }
      | { kind: "plate"; spec: string }
    >;
  };
  team: TeamCard[];
  quote: { text: string; attribution: string; place: string };
  planning: {
    gettingHere: string;
    communities: string;
    communitiesTag?: string;
    alsoNearby: string;
  };
  finalHeading: string;
  metaDescription: string;
};

export const locations: Location[] = [
  {
    slug: "nashville",
    name: "Nashville",
    county: "Davidson County",
    comingSoon: false,
    address: {
      streetAddress: "[Street address]",
      addressLocality: "Nashville",
      addressRegion: "TN",
      postalCode: "[ZIP]",
    },
    hoursLines: ["Mon–Fri 9a–6p", "Sat by appointment"],
    phone: PHONE_DISPLAY,
    cardExtra: "Free on-site parking",
    practitionersLine: "Practitioners: Sheri [L.], [Name], [Name]",
    hero: {
      eyebrow: "Nashville, Tennessee",
      titleLead: "A quiet place to get your ",
      titleAccent: "bearings",
      titleTail: " back.",
      sub: "Serving families and professionals across Davidson County — a calm, comfortable center that feels more like a well-kept study than a clinic.",
      arrivalLines: ["Free on-site parking,", "steps from the door"],
    },
    image: { src: "/images/session-room.jpg", position: "center 55%" },
    space: {
      heading: "Designed to lower your shoulders the moment you walk in.",
      sub: "No fluorescent hum, no waiting-room churn. Quiet rooms, comfortable chairs, and a team that isn't rushing you anywhere.",
      photos: [
        { kind: "photo", src: "/images/recline.jpg", position: "center 55%" },
        { kind: "photo", src: "/images/session-wide.jpg", position: "center 40%" },
        { kind: "photo", src: "/images/art-wall.jpg", position: "center 45%" },
      ],
    },
    team: [
      {
        name: "Sheri [Last name]",
        role: "Founder & Clinical Director",
        bio: "Sets the standard every practitioner trains to — and still keeps a Nashville client schedule.",
        image: { src: "/images/founder.jpg", position: "center 22%" },
      },
      {
        name: "[Practitioner name]",
        role: "Practitioner · Children & Teens",
        bio: "[Two lines: why they love working with kids, and how they put nervous first-timers at ease.]",
        image: { src: "/images/practitioner-2.jpg", position: "32% 18%" },
      },
      {
        name: "[Name]",
        role: "Client Care Coordinator",
        bio: "The first voice you'll hear on the phone, and the person who keeps scheduling painless.",
        plateSpec: "Client care coordinator portrait — natural light",
      },
    ],
    quote: {
      text: "I expected something clinical and intimidating. What I found was a calm room, people who listened longer than any appointment I've ever had, and — three months later — a kid who likes school again.",
      attribution: "Parent of an 11-year-old",
      place: "Nashville",
    },
    planning: {
      gettingHere: "[Neighborhood, nearest cross streets, highway access.]",
      communities:
        "Nashville, Belle Meade, Green Hills, Brentwood, Bellevue, Madison & nearby.",
      communitiesTag: "[Confirm list]",
      alsoNearby:
        "Murfreesboro center · Franklin coming soon — transfer anytime; your plan travels with you.",
    },
    finalHeading: "Come see the space, meet the team, and ask us anything.",
    metaDescription:
      "Harmonized Brain Centers Nashville — gentle LENS neurofeedback for adults, children, and families across Davidson County.",
  },
  {
    slug: "murfreesboro",
    name: "Murfreesboro",
    county: "Rutherford County",
    comingSoon: false,
    address: {
      streetAddress: "[Street address]",
      addressLocality: "Murfreesboro",
      addressRegion: "TN",
      postalCode: "[ZIP]",
    },
    hoursLines: ["Mon–Fri 9a–6p", "Sat by appointment"],
    phone: PHONE_DISPLAY,
    cardExtra: "[Parking note]",
    practitionersLine: "Practitioners: [Name], [Name]",
    hero: {
      eyebrow: "Murfreesboro, Tennessee",
      titleLead: "The same standard of care, ",
      titleAccent: "closer",
      titleTail: " to home.",
      sub: "Serving families and professionals across Rutherford County — the same care model, the same training, and the same honest policies as every Harmonized center.",
      arrivalLines: ["[Parking note]", ""],
    },
    plateSpec: "Murfreesboro — reception or session room, natural light",
    space: {
      heading: "Designed to lower your shoulders the moment you walk in.",
      sub: "No fluorescent hum, no waiting-room churn. Quiet rooms, comfortable chairs, and a team that isn't rushing you anywhere.",
      photos: [
        { kind: "plate", spec: "Murfreesboro interior — reception, natural light" },
        { kind: "plate", spec: "Murfreesboro session room — comfortable chair" },
        { kind: "plate", spec: "Murfreesboro exterior — entrance signage" },
      ],
    },
    team: [
      {
        name: "[Practitioner name]",
        role: "Practitioner · Murfreesboro",
        bio: "[Two lines: background, years with Harmonized, and what clients say about working with them.]",
        plateSpec: "Practitioner portrait — natural light, ivory backdrop",
      },
      {
        name: "[Practitioner name]",
        role: "Practitioner · Murfreesboro",
        bio: "[Two lines.]",
        plateSpec: "Practitioner portrait — natural light, ivory backdrop",
      },
      {
        name: "[Name]",
        role: "Client Care Coordinator",
        bio: "The first voice you'll hear on the phone, and the person who keeps scheduling painless.",
        plateSpec: "Client care coordinator portrait — natural light",
      },
    ],
    quote: {
      text: "Nobody oversold anything — they just kept asking how I was sleeping. By week four: better than I had in years.",
      attribution: "Adult client",
      place: "Murfreesboro",
    },
    planning: {
      gettingHere: "[Neighborhood, nearest cross streets, highway access.]",
      communities: "Murfreesboro, Smyrna, La Vergne & nearby.",
      communitiesTag: "[Confirm list]",
      alsoNearby:
        "Nashville center · Franklin coming soon — transfer anytime; your plan travels with you.",
    },
    finalHeading: "Come see the space, meet the team, and ask us anything.",
    metaDescription:
      "Harmonized Brain Centers Murfreesboro — gentle LENS neurofeedback for adults, children, and families across Rutherford County.",
  },
  {
    slug: "franklin",
    name: "Franklin",
    county: "Williamson County",
    comingSoon: true,
    address: {
      streetAddress: "[Street address]",
      addressLocality: "Franklin",
      addressRegion: "TN",
      postalCode: "[ZIP]",
    },
    hoursLines: ["Opening [DATE — confirm]"],
    phone: PHONE_DISPLAY,
    cardExtra: "Serving Franklin, Brentwood, Spring Hill & Thompson's Station",
    practitionersLine: "Founding-client openings are limited",
    hero: {
      eyebrow: "Franklin, Tennessee — coming soon",
      titleLead: "The same gentle care is coming to ",
      titleAccent: "Williamson County",
      titleTail: ".",
      sub: "Opening [DATE — confirm]. Practitioners for our Franklin center train under Sheri before opening day — and founding-client openings are limited.",
      arrivalLines: ["Join the waitlist for", "founding-client openings"],
    },
    plateSpec: "Franklin — exterior storefront, golden hour",
    space: {
      heading: "Built to the same standard as every Harmonized center.",
      sub: "Quiet rooms, comfortable chairs, and the same care model, training, and honest policies from day one.",
      photos: [
        { kind: "plate", spec: "Franklin exterior — storefront at golden hour" },
        { kind: "plate", spec: "Franklin interior — session room build-out" },
        { kind: "plate", spec: "Franklin team portrait — hiring" },
      ],
    },
    team: [
      {
        name: "Franklin team",
        role: "Now hiring · Opening [DATE]",
        bio: "Practitioners for our Franklin center train under Sheri before opening day.",
        plateSpec: "Franklin team portrait — hiring",
      },
    ],
    quote: {
      text: "We built Harmonized so that every family gets the same thing my first clients got: someone who listens longer than any appointment they've ever had — and a gentle option that works with the brain, not against it.",
      attribution: "Sheri [Last name — confirm], Founder & Clinical Director",
      place: "Harmonized Brain Centers",
    },
    planning: {
      gettingHere: "[Neighborhood, nearest cross streets, highway access.]",
      communities: "Franklin, Brentwood, Spring Hill & Thompson's Station.",
      alsoNearby:
        "Nashville & Murfreesboro centers are open now — start there and transfer anytime; your plan travels with you.",
    },
    finalHeading: "Join the Franklin waitlist — founding-client openings are limited.",
    metaDescription:
      "Harmonized Brain Centers Franklin — coming soon to Williamson County. Join the waitlist for founding-client openings.",
  },
];

export function getLocation(slug: string): Location | undefined {
  return locations.find((l) => l.slug === slug);
}
