import { NextResponse } from "next/server";
import { ADMIN_PATH, SESSION_COOKIE, currentAdmin } from "@/lib/giveaway/admin-auth";
import { adminDeps } from "@/lib/giveaway/admin-server";
import type { GiveawayStore } from "@/lib/giveaway/store";

/**
 * What every admin action route does first: read the session cookie from
 * the `cookie` header (the same way logout/route.ts does), check it, and
 * answer with a 303 back to a screen. Unauthenticated → the sign-in page.
 */

export type ActionContext = { store: GiveawayStore; admin: string; form: FormData | null };

export async function requireAdminAction(request: Request): Promise<{ ok: true; ctx: ActionContext } | { ok: false; response: NextResponse }> {
  const ready = adminDeps();
  if (!ready.ok) return { ok: false, response: NextResponse.redirect(new URL(`${ADMIN_PATH}?error=missing`, request.url), 303) };
  const cookieHeader = request.headers.get("cookie") ?? "";
  const value = new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`).exec(cookieHeader)?.[1];
  const admin = await currentAdmin({ store: ready.deps.store, secret: ready.deps.secret }, value ? decodeURIComponent(value) : null);
  if (!admin) return { ok: false, response: NextResponse.redirect(new URL(ADMIN_PATH, request.url), 303) };
  const form = request.method === "POST" ? await request.formData().catch(() => null) : null;
  return { ok: true, ctx: { store: ready.deps.store, admin: admin.email, form } };
}

export function field(form: FormData | null, name: string, max = 500): string {
  const v = form?.get(name);
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** The screen to go back to: the form's `return` when it is an admin path, else `fallback`. */
export function returnPath(form: FormData | null, fallback: string): string {
  const r = field(form, "return", 300);
  return r.startsWith(`${ADMIN_PATH}`) && !r.includes("//") && !/[\r\n]/.test(r) ? r : fallback;
}

/** 303 to `path` with the given query merged in (ok/error/anchor). */
export function back(request: Request, path: string, params: Record<string, string | undefined>, hash?: string): NextResponse {
  const url = new URL(path, request.url);
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.delete(k);
    if (v) url.searchParams.set(k, v);
  }
  if (hash) url.hash = hash;
  return NextResponse.redirect(url, 303);
}

export const errorSlug = (message: string) => message.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "failed";
