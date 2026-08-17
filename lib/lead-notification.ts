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

const RESEND_ENDPOINT = "https://api.resend.com/emails";

// The visitor is waiting on this request, so a hung provider must not hold the
// form open. The row is already saved if we give up here.
const SEND_TIMEOUT_MS = 5000;

// Resend's shared test sender. It only delivers to the Resend account owner,
// which is enough to prove the wiring works but is not a launch value.
const DEFAULT_FROM = "Harmonized Website <onboarding@resend.dev>";

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

/**
 * Where the row actually is. Derived from SUPABASE_URL rather than a fourth
 * env var, so there is nothing new to keep in sync; falls back to naming the
 * table when the URL is unset or is not a hosted project ref.
 *
 * Both notifications end on this line. That is the whole design: the email
 * says something arrived and points at the one place it is stored.
 */
function whereToRead(): string {
  const ref = /^https:\/\/([a-z0-9-]+)\.supabase\.co\/?$/i.exec(
    (process.env.SUPABASE_URL || "").trim()
  )?.[1];

  return ref
    ? `Open it here: https://supabase.com/dashboard/project/${ref}/editor`
    : "Open it in Supabase → Table Editor → public.consultation_requests.";
}

/**
 * Tells LEADS_NOTIFY_EMAIL that someone asked for the guide.
 *
 * Carries no signup content — not even the address, which is the only thing
 * collected. An email address is less than a parent's note about her child,
 * but it is still a person's contact detail, and there is no reason for it to
 * exist in an inbox as well as in the row. Same rule, same shape as the
 * consultation notice; the only difference is which one it says arrived.
 *
 * Still deliberately not shaped like a callback. Nobody phones someone who
 * only wanted a PDF, and the subject line keeps saying so.
 */
export async function sendGuideNotification(): Promise<boolean> {
  const text = [
    "Someone asked for the guide.",
    "",
    "This is a download request, not a callback — no name or phone was",
    "collected, and nobody is expecting to hear from us.",
    "",
    "The address is not in this email, on purpose — it's in Supabase, which is",
    "where it's stored anyway.",
    "",
    whereToRead(),
  ].join("\n");

  return deliver(
    "New guide signup — The Parent's Guide to Homework Battles",
    text
  );
}

/**
 * Tells LEADS_NOTIFY_EMAIL that a consultation request arrived. Someone is
 * waiting for a phone call at the other end of this one.
 *
 * It deliberately carries no lead content — no name, no phone, no concerns,
 * no note. The Supabase row is the source of truth and already holds all of
 * it; copying a parent's description of her child into an inbox duplicates it
 * into a second place with its own retention, its own forwarding, and its own
 * search index, and buys nothing the row doesn't already give. So this is a
 * pointer, not a record.
 *
 * That is also why it takes no argument. There is no lead in scope to be
 * re-added to the body by a later edit — the property is structural rather
 * than a matter of remembering. Everything the old body carried, channel
 * ("form" or "chat", §5) included, is a column on the row this links to.
 */
export async function sendLeadNotification(): Promise<boolean> {
  // Plain text, not HTML — it reads fine on a phone, which is where this will
  // actually be opened.
  const text = [
    "New consultation request received.",
    "",
    "Details are not in this email, on purpose — they're in Supabase, which is",
    "where they're stored anyway.",
    "",
    whereToRead(),
  ].join("\n");

  return deliver("New consultation request received", text);
}
