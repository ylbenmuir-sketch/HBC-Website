// Lead notification email — the lead itself, delivered to the inbox for the
// center the visitor chose. Called by app/api/consultation/route.ts.
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
// Which inbox gets it is decided by `preferred_center`, which every lead
// already carries (a select on the form, a question in the chat), against
// four environment variables. All optional except the first:
//
//   LEADS_NOTIFY_EMAIL               default — everything not matched below
//   LEADS_NOTIFY_EMAIL_NASHVILLE     leads that chose Nashville
//   LEADS_NOTIFY_EMAIL_MURFREESBORO  leads that chose Murfreesboro
//   LEADS_NOTIFY_EMAIL_FRANKLIN      leads that chose the Franklin waitlist
//
// Each may hold several addresses separated by commas. Unset a center's
// variable and its leads fall back to the default, so "everything to one
// person" is just the default on its own, and splitting a center off later is
// one new line in the Vercel dashboard plus a redeploy. Guide signups and the
// "Concierge / at home" option always go to the default. No admin page, no
// table, nothing new to maintain.
//
// ── TURNING IT ON ──────────────────────────────────────────────────────────
//   1. Create an API key at resend.com/api-keys.
//   2. Verify the sending domain in Resend (DNS records). Until then Resend's
//      shared test sender only delivers to the Resend account owner.
//   3. Set RESEND_API_KEY, LEADS_NOTIFY_EMAIL, and LEADS_NOTIFY_FROM.
// Until RESEND_API_KEY and LEADS_NOTIFY_EMAIL are both set this no-ops with a
// warning in the server log, and the form still succeeds via the other
// destinations.
//
// Everything here sends INWARD, to the clinic. Nothing emails a visitor: on
// the shared test sender a send to a parent's address would be accepted by the
// API and never arrive, and a promised email that doesn't come is worse than
// none. The lead's address is set as reply-to, so the office can answer her
// from their own mail client — that is the office sending, not the website.
//
// Resend's REST API over fetch, deliberately without the `resend` SDK: one
// POST does not justify a dependency. Swapping in Postmark or SendGrid means
// changing only the endpoint, headers, and body keys in deliver().

import { settingForCenter } from "./center-routing";
import { GUIDE_TITLE } from "./site-config";

const RESEND_ENDPOINT = "https://api.resend.com/emails";

// The visitor is waiting on this request, so a hung provider must not hold the
// form open. The other destinations are independent and still run.
const SEND_TIMEOUT_MS = 5000;

// Resend's shared test sender. It only delivers to the Resend account owner,
// which is enough to prove the wiring works but is not a launch value.
const DEFAULT_FROM = "Harmonized Website <onboarding@resend.dev>";

/* ------------------------------------------------------------------ */
/* Routing                                                             */
/* ------------------------------------------------------------------ */

/** "a@x.com, b@y.com" → ["a@x.com", "b@y.com"]. Tolerates semicolons and
 *  stray whitespace, because the value is typed by hand into a dashboard. */
function parseAddresses(value: string | undefined): string[] {
  return (value ?? "")
    .split(/[,;\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * The inbox(es) for a lead that chose `center` — the center's own variable
 * when set, LEADS_NOTIFY_EMAIL otherwise (lib/center-routing.ts). Exported so
 * it can be checked without sending anything; `env` is injectable for that.
 */
export function recipientsFor(
  center: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env
): string[] {
  return parseAddresses(settingForCenter("LEADS_NOTIFY_EMAIL", center, env));
}

/* ------------------------------------------------------------------ */
/* Delivery                                                            */
/* ------------------------------------------------------------------ */

type Outbound = {
  to: string[];
  subject: string;
  text: string;
  /** The lead's own address, when she gave one, so "Reply" just works. */
  replyTo?: string | null;
};

/**
 * Shared delivery. Never throws and never rejects: every failure path is
 * logged (shape only — no submitted value reaches a log line) and swallowed.
 * Returns true only when the provider accepted the message.
 */
async function deliver({ to, subject, text, replyTo }: Outbound): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.LEADS_NOTIFY_FROM || DEFAULT_FROM;

  if (!apiKey || to.length === 0) {
    // Expected until the provider key is issued — see the note at the top.
    console.warn(
      "Lead NOT emailed: set RESEND_API_KEY and LEADS_NOTIFY_EMAIL to enable notifications."
    );
    return false;
  }

  // Collapse whitespace: a newline in a subject is a header-injection vector,
  // and the subject now contains a visitor-typed first name.
  const safeSubject = subject.replace(/\s+/g, " ").trim().slice(0, 150);

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: safeSubject,
        text,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });

    if (!response.ok) {
      // Status alone is usually enough. Deliberately not logging the lead.
      console.error(
        `Lead notification failed: ${response.status} ${response.statusText}`
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error(
      "Lead notification failed:",
      error instanceof Error ? error.message : error
    );
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* The two messages                                                    */
/* ------------------------------------------------------------------ */

export type LeadDetails = {
  /** Which channel it came through — the form or the site assistant. */
  source: "form" | "chat";
  /** The saved row's id, when the row saved — so the office can find what
   *  the visitor adds in the form's optional second step. */
  rowId: string | null;
  /** Null for a form lead: the form asks this in its optional second step,
   *  after this email has gone. The chat asks it before submitting. */
  helpingWho: string | null;
  concerns: string[];
  firstName: string | null;
  phone: string | null;
  email: string | null;
  preferredCenter: string | null;
  bestTime: string | null;
  note: string | null;
  sourcePage: string | null;
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

/**
 * Tells the chosen center's inbox that someone is waiting for a call, and
 * gives them everything they need to make it.
 */
export async function sendLeadNotification(lead: LeadDetails): Promise<boolean> {
  const center = lead.preferredCenter ?? "Not specified";
  const name = lead.firstName ?? "Unknown";

  const subject = `Call request — ${name} · ${center}${
    lead.bestTime ? ` · ${lead.bestTime}` : ""
  }`;

  // The form sends this email the moment the callback is saved — before it
  // asks who the call is for, what's bringing them in, or for a note. Those
  // three are optional and arrive, when they arrive, on the saved request;
  // there is deliberately no second email (one lead, one message, one row).
  // The chat asks everything first, so a chat lead has them all here.
  const laterStep = lead.source === "form";
  const text = [
    `New call request via ${SOURCE_LABEL[lead.source]}.`,
    "",
    line("Name:", lead.firstName),
    line("Phone:", lead.phone),
    line("Email:", lead.email ?? "(not given)"),
    line("Center:", center),
    line("Best time:", lead.bestTime ?? "(not given)"),
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
    laterStep
      ? "The form asks who the call is for, what's bringing them in, and for a note AFTER this email is sent, and those answers are optional. Anything they add is on the saved request below — there is no second email."
      : null,
    whereToRead(lead.rowId),
    "",
    lead.email
      ? "Reply to this email to reach them directly."
      : "No email was given — phone is the only way to reach them.",
    lead.sourcePage ? `Submitted from: ${lead.sourcePage}` : null,
  ]
    .filter((l): l is string => l !== null)
    .join("\n");

  return deliver({
    to: recipientsFor(lead.preferredCenter),
    subject,
    text,
    replyTo: lead.email,
  });
}

/**
 * Tells the default inbox that someone asked for the guide. Deliberately not
 * shaped like a callback: nobody phones someone who only wanted a PDF, and the
 * subject line keeps saying so. The address is included so it can be added to
 * a follow-up list without a trip to Supabase.
 */
export async function sendGuideNotification(
  email: string,
  sourcePage: string | null
): Promise<boolean> {
  const text = [
    "Someone asked for the guide.",
    "",
    "This is a download request, not a callback — no name or phone was",
    "collected, and nobody is expecting a call.",
    "",
    line("Email:", email),
    sourcePage ? line("From page:", sourcePage) : null,
  ]
    .filter((l): l is string => l !== null)
    .join("\n");

  return deliver({
    to: recipientsFor(null),
    subject: `Guide signup — ${GUIDE_TITLE}`,
    text,
    replyTo: email,
  });
}
