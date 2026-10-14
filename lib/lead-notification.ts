// Lead notification email — the lead itself, delivered to the inbox its route
// names (lib/lead-routing.ts). Called by app/api/consultation/route.ts.
//
// ── WHAT THIS IS FOR ───────────────────────────────────────────────────────
// The clinic platform (lib/inquiry-intake.ts) is still in testing, so while
// the website is live the email IS the lead. It therefore carries everything
// the front desk needs to make the call: name, phone, who it's for, concerns,
// center, best time, and the visitor's own note. That is a deliberate change
// from the earlier "pointer only" design — Ben chose it (Oct 2026) so a lead
// can be worked straight from a phone without opening Supabase. The Supabase
// row remains the record of what was submitted; this is the working copy.
//
// ── ROUTING ────────────────────────────────────────────────────────────────
// Who gets it, who is copied, the subject and the From header are decided in
// lib/lead-routing.ts — the one place the rules live (Ben, 2026-10-14):
// LEADS_NASHVILLE, LEADS_MURFREESBORO, LEADS_CONCIERGE, LEADS_MORE_INFO,
// LEADS_GUIDE, LEADS_FALLBACK, then LEADS_NOTIFY_EMAIL as the last resort.
// The caller routes (app/api/consultation/route.ts) and passes the result in,
// so the route that was used can be written onto the lead's row.
//
// ── TURNING IT ON ──────────────────────────────────────────────────────────
//   1. Create an API key at resend.com/api-keys.
//   2. The sending domain, harmonizedbraincenterstn.com, is verified in
//      Resend. Every notification is sent from it (senderAddress).
//   3. Set RESEND_API_KEY and at least LEADS_FALLBACK (or the older
//      LEADS_NOTIFY_EMAIL), then the per-route variables as wanted.
// Until a key and a recipient are both set this sends nothing and says so in
// the server log; the lead is still saved.
//
// Everything here sends INWARD, to the clinic. Nothing emails a visitor. The
// lead's address is set as reply-to, so the office can answer her from their
// own mail client — that is the office sending, not the website.
//
// Resend's REST API over fetch, deliberately without the `resend` SDK: one
// POST does not justify a dependency. Swapping in Postmark or SendGrid means
// changing only the endpoint, headers, and body keys in deliver().

import { senderAddress, type Recipients } from "./lead-routing";
import { GUIDE_TITLE } from "./site-config";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

// The visitor is waiting on this request, so a hung provider must not hold the
// form open. The lead is already saved by the time this runs.
const SEND_TIMEOUT_MS = 5000;

/* ------------------------------------------------------------------ */
/* Delivery                                                            */
/* ------------------------------------------------------------------ */

/** What happened to one notification — written onto the lead's row. */
export type SendResult =
  | { status: "sent"; messageId: string | null; error: null }
  | { status: "failed" | "not_configured"; messageId: null; error: string };

type Outbound = {
  recipients: Recipients;
  subject: string;
  text: string;
  /** The lead's own address, when she gave one, so "Reply" just works. */
  replyTo?: string | null;
};

/**
 * Shared delivery. Never throws and never rejects: every failure comes back as
 * a SendResult for the caller to log against the lead's id and store. No
 * submitted value is put in an error string.
 */
async function deliver({ recipients, subject, text, replyTo }: Outbound): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { status: "not_configured", messageId: null, error: "RESEND_API_KEY is not set" };
  }
  if (!recipients.to) {
    return {
      status: "not_configured",
      messageId: null,
      error: `no recipient: ${recipients.warnings.length ? "every variable in the chain is empty" : "unrouted"}`,
    };
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
        to: [recipients.to],
        ...(recipients.cc.length ? { cc: recipients.cc } : {}),
        subject,
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });

    const body = (await response.json().catch(() => null)) as
      | { id?: unknown; name?: unknown; message?: unknown }
      | null;

    if (!response.ok) {
      // Resend's own error name and message (e.g. "validation_error: The
      // harmonizedbraincenterstn.com domain is not verified"), capped.
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

/* ------------------------------------------------------------------ */
/* The two messages                                                    */
/* ------------------------------------------------------------------ */

export type LeadDetails = {
  /** Which channel it came through — the form or the site assistant. */
  source: "form" | "chat";
  /** "more_info" when the visitor said she is not ready to book. */
  intent: "book" | "more_info";
  /** The saved row's id. Null only for the rescue copy sent when the row
   *  did NOT save — the email then says so at the top. */
  rowId: string | null;
  /** Null for a form lead: the form asks this in its optional second step,
   *  after this email has gone. The chat asks it before submitting. */
  helpingWho: string | null;
  concerns: string[];
  /** As given: first and last from the form (one field), first only from
   *  the chat. The email prints it whole — the office is not greeting her. */
  firstName: string | null;
  phone: string | null;
  email: string | null;
  preferredCenter: string | null;
  bestTime: string | null;
  note: string | null;
  sourcePage: string | null;
  /** Whether she agreed to texts (lib/sms-consent.ts). The office texts from
   *  the same Dialpad lines, so the email says it plainly either way. */
  smsConsent: boolean;
  /** The hidden spam-trap field was filled in — almost certainly a bot. */
  honeypotFilled: boolean;
};

/** Right-aligned label column so the block reads as a form on a phone. */
function line(label: string, value: string | null | undefined): string | null {
  if (!value) return null;
  return `${label.padEnd(11)}${value}`;
}

const SOURCE_LABEL: Record<LeadDetails["source"], string> = {
  form: "the contact form",
  chat: "the site assistant (chat)",
};

/** Said first when the row of record failed to save: the email is then the
 *  only copy, and the visitor was shown an error with the phone number. */
const NOT_SAVED_BANNER = [
  "!! NOT SAVED IN SUPABASE — this email is the only copy of this lead.",
  "!! The visitor was shown an error and asked to call. They may call or",
  "!! submit again; please reach out either way.",
  "",
];

/**
 * Where the saved request lives. Derived from SUPABASE_URL rather than a
 * further env var; falls back to naming the table when the URL is unset or
 * is not a hosted project ref.
 */
function whereToRead(rowId: string | null): string | null {
  if (!rowId) return null;
  const ref = /^https:\/\/([a-z0-9-]+)\.supabase\.co\/?$/i.exec(
    (process.env.SUPABASE_URL || "").trim()
  )?.[1];
  const place = ref
    ? `https://supabase.com/dashboard/project/${ref}/editor (table consultation_requests)`
    : "Supabase → Table Editor → consultation_requests";
  return `Saved request: ${rowId}\n${place}`;
}

/** The last lines of every notification: where it came from and why it
 *  reached this inbox, so a misrouted lead can be traced from the email. */
function footer(sourcePage: string | null, recipients: Recipients): string[] {
  return [
    `Page they came from: ${sourcePage ?? "(not recorded)"}`,
    `Received: ${new Date().toISOString()}`,
    `Routed by: ${recipients.envVar ?? "(nothing set)"} (rule: ${recipients.route})`,
  ];
}

/**
 * Tells the routed inbox that someone is waiting for a call, and gives them
 * everything they need to make it.
 */
export async function sendLeadNotification(
  lead: LeadDetails,
  recipients: Recipients,
  subject: string
): Promise<SendResult> {
  // The form sends this email the moment the callback is saved — before it
  // asks who the call is for, what's bringing them in, or for a note. Those
  // three are optional and arrive, when they arrive, on the saved request;
  // there is deliberately no second email (one lead, one message, one row).
  // The chat asks everything first, so a chat lead has them all here.
  const laterStep = lead.source === "form";
  const text = [
    ...(lead.rowId ? [] : NOT_SAVED_BANNER),
    lead.intent === "more_info"
      ? `New request for more information via ${SOURCE_LABEL[lead.source]} (not ready to book).`
      : `New call request via ${SOURCE_LABEL[lead.source]}.`,
    lead.honeypotFilled
      ? "Spam check: the hidden field was filled in — probably a bot."
      : null,
    "",
    line("Name:", lead.firstName),
    line("Phone:", lead.phone),
    line("Email:", lead.email ?? "(not given)"),
    line("Center:", lead.preferredCenter ?? "(not given)"),
    line("Best time:", lead.bestTime ?? "(not given)"),
    line(
      "Texts:",
      lead.smsConsent
        ? "OK to text (consent recorded on the saved request)"
        : "NO consent to text — call or email only"
    ),
    line("For:", lead.helpingWho ?? (laterStep ? "(not yet given)" : "(not given)")),
    line(
      "Concerns:",
      lead.concerns.length
        ? lead.concerns.join(", ")
        : laterStep
          ? "(none chosen yet)"
          : "(none chosen)"
    ),
    "",
    "In their own words:",
    lead.note ?? (laterStep ? "(nothing added yet)" : "(nothing added)"),
    "",
    laterStep && lead.rowId
      ? "The form asks who the call is for, what's bringing them in, and for a note AFTER this email is sent, and those answers are optional. Anything they add is on the saved request below — there is no second email."
      : null,
    whereToRead(lead.rowId),
    "",
    lead.email
      ? "Reply to this email to reach them directly."
      : "No email was given — phone is the only way to reach them.",
    ...footer(lead.sourcePage, recipients),
  ]
    .filter((l): l is string => l !== null)
    .join("\n");

  return deliver({ recipients, subject, text, replyTo: lead.email });
}

/**
 * Tells the guide inbox that someone asked for the guide. Deliberately not
 * shaped like a callback: nobody phones someone who only wanted a PDF, and the
 * body keeps saying so. The address is included so it can be added to a
 * follow-up list without a trip to Supabase.
 */
export async function sendGuideNotification(
  guide: { email: string; sourcePage: string | null; rowId: string | null },
  recipients: Recipients,
  subject: string
): Promise<SendResult> {
  const text = [
    ...(guide.rowId ? [] : NOT_SAVED_BANNER),
    `Someone asked for the guide, ${GUIDE_TITLE}.`,
    "",
    "This is a download request, not a callback — no name or phone was",
    "collected, and nobody is expecting a call.",
    "",
    line("Email:", guide.email),
    "",
    whereToRead(guide.rowId),
    "Reply to this email to reach them directly.",
    ...footer(guide.sourcePage, recipients),
  ]
    .filter((l): l is string => l !== null)
    .join("\n");

  return deliver({ recipients, subject, text, replyTo: guide.email });
}
