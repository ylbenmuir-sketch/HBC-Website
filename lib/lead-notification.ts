// Lead notification email — a saved row nobody looks at is not a lead.
// Called by app/api/consultation/route.ts after a successful insert.
//
// SCAFFOLDED, NOT YET LIVE. No email provider key exists for this project yet,
// so this is gated behind two env vars and no-ops (with a warning in the
// server log) until both are set. Nothing about it is silent.
//
// To turn it on:
//   1. Create an API key at resend.com/api-keys.
//   2. Verify the sending domain in Resend (required for a real `from`).
//   3. Set RESEND_API_KEY, LEADS_NOTIFY_EMAIL, and LEADS_NOTIFY_FROM.
//
// Sending goes through Resend's REST API over fetch, deliberately without the
// `resend` SDK — one POST does not justify a new dependency. Swapping in
// Postmark or SendGrid means changing only the endpoint, headers, and body
// keys below; the exported signature stays the same.

export type LeadNotification = {
  firstName: string;
  phone: string;
  helpingWho: string;
  concerns: string[];
  preferredCenter: string | null;
  bestTime: string | null;
  note: string | null;
  sourcePage: string | null;
};

const RESEND_ENDPOINT = "https://api.resend.com/emails";

// The visitor is waiting on this request, so a hung provider must not hold the
// form open. The row is already saved if we give up here.
const SEND_TIMEOUT_MS = 5000;

// Resend's shared test sender. It only delivers to the Resend account owner,
// which is enough to prove the wiring works but is not a launch value.
const DEFAULT_FROM = "Harmonized Website <onboarding@resend.dev>";

function line(label: string, value: string | null): string {
  return `${label}: ${value && value.length > 0 ? value : "—"}`;
}

/** Centre-local time, since whoever reads this works in Middle Tennessee.
 *  Falls back to ISO if the runtime lacks full ICU data. */
function stamp(date: Date): string {
  try {
    // Explicit components, not dateStyle/timeStyle — those cannot be combined
    // with timeZoneName, and the combination throws.
    return date.toLocaleString("en-US", {
      timeZone: "America/Chicago",
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return date.toISOString();
  }
}

/**
 * Shared delivery. Never throws and never rejects: the Supabase row is already
 * committed by the time any caller runs, so every failure path is logged and
 * swallowed. Returns true only when the provider accepted the message.
 */
async function deliver(subject: string, text: string): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.LEADS_NOTIFY_EMAIL;
  const from = process.env.LEADS_NOTIFY_FROM || DEFAULT_FROM;

  if (!apiKey || !to) {
    // Expected until the provider key is issued — see the note at the top.
    console.warn(
      "Lead saved but NOT emailed: set RESEND_API_KEY and LEADS_NOTIFY_EMAIL to enable notifications."
    );
    return false;
  }

  // Collapse whitespace: a newline in a subject is a header-injection vector.
  const safeSubject = subject.replace(/\s+/g, " ").trim();

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject: safeSubject, text }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });

    if (!response.ok) {
      // Body may carry the provider's reason; status alone is often enough.
      // Deliberately not logging the lead itself — this is a PII-free log.
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

/** A guide signup — an address and nothing else. */
export type GuideNotification = {
  email: string;
  sourcePage: string | null;
  submittedAt: Date;
};

/**
 * Emails a guide signup to LEADS_NOTIFY_EMAIL.
 *
 * Deliberately not shaped like a callback: there is no name, phone, or best
 * time to call, and presenting it as one would invite a call nobody asked for.
 * The subject says plainly which kind of lead this is.
 */
export async function sendGuideNotification(
  signup: GuideNotification
): Promise<boolean> {
  const text = [
    "Someone asked for the guide. This is a download request, not a callback —",
    "no name or phone was collected, and nobody is expecting to hear from us.",
    "",
    line("Email", signup.email),
    line("Submitted from", signup.sourcePage),
    line("Received", stamp(signup.submittedAt)),
  ].join("\n");

  return deliver(
    "New guide signup — The Parent's Guide to Homework Battles",
    text
  );
}

/**
 * Emails a new consultation request to LEADS_NOTIFY_EMAIL. Someone is waiting
 * for a phone call at the other end of this one.
 */
export async function sendLeadNotification(
  lead: LeadNotification
): Promise<boolean> {
  // Plain text, not HTML — nothing here needs escaping, and it reads fine on a
  // phone, which is where this will actually be opened.
  const text = [
    "A new consultation request just came in.",
    "",
    line("Name", lead.firstName),
    line("Phone", lead.phone),
    line("Helping who", lead.helpingWho),
    line("Concerns", lead.concerns.join(", ")),
    line("Preferred center", lead.preferredCenter),
    line("Best time to call", lead.bestTime),
    line("Submitted from", lead.sourcePage),
    "",
    "Note:",
    lead.note && lead.note.length > 0 ? lead.note : "—",
  ].join("\n");

  return deliver(
    `New consultation request — ${lead.firstName} (${lead.helpingWho})`,
    text
  );
}
