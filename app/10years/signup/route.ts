import { NextResponse } from "next/server";
import { handleSignup } from "@/lib/giveaway/web";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The /10years form, both modes. Always redirects back to the page. */
export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const r = await handleSignup(request, form);
  return NextResponse.redirect(new URL(`${r.to}${r.query}`, request.url), 303);
}
