/**
 * The safety net (Ben, 2026-11-16 — the day Resend's daily quota ran out
 * and 259 "You're in" emails, a reminder and the Monday winner alert were
 * refused with nobody told): every giveaway email that is not sent
 *
 *   1. writes one unmistakable line in the server log —
 *      "[giveaway EMAIL FAILED] what=… count=… error=…" — every time, and
 *   2. emails FAILURE_ALERT_TO, at most once an hour (one refused send is
 *      usually the first of hundreds, and each alert spends from the same
 *      quota that just ran out).
 *
 * The hour is kept in the audit trail (action "email_failure_alert"), so
 * it is shared by every server instance and leaves a record. The alert
 * goes through the same provider as everything else: when the provider
 * itself is refusing, the alert is refused too and the log line is what
 * remains — which is why the line is written first. No entrant's name or
 * address is put in either.
 */

import { deliver, type SendResult } from "../lead-notification";
import { audit } from "./audit";
import { isTestingEnv } from "./env";
import { isBadAddress } from "./recipients";
import type { GiveawayStore } from "./store";

/** Ben's inbox (his instruction, 2026-11-16). GIVEAWAY_FAILURE_ALERT overrides it without a deploy. */
export const FAILURE_ALERT_TO = "ben@harmonizedbraincenterstn.com";
export const FAILURE_ALERT_ENV = "GIVEAWAY_FAILURE_ALERT";
export const FAILURE_ALERT_ACTION = "email_failure_alert";
export const FAILURE_ALERT_EVERY_MS = 60 * 60_000;

export type EmailFailure = {
  /** Which email: "You're in", "staff winner alert (mon)", "daily_mon"… */
  what: string;
  /** How many sends this report covers. */
  count?: number;
  /** The provider's answer, as logged. */
  error: string;
  /** Will the site try again by itself? */
  willRetry?: boolean;
};

export type FailureAlertDeps = {
  now?: Date;
  log?: Pick<Console, "error">;
  env?: Record<string, string | undefined>;
  /** The delivery (default: Resend; nothing is sent from a local or test env). */
  send?: (mail: { to: string; subject: string; text: string; html: string }) => Promise<SendResult>;
};

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Never throws: a failure report must not break the signup or the cron run that makes it. */
export async function reportEmailFailure(store: GiveawayStore | null, f: EmailFailure, deps: FailureAlertDeps = {}): Promise<"alerted" | "logged" | "alert_failed"> {
  const log = deps.log ?? console;
  // One wrong address (Resend's 422) is not an outage: its caller has logged it once; no second line, no alert email (Ben, 2026-11-18).
  if (isBadAddress(f.error)) return "logged";
  const now = deps.now ?? new Date();
  const count = f.count ?? 1;
  log.error(`[giveaway EMAIL FAILED] what="${f.what}" count=${count} retry=${f.willRetry ? "yes" : "no"} error=${f.error}`);
  try {
    if (!store) return "logged";
    const send = deps.send ?? (isTestingEnv(store.env) ? null : (mail) => deliver({ ...mail, cc: [] }));
    if (!send) return "logged";
    const since = new Date(now.getTime() - FAILURE_ALERT_EVERY_MS).toISOString();
    const recent = await store.select("giveaway_audit", "id").eq("action", FAILURE_ALERT_ACTION).gte("at", since).limit(1);
    if (recent.error) {
      log.error(`[giveaway EMAIL FAILED] alert not attempted (audit unreadable: ${recent.error.message})`);
      return "logged";
    }
    if ((recent.data?.length ?? 0) > 0) return "logged";
    // The hour starts before the send: two failures in the same second must not both alert.
    await audit(store, { actor: "system", action: FAILURE_ALERT_ACTION, reason: `${f.what}: ${f.error}`.slice(0, 200), after: { count } });
    const to = (deps.env ?? process.env)[FAILURE_ALERT_ENV]?.trim() || FAILURE_ALERT_TO;
    const lines = [
      `A giveaway email was not sent.`,
      ``,
      `Which email: ${f.what}`,
      `How many in this report: ${count}`,
      `The provider's answer: ${f.error}`,
      f.willRetry ? `The site will try these again by itself for the next few hours.` : `The site will NOT try this one again by itself.`,
      ``,
      `This alert is sent at most once an hour, so more may have failed since. Every failure is in the Vercel log: search for "giveaway EMAIL FAILED".`,
      `Entries are not affected: a failed email never fails an entry.`,
    ];
    const r = await send({
      to,
      subject: `Giveaway email failed: ${f.what}`,
      text: lines.join("\n"),
      html: `<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.5;color:#1c2b3a;">${lines.map((l) => (l ? `<p style="margin:0 0 10px;">${esc(l)}</p>` : "")).join("")}</div>`,
    });
    if (r.status === "sent") return "alerted";
    log.error(`[giveaway EMAIL FAILED] the alert email itself was not sent: ${r.error}`);
    return "alert_failed";
  } catch (err) {
    log.error(`[giveaway EMAIL FAILED] alert threw: ${err instanceof Error ? err.message : "unknown"}`);
    return "logged";
  }
}
