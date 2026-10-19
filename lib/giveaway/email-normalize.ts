/**
 * One person, one address (GIVEAWAY-PLAN.md §3, §4): the normalized form
 * every giveaway table keys on. Lower-case; for Gmail and Googlemail, dots
 * in the local part and anything after "+" are dropped, because Google
 * delivers all of those to one inbox and they are the cheapest way to enter
 * twice. Other domains keep their local part as typed (lower-cased) — some
 * mail systems are case- or dot-sensitive, and folding there would merge
 * two real people. Pure.
 */

const GOOGLE_DOMAINS = new Set(["gmail.com", "googlemail.com"]);

/** Loose shape check — the same idea as lib/lead-routing.ts's ADDRESS. */
export const EMAIL_SHAPE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;

export function normalizeEmail(input: string): string | null {
  const trimmed = input.trim().toLowerCase();
  if (!EMAIL_SHAPE.test(trimmed) || trimmed.length > 254) return null;
  const at = trimmed.lastIndexOf("@");
  let local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (GOOGLE_DOMAINS.has(domain)) {
    local = local.split("+")[0]!.replace(/\./g, "");
    if (!local) return null;
    return `${local}@gmail.com`;
  }
  return `${local}@${domain}`;
}

/** The domain part of a normalized address. */
export function emailDomain(normalized: string): string {
  return normalized.slice(normalized.lastIndexOf("@") + 1);
}
