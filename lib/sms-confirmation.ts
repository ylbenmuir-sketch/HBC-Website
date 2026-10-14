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
//   · The visitor did not consent to texts. The route decides that
//     (sms_consent on the row) and does not call this at all; see
//     lib/sms-consent.ts for the wording she agreed to.
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

import { settingForCenter } from "./center-routing";
import { firstName } from "./first-name";
import { SITE_NAME } from "./site-config";
import { SMS_HELP_STOP } from "./sms-consent";

const DIALPAD_SMS_ENDPOINT = "https://dialpad.com/api/v2/sms";

// She is still waiting on the form when this runs, so a slow Dialpad must not
// hold it open. The request has already landed by the time we get here.
const SEND_TIMEOUT_MS = 5000;

export type ConfirmationLead = {
  /** The name as given — first and last from the form, first only from the
   *  chat. The text greets by the first word either way (lib/first-name.ts). */
  name: string;
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
 * The message — Ben's words (2026-10-13), warmer than the first draft and
 * naming no center: the center is the line it comes FROM (settingForCenter
 * below), which is what "right here" means.
 *
 * The last sentence is the opt-out, and it is the opt-in's own sentence
 * (SMS_HELP_STOP), so the first text a number receives says HELP and STOP
 * in the words she agreed to. HELP was added 2026-10-14 for the A2P 10DLC
 * resubmission (CR4003); STOP was always there. It stays last.
 *
 * Plain words, and only GSM-7 characters: one curly quote or em dash
 * switches the whole text to UCS-2, which cuts a segment from 153 characters
 * to 67 and turns two segments into three — so the dash in Ben's copy is a
 * hyphen here. 185 characters with "Ben", 182 + the first name in general:
 * two segments (≤306) for any first name up to 124 characters. A name typed
 * with a character outside GSM-7 (a curly apostrophe in "D’Angelo") makes
 * that one text UCS-2 and three segments; it still sends.
 */
export function confirmationText(name: string): string {
  return (
    `Hi ${firstName(name)}, this is ${SITE_NAME}. We got your request and we'll reach out soon! ` +
    `Feel free to call or text us right here anytime - talk soon. ` +
    SMS_HELP_STOP
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
        text: confirmationText(lead.name),
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
