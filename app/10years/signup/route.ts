import { NextResponse } from "next/server";
import { showcaseActive, showcaseFor } from "@/lib/giveaway/showcase";
import { handleSignup } from "@/lib/giveaway/web";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The /10years form, both modes. Always redirects back to the page.
 *
 * In the showcase (lib/giveaway/showcase.ts) the form "succeeds" and that
 * is all: no row, no email, no store — the body is not even read. The
 * redirect keeps the stage (?mode=) the form was on.
 */
export async function POST(request: Request) {
  if (showcaseActive()) {
    const { param } = showcaseFor(new URL(request.url).searchParams.get("mode") ?? undefined);
    return NextResponse.redirect(new URL(`/10years?mode=${encodeURIComponent(param)}&sent=1`, request.url), 303);
  }
  const form = await request.formData().catch(() => null);
  const r = await handleSignup(request, form);
  return NextResponse.redirect(new URL(`${r.to}${r.query}`, request.url), 303);
}
