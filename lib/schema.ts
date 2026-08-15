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
  communitiesServed,
  hasConfirmedAddress,
  locationPhotos,
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
 * `sameAs` is absent on purpose: there are no Google Business Profiles or
 * social profiles yet. Add it here (one array, one place) when they exist.
 */
export function organizationSchema() {
  const foundingYear = verifiedOr(ESTABLISHED_YEAR);
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
    // First name only until the surname verifies (FOUNDER_LAST_NAME), which is
    // what FOUNDER_DISPLAY_NAME already resolves to.
    founder: {
      "@type": "Person",
      name: FOUNDER_DISPLAY_NAME,
      jobTitle: "Founder & Clinical Director",
    },
  };
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
 *  - `parentOrganization` — an @id reference to the sitewide Organization,
 *    not a copy of it.
 *
 * `openingHoursSpecification` is deliberately absent: hours are still an open
 * item in CONTENT-CHECKLIST.md and land in a follow-up. Street address and
 * ZIP stay behind hasConfirmedAddress() exactly as the UI does.
 */
export function localBusinessSchema(location: Location) {
  const photos = locationPhotos(location).map(abs);
  const areaServed = communitiesServed(location);
  const url = abs(`/locations/${location.slug}`);
  const addressConfirmed = hasConfirmedAddress(location);
  const map = mapsUrl(location);
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
