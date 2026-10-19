import { ADMIN_PATH } from "@/lib/giveaway/admin-auth";
import { giveawayNow } from "@/lib/giveaway/clock";
import { updateWinner, winnerById, type WinnerAction } from "@/lib/giveaway/drawings";
import { personById } from "@/lib/giveaway/people";
import { publicLabel } from "@/lib/giveaway/zip";
import { back, errorSlug, field, requireAdminAction } from "../_guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SCREEN = `${ADMIN_PATH}/winners`;
const STATUSES = ["contacted", "claimed", "unreachable", "declined", "ineligible"] as const;
type Status = (typeof STATUSES)[number];

/**
 * One route for the five winner forms, told apart by `kind`: call_attempt
 * (outcome), status (status), public_ok (on=1|0; the label is computed here
 * from the person, never taken from the form), tax_form_received (on=1|0),
 * note (notes). updateWinner audits each as winner_<kind>.
 */
export async function POST(request: Request) {
  const guard = await requireAdminAction(request);
  if (!guard.ok) return guard.response;
  const { store, admin, form } = guard.ctx;
  const winnerId = field(form, "winner_id", 80);
  const kind = field(form, "kind", 40);
  const winner = winnerId ? await winnerById(store, winnerId) : null;
  if (!winner) return back(request, SCREEN, { ok: undefined, error: "unknown-winner" });
  const anchor = `winner-${winner.id}`;
  if (winner.status === "redrawn") return back(request, SCREEN, { ok: undefined, error: "that-winner-was-redrawn" }, anchor);
  const on = field(form, "on", 5) === "1";

  let action: WinnerAction;
  switch (kind) {
    case "call_attempt": {
      const outcome = field(form, "outcome", 200);
      if (!outcome) return back(request, SCREEN, { ok: undefined, error: "an-outcome-is-required" }, anchor);
      action = { kind, outcome };
      break;
    }
    case "status": {
      const status = field(form, "status", 20);
      if (!STATUSES.includes(status as Status)) return back(request, SCREEN, { ok: undefined, error: "unknown-status" }, anchor);
      action = { kind, status: status as Status };
      break;
    }
    case "public_ok": {
      const person = await personById(store, winner.person_id);
      if (!person) return back(request, SCREEN, { ok: undefined, error: "person-missing" }, anchor);
      action = { kind, on, label: publicLabel(person.first_name, person.last_name, person.city) };
      break;
    }
    case "tax_form_received": {
      if (!winner.tax_form_required) return back(request, SCREEN, { ok: undefined, error: "no-tax-form-required" }, anchor);
      action = { kind, on };
      break;
    }
    case "note":
      action = { kind, notes: field(form, "notes", 2000) };
      break;
    default:
      return back(request, SCREEN, { ok: undefined, error: "unknown-action" }, anchor);
  }

  try {
    await updateWinner(store, winner, action, giveawayNow(), admin);
    return back(request, SCREEN, { ok: "winner", error: undefined }, anchor);
  } catch (err) {
    console.error(`[giveaway admin] winner ${kind} on ${winner.id} by ${admin}: ${err instanceof Error ? err.message : "unknown"}`);
    return back(request, SCREEN, { ok: undefined, error: errorSlug(err instanceof Error ? err.message : "failed") }, anchor);
  }
}
