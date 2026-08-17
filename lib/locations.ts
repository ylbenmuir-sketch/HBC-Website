import {
  BRAIN_MAP_NAME,
  BRAIN_MAP_POINTS,
  FIRST_VISIT_DURATION,
  FOUNDER_DISPLAY_NAME,
  PHONE_DISPLAY,
  SESSION_LENGTH,
  SHOW_DRAFT_CONTENT,
  SHOW_REVIEWS,
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
  /**
   * Google reviews for **this** center, or null for one with none to publish.
   *
   * Per center for the reason `hours` is: 144 and 15 are two facts, and the
   * sitewide constant that used to hold a single count could only ever have
   * been wrong about one of them. The combined figure the homepage and
   * /stories bands print is summed from these (`combinedReviewCount()`), so
   * the band cannot drift from the two pages it is adding up.
   *
   * The rating lives in REVIEWS (lib/site-config.ts) and not here: both
   * centers sit at 5.0 today, so a per-center copy would be one number written
   * twice. `REVIEWS.verified` gates this whole surface — page line and band
   * alike — which is why the count is a plain number and carries no second
   * gate of its own.
   *
   * Null, not 0, for a center with no reviews. Franklin has not opened, and
   * "0 reviews" is a figure a reader weighs; nothing is the honest render.
   */
  reviewCount: number | null;
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
  /**
   * The substance section, between the hero and the space.
   *
   * It exists because "neurofeedback" and "LENS" appeared zero times in the
   * body copy of either open center's page — a location page for a LENS
   * practice that never said what LENS was. The three beats are fixed: what
   * LENS is in two sentences, who comes to *this* center, and what a first
   * visit involves.
   *
   * Each beat hands off rather than restating. /lens-neurofeedback owns the
   * definition and /how-lens-works owns the mechanism (QUERY-TO-PAGE-MAP.md
   * rule 1), so two sentences and a link is the whole budget here — a third
   * page explaining the mechanism in full is how all three start competing.
   *
   * The middle paragraph is the one that must differ per center, and does:
   * it is about who walks through *this* door, not about LENS.
   *
   * Optional, and absent on Franklin: "who comes to this center" is a
   * paragraph a center with no clients cannot write, and the two sentences of
   * LENS definition are not worth publishing on their own on a page whose
   * whole job is a waitlist.
   */
  intro?: {
    eyebrow: string;
    heading: string;
    /** Body paragraphs, in order: what LENS is · who comes here · first visit. */
    paragraphs: string[];
    /**
     * Lead-in to the three concern links the template appends. The links are
     * JSX and cannot live here — lib/locations.ts is imported by the
     * assistant's index through plain Node type stripping (scripts/answer-audit.mjs),
     * which reads `.ts` and not `.tsx`. So the data supplies the sentence up to
     * the links and the template supplies the links.
     */
    concernsLead: string;
  };
  space: {
    heading: string;
    sub: string;
    photos: Array<
      | { kind: "photo"; src: string; position: string }
      | { kind: "plate"; spec: string }
    >;
    /**
     * Prose shown *instead of* the photo grid in production, for a center whose
     * photos are all placeholder plates.
     *
     * Murfreesboro's three plates render in production as empty sage gradients
     * under a heading about a room nobody can see — which is worse than saying
     * something true about the center in words. Draft builds still show the
     * plates, so the photography brief stays visible to whoever has to shoot it,
     * and the grid comes back on its own the moment one real photo lands.
     */
    body?: string[];
  };
  team: TeamCard[];
  quote: { text: string; attribution: string; place: string };
  /** Production stand-in for the draft-only client quote. Per center: the same
   *  three lines on both pages made the two navy bands read as one page. */
  goodToKnow: string;
  planning: {
    /** H2 over the planning section — per center, because "anywhere in the
     *  metro" is Nashville's claim and not Murfreesboro's. */
    reachHeading: string;
    gettingHere: string;
    /**
     * The center's schedule as a planning fact rather than a table of hours.
     *
     * Nashville's Saturday and Murfreesboro's three clinic days are the two
     * places these centers most differ, and the hours block in the hero states
     * the times without saying what they mean for a person deciding where to
     * go. Neither note repeats a time: the week is data (`hours`), and a
     * duplicated "8a–3p" here is a second copy free to drift from the first.
     *
     * Absent on a center with no hours to publish, for the reason the Hours
     * hero fact is: Franklin's schedule is "not yet".
     */
    scheduleNote?: { heading: string; body: string };
    /** Lead sentence over the community list — the shape of the catchment. */
    communitiesLead: string;
    /**
     * Communities served, as names.
     *
     * A list and not a sentence since Ben's client data replaced the guessed
     * one: sixteen and ten names respectively, which is a paragraph a reader
     * skims and a string `communitiesServed()` had to parse back apart to feed
     * `areaServed`. The array is the source for both, so the schema and the
     * page cannot disagree about who is on it.
     */
    communities: string[];
    alsoNearby: string;
  };
  finalHeading: string;
  /**
   * The CTA band's sub — one limitation sentence, folded into the offer of the
   * call and stated as scope rather than absence (the phase 11d pattern in
   * lib/chat/answer.ts). Per center so the two bands don't read identically;
   * both carry the same limitation and differ only in what the call is for.
   *
   * Omitted on Franklin, which falls back to FinalCTA's default: the band
   * there is a waitlist ask, and a sentence scoping how much LENS helps
   * belongs on a page that can actually book you.
   */
  finalSub?: string;
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
    /** Confirmed by Ben — 144 reviews, none rated below five. */
    reviewCount: 144,
    phone: PHONE_DISPLAY,
    cardExtra: "Private lot on site, free for clients",
    practitioners: [FOUNDER_DISPLAY_NAME, "[Name]", "[Name]"],
    hero: {
      eyebrow: "Nashville, Tennessee",
      /**
       * The H1 carries the service and the city in its first four words.
       * "A quiet place to get your bearings back" read well and targeted
       * nothing — this page is the site's highest-intent local surface
       * (2,930 impressions at position 10.2) and the query is
       * `neurofeedback nashville`.
       *
       * The tail is the differentiator, and it is true against `hours`
       * above: Tue–Fri plus Saturday morning. Murfreesboro's H1 is built on
       * a different axis (its catchment) so the two do not read as one
       * sentence with the town swapped.
       */
      titleLead: "LENS neurofeedback in ",
      titleAccent: "Nashville",
      titleTail: " — Tuesday through Saturday.",
      sub: "Gentle, passive sessions for adults, children, and families across Davidson County and the towns around it — in a calm center just off I-24, with Saturday mornings on the schedule.",
      arrivalLines: ["Private lot on site,", "free for clients"],
    },
    image: { src: "/images/session-room.jpg", position: "center 55%" },
    intro: {
      eyebrow: "Why people come here",
      heading: "What LENS is — and who comes to Thompson Lane.",
      paragraphs: [
        "LENS stands for Low Energy Neurofeedback System. Small sensors read the brain's electrical activity at a point on the scalp, and the system returns a brief feedback signal that lasts a fraction of a second — there is nothing to concentrate on, nothing to watch, and nothing to practice between visits.",
        "This center sits in the middle of the metro, and it shows in who comes: working adults booking around a commute, school-age kids whose parents would rather not pull them out of class, and families driving in from Williamson, Sumner, and Wilson County.",
        `A first visit runs ${FIRST_VISIT_DURATION} and starts with a conversation. Then ${BRAIN_MAP_NAME} — a ${BRAIN_MAP_POINTS}-point recording of brain activity, explained to you point by point, and a written plan you keep.`,
      ],
      concernsLead: "Clients here most often come in for",
    },
    space: {
      /** No room count. Three photographs are three photographs, not evidence
       *  of three rooms, and nothing on file says how many this center has. */
      heading: "Quiet rooms, and no waiting-room churn.",
      sub: "No fluorescent hum, no clipboard queue. Comfortable chairs, low light, and a team that isn't rushing you anywhere.",
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
    /** Not "Saturday runs on the same schedule as weekdays" — it doesn't.
     *  Saturday is 8a–3p against a weekday 9a–6p, and the hours block three
     *  sections up says so. */
    goodToKnow:
      "The call is free, no referral is needed, and you can start on a Saturday if a weekday doesn't work.",
    planning: {
      reachHeading: "Easy to reach from anywhere in the metro.",
      gettingHere:
        "Private lot on site, free for clients, steps from the door. We're just off I-24 at Thompson Lane, with I-440 ending immediately north of us.",
      scheduleNote: {
        heading: "Saturday appointments",
        body: "We see clients on Saturday mornings — the reason a lot of working adults and school-age kids start here rather than waiting on a weekday slot.",
      },
      communitiesLead:
        "This center draws from Davidson County and the Williamson, Sumner, and Wilson County towns around it.",
      /**
       * Ben's client data, replacing a guessed list ("Belle Meade, Green Hills,
       * Bellevue") that carried a [Confirm list] tag and therefore kept the
       * assistant's `location:nashville:area` passage out of the index
       * entirely — the reason it could not answer "do you serve Franklin?".
       */
      communities: [
        "Nashville",
        "Franklin",
        "Brentwood",
        "Spring Hill",
        "Mount Juliet",
        "Hendersonville",
        "Nolensville",
        "Lebanon",
        "College Grove",
        "Thompson's Station",
        "Antioch",
        "Gallatin",
        "Madison",
        "Old Hickory",
        "Fairview",
        "Hermitage",
      ],
      alsoNearby:
        "Our Murfreesboro center is open now. Franklin opens soon — Williamson County clients come here in the meantime, and your plan travels with you when it opens.",
    },
    finalHeading: "Come see the space, meet the team, and ask us anything.",
    finalSub:
      "How much LENS helps varies from person to person, and it isn't a replacement for care you're already getting. A call is the fastest way to find out whether it fits — and whether a weekday or a Saturday suits you better.",
    metaTitle: "LENS Neurofeedback in Nashville, TN",
    metaDescription:
      "LENS neurofeedback in Nashville, TN — gentle, passive sessions Tuesday through Saturday, just off I-24 at Thompson Lane. The first call is free.",
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
    /**
     * Confirmed by Ben — 15 reviews, none rated below five.
     *
     * A smaller number than Nashville's and stated in exactly the same words
     * on the page, which is the point: this center is open three days a week
     * and has been for less time, and copy that hedged the figure would tell a
     * reader the number is a weakness before they had decided that themselves.
     * Fifteen unbroken five-star reviews is a strong fact on its own terms.
     */
    reviewCount: 15,
    phone: PHONE_DISPLAY,
    cardExtra: "Private lot on site, free for clients",
    practitioners: ["[Name]", "[Name]"],
    hero: {
      eyebrow: "Murfreesboro, Tennessee",
      /**
       * Built on the catchment rather than the calendar, which is the axis
       * Nashville's H1 does not use. "The same standard of care, closer to
       * home" said nothing a search could find and, worse, framed this center
       * as the satellite of the other one.
       */
      titleLead: "LENS neurofeedback for ",
      titleAccent: "Rutherford County",
      titleTail: " — in downtown Murfreesboro.",
      sub: "Gentle, passive sessions for adults, children, and families from Smyrna to Shelbyville — in a calm center a few minutes off I-24, near Broad Street.",
      arrivalLines: ["Private lot on site,", "free for clients"],
    },
    plateSpec: "Murfreesboro — reception or session room, natural light",
    intro: {
      eyebrow: "Why people come here",
      heading: "What LENS is — and who comes to Chestnut Street.",
      paragraphs: [
        // Deliberately not Nashville's wording. Both pages have to expand the
        // acronym, and that phrase is the only thing the two definitions share
        // — the sentence around it is built differently on each so the pages
        // don't open their body copy with the same twenty words.
        "LENS is short for Low Energy Neurofeedback System, and the approach is passive by design: small sensors read the brain's own electrical activity, and the system answers with a feedback signal far weaker than the one from the phone in your pocket. There is nothing to perform, and nothing to keep up with at home.",
        "This is the center for people who would otherwise drive past it: families from Smyrna, La Vergne and Christiana, commuters who work in Nashville and would rather not add the drive to the end of a day, and clients coming in from Bell Buckle, Shelbyville, Woodbury and Manchester.",
        `A first visit runs ${FIRST_VISIT_DURATION}: a full conversation first, then ${BRAIN_MAP_NAME} — a ${BRAIN_MAP_POINTS}-point recording of brain activity — walked through with you point by point, and a written plan you keep.`,
      ],
      concernsLead: "People come to this center most often for",
    },
    space: {
      heading: "A downtown center, built to the same standard.",
      sub: "The same care model, the same training, and the same honest policies as every Harmonized center.",
      photos: [
        { kind: "plate", spec: "Murfreesboro interior — reception, natural light" },
        { kind: "plate", spec: "Murfreesboro session room — comfortable chair" },
        { kind: "plate", spec: "Murfreesboro exterior — entrance signage" },
      ],
      body: [
        `The rooms are quiet and the chairs are comfortable, and nobody is moved through on a clock. A session runs ${SESSION_LENGTH.value}, and most people read or simply rest through it.`,
        "Photography of this center is being produced now. Until it arrives we would rather show you nothing than show you somebody else's room.",
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
    goodToKnow:
      "The call is free, no referral is needed, and you'll never be asked to commit to a long program up front.",
    planning: {
      reachHeading: "A few minutes off I-24, in the middle of town.",
      gettingHere:
        "Private lot on site, free for clients. We're in downtown Murfreesboro, a few minutes off I-24 and just off Broad Street.",
      /**
       * Stated as the fact and then the alternative, not as a shortage. The
       * three clinic days are the inverse of Nashville's Saturday, and each
       * page carries only its own — which is what stops the pair from reading
       * as one page with the town swapped.
       */
      scheduleNote: {
        heading: "Our schedule here",
        body: "This center runs Tuesday through Thursday. If Friday or Saturday works better for you, our Nashville center keeps those hours and your plan travels with you.",
      },
      /**
       * Named by county rather than by compass. "The towns south and east of
       * it" was wrong for four of the ten: Smyrna and La Vergne sit north-west
       * of Murfreesboro, Eagleville and Rockvale west and south-west. Bedford,
       * Cannon and Coffee is what the list past Rutherford actually is —
       * Shelbyville and Bell Buckle, Woodbury, Manchester.
       */
      communitiesLead:
        "This center draws from across Rutherford County, and from the Bedford, Cannon and Coffee County towns beyond it.",
      /** Ben's client data — see the Nashville list above for why it is a list. */
      communities: [
        "Murfreesboro",
        "Smyrna",
        "Christiana",
        "La Vergne",
        "Eagleville",
        "Rockvale",
        "Woodbury",
        "Manchester",
        "Bell Buckle",
        "Shelbyville",
      ],
      alsoNearby:
        "Nashville center · Franklin coming soon — transfer anytime; your plan travels with you.",
    },
    finalHeading: "Start with a call — before you drive anywhere.",
    finalSub:
      "How much LENS helps varies from person to person, and it isn't a replacement for care you're already getting. A call is the fastest way to find out whether it fits, and which of our two centers is easier for you to reach.",
    metaTitle: "LENS Neurofeedback in Murfreesboro, TN",
    metaDescription:
      "LENS neurofeedback in downtown Murfreesboro, TN — gentle, passive sessions for adults, children, and families across Rutherford County. The first call is free.",
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
    /** No reviews: the center has no clients yet. See `reviewCount` on the type. */
    reviewCount: null,
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
    goodToKnow:
      "The call is free, no referral is needed, and you can start at Nashville or Murfreesboro today and transfer when Franklin opens.",
    planning: {
      reachHeading: "Williamson County, once the doors open.",
      gettingHere: "[Neighborhood, nearest cross streets, highway access.]",
      communitiesLead:
        "The Franklin center will serve the Williamson County towns our Nashville center already sees clients from.",
      communities: [
        "Franklin",
        "Brentwood",
        "Spring Hill",
        "Thompson's Station",
      ],
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
 * Community names for schema `areaServed` — the same list the page prints
 * under "Communities served", so the two cannot disagree about who is on it.
 *
 * This used to parse a prose sentence back apart on commas and ampersands,
 * dropping a trailing "nearby" that was copy rather than a place. The data is
 * a `string[]` now that Ben's client list replaced the guessed one: sixteen
 * names do not fit in a sentence a reader will finish, and a parser standing
 * between the page and the schema is one more thing that can be wrong about
 * either. Each name still carries the [placeholder] gate individually.
 */
export function communitiesServed(location: Location): string[] {
  return location.planning.communities.filter(
    (name) => SHOW_DRAFT_CONTENT || !isDraftText(name)
  );
}

/**
 * Saturday's hours as a label ("8a–3p"), or null for a center closed Saturday
 * or with no publishable week.
 *
 * Nashville keeps Saturday hours and most practices in the category do not,
 * which makes it the strongest differentiator on that page — so it gets a
 * hero fact of its own rather than sitting as the last line of a three-line
 * hours block. Derived from `week[6]` and not written as copy: the times have
 * one home, and a page that states them twice states them differently
 * eventually.
 */
export function saturdayLabel(location: Location): string | null {
  const hours = locationHours(location);
  const saturday = hours?.week[6];
  if (!saturday) return null;
  return `${clockLabel(saturday.opens)}–${clockLabel(saturday.closes)}`;
}

/**
 * Real photographs in the "space" grid — plates are not photos.
 *
 * The template renders `space.body` prose instead of the grid when this is
 * empty in production, so a center still waiting on photography says something
 * true in words rather than showing three empty gradients under a heading
 * about a room. Draft builds keep the plates, and their specs, visible.
 */
export function spacePhotoCount(location: Location): number {
  return location.space.photos.filter((p) => p.kind === "photo").length;
}

/**
 * This center's review count, or null when it has none to publish or the
 * sitewide gate is off. The reader every page goes through, so `reviewCount`
 * is never read raw and the gate cannot be forgotten on one surface.
 */
export function locationReviewCount(location: Location): number | null {
  return SHOW_REVIEWS ? location.reviewCount : null;
}

/**
 * Every center's reviews added up — the figure the homepage and /stories bands
 * print, and the reason no "159" is typed anywhere in this repo.
 *
 * Summed rather than stored. A sitewide constant beside the two per-center
 * counts is a third copy of a number the other two already determine, and the
 * day one center's count is updated is the day the band starts contradicting
 * the page it links to. Centers with no reviews contribute nothing rather than
 * dragging a zero into the total, which is what keeps Franklin out of it.
 *
 * Null when the total is zero, so a caller drops the figure rather than
 * printing "0 reviews".
 */
export function combinedReviewCount(): number | null {
  if (!SHOW_REVIEWS) return null;
  const total = locations.reduce((sum, l) => sum + (l.reviewCount ?? 0), 0);
  return total > 0 ? total : null;
}

/**
 * "144 reviews", "1 review". The pluralization lives here and not in each
 * band, for the same reason `hoursSummary` owns its separator — three callers
 * agreeing on a suffix by hand is three chances to disagree. Grouped over a
 * thousand, which no count is today and one will be.
 */
export function reviewCountLabel(count: number): string {
  return `${count.toLocaleString("en-US")} ${count === 1 ? "review" : "reviews"}`;
}
