// Confirmation text to the visitor, from the chosen center's own Dialpad line.
// Called by app/api/consultation/route.ts after a consultation has landed.
//
// ── WHAT THIS IS FOR ───────────────────────────────────────────────────────
// A parent who just asked for a call wants to know it went through, and the
// most useful thing we can hand her is the number that will be calling — so
// she recognizes it, and so she can call it first if she'd rather not wait.
// The text comes FROM that center's line, which does both at once.
//
// ── ROUTING ────────────────────────────────────────────────────────────────
// Same shape as the lead email (lib/center-routing.ts). All optional except
// the first two:
//
//   DIALPAD_API_KEY                 company API key (Admin → Authentication)
//   DIALPAD_SMS_FROM                default line, E.164 (+16155551234)
//   DIALPAD_SMS_FROM_NASHVILLE      Nashville's line
//   DIALPAD_SMS_FROM_MURFREESBORO   Murfreesboro's line
//   DIALPAD_SMS_FROM_FRANKLIN       Franklin's line, when it opens
//
// A center with no line set falls back to DIALPAD_SMS_FROM. A visitor who
// chose "Not sure yet" or Concierge gets the default line.
//
// ── WHEN IT DOES NOT SEND ──────────────────────────────────────────────────
//   · DIALPAD_API_KEY or the resolved from-number is unset (logs a warning).
//   · The request did not land anywhere — the route only calls this after at
//     least one destination accepted it, because "we got your request" must
//     be true when she reads it.
//   · The honeypot was filled: a bot's "phone number" is not a person who
//     asked to hear from us.
//   · The number is not a 10-digit US number we can put in E.164 form.
//   · Guide signups — no phone is collected.
// Every miss is logged by reason, never with the number.
//
// ── DIALPAD ────────────────────────────────────────────────────────────────
// POST https://dialpad.com/api/v2/sms with a bearer token. `from_number` must
// be a number assigned to a user or a group (an office main line qualifies).
// Outbound SMS to US numbers also requires the company's A2P 10DLC
// registration to be approved in Dialpad; without it carriers may drop the
// message silently while the API still answers 200. That is an account step,
// not a code one — see README → Confirmation text.
//
// Nothing here is a destination: a failed text never fails the form and is
// not counted toward whether the request "landed".

import { centerLabel, settingForCenter } from "./center-routing";
import { SITE_NAME } from "./site-config";

const DIALPAD_SMS_ENDPOINT = "https://dialpad.com/api/v2/sms";

// She is still waiting on the form when this runs, so a slow Dialpad must not
// hold it open. The request has already landed by the time we get here.
const SEND_TIMEOUT_MS = 5000;

export type ConfirmationLead = {
  firstName: string;
  phone: string;
  preferredCenter: string | null;
  /** The honeypot, verbatim. Non-empty means a bot; we do not text bots. */
  honeypot: string;
};

/**
 * US number → E.164, or null. Accepts the ways people actually type a phone
 * number: "(615) 555-0134", "615.555.0134", "1-615-555-0134", "+1 615…".
 * Anything that is not ten digits (eleven with a leading 1) is declined
 * rather than guessed at; a wrong guess texts a stranger.
 */
export function toE164US(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

/**
 * The message. Plain words, and only GSM-7 characters: one curly quote or em
 * dash switches the whole text to UCS-2, which halves the per-segment limit
 * and doubles what Dialpad bills. At ~225 characters this is two segments.
 */
export function confirmationText(firstName: string, preferredCenter: string | null): string {
  const center = centerLabel(preferredCenter);
  const who = center ? `our ${center} office` : "our team";
  const reach = center ? `our ${center} office` : "our office";
  return (
    `Hi ${firstName}, this is ${SITE_NAME}. We got your request and someone from ${who} ` +
    `will call you soon. Want to talk sooner? Just call or text this number to reach ${reach}. ` +
    `Reply STOP to opt out.`
  );
}

/**
 * Send the confirmation. Never throws; returns true only when Dialpad
 * accepted the message. Logs shape only — no number, no name.
 */
export async function sendConfirmationText(lead: ConfirmationLead): Promise<boolean> {
  const apiKey = process.env.DIALPAD_API_KEY;
  const from = settingForCenter("DIALPAD_SMS_FROM", lead.preferredCenter);

  if (!apiKey || !from) {
    console.warn(
      "[sms] not sent — set DIALPAD_API_KEY and DIALPAD_SMS_FROM to enable confirmation texts."
    );
    return false;
  }

  if (lead.honeypot.trim().length > 0) {
    console.warn("[sms] not sent — honeypot filled (likely bot).");
    return false;
  }

  const to = toE164US(lead.phone);
  if (!to) {
    console.warn("[sms] not sent — phone is not a 10-digit US number.");
    return false;
  }

  try {
    const response = await fetch(DIALPAD_SMS_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to_numbers: [to],
        from_number: from,
        text: confirmationText(lead.firstName, lead.preferredCenter),
        infer_country_code: false,
      }),
      signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
    });

    if (!response.ok) {
      // Dialpad's error bodies name the field at fault and are safe to log;
      // status alone is usually enough to diagnose.
      console.error(`[sms] Dialpad answered ${response.status} ${response.statusText}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error(
      "[sms] send failed:",
      error instanceof Error ? error.message : error
    );
    return false;
  }
}
