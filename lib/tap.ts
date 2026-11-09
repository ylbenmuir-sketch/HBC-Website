/**
 * The tap log (Ben, 2026-11-09): every tap on a tel: or sms: link on the site
 * is also posted to POST /api/track/tap, so a tap can later be matched to the
 * Dialpad call or text that followed it (lib/tap-match.ts) and counted beside
 * the phone stats. GA's own contact_link_click stays; this is the half GA
 * cannot do — the server adds the time and keeps the row.
 *
 * What a tap row is, and is not. Four fixed-list fields and a path:
 * link_type (phone | text), location (the nearest data-link-location — the
 * same lists as contact_link_click), center (whose line the href dials:
 * nashville, murfreesboro, other), page_path (no query string). The server
 * adds `ts` and a device class, mobile or desktop, read from the request and
 * then dropped. **No IP address, no user or session id, no user agent, no
 * number** is stored — the number is read here only to say which center's
 * line it is, and never leaves the browser. Bots (by user agent) and /admin
 * are refused before the insert. Nothing is backfilled: the log starts at
 * TAP_LOGGING_START.
 *
 * The beacon never delays the tap: navigator.sendBeacon queues the post and
 * the browser follows the link at once; a failure is silent. Client-safe —
 * imported by components/Analytics.tsx — and shared with the route, which
 * validates with the same lists.
 */

import { LINK_LOCATIONS, cleanPath, type LinkLocation } from "./analytics";
import { locationPhone, locations } from "./locations";

/** The first day taps were recorded — the deploy that added this file. */
export const TAP_LOGGING_START = "2026-11-09";

export const TAP_ENDPOINT = "/api/track/tap";
export const TAP_LINK_TYPES = ["phone", "text"] as const;
export type TapLinkType = (typeof TAP_LINK_TYPES)[number];
export const TAP_CENTERS = ["nashville", "murfreesboro", "other"] as const;
export type TapCenter = (typeof TAP_CENTERS)[number];
export const TAP_DEVICES = ["mobile", "desktop"] as const;
export type TapDevice = (typeof TAP_DEVICES)[number];
/** The window the matcher looks in after a tap (lib/tap-match.ts). */
export const TAP_MATCH_WINDOW_MS = 3 * 60_000;

export type TapPayload = {
  link_type: TapLinkType;
  location: LinkLocation;
  center: TapCenter;
  page_path: string;
};

/** Last ten digits — +16153318762, (615) 331-8762 and 6153318762 agree. */
function tenDigits(v: string): string {
  return v.replace(/\D/g, "").slice(-10);
}

/** Each open center's own line, ten digits, from lib/locations.ts. */
const CENTER_BY_LINE: ReadonlyMap<string, TapCenter> = new Map(
  locations
    .filter((l): l is typeof l & { slug: "nashville" | "murfreesboro" } => l.slug === "nashville" || l.slug === "murfreesboro")
    .flatMap((l) => {
      const phone = locationPhone(l);
      return phone ? [[tenDigits(phone.tel), l.slug] as const] : [];
    }),
);

/** Whose line an href dials: the center, or "other" for anything else. */
export function tapCenter(href: string): TapCenter {
  const digits = tenDigits(href.replace(/^\s*(tel|sms):/i, "").split(/[?&;]/)[0] ?? "");
  return CENTER_BY_LINE.get(digits) ?? "other";
}

/**
 * The payload for one tap, or null when the link is not a phone or text
 * link. Only the scheme and the center are read from the href.
 */
export function tapPayload(href: unknown, location: unknown, pagePath: unknown): TapPayload | null {
  if (typeof href !== "string") return null;
  const scheme = href.trim().toLowerCase();
  const linkType: TapLinkType | null = scheme.startsWith("tel:") ? "phone" : scheme.startsWith("sms:") ? "text" : null;
  if (!linkType) return null;
  return {
    link_type: linkType,
    location: (LINK_LOCATIONS as readonly unknown[]).includes(location) ? (location as LinkLocation) : "other",
    center: tapCenter(href),
    page_path: cleanPath(pagePath) || "/",
  };
}

/** The route's side: a body is a tap only if every field is on its list. */
export function parseTapBody(raw: unknown): TapPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const b = raw as Record<string, unknown>;
  if (!(TAP_LINK_TYPES as readonly unknown[]).includes(b.link_type)) return null;
  if (!(LINK_LOCATIONS as readonly unknown[]).includes(b.location)) return null;
  if (!(TAP_CENTERS as readonly unknown[]).includes(b.center)) return null;
  const path = cleanPath(b.page_path);
  if (!path || !path.startsWith("/")) return null;
  return {
    link_type: b.link_type as TapLinkType,
    location: b.location as LinkLocation,
    center: b.center as TapCenter,
    page_path: path,
  };
}

/** Routes whose taps are not logged: the staff screens. Prefixes. */
export const TAP_IGNORED_PATHS = ["/admin"] as const;

export function tapIgnoredPath(path: string): boolean {
  return TAP_IGNORED_PATHS.some((p) => path === p || path.startsWith(`${p}/`));
}

/** Crawlers, link checkers, previewers and headless runs — not visitors. */
const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|whatsapp|telegram|curl|wget|python-requests|httpclient|monitor|pingdom|uptime/i;

export function isBotUserAgent(ua: unknown): boolean {
  if (typeof ua !== "string" || ua.trim() === "") return true;
  return BOT_UA.test(ua);
}

/** mobile or desktop, from the client hint when present, else the UA. The
 *  UA is read and dropped — only the class is kept. */
export function deviceClass(ua: unknown, chMobile: unknown): TapDevice {
  if (chMobile === "?1") return "mobile";
  if (chMobile === "?0") return "desktop";
  return typeof ua === "string" && /Mobi|Android|iPhone|iPad|iPod|Windows Phone/i.test(ua) ? "mobile" : "desktop";
}

/**
 * Whether this deployment records taps: the Production deployment, or a
 * local/preview server that says TAP_LOG=on (how it is tested). Previews
 * and the Production build's *.vercel.app alias both receive beacons from
 * the page; this is what keeps them out of the table.
 */
export function tapLoggingEnabled(env: Record<string, string | undefined> = process.env): boolean {
  const flag = env.TAP_LOG?.trim().toLowerCase();
  if (flag === "off") return false;
  if (flag === "on") return true;
  return env.VERCEL_ENV?.trim() === "production";
}

/** The hosts a tap is sent from: the site's own, and a local server. */
export function tapAllowedHost(hostname: unknown): boolean {
  if (typeof hostname !== "string") return false;
  const h = hostname.toLowerCase();
  return h === "harmonizedbraincenterstn.com" || h === "www.harmonizedbraincenterstn.com" || h === "localhost" || h === "127.0.0.1";
}

/**
 * Post one tap, without waiting. sendBeacon when the browser has it (it
 * survives the navigation the tap starts), fetch with keepalive otherwise.
 * Never throws.
 */
export function sendTap(payload: TapPayload): void {
  try {
    const body = JSON.stringify(payload);
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      if (navigator.sendBeacon(TAP_ENDPOINT, new Blob([body], { type: "application/json" }))) return;
    }
    void fetch(TAP_ENDPOINT, { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
  } catch {
    // A tap that is not logged is still a tap that went through.
  }
}
