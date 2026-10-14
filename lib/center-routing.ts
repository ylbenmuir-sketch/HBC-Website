// Center → per-center setting: which Dialpad line the confirmation text comes
// from. (Which inbox the lead EMAIL goes to is lib/lead-routing.ts, by its
// own rules — Concierge, guide and more-info leads route differently there.)
//
// Matched by substring, case-insensitive, so "Murfreesboro" from the form's
// select, the chat's canonical "Murfreesboro", and a visitor who typed "the
// boro, Murfreesboro" all resolve the same way. Anything that matches nothing —
// "Not sure yet", "Concierge / at home", null — resolves to the default
// setting. FRANKLIN stays a key for the day the center opens; nothing offers
// it today (the form's waitlist option and the chat's alias went, Oct 2026),
// so it only fires on a center someone typed into the chat verbatim.

export type CenterKey = "NASHVILLE" | "MURFREESBORO" | "FRANKLIN";

const CENTER_ROUTES: Array<{ key: CenterKey; pattern: RegExp; label: string }> = [
  { key: "NASHVILLE", pattern: /nashville/i, label: "Nashville" },
  { key: "MURFREESBORO", pattern: /murfreesboro/i, label: "Murfreesboro" },
  { key: "FRANKLIN", pattern: /franklin/i, label: "Franklin" },
];

/** The center a `preferred_center` value names, or null for none/unsure. */
export function centerKey(center: string | null | undefined): CenterKey | null {
  if (!center) return null;
  for (const { key, pattern } of CENTER_ROUTES) {
    if (pattern.test(center)) return key;
  }
  return null;
}

/** "Nashville" / "Murfreesboro" / "Franklin" — for copy, never for routing. */
export function centerLabel(center: string | null | undefined): string | null {
  const key = centerKey(center);
  return key ? CENTER_ROUTES.find((r) => r.key === key)!.label : null;
}

/**
 * `${prefix}_${CENTER}` when the center is known and that variable is set,
 * else `${prefix}`. So with prefix "DIALPAD_SMS_FROM" and a Murfreesboro
 * lead, DIALPAD_SMS_FROM_MURFREESBORO wins if present, DIALPAD_SMS_FROM
 * otherwise. Returns the raw string; callers parse it.
 */
export function settingForCenter(
  prefix: string,
  center: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env
): string | undefined {
  const key = centerKey(center);
  if (key) {
    const specific = env[`${prefix}_${key}`]?.trim();
    if (specific) return specific;
  }
  const fallback = env[prefix]?.trim();
  return fallback || undefined;
}
