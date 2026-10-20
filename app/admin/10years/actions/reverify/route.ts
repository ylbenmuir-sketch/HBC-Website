import { ADMIN_PATH } from "@/lib/giveaway/admin-auth";
import { audit } from "@/lib/giveaway/audit";
import { drawingById, reverify } from "@/lib/giveaway/drawings";
import { back, field, requireAdminAction } from "../_guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCREEN = `${ADMIN_PATH}/drawings`;

/**
 * Re-verify a drawing from its stored seed, pool and exclusion lists. Reads
 * only, but the check itself is worth a line in the trail; the page then
 * recomputes and shows the result inline (?reverify=<id>).
 */
export async function POST(request: Request) {
  const guard = await requireAdminAction(request);
  if (!guard.ok) return guard.response;
  const { store, admin, form } = guard.ctx;
  const drawingId = field(form, "drawing_id", 80);
  const d = drawingId ? await drawingById(store, drawingId) : null;
  if (!d) return back(request, SCREEN, { ok: undefined, error: "unknown-drawing", reverify: undefined });
  const result = await reverify(store, d.id);
  await audit(store, { actor: admin, action: "drawing_reverified", targetTable: "giveaway_drawings", targetId: d.id, after: { hashOk: result.hashOk, results: result.results } });
  return back(request, SCREEN, { ok: "reverified", error: undefined, reverify: d.id }, `drawing-${d.slot}`);
}
