/**
 * Meta Pixel + Conversions API: the rules both halves share (Ben, 2026-11-09).
 * Import-free, so the browser component, the server sender and the tests all
 * read one definition.
 *
 * A health business: Meta never learns what someone has or looked up.
 *
 *   - The browser pixel runs only on GENERAL pages (META_ALLOWED_PATHS): the
 *     homepage, contact, locations, about, how LENS works, the brain map,
 *     /start and the like. On a concern page, an article, a video, a story —
 *     anything that could name a condition — it sends nothing at all, not
 *     even a PageView, because the pixel reports the page address itself.
 *   - A Lead or Contact from one of those pages still reaches Meta from the
 *     server, with the address cut to the site's home page (metaSourceUrl).
 *   - META_BLOCKED_PATHS send nothing, browser or server: /review (texted to
 *     current clients), staff screens, the unsubscribe page, the founder draft.
 *   - No email, no phone, no name, no custom data — ever (lib/meta-capi.ts).
 *
 * Adding a page to the allow-list is a privacy decision: only a page that
 * says nothing about any one condition belongs on it.
 */

export const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID ?? "";

/** General pages: exact paths, and prefixes ending in "/" for their sub-pages. */
export const META_ALLOWED_PATHS = [
  "/",
  "/contact",
  "/contact/",
  "/start",
  "/locations",
  "/locations/",
  "/about",
  "/about/",
  "/faq",
  "/first-visit",
  "/how-lens-works",
  "/lens-neurofeedback",
  "/brain-map",
  "/is-lens-safe",
  "/concierge",
  "/10years",
  "/10years/",
  "/privacy-policy",
  "/sms-terms",
  // The two index pages only — never an article or a watch page.
  "/resources",
  "/videos",
] as const;

/** Nothing at all is sent from these, browser or server. Prefixes. */
export const META_BLOCKED_PATHS = ["/review", "/admin", "/unsubscribe", "/about/founder/draft"] as const;

/** The path alone, trailing slash dropped (except "/"). */
function normalPath(path: unknown): string | null {
  if (typeof path !== "string" || !path.startsWith("/")) return null;
  const p = path.split(/[?#]/)[0];
  return p.length > 1 ? p.replace(/\/+$/, "") || "/" : p;
}

export function metaBlockedPath(path: unknown): boolean {
  const p = normalPath(path);
  if (p === null) return true;
  return META_BLOCKED_PATHS.some((b) => p === b || p.startsWith(`${b}/`));
}

/** A general page the pixel may run on (and whose address the server may send). */
export function metaAllowedPath(path: unknown): boolean {
  const p = normalPath(path);
  if (p === null || metaBlockedPath(p)) return false;
  return META_ALLOWED_PATHS.some((a) => (a.endsWith("/") && a !== "/" ? p.startsWith(a) : p === a));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The browser/server dedup id: a UUID, nothing else. */
export function isMetaEventId(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}

/** A fresh event id. crypto.randomUUID exists in every browser the site supports. */
export function newMetaEventId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    // Old browsers: an RFC 4122 v4 shape from Math.random — dedup only, not security.
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
}
