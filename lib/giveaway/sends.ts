/**
 * Scheduled emails (GIVEAWAY-PLAN.md §3 scheduled_sends, §4 Emails):
 *
 *   its_live          Sun Nov 15 6 pm  → reminder signups: the one-tap link
 *                                        to their entry form
 *   monday_reminder   Mon Nov 16 9 am  → signups who have not tapped
 *   daily_<day>       Mon–Fri 4 pm,    → the drawing-week countdown email
 *                     Sat 9 am           (Ben, 2026-11-04): every verified,
 *                                        subscribed entrant, with their own
 *                                        entry count
 *   thank_you         Sat Nov 21 7 pm  → the gift reveal: every verified,
 *                                        subscribed entrant, winners too
 *                                        (fix list rev 2, P0-10)
 *   gift_reminder     Tue Dec 1 9 am   → verified, subscribed entrants
 *   gift_last_call    Thu Dec 3 9 am     whose code is unredeemed (P1-4)
 *
 * One JOB row per kind (person_id null) is the schedule; the per-minute
 * runner claims a due job and sends to each recipient, writing a RECEIPT
 * row (kind, due_at, person_id | notify_id) first — unique, so a runner
 * that dies mid-broadcast resumes without a second email to anyone. The job
 * is marked sent when every receipt is. The Dec 1 reminder is added after
 * Nov 21 (decision 15).
 *
 * A refused send is tried again (2026-11-16, the day Resend's daily quota
 * ran out at 8:34 am and the 9 am reminder was marked done with nobody
 * sent): a receipt that carries an error and no sent_at is taken back on the
 * next run, for RETRY_WINDOW_MS after the job was due, and the job stays
 * open until nothing is left to retry. A refusal about the message itself
 * (an address Resend will not accept) is final. Each send carries the
 * receipt's id as Resend's Idempotency-Key, so a retry after a runner died
 * between the send and the stamp cannot become a second email. A run stops
 * itself at RUN_BUDGET_MS and the next minute carries on.
 *
 * Two repair jobs are never scheduled by themselves — a row is inserted by
 * hand when one is needed: youre_in_resend[_plan] (the "You're in" email
 * to every entrant Resend's own sent log does not show it for) and
 * staff_alert_resend_<slot> (the staff winner alert again; reads the
 * winner, writes nothing to it).
 *
 * The sender is passed in (tests send nothing; the cron route sends through
 * lib/giveaway/send.ts).
 */

import { audit } from "./audit";
import { DRAWINGS, SCHEDULE, drawing } from "./config";
import { giftReminderEmail, hypeEmail, hypeSendAt, itsLiveEmail, mondayReminderEmail, thankYouEmail, youreInEmail, type Email, type Footing, type HypeDay } from "./emails";
import { entryCount } from "./people";
import { type NotifyRow, type PersonRow, type ScheduledSendRow } from "./rows";
import { isBadAddress } from "./recipients";
import type { GiveawayStore } from "./store";

export const SEND_KINDS = ["its_live", "monday_reminder", "daily_mon", "daily_tue", "daily_wed", "daily_thu", "daily_fri", "daily_sat", "thank_you", "gift_reminder", "gift_last_call"] as const;
export type SendKind = (typeof SEND_KINDS)[number];

export const JOB_STALE_MS = 10 * 60_000;
/** How long after a job was due a refused send is still retried. */
export const RETRY_WINDOW_MS = 6 * 60 * 60_000;
/** A run stops sending here (the cron function is cut off at 60 s). */
export const RUN_BUDGET_MS = 40_000;
/** Retryable refusals in a row that end a run (the next minute tries again). */
export const RUN_STRIKES = 3;
/** A receipt claimed this long ago with no result: its runner died. */
export const RECEIPT_STALE_MS = 5 * 60_000;

/** Hand-inserted repair jobs (see the file comment). */
export const RESEND_YOURE_IN = "youre_in_resend";
export const RESEND_YOURE_IN_PLAN = "youre_in_resend_plan";
export const RESEND_STAFF_ALERT_PREFIX = "staff_alert_resend_";
/** Fewer "You're in" emails than this in Resend's sent log means the log was not read properly: refuse to resend. */
export const RESEND_MIN_LOGGED = 100;
/** Addresses that can never be delivered (RFC 2606) — never resent to. */
const RESERVED_DOMAIN = /@(?:[^@]*\.)?(?:example\.(?:com|org|net)|[^@.]+\.(?:test|invalid|example)|localhost)$/i;

/**
 * Worth another try? The quota or rate limit (429), Resend's own trouble
 * (5xx), the network, a missing key. A 4xx about the message itself is
 * final, and so is the [DRAFT] lock.
 */
export function retryable(error: string | null | undefined): boolean {
  if (!error) return true;
  if (/refusing to send \[DRAFT\]/.test(error)) return false;
  if (isBadAddress(error)) return false;
  const m = /^Resend (\d{3})/.exec(error);
  if (!m) return true;
  const status = Number(m[1]);
  return status === 429 || status === 408 || status >= 500;
}

/** When each job is due. */
export function dueAt(kind: SendKind): Date {
  if (kind === "its_live") return SCHEDULE.entriesOpen.at;
  if (kind === "monday_reminder") return SCHEDULE.mondayReminder.at;
  if (kind === "thank_you") return SCHEDULE.thankYouSend.at;
  if (kind === "gift_reminder") return SCHEDULE.offerReminder.at;
  if (kind === "gift_last_call") return SCHEDULE.offerLastCall.at;
  return hypeSendAt(kind.slice("daily_".length) as HypeDay);
}

/** Create the job rows for this env (idempotent). */
export async function scheduleJobs(store: GiveawayStore): Promise<number> {
  // Not an upsert: 0010's uniqueness is an EXPRESSION index (coalesce on the
  // recipient columns), which PostgREST cannot name as an ON CONFLICT target
  // — on the real database that upsert scheduled nothing (found by
  // check:giveaway --db, 2026-11-03). Insert each missing job; a duplicate
  // from a concurrent run (23505) means it is already scheduled.
  const { data: existing, error: readErr } = await store.select("scheduled_sends", "kind, due_at").is("person_id", null).is("notify_id", null);
  if (readErr) throw new Error(`schedule: ${readErr.message}`);
  const have = new Set(((existing ?? []) as Array<{ kind: string; due_at: string }>).map((r) => `${r.kind}|${new Date(r.due_at).getTime()}`));
  for (const kind of SEND_KINDS) {
    const due = dueAt(kind);
    if (have.has(`${kind}|${due.getTime()}`)) continue;
    const { error } = await store.insert("scheduled_sends", { kind, due_at: due.toISOString(), person_id: null, notify_id: null });
    if (error && error.code !== "23505") throw new Error(`schedule: ${error.message}`);
  }
  return SEND_KINDS.length;
}

export type SendDeps = {
  /** Deliver one email; resolve with Resend's id or an error string. */
  /** `skipped`: deliberately not sent (a test address) — recorded as skipped, never retried, never a failure. */
  send: (input: { to: string; email: Email; marketing: boolean; footing: Footing | null; cc?: string[]; idempotencyKey?: string }) => Promise<{ ok: boolean; messageId: string | null; error: string | null; skipped?: boolean }>;
  footingFor: (email: string, marketing: boolean) => Footing;
  links: { enterUrl: (notifyId: string) => string; referralUrl: (code: string) => string; bookUrl: (offerCode: string) => string };
  log?: Pick<Console, "log" | "error">;
  /** Wall clock for the run budget (default Date.now) and the budget itself. */
  clock?: () => number;
  budgetMs?: number;
  /** Told once per job that had a send refused (the failure alert). */
  onFailure?: (info: { kind: string; failed: number; error: string; willRetry: boolean }) => Promise<void> | void;
  /** Resend's own list of accepted emails since a time — the resend job's proof of who already has one. */
  sentLog?: (since: Date) => Promise<Array<{ to: string[]; subject: string }>>;
  /** The staff winner alert for a drawn slot, built and addressed (lib/giveaway/notify.ts); null when there is no winner or nobody to send to. */
  staffAlert?: (slot: string) => Promise<{ personId: string; to: string; cc: string[]; email: Email } | null>;
};

export type RunSendsOutcome = { jobs: number; sent: number; skipped: number; failed: number };

/** Every due job, oldest first. */
export async function runDueSends(store: GiveawayStore, now: Date, deps: SendDeps): Promise<RunSendsOutcome> {
  const log = deps.log ?? console;
  const out: RunSendsOutcome = { jobs: 0, sent: 0, skipped: 0, failed: 0 };
  const clock = deps.clock ?? Date.now;
  const stopAt = clock() + (deps.budgetMs ?? RUN_BUDGET_MS);
  // Stops at the budget, and after RUN_STRIKES refusals in a row: when the provider is refusing everything (a quota), three tries a minute find out as well as three hundred.
  const run: Run = { strikes: 0, over: () => clock() >= stopAt || run.strikes >= RUN_STRIKES };
  const { data, error } = await store.select("scheduled_sends", "*").is("person_id", null).is("notify_id", null).is("sent_at", null).is("skipped_reason", null).lte("due_at", now.toISOString()).order("due_at");
  if (error) {
    log.error(`[giveaway sends] due query failed: ${error.message}`);
    return out;
  }
  for (const job of (data ?? []) as ScheduledSendRow[]) {
    const stale = new Date(now.getTime() - JOB_STALE_MS).toISOString();
    // Claim: unclaimed, or claimed too long ago (a runner that died).
    const first = await store.update("scheduled_sends", { claimed_at: now.toISOString() }).eq("id", job.id).is("claimed_at", null).select("id");
    let mine = (first.data?.length ?? 0) > 0;
    if (!mine) {
      const again = await store.update("scheduled_sends", { claimed_at: now.toISOString() }).eq("id", job.id).lt("claimed_at", stale).select("id");
      mine = (again.data?.length ?? 0) > 0;
    }
    if (!mine) continue;
    out.jobs++;
    try {
      const r = await runJob(store, job, now, deps, log, run);
      out.sent += r.sent;
      out.skipped += r.skipped;
      out.failed += r.failed;
      // Done only when nothing is left to retry and the run was not cut short; until then the next minute carries on.
      const open = r.retry > 0 || r.incomplete;
      if (!open) await store.update("scheduled_sends", { sent_at: now.toISOString(), skipped_reason: r.reason ?? null, claimed_at: null, error: r.undelivered ? `${r.undelivered} not delivered` : null }).eq("id", job.id);
      else await store.update("scheduled_sends", { claimed_at: null, error: r.retry ? `${r.retry} to retry` : null }).eq("id", job.id);
      // One audit row when something was sent and one when the job closes — not one a minute while it waits on a refusing provider (the log and the failure alert carry those).
      if (r.sent || !open) await audit(store, { actor: "cron", action: "send_job", targetTable: "scheduled_sends", targetId: job.id, after: { kind: job.kind, sent: r.sent, skipped: r.skipped, failed: r.failed, retry: r.retry, undelivered: r.undelivered, incomplete: r.incomplete, done: !open, ...(r.reason ? { reason: r.reason } : {}), ...(r.plan ? { plan: r.plan } : {}) } });
      // The alert is for the provider or the setup going wrong — not for one bad address (Ben, 2026-11-18), which is logged where it happened.
      if (r.alertable && deps.onFailure) {
        try {
          await deps.onFailure({ kind: job.kind, failed: r.alertable, error: r.lastError ?? "unknown", willRetry: r.retry > 0 });
        } catch (err) {
          log.error(`[giveaway sends] failure alert threw: ${err instanceof Error ? err.message : "unknown"}`);
        }
      }
    } catch (err) {
      out.failed++;
      log.error(`[giveaway sends] ${job.kind}: ${err instanceof Error ? err.message : "unknown error"}`);
      await store.update("scheduled_sends", { claimed_at: null, error: (err instanceof Error ? err.message : "unknown").slice(0, 300) }).eq("id", job.id);
    }
  }
  return out;
}

type Run = { strikes: number; over: () => boolean };

type JobResult = {
  sent: number;
  skipped: number;
  /** Refused in this run, retryable or not. */
  failed: number;
  /** Of those, and of earlier ones still waiting: will be tried again. */
  retry: number;
  /** Refused for good (a final error, or the retry window closed). */
  undelivered: number;
  /** Refused in this run for a reason other than a bad address: worth the failure alert. */
  alertable: number;
  /** The run stopped before every recipient was reached, or another runner holds a receipt. */
  incomplete: boolean;
  lastError?: string;
  reason?: string;
  plan?: Record<string, number>;
};

function emptyResult(): JobResult {
  return { sent: 0, skipped: 0, failed: 0, retry: 0, undelivered: 0, alertable: 0, incomplete: false };
}

async function runJob(store: GiveawayStore, job: ScheduledSendRow, now: Date, deps: SendDeps, log: Pick<Console, "log" | "error">, run: Run): Promise<JobResult> {
  const kind = job.kind as SendKind;
  if (kind === "its_live" || kind === "monday_reminder") return notifyJob(store, job, kind, now, deps, log, run);
  if (kind === "thank_you") return thankYouJob(store, job, now, deps, log, run);
  if (kind === "gift_reminder" || kind === "gift_last_call") return giftReminderJob(store, job, kind, now, deps, log, run);
  if (kind.startsWith("daily_")) return dailyJob(store, job, kind, now, deps, log, run);
  if (job.kind === RESEND_YOURE_IN || job.kind === RESEND_YOURE_IN_PLAN) return youreInResendJob(store, job, now, deps, log, run);
  if (job.kind.startsWith(RESEND_STAFF_ALERT_PREFIX)) return staffAlertResendJob(store, job, now, deps, log, run);
  return { ...emptyResult(), skipped: 1, reason: `unknown kind ${kind}` };
}

/** Every receipt this job already holds, by recipient (read in pages: PostgREST caps a read at 1,000 rows). */
async function receiptsOf(store: GiveawayStore, job: ScheduledSendRow): Promise<Map<string, ScheduledSendRow>> {
  const map = new Map<string, ScheduledSendRow>();
  for (let from = 0; ; from += 1000) {
    const { data, error } = await store.select("scheduled_sends", "*").eq("kind", job.kind).eq("due_at", job.due_at).order("id").range(from, from + 999);
    if (error) throw new Error(`receipts: ${error.message}`);
    const rows = (data ?? []) as ScheduledSendRow[];
    for (const r of rows) {
      const who = r.person_id ?? r.notify_id;
      if (who) map.set(who, r);
    }
    if (rows.length < 1000) return map;
  }
}

type Why = "sent" | "skipped" | "final" | "expired" | "inflight";
type Taken = { id: string } | { id: null; why: Why };

/**
 * The receipt for one recipient: a new row, or an earlier one whose send was
 * refused and may be tried again. `id: null` says why not — already sent, a
 * final refusal, the retry window closed, or another runner has it.
 */
async function take(store: GiveawayStore, job: ScheduledSendRow, who: { person_id?: string; notify_id?: string }, now: Date, held: Map<string, ScheduledSendRow>): Promise<Taken> {
  let existing = held.get((who.person_id ?? who.notify_id) as string) ?? null;
  if (!existing) {
    const { data, error } = await store.insert("scheduled_sends", { kind: job.kind, due_at: job.due_at, person_id: who.person_id ?? null, notify_id: who.notify_id ?? null, claimed_at: now.toISOString() }).select("id");
    if (!error) return { id: String((data as Array<{ id: string }>)[0]?.id) };
    if (error.code !== "23505") throw new Error(`receipt: ${error.message}`);
    // Written by another runner since the read above.
    let q = store.select("scheduled_sends", "*").eq("kind", job.kind).eq("due_at", job.due_at);
    q = who.person_id ? q.eq("person_id", who.person_id) : q.eq("notify_id", who.notify_id as string);
    existing = ((await q.maybeSingle()).data as ScheduledSendRow | null) ?? null;
    if (!existing) return { id: null, why: "inflight" };
  }
  if (existing.sent_at) return { id: null, why: "sent" };
  if (existing.skipped_reason) return { id: null, why: "skipped" };
  if (existing.claimed_at && now.getTime() - new Date(existing.claimed_at).getTime() < RECEIPT_STALE_MS) return { id: null, why: "inflight" };
  if (!retryable(existing.error)) return { id: null, why: "final" };
  if (now.getTime() - new Date(job.due_at).getTime() > RETRY_WINDOW_MS) return { id: null, why: "expired" };
  // Take it back — only if nobody else has in the meantime.
  let claim = store.update("scheduled_sends", { claimed_at: now.toISOString() }).eq("id", existing.id).is("sent_at", null);
  claim = existing.claimed_at ? claim.eq("claimed_at", existing.claimed_at) : claim.is("claimed_at", null);
  const got = await claim.select("id");
  if ((got.data?.length ?? 0) === 0) return { id: null, why: "inflight" };
  return { id: existing.id };
}

/** Count a recipient that was not sent to in this run. */
function passOver(out: JobResult, t: { id: null; why: Why }) {
  out.skipped++;
  if (t.why === "inflight") out.incomplete = true;
  else if (t.why !== "sent" && t.why !== "skipped") out.undelivered++;
}

/**
 * Record the result on the receipt and in the job's tally. "skipped" (a test
 * address) closes the receipt without a failure; a bad address (Resend's
 * 422) is final and does not count against the provider; only a refusal
 * worth retrying counts toward the three-in-a-row stop.
 */
async function settle(store: GiveawayStore, job: ScheduledSendRow, receiptId: string, r: { ok: boolean; messageId: string | null; error: string | null; skipped?: boolean }, now: Date, out: JobResult, run: Run): Promise<"sent" | "skipped" | "failed"> {
  if (r.skipped) {
    await store.update("scheduled_sends", { skipped_reason: (r.error ?? "skipped").slice(0, 300), claimed_at: null }).eq("id", receiptId);
    out.skipped++;
    return "skipped";
  }
  await store.update("scheduled_sends", r.ok ? { sent_at: now.toISOString(), message_id: r.messageId, claimed_at: null, error: null } : { error: r.error, claimed_at: null }).eq("id", receiptId);
  if (r.ok) {
    out.sent++;
    run.strikes = 0;
    return "sent";
  }
  out.failed++;
  const again = retryable(r.error);
  if (again) run.strikes++;
  if (!isBadAddress(r.error)) {
    out.alertable++;
    out.lastError = r.error ?? "unknown";
  }
  if (again && now.getTime() - new Date(job.due_at).getTime() <= RETRY_WINDOW_MS) out.retry++;
  else out.undelivered++;
  return "failed";
}

async function notifyJob(store: GiveawayStore, job: ScheduledSendRow, kind: "its_live" | "monday_reminder", now: Date, deps: SendDeps, log: Pick<Console, "log" | "error">, run: Run): Promise<JobResult> {
  const { data, error } = await store.select("giveaway_notify", "*").not("verified_at", "is", null).is("tapped_at", null).is("unsubscribed_at", null);
  if (error) throw new Error(error.message);
  const first = drawing("mon");
  const out = emptyResult();
  const held = await receiptsOf(store, job);
  for (const n of (data ?? []) as NotifyRow[]) {
    if (run.over()) {
      out.incomplete = true;
      break;
    }
    const t = await take(store, job, { notify_id: n.id }, now, held);
    if (t.id === null) {
      passOver(out, t);
      continue;
    }
    const footing = deps.footingFor(n.email, true);
    const input = { firstName: n.first_name ?? "", enterUrl: deps.links.enterUrl(n.id), firstDrawing: first, footing };
    const email = kind === "its_live" ? itsLiveEmail(input) : mondayReminderEmail(input);
    const r = await deps.send({ to: n.email, email, marketing: true, footing, idempotencyKey: t.id });
    const result = await settle(store, job, t.id, r, now, out, run);
    if (result === "sent") await store.update("giveaway_notify", kind === "its_live" ? { sent_live_at: now.toISOString() } : { reminded_at: now.toISOString() }).eq("id", n.id);
    else if (result === "failed") log.error(`[giveaway sends] ${kind} to notify ${n.id}: ${r.error}`);
  }
  return out;
}

async function subscribedEntrants(store: GiveawayStore): Promise<PersonRow[]> {
  // In pages: PostgREST caps one read at 1,000 rows, and a countdown email must not stop at the thousandth entrant.
  const out: PersonRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await store.select("giveaway_people", "*").not("verified_at", "is", null).is("unsubscribed_at", null).order("id").range(from, from + 999);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as PersonRow[];
    out.push(...rows);
    if (rows.length < 1000) return out;
  }
}

async function dailyJob(store: GiveawayStore, job: ScheduledSendRow, kind: SendKind, now: Date, deps: SendDeps, log: Pick<Console, "log" | "error">, run: Run): Promise<JobResult> {
  const day = kind.slice("daily_".length) as HypeDay;
  const out = emptyResult();
  const held = await receiptsOf(store, job);
  // subscribedEntrants(): verified and NOT unsubscribed, read at send time.
  for (const p of await subscribedEntrants(store)) {
    if (run.over()) {
      out.incomplete = true;
      break;
    }
    const t = await take(store, job, { person_id: p.id }, now, held);
    if (t.id === null) {
      passOver(out, t);
      continue;
    }
    const footing = deps.footingFor(p.email, true);
    // This entrant's own valid (unvoided) entries, counted now.
    const email = hypeEmail({ day, entries: await entryCount(store, p.id), referralUrl: deps.links.referralUrl(p.referral_code), footing });
    const r = await deps.send({ to: p.email, email, marketing: true, footing, idempotencyKey: t.id });
    if ((await settle(store, job, t.id, r, now, out, run)) === "failed") log.error(`[giveaway sends] ${kind} to ${p.id}: ${r.error}`);
  }
  return out;
}

async function thankYouJob(store: GiveawayStore, job: ScheduledSendRow, now: Date, deps: SendDeps, log: Pick<Console, "log" | "error">, run: Run): Promise<JobResult> {
  // Everyone, winners included (Ben, 2026-11-03): the copy greets both.
  const out = emptyResult();
  const held = await receiptsOf(store, job);
  for (const p of await subscribedEntrants(store)) {
    if (run.over()) {
      out.incomplete = true;
      break;
    }
    const t = await take(store, job, { person_id: p.id }, now, held);
    if (t.id === null) {
      passOver(out, t);
      continue;
    }
    const { data: offer } = await store.select("giveaway_offers", "code").eq("person_id", p.id).maybeSingle();
    const code = (offer as { code: string } | null)?.code ?? "";
    const footing = deps.footingFor(p.email, true);
    const email = thankYouEmail({ firstName: p.first_name, offerCode: code, bookUrl: deps.links.bookUrl(code), footing });
    const r = await deps.send({ to: p.email, email, marketing: true, footing, idempotencyKey: t.id });
    if ((await settle(store, job, t.id, r, now, out, run)) === "failed") log.error(`[giveaway sends] thank_you to ${p.id}: ${r.error}`);
  }
  return out;
}

/** P1-4: the code again to everyone verified, subscribed and unredeemed. */
async function giftReminderJob(store: GiveawayStore, job: ScheduledSendRow, kind: "gift_reminder" | "gift_last_call", now: Date, deps: SendDeps, log: Pick<Console, "log" | "error">, run: Run): Promise<JobResult> {
  const { data: offers, error } = await store.select("giveaway_offers", "person_id, code, redeemed_at");
  if (error) throw new Error(`offers: ${error.message}`);
  const open = new Map(((offers ?? []) as Array<{ person_id: string; code: string; redeemed_at: string | null }>).filter((o) => !o.redeemed_at).map((o) => [o.person_id, o.code]));
  const out = emptyResult();
  const held = await receiptsOf(store, job);
  for (const p of await subscribedEntrants(store)) {
    const code = open.get(p.id);
    if (!code) continue;
    if (run.over()) {
      out.incomplete = true;
      break;
    }
    const t = await take(store, job, { person_id: p.id }, now, held);
    if (t.id === null) {
      passOver(out, t);
      continue;
    }
    const footing = deps.footingFor(p.email, true);
    const email = giftReminderEmail({ kind: kind === "gift_reminder" ? "reminder" : "last_call", firstName: p.first_name, offerCode: code, bookUrl: deps.links.bookUrl(code), footing });
    const r = await deps.send({ to: p.email, email, marketing: true, footing, idempotencyKey: t.id });
    if ((await settle(store, job, t.id, r, now, out, run)) === "failed") log.error(`[giveaway sends] ${kind} to ${p.id}: ${r.error}`);
  }
  return out;
}

/* ── Repair jobs (hand-inserted; see the file comment) ───────────────── */

async function allPeople(store: GiveawayStore): Promise<PersonRow[]> {
  const out: PersonRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await store.select("giveaway_people", "*").not("verified_at", "is", null).order("id").range(from, from + 999);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as PersonRow[];
    out.push(...rows);
    if (rows.length < 1000) return out;
  }
}

/**
 * "You're in" to every entrant Resend's sent log does not show it for —
 * once each (the receipt, then the Idempotency-Key). Not to an unsubscribed
 * entrant, and not to an address that cannot exist. The _plan kind counts
 * and sends nothing. Refuses when the sent log looks unread (fewer than
 * RESEND_MIN_LOGGED "You're in" emails in it): a failed read must never
 * turn into an email to everybody.
 */
async function youreInResendJob(store: GiveawayStore, job: ScheduledSendRow, now: Date, deps: SendDeps, log: Pick<Console, "log" | "error">, run: Run): Promise<JobResult> {
  if (!deps.sentLog) throw new Error("youre_in_resend: no sent log to check against");
  const out = emptyResult();
  if (run.over()) return { ...out, incomplete: true };
  const people = await allPeople(store);
  const next = DRAWINGS.find((d) => d.at.getTime() > now.getTime()) ?? null;
  const blank: Footing = deps.footingFor("nobody@example.test", true);
  const subjects = new Set([true, false].map((referredBonus) => youreInEmail({ firstName: "", referredBonus, nextDrawing: next, referralUrl: "", footing: blank }).subject));
  const log_ = await deps.sentLog(new Date(SCHEDULE.entriesOpen.at.getTime() - 60 * 60_000));
  const has = new Set<string>();
  let logged = 0;
  for (const row of log_) {
    if (!subjects.has(row.subject)) continue;
    logged++;
    for (const to of row.to) has.add(to.trim().toLowerCase());
  }
  if (logged < RESEND_MIN_LOGGED) throw new Error(`youre_in_resend: only ${logged} "You're in" emails in the sent log (${log_.length} rows read) — refusing`);
  // Receipts of the sending job count in the plan too, so a plan made after a partial run is true.
  const sendJob = { ...job, kind: RESEND_YOURE_IN } as ScheduledSendRow;
  const plan = { entrants: people.length, logged, already: 0, unsubscribed: 0, reserved: 0, to_send: 0 };
  const todo: PersonRow[] = [];
  for (const p of people) {
    if (has.has(p.email.trim().toLowerCase()) || has.has(p.email_display.trim().toLowerCase())) plan.already++;
    else if (p.unsubscribed_at) plan.unsubscribed++;
    else if (RESERVED_DOMAIN.test(p.email)) plan.reserved++;
    else todo.push(p);
  }
  plan.to_send = todo.length;
  out.plan = plan;
  log.log(`[giveaway sends] ${job.kind}: ${JSON.stringify(plan)}`);
  if (job.kind === RESEND_YOURE_IN_PLAN) return out;
  const held = await receiptsOf(store, sendJob);
  for (const p of todo) {
    if (run.over()) {
      out.incomplete = true;
      break;
    }
    const t = await take(store, sendJob, { person_id: p.id }, now, held);
    if (t.id === null) {
      passOver(out, t);
      continue;
    }
    const bonus = await store.select("giveaway_entries", "id").eq("person_id", p.id).eq("kind", "referred_bonus").is("void_reason", null).maybeSingle();
    // The email exactly as the signup sends it (lib/giveaway/web.ts → sendYoureIn).
    const footing = deps.footingFor(p.email, true);
    const email = youreInEmail({ firstName: p.first_name, referredBonus: Boolean(bonus.data), nextDrawing: next, referralUrl: deps.links.referralUrl(p.referral_code), footing });
    const r = await deps.send({ to: p.email, email, marketing: false, footing, idempotencyKey: t.id });
    if ((await settle(store, sendJob, t.id, r, now, out, run)) === "failed") log.error(`[giveaway sends] ${job.kind} to ${p.id}: ${r.error}`);
  }
  return out;
}

/** The staff winner alert for one drawn slot, again, once. Reads the winner; writes only its own receipt. */
async function staffAlertResendJob(store: GiveawayStore, job: ScheduledSendRow, now: Date, deps: SendDeps, log: Pick<Console, "log" | "error">, run: Run): Promise<JobResult> {
  if (!deps.staffAlert) throw new Error("staff_alert_resend: no alert builder");
  if (run.over()) return { ...emptyResult(), incomplete: true };
  const slot = job.kind.slice(RESEND_STAFF_ALERT_PREFIX.length);
  const alert = await deps.staffAlert(slot);
  if (!alert) throw new Error(`staff_alert_resend: no winner or no recipient for ${slot}`);
  const out = emptyResult();
  const t = await take(store, job, { person_id: alert.personId }, now, await receiptsOf(store, job));
  if (t.id === null) {
    passOver(out, t);
    return out;
  }
  const r = await deps.send({ to: alert.to, cc: alert.cc, email: alert.email, marketing: false, footing: null, idempotencyKey: t.id });
  if ((await settle(store, job, t.id, r, now, out, run)) === "failed") log.error(`[giveaway sends] ${job.kind}: ${r.error}`);
  out.plan = { recipients: 1 + alert.cc.length };
  return out;
}

/** For the admin dashboard: the jobs and their state. */
export async function jobStatus(store: GiveawayStore): Promise<Array<{ kind: string; due_at: string; sent_at: string | null; skipped_reason: string | null; error: string | null; receipts: number }>> {
  const { data } = await store.select("scheduled_sends", "*").order("due_at");
  const rows = (data ?? []) as ScheduledSendRow[];
  return rows
    .filter((r) => !r.person_id && !r.notify_id)
    .map((job) => ({ kind: job.kind, due_at: job.due_at, sent_at: job.sent_at, skipped_reason: job.skipped_reason, error: job.error, receipts: rows.filter((r) => r.kind === job.kind && (r.person_id || r.notify_id) && r.sent_at).length }));
}

export { DRAWINGS };
