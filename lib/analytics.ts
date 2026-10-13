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
 *   on every client-side navigation as well as the first load.
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
 * What is deliberately not sent: anything a visitor typed. The conversion
 * event carries which form, which page, and the coarse choices (who the
 * visitor is helping, which center) — never a name, phone, email, or note.
 */

export const GA_ID = process.env.NEXT_PUBLIC_GA_ID ?? "";
export const GOOGLE_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? "";
export const BING_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ?? "";

/** True when the GA4 tag is configured and may load. */
export const ANALYTICS_ENABLED = GA_ID.length > 0;

type Gtag = (...args: unknown[]) => void;

declare global {
  interface Window {
    gtag?: Gtag;
    dataLayer?: unknown[];
  }
}

/**
 * The conversion events the site reports, named after GA4's recommended
 * events so they can be marked as key events in the property without a
 * custom definition: `generate_lead` for a consultation request,
 * `sign_up` for the guide.
 */
export type SiteEvent =
  | {
      name: "generate_lead";
      params: {
        form: "consultation";
        source_page: string;
        /** Collected in the form's optional second step, so absent on the
         *  event — which fires when the callback is saved, not after. */
        helping_who?: string;
        preferred_center: string;
      };
    }
  | {
      name: "sign_up";
      params: { form: "guide"; method: "guide"; source_page: string };
    }
  | { name: "page_view"; params: { page_path: string } };

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
