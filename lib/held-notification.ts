// One staff email per form lead (Ben, 2026-10-15).
//
// A /contact lead's staff notification is HELD at step one instead of sent,
// and goes out ONCE, carrying whatever the visitor added by then:
//
//   page two saved   → sent at once, with the details (PATCH ../[id])
//   "Skip for now"   → sent at once (POST ../[id]/release)
//   neither, 2 min   → sent by the release job, every minute
//                      (app/api/cron/release-held-leads/route.ts)
//
// A page-two save that arrives AFTER the email went out sends the threaded
// "Details added" update, exactly as before. Chat leads and guide downloads
// are not held. Neither is the visitor's confirmation, the confirmation text,
// or the platform copy (lib/inquiry-intake.ts): all of those still go at
// step one, untouched by anything here.
//
// ── NO LEAD GOES UNNOTIFIED ────────────────────────────────────────────────
// Holding is only safe while something is certain to release. So step one
// holds ONLY when (shouldHold):
//   - CRON_SECRET is set — without it the release endpoint refuses every
//     call, so nothing would ever come back for the lead; and
//   - this deployment's release job has demonstrably been running every
//     minute: its last run is under HEARTBEAT_FRESH_MS old AND the run before
//     that was under HEARTBEAT_FRESH_MS before it (the heartbeat table,
//     migration 0009). A daily backstop run can never satisfy that, and
//     neither can a schedule that stopped.
// Anything else — no secret, no heartbeat, a stale one, the heartbeat table
// unreadable, the hold UPDATE failing, the spam trap filled — sends at step
// one as before, and says why in the log.
//
// ── NEVER TWICE ────────────────────────────────────────────────────────────
// Every sender (page two, Skip, the job, the sweep) must first CLAIM the row:
// one conditional UPDATE, held → sending, that only one caller can win. A
// claim older than CLAIM_STALE_MS is a sender that died mid-send and can be
// claimed again — the one way a duplicate is possible, and the right side to
// err on: a second email beats a lost lead.
//
// ── A FAILED SEND ──────────────────────────────────────────────────────────
// goes back to `held` with the attempt counted and the failure appended to
// notify_failures, and the next run retries it. After GIVE_UP_MS (a day) it
// stops retrying, is marked gave_up / failed, and logs an error naming it.
//
// Pure: the database and the sender are passed in (HeldStore, Sender), so
// lib/held-notification.test.mjs drives every path with an in-memory table.
// The Supabase store is lib/held-notification-store.ts.

import type { SendResult } from "./lead-notification";
import type { Recipients, RouteName } from "./lead-routing";

/** How long step one waits for page two or Skip before the job sends it. */
export const HOLD_MS = 2 * 60_000;
/** A heartbeat older than this means the job is not running every minute. */
export const HEARTBEAT_FRESH_MS = 150_000;
/** A claim older than this is a sender that died; the row may be re-claimed. */
export const CLAIM_STALE_MS = 2 * 60_000;
/** Stop retrying a failing send this long after the request arrived. */
export const GIVE_UP_MS = 24 * 60 * 60_000;
/** How long a page-two save waits for an in-flight send to finish. */
export const IN_FLIGHT_WAIT_MS = 8_000;
/** notify_failures keeps the most recent this-many entries. */
export const FAILURE_LOG_MAX = 50;

/** The job's heartbeat row name, per deployment. */
export const RELEASE_JOB = "release-held-leads";

/** Which deployment this process is — production, preview, or a local
 *  server. A held row is released only by its own deployment's job. */
export function holdEnv(env: Record<string, string | undefined> = process.env): string {
  return env.LEAD_HOLD_ENV?.trim() || env.VERCEL_ENV?.trim() || "local";
}

/** HOLD_MS, unless a test server shortens it (LEAD_HOLD_MS, 5 s – 2 min). */
export function holdMs(env: Record<string, string | undefined> = process.env): number {
  const n = Number(env.LEAD_HOLD_MS);
  return Number.isFinite(n) && n >= 5_000 && n <= HOLD_MS ? n : HOLD_MS;
}

export type HoldState = "held" | "sending" | "released" | "gave_up";
export type ReleasedBy = "page_two" | "skip" | "cron" | "sweep";

export type Heartbeat = { lastRunAt: Date; previousRunAt: Date | null } | null;

/* ------------------------------------------------------------------ */
/* Step one: hold, or send now?                                        */
/* ------------------------------------------------------------------ */

export type HoldDecision = { hold: true } | { hold: false; reason: string };

export function shouldHold(input: {
  type: "consultation" | "guide";
  source: "form" | "chat" | "giveaway";
  saved: boolean;
  honeypotFilled: boolean;
  cronSecretSet: boolean;
  /** undefined: the heartbeat could not be read at all. */
  heartbeat: Heartbeat | undefined;
  now: Date;
}): HoldDecision {
  if (input.type !== "consultation") return { hold: false, reason: "not a call request" };
  if (input.source === "chat") return { hold: false, reason: "chat lead — sent at once" };
  if (input.source === "giveaway") return { hold: false, reason: "10-year offer booking — sent at once" };
  if (!input.saved) return { hold: false, reason: "row not saved — this email is the only copy" };
  // A bot never reaches page two; and the row does not store the trap, so a
  // later send could not show the spam warning. Send it now, flagged.
  if (input.honeypotFilled) return { hold: false, reason: "spam trap filled" };
  if (!input.cronSecretSet) return { hold: false, reason: "CRON_SECRET not set — the release job cannot run" };
  if (input.heartbeat === undefined) return { hold: false, reason: "release job heartbeat unreadable" };
  if (!input.heartbeat) return { hold: false, reason: "release job has never run here" };
  const now = input.now.getTime();
  const last = input.heartbeat.lastRunAt.getTime();
  if (now - last > HEARTBEAT_FRESH_MS) {
    return { hold: false, reason: `release job last ran ${Math.round((now - last) / 1000)} s ago` };
  }
  const prev = input.heartbeat.previousRunAt?.getTime();
  if (prev === undefined || last - prev > HEARTBEAT_FRESH_MS) {
    return { hold: false, reason: "release job is not running every minute yet" };
  }
  return { hold: true };
}

/* ------------------------------------------------------------------ */
/* The store and the sender                                            */
/* ------------------------------------------------------------------ */

/** The row, as a sender needs it. */
export type HeldRow = {
  id: string;
  created_at: string;
  first_name: string | null;
  phone: string | null;
  email: string | null;
  preferred_center: string | null;
  best_time: string | null;
  /** Absent until migration 0011 is applied — the store selects `*`. */
  contact_method?: string | null;
  helping_who: string | null;
  concerns: string[] | null;
  note: string | null;
  referred_by: string | null;
  source_page: string | null;
  sms_consent: boolean | null;
  notify_route: string | null;
  notify_env: string | null;
  notify_to: string | null;
  notify_cc: string[] | null;
  notify_hold_state: HoldState | null;
  notify_attempts: number | null;
  notify_failures: FailureEntry[] | null;
};

export type FailureEntry = { at: string; by: ReleasedBy; status: string; error: string };

export interface HeldStore {
  /** Mark a just-saved row as held. False when the write failed. */
  hold(rowId: string, input: { until: Date; env: string; recipients: Recipients }): Promise<boolean>;
  /** The one conditional UPDATE: held → sending (or a stale sending →
   *  sending). Resolves to the row when THIS caller won it, else null. */
  claim(rowId: string, input: { now: Date; staleBefore: Date }): Promise<HeldRow | null>;
  /** Sent: released, with the notify_* columns the old path wrote. */
  released(rowId: string, input: { by: ReleasedBy; result: SendResult & { rfcMessageId: string | null }; hadDetails: boolean; attempts: number }): Promise<void>;
  /** Not sent: back to held (or gave_up), the attempt and failure logged. */
  failed(rowId: string, input: { state: "held" | "gave_up"; result: SendResult; attempts: number; failures: FailureEntry[] }): Promise<void>;
  /** Ids of rows this deployment should send now. */
  due(input: { env: string; now: Date; staleBefore: Date; limit: number }): Promise<string[]>;
  /** The hold state as it is now (for a page-two save waiting on a send). */
  state(rowId: string): Promise<HoldState | null | undefined>;
  heartbeat(name: string): Promise<Heartbeat | undefined>;
  beat(name: string, now: Date): Promise<void>;
}

/** Sends the staff notification for a held row (lib/lead-notification.ts →
 *  sendLeadNotification, with the row's own recipients and arrival time). */
export type Sender = (row: HeldRow, recipients: Recipients) => Promise<SendResult & { rfcMessageId: string | null }>;

const ROUTES = new Set<RouteName>(["guide", "more_info", "concierge", "nashville", "murfreesboro", "fallback"]);

/** The recipients written on the row at hold time. */
export function recipientsOf(row: HeldRow): Recipients | null {
  if (!row.notify_route || !ROUTES.has(row.notify_route as RouteName)) return null;
  return {
    route: row.notify_route as RouteName,
    envVar: row.notify_env,
    to: row.notify_to,
    cc: row.notify_cc ?? [],
    warnings: [],
  };
}

export function hasDetails(row: Pick<HeldRow, "helping_who" | "concerns" | "note" | "referred_by">): boolean {
  return Boolean(row.helping_who || (row.concerns ?? []).length || row.note || row.referred_by);
}

/* ------------------------------------------------------------------ */
/* Release one                                                         */
/* ------------------------------------------------------------------ */

export type ReleaseOutcome =
  | { claimed: false }
  | { claimed: true; sent: boolean; hadDetails: boolean; state: "released" | "held" | "gave_up" };

/**
 * Claim the row and send its notification. Never throws: a sender that
 * throws is a failed attempt like any other.
 */
export async function releaseHeld(
  store: HeldStore,
  send: Sender,
  rowId: string,
  by: ReleasedBy,
  now: Date = new Date(),
  log: Pick<Console, "log" | "error"> = console
): Promise<ReleaseOutcome> {
  let row: HeldRow | null;
  try {
    row = await store.claim(rowId, { now, staleBefore: new Date(now.getTime() - CLAIM_STALE_MS) });
  } catch (err) {
    log.error(`[held notification] lead=${rowId} claim threw: ${err instanceof Error ? err.message : "unknown error"}`);
    return { claimed: false };
  }
  if (!row) return { claimed: false };

  const attempts = (row.notify_attempts ?? 0) + 1;
  const hadDetails = hasDetails(row);
  const recipients = recipientsOf(row);
  let result: SendResult & { rfcMessageId: string | null };
  if (!recipients) {
    result = { status: "failed", messageId: null, error: "no recipients recorded on the row", rfcMessageId: null };
  } else {
    try {
      result = await send(row, recipients);
    } catch (err) {
      result = { status: "failed", messageId: null, error: `threw: ${err instanceof Error ? err.name : "unknown error"}`, rfcMessageId: null };
    }
  }

  if (result.status === "sent") {
    await store.released(rowId, { by, result, hadDetails, attempts });
    log.log(`[held notification] sent lead=${rowId} by=${by} attempt=${attempts} details=${hadDetails ? "yes" : "no"} resend_id=${result.messageId ?? "?"}`);
    return { claimed: true, sent: true, hadDetails, state: "released" };
  }

  const age = now.getTime() - Date.parse(row.created_at);
  const state = Number.isFinite(age) && age > GIVE_UP_MS ? "gave_up" : "held";
  const failures = [
    ...(row.notify_failures ?? []),
    { at: now.toISOString(), by, status: result.status, error: result.error },
  ].slice(-FAILURE_LOG_MAX);
  await store.failed(rowId, { state, result, attempts, failures });
  log.error(
    state === "gave_up"
      ? `[held notification] GAVE UP lead=${rowId} after ${attempts} attempts over 24 h — last error "${result.error}". Call this lead from the saved row.`
      : `[held notification] NOT sent (${result.status}) lead=${rowId} by=${by} attempt=${attempts} error="${result.error}" — retried on the next run`
  );
  return { claimed: true, sent: false, hadDetails, state };
}

/** Everything due for this deployment, oldest first, one at a time. */
export async function releaseDue(
  store: HeldStore,
  send: Sender,
  input: { env: string; by: ReleasedBy; now?: Date; limit?: number },
  log: Pick<Console, "log" | "error"> = console
): Promise<{ due: number; sent: number; failed: number }> {
  const now = input.now ?? new Date();
  let ids: string[];
  try {
    ids = await store.due({ env: input.env, now, staleBefore: new Date(now.getTime() - CLAIM_STALE_MS), limit: input.limit ?? 20 });
  } catch (err) {
    log.error(`[held notification] due query failed: ${err instanceof Error ? err.message : "unknown error"}`);
    return { due: 0, sent: 0, failed: 0 };
  }
  let sent = 0;
  let failed = 0;
  for (const id of ids) {
    const r = await releaseHeld(store, send, id, input.by, now, log);
    if (r.claimed && r.sent) sent++;
    else if (r.claimed) failed++;
  }
  return { due: ids.length, sent, failed };
}

/* ------------------------------------------------------------------ */
/* A page-two save                                                     */
/* ------------------------------------------------------------------ */

/**
 * What a page-two save should do about the staff email, given the hold
 * state its own UPDATE returned (the UPDATE and every claim are row-locked
 * against each other, so that state says which came first):
 *
 *   held      → nothing has been sent: claim it and send ONE email with the
 *               details. If the claim is lost, the winner claimed after this
 *               save committed, so its email carries the details too.
 *   sending   → a send claimed BEFORE this save: wait for it, then send the
 *               "Details added" update (or, if it failed back to held,
 *               claim and send the whole lead with the details).
 *   released / gave_up / null (never held: the old path, a fallback send)
 *             → the existing "Details added" update.
 */
export async function onPageTwoSaved(
  store: HeldStore,
  send: Sender,
  rowId: string,
  stateAfterSave: HoldState | null,
  sendDetailsUpdate: () => Promise<void>,
  opts: { now?: () => Date; sleep?: (ms: number) => Promise<void>; waitMs?: number } = {},
  log: Pick<Console, "log" | "error"> = console
): Promise<"sent_with_details" | "winner_has_details" | "details_update"> {
  const now = opts.now ?? (() => new Date());
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  let state = stateAfterSave;

  if (state === "sending") {
    const deadline = Date.now() + (opts.waitMs ?? IN_FLIGHT_WAIT_MS);
    while (state === "sending" && Date.now() < deadline) {
      await sleep(400);
      state = (await store.state(rowId).catch(() => undefined)) ?? state;
    }
    if (state === "held") {
      // The in-flight send failed and went back to the queue: this save's
      // claim sends the whole lead, details included.
      const r = await releaseHeld(store, send, rowId, "page_two", now(), log);
      if (r.claimed) return "sent_with_details";
    }
    // Sent without these details (or still in flight after the wait — the
    // update then goes on its own, carrying the whole lead if need be).
    await sendDetailsUpdate();
    return "details_update";
  }

  if (state === "held") {
    const r = await releaseHeld(store, send, rowId, "page_two", now(), log);
    return r.claimed ? "sent_with_details" : "winner_has_details";
  }

  await sendDetailsUpdate();
  return "details_update";
}
