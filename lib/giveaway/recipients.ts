/**
 * Two questions every giveaway send asks about its recipient (Ben,
 * 2026-11-18), import-free so the send runner and its tests can use them:
 *
 *   isTestAddress  — an address on a test domain (example.com, .org, .net,
 *                    test.com, or a subdomain of one). Never sent to: Resend
 *                    refuses them with a 422, which used to log a failure,
 *                    fire the hourly alert and repeat every day.
 *   isBadAddress   — Resend's 422 validation_error: this one address is
 *                    wrong. Final for that recipient, never retried, never
 *                    counted against the provider, no alert email (logged
 *                    once where it happened).
 *
 * check:giveaway and the unit tests send to @example.test on purpose (a
 * mock Resend takes them), so .test is NOT on the list.
 */

export const TEST_DOMAINS = ["example.com", "example.org", "example.net", "test.com"] as const;

export const TEST_ADDRESS_SKIP = "test address (not sent)";

export function isTestAddress(email: string | null | undefined): boolean {
  const domain = (email ?? "").trim().toLowerCase().split("@").pop() ?? "";
  if (!domain || !(email ?? "").includes("@")) return false;
  return TEST_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`));
}

export function isBadAddress(error: string | null | undefined): boolean {
  return /^Resend 422 validation_error\b/.test(error ?? "");
}
