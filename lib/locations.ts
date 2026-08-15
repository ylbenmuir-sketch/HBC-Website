import {
  FOUNDER_DISPLAY_NAME,
  PHONE_DISPLAY,
  SHOW_DRAFT_CONTENT,
  type Verifiable,
  isDraftText,
  verifiedOr,
} from "./site-config";

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

/**
 * One day's hours. `null` means closed — recorded, never omitted, because a
 * missing day and a closed day read identically to a visitor and only one of
 * them is true. `opens`/`closes` are 24-hour "HH:MM" in the week's `timeZone`.
 */
export type DayHours = { opens: string; closes: string } | null;

/**
 * A center's week, as data rather than display strings.
 *
 * One shape, two readers: `openingHoursSpecification` in the LocalBusiness
 * JSON-LD (lib/schema.ts) and the hours a visitor reads on the page
 * (`formattedHours` below). This replaced a `hoursLines: string[]` of
 * prewritten copy, which could serve only the second — "Mon–Fri 9a–6p" is not
 * parseable into a schema node, so the markup had to either restate the hours
 * somewhere else or omit them, and a restated fact is a fact that drifts.
 *
 * Seven entries, Sunday first, so the index matches JS `Date#getDay()`. The
 * tuple length is part of the type: a week with six days in it does not
 * compile.
 */
export type WeeklyHours = {
  timeZone: string;
  week: [DayHours, DayHours, DayHours, DayHours, DayHours, DayHours, DayHours];
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
  /**
   * Coordinates for the schema `geo` node, present only for a center whose
   * address is confirmed — a pin without a verified street address would
   * point at a building the site doesn't claim to occupy.
   *
   * Geocoded from the confirmed address with the US Census geocoder and
   * cross-checked against Nominatim; the two agree to within ~10 m, and both
   * resolve the expected county. Re-geocode if an address ever changes.
   */
  geo?: { latitude: number; longitude: number };
  /**
   * Opening hours, or null for a center with none to publish.
   *
   * A `Verifiable` per center rather than one sitewide value, for the reason
   * the practitioner list is a list: the two open centers keep different
   * weeks, and a single shared object would have had to be wrong about one of
   * them. Each center's hours then carry their own gate — an unconfirmed week
   * stays off the page and out of the schema without silencing the other
   * center's confirmed one.
   */
  hours: Verifiable<WeeklyHours> | null;
  phone: string;
  /** Card meta extras (locations index). */
  cardExtra: string;
  /**
   * Practitioner names for the locations-index card.
   *
   * A list rather than one prewritten sentence so each name carries its own
   * gate: a confirmed name renders even while the others are still
   * [placeholders]. As a single string, one unconfirmed colleague suppressed
   * the whole line — which is what kept the founder's name off the card
   * after her surname was confirmed.
   */
  practitioners: string[];
  /** Coming-soon centers show this instead of a practitioner list. */
  waitlistLine?: string;
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
  /**
   * <title> override. Open centers lead with the category + city + state —
   * "neurofeedback nashville" is the highest-intent local query the site has,
   * and a bare city name ("Nashville — Harmonized Brain Centers") targeted
   * none of it. Omitted for coming-soon centers, which fall back to the
   * "{name} — Coming Soon" form: a page for an unopened center should not
   * compete for queries it can't serve yet.
   */
  metaTitle?: string;
  metaDescription: string;
};

export const locations: Location[] = [
  {
    slug: "nashville",
    name: "Nashville",
    county: "Davidson County",
    comingSoon: false,
    address: {
      streetAddress: "197 Thompson Ln, Suite S",
      addressLocality: "Nashville",
      addressRegion: "TN",
      postalCode: "37211",
    },
    geo: { latitude: 36.110486, longitude: -86.740577 },
    /** Confirmed by Ben. Closed Sunday and Monday. */
    hours: {
      value: {
        timeZone: "America/Chicago",
        week: [
          null, // Sunday — closed
          null, // Monday — closed
          { opens: "09:00", closes: "18:00" }, // Tuesday
          { opens: "09:00", closes: "18:00" }, // Wednesday
          { opens: "09:00", closes: "18:00" }, // Thursday
          { opens: "09:00", closes: "18:00" }, // Friday
          { opens: "08:00", closes: "15:00" }, // Saturday
        ],
      },
      verified: true,
      note: "[Confirm hours]",
    },
    phone: PHONE_DISPLAY,
    cardExtra: "Free on-site parking",
    practitioners: [FOUNDER_DISPLAY_NAME, "[Name]", "[Name]"],
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
        name: FOUNDER_DISPLAY_NAME,
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
    metaTitle: "LENS Neurofeedback in Nashville, TN",
    metaDescription:
      "LENS neurofeedback in Nashville, TN — gentle sessions for adults, children, and families across Davidson County. The first call is free.",
  },
  {
    slug: "murfreesboro",
    name: "Murfreesboro",
    county: "Rutherford County",
    comingSoon: false,
    address: {
      streetAddress: "206 W Chestnut St",
      addressLocality: "Murfreesboro",
      addressRegion: "TN",
      postalCode: "37130",
    },
    geo: { latitude: 35.851758, longitude: -86.391947 },
    /** Confirmed by Ben. Open Tuesday through Thursday only. */
    hours: {
      value: {
        timeZone: "America/Chicago",
        week: [
          null, // Sunday — closed
          null, // Monday — closed
          { opens: "09:00", closes: "18:00" }, // Tuesday
          { opens: "09:00", closes: "18:00" }, // Wednesday
          { opens: "09:00", closes: "18:00" }, // Thursday
          null, // Friday — closed
          null, // Saturday — closed
        ],
      },
      verified: true,
      note: "[Confirm hours]",
    },
    phone: PHONE_DISPLAY,
    cardExtra: "[Parking note]",
    practitioners: ["[Name]", "[Name]"],
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
    metaTitle: "LENS Neurofeedback in Murfreesboro, TN",
    metaDescription:
      "LENS neurofeedback in Murfreesboro, TN — gentle sessions for adults, children, and families across Rutherford County. The first call is free.",
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
    /**
     * No hours. Franklin has no opening date and no confirmed address, and
     * hours for a center nobody can visit yet would describe a business that
     * isn't trading — the same reason the page ships no LocalBusiness. The
     * hero's "Status: Coming soon" fact says what a visitor actually needs.
     */
    hours: null,
    phone: PHONE_DISPLAY,
    cardExtra: "Serving Franklin, Brentwood, Spring Hill & Thompson's Station",
    practitioners: [],
    waitlistLine: "Founding-client openings are limited",
    hero: {
      eyebrow: "Franklin, Tennessee — coming soon",
      titleLead: "The same gentle care is coming to ",
      titleAccent: "Williamson County",
      titleTail: ".",
      sub: "Opening soon. Practitioners for our Franklin center complete the same Harmonized training before opening day — and founding-client openings are limited.",
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
        role: "Now hiring · Coming soon",
        bio: "Practitioners for our Franklin center complete the same Harmonized training before opening day.",
        plateSpec: "Franklin team portrait — hiring",
      },
    ],
    quote: {
      text: "We built Harmonized so that every family gets what my first clients got: someone who truly listens, honest guidance, and a gentle option that never asks them to push through.",
      attribution: `${FOUNDER_DISPLAY_NAME}, Founder & Clinical Director`,
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
      "LENS neurofeedback is coming soon to Franklin, TN — join the waitlist for founding-client openings in Williamson County.",
  },
];

export function getLocation(slug: string): Location | undefined {
  return locations.find((l) => l.slug === slug);
}

/**
 * True once BOTH the street address and the ZIP are real values. Drives the
 * on-page address line and the schema PostalAddress together, so the two can
 * never disagree about what has been confirmed.
 */
export function hasConfirmedAddress(location: Location): boolean {
  return (
    !isDraftText(location.address.streetAddress) &&
    !isDraftText(location.address.postalCode)
  );
}

/**
 * Practitioner names that may render, each gated on its own: a confirmed name
 * ships while unconfirmed colleagues stay hidden, and draft mode shows every
 * [placeholder] so the roster gaps remain visible to whoever has to fill them.
 */
export function practitionerNames(location: Location): string[] {
  return location.practitioners.filter(
    (n) => SHOW_DRAFT_CONTENT || !isDraftText(n)
  );
}

/**
 * The center's full address on one line, as a person would write it.
 * Returns null while the street address or ZIP is still a [placeholder].
 */
export function formattedAddress(location: Location): string | null {
  if (!hasConfirmedAddress(location)) return null;
  const { streetAddress, addressLocality, addressRegion, postalCode } =
    location.address;
  return `${streetAddress}, ${addressLocality}, ${addressRegion} ${postalCode}`;
}

/**
 * Google Maps link for the schema `hasMap`, built from the confirmed address
 * with Google's documented URL scheme — no API key, and nothing to maintain
 * separately, so it can't drift from the PostalAddress the way a pasted link
 * would. Null until the address is confirmed.
 */
export function mapsUrl(location: Location): string | null {
  const address = formattedAddress(location);
  if (!address) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

/**
 * This center's confirmed week, or null — no hours recorded, or hours still
 * unverified in a production build. Every reader goes through here: the page,
 * the cards, and the JSON-LD all see the same week or all see nothing, so the
 * markup can never publish hours the page is hiding.
 */
export function locationHours(location: Location): WeeklyHours | null {
  return location.hours ? verifiedOr(location.hours) : null;
}

/** Sunday-first, matching the `week` tuple and JS `Date#getDay()`. */
const DAY_ABBREV = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** True when two days keep the same hours — including both being closed. */
function sameHours(a: DayHours, b: DayHours): boolean {
  if (a === null || b === null) return a === b;
  return a.opens === b.opens && a.closes === b.closes;
}

/** "09:00" → "9a", "18:00" → "6p", "09:30" → "9:30a". Site house style. */
function clockLabel(hhmm: string): string {
  const [hour, minute] = hhmm.split(":").map(Number);
  const suffix = hour < 12 ? "a" : "p";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return minute === 0
    ? `${hour12}${suffix}`
    : `${hour12}:${String(minute).padStart(2, "0")}${suffix}`;
}

/** "Tue" for one day, "Tue–Fri" for a run. Handles a run that wraps Saturday. */
function dayRangeLabel(start: number, end: number): string {
  return start === end
    ? DAY_ABBREV[start]
    : `${DAY_ABBREV[start]}–${DAY_ABBREV[end]}`;
}

/**
 * The week as lines a person reads: ["Tue–Fri 9a–6p", "Sat 8a–3p",
 * "Closed Sun–Mon"]. Empty when the center has no publishable hours.
 *
 * Consecutive days that keep the same hours collapse into one run, and a run
 * that spans the Saturday/Sunday boundary is joined rather than split — which
 * is what turns Murfreesboro's four separate closed days into the single
 * "Closed Fri–Mon" a visitor can actually parse. The list is then rotated to
 * start at the first open run, so the lines lead with when the center is open
 * and close with when it isn't.
 *
 * **Closed days are stated, not dropped.** Someone free only on Friday has to
 * be able to see that Murfreesboro can't take her and Nashville can; hours
 * that list open days alone leave her to infer that from an absence.
 */
export function formattedHours(location: Location): string[] {
  const hours = locationHours(location);
  if (!hours) return [];

  // Runs of consecutive days sharing the same hours.
  const runs: Array<{ start: number; end: number; hours: DayHours }> = [];
  hours.week.forEach((day, i) => {
    const last = runs[runs.length - 1];
    if (last && sameHours(last.hours, day)) last.end = i;
    else runs.push({ start: i, end: i, hours: day });
  });

  // Saturday and Sunday are adjacent in a week, not in an array. Join the
  // ends when they match, so a closed weekend spanning the wrap reads as one
  // range instead of two.
  if (runs.length > 1 && sameHours(runs[0].hours, runs[runs.length - 1].hours)) {
    const tail = runs.pop()!;
    runs[0].start = tail.start;
  }

  // Lead with the open days. Rotation, not a sort: the cyclic order of the
  // week is what makes "Fri–Mon" mean four days and not a typo.
  const firstOpen = runs.findIndex((r) => r.hours !== null);
  const ordered =
    firstOpen > 0 ? [...runs.slice(firstOpen), ...runs.slice(0, firstOpen)] : runs;

  return ordered.map((run) => {
    const days = dayRangeLabel(run.start, run.end);
    return run.hours
      ? `${days} ${clockLabel(run.hours.opens)}–${clockLabel(run.hours.closes)}`
      : `Closed ${days}`;
  });
}

/**
 * The same week on one line, for the location cards: "Tue–Fri 9a–6p · Sat
 * 8a–3p · Closed Sun–Mon". Null when there are no hours to show, so a card
 * can drop the line rather than print an empty one. The separator lives here
 * and not in each card, which is the whole point — two cards joining the same
 * lines two ways is how one of them ends up wrong.
 */
export function hoursSummary(location: Location): string | null {
  const lines = formattedHours(location);
  return lines.length > 0 ? lines.join(" · ") : null;
}

/**
 * Real photographs for this center, site-root-relative — hero first, then the
 * space grid. Placeholder plates are not photos and are skipped, so a center
 * that has none (Murfreesboro, Franklin) returns an empty array and the
 * caller omits the field rather than shipping a stand-in.
 */
export function locationPhotos(location: Location): string[] {
  return [
    ...(location.image ? [location.image.src] : []),
    ...location.space.photos
      .filter((p) => p.kind === "photo")
      .map((p) => p.src),
  ];
}

/**
 * Community names for schema `areaServed`, derived from the same
 * `planning.communities` sentence the page renders — one source, so
 * confirming the list updates both.
 *
 * The sentence is written as "A, B, C & nearby." The trailing "nearby" is
 * copy, not a place, and is dropped. Returns [] while the list is still a
 * [placeholder], which keeps the schema silent whenever the page would be.
 */
export function communitiesServed(location: Location): string[] {
  const line = location.planning.communities;
  if (isDraftText(line)) return [];
  return line
    .replace(/\.$/, "")
    .split(/,|\s&\s/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.toLowerCase() !== "nearby");
}
