import { NextResponse } from "next/server";
import { checkFormRateLimit, checkFormToken, formClientKey, guardEnforced } from "@/lib/form-guard";
import { showcaseActiveFor, showcaseFor } from "@/lib/giveaway/showcase";
import { handleSignup } from "@/lib/giveaway/web";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * The /10years form, both modes. Always redirects back to the page.
 *
 * In the showcase (lib/giveaway/showcase.ts) the form "succeeds" and that
 * is all: no row, no email, no store — the body is not even read. The
 * redirect keeps the stage (?mode=) the form was on.
 *
 * The spam guard (Ben, 2026-11-09): the same invisible checks as /contact
 * (lib/form-guard.ts), before anything is saved or emailed. The rate limit,
 * the page token and its 3-second minimum are enforced on Vercel and off
 * locally unless FORM_GUARD=on; FORM_GUARD=off turns them off everywhere.
 * The honeypot is always on. The page's script (components/giveaway/
 * FormGuard.tsx) fetches the token and waits out the 3 seconds behind
 * "Sending…", so a real visitor with JavaScript is never refused. Every
 * refusal is logged with its reason and country, never a value, and lands
 * back on the form with a plain "try again" — no row, no email.
 */
export async function POST(request: Request) {
  // The showcase form posts with ?mode=; the real form posts without it (Ben, 2026-11-07).
  const modeParam = new URL(request.url).searchParams.get("mode") ?? undefined;
  if (showcaseActiveFor(modeParam)) {
    const { param } = showcaseFor(modeParam);
    return NextResponse.redirect(new URL(`/10years?mode=${encodeURIComponent(param)}&sent=1`, request.url), 303);
  }

  const back = (query: string) => NextResponse.redirect(new URL(`/10years${query}#enter`, request.url), 303);
  const refuse = (reason: string, query = "?error=not_sent") => {
    console.warn(`[spam guard] refused reason=${reason} form=10years country=${request.headers.get("x-vercel-ip-country") ?? "?"}`);
    return back(query);
  };
  const enforce = guardEnforced();

  if (enforce && !checkFormRateLimit(formClientKey(request)).allowed) return refuse("rate_limit", "?error=rate_limited");

  const form = await request.formData().catch(() => null);

  // The honeypot: a field no person sees, so it is always empty from a real visitor.
  const website = form?.get("website");
  if (typeof website === "string" && website.trim().length > 0) return refuse("honeypot");

  if (enforce) {
    const token = checkFormToken(form?.get("form_token"));
    if (!token.ok) return refuse(`token_${token.reason}`);
  }

  const r = await handleSignup(request, form);
  return NextResponse.redirect(new URL(`${r.to}${r.query}`, request.url), 303);
}
