/**
 * The contact form's fixed answers and its two reachability checks, shared by
 * the form (components/ContactForm.tsx), the two consultation routes and the
 * tests. No imports, on purpose: the form is a client component, and the
 * tests load this under plain `node`.
 *
 * The short step one (Ben, 2026-10-26): leads fell ~75% after launch, and
 * about three in four of the old site's leads were referrals who typed who
 * sent them. Step one is now first name, a phone OR an email, the center, and
 * two optional lines; everything else is an optional step two.
 */

/** "Best time" — a step-two answer. Nothing preselected. */
export const TIME_OPTIONS = ["Any time", "Mornings", "Afternoons", "Evenings"] as const;

/** "How did you hear about us?" — a step-two answer, saved to heard_about
 *  (migration 0012, which holds the column to this list). */
export const HEARD_ABOUT_OPTIONS = [
  "Google search",
  "Referral from a friend or family",
  "Referral from a doctor or provider",
  "Instagram",
  "Facebook",
  "TikTok",
  "Other",
] as const;
export type HeardAbout = (typeof HEARD_ABOUT_OPTIONS)[number];

export function isHeardAbout(value: unknown): value is HeardAbout {
  return typeof value === "string" && (HEARD_ABOUT_OPTIONS as readonly string[]).includes(value);
}

/** Either referral answer — the form then asks "Who referred you?" if step
 *  one's referral line was left blank. */
export function isReferral(value: unknown): boolean {
  return typeof value === "string" && value.startsWith("Referral");
}

/**
 * A US phone number typed any common way: "(615) 555-0134", "615.555.0134",
 * "615 555 0134", "6155550134", "1-615-555-0134", "+1 615 555 0134", with or
 * without an extension ("x12", "ext. 12"). Ten digits, or eleven with a
 * leading 1, before any extension. Deliberately forgiving: a form that
 * refuses a real number loses the lead.
 */
export function looksLikeUsPhone(value: string): boolean {
  const main = value.split(/\s*(?:x|ext\.?|extension|#)\s*\d*\s*$/i)[0];
  if (/[^\d\s().+\-]/.test(main)) return false;
  const digits = main.replace(/\D/g, "");
  return digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
}

/** Deliberately loose — a sanity check, not RFC 5322. The address is proven by
 *  delivery, not by a regex, and over-strict patterns reject valid addresses. */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
