/**
 * Who may open /admin/10years, and how they prove it (GIVEAWAY-PLAN.md §5;
 * Ben, 2026-10-18: "Supabase Auth email one-time code, allowlist table
 * seeded from an env var (no addresses in code)").
 *
 * ── THE ALLOWLIST ──────────────────────────────────────────────────────────
 * GIVEAWAY_ADMINS holds the staff addresses, comma-separated, the same
 * format as the LEADS_* variables ("ben@…, denise@…, kylie@…"). On every
 * sign-in attempt the list is read and upserted into
 * giveaway_admin_allowlist for this env, then the table is the truth: an
 * address that is not in it never gets a code, and a session for an address
 * that has since been removed from the variable is refused on the next
 * request. No address is written in code.
 *
 * ── THE CODE ───────────────────────────────────────────────────────────────
 * Supabase Auth's email OTP: signInWithOtp sends the six-digit code,
 * verifyOtp checks it. The project's Auth email template must print
 * `{{ .Token }}` (Dashboard → Authentication → Email Templates → Magic
 * Link), and, because the built-in mailer is rate-limited and may deliver
 * only to project members, custom SMTP (Resend's SMTP works) must be set
 * under Authentication → SMTP. Both are one-time dashboard steps for Ben.
 *
 * ── THE SESSION ────────────────────────────────────────────────────────────
 * After a good code the site issues ITS OWN session: a signed token
 * (lib/giveaway/tokens.ts, kind admin_session, 12 hours) in an httpOnly
 * cookie scoped to /admin. Supabase's JWT and refresh token are not kept, so
 * the admin's day does not depend on the project's JWT lifetime, and
 * signing out is deleting one cookie. Every request still re-checks the
 * allowlist table.
 *
 * ── AUDIT ──────────────────────────────────────────────────────────────────
 * Every attempt is written to giveaway_audit: admin_code_requested,
 * admin_code_denied (not on the list), admin_code_send_failed,
 * admin_signed_in, admin_code_rejected, admin_signed_out, admin_rate_limited.
 *
 * The Supabase auth client and the store are passed in, so the pieces test
 * without a network; the route handlers build the real ones.
 */

import { parseAddressList } from "../lead-routing";
import { audit } from "./audit";
import { normalizeEmail } from "./email-normalize";
import { LIMITS, rateLimit, supabaseCounter, type RateLimitCounter } from "./rate-limit";
import type { GiveawayStore } from "./store";
import { sha256Hex, signToken, verifyToken } from "./tokens";

export const ADMINS_ENV = "GIVEAWAY_ADMINS";
export const SESSION_COOKIE = "hbc_admin_session";
export const PENDING_COOKIE = "hbc_admin_pending";
export const SESSION_TTL_MS = 12 * 60 * 60_000;
export const PENDING_TTL_MS = 10 * 60_000;
export const ADMIN_PATH = "/admin/10years";

/** The staff addresses from the environment, normalized. Empty = not configured. */
export function adminEmailsFromEnv(env: Record<string, string | undefined> = process.env): string[] {
  const { addresses } = parseAddressList(env[ADMINS_ENV]);
  return addresses.map((a) => normalizeEmail(a)).filter((a): a is string => Boolean(a));
}

/**
 * Upsert the env var's addresses into the allowlist table, then read the
 * table back. Throws when the table cannot be read (migration 0010 not
 * applied, say) — the caller turns that into "not configured".
 */
export async function syncAllowlist(store: GiveawayStore, emails: string[]): Promise<Set<string>> {
  if (emails.length) {
    const { error } = await store.upsert(
      "giveaway_admin_allowlist",
      emails.map((email) => ({ email, added_by: "env" })),
      { onConflict: "env,email", ignoreDuplicates: true }
    );
    if (error) throw new Error(`allowlist not written: ${error.message}`);
  }
  const { data, error } = await store.select("giveaway_admin_allowlist", "email");
  if (error) throw new Error(`allowlist unreadable: ${error.message}`);
  return new Set(((data ?? []) as unknown as Array<{ email: string }>).map((r) => String(r.email).toLowerCase()));
}

/** The subset of the Supabase auth client this module uses. */
export interface OtpClient {
  signInWithOtp(email: string): Promise<{ error: { message: string } | null }>;
  verifyOtp(email: string, code: string): Promise<{ email: string | null; error: { message: string } | null }>;
}

export type RequestOutcome =
  | { ok: true }
  | { ok: false; reason: "invalid_email" | "not_configured" | "not_allowed" | "rate_limited" | "send_failed"; detail?: string };

export async function requestCode(
  deps: { store: GiveawayStore; otp: OtpClient; counter?: RateLimitCounter; env?: Record<string, string | undefined>; now?: Date; log?: Pick<Console, "error"> },
  input: { email: string; ip: string }
): Promise<RequestOutcome> {
  const log = deps.log ?? console;
  const email = normalizeEmail(input.email);
  if (!email) return { ok: false, reason: "invalid_email" };
  const ipHash = sha256Hex(input.ip, deps.env?.GIVEAWAY_TOKEN_SECRET ?? "");
  const counter = deps.counter ?? supabaseCounter(deps.store);

  const byIp = await rateLimit(counter, "admin_code_ip", input.ip, { now: deps.now, log });
  const byEmail = byIp.allowed ? await rateLimit(counter, "admin_code_email", email, { now: deps.now, log }) : byIp;
  if (!byIp.allowed || !byEmail.allowed) {
    // The counter itself failing (migration 0010 not applied, database down)
    // is a configuration problem, not a visitor hammering the form.
    const blocked = byIp.allowed ? byEmail : byIp;
    if (!blocked.allowed && blocked.reason === "error") return { ok: false, reason: "not_configured", detail: "rate_limits" };
    await audit(deps.store, { actor: email, action: "admin_rate_limited", ipHash });
    return { ok: false, reason: "rate_limited" };
  }

  const configured = adminEmailsFromEnv(deps.env ?? process.env);
  let allow: Set<string>;
  try {
    allow = await syncAllowlist(deps.store, configured);
  } catch (err) {
    log.error(`[giveaway admin] ${err instanceof Error ? err.message : "allowlist failed"}`);
    return { ok: false, reason: "not_configured", detail: "allowlist" };
  }
  if (allow.size === 0) {
    log.error(`[giveaway admin] ${ADMINS_ENV} is not set — nobody can sign in`);
    return { ok: false, reason: "not_configured", detail: ADMINS_ENV };
  }
  if (!allow.has(email)) {
    await audit(deps.store, { actor: email, action: "admin_code_denied", ipHash });
    return { ok: false, reason: "not_allowed" };
  }

  const { error } = await deps.otp.signInWithOtp(email);
  if (error) {
    await audit(deps.store, { actor: email, action: "admin_code_send_failed", reason: error.message.slice(0, 200), ipHash });
    log.error(`[giveaway admin] code not sent: ${error.message}`);
    return { ok: false, reason: "send_failed", detail: error.message };
  }
  await audit(deps.store, { actor: email, action: "admin_code_requested", ipHash });
  return { ok: true };
}

export type VerifyOutcome = { ok: true; email: string; sessionToken: string; expiresAt: Date } | { ok: false; reason: "invalid" | "not_allowed" | "rate_limited" | "not_configured" };

export async function verifyCode(
  deps: { store: GiveawayStore; otp: OtpClient; secret: string; counter?: RateLimitCounter; env?: Record<string, string | undefined>; now?: Date; log?: Pick<Console, "error"> },
  input: { email: string; code: string; ip: string }
): Promise<VerifyOutcome> {
  const log = deps.log ?? console;
  const now = deps.now ?? new Date();
  const email = normalizeEmail(input.email);
  const code = input.code.replace(/\s+/g, "");
  if (!email || !/^\d{6,8}$/.test(code)) return { ok: false, reason: "invalid" };
  const ipHash = sha256Hex(input.ip, deps.secret);
  const counter = deps.counter ?? supabaseCounter(deps.store);
  const limited = await rateLimit(counter, "admin_verify_ip", input.ip, { now, log });
  if (!limited.allowed) {
    if (limited.reason === "error") return { ok: false, reason: "not_configured" };
    await audit(deps.store, { actor: email, action: "admin_rate_limited", ipHash });
    return { ok: false, reason: "rate_limited" };
  }

  let allow: Set<string>;
  try {
    allow = await syncAllowlist(deps.store, adminEmailsFromEnv(deps.env ?? process.env));
  } catch {
    return { ok: false, reason: "not_configured" };
  }
  if (!allow.has(email)) {
    await audit(deps.store, { actor: email, action: "admin_code_denied", ipHash });
    return { ok: false, reason: "not_allowed" };
  }

  const result = await deps.otp.verifyOtp(email, code);
  if (result.error || !result.email || normalizeEmail(result.email) !== email) {
    await audit(deps.store, { actor: email, action: "admin_code_rejected", reason: result.error?.message.slice(0, 200) ?? "email mismatch", ipHash });
    return { ok: false, reason: "invalid" };
  }
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  const sessionToken = signToken({ kind: "admin_session", subject: email, env: deps.store.env, expiresAt }, deps.secret);
  await audit(deps.store, { actor: email, action: "admin_signed_in", ipHash });
  return { ok: true, email, sessionToken, expiresAt };
}

/** The signed-in admin for a session cookie, re-checked against the
 *  allowlist table every time. Null when absent, expired, forged or removed. */
export async function currentAdmin(
  deps: { store: GiveawayStore; secret: string; env?: Record<string, string | undefined>; now?: Date },
  sessionToken: string | undefined | null
): Promise<{ email: string } | null> {
  if (!sessionToken) return null;
  const v = verifyToken(sessionToken, { kind: "admin_session", env: deps.store.env, now: deps.now }, deps.secret);
  if (!v.ok) return null;
  let allow: Set<string>;
  try {
    allow = await syncAllowlist(deps.store, adminEmailsFromEnv(deps.env ?? process.env));
  } catch {
    return null;
  }
  return allow.has(v.payload.s) ? { email: v.payload.s } : null;
}

/** The short-lived "which address is waiting for a code" cookie value. */
export function pendingToken(email: string, env: string, secret: string, now = new Date()): string {
  return signToken({ kind: "admin_pending", subject: email, env, expiresAt: new Date(now.getTime() + PENDING_TTL_MS) }, secret);
}

export function pendingEmail(token: string | undefined | null, env: string, secret: string, now = new Date()): string | null {
  if (!token) return null;
  const v = verifyToken(token, { kind: "admin_pending", env, now }, secret);
  return v.ok ? v.payload.s : null;
}

/** For the sign-in page: how long a code lasts, in words. */
export const CODE_MINUTES = Math.round(PENDING_TTL_MS / 60_000);
export const ADMIN_LIMITS = { codeEmail: LIMITS.admin_code_email, codeIp: LIMITS.admin_code_ip, verifyIp: LIMITS.admin_verify_ip };
