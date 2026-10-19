/**
 * Scheduled emails (GIVEAWAY-PLAN.md §3 scheduled_sends, §4 Emails):
 *
 *   its_live          Sun Nov 15 6 pm  → verified notify-me signups, one-tap
 *   monday_reminder   Mon Nov 16 9 am  → signups who have not tapped
 *   daily_<slot>      Mon–Fri 4 pm     → every verified, subscribed entrant
 *   tuesday_call_today Tue 8:30 am     → staff, skipped if Monday's winner
 *                                        is marked contacted
 *   thank_you         Sun Nov 22 10 am → every verified entrant who is not
 *                                        holding a prize
 *
 * One JOB row per kind (person_id null) is the schedule; the per-minute
 * runner claims a due job and sends to each recipient, writing a RECEIPT
 * row (kind, due_at, person_id | notify_id) first — unique, so a runner
 * that dies mid-broadcast resumes without a second email to anyone. The job
 * is marked sent when every receipt is. The Dec 1 reminder is added after
 * Nov 21 (decision 15).
 *
 * The sender is passed in (tests send nothing; the cron route sends through
 * lib/giveaway/send.ts).
 */

import { audit } from "./audit";
import { DRAWINGS, SCHEDULE, drawing, drawingAfter, prizeVersionFor, type Drawing } from "./config";
import { dailyAfternoonEmail, itsLiveEmail, mondayReminderEmail, thankYouEmail, tuesdayCallTodayEmail, type Email, type Footing } from "./emails";
import { entryCount } from "./people";
import { HOLDING_STATUSES, type NotifyRow, type PersonRow, type ScheduledSendRow, type WinnerRow } from "./rows";
import type { GiveawayStore } from "./store";
import { currentWinner, drawingBySlot } from "./drawings";

export const SEND_KINDS = ["its_live", "monday_reminder", "daily_mon", "daily_tue", "daily_wed", "daily_thu", "daily_fri", "tuesday_call_today", "thank_you"] as const;
export type SendKind = (typeof SEND_KINDS)[number];

export const JOB_STALE_MS = 10 * 60_000;

/** When each job is due. */
export function dueAt(kind: SendKind): Date {
  if (kind === "its_live") return SCHEDULE.entriesOpen.at;
  if (kind === "monday_reminder") return SCHEDULE.mondayReminder.at;
  if (kind === "tuesday_call_today") return SCHEDULE.tuesdayCallToday.at;
  if (kind === "thank_you") return SCHEDULE.thankYouSend.at;
  const slot = kind.slice("daily_".length) as Drawing["slot"];
  const d = drawing(slot);
  if (!d.dailyEmailAt) throw new Error(`${kind} has no email time`);
  return d.dailyEmailAt;
}

/** Create the job rows for this env (idempotent). */
export async function scheduleJobs(store: GiveawayStore): Promise<number> {
  const rows = SEND_KINDS.map((kind) => ({ kind, due_at: dueAt(kind).toISOString(), person_id: null, notify_id: null }));
  const { error } = await store.upsert("scheduled_sends", rows, { onConflict: "env,kind,due_at,person_id,notify_id", ignoreDuplicates: true });
  if (error) throw new Error(`schedule: ${error.message}`);
  return rows.length;
}

export type SendDeps = {
  /** Deliver one email; resolve with Resend's id or an error string. */
  send: (input: { to: string; email: Email; marketing: boolean; footing: Footing | null; cc?: string[] }) => Promise<{ ok: boolean; messageId: string | null; error: string | null }>;
  footingFor: (email: string, marketing: boolean) => Footing;
  links: { enterUrl: (notifyId: string) => string; referralUrl: (code: string) => string; bookUrl: (offerCode: string) => string; adminUrl: string };
  staffRecipients: () => { to: string | null; cc: string[] };
  log?: Pick<Console, "log" | "error">;
};

export type RunSendsOutcome = { jobs: number; sent: number; skipped: number; failed: number };

/** Every due job, oldest first. */
export async function runDueSends(store: GiveawayStore, now: Date, deps: SendDeps): Promise<RunSendsOutcome> {
  const log = deps.log ?? console;
  const out: RunSendsOutcome = { jobs: 0, sent: 0, skipped: 0, failed: 0 };
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
      const r = await runJob(store, job, now, deps, log);
      out.sent += r.sent;
      out.skipped += r.skipped;
      out.failed += r.failed;
      if (r.failed === 0) await store.update("scheduled_sends", { sent_at: now.toISOString(), skipped_reason: r.reason ?? null, claimed_at: null }).eq("id", job.id);
      else await store.update("scheduled_sends", { claimed_at: null, error: `${r.failed} failed` }).eq("id", job.id);
      await audit(store, { actor: "cron", action: "send_job", targetTable: "scheduled_sends", targetId: job.id, after: { kind: job.kind, ...r } });
    } catch (err) {
      out.failed++;
      log.error(`[giveaway sends] ${job.kind}: ${err instanceof Error ? err.message : "unknown error"}`);
      await store.update("scheduled_sends", { claimed_at: null, error: (err instanceof Error ? err.message : "unknown").slice(0, 300) }).eq("id", job.id);
    }
  }
  return out;
}

type JobResult = { sent: number; skipped: number; failed: number; reason?: string };

async function runJob(store: GiveawayStore, job: ScheduledSendRow, now: Date, deps: SendDeps, log: Pick<Console, "log" | "error">): Promise<JobResult> {
  const kind = job.kind as SendKind;
  if (kind === "tuesday_call_today") return tuesdayJob(store, job, now, deps);
  if (kind === "its_live" || kind === "monday_reminder") return notifyJob(store, job, kind, now, deps, log);
  if (kind === "thank_you") return thankYouJob(store, job, now, deps, log);
  if (kind.startsWith("daily_")) return dailyJob(store, job, kind, now, deps, log);
  return { sent: 0, skipped: 1, failed: 0, reason: `unknown kind ${kind}` };
}

/** Insert the receipt; false when it already exists (already sent/attempted). */
async function receipt(store: GiveawayStore, job: ScheduledSendRow, who: { person_id?: string; notify_id?: string }): Promise<string | null> {
  const { data, error } = await store.insert("scheduled_sends", { kind: job.kind, due_at: job.due_at, person_id: who.person_id ?? null, notify_id: who.notify_id ?? null, claimed_at: new Date().toISOString() }).select("id");
  if (error) {
    if (error.code === "23505") return null;
    throw new Error(`receipt: ${error.message}`);
  }
  return String((data as Array<{ id: string }>)[0]?.id);
}

async function stamp(store: GiveawayStore, receiptId: string, r: { ok: boolean; messageId: string | null; error: string | null }, now: Date) {
  await store.update("scheduled_sends", r.ok ? { sent_at: now.toISOString(), message_id: r.messageId, claimed_at: null } : { error: r.error, claimed_at: null }).eq("id", receiptId);
}

async function notifyJob(store: GiveawayStore, job: ScheduledSendRow, kind: "its_live" | "monday_reminder", now: Date, deps: SendDeps, log: Pick<Console, "log" | "error">): Promise<JobResult> {
  const { data, error } = await store.select("giveaway_notify", "*").not("verified_at", "is", null).is("tapped_at", null).is("unsubscribed_at", null);
  if (error) throw new Error(error.message);
  const first = drawing("mon");
  const out: JobResult = { sent: 0, skipped: 0, failed: 0 };
  for (const n of (data ?? []) as NotifyRow[]) {
    const id = await receipt(store, job, { notify_id: n.id });
    if (!id) {
      out.skipped++;
      continue;
    }
    const footing = deps.footingFor(n.email, true);
    const input = { firstName: n.first_name, isExistingClient: n.is_existing_client, enterUrl: deps.links.enterUrl(n.id), firstDrawing: first, footing };
    const email = kind === "its_live" ? itsLiveEmail(input) : mondayReminderEmail(input);
    const r = await deps.send({ to: n.email, email, marketing: true, footing });
    await stamp(store, id, r, now);
    if (r.ok) {
      out.sent++;
      await store.update("giveaway_notify", kind === "its_live" ? { sent_live_at: now.toISOString() } : { reminded_at: now.toISOString() }).eq("id", n.id);
    } else {
      out.failed++;
      log.error(`[giveaway sends] ${kind} to notify ${n.id}: ${r.error}`);
    }
  }
  return out;
}

async function subscribedEntrants(store: GiveawayStore): Promise<PersonRow[]> {
  const { data, error } = await store.select("giveaway_people", "*").not("verified_at", "is", null).is("unsubscribed_at", null);
  if (error) throw new Error(error.message);
  return (data ?? []) as PersonRow[];
}

async function dailyJob(store: GiveawayStore, job: ScheduledSendRow, kind: SendKind, now: Date, deps: SendDeps, log: Pick<Console, "log" | "error">): Promise<JobResult> {
  const slot = kind.slice("daily_".length) as Drawing["slot"];
  const next = drawingAfter(slot);
  const out: JobResult = { sent: 0, skipped: 0, failed: 0 };
  for (const p of await subscribedEntrants(store)) {
    const id = await receipt(store, job, { person_id: p.id });
    if (!id) {
      out.skipped++;
      continue;
    }
    const footing = deps.footingFor(p.email, true);
    const email = dailyAfternoonEmail({ isExistingClient: p.is_existing_client, nextDrawing: next, entries: await entryCount(store, p.id), referralUrl: deps.links.referralUrl(p.referral_code), footing });
    const r = await deps.send({ to: p.email, email, marketing: true, footing });
    await stamp(store, id, r, now);
    if (r.ok) out.sent++;
    else {
      out.failed++;
      log.error(`[giveaway sends] ${kind} to ${p.id}: ${r.error}`);
    }
  }
  return out;
}

async function thankYouJob(store: GiveawayStore, job: ScheduledSendRow, now: Date, deps: SendDeps, log: Pick<Console, "log" | "error">): Promise<JobResult> {
  const { data: winners } = await store.select("giveaway_winners", "person_id, status").in("status", [...HOLDING_STATUSES]);
  const holding = new Set(((winners ?? []) as Array<{ person_id: string }>).map((w) => w.person_id));
  const out: JobResult = { sent: 0, skipped: 0, failed: 0 };
  for (const p of await subscribedEntrants(store)) {
    if (holding.has(p.id)) continue;
    const id = await receipt(store, job, { person_id: p.id });
    if (!id) {
      out.skipped++;
      continue;
    }
    const { data: offer } = await store.select("giveaway_offers", "code").eq("person_id", p.id).maybeSingle();
    const code = (offer as { code: string } | null)?.code ?? "";
    const footing = deps.footingFor(p.email, true);
    const email = thankYouEmail({ firstName: p.first_name, isExistingClient: p.is_existing_client, offerCode: code, bookUrl: deps.links.bookUrl(code), footing });
    const r = await deps.send({ to: p.email, email, marketing: true, footing });
    await stamp(store, id, r, now);
    if (r.ok) out.sent++;
    else {
      out.failed++;
      log.error(`[giveaway sends] thank_you to ${p.id}: ${r.error}`);
    }
  }
  return out;
}

async function tuesdayJob(store: GiveawayStore, job: ScheduledSendRow, now: Date, deps: SendDeps): Promise<JobResult> {
  const mon = await drawingBySlot(store, "mon");
  const winner: WinnerRow | null = mon ? await currentWinner(store, mon.id) : null;
  if (!winner) return { sent: 0, skipped: 1, failed: 0, reason: "no Monday winner" };
  if (winner.status !== "drawn") return { sent: 0, skipped: 1, failed: 0, reason: `Monday winner already ${winner.status}` };
  const to = deps.staffRecipients();
  if (!to.to) return { sent: 0, skipped: 0, failed: 1, reason: "no staff address" };
  const person = (await store.select("giveaway_people", "*").eq("id", winner.person_id).single()).data as PersonRow;
  const email = tuesdayCallTodayEmail({
    drawing: drawing("mon"),
    winner: { name: `${person.first_name} ${person.last_name}`, email: person.email_display, zip: person.zip, city: person.city, isExistingClient: person.is_existing_client },
    version: winner.prize_version,
    claimDeadline: new Date(winner.claim_deadline_at),
    adminUrl: deps.links.adminUrl,
    now,
  });
  const r = await deps.send({ to: to.to, email, marketing: false, footing: null, cc: to.cc });
  return r.ok ? { sent: 1, skipped: 0, failed: 0 } : { sent: 0, skipped: 0, failed: 1, reason: r.error ?? "send failed" };
}

/** For the admin dashboard: the jobs and their state. */
export async function jobStatus(store: GiveawayStore): Promise<Array<{ kind: string; due_at: string; sent_at: string | null; skipped_reason: string | null; error: string | null; receipts: number }>> {
  const { data } = await store.select("scheduled_sends", "*").order("due_at");
  const rows = (data ?? []) as ScheduledSendRow[];
  return rows
    .filter((r) => !r.person_id && !r.notify_id)
    .map((job) => ({ kind: job.kind, due_at: job.due_at, sent_at: job.sent_at, skipped_reason: job.skipped_reason, error: job.error, receipts: rows.filter((r) => r.kind === job.kind && (r.person_id || r.notify_id) && r.sent_at).length }));
}

export { DRAWINGS, prizeVersionFor };
