import { concerns } from "@/lib/concerns";
import { SITE_FAQS } from "@/lib/faq";
import {
  formattedAddress,
  formattedHours,
  locationPhone,
  locations,
} from "@/lib/locations";
import { staticPages } from "@/lib/pages";
import { liveResources } from "@/lib/resources";
import {
  BRAIN_MAP_NAME,
  BRAIN_MAP_PRICE,
  CONCIERGE_PRICE,
  CONCIERGE_SURCHARGE_USD,
  DISCLAIMER,
  ESTABLISHED_YEAR,
  FIRST_VISIT_DURATION,
  INSURANCE_POLICY,
  PACKAGE_NOTE,
  PACKAGE_PRICE,
  PACKAGE_SESSIONS,
  SESSION_LENGTH,
  SESSION_PRICE,
  SITE_NAME,
  SITE_URL,
  usd,
  verifiedOr,
} from "@/lib/site-config";

/**
 * /llms.txt — the llmstxt.org convention: an H1, a one-paragraph summary in
 * a blockquote, then sections of links with one-line descriptions, so an
 * answer engine fetching one URL gets the entity, the facts and the map of
 * the site (SEO-AUDIT-3 §5.1, A11).
 *
 * Generated from the same modules the site assistant's index imports —
 * lib/concerns.ts, lib/faq.ts, lib/locations.ts, lib/site-config.ts — plus
 * the page registry and the live articles, so it cannot say anything a page
 * does not. Verified facts only: the founding year interpolates through the
 * same gate the proof band uses, and nothing here is typed by hand that has
 * a home elsewhere. Static at build.
 */
export const dynamic = "force-static";

const line = (title: string, href: string, note: string) =>
  `- [${title}](${SITE_URL}${href === "/" ? "" : href}): ${note}`;

export function GET() {
  const founded = verifiedOr(ESTABLISHED_YEAR);
  const open = locations.filter((l) => !l.comingSoon);
  const pageByPath = (p: string) => staticPages.find((s) => s.path === p)!;

  const centers = open.map((l) => {
    const address = formattedAddress(l);
    const phone = locationPhone(l);
    const hours = formattedHours(l).join("; ");
    const facts = [address, phone?.display, hours].filter(Boolean).join(" · ");
    return line(`${l.name} center`, `/locations/${l.slug}`, facts);
  });

  const text = `# ${SITE_NAME}

> ${SITE_NAME} offers LENS (Low Energy Neurofeedback System) neurofeedback for adults, children and families at centers in ${open.map((l) => l.name).join(" and ")}, Tennessee${founded ? `, and has since ${founded}` : ""}.

${DISCLAIMER}

## Facts stated on the site

- The first visit is ${BRAIN_MAP_NAME}: ${FIRST_VISIT_DURATION}, ${BRAIN_MAP_PRICE}, a baseline recording of brain activity and a written plan.
- Regular sessions are ${SESSION_LENGTH.value} and ${SESSION_PRICE}; a ${PACKAGE_SESSIONS}-session package is ${PACKAGE_PRICE}. ${PACKAGE_NOTE}
- ${INSURANCE_POLICY}
- Concierge visits (the founder comes to your home or business): center rates plus ${usd(CONCIERGE_SURCHARGE_USD)} per person, per session — ${usd(CONCIERGE_PRICE.value.firstVisitUsd)} for the first visit, ${usd(CONCIERGE_PRICE.value.sessionUsd)} per session after. No minimum.
- The first phone call is free and no referral is needed.

## Centers

${centers.join("\n")}
${line("Franklin, TN", "/locations/franklin", "Coming soon — waitlist only.")}
${line(pageByPath("/concierge").title, "/concierge", pageByPath("/concierge").description)}

## What LENS is

${[
  pageByPath("/lens-neurofeedback"),
  pageByPath("/how-lens-works"),
  pageByPath("/brain-map"),
  pageByPath("/first-visit"),
  pageByPath("/is-lens-safe"),
  pageByPath("/faq"),
]
  .map((p) => line(p.title, p.path, p.description))
  .join("\n")}

## Concerns people come in with

${concerns
  .map((c) => line(c.metaTitle, `/concerns/${c.slug}`, c.metaDescription))
  .join("\n")}
${line(pageByPath("/adults").title, "/adults", pageByPath("/adults").description)}
${line(pageByPath("/children-families").title, "/children-families", pageByPath("/children-families").description)}

## Articles

${liveResources()
  .map((r) => line(r.metaTitle, `/resources/${r.slug}`, r.metaDescription))
  .join("\n")}

## About

${["/about", "/about/founder", "/about/team", "/stories", "/contact", "/privacy-policy"]
  .map((p) => pageByPath(p))
  .map((p) => line(p.title, p.path, p.description))
  .join("\n")}

## Frequently asked questions

${SITE_FAQS.map((f) => `- **${f.q}** ${f.a}`).join("\n")}

## Optional

- [Sitemap](${SITE_URL}/sitemap.xml): every indexable URL with its content date.
- [Articles feed](${SITE_URL}/resources/feed.xml): RSS of the resources library.
`;

  return new Response(text, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
