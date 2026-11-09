import { NextResponse } from "next/server";
import { FORM_MIN_FILL_MS, FORM_TOKEN_TTL_MS, mintFormToken } from "@/lib/form-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/form-token — the page token the contact form and the guide signup
 * send with their POST to /api/consultation (lib/form-guard.ts). Fetched by
 * their script (lib/form-token-client.ts), so a bot that posts the form's
 * HTML without running it never has one. Never cached: each visitor gets
 * their own, stamped with the moment it was issued.
 */
export function GET() {
  return NextResponse.json(
    { token: mintFormToken(), minAgeMs: FORM_MIN_FILL_MS, ttlMs: FORM_TOKEN_TTL_MS },
    { headers: { "Cache-Control": "no-store, max-age=0", "X-Robots-Tag": "noindex" } }
  );
}
