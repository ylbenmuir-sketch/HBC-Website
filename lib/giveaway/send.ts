/**
 * Sending a giveaway email: the shared Resend path (lib/lead-notification.ts
 * → deliver, the same fetch check:contact mocks), the registered identity
 * line, the signed unsubscribe link on marketing emails, List-Unsubscribe
 * headers (RFC 8058 one-click, which the /unsubscribe POST answers), and a
 * refusal to send [DRAFT] copy anywhere but a testing env.
 *
 * Every send is passed the recipient's normalized email and comes back as
 * a SendResult; the caller records it. Links are built here so every email
 * points at the same routes.
 */

import { deliver, type SendResult } from "../lead-notification";
import { isDraftText, SITE_URL } from "../site-config";
import { COPY_IS_DRAFT } from "./copy";
import { DBA_NAME } from "../sms-consent";
import { REGISTERED_ADDRESS_LINE } from "../sms-identity";
import type { Email, Footing } from "./emails";
import { giveawayEnv, isTestingEnv, type GiveawayEnv } from "./env";
import { signToken, tokenSecret, type TokenKind } from "./tokens";

export const IDENTITY_LINE = `${DBA_NAME} · ${REGISTERED_ADDRESS_LINE}`;

/** Where the giveaway's links go. */
export const PATHS = {
  page: "/10years",
  verify: "/10years/verify",
  enter: "/10years/enter",
  unsubscribe: "/unsubscribe",
  book: "/contact",
  admin: "/admin/10years",
} as const;

/**
 * The origin every giveaway link is built on. GIVEAWAY_SITE_URL (server-side,
 * read at request time) wins — check:giveaway points it at its own server —
 * then the canonical SITE_URL. Not NEXT_PUBLIC_SITE_URL: that is inlined at
 * build time, so a server started with another value could not change it.
 */
/** The live site. Production emails never link anywhere else (Ben, 2026-11-09). */
export const PRODUCTION_SITE_URL = "https://harmonizedbraincenterstn.com";

export function siteUrl(env: Record<string, string | undefined> = process.env): string {
  const url = (env.GIVEAWAY_SITE_URL?.trim() || SITE_URL).replace(/\/$/, "");
  // On the production deployment a vercel.app (preview) address must never reach an email's links or footer.
  if (env.VERCEL_ENV === "production" && /\.vercel\.app(?:[/:]|$)/i.test(url.replace(/^https?:\/\//i, ""))) return PRODUCTION_SITE_URL;
  return url;
}

export function tokenLink(kind: TokenKind, subject: string, env: GiveawayEnv, opts: { expiresAt?: Date | null; secret?: string } = {}): string {
  const token = signToken({ kind, subject, env, expiresAt: opts.expiresAt ?? null }, opts.secret ?? tokenSecret());
  switch (kind) {
    case "unsubscribe":
      return `${siteUrl()}${PATHS.unsubscribe}?t=${encodeURIComponent(token)}`;
    case "verify_notify":
    case "verify_entry":
      return `${siteUrl()}${PATHS.verify}?t=${encodeURIComponent(token)}`;
    case "live_tap":
      return `${siteUrl()}${PATHS.enter}/${encodeURIComponent(token)}`;
    default:
      throw new Error(`no link for token kind ${kind}`);
  }
}

export function referralLink(referralCode: string): string {
  return `${siteUrl()}${PATHS.page}?ref=${encodeURIComponent(referralCode)}`;
}

export function bookLink(offerCode: string): string {
  return `${siteUrl()}${PATHS.book}?from=10years&code=${encodeURIComponent(offerCode)}`;
}

export function adminLink(path = ""): string {
  return `${siteUrl()}${PATHS.admin}${path}`;
}

/** The footing for a visitor email; marketing ones get their unsubscribe link. */
export function footingFor(email: string, env: GiveawayEnv, marketing: boolean, secret = tokenSecret()): Footing {
  return {
    identityLine: IDENTITY_LINE,
    siteUrl: siteUrl(),
    unsubscribeUrl: marketing ? tokenLink("unsubscribe", email, env, { secret }) : null,
  };
}

export type GiveawaySendInput = {
  to: string;
  email: Email;
  /** Marketing emails carry the List-Unsubscribe headers. */
  marketing: boolean;
  footing?: Footing | null;
  cc?: string[];
  replyTo?: string | null;
  /** Passed to Resend so a retried send can never become a second email. */
  idempotencyKey?: string | null;
};

/**
 * Deliver one giveaway email. Refuses [DRAFT] copy outside a testing env —
 * the whole copy file is draft until Ben approves it, and that must never
 * reach an entrant by accident.
 */
export async function sendGiveawayEmail(input: GiveawaySendInput): Promise<SendResult> {
  const env = giveawayEnv();
  // Two locks, either one holds: the copy file is still draft (whatever the
  // subject looks like — GIVEAWAY_HIDE_DRAFT_TAGS can hide the prefix on
  // screen), or this particular subject carries a draft marker.
  if (!isTestingEnv(env) && (COPY_IS_DRAFT || isDraftText(input.email.subject))) {
    return { status: "failed", messageId: null, error: "refusing to send [DRAFT] copy outside a testing env" };
  }
  const headers: Record<string, string> = {};
  // Any email that carries an unsubscribe link gets the one-click headers too ("You're on the list" and "You're in" since 2026-11-09).
  if (input.footing?.unsubscribeUrl) {
    headers["List-Unsubscribe"] = `<${input.footing.unsubscribeUrl}>`;
    headers["List-Unsubscribe-Post"] = "List-Unsubscribe=One-Click";
  }
  return deliver({
    to: input.to,
    cc: input.cc ?? [],
    subject: input.email.subject,
    html: input.email.html,
    text: input.email.text,
    replyTo: input.replyTo ?? null,
    headers,
    idempotencyKey: input.idempotencyKey ?? null,
  });
}

/** One row of Resend's own record of what it accepted. */
export type SentLogRow = { to: string[]; subject: string; createdAt: Date | null };

/**
 * Resend's list of the emails it accepted, newest first, back to `since`
 * (GET /emails, 100 a page). A refused send never appears here, so an
 * address in this list was sent that subject. Throws on anything unexpected
 * — the caller must not treat a failed read as "nobody was sent anything".
 */
export async function listSentEmails(since: Date, opts: { maxPages?: number; pauseMs?: number } = {}): Promise<SentLogRow[]> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("sent log: RESEND_API_KEY is not set");
  const out: SentLogRow[] = [];
  let after: string | null = null;
  for (let page = 0; page < (opts.maxPages ?? 100); page++) {
    const url = `https://api.resend.com/emails?limit=100${after ? `&after=${encodeURIComponent(after)}` : ""}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}` }, signal: AbortSignal.timeout(10_000) });
    const body = (await res.json().catch(() => null)) as { data?: unknown; has_more?: unknown; name?: unknown; message?: unknown } | null;
    if (!res.ok || !body || !Array.isArray(body.data)) throw new Error(`sent log: Resend ${res.status} ${[body?.name, body?.message].filter((v) => typeof v === "string").join(": ")}`.slice(0, 300));
    const rows = body.data as Array<{ id?: unknown; to?: unknown; subject?: unknown; created_at?: unknown }>;
    let reachedSince = false;
    for (const r of rows) {
      if (typeof r.id !== "string" || typeof r.subject !== "string") throw new Error("sent log: a row without an id or a subject");
      const to = Array.isArray(r.to) ? r.to.filter((t): t is string => typeof t === "string") : typeof r.to === "string" ? [r.to] : [];
      const ms = typeof r.created_at === "string" ? Date.parse(r.created_at.replace(" ", "T").replace(/([+-]\d\d)$/, "$1:00")) : NaN;
      const createdAt = Number.isNaN(ms) ? null : new Date(ms);
      if (createdAt && createdAt.getTime() < since.getTime()) reachedSince = true;
      else out.push({ to, subject: r.subject, createdAt });
    }
    if (reachedSince || body.has_more !== true || rows.length === 0) return out;
    after = rows[rows.length - 1].id as string;
    await new Promise((r) => setTimeout(r, opts.pauseMs ?? 600));
  }
  throw new Error("sent log: more pages than expected");
}
