/**
 * Where a visitor came from, for the lead record (Ben, 2026-11-09: the
 * Instagram bio link lands on /start with utm tags, and the lead row has to
 * keep them). Pure and client-safe — no imports — so the form, the capture
 * component and the route all read one definition, and the tests load it
 * under plain `node`.
 *
 * Two facts, both about the LINK and never about the person:
 *
 *   utm_*        the four tags on the URL, cleaned the way the giveaway
 *                cleans them (lowercase, [a-z0-9._-], at most 64 chars).
 *   lead_source  one fixed word for where the visit started. "instagram"
 *                when utm_source says so OR the referrer is instagram.com
 *                (the app opens links with no utm at all). Nothing else is
 *                derived today; anything that is not "instagram" is null,
 *                not a free string.
 *
 * First touch wins. The tags are read on the first page of the visit and
 * kept in sessionStorage (one tab, one visit, gone when the tab closes), so a
 * visitor who lands on /start and then taps through to /contact still saves
 * as an Instagram lead. A later page with its own tags does not overwrite
 * them. sessionStorage, not localStorage: attribution is a fact about this
 * visit, and the Privacy notice promises nothing that outlives the tab.
 */

export const UTM_FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;
export type UtmField = (typeof UTM_FIELDS)[number];

export const LEAD_SOURCES = ["instagram"] as const;
export type LeadSourceTag = (typeof LEAD_SOURCES)[number];

export type Attribution = Record<UtmField, string | null> & { lead_source: LeadSourceTag | null };

/** sessionStorage key for the visit's first touch. */
export const ATTRIBUTION_KEY = "hbc.attribution";

/** Lowercase, allow-listed characters only, at most 64 — or null. */
export function cleanUtm(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 64);
  return v || null;
}

/** instagram.com, l.instagram.com, www.instagram.com — the app's link hosts. */
export function isInstagramReferrer(referrer: unknown): boolean {
  if (typeof referrer !== "string" || !referrer) return false;
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    return host === "instagram.com" || host.endsWith(".instagram.com");
  } catch {
    return false;
  }
}

export function leadSourceFor(utmSource: string | null, referrer: unknown): LeadSourceTag | null {
  if (utmSource === "instagram" || utmSource === "ig") return "instagram";
  if (isInstagramReferrer(referrer)) return "instagram";
  return null;
}

export function isLeadSource(value: unknown): value is LeadSourceTag {
  return typeof value === "string" && (LEAD_SOURCES as readonly string[]).includes(value);
}

/** The attribution a URL and a referrer describe. All null when neither says anything. */
export function attributionFrom(search: string, referrer: unknown): Attribution {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const utm = Object.fromEntries(UTM_FIELDS.map((f) => [f, cleanUtm(params.get(f))])) as Record<UtmField, string | null>;
  return { ...utm, lead_source: leadSourceFor(utm.utm_source, referrer) };
}

export function hasAttribution(a: Attribution): boolean {
  return UTM_FIELDS.some((f) => a[f] !== null) || a.lead_source !== null;
}

/** The stored attribution, or null; anything malformed reads as nothing. */
export function parseStored(raw: unknown): Attribution | null {
  if (typeof raw !== "string" || !raw) return null;
  try {
    const v = JSON.parse(raw) as Record<string, unknown>;
    if (!v || typeof v !== "object") return null;
    const utm = Object.fromEntries(UTM_FIELDS.map((f) => [f, cleanUtm(v[f])])) as Record<UtmField, string | null>;
    return { ...utm, lead_source: isLeadSource(v.lead_source) ? v.lead_source : null };
  } catch {
    return null;
  }
}

type StorageLike = { getItem(key: string): string | null; setItem(key: string, value: string): void };

/**
 * Record the visit's first touch, once. Called on every page's mount
 * (components/UtmCapture.tsx); a visit that already has one keeps it. Never
 * throws — a private window with storage blocked simply records nothing.
 */
export function captureAttribution(search: string, referrer: unknown, storage: StorageLike | null): Attribution | null {
  const current = attributionFrom(search, referrer);
  try {
    const stored = parseStored(storage?.getItem(ATTRIBUTION_KEY) ?? null);
    if (stored && hasAttribution(stored)) return stored;
    if (hasAttribution(current)) {
      storage?.setItem(ATTRIBUTION_KEY, JSON.stringify(current));
      return current;
    }
    return null;
  } catch {
    return hasAttribution(current) ? current : null;
  }
}

/** What the form sends: the stored first touch, else this page's own tags. */
export function attributionForSubmit(search: string, referrer: unknown, storage: StorageLike | null): Partial<Attribution> {
  let a: Attribution | null = null;
  try {
    a = parseStored(storage?.getItem(ATTRIBUTION_KEY) ?? null);
  } catch {
    a = null;
  }
  if (!a || !hasAttribution(a)) a = attributionFrom(search, referrer);
  if (!hasAttribution(a)) return {};
  const out: Partial<Attribution> = {};
  for (const f of UTM_FIELDS) if (a[f]) out[f] = a[f];
  if (a.lead_source) out.lead_source = a.lead_source;
  return out;
}
