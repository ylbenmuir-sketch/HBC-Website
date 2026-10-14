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
 * The contact form's checkbox. Unchecked by default; the form submits either
 * way. Everything a reviewer looks for is in the visible label — nothing is
 * behind the links except the full terms.
 */
export const FORM_CONSENT_PARTS: ConsentPart[] = [
  `Yes, text me ${SMS_PROGRAM_DESCRIPTION} from ${DBA_NAME} at this number. ` +
    `${SMS_FREQUENCY} ${SMS_RATES} ${SMS_HELP_STOP} ` +
    `Optional — we’ll call you either way. `,
  { href: SMS_TERMS_PATH, label: "SMS Terms" },
  " · ",
  { href: PRIVACY_PATH, label: "Privacy Policy" },
];

/** The wording as a reader sees it, links as their labels. */
export function consentPlainText(parts: ConsentPart[]): string {
  return parts.map((p) => (typeof p === "string" ? p : p.label)).join("");
}

export const FORM_CONSENT_TEXT = consentPlainText(FORM_CONSENT_PARTS);

/**
 * The assistant's consent question (lib/chat/booking.ts). The chat cannot
 * show a checkbox, so this is the checkbox as a question: only a clear yes
 * counts, anything else is a no, and the booking goes through either way.
 * The paths are written out because the chat window turns site paths into
 * links (withLinks in components/SiteAssistant.tsx); the row stores this
 * string exactly, paths included, because that is what she read.
 *
 * One question mark, per the flow's one-question-per-turn rule (§5).
 */
export const CHAT_CONSENT_QUESTION =
  `Last one: can ${DBA_NAME} text you ${SMS_PROGRAM_DESCRIPTION} at that number? ` +
  `${SMS_FREQUENCY} ${SMS_RATES} ${SMS_HELP_STOP} ` +
  `Terms: ${SMS_TERMS_PATH} · Privacy: ${PRIVACY_PATH}. ` +
  `Yes or no is fine — we’ll call you either way.`;

/** Longest consent wording the consultation route will store. */
export const CONSENT_TEXT_MAX = 1000;
