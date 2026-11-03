/**
 * The giveaway in counts (fix list rev 2, P1-5): what
 * /api/internal/giveaway-stats returns to the reporting bot. Counts ONLY —
 * never a name, email, ZIP, phone, code, token or hash — and any count of 1
 * to 4 is reported as "<5", so a small bucket can't single anyone out.
 * New/current-client status is not reported at all (P1-8; Official Rules
 * §17).
 *
 * Reads through GiveawayStore only, so only this deployment's env is
 * counted (production rows on the production deployment). Paged reads:
 * PostgREST returns at most 1,000 rows a request.
 */

import { CHANNELS, type Channel } from "./channel";
import { DRAWINGS, PRIZES, centralParts, pageMode, prizeRetailUsd, prizeTaxFormRequired, type PageMode } from "./config";
import type { DrawingRow, EntryRow, NotifyRow, OfferRow, PersonRow, ScheduledSendRow, WinnerRow } from "./rows";
import type { GiveawayStore, GiveawayTable } from "./store";

export type Count = number | "<5";

/** 0 stays 0; 1–4 becomes "<5"; 5 and up are exact. */
export function bucket(n: number): Count {
  return n >= 1 && n <= 4 ? "<5" : n;
}

const PAGE = 1000;

async function all<T>(store: GiveawayStore, table: GiveawayTable, columns: string): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await store.select(table, columns).order("id").range(from, from + PAGE - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    const rows = (data ?? []) as T[];
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}

const dayKey = (d: Date) => {
  const p = centralParts(d);
  return `${p.year}-${p.month}-${p.day}`;
};

export type GiveawayStats = {
  ok: true;
  env: string;
  generated_at: string;
  mode: PageMode;
  notify: { total: Count; verified: Count; tapped: Count; unsubscribed: Count };
  people: {
    total: Count;
    verified: Count;
    verified_today_ct: Count;
    unsubscribed: Count;
    marketing_opt_in: Count;
    by_center: { nashville: Count; murfreesboro: Count; unknown: Count };
    by_utm_source: Record<Channel, Count>;
  };
  entries: { total: Count; by_kind: Record<"base" | "early_bird" | "referral_bonus" | "referred_bonus", Count>; voided: Count };
  referrals: { referrers_with_credit: Count; credits_total: Count };
  gift: { issued: Count; redeemed: Count; redeemed_by_center: { nashville: Count; murfreesboro: Count } };
  drawings: Array<{ slot: string; scheduled_at: string; status: string; pool_size: Count | null; winner_status: string | null; claim_deadline_at: string | null; public_ok: boolean | null }>;
  sends: Array<{ kind: string; due_at: string; status: "pending" | "sent" | "skipped" | "failed"; sent: Count; skipped: Count; failed: Count }>;
  alerts: { drawing_overdue: boolean; send_failures_24h: Count; config_drift: boolean };
};

export async function giveawayStats(store: GiveawayStore, now: Date): Promise<GiveawayStats> {
  const [notify, people, entries, offers, drawings, winners, sends, prizes] = await Promise.all([
    all<NotifyRow>(store, "giveaway_notify", "id, verified_at, tapped_at, unsubscribed_at"),
    all<PersonRow & { channel?: string | null }>(store, "giveaway_people", "*"),
    all<EntryRow>(store, "giveaway_entries", "id, kind, void_reason"),
    all<OfferRow>(store, "giveaway_offers", "id, redeemed_at, redeemed_center"),
    all<DrawingRow>(store, "giveaway_drawings", "id, slot, scheduled_at, status, pool_size"),
    all<WinnerRow>(store, "giveaway_winners", "id, drawing_id, status, claim_deadline_at, public_ok"),
    all<ScheduledSendRow & { created_at?: string }>(store, "scheduled_sends", "id, kind, due_at, person_id, notify_id, sent_at, skipped_reason, error, created_at"),
    all<{ slot: string; version: string; retail_value_usd: number | string; tax_form_required: boolean }>(store, "giveaway_prizes", "id, slot, version, retail_value_usd, tax_form_required"),
  ]);
  const n = (xs: unknown[]) => bucket(xs.length);
  const today = dayKey(now);
  const live = entries.filter((e) => !e.void_reason);
  const channelCounts = Object.fromEntries(CHANNELS.map((c) => [c, bucket(people.filter((p) => (p.channel ?? null) === c).length)])) as Record<Channel, Count>;
  const centerOf = (c: string | null) => (c === "nashville" || c === "Nashville" ? "nashville" : c === "murfreesboro" || c === "Murfreesboro" ? "murfreesboro" : "unknown");

  // Jobs are the rows with no recipient; receipts carry the per-person outcome.
  const jobs = sends.filter((s) => !s.person_id && !s.notify_id);
  const receipts = sends.filter((s) => s.person_id || s.notify_id);
  const dayAgo = now.getTime() - 24 * 3_600_000;

  const drawingsOut = DRAWINGS.map((d) => {
    const row = drawings.find((r) => r.slot === d.slot);
    const current = row ? winners.filter((w) => w.drawing_id === row.id && w.status !== "redrawn")[0] : undefined;
    return {
      slot: d.slot,
      scheduled_at: d.at.toISOString(),
      status: row?.status ?? "missing",
      pool_size: row?.pool_size == null ? null : bucket(row.pool_size),
      winner_status: current?.status ?? null,
      claim_deadline_at: current?.claim_deadline_at ?? null,
      public_ok: current ? Boolean(current.public_ok) : null,
    };
  });

  // Drift: the database's schedule or prize values no longer match config.
  const drawingDrift = DRAWINGS.some((d) => {
    const row = drawings.find((r) => r.slot === d.slot);
    return !row || new Date(row.scheduled_at).getTime() !== d.at.getTime();
  });
  const prizeDrift = PRIZES.some((p) => {
    const rows = prizes.filter((r) => r.slot === p.slot);
    return rows.length === 0 || rows.some((row) => Math.round(Number(row.retail_value_usd) * 100) !== Math.round(prizeRetailUsd(p) * 100) || row.tax_form_required !== prizeTaxFormRequired(p));
  });

  return {
    ok: true,
    env: store.env,
    generated_at: now.toISOString(),
    mode: pageMode(now),
    notify: {
      total: n(notify),
      verified: n(notify.filter((r) => r.verified_at)),
      tapped: n(notify.filter((r) => r.tapped_at)),
      unsubscribed: n(notify.filter((r) => r.unsubscribed_at)),
    },
    people: {
      total: n(people),
      verified: n(people.filter((p) => p.verified_at)),
      verified_today_ct: n(people.filter((p) => p.verified_at && dayKey(new Date(p.verified_at)) === today)),
      unsubscribed: n(people.filter((p) => p.unsubscribed_at)),
      marketing_opt_in: n(people.filter((p) => p.marketing_opt_in)),
      by_center: {
        nashville: n(people.filter((p) => centerOf(p.nearest_center) === "nashville")),
        murfreesboro: n(people.filter((p) => centerOf(p.nearest_center) === "murfreesboro")),
        unknown: n(people.filter((p) => centerOf(p.nearest_center) === "unknown")),
      },
      by_utm_source: channelCounts,
    },
    entries: {
      total: n(live),
      by_kind: {
        base: n(live.filter((e) => e.kind === "base")),
        early_bird: n(live.filter((e) => e.kind === "early_bird")),
        referral_bonus: n(live.filter((e) => e.kind === "referral_bonus")),
        referred_bonus: n(live.filter((e) => e.kind === "referred_bonus")),
      },
      voided: n(entries.filter((e) => e.void_reason)),
    },
    referrals: {
      referrers_with_credit: n(people.filter((p) => (p.referral_credits ?? 0) > 0)),
      credits_total: bucket(people.reduce((t, p) => t + (p.referral_credits ?? 0), 0)),
    },
    gift: {
      issued: n(offers),
      redeemed: n(offers.filter((o) => o.redeemed_at)),
      redeemed_by_center: {
        nashville: n(offers.filter((o) => o.redeemed_at && centerOf(o.redeemed_center) === "nashville")),
        murfreesboro: n(offers.filter((o) => o.redeemed_at && centerOf(o.redeemed_center) === "murfreesboro")),
      },
    },
    drawings: drawingsOut,
    sends: jobs
      .sort((a, b) => a.due_at.localeCompare(b.due_at))
      .map((j) => {
        const mine = receipts.filter((r) => r.kind === j.kind && r.due_at === j.due_at);
        const failed = mine.filter((r) => !r.sent_at && r.error).length;
        const status = j.sent_at ? (j.skipped_reason ? "skipped" : "sent") : j.error ? "failed" : "pending";
        return { kind: j.kind, due_at: new Date(j.due_at).toISOString(), status, sent: n(mine.filter((r) => r.sent_at)), skipped: n(mine.filter((r) => r.skipped_reason)), failed: bucket(failed) };
      }),
    alerts: {
      drawing_overdue: DRAWINGS.some((d) => {
        const row = drawings.find((r) => r.slot === d.slot);
        return now.getTime() > d.at.getTime() + 10 * 60_000 && (!row || row.status === "scheduled");
      }),
      send_failures_24h: bucket(receipts.filter((r) => r.error && !r.sent_at && new Date(r.created_at ?? r.due_at).getTime() >= dayAgo).length),
      config_drift: drawingDrift || prizeDrift,
    },
  };
}
