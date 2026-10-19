/**
 * Signed tokens for links that must work without a login — unsubscribe,
 * the one-tap "It's live" entry, verification clicks, the winner's claim
 * page — plus the hashes and random codes the tables store.
 *
 * A token is `base64url(JSON payload) + "." + base64url(HMAC-SHA256)`. The
 * payload names its kind, its subject, the env it was issued for and an
 * optional expiry, and verification checks all four, so a claim token can
 * never unsubscribe anyone and a preview token can never touch production.
 *
 * The secret is GIVEAWAY_TOKEN_SECRET (Vercel → Environment Variables; any
 * long random string, e.g. `openssl rand -hex 32`). Unset → signing and
 * verifying throw, and the routes answer 503 rather than minting something
 * forgeable. Pure apart from `tokenSecret()`, so the tests pass their own.
 */

import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";

export const TOKEN_SECRET_ENV = "GIVEAWAY_TOKEN_SECRET";

export type TokenKind = "unsubscribe" | "verify_notify" | "verify_entry" | "live_tap" | "claim";

export type TokenPayload = {
  /** kind */
  k: TokenKind;
  /** subject: a normalized email or a row id */
  s: string;
  /** env */
  e: string;
  /** expiry, ms since epoch (absent = never) */
  x?: number;
  /** nonce, so two tokens for one subject differ */
  n: string;
};

export function tokenSecret(env: Record<string, string | undefined> = process.env): string {
  const s = env[TOKEN_SECRET_ENV]?.trim();
  if (!s || s.length < 16) throw new Error(`${TOKEN_SECRET_ENV} is not set (needs 16+ characters)`);
  return s;
}

const b64u = (buf: Buffer) => buf.toString("base64url");
const sign = (body: string, secret: string) => b64u(createHmac("sha256", secret).update(body).digest());

export function signToken(input: { kind: TokenKind; subject: string; env: string; expiresAt?: Date | null }, secret: string): string {
  const payload: TokenPayload = { k: input.kind, s: input.subject, e: input.env, n: b64u(randomBytes(6)) };
  if (input.expiresAt) payload.x = input.expiresAt.getTime();
  const body = b64u(Buffer.from(JSON.stringify(payload), "utf8"));
  return `${body}.${sign(body, secret)}`;
}

export type VerifyResult = { ok: true; payload: TokenPayload } | { ok: false; reason: "malformed" | "bad_signature" | "wrong_kind" | "wrong_env" | "expired" };

export function verifyToken(token: string, expect: { kind: TokenKind; env: string; now?: Date }, secret: string): VerifyResult {
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return { ok: false, reason: "malformed" };
  const [body, sig] = parts;
  const want = Buffer.from(sign(body, secret));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return { ok: false, reason: "bad_signature" };
  let payload: TokenPayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as TokenPayload;
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (!payload || typeof payload.s !== "string" || typeof payload.k !== "string" || typeof payload.e !== "string") return { ok: false, reason: "malformed" };
  if (payload.k !== expect.kind) return { ok: false, reason: "wrong_kind" };
  if (payload.e !== expect.env) return { ok: false, reason: "wrong_env" };
  if (payload.x !== undefined && (expect.now ?? new Date()).getTime() > payload.x) return { ok: false, reason: "expired" };
  return { ok: true, payload };
}

/** SHA-256 hex — for storing a token, an IP or a user agent, never the value. */
export function sha256Hex(value: string, salt = ""): string {
  return createHash("sha256").update(`${salt}\u0000${value}`).digest("hex");
}

/** Unambiguous upper-case alphabet (no 0/O, 1/I/L) for codes people type
 *  or read over the phone. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** A random code of `length` characters from the alphabet above. 8 characters
 *  ≈ 40 bits — unguessable for a code that is also rate-limited per IP. */
export function randomCode(length = 8): string {
  let out = "";
  for (let i = 0; i < length; i++) out += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return out;
}

/** A referral code: "HBC-" + 6 characters, so it reads as ours in a link. */
export function referralCode(): string {
  return `HBC-${randomCode(6)}`;
}

/** An offer code: "10Y-" + 6 characters. */
export function offerCode(): string {
  return `10Y-${randomCode(6)}`;
}
