// Center → per-center setting. Shared by the lead email (which inbox) and the
// confirmation text (which Dialpad line), so the two can never disagree about
// which center a lead belongs to.
//
// Matched by substring, case-insensitive, so the form's "Franklin waitlist",
// the chat's canonical "Franklin", and a visitor who typed "franklin tn" all
// resolve the same way. Anything that matches nothing — "Not sure yet",
// "Concierge / at home", null — resolves to the default setting.

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
 * else `${prefix}`. So with prefix "LEADS_NOTIFY_EMAIL" and a Murfreesboro
 * lead, LEADS_NOTIFY_EMAIL_MURFREESBORO wins if present, LEADS_NOTIFY_EMAIL
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
