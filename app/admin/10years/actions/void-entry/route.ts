import { ADMIN_PATH } from "@/lib/giveaway/admin-auth";
import { audit } from "@/lib/giveaway/audit";
import { giveawayNow } from "@/lib/giveaway/clock";
import type { EntryRow } from "@/lib/giveaway/rows";
import { back, errorSlug, field, requireAdminAction, returnPath } from "../_guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCREEN = `${ADMIN_PATH}/entries`;

/**
 * Void one entry with a reason: void_reason + voided_at = giveawayNow(),
 * only when it is not already void, then audit entry_voided. Does not
 * touch referral_credits (the dashboard sum is informational; the pool
 * reads void_reason). Redirects to the search the form came from.
 */
export async function POST(request: Request) {
  const guard = await requireAdminAction(request);
  if (!guard.ok) return guard.response;
  const { store, admin, form } = guard.ctx;
  const target = returnPath(form, SCREEN);
  const entryId = field(form, "entry_id", 80);
  const reason = field(form, "reason", 500);
  if (!entryId) return back(request, target, { ok: undefined, error: "missing-entry" });
  if (!reason) return back(request, target, { ok: undefined, error: "a-reason-is-required" });

  const { data: found } = await store.select("giveaway_entries", "*").eq("id", entryId).maybeSingle();
  const entry = (found as EntryRow | null) ?? null;
  if (!entry) return back(request, target, { ok: undefined, error: "unknown-entry" });
  const anchor = `person-${entry.person_id}`;
  if (entry.void_reason) return back(request, target, { ok: undefined, error: "already-void" }, anchor);

  const now = giveawayNow().toISOString();
  const { data, error } = await store.update("giveaway_entries", { void_reason: reason, voided_at: now }).eq("id", entry.id).is("void_reason", null).select("id");
  if (error || !(data?.length)) {
    console.error(`[giveaway admin] void ${entryId} by ${admin}: ${error?.message ?? "no row updated"}`);
    return back(request, target, { ok: undefined, error: errorSlug(error?.message ?? "not-updated") }, anchor);
  }
  await audit(store, { actor: admin, action: "entry_voided", targetTable: "giveaway_entries", targetId: entry.id, reason, before: { void_reason: null, kind: entry.kind, person_id: entry.person_id }, after: { void_reason: reason, voided_at: now } });
  return back(request, target, { ok: "voided", error: undefined }, anchor);
}
