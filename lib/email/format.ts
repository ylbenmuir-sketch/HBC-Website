/**
 * The small rules every email follows (Ben, 2026-10-14) — times, phone
 * numbers, the From header, threading, who a visitor's reply reaches, and
 * when a visitor is emailed at all. Import-free, so lib/email-format.test.mjs
 * runs it under plain `node --test`, and the templates (./templates.ts) and
 * the sender (../lead-notification.ts) share one copy of each rule.
 */

/* ------------------------------------------------------------------ */
/* Time                                                                */
/* ------------------------------------------------------------------ */

/**
 * "Wed Oct 14, 11:13 AM CT" — the centers' own time, never an ISO string.
 * "CT" rather than CDT/CST: the office reads the clock on the wall, not the
 * offset, and the label must not change twice a year.
 */
export function formatCentral(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("weekday")} ${get("month")} ${get("day")}, ${get("hour")}:${get("minute")} ${get("dayPeriod").toUpperCase()} CT`;
}

/* ------------------------------------------------------------------ */
/* Phone                                                               */
/* ------------------------------------------------------------------ */

function usDigits(phone: string): string | null {
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  return digits.length === 10 ? digits : null;
}

/** "6155551234" → "(615) 555-1234". Not a US ten-digit number → as typed. */
export function displayPhone(phone: string): string {
  const d = usDigits(phone);
  return d ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : phone.trim();
}

/** "tel:+16155551234" for a US number, otherwise the digits as typed. */
export function telHref(phone: string): string {
  const d = usDigits(phone);
  if (d) return `tel:+1${d}`;
  const raw = phone.replace(/[^\d+]/g, "");
  return `tel:${raw}`;
}

/* ------------------------------------------------------------------ */
/* Text                                                                */
/* ------------------------------------------------------------------ */

/** For HTML text and attribute values. Every visitor-typed value goes through
 *  this — a lead's note is untrusted input landing in the office's inbox. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/* ------------------------------------------------------------------ */
/* From                                                                */
/* ------------------------------------------------------------------ */

/** The name every email is sent under. */
export const FROM_NAME = "Harmonized Brain Centers";

/**
 * `Harmonized Brain Centers <address>`. The address is LEADS_NOTIFY_FROM's —
 * whether it is set as a bare address or as "Some Name <address>", only the
 * address is kept, so the display name is never doubled or replaced. The
 * caller (lib/lead-routing.ts → senderAddress) has already refused any
 * address off the verified domain.
 */
export function fromHeader(address: string): string {
  const bare = /<([^>]+)>\s*$/.exec(address)?.[1] ?? address;
  return `${FROM_NAME} <${bare.trim()}>`;
}

/* ------------------------------------------------------------------ */
/* Threading                                                           */
/* ------------------------------------------------------------------ */

/** "Re: " once, never "Re: Re: ". */
export function replySubject(subject: string): string {
  return /^re:\s/i.test(subject) ? subject : `Re: ${subject}`;
}

/**
 * The headers that put the page-two update in the same thread as the lead
 * email: In-Reply-To and References both name the original's Message-ID.
 * Without one (the original failed, or its id was never read back) there is
 * nothing to point at, and the update goes out as a message of its own.
 */
export function threadHeaders(originalMessageId: string | null | undefined): Record<string, string> {
  const id = originalMessageId?.trim();
  if (!id) return {};
  const bracketed = id.startsWith("<") ? id : `<${id}>`;
  return { "In-Reply-To": bracketed, References: bracketed };
}

/* ------------------------------------------------------------------ */
/* The visitor's confirmation                                          */
/* ------------------------------------------------------------------ */

/**
 * Who a visitor's reply reaches: the FIRST address of the inbox her lead was
 * routed to (lib/lead-routing.ts — that route's To), so "reply" lands with
 * the person who will call her. Null when the lead had nowhere to go; the
 * email then has no Reply-To, and a reply goes to the From address.
 */
export function visitorReplyTo(recipients: { to: string | null }): string | null {
  return recipients.to?.trim() || null;
}

/**
 * Whether a visitor gets the "We got your request" email. Only for a saved
 * call request with an address: never for a guide download (Ben), never for
 * a "more information" request (it promises a call), never when the row did
 * not save (she was shown an error and asked to phone), and never when the
 * hidden spam field was filled — a bot typing a stranger's address must not
 * make us email that stranger.
 */
export function shouldEmailVisitor(input: {
  type: "consultation" | "guide";
  intent: "book" | "more_info";
  email: string | null;
  saved: boolean;
  honeypotFilled: boolean;
}): boolean {
  return (
    input.type === "consultation" &&
    input.intent === "book" &&
    Boolean(input.email?.trim()) &&
    input.saved &&
    !input.honeypotFilled
  );
}
