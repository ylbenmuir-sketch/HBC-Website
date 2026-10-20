// Every email the site sends — four of them, one design (lib/email/
// templates.ts, Ben 2026-10-14). Called by app/api/consultation/route.ts and
// app/api/consultation/[id]/route.ts.
//
//   1. Staff notification — a new call request (form or chat), to the inbox
//      its route names (lib/lead-routing.ts). While the clinic platform is in
//      testing this email IS the lead: name, number, how they want to be
//      reached, center, best time, text consent, and anything they told us.
//   2. Page-two update — when a visitor SAVES the contact form's second page
//      (never on Skip). Same recipients as #1, same subject with "Re: ", and
//      In-Reply-To / References pointing at #1's Message-ID, so it lands in
//      the same Gmail thread. Sent on its own when #1 failed.
//   3. Visitor confirmation — to the visitor, the moment a call request is
//      saved; never for a guide download (lib/email/format.ts →
//      shouldEmailVisitor). Reply-To is the first address of her lead's
//      route, so a reply reaches the person who will call.
//   4. Guide download notification — to LEADS_GUIDE only.
//
// ── TURNING IT ON ──────────────────────────────────────────────────────────
//   1. Create an API key at resend.com/api-keys.
//   2. The sending domain, harmonizedbraincenterstn.com, is verified in
//      Resend. Every email is sent from it as "Harmonized Brain Centers
//      <LEADS_NOTIFY_FROM's address>" (lib/lead-routing.ts → senderAddress).
//   3. Set RESEND_API_KEY and at least LEADS_FALLBACK (or the older
//      LEADS_NOTIFY_EMAIL), then the per-route variables as wanted.
// Until a key and a recipient are both set this sends nothing and says so in
// the server log; the lead is still saved.
//
// ── THREADING ──────────────────────────────────────────────────────────────
// Resend assigns the RFC Message-ID itself and does not document honouring
// one we set, so none is set — a refused header would cost the lead email.
// Instead the real one is read back (GET /emails/:id → message_id) right
// after #1 is accepted and stored on the row (notify_rfc_message_id). If it
// is not available yet, the page-two route reads it again before sending #2.
//
// Resend's REST API over fetch, deliberately without the `resend` SDK.

import { contactMethodLabel } from "./contact-method";
import { senderAddress, type LeadSource, type Recipients } from "./lead-routing";
import { replySubject, threadHeaders } from "./email/format";
import {
  detailsUpdate,
  guideNotification,
  staffNotification,
  visitorConfirmation,
  VISITOR_SUBJECT,
  type Details,
  type SavedLink,
  type StaffLead,
} from "./email/templates";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

// The visitor is waiting on this request, so a hung provider must not hold the
// form open. The lead is already saved by the time this runs.
const SEND_TIMEOUT_MS = 5000;
/** Reading a Message-ID back is a nicety; it gets less time than a send. */
const LOOKUP_TIMEOUT_MS = 2000;

/* ------------------------------------------------------------------ */
/* Delivery                                                            */
/* ------------------------------------------------------------------ */

/** What happened to one email — written onto the lead's row. */
export type SendResult =
  | { status: "sent"; messageId: string | null; error: null }
  | { status: "failed" | "not_configured"; messageId: null; error: string };

export type Outbound = {
  to: string | null;
  cc?: string[];
  subject: string;
  html: string;
  text: string;
  replyTo?: string | null;
  headers?: Record<string, string>;
};

/**
 * Shared delivery. Never throws and never rejects: every failure comes back as
 * a SendResult for the caller to log against the lead's id and store. No
 * submitted value is put in an error string.
 */
export async function deliver({ to, cc = [], subject, html, text, replyTo, headers }: Outbound): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { status: "not_configured", messageId: null, error: "RESEND_API_KEY is not set" };
  }
  if (!to) {
    return { status: "not_configured", messageId: null, error: "no recipient: every variable in the chain is empty" };
  }

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: senderAddress(),
        to: [to],
        ...(cc.length ? { cc } : {}),
        subject,
        html,
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
        ...(headers && Object.keys(headers).length ? { headers } : {}),
      }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });

    const body = (await response.json().catch(() => null)) as
      | { id?: unknown; name?: unknown; message?: unknown }
      | null;

    if (!response.ok) {
      const detail = [body?.name, body?.message].filter((v) => typeof v === "string").join(": ");
      return {
        status: "failed",
        messageId: null,
        error: `Resend ${response.status}${detail ? ` ${detail}` : ` ${response.statusText}`}`.slice(0, 300),
      };
    }

    return { status: "sent", messageId: typeof body?.id === "string" ? body.id : null, error: null };
  } catch (error) {
    // Timeout, DNS, TLS, connection refused.
    return {
      status: "failed",
      messageId: null,
      error: (error instanceof Error ? `${error.name}: ${error.message}` : "unknown error").slice(0, 300),
    };
  }
}

/**
 * The RFC Message-ID Resend gave a sent email ("<…@…>"), or null. Never
 * throws. One try now, one more a beat later: the id is assigned when the
 * email is accepted for delivery, which can trail the send's 200.
 */
export async function rfcMessageIdOf(resendId: string | null): Promise<string | null> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !resendId) return null;
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 400));
    try {
      const response = await fetch(`${RESEND_ENDPOINT}/${encodeURIComponent(resendId)}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
      });
      if (!response.ok) continue;
      const body = (await response.json().catch(() => null)) as { message_id?: unknown } | null;
      if (typeof body?.message_id === "string" && body.message_id.trim()) return body.message_id.trim();
    } catch {
      // Try again, or give up quietly — threading falls back to the subject.
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Where the saved request lives                                       */
/* ------------------------------------------------------------------ */

/** The table's id in the Supabase dashboard, for a link that opens the row.
 *  SUPABASE_LEADS_TABLE_ID overrides; the default is the live project's. */
const LIVE_PROJECT = "brwyfneahhhkymytkvpx";
const LIVE_TABLE_ID = "17487";

export function savedLink(rowId: string | null): SavedLink {
  if (!rowId) return null;
  const ref = /^https:\/\/([a-z0-9-]+)\.supabase\.co\/?$/i.exec((process.env.SUPABASE_URL || "").trim())?.[1];
  if (!ref) return { rowId, url: "https://supabase.com/dashboard/projects" };
  const table = process.env.SUPABASE_LEADS_TABLE_ID?.trim() || (ref === LIVE_PROJECT ? LIVE_TABLE_ID : "");
  const url = table
    ? `https://supabase.com/dashboard/project/${ref}/editor/${table}?filter=${encodeURIComponent(`id:eq:${rowId}`)}`
    : `https://supabase.com/dashboard/project/${ref}/editor`;
  return { rowId, url };
}

/* ------------------------------------------------------------------ */
/* 1. Staff notification                                               */
/* ------------------------------------------------------------------ */

export type LeadDetails = {
  source: LeadSource;
  intent: "book" | "more_info";
  /** The saved row's id. Null only for the rescue copy sent when the row
   *  did NOT save — the email then says so at the top. */
  rowId: string | null;
  /** Null for a form lead: the form asks this on its second page. */
  helpingWho: string | null;
  concerns: string[];
  /** The whole name, capitalized (lib/name-case.ts). */
  firstName: string | null;
  phone: string | null;
  email: string | null;
  preferredCenter: string | null;
  bestTime: string | null;
  /** "Best way to reach you" — call, text or email (the stored value, see
   *  lib/consultation.ts). Null for the chat and for older rows. */
  contactMethod?: string | null;
  note: string | null;
  referredBy?: string | null;
  sourcePage: string | null;
  /** Whether she agreed to texts (lib/sms-consent.ts). */
  smsConsent: boolean;
  /** The hidden spam-trap field was filled in — almost certainly a bot. */
  honeypotFilled: boolean;
};

function staffLead(lead: LeadDetails): StaffLead {
  return {
    source: lead.source,
    intent: lead.intent,
    name: lead.firstName?.trim() || "No name given",
    phone: lead.phone,
    email: lead.email,
    preferredCenter: lead.preferredCenter,
    bestTime: lead.bestTime,
    contactMethod: contactMethodLabel(lead.contactMethod),
    smsConsent: lead.smsConsent,
    sourcePage: lead.sourcePage,
    details: {
      helpingWho: lead.helpingWho,
      concerns: lead.concerns,
      note: lead.note,
      referredBy: lead.referredBy ?? null,
    },
    honeypotFilled: lead.honeypotFilled,
  };
}

/** The lead email, plus the RFC Message-ID it was given when it can be read
 *  back (for the page-two update's threading). */
export async function sendLeadNotification(
  lead: LeadDetails,
  recipients: Recipients,
  subject: string,
  now: Date = new Date()
): Promise<SendResult & { rfcMessageId: string | null }> {
  const { html, text } = staffNotification({
    lead: staffLead(lead),
    route: recipients.route,
    envVar: recipients.envVar,
    saved: savedLink(lead.rowId),
    now,
  });
  const result = await deliver({
    to: recipients.to,
    cc: recipients.cc,
    subject,
    html,
    text,
    replyTo: lead.email,
  });
  const rfcMessageId = result.status === "sent" ? await rfcMessageIdOf(result.messageId) : null;
  return { ...result, rfcMessageId };
}

/* ------------------------------------------------------------------ */
/* 2. Page-two update                                                  */
/* ------------------------------------------------------------------ */

/**
 * "Details added" — to the original's recipients, threaded under it when
 * its Message-ID is known. `originalSent` false: #1 never went, so this
 * carries the whole lead and starts its own thread (no "Re: ").
 */
export async function sendDetailsUpdate(input: {
  lead: LeadDetails;
  recipients: Pick<Recipients, "route" | "envVar" | "to" | "cc">;
  subject: string;
  originalSent: boolean;
  originalMessageId: string | null;
  now?: Date;
}): Promise<SendResult> {
  const { lead, recipients, subject, originalSent, originalMessageId, now = new Date() } = input;
  const { html, text } = detailsUpdate({
    lead: staffLead(lead),
    route: recipients.route,
    envVar: recipients.envVar,
    saved: savedLink(lead.rowId),
    now,
    originalSent,
  });
  return deliver({
    to: recipients.to,
    cc: recipients.cc,
    subject: originalSent ? replySubject(subject) : subject,
    html,
    text,
    replyTo: lead.email,
    headers: originalSent ? threadHeaders(originalMessageId) : {},
  });
}

/* ------------------------------------------------------------------ */
/* 3. Visitor confirmation                                             */
/* ------------------------------------------------------------------ */

export async function sendVisitorConfirmation(input: {
  to: string;
  replyTo: string | null;
  content: Parameters<typeof visitorConfirmation>[0];
}): Promise<SendResult> {
  const { html, text } = visitorConfirmation(input.content);
  return deliver({ to: input.to, subject: VISITOR_SUBJECT, html, text, replyTo: input.replyTo });
}

/* ------------------------------------------------------------------ */
/* 4. Guide download                                                   */
/* ------------------------------------------------------------------ */

export async function sendGuideNotification(
  guide: { email: string; sourcePage: string | null; rowId: string | null; guideTitle: string },
  recipients: Recipients,
  subject: string,
  now: Date = new Date()
): Promise<SendResult> {
  const { html, text } = guideNotification({
    email: guide.email,
    guideTitle: guide.guideTitle,
    sourcePage: guide.sourcePage,
    envVar: recipients.envVar,
    route: recipients.route,
    saved: savedLink(guide.rowId),
    now,
  });
  return deliver({ to: recipients.to, cc: recipients.cc, subject, html, text, replyTo: guide.email });
}

export type { Details };
