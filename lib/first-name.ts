/**
 * "Ben Muir" → "Ben". The contact form asks for first and last in one field
 * (Ben, 2026-10-13) and the row, the lead email and the platform all carry
 * the full string; only a greeting — the step-two headline, the step-three
 * thank-you, the confirmation text — uses the first word, so "Hi Ben," never
 * reads "Hi Ben Muir,". Shared by the client form and the server SMS module,
 * so it imports nothing.
 */
export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? "";
}
