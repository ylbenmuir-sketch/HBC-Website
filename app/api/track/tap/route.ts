import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/consultation";
import { deviceClass, isBotUserAgent, parseTapBody, tapIgnoredPath, tapLoggingEnabled } from "@/lib/tap";

/**
 * POST /api/track/tap — one row per tap on a tel:/sms: link (lib/tap.ts).
 *
 * Sent with sendBeacon by components/Analytics.tsx, so the browser has
 * already followed the link by the time this runs; the answer is always 204
 * and nothing here can slow or fail a tap. What is stored: the four
 * fixed-list fields the body carries, the path, the server's time, and a
 * device class (mobile/desktop) read from the request. What is not: the IP
 * address (read only for the rate limit, in memory, never written), the
 * user agent (read to refuse bots and classify the device, then dropped),
 * any id, any number. /admin taps and bots are dropped before the insert;
 * so is every deployment but Production unless TAP_LOG=on (lib/tap.ts →
 * tapLoggingEnabled). Until migration 0019 is applied the insert fails and
 * the log says so, once per server instance.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };
const ok = () => new NextResponse(null, { status: 204, headers: HEADERS });

/* Rate limit: 60 a minute per address, in memory, so a script cannot fill
   the table from one connection. Addresses live only in this map. */
const PER_MINUTE = 60;
const hits = new Map<string, number[]>();
function limited(ip: string, now: number): boolean {
  if (hits.size > 10_000) hits.clear();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > PER_MINUTE;
}

let tableMissingLogged = false;

export async function POST(request: Request) {
  if (!tapLoggingEnabled()) return ok();
  const ua = request.headers.get("user-agent");
  if (isBotUserAgent(ua)) return ok();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
  if (limited(ip, Date.now())) return ok();

  let raw: unknown;
  try {
    // sendBeacon posts a Blob with its own content type; read as text.
    raw = JSON.parse(await request.text());
  } catch {
    return ok();
  }
  const tap = parseTapBody(raw);
  if (!tap || tapIgnoredPath(tap.page_path)) return ok();

  const supabase = supabaseAdmin();
  if (!supabase) return ok();
  const row = { ...tap, device: deviceClass(ua, request.headers.get("sec-ch-ua-mobile")) };
  try {
    const { error } = await supabase.from("contact_taps").insert(row);
    if (error) {
      const missing = error.code === "PGRST205" || error.code === "42P01" || /contact_taps/.test(error.message ?? "");
      if (missing) {
        if (!tableMissingLogged) {
          tableMissingLogged = true;
          console.error("[tap log] contact_taps table missing — migration 0019 is not applied; taps are not being recorded.");
        }
      } else {
        console.error(`[tap log] insert failed: ${error.message}${error.code ? ` (code ${error.code})` : ""}`);
      }
    }
  } catch (err) {
    console.error(`[tap log] insert threw: ${err instanceof Error ? err.name : "unknown error"}`);
  }
  return ok();
}
