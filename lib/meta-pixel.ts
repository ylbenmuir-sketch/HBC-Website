/**
 * The browser half of the Meta Pixel (Ben, 2026-11-09): when it may run, and
 * the two events the site fires besides PageView. Rules in lib/meta.ts.
 *
 * Same production gate as GA (lib/analytics.ts): a production build on the
 * Production deployment, in the browser on harmonizedbraincenterstn.com or
 * www — never `next dev`, a preview, or the *.vercel.app alias. On top of
 * that, the pixel itself only on general pages (metaAllowedPath).
 *
 * Events carry no parameters at all: `fbq('track', 'Lead', {}, { eventID })`.
 * The same eventID reaches Meta from the server (lib/meta-capi.ts), which is
 * how the two copies are counted once.
 */

import { PRODUCTION_DEPLOY, analyticsAllowedHost } from "./analytics";
import { ATTRIBUTION_KEY, parseStored } from "./attribution";
import { META_PIXEL_ID, metaAllowedPath, metaBlockedPath, newMetaEventId } from "./meta";

type Fbq = ((...args: unknown[]) => void) & { disablePushState?: boolean };

declare global {
  interface Window {
    fbq?: Fbq;
  }
}

/** Set and a production build — decided at build time. */
export const META_PIXEL_ENABLED = META_PIXEL_ID.length > 0 && PRODUCTION_DEPLOY;

/** On the site's own domain, in a browser. */
function onSiteHost(): boolean {
  return META_PIXEL_ENABLED && typeof window !== "undefined" && analyticsAllowedHost(window.location.hostname);
}

/** The pixel may run (and fire events) on this path. */
export function metaPixelActive(path: string): boolean {
  return onSiteHost() && metaAllowedPath(path);
}

function fbqTrack(event: "Lead" | "Contact", eventId: string): void {
  if (!metaPixelActive(window.location.pathname) || typeof window.fbq !== "function") return;
  try {
    window.fbq("track", event, {}, { eventID: eventId });
  } catch {
    // Measurement never surfaces as an error to a visitor.
  }
}

/** A saved lead: the browser Lead, with the id the server copy was (or will be) sent with. */
export function trackMetaLead(eventId: unknown): void {
  if (typeof eventId === "string" && eventId) fbqTrack("Lead", eventId);
}

/** The visit's landing fbclid and time, for the server's fbc fallback. */
export function metaClick(): { fbclid?: string; landed_at?: number } {
  try {
    const a = parseStored(window.sessionStorage.getItem(ATTRIBUTION_KEY));
    return {
      ...(a?.fbclid ? { fbclid: a.fbclid } : {}),
      ...(a?.landed_at ? { landed_at: a.landed_at } : {}),
    };
  } catch {
    return {};
  }
}

/**
 * A tel:/sms: tap: the browser Contact (general pages only) and the server
 * copy (any page but a blocked one — the server cuts the address down).
 * keepalive, so the post survives the phone app opening.
 */
export function reportMetaContact(): void {
  if (!onSiteHost()) return;
  const path = window.location.pathname;
  if (metaBlockedPath(path)) return;
  const eventId = newMetaEventId();
  fbqTrack("Contact", eventId);
  try {
    void fetch("/api/meta/capi", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event_id: eventId, page: path + window.location.search, ...metaClick() }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    // Never in the way of the tap.
  }
}
