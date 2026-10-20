import { NextResponse } from "next/server";
import { giveawayNow } from "@/lib/giveaway/clock";
import { engineOffResponse, giveawayEngineEnabled } from "@/lib/giveaway/engine";
import { claimWithPhone, winnerByToken } from "@/lib/giveaway/drawings";
import { clientAddress, rateLimit, supabaseCounter } from "@/lib/giveaway/rate-limit";
import { giveawayStore } from "@/lib/giveaway/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The claim page's one field. */
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!giveawayEngineEnabled()) return engineOffResponse();
  const { token } = await params;
  const back= (q: string) => NextResponse.redirect(new URL(`/10years/claim/${encodeURIComponent(token)}${q}`, request.url), 303);
  const store = giveawayStore();
  if (!store) return back("?error=1");
  const limited = await rateLimit(supabaseCounter(store), "entry_ip", clientAddress(request), { now: giveawayNow() });
  if (!limited.allowed) return back("?error=1");
  const winner = await winnerByToken(store, decodeURIComponent(token));
  if (!winner || winner.status === "redrawn") return back("");
  const form = await request.formData().catch(() => null);
  const phone = String(form?.get("phone") ?? "").trim();
  if (phone.replace(/\D/g, "").length < 7) return back("?error=1");
  await claimWithPhone(store, winner, phone, giveawayNow());
  return back("?done=1");
}
