import { NextResponse } from "next/server";
import { engineOffResponse, giveawayEngineEnabled } from "@/lib/giveaway/engine";
import { ADMIN_PATH, PENDING_COOKIE, SESSION_COOKIE, currentAdmin } from "@/lib/giveaway/admin-auth";
import { adminDeps, clearedCookie } from "@/lib/giveaway/admin-server";
import { audit } from "@/lib/giveaway/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Sign out: delete both cookies; audited when there was a session. */
export async function POST(request: Request) {
  if (!giveawayEngineEnabled()) return engineOffResponse();
  const res = NextResponse.redirect(new URL(ADMIN_PATH, request.url), 303);
  res.cookies.set(clearedCookie(SESSION_COOKIE));
  res.cookies.set(clearedCookie(PENDING_COOKIE));
  const ready = adminDeps();
  if (ready.ok) {
    const cookieHeader = request.headers.get("cookie") ?? "";
    const value = /(?:^|;\s*)hbc_admin_session=([^;]+)/.exec(cookieHeader)?.[1];
    const admin = await currentAdmin({ store: ready.deps.store, secret: ready.deps.secret }, value ? decodeURIComponent(value) : null);
    if (admin) await audit(ready.deps.store, { actor: admin.email, action: "admin_signed_out" });
  }
  return res;
}
