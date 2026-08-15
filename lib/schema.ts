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
