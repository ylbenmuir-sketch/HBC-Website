import { NextResponse } from "next/server";
import { engineOffResponse, giveawayEngineEnabled } from "@/lib/giveaway/engine";
import { ADMIN_PATH, PENDING_COOKIE, pendingToken, requestCode } from "@/lib/giveaway/admin-auth";
import { adminDeps, clearedCookie, pendingCookie } from "@/lib/giveaway/admin-server";
import { clientAddress } from "@/lib/giveaway/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Step one of the sign-in: email → a one-time code (if the address is on
 *  the allowlist). Always answers with a redirect back to the page. */
export async function POST(request: Request) {
  if (!giveawayEngineEnabled()) return engineOffResponse();
  const back = (query: string, cookie?: ReturnType<typeof pendingCookie> | ReturnType<typeof clearedCookie>) => {
    const res = NextResponse.redirect(new URL(`${ADMIN_PATH}${query}`, request.url), 303);
    if (cookie) res.cookies.set(cookie);
    return res;
  };
  const ready = adminDeps();
  if (!ready.ok) return back("?error=missing");
  const form = await request.formData().catch(() => null);
  const email = String(form?.get("email") ?? "");
  const outcome = await requestCode({ store: ready.deps.store, otp: ready.deps.otp, env: process.env }, { email, ip: clientAddress(request) });
  if (!outcome.ok) return back(`?error=${outcome.reason}`, clearedCookie(PENDING_COOKIE));
  return back("?sent=1", pendingCookie(pendingToken(email.trim().toLowerCase(), ready.deps.store.env, ready.deps.secret)));
}
