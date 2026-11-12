/**
 * Text messaging: the consent wording. The registered identity (legal entity,
 * address, support line) is lib/sms-identity.ts — kept apart because this
 * file is imported by the contact form, a client component, and the identity
 * reads lib/locations.ts, which has no business in the browser bundle.
 *
 * ## Why this file exists
 *
 * The A2P 10DLC campaign registration (the carriers' approval for business
 * texting, filed through Dialpad) was rejected in October 2026, and most of
 * the reasons were this website: the brand on the site did not visibly match
 * the registered company (CR2020), the opt-in did not disclose HELP, STOP,
 * frequency or rates (CR4003–CR4006), and there were no terms to link to
 * (CR4007, CR5001). A carrier reviewer reads the opt-in, follows its links,
 * and compares what they find against the registration word for word.
 *
 * So everything a reviewer compares lives in these two files, once, and every
 * surface reads it: the contact form's checkbox, the assistant's consent
 * question, the footer's identity line, /sms-terms, the Organization schema,
 * and the row that records the consent.
 * Change a value here and the five move together; change one of them by hand
 * and the registration stops matching the site again.
 */

/** The brand the site uses — the registration's DBA. Same string as SITE_NAME. */
export const DBA_NAME = "Harmonized Brain Centers";

/* ------------------------------------------------------------------ */
/* The program                                                         */
/* ------------------------------------------------------------------ */

export const SMS_TERMS_PATH = "/sms-terms";
export const PRIVACY_PATH = "/privacy-policy";

/** What the texts are — the phrase the registration's use case describes. */
export const SMS_PROGRAM_DESCRIPTION = "appointment and inquiry updates";

/**
 * The four disclosures, in the carriers' own short forms. Reviewers search
 * for these strings; paraphrasing them ("standard rates" for "data rates")
 * is how a compliant opt-in still gets rejected.
 */
export const SMS_FREQUENCY = "Msg frequency varies.";
export const SMS_RATES = "Msg & data rates may apply.";
export const SMS_HELP_STOP = "Reply HELP for help, STOP to cancel.";

/**
 * The two sentences carriers look for in a privacy policy during A2P 10DLC
 * review (Ben, 2026-10-15), verbatim. Each must reach the raw HTML of
 * /privacy-policy as ONE unbroken string — which is why each is a single
 * constant rendered as a single JSX expression, never split across text and
 * markup (see components/ScannerText.tsx for the same rule on /contact).
 */
export const SMS_NO_SHARING_SENTENCE =
  "No mobile information will be shared with third parties or affiliates for marketing or promotional purposes.";
export const SMS_OPT_IN_DATA_SENTENCE =
  "Text messaging originator opt-in data and consent will not be shared with any third parties.";

/* ------------------------------------------------------------------ */
/* The consent wording                                                 */
/* ------------------------------------------------------------------ */

/**
 * One piece of consent wording: text, or a link. Rendered as JSX by the form
 * and joined to plain text for the row, from the same array — so what the
 * row records as "the wording shown" is the wording shown, not a copy of it
 * that someone forgot to update.
 */
export type ConsentPart = string | { href: string; label: string };

/**
 * The contact form's checkbox: a short label on the box and the disclosure
 * directly under it, both always visible, both in the server-rendered HTML,
 * the box unticked and never required. Each is one string, rendered as one
 * text node (components/ScannerText.tsx), so it reaches the raw HTML
 * unbroken for scanners that match bytes. Change them here and nowhere else,
 * and re-check the Dialpad registration when you do.
 *
 * Wording of 2026-11-12 (Ben): the label and the disclosure are his, shorter
 * than the 2026-11-02 pair ("Text me updates about my request" / "Optional.
 * Texts from … Msg frequency varies; msg & data rates may apply. Reply HELP
 * for help, STOP to opt out."). Two things his draft left out are kept:
 * the brand ("from Harmonized Brain Centers") and "Msg frequency varies." The October
 * 2026 rejection named a missing frequency disclosure (CR4003–CR4006), and
 * carriers look for the brand in the opt-in — flagged to Ben; drop them only
 * once the registration is confirmed not to need them.
 */
export const FORM_CONSENT_LABEL = "Yes, you can text me about my request (no marketing)";
// One literal, no `+`: the build dropped the tail of the first template
// when a second template starting with `${…}` was concatenated to it
// (seen 2026-11-12 — the page read "…Brain CentersMsg frequency varies").
// scripts/check-contact.mjs matches the whole sentence in the raw HTML.
export const FORM_CONSENT_DISCLOSURE = `Texts from ${DBA_NAME} about your inquiry and appointments only. Msg frequency varies. Msg & data rates may apply. Reply STOP to opt out, HELP for help.`;

/**
 * The disclosure under the label, with its two links. Everything a reviewer
 * looks for is visible — nothing is behind the links except the full terms.
 */
export const FORM_CONSENT_PARTS: ConsentPart[] = [
  `${FORM_CONSENT_DISCLOSURE} `,
  { href: SMS_TERMS_PATH, label: "SMS Terms" },
  " · ",
  { href: PRIVACY_PATH, label: "Privacy Policy" },
];

/** The wording as a reader sees it, links as their labels. */
export function consentPlainText(parts: ConsentPart[]): string {
  return parts.map((p) => (typeof p === "string" ? p : p.label)).join("");
}

/**
 * What the row records as the wording shown (`sms_consent_text`): the label,
 * then the disclosure as a reader sees it. The dash is the join; neither
 * string carries it.
 */
export const FORM_CONSENT_TEXT = `${FORM_CONSENT_LABEL} — ${consentPlainText(FORM_CONSENT_PARTS)}`;

/**
 * The assistant's consent question (lib/chat/booking.ts). The chat cannot
 * show a checkbox, so this is the checkbox as a question, asked in the same
 * message as the read-back with three buttons under it — "Yes, text me",
 * "No, just call", "Fix something" (Ben, 2026-10-14). Only a yes counts; the
 * booking goes through either way. The paths are written out because the
 * chat window turns site paths into links (withLinks in
 * components/SiteAssistant.tsx); the row stores this string exactly, paths
 * included, because that is what she read.
 *
 * The disclosures are the same constants as the form's, in the same order,
 * and the brand is named in the question itself, as on the form (Ben,
 * 2026-10-14: carriers look for the brand in the opt-in).
 */
export const CHAT_CONSENT_QUESTION =
  `Can ${DBA_NAME} also text you about your appointment and inquiry? ` +
  `${SMS_FREQUENCY} ${SMS_RATES} ${SMS_HELP_STOP} ` +
  `Optional — we'll call you either way. ` +
  `SMS Terms: ${SMS_TERMS_PATH} · Privacy Policy: ${PRIVACY_PATH}`;

/** Longest consent wording the consultation route will store. */
export const CONSENT_TEXT_MAX = 1000;
