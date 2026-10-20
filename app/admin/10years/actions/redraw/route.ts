import { ADMIN_PATH } from "@/lib/giveaway/admin-auth";
import { giveawayNow } from "@/lib/giveaway/clock";
import { drawingById, redraw } from "@/lib/giveaway/drawings";
import { liveNotifier } from "@/lib/giveaway/notify";
import { back, errorSlug, field, requireAdminAction } from "../_guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCREEN = `${ADMIN_PATH}/drawings`;

/** Redraw from the frozen pool; the reason is required. redraw() audits. */
export async function POST(request: Request) {
  const guard = await requireAdminAction(request);
  if (!guard.ok) return guard.response;
  const { store, admin, form } = guard.ctx;
  const drawingId = field(form, "drawing_id", 80);
  const reason = field(form, "reason", 500);
  if (!drawingId) return back(request, SCREEN, { ok: undefined, error: "missing-drawing" });
  if (!reason) return back(request, SCREEN, { ok: undefined, error: "a-reason-is-required" });
  const d = await drawingById(store, drawingId);
  const anchor = d ? `drawing-${d.slot}` : undefined;
  try {
    const result = await redraw(store, drawingId, reason, giveawayNow(), admin, liveNotifier(store, giveawayNow));
    if ("error" in result) return back(request, SCREEN, { ok: undefined, error: errorSlug(result.error) }, anchor);
    return back(request, SCREEN, { ok: "redrawn", error: undefined }, anchor);
  } catch (err) {
    console.error(`[giveaway admin] redraw ${drawingId} by ${admin}: ${err instanceof Error ? err.message : "unknown"}`);
    return back(request, SCREEN, { ok: undefined, error: errorSlug(err instanceof Error ? err.message : "failed") }, anchor);
  }
}
