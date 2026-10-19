/**
 * "Best way to reach you" on the contact form's first step (Ben,
 * 2026-10-19): Call, Text or Email. Stored lowercase in `contact_method`
 * (migration 0011) and shown to the office by its label. The form requires
 * an answer; the chat does not ask, so the route accepts the key as optional
 * and rejects anything outside this list.
 *
 * Its own file, with no imports: lib/inquiry-intake.ts and lib/email/* are
 * dependency-free on purpose (their tests load them under plain `node`), and
 * lib/consultation.ts pulls in the Supabase client.
 */
export const CONTACT_METHODS = ["call", "text", "email"] as const;
export type ContactMethod = (typeof CONTACT_METHODS)[number];
export const CONTACT_METHOD_LABELS: Record<ContactMethod, string> = {
  call: "Call",
  text: "Text",
  email: "Email",
};

/** True for one of the three stored values. */
export function isContactMethod(value: unknown): value is ContactMethod {
  return typeof value === "string" && (CONTACT_METHODS as readonly string[]).includes(value);
}

/** The stored value → its label, or null for anything that is not one. */
export function contactMethodLabel(value: unknown): string | null {
  return isContactMethod(value) ? CONTACT_METHOD_LABELS[value] : null;
}
