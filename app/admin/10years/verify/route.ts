import { NextResponse } from "next/server";
import { ADMIN_PATH, PENDING_COOKIE, pendingEmail, verifyCode } from "@/lib/giveaway/admin-auth";
import { adminDeps, clearedCookie, sessionCookie } from "@/lib/giveaway/admin-server";
import { clientAddress } from "@/lib/giveaway/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Step two: the code → a 12-hour session cookie. */
export async function POST(request: Request) {
  const ready = adminDeps();
  const redirect = (query: string) => NextResponse.redirect(new URL(`${ADMIN_PATH}${query}`, request.url), 303);
  if (!ready.ok) return redirect("?error=missing");
  const { store, otp, secret } = ready.deps;
  const cookieHeader = request.headers.get("cookie") ?? "";
  const pendingValue = /(?:^|;\s*)hbc_admin_pending=([^;]+)/.exec(cookieHeader)?.[1];
  const email = pendingEmail(pendingValue ? decodeURIComponent(pendingValue) : null, store.env, secret);
  if (!email) {
    const res = redirect("?error=expired");
    res.cookies.set(clearedCookie(PENDING_COOKIE));
    return res;
  }
  const form = await request.formData().catch(() => null);
  const code = String(form?.get("code") ?? "");
  const outcome = await verifyCode({ store, otp, secret, env: process.env }, { email, code, ip: clientAddress(request) });
  if (!outcome.ok) return redirect(`?error=${outcome.reason}`);
  const res = redirect("");
  res.cookies.set(sessionCookie(outcome.sessionToken));
  res.cookies.set(clearedCookie(PENDING_COOKIE));
  return res;
}
