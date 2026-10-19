/**
 * The append-only audit trail (GIVEAWAY-PLAN.md §3): every draw, redraw,
 * void, login, export, toggle and unsubscribe. One function, so every writer
 * records the same shape. A failed audit write is logged, never thrown —
 * the action it describes has already happened. Server-only.
 */

import type { GiveawayStore } from "./store";

export type AuditEntry = {
  /** A staff email, "cron", "system" or "visitor". */
  actor: string;
  action: string;
  targetTable?: string | null;
  targetId?: string | null;
  reason?: string | null;
  before?: unknown;
  after?: unknown;
  ipHash?: string | null;
};

export async function audit(store: GiveawayStore, entry: AuditEntry, log: Pick<Console, "error"> = console): Promise<boolean> {
  try {
    const { error } = await store.insert("giveaway_audit", {
      actor: entry.actor,
      action: entry.action,
      target_table: entry.targetTable ?? null,
      target_id: entry.targetId ?? null,
      reason: entry.reason ?? null,
      before: entry.before ?? null,
      after: entry.after ?? null,
      ip_hash: entry.ipHash ?? null,
    });
    if (error) {
      log.error(`[giveaway audit] ${entry.action} not written: ${error.message}`);
      return false;
    }
    return true;
  } catch (err) {
    log.error(`[giveaway audit] ${entry.action} threw: ${err instanceof Error ? err.message : "unknown error"}`);
    return false;
  }
}
