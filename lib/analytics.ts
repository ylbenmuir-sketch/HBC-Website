/**
 * Measurement, inert until Ben supplies the IDs (SEO-AUDIT-3 A3 / P3).
 *
 * Nothing on the site measured anything: no GA4, no Search Console or Bing
 * verification, no conversion event on the one form that matters. This file
 * is the wiring; the three `NEXT_PUBLIC_*` variables are the switch. With
 * all three unset, no tag loads, no meta tag renders, and `trackEvent` is a
 * no-op — the page ships byte-for-byte as before.
 *
 * - `GA_ID` — a GA4 measurement ID (`G-XXXXXXXXXX`). When set, the gtag
 *   loader is rendered by components/Analytics.tsx and page views are sent
 *   on every client-side navigation as well as the first load — **in
 *   production only** (see ANALYTICS_ENABLED): never under `next dev`, and
 *   on Vercel never on a preview deployment, even with the variable set
 *   for every environment.
 * - `GOOGLE_SITE_VERIFICATION` / `BING_SITE_VERIFICATION` — the tokens from
 *   Search Console's and Bing Webmaster Tools' "HTML tag" method, rendered
 *   as `<meta name="google-site-verification">` and
 *   `<meta name="msvalidate.01">` by the root metadata. Either can be left
 *   unset; the other still renders. DNS verification works too and needs
 *   nothing here.
 *
 * `NEXT_PUBLIC_*` is inlined at build time, so production needs the values
 * set in the deploy environment *and* a rebuild — the same rule as the
 * feature flags (README → Environment variables).
 *
 * What is deliberately not sent: anything a visitor typed. The lead events
 * carry where the lead came from, which center and which page — never a
 * name, phone, email, or note (see SiteEvent below).
 */

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";
export const GOOGLE_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? "";
export const BING_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ?? "";

/**
 * A production build, and on Vercel the Production deployment. Previews are
 * production builds too (NODE_ENV says nothing about them), so the second
 * half reads VERCEL_ENV, inlined as HBC_VERCEL_ENV by next.config.ts. Off
 * Vercel it is empty and the NODE_ENV half decides alone.
 */
const PRODUCTION_DEPLOY =
  process.env.NODE_ENV === "production" &&
  ["", "production"].includes(process.env.HBC_VERCEL_ENV ?? "");

/** True when the GA4 tag is configured and may load — production only. */
export const ANALYTICS_ENABLED = GA_ID.length > 0 && PRODUCTION_DEPLOY;

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    gtag?: Gtag;
    dataLayer?: unknown[];
  }
}

/**
 * The events the site reports. The lead and link names are the old WordPress
 * site's own (Ben, 2026-10-18), so the GA4 reports run on across the move
 * without a gap: `submit_lead_form` for a saved call request,
 * `contact_link_click` for a phone or email tap. `generate_lead` rides along
 * with every `submit_lead_form` as GA's recommended lead event.
 *
 * Every parameter is a fixed value or a path — nothing here can carry what a
 * visitor typed. The builders below pick named fields rather than spreading
 * their input, and map free strings onto fixed lists, so an extra field or an
 * unexpected value never reaches GA. lib/analytics.test.mjs holds them to it.
 */
export const LEAD_CENTERS = ["Nashville", "Murfreesboro", "Concierge", "Not sure"] as const;
export type LeadCenter = (typeof LEAD_CENTERS)[number];
export type LeadSource = "form" | "chat";

export const LINK_LOCATIONS = [
  "header",
  "footer",
  "hero",
  "location page",
  "confirmation",
  "contact options",
  "other",
] as const;

/**
 * The homepage hero's "What brings you in?" chips (Ben, 2026-10-19). The
 * label reported is one of these, never the href or anything typed —
 * `concernChipEvent` maps anything else onto "other". Not a Key event.
 */
export const CONCERN_CHIPS = [
  "Anxiety",
  "Stress",
  "Depression",
  "Focus & ADHD",
  "Sleep",
  "Concussion",
  "Brain fog",
  "Migraines",
] as const;
export type ConcernChip = (typeof CONCERN_CHIPS)[number];
export type LinkLocation = (typeof LINK_LOCATIONS)[number];

type LeadParams = { lead_source: LeadSource; center: LeadCenter; page_path: string };

export type SiteEvent =
  | { name: "submit_lead_form"; params: LeadParams }
  | { name: "generate_lead"; params: LeadParams }
  | {
      name: "contact_link_click";
      params: { link_type: "phone" | "email" | "sms"; location: LinkLocation; page_path: string };
    }
  | { name: "concern_chip_click"; params: { chip_label: ConcernChip | "other"; page_path: string } }
  | { name: "guide_download"; params: { page_path: string } }
  | { name: "page_view"; params: { page_path: string } };

/**
 * The path alone: no query string, no fragment. A path on this site never
 * holds anything personal; a query string could (a mail client's tracking
 * parameters, someone's pasted link).
 */
export function cleanPath(path: unknown): string {
  if (typeof path !== "string") return "";
  return path.split(/[?#]/)[0].slice(0, 200);
}

/**
 * Either form's center answer → one of the four reported values. The form
 * says "Not sure yet" and "Concierge / at home"; the chat already uses the
 * short labels. Anything unrecognised reports as "Not sure" rather than
 * passing an unknown string through.
 */
export function leadCenter(value: unknown): LeadCenter {
  const v = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (v.startsWith("nashville")) return "Nashville";
  if (v.startsWith("murfreesboro")) return "Murfreesboro";
  if (v.startsWith("concierge")) return "Concierge";
  return "Not sure";
}

/**
 * /api/consultation's own "saved": a 2xx whose body says `ok` with a row id.
 * The route answers 502 when the row did not save (save-first), so this is
 * the line between a lead that exists and one that does not. Used by the
 * contact form and the guide form alike.
 */
export function consultationSaved(ok: boolean, body: unknown): boolean {
  if (!ok || typeof body !== "object" || body === null) return false;
  const { ok: saved, id } = body as { ok?: unknown; id?: unknown };
  return saved === true && typeof id === "string" && id.length > 0;
}

/**
 * /api/chat's booking marker: present only on the turn whose in-process
 * consultation submit came back saved (app/api/chat/route.ts). Returns the
 * center to report, or null for every other reply.
 */
export function chatBookingSaved(ok: boolean, body: unknown): LeadCenter | null {
  if (!ok || typeof body !== "object" || body === null) return null;
  const lead = (body as { lead?: unknown }).lead;
  if (typeof lead !== "object" || lead === null) return null;
  if ((lead as { saved?: unknown }).saved !== true) return null;
  return leadCenter((lead as { center?: unknown }).center);
}

/** The two events a saved call request sends, same parameters on each. */
export function leadEvents(lead: {
  source: LeadSource;
  center: unknown;
  pagePath: unknown;
}): SiteEvent[] {
  const params: LeadParams = {
    lead_source: lead.source === "chat" ? "chat" : "form",
    center: leadCenter(lead.center),
    page_path: cleanPath(lead.pagePath),
  };
  return [
    { name: "submit_lead_form", params },
    { name: "generate_lead", params: { ...params } },
  ];
}

/**
 * The click event for a link, or null when it is not a `tel:`, `mailto:` or
 * `sms:` (the /contact "Text us" option, Ben 2026-10-19). Only the scheme is
 * read from the href — the number or address never leaves this function.
 * `location` comes from the nearest `data-link-location`
 * (components/Analytics.tsx); anything not on the list reports as "other".
 */
export function contactLinkEvent(
  href: unknown,
  location: unknown,
  pagePath: unknown
): SiteEvent | null {
  if (typeof href !== "string") return null;
  const scheme = href.trim().toLowerCase();
  const linkType = scheme.startsWith("tel:")
    ? "phone"
    : scheme.startsWith("mailto:")
      ? "email"
      : scheme.startsWith("sms:")
        ? "sms"
        : null;
  if (!linkType) return null;
  return {
    name: "contact_link_click",
    params: {
      link_type: linkType,
      location: (LINK_LOCATIONS as readonly unknown[]).includes(location)
        ? (location as LinkLocation)
        : "other",
      page_path: cleanPath(pagePath),
    },
  };
}

/** A saved call request — form step one or a chat booking. */
export function trackLeadSaved(lead: {
  source: LeadSource;
  center: unknown;
  pagePath: unknown;
}): void {
  for (const event of leadEvents(lead)) trackEvent(event);
}

/** A hero concern chip tap: the fixed label and the page, nothing else. */
export function concernChipEvent(label: unknown, pagePath: unknown): SiteEvent {
  return {
    name: "concern_chip_click",
    params: {
      chip_label: (CONCERN_CHIPS as readonly unknown[]).includes(label)
        ? (label as ConcernChip)
        : "other",
      page_path: cleanPath(pagePath),
    },
  };
}

/** A saved guide sign-up. The page only — never the address. */
export function trackGuideDownload(pagePath: unknown): void {
  trackEvent({ name: "guide_download", params: { page_path: cleanPath(pagePath) } });
}

/**
 * Send an event to GA4 if the tag is loaded. Safe to call anywhere on the
 * client: a missing tag, a blocked script, or the server all make it a
 * no-op rather than a throw — nothing about a form submission may fail
 * because measurement did.
 */
export function trackEvent(event: SiteEvent): void {
  if (!ANALYTICS_ENABLED) return;
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }
  try {
    window.gtag("event", event.name, event.params);
  } catch {
    // Measurement never surfaces as an error to a visitor.
  }
}
