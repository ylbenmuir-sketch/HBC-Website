/**
 * Database-backed rate limiting for the giveaway (GIVEAWAY-PLAN.md §4,
 * decision 10). lib/chat/rate-limit.ts counts in memory, which on Vercel is
 * per instance; a giveaway attracts scripts, so the count has to be shared.
 *
 * Fixed windows in the `rate_limits` table: one row per (env, bucket, key
 * hash, window start), incremented atomically by the SQL function
 * `giveaway_rate_limit_hit` (migration 0010 — an INSERT … ON CONFLICT DO
 * UPDATE … RETURNING count, so two requests racing both see a true count).
 * Keys are hashed before they leave the process: the table never holds an
 * address, an email or a code.
 *
 * Fails CLOSED: when the counter cannot be reached the request is refused
 * and the error logged. Every path this guards also needs the database to do
 * its job, so "allow while the database is down" would only let abuse
 * through on the one day nothing else works either.
 *
 * Pure apart from the counter, which is passed in; lib/giveaway/
 * rate-limit.test.mjs uses an in-memory one with the same ON CONFLICT rule.
 */

import type { GiveawayStore } from "./store";
import { sha256Hex } from "./tokens";

export type Bucket =
  | "entry_ip"
  | "verify_email"
  | "referral_code"
  | "admin_code_email"
  | "admin_code_ip"
  | "admin_verify_ip"
  | "unsubscribe_ip";

export type Limit = { max: number; windowMs: number };

const MIN = 60_000;
const HOUR = 60 * MIN;

/** Per key per window. */
export const LIMITS: Record<Bucket, Limit> = {
  /** Entry / notify-me attempts from one address. */
  entry_ip: { max: 5, windowMs: HOUR },
  /** Verification emails to one address. */
  verify_email: { max: 1, windowMs: 10 * MIN },
  /** Entries arriving through one referral code — a burst ceiling; the
   *  ten-friend credit cap is business logic (config REFERRAL.friendCap). */
  referral_code: { max: 30, windowMs: HOUR },
  /** Admin login codes to one address. */
  admin_code_email: { max: 3, windowMs: 10 * MIN },
  /** Admin login codes requested from one address. */
  admin_code_ip: { max: 10, windowMs: HOUR },
  /** Admin code guesses from one address. */
  admin_verify_ip: { max: 10, windowMs: 10 * MIN },
  /** Unsubscribe hits from one address. */
  unsubscribe_ip: { max: 30, windowMs: HOUR },
};

export interface RateLimitCounter {
  /** Increment and return the new count for the window. Throws on failure. */
  hit(input: { bucket: Bucket; keyHash: string; windowStart: Date }): Promise<number>;
}

export type RateLimitResult =
  | { allowed: true; count: number; remaining: number }
  | { allowed: false; count: number; retryAfterSeconds: number; reason: "limit" | "error" };

export function windowStart(now: Date, windowMs: number): Date {
  return new Date(Math.floor(now.getTime() / windowMs) * windowMs);
}

/** Hash a key so the table never stores the value. An optional secret salts
 *  it (GIVEAWAY_TOKEN_SECRET when set) so a leaked table is not a rainbow
 *  table of addresses. */
export function keyHash(value: string, salt = ""): string {
  return sha256Hex(value.trim().toLowerCase(), salt);
}

export async function rateLimit(
  counter: RateLimitCounter,
  bucket: Bucket,
  key: string,
  opts: { now?: Date; salt?: string; limits?: Record<Bucket, Limit>; log?: Pick<Console, "error"> } = {}
): Promise<RateLimitResult> {
  const now = opts.now ?? new Date();
  const limit = (opts.limits ?? LIMITS)[bucket];
  const start = windowStart(now, limit.windowMs);
  let count: number;
  try {
    count = await counter.hit({ bucket, keyHash: keyHash(key, opts.salt), windowStart: start });
  } catch (err) {
    (opts.log ?? console).error(`[giveaway rate limit] ${bucket}: counter failed: ${err instanceof Error ? err.message : "unknown error"} — refusing`);
    return { allowed: false, count: 0, retryAfterSeconds: 60, reason: "error" };
  }
  if (count > limit.max) {
    const resetAt = start.getTime() + limit.windowMs;
    return { allowed: false, count, retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now.getTime()) / 1000)), reason: "limit" };
  }
  return { allowed: true, count, remaining: limit.max - count };
}

/** The counter over the real table, via the SQL function. */
export function supabaseCounter(store: GiveawayStore): RateLimitCounter {
  return {
    async hit({ bucket, keyHash: hash, windowStart: start }) {
      const { data, error } = await store.rpc("giveaway_rate_limit_hit", {
        p_bucket: bucket,
        p_key_hash: hash,
        p_window_start: start.toISOString(),
      });
      if (error) throw new Error(error.message);
      const n = Number(data);
      if (!Number.isFinite(n)) throw new Error("counter returned no number");
      return n;
    },
  };
}

/** An in-memory counter with the same semantics — tests and local dev
 *  without a database. */
export function memoryCounter(): RateLimitCounter & { rows: Map<string, number> } {
  const rows = new Map<string, number>();
  return {
    rows,
    async hit({ bucket, keyHash: hash, windowStart: start }) {
      const k = `${bucket}\u0000${hash}\u0000${start.toISOString()}`;
      const n = (rows.get(k) ?? 0) + 1;
      rows.set(k, n);
      return n;
    },
  };
}

/**
 * Best-effort client address (the same rule as lib/chat/rate-limit.ts):
 * Vercel sets x-forwarded-for; without it everyone shares "unknown", which
 * fails toward limiting.
 */
export function clientAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
