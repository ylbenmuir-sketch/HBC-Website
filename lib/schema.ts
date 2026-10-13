/**
 * JSON-LD builders. Every structured-data node on the site is produced here
 * and rendered through <PageSchema> (components/PageSchema.tsx) as ONE
 * `@graph` per page.
 *
 * Three rules this file exists to enforce:
 *
 * 1. **Schema never asserts more than the page does.** Unverified facts are
 *    gated exactly as they are in the UI — see lib/site-config.ts. A field
 *    whose value is still a [placeholder] is omitted, not guessed, so the
 *    markup can't claim something the rendered page won't.
 * 2. **One organization entity, one website entity.** Everything else
 *    references them by `@id` rather than restating them, so the graph has
 *    a single subject and nothing can drift from it.
 * 3. **Every `@id` reference carries its `@type` and `name`.** Google merges
 *    all the JSON-LD on a page into one graph and would resolve a bare
 *    `{"@id"}`; most other consumers — Bing, the Schema Markup Validator in
 *    some modes, every LLM extraction pipeline — read a node in isolation and
 *    see an author with no name (SEO-AUDIT-3 §3.2). The `*Ref()` helpers are
 *    the only way to reference a node from here, and they are typed.
 *
 * ## One graph per page
 *
 * A page used to emit two to four separate `<script type="application/ld+json">`
 * blocks — Organization from the layout, BreadcrumbList from the crumb
 * component, FAQPage or Article from the page. A single `@graph` is what
 * every parser handles identically, and it is where the `WebSite` and the
 * typed `WebPage` node that anchor the rest belong. `pageGraph()` builds it;
 * `<PageSchema>` renders it; scripts/check-schema.mjs asserts every
 * indexable route has exactly one (SEO-AUDIT-3 A8).
 */

import {
  type Location,
  type WeeklyHours,
  communitiesServed,
  hasConfirmedAddress,
  locationHours,
  locationPhone,
  locationPhotos,
  locations,
  mapsUrl,
} from "./locations";
import { type Resource, lastChanged } from "./resources";
import { type TeamMember } from "./team";
import {
  type Video,
  embedUrl,
  isoDuration,
  videoDuration,
  videoUploadDate,
} from "./videos";
import {
  ESTABLISHED_YEAR,
  FOUNDER_DISPLAY_NAME,
  PHONE_TEL,
  SHOW_PHONE,
  SITE_NAME,
  SITE_URL,
  verifiedOr,
  YOUTUBE_CHANNEL_URL,
} from "./site-config";

/** Absolute URL for a site-root-relative path. Schema requires absolute. */
export function abs(path: string): string {
  return `${SITE_URL}${path === "/" ? "" : path}`;
}

/**
 * Stable @id for the one Organization node, on every page. LocalBusiness
 * nodes point `parentOrganization` here instead of repeating its fields.
 */
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;

/** Stable @id for the one WebSite node, on every page. */
export const WEBSITE_ID = `${SITE_URL}/#website`;

/**
 * Stable @id for the founder. Declared beside the Organization's because the
 * two nodes reference each other — `founder` on the Organization, `worksFor`
 * on the Person — and an id used in two files should be readable in one place.
 */
export const FOUNDER_ID = `${SITE_URL}/about/founder#person`;

/* ------------------------------------------------------------------ */
/* Typed references — rule 3                                           */
/* ------------------------------------------------------------------ */

export function orgRef() {
  return { "@type": "Organization", "@id": ORGANIZATION_ID, name: SITE_NAME };
}

export function websiteRef() {
  return { "@type": "WebSite", "@id": WEBSITE_ID, name: SITE_NAME };
}

export function founderRef() {
  return { "@type": "Person", "@id": FOUNDER_ID, name: FOUNDER_DISPLAY_NAME };
}

export function webPageId(path: string): string {
  return `${abs(path)}#webpage`;
}

export function webPageRef(path: string, name: string) {
  return { "@type": "WebPage", "@id": webPageId(path), name };
}

export function localBusinessId(location: Location): string {
  return `${abs(`/locations/${location.slug}`)}#localbusiness`;
}

export function localBusinessRef(location: Location) {
  return {
    "@type": "LocalBusiness",
    "@id": localBusinessId(location),
    name: `${SITE_NAME} — ${location.name}`,
  };
}

export const SERVICE_PATH = "/lens-neurofeedback";
export const SERVICE_NAME = "LENS Neurofeedback";

export function serviceRef() {
  return {
    "@type": "Service",
    "@id": `${abs(SERVICE_PATH)}#service`,
    name: SERVICE_NAME,
  };
}

/* ------------------------------------------------------------------ */
/* Sitewide nodes                                                      */
/* ------------------------------------------------------------------ */

/**
 * Sitewide Organization. In every page's graph.
 *
 * Deliberately NOT a medical type — see SEO-AUDIT.md §2.5. The footer
 * DISCLAIMER states this is a wellness practice and not a medical clinic, and
 * schema that contradicts the page copy is worse than a generic type.
 *
 * `location` lists both open centers by typed @id, which makes the
 * parent/child relationship bidirectional: the LocalBusiness nodes say whose
 * they are, and the Organization says which places it has. Franklin is
 * absent for the reason it ships no LocalBusiness — it has not opened.
 *
 * `sameAs` carries the Google Business Profiles — one entry per center that
 * has a listing, addressed by CID, taken from the same `reviewReadUrl` the
 * pages link to. Both URLs are Ben-confirmed (see the field note in
 * lib/locations.ts). SEO-AUDIT-3 §3.3 is right that `sameAs` is meant for
 * identity pages and that Google reconciles a Business Profile through NAP
 * and the listing's website field rather than through this array; the CIDs
 * are harmless and stay. The YouTube channel is the one social profile the
 * practice has confirmed (Oct 2026), and it is the kind of identity page
 * `sameAs` is actually for.
 */
export function organizationSchema() {
  const foundingYear = verifiedOr(ESTABLISHED_YEAR);
  const profiles = [
    ...locations
      .map((l) => l.reviewReadUrl)
      .filter((url): url is string => url !== null),
    YOUTUBE_CHANNEL_URL,
  ];
  const openCenters = locations.filter((l) => !l.comingSoon);
  return {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: {
      "@type": "ImageObject",
      url: abs("/images/logo-mark.png"),
      width: 512,
      height: 512,
    },
    description:
      "LENS neurofeedback for adults, children, and families across Middle Tennessee.",
    ...(SHOW_PHONE ? { telephone: PHONE_TEL } : {}),
    ...(foundingYear ? { foundingDate: String(foundingYear) } : {}),
    ...(profiles.length > 0 ? { sameAs: profiles } : {}),
    ...(openCenters.length > 0
      ? { location: openCenters.map(localBusinessRef) }
      : {}),
    // First name only until the surname verifies (FOUNDER_LAST_NAME), which is
    // what FOUNDER_DISPLAY_NAME already resolves to. `@id` matches the
    // standalone Person on /about/founder, so the two are one entity.
    founder: {
      ...founderRef(),
      jobTitle: "Founder & Clinical Director",
    },
  };
}

/**
 * Sitewide WebSite. In every page's graph. Anchors the WebPage nodes
 * (`isPartOf`) and, with `og:site_name`, is what site-name display in
 * results is driven by. No `SearchAction`: the sitelinks search box was
 * retired in October 2024, and the site has no search.
 */
export function websiteSchema() {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: "en-US",
    publisher: orgRef(),
  };
}

/* ------------------------------------------------------------------ */
/* The page node                                                       */
/* ------------------------------------------------------------------ */

export type WebPageInput = {
  path: string;
  /** schema.org type, or two — `["WebPage", "FAQPage"]` on a page with Q&A. */
  type: string | string[];
  /** The <title> as rendered. */
  name: string;
  description: string;
  /** ISO content date — see `dateModified` in lib/pages.ts. */
  dateModified: string;
  datePublished?: string;
  /** Site-root-relative path of the page's lead photograph, if real. */
  image?: string;
  /** True when the page renders a breadcrumb (and the graph carries it). */
  breadcrumb?: boolean;
  /** What the page is about, typed — defaults to the Organization. */
  about?: object;
  /** The page's main entity, typed — a Person on a profile, a Q&A list. */
  mainEntity?: object | object[];
  /** A typed reference to a VideoObject the page embeds — `videoRef()`. */
  video?: object;
};

/**
 * The typed WebPage node every route carries — the node most extraction
 * pipelines look for first, and the one that gives each URL a dated, typed
 * identity instead of "Organization + nothing" (SEO-AUDIT-3 §3.4).
 */
export function webPageSchema(p: WebPageInput) {
  const url = abs(p.path);
  return {
    "@type": p.type,
    "@id": webPageId(p.path),
    url,
    name: p.name,
    description: p.description,
    isPartOf: websiteRef(),
    about: p.about ?? orgRef(),
    inLanguage: "en-US",
    dateModified: p.dateModified,
    ...(p.datePublished ? { datePublished: p.datePublished } : {}),
    ...(p.image
      ? { primaryImageOfPage: { "@type": "ImageObject", url: abs(p.image) } }
      : {}),
    ...(p.breadcrumb
      ? { breadcrumb: { "@type": "BreadcrumbList", "@id": `${url}#breadcrumb` } }
      : {}),
    ...(p.mainEntity ? { mainEntity: p.mainEntity } : {}),
    ...(p.video ? { video: p.video } : {}),
  };
}

/**
 * The whole graph for one page: the two sitewide nodes, then the page's
 * own. `@context` is declared once, here, and never on a node.
 */
export function pageGraph(nodes: object[]) {
  return {
    "@context": "https://schema.org",
    "@graph": [organizationSchema(), websiteSchema(), ...nodes],
  };
}

/* ------------------------------------------------------------------ */
/* Entity nodes                                                        */
/* ------------------------------------------------------------------ */

/** Schema.org day names, Sunday first — the order of `WeeklyHours.week`. */
const SCHEMA_DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

/**
 * `openingHoursSpecification` from the same week the page prints.
 *
 * Days with identical hours share one entry, which is the form Google's
 * examples use and the one a human can check against the page at a glance.
 *
 * **Closed days are absent here, though the page states them.** The only way
 * to mark a day closed in this vocabulary is `opens` and `closes` both
 * "00:00", and that is the same pair a 24-hour business is read as by some
 * consumers. Publishing an ambiguous claim about Friday is worse than
 * publishing none — days a business does not list are not days it claims to
 * be open. See rule 1 at the top of this file.
 */
function openingHoursSpecification(hours: WeeklyHours) {
  const byWindow = new Map<string, { opens: string; closes: string; days: string[] }>();
  hours.week.forEach((day, i) => {
    if (!day) return;
    const key = `${day.opens}-${day.closes}`;
    const entry = byWindow.get(key) ?? { opens: day.opens, closes: day.closes, days: [] };
    entry.days.push(SCHEMA_DAYS[i]);
    byWindow.set(key, entry);
  });
  return [...byWindow.values()].map((entry) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek: entry.days,
    opens: entry.opens,
    closes: entry.closes,
  }));
}

/**
 * LocalBusiness for one open center.
 *
 * Only call this for centers that are actually open — Franklin ships no
 * LocalBusiness at all (SEO-AUDIT.md §2.4). Google's guidance is not to
 * represent an unopened business as operating, and a coming-soon page that
 * claims a trading entity is exactly that.
 *
 * Every field here mirrors something the page renders:
 *  - `image` — real photographs only; a center with none omits the field
 *    (Murfreesboro, until P4 lands).
 *  - `areaServed` — the same communities the page lists under "Planning
 *    your visit".
 *  - `priceRange` — a band, not a figure. "$150" read as though every
 *    service costs $150 when it is the first visit only, and "$125–$150"
 *    leaves the published package outside it. Exact figures stay where a
 *    visitor reads them in context — /first-visit and /faq.
 *  - `geo` / `hasMap` — both ride the address gate, because a pin or a map
 *    link without a verified street address would point at a building the
 *    site doesn't claim to occupy.
 *  - `openingHoursSpecification` — built from `hours` in lib/locations.ts,
 *    the same week `formattedHours()` prints.
 *  - `telephone` — the center's own line, the same number the page's call
 *    button renders.
 *  - `parentOrganization` — a typed reference to the one Organization.
 *  - `sameAs` — this center's own Google Business Profile, by CID.
 *
 * No `aggregateRating`, ever — see REVIEWS in lib/site-config.ts.
 */
export function localBusinessSchema(location: Location) {
  const photos = locationPhotos(location).map(abs);
  const areaServed = communitiesServed(location);
  const url = abs(`/locations/${location.slug}`);
  const addressConfirmed = hasConfirmedAddress(location);
  const map = mapsUrl(location);
  const hours = locationHours(location);
  const phone = locationPhone(location);
  return {
    "@type": "LocalBusiness",
    "@id": localBusinessId(location),
    name: `${SITE_NAME} — ${location.name}`,
    url,
    ...(phone ? { telephone: phone.tel } : {}),
    address: {
      "@type": "PostalAddress",
      ...(addressConfirmed
        ? {
            streetAddress: location.address.streetAddress,
            postalCode: location.address.postalCode,
          }
        : {}),
      addressLocality: location.address.addressLocality,
      addressRegion: location.address.addressRegion,
      addressCountry: "US",
    },
    ...(addressConfirmed && location.geo
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: location.geo.latitude,
            longitude: location.geo.longitude,
          },
        }
      : {}),
    ...(map ? { hasMap: map } : {}),
    ...(location.reviewReadUrl ? { sameAs: [location.reviewReadUrl] } : {}),
    ...(hours ? { openingHoursSpecification: openingHoursSpecification(hours) } : {}),
    description: location.metaDescription,
    priceRange: "$$",
    ...(photos.length > 0 ? { image: photos } : {}),
    ...(areaServed.length > 0
      ? {
          areaServed: areaServed.map((name) => ({ "@type": "City", name })),
        }
      : {}),
    parentOrganization: orgRef(),
  };
}

/**
 * The service itself, as one node — for /lens-neurofeedback.
 *
 * `Service` and not `MedicalTherapy`, `MedicalProcedure`, or any other type
 * under MedicalEntity, for exactly the reason organizationSchema() is not a
 * MedicalBusiness (SEO-AUDIT.md §2.5): the footer DISCLAIMER states this is a
 * wellness practice and that LENS is not intended to diagnose or treat
 * anything. A medical type in the markup would contradict the page it sits on.
 *
 * `areaServed` lists only centers that are actually open. No `offers` node:
 * the package price carries PACKAGE_NOTE — the Brain Map is required first
 * and does not count toward the twelve — and an Offer with the price and not
 * the condition is the one way this file's rule gets broken quietly.
 * (SEO-AUDIT-3 §3.3 notes `Offer.description` could carry the condition;
 * that is Ben's call and is not made here.)
 */
export function serviceSchema({ description }: { description: string }) {
  const openCenters = locations.filter((l) => !l.comingSoon);
  return {
    ...serviceRef(),
    serviceType: "LENS neurofeedback",
    description,
    url: abs(SERVICE_PATH),
    provider: orgRef(),
    ...(openCenters.length > 0
      ? {
          areaServed: openCenters.map((l) => ({
            "@type": "City",
            name: l.address.addressLocality,
          })),
        }
      : {}),
  };
}

/**
 * The founder, as a standalone entity — for /about/founder.
 *
 * Fully licensed by what that page already says. Nothing else: no
 * credentials, no `alumniOf`, no `knowsAbout` — those wait on facts nobody
 * has supplied (P2), and rule 1 is that schema never asserts more than the
 * page does. The `@id` is stable, so the day the bio and the credentials land
 * they attach to the entity that is already there.
 */
export function founderSchema() {
  return {
    ...founderRef(),
    jobTitle: "Founder & Clinical Director",
    url: abs("/about/founder"),
    image: abs("/images/founder.jpg"),
    worksFor: orgRef(),
  };
}

function personId(m: TeamMember): string {
  if (m.founder) return FOUNDER_ID;
  const slug = m.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${abs("/about/team")}#${slug}`;
}

export function personRef(m: TeamMember) {
  return { "@type": "Person", "@id": personId(m), name: m.name };
}

/**
 * A Person node for a named member of the roster — for /about/team and the
 * location pages' team sections (SEO-AUDIT-3 §3.3: seven practitioners with
 * on-page roles and no entity).
 *
 * Built only for members the page actually renders: callers pass the same
 * gated list the cards come from (publishableMembers in lib/team.ts), so
 * the markup cannot name someone whose card is still [placeholder]-gated.
 * `jobTitle` is the role the card shows; `hasCredential` only what the bio
 * states (`credentials` on the record); `image` only a real photograph. The
 * founder resolves to the same `@id` as /about/founder's node, so she is
 * one entity wherever she appears.
 */
export function personSchema(m: TeamMember) {
  return {
    ...personRef(m),
    jobTitle: m.role,
    worksFor: orgRef(),
    ...(m.founder ? { url: abs("/about/founder") } : {}),
    ...(m.image ? { image: abs(m.image.src) } : {}),
    ...(m.credentials && m.credentials.length > 0
      ? {
          hasCredential: m.credentials.map((name) => ({
            "@type": "EducationalOccupationalCredential",
            name,
          })),
        }
      : {}),
  };
}

/**
 * Article, for the `/resources/[slug]` pages.
 *
 * `Article`, not `BlogPosting`: these are not a blog and are not dated as one.
 *
 * `author` and `publisher` are both the Organization, typed, because that is
 * exactly what the visible byline says. `Byline.org` is a publisher and never
 * a person — see the type in lib/resources.ts — and the one place a human may
 * be credited, `reviewer`, is unverified on every article today, so no
 * `Person` appears here either (rule 1).
 *
 * `image` only for articles that have a real photograph. A `PlaceholderPlate`
 * is a description of a photograph somebody still has to take.
 */
export function articleSchema(r: Resource) {
  const path = `/resources/${r.slug}`;
  const url = abs(path);
  return {
    "@type": "Article",
    "@id": `${url}#article`,
    mainEntityOfPage: webPageRef(path, r.metaTitle),
    isPartOf: webPageRef(path, r.metaTitle),
    url,
    headline: r.title,
    description: r.metaDescription,
    articleSection: r.tag,
    datePublished: r.datePublished,
    dateModified: lastChanged(r),
    author: orgRef(),
    publisher: orgRef(),
    ...(r.image ? { image: abs(r.image.src) } : {}),
  };
}

/**
 * FAQ questions, for a WebPage node's `mainEntity` — the page itself is then
 * typed `["WebPage", "FAQPage"]` rather than carrying a second page-typed
 * node for the same URL. Answers must be plain strings — see the
 * `a`/`rendered` split on FaqItem in components/FAQAccordion.tsx. Google
 * shows FAQ rich results almost only for government and authoritative health
 * sites now, so this is for entity comprehension, not a SERP treatment.
 */
export function faqQuestions(faqs: ReadonlyArray<{ q: string; a: string }>) {
  return faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  }));
}

/**
 * Stable @id for a video on the page that embeds it. Anchored to the page,
 * not to YouTube: the same recording embedded on two pages is two placements
 * of one video, and `embedUrl` is what says they are the same recording.
 */
export function videoId(path: string, video: Video): string {
  return `${abs(path)}#video-${video.id}`;
}

export function videoRef(path: string, video: Video) {
  return { "@type": "VideoObject", "@id": videoId(path, video), name: video.sourceTitle };
}

/**
 * VideoObject for a video embedded through components/VideoEmbed.tsx.
 *
 * Every field mirrors something the page has or renders: `name` is the
 * video's own YouTube title (the player iframe is titled the same; the
 * caption shows the shorter site label), `thumbnailUrl` is the committed
 * poster the facade shows
 * (`npm run fetch:posters`), `embedUrl` is the privacy-enhanced player the
 * click loads. **`uploadDate` and `duration` appear only once verified** —
 * both are Verifiables in lib/site-config.ts, and rule 1 means an unconfirmed
 * date is omitted, not guessed. Google requires `uploadDate` for the video
 * rich result, so until Ben confirms it this node describes the video
 * without qualifying for that treatment; that is the right trade.
 *
 * No `contentUrl`: the site does not host the media file. `publisher` is the
 * one Organization, typed, which is what the channel it was published on is.
 */
export function videoObjectSchema(path: string, video: Video) {
  const seconds = videoDuration(video);
  const uploadDate = videoUploadDate(video);
  return {
    ...videoRef(path, video),
    description: video.description,
    thumbnailUrl: [abs(video.posterPath)],
    embedUrl: embedUrl(video),
    inLanguage: "en-US",
    publisher: orgRef(),
    ...(uploadDate ? { uploadDate } : {}),
    ...(seconds ? { duration: isoDuration(seconds) } : {}),
  };
}

/** One rung of a breadcrumb trail. `href` is omitted for the current page. */
export type Crumb = { label: string; href?: string };

/**
 * BreadcrumbList mirroring the visible crumb. The page passes the same
 * `trail` array to <Breadcrumbs> and to <PageSchema>, so the two cannot
 * disagree — which is the thing Google checks for. The `@id` is what the
 * WebPage node's `breadcrumb` points at.
 */
export function breadcrumbSchema(trail: ReadonlyArray<Crumb>, path: string) {
  return {
    "@type": "BreadcrumbList",
    "@id": `${abs(path)}#breadcrumb`,
    itemListElement: trail.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: abs(c.href) } : {}),
    })),
  };
}
