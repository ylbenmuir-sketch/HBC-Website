/**
 * Rate limiting for the chat endpoint (phase-8-chatbot.md §6).
 *
 * §6: "the public API route currently has none, and a chat endpoint is a far
 * more attractive target than a form." A form submission costs a database row;
 * a chat message costs a model call, so an unlimited endpoint is somebody
 * else's free inference budget billed to this practice.
 *
 * Two windows, because they stop different things:
 *
 * - **Per minute** stops a script hammering the endpoint.
 * - **Per hour** stops a slow drip that stays under the per-minute limit all
 *   day, which is what an abusive client actually looks like.
 *
 * Same in-process caveat as lib/chat/session.ts: on serverless each instance
 * counts separately, so the effective limit is per instance rather than
 * global. That is a real weakening under load and is worth a shared counter
 * before this carries production traffic — noted in the README alongside the
 * session-store limitation, since both are the same missing piece.
 */

export const RATE_LIMIT = {
  perMinute: 12,
  perHour: 60,
} as const;

type Bucket = { minute: number[]; hour: number[] };

const buckets = new Map<string, Bucket>();

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * 60_000;
/** Backstop against unbounded growth from spoofed client addresses. */
const MAX_TRACKED_CLIENTS = 10_000;

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

function prune(timestamps: number[], now: number, windowMs: number): number[] {
  return timestamps.filter((t) => now - t < windowMs);
}

/**
 * Records a hit and reports whether it may proceed.
 *
 * `key` is the client address. It is spoofable behind a proxy that doesn't set
 * a trustworthy forwarding header, which is why the ceiling on tracked clients
 * exists: a spoofing attacker gets fresh buckets, but cannot also exhaust
 * memory.
 */
export function checkRateLimit(key: string, now = Date.now()): RateLimitResult {
  if (buckets.size > MAX_TRACKED_CLIENTS) buckets.clear();

  const bucket = buckets.get(key) ?? { minute: [], hour: [] };
  bucket.minute = prune(bucket.minute, now, MINUTE_MS);
  bucket.hour = prune(bucket.hour, now, HOUR_MS);

  if (bucket.minute.length >= RATE_LIMIT.perMinute) {
    buckets.set(key, bucket);
    const oldest = bucket.minute[0];
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((MINUTE_MS - (now - oldest)) / 1000)),
    };
  }
  if (bucket.hour.length >= RATE_LIMIT.perHour) {
    buckets.set(key, bucket);
    const oldest = bucket.hour[0];
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((HOUR_MS - (now - oldest)) / 1000)),
    };
  }

  bucket.minute.push(now);
  bucket.hour.push(now);
  buckets.set(key, bucket);
  return { allowed: true };
}

/**
 * Best-effort client address. Vercel sets `x-forwarded-for`; behind anything
 * that doesn't, every visitor shares the "unknown" bucket, which fails toward
 * limiting rather than toward unlimited.
 */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
