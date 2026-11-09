/**
 * The contact form's spam guard (Ben, 2026-11-08), server side. Nothing here
 * is visible to a real visitor: no CAPTCHA, no checkbox, no extra step.
 *
 * What it answers, and why each piece exists:
 *
 *   1. A page token. The form's own script fetches a signed, short-lived
 *      token from /api/form-token (lib/form-token-client.ts) and sends it
 *      with the request; POST /api/consultation refuses a request without a
 *      valid one. The flood that started 2026-11-08 05:48 UTC was ~48 posts
 *      from 17 countries, every one a form-encoded post straight to the
 *      route (the no-JavaScript path, answered 303) with an old Chrome
 *      user agent — a script that read the form's HTML and never ran its
 *      JavaScript. A token only the script can fetch shuts that out.
 *   2. A minimum fill time. A token younger than FORM_MIN_FILL_MS is refused:
 *      nobody reads the form and fills it in under three seconds. The
 *      form's script waits out the remainder itself before posting, so a
 *      real visitor is never refused by this — only a script that fetches
 *      a token and posts at once.
 *   3. A per-address rate limit (checkFormRateLimit).
 *
 * The honeypot and the real-phone check live in the route; they are always
 * on. These three are enforced on Vercel (production and preview) and off
 * on a local server unless FORM_GUARD=on, so the local harnesses
 * (check:contact, check:giveaway) post as before. FORM_GUARD=off turns them
 * off on Vercel too — the emergency switch if a real visitor is ever being
 * refused; every refusal is logged with its reason.
 *
 * The site assistant submits in-process (app/api/chat/route.ts) and is
 * exempt from all three: it has its own rate limit, and its request never
 * crosses the network. It proves that with internalSubmitHeaders(), a key
 * made fresh in each server process and never sent to a browser.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/** How long a token stays good. The form fetches a fresh one when its own
 *  copy is near this age (a tab left open), and retries once on refusal. */
export const FORM_TOKEN_TTL_MS = 60 * 60_000;
/** Faster than a person could read and fill the form. */
export const FORM_MIN_FILL_MS = 3_000;

const TOKEN_VERSION = "v1";
/** Allowance for clocks on two server instances disagreeing. */
const CLOCK_SKEW_MS = 30_000;

export type GuardEnv = Record<string, string | undefined>;

/** Whether the token, the fill time and the rate limit apply here. */
export function guardEnforced(env: GuardEnv = process.env): boolean {
  const flag = env.FORM_GUARD?.trim().toLowerCase();
  if (flag === "off") return false;
  if (flag === "on") return true;
  return Boolean(env.VERCEL_ENV?.trim() || env.VERCEL?.trim());
}

let processSecret: string | null = null;

/**
 * The signing key. FORM_TOKEN_SECRET when set (the recommended setting);
 * otherwise a key derived from the Supabase service-role key, which every
 * deployment that can save a lead already has, so the guard works the
 * moment it deploys. Only with neither (a bare local server) is it a key
 * made per process — fine for one process, wrong for many, so it says so.
 */
function tokenSecret(env: GuardEnv = process.env): string {
  const own = env.FORM_TOKEN_SECRET?.trim();
  if (own) return own;
  const base = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (base) return createHmac("sha256", base).update("hbc form token v1").digest("base64url");
  if (!processSecret) {
    processSecret = randomBytes(32).toString("base64url");
    if (guardEnforced(env)) {
      console.error("[spam guard] no FORM_TOKEN_SECRET or SUPABASE_SERVICE_ROLE_KEY — tokens are signed per process and may be refused by another instance");
    }
  }
  return processSecret;
}

function sign(payload: string, env?: GuardEnv): string {
  return createHmac("sha256", tokenSecret(env)).update(`form-token:${payload}`).digest("base64url");
}

/** A new token: version, issue time, a nonce, and the signature over them. */
export function mintFormToken(now = Date.now(), env?: GuardEnv): string {
  const payload = `${TOKEN_VERSION}.${now.toString(36)}.${randomBytes(9).toString("base64url")}`;
  return `${payload}.${sign(payload, env)}`;
}

export type TokenRefusal = "missing" | "malformed" | "bad_signature" | "expired" | "too_fast";
export type TokenCheck = { ok: true; ageMs: number } | { ok: false; reason: TokenRefusal; ageMs?: number };

export function checkFormToken(token: unknown, now = Date.now(), env?: GuardEnv): TokenCheck {
  if (typeof token !== "string" || token.length === 0) return { ok: false, reason: "missing" };
  if (token.length > 200) return { ok: false, reason: "malformed" };
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== TOKEN_VERSION) return { ok: false, reason: "malformed" };
  const issuedAt = parseInt(parts[1], 36);
  if (!Number.isFinite(issuedAt)) return { ok: false, reason: "malformed" };
  const expected = Buffer.from(sign(parts.slice(0, 3).join("."), env));
  const given = Buffer.from(parts[3]);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
    return { ok: false, reason: "bad_signature" };
  }
  const ageMs = now - issuedAt;
  if (ageMs < -CLOCK_SKEW_MS) return { ok: false, reason: "malformed", ageMs };
  if (ageMs < FORM_MIN_FILL_MS) return { ok: false, reason: "too_fast", ageMs };
  if (ageMs > FORM_TOKEN_TTL_MS) return { ok: false, reason: "expired", ageMs };
  return { ok: true, ageMs };
}

/* ------------------------------------------------------------------ */
/* The assistant's in-process submit                                   */
/* ------------------------------------------------------------------ */
const INTERNAL_HEADER = "x-hbc-internal-submit";
const internalKey = randomBytes(32).toString("base64url");

/** Headers the in-process caller adds; never sent to a browser. */
export function internalSubmitHeaders(): Record<string, string> {
  return { [INTERNAL_HEADER]: internalKey };
}

export function isInternalSubmit(request: Request): boolean {
  const given = request.headers.get(INTERNAL_HEADER);
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(internalKey);
  return a.length === b.length && timingSafeEqual(a, b);
}

/* ------------------------------------------------------------------ */
/* The rate limit                                                      */
/* ------------------------------------------------------------------ */
/**
 * Per client address, every POST counted (refused ones too, so a script
 * spends its allowance). A family sending the form and the guide signup,
 * with a retry or two, stays well inside it.
 *
 * In memory, so per server instance, like the chat's (lib/chat/rate-limit.ts):
 * a determined sender spread over many instances gets more. The firewall
 * rule in the README is the global backstop.
 */
export const FORM_RATE_LIMIT = {
  windows: [
    { ms: 10 * 60_000, max: 5 },
    { ms: 24 * 60 * 60_000, max: 20 },
  ],
} as const;

const hits = new Map<string, number[]>();
/** Backstop against unbounded growth from many addresses. */
const MAX_TRACKED = 10_000;

export type RateCheck = { allowed: true } | { allowed: false; retryAfterSeconds: number };

export function checkFormRateLimit(key: string, now = Date.now()): RateCheck {
  if (hits.size > MAX_TRACKED) hits.clear();
  const longest = Math.max(...FORM_RATE_LIMIT.windows.map((w) => w.ms));
  const times = (hits.get(key) ?? []).filter((t) => now - t < longest);
  for (const w of FORM_RATE_LIMIT.windows) {
    const inWindow = times.filter((t) => now - t < w.ms);
    if (inWindow.length >= w.max) {
      times.push(now);
      hits.set(key, times);
      return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((w.ms - (now - inWindow[0])) / 1000)) };
    }
  }
  times.push(now);
  hits.set(key, times);
  return { allowed: true };
}

/** For tests. */
export function resetFormRateLimit(): void {
  hits.clear();
}

/**
 * The client address. On Vercel `x-forwarded-for` is set by the platform
 * (a client-sent value is overwritten), so its first entry is the visitor.
 * Without it everyone shares "unknown", which errs toward limiting.
 */
export function formClientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
