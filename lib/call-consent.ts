/**
 * The 10-year giveaway booking's call-me box (fix list rev 2, P0-8): the
 * giveaway path to /contact offers no texting (entrants get email only), so
 * it asks — unticked — whether the office may call to schedule. The words
 * are stored with the answer and the server's time, like the SMS consent
 * (lib/sms-consent.ts). Client-safe: no imports.
 */
export const CALL_ME_TEXT = "Yes, call me to schedule my visit.";

/** The phone label on the giveaway path. */
export const GIVEAWAY_PHONE_LABEL = "Best number to call you to book";
