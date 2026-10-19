import { NextResponse } from "next/server";
import { audit } from "@/lib/giveaway/audit";
import { PAGES } from "@/lib/giveaway/copy";
import { clientAddress, rateLimit, supabaseCounter } from "@/lib/giveaway/rate-limit";
import { giveawayStore } from "@/lib/giveaway/store";
import { sha256Hex, tokenSecret, verifyToken } from "@/lib/giveaway/tokens";
import { SITE_NAME, SITE_URL } from "@/lib/site-config";

/**
 * /unsubscribe?t=<signed token> — the link under every giveaway marketing
 * email (GIVEAWAY-PLAN.md §4; CAN-SPAM). No login: the token (kind
 * "unsubscribe", subject = the normalized email, bound to this env) is the
 * proof. Writes `unsubscribed_at` on the person's giveaway_people and
 * giveaway_notify rows where it is still null, audits it, and shows a plain
 * page. GET is what a tap in a mail app does; POST is RFC 8058 one-click
 * (List-Unsubscribe-Post), the same work.
 *
 * Idempotent. `noindex` by header (here and next.config.ts), absent from the
 * sitemap (app/sitemap.ts lists registered pages only). Not in robots.txt's
 * disallow on purpose — see app/robots.ts.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handle(request, new URL(request.url).searchParams.get("t"));
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  let token = url.searchParams.get("t");
  if (!token) {
    const form = await request.formData().catch(() => null);
    const fromForm = form?.get("t");
    if (typeof fromForm === "string") token = fromForm;
  }
  return handle(request, token);
}

async function handle(request: Request, token: string | null): Promise<Response> {
  const store = giveawayStore();
  let secret: string;
  try {
    secret = tokenSecret();
  } catch {
    secret = "";
  }
  if (!store || !secret) {
    console.error("[giveaway unsubscribe] not configured: Supabase or GIVEAWAY_TOKEN_SECRET missing");
    return html(PAGES.unsubscribe.unavailable, 503);
  }

  const ip = clientAddress(request);
  const limited = await rateLimit(supabaseCounter(store), "unsubscribe_ip", ip, { salt: secret });
  if (!limited.allowed) return html(PAGES.unsubscribe.unavailable, 429);

  const verified = token ? verifyToken(token, { kind: "unsubscribe", env: store.env }, secret) : null;
  if (!verified || !verified.ok) return html(PAGES.unsubscribe.invalid, 400);
  const email = verified.payload.s;
  const now = new Date().toISOString();

  let changed = 0;
  for (const table of ["giveaway_people", "giveaway_notify"] as const) {
    const { data, error } = await store.update(table, { unsubscribed_at: now }).eq("email", email).is("unsubscribed_at", null).select("id");
    if (error) {
      console.error(`[giveaway unsubscribe] ${table}: ${error.message}`);
      return html(PAGES.unsubscribe.unavailable, 503);
    }
    changed += data?.length ?? 0;
  }
  await audit(store, {
    actor: "visitor",
    action: "unsubscribe",
    targetTable: "giveaway_people",
    targetId: sha256Hex(email, secret),
    after: { rows: changed },
    ipHash: sha256Hex(ip, secret),
  });
  return html(changed > 0 ? PAGES.unsubscribe.done : PAGES.unsubscribe.already, 200);
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function html(message: string, status: number): Response {
  const title = status === 200 ? PAGES.unsubscribe.title : SITE_NAME;
  const body = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${esc(title)} — ${esc(SITE_NAME)}</title>
<style>
  body { margin: 0; background: #fbf8f1; color: #243240; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  main { max-width: 560px; margin: 0 auto; padding: 64px 20px; }
  .word { font-family: Georgia, "Times New Roman", serif; font-size: 22px; color: #1c2b3a; }
  .sub { font-size: 10px; font-weight: 600; letter-spacing: 0.22em; color: #a9853f; padding-left: 4px; }
  h1 { font-size: 26px; margin: 28px 0 10px; color: #1c2b3a; }
  p { font-size: 17px; line-height: 1.5; }
  a { color: #596e5b; }
</style>
</head>
<body>
<main>
  <div><span class="word">Harmonized</span><span class="sub">BRAIN CENTERS</span></div>
  <h1>${esc(title)}</h1>
  <p>${esc(message)}</p>
  <p><a href="${esc(SITE_URL)}">${esc(PAGES.unsubscribe.back)}</a></p>
</main>
</body>
</html>`;
  return new NextResponse(body, {
    status,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
}
