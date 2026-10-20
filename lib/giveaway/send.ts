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
  claim: "/10years/claim",
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
export function siteUrl(): string {
  return (process.env.GIVEAWAY_SITE_URL?.trim() || SITE_URL).replace(/\/$/, "");
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
    case "claim":
      return `${siteUrl()}${PATHS.claim}/${encodeURIComponent(token)}`;
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
  if (input.marketing && input.footing?.unsubscribeUrl) {
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
  });
}
