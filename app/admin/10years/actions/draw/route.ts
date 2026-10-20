import { ADMIN_PATH } from "@/lib/giveaway/admin-auth";
import { giveawayNow } from "@/lib/giveaway/clock";
import { DRAWINGS, type Slot } from "@/lib/giveaway/config";
import { drawNow } from "@/lib/giveaway/drawings";
import { liveNotifier } from "@/lib/giveaway/notify";
import { back, errorSlug, field, requireAdminAction } from "../_guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCREEN = `${ADMIN_PATH}/drawings`;

/** "Draw now" for a slot whose time has passed. drawNow audits as the admin. */
export async function POST(request: Request) {
  const guard = await requireAdminAction(request);
  if (!guard.ok) return guard.response;
  const { store, admin, form } = guard.ctx;
  const slot = field(form, "slot", 10);
  if (!DRAWINGS.some((d) => d.slot === slot)) return back(request, SCREEN, { ok: undefined, error: "unknown-slot" });
  try {
    const result = await drawNow(store, slot as Slot, giveawayNow(), admin, liveNotifier(store, giveawayNow));
    if ("error" in result) return back(request, SCREEN, { ok: undefined, error: errorSlug(result.error) }, `drawing-${slot}`);
    return back(request, SCREEN, { ok: "drawn", error: undefined }, `drawing-${slot}`);
  } catch (err) {
    console.error(`[giveaway admin] draw ${slot} by ${admin}: ${err instanceof Error ? err.message : "unknown"}`);
    return back(request, SCREEN, { ok: undefined, error: errorSlug(err instanceof Error ? err.message : "failed") }, `drawing-${slot}`);
  }
}
