/**
 * Where a giveaway entrant came from (fix list rev 2, P1-6): first-touch
 * UTM tags, cleaned, plus one normalized channel the stats endpoint counts
 * by. Pure and client-safe (no imports): the /10years page uses it to fire
 * the GA4 event, the signup route uses it to store the row.
 *
 * Convention (utm_campaign=hbc10y; utm_content = the asset id):
 *   email/warm-list → email        email/provider → provider
 *   partner-<slug>/partner → partner
 *   gbp-nashville|gbp-murfreesboro / gbp → gbp
 *   facebook/paid|organic → facebook     instagram/organic → instagram
 *   signage-nashville|signage-murfreesboro / qr → signage
 *   site/banner → site_banner (the site-wide banner, P0-7)
 *   no tags but ?ref= → referral    nothing at all → direct
 *   anything else → other
 */

export const CHANNELS = ["email", "provider", "partner", "gbp", "facebook", "instagram", "signage", "site_banner", "referral", "direct", "other"] as const;
export type Channel = (typeof CHANNELS)[number];

export const UTM_FIELDS = ["utm_source", "utm_medium", "utm_campaign", "utm_content"] as const;
export type UtmField = (typeof UTM_FIELDS)[number];

export type Attribution = Record<UtmField, string | null> & { channel: Channel };

/** sessionStorage key for the first touch on /10years. */
export const UTM_STORAGE_KEY = "hbc10y.utm";

/** Lowercase, allow-listed characters only, at most 64 — or null. */
export function cleanUtm(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 64);
  return v || null;
}

export function channelFor(source: string | null, medium: string | null, ref: string | null): Channel {
  const s = source ?? "";
  const m = medium ?? "";
  if (!s && !m) return ref ? "referral" : "direct";
  if (s === "email") return m === "provider" ? "provider" : "email";
  if (s.startsWith("partner-") || m === "partner") return "partner";
  if (s.startsWith("gbp") || m === "gbp") return "gbp";
  if (s === "facebook" || s === "fb") return "facebook";
  if (s === "instagram" || s === "ig") return "instagram";
  if (s.startsWith("signage") || m === "qr") return "signage";
  if (s === "site" && m === "banner") return "site_banner";
  return "other";
}

/** The stored attribution from raw fields (form posts, query strings). */
export function attributionFrom(raw: Partial<Record<UtmField | "ref", unknown>>): Attribution {
  const utm = Object.fromEntries(UTM_FIELDS.map((f) => [f, cleanUtm(raw[f])])) as Record<UtmField, string | null>;
  const ref = typeof raw.ref === "string" && raw.ref.trim() ? raw.ref.trim() : null;
  return { ...utm, channel: channelFor(utm.utm_source, utm.utm_medium, ref) };
}
