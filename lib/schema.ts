/**
 * JSON-LD builders. Every structured-data block on the site is produced here
 * and rendered through <JsonLd> (components/JsonLd.tsx).
 *
 * Two rules this file exists to enforce:
 *
 * 1. **Schema never asserts more than the page does.** Unverified facts are
 *    gated exactly as they are in the UI — see lib/site-config.ts. A field
 *    whose value is still a [placeholder] is omitted, not guessed, so the
 *    markup can't claim something the rendered page won't.
 * 2. **One organization entity.** Everything else references it by @id
 *    rather than restating the name/url/logo, so the graph has a single
 *    subject and location nodes can't drift from it.
 */

import {
  type Location,
  type WeeklyHours,
  communitiesServed,
  hasConfirmedAddress,
  locationHours,
  locationPhotos,
  locations,
  mapsUrl,
} from "./locations";
import {
  ESTABLISHED_YEAR,
  FOUNDER_DISPLAY_NAME,
  PHONE_TEL,
  SHOW_PHONE,
  SITE_NAME,
  SITE_URL,
  verifiedOr,
} from "./site-config";

/** Absolute URL for a site-root-relative path. Schema requires absolute. */
export function abs(path: string): string {
  return `${SITE_URL}${path}`;
}

/**
 * Stable @id for the one Organization node, declared in the root layout.
 * LocalBusiness nodes point `parentOrganization` here instead of repeating
 * the organization's fields.
 */
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;

/**
 * Sitewide Organization. Rendered once, in the root layout.
 *
 * Deliberately NOT a medical type — see SEO-AUDIT.md §2.5. The footer
 * DISCLAIMER states this is a wellness practice and not a medical clinic, and
 * schema that contradicts the page copy is worse than a generic type.
 *
 * `sameAs` carries the Google Business Profiles — one entry per center that
 * has a listing, addressed by CID, taken from the same `reviewReadUrl` the
 * pages link to. This is the field that lets Google reconcile "the site" and
 * "the two listings" into one entity rather than three, and it is the
 * strongest such signal available to a practice with no social profiles. Both
 * URLs are Ben-confirmed (see the field note in lib/locations.ts); a center
 * without a listing contributes nothing rather than a guess.
 *
 * Social profiles, when they exist, belong in this same array.
 */
export function organizationSchema() {
  const foundingYear = verifiedOr(ESTABLISHED_YEAR);
  const profiles = locations
    .map((l) => l.reviewReadUrl)
    .filter((url): url is string => url !== null);
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    url: SITE_URL,
    logo: abs("/images/logo-mark.png"),
    description:
      "Gentle LENS neurofeedback for adults, children, and families across Middle Tennessee.",
    ...(SHOW_PHONE ? { telephone: PHONE_TEL } : {}),
    ...(foundingYear ? { foundingDate: String(foundingYear) } : {}),
    ...(profiles.length > 0 ? { sameAs: profiles } : {}),
    // First name only until the surname verifies (FOUNDER_LAST_NAME), which is
    // what FOUNDER_DISPLAY_NAME already resolves to.
    founder: {
      "@type": "Person",
      name: FOUNDER_DISPLAY_NAME,
      jobTitle: "Founder & Clinical Director",
    },
  };
}

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
 * **Closed days are absent here, though the page states them.** That is not
 * the schema saying less than the page for its own sake: the only way to mark
 * a day closed in this vocabulary is `opens` and `closes` both "00:00", and
 * that is the same pair a 24-hour business is read as by some consumers.
 * Publishing an ambiguous claim about Friday is worse than publishing none —
 * days a business does not list are not days it claims to be open. See rule 1
 * at the top of this file.
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
 *  - `image` — real photographs only; a center with none omits the field.
 *  - `areaServed` — the same communities sentence shown under "Planning your
 *    visit".
 *  - `priceRange` — a band, not a figure, and it stays one now that Ben has
 *    confirmed per-session pricing. The literal "$150" read as though every
 *    service costs $150 when it is the first visit only; "$125–$150" would be
 *    just as wrong, because the published $1,300 package sits outside it.
 *    Google's own guidance for this field is a relative band, so "$$" says
 *    what it is for and the exact figures stay where a visitor reads them in
 *    context — /first-visit and /faq.
 *  - `geo` / `hasMap` — both ride the address gate below, because a pin or a
 *    map link without a verified street address would point at a building
 *    the site doesn't claim to occupy.
 *  - `openingHoursSpecification` — built from `hours` in lib/locations.ts, the
 *    same week `formattedHours()` prints on the page and the cards. A center
 *    with no confirmed hours (Franklin) omits the field rather than guessing.
 *  - `parentOrganization` — an @id reference to the sitewide Organization,
 *    not a copy of it.
 *  - `sameAs` — this center's own Google Business Profile, by CID. The
 *    Organization node lists both; each LocalBusiness lists only its own, so
 *    the two listings resolve to two places rather than to each other.
 *
 * Street address and ZIP stay behind hasConfirmedAddress() exactly as the UI
 * does.
 */
export function localBusinessSchema(location: Location) {
  const photos = locationPhotos(location).map(abs);
  const areaServed = communitiesServed(location);
  const url = abs(`/locations/${location.slug}`);
  const addressConfirmed = hasConfirmedAddress(location);
  const map = mapsUrl(location);
  const hours = locationHours(location);
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "@id": `${url}#localbusiness`,
    name: `${SITE_NAME} — ${location.name}`,
    url,
    ...(SHOW_PHONE ? { telephone: PHONE_TEL } : {}),
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
    parentOrganization: { "@id": ORGANIZATION_ID },
  };
}

/**
 * The service itself, as one node — for /lens-neurofeedback.
 *
 * `Service` and not `MedicalTherapy`, `MedicalProcedure`, or any other type
 * under MedicalEntity, for exactly the reason organizationSchema() is not a
 * MedicalBusiness (SEO-AUDIT.md §2.5): the footer DISCLAIMER states this is a
 * wellness practice and that LENS is not intended to diagnose or treat
 * anything. A medical type in the markup would contradict the page it sits on,
 * and rule 1 at the top of this file is that schema never asserts more than the
 * page does. That rule costs a richer type here, and it is worth it.
 *
 * `provider` is an @id reference to the one Organization, per rule 2 — the
 * name, url and logo are not restated.
 *
 * `areaServed` lists only centers that are actually open, the same set §9 of
 * the page renders as location cards. Franklin is absent from both for the
 * reason localBusinessSchema() is never called for it: a center that has not
 * opened does not serve an area yet.
 *
 * No `offers` node. The page publishes real figures and could mirror them, but
 * the package price carries PACKAGE_NOTE — the Brain Map is required first and
 * does not count toward the twelve — and an Offer with the price and not the
 * condition is the one way this file's rule gets broken quietly.
 */
export function serviceSchema({
  name,
  description,
  path,
}: {
  name: string;
  description: string;
  path: string;
}) {
  const url = abs(path);
  const openCenters = locations.filter((l) => !l.comingSoon);
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": `${url}#service`,
    name,
    serviceType: "LENS neurofeedback",
    description,
    url,
    provider: { "@id": ORGANIZATION_ID },
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
 * FAQPage from the same Q&A data the <details> accordion renders.
 *
 * Answers must be plain strings — see the `a`/`rendered` split on FaqItem in
 * components/FAQAccordion.tsx. Google shows FAQ rich results almost only for
 * government and authoritative health sites now (SEO-AUDIT.md §2.2), so this
 * is for entity comprehension, not a SERP treatment to expect.
 */
export function faqPageSchema(faqs: ReadonlyArray<{ q: string; a: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

/** One rung of a breadcrumb trail. `href` is omitted for the current page. */
export type Crumb = { label: string; href?: string };

/**
 * BreadcrumbList mirroring the visible crumb. Built by components/Breadcrumbs
 * from the same array that renders the links, so the two can't disagree —
 * which is the thing Google checks for.
 */
export function breadcrumbSchema(trail: ReadonlyArray<Crumb>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.label,
      ...(c.href ? { item: abs(c.href) } : {}),
    })),
  };
}
