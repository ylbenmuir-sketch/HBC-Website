import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { giveawayNow } from "@/lib/giveaway/clock";
import { giveawayEngineEnabled } from "@/lib/giveaway/engine";
import { giveawayStats } from "@/lib/giveaway/stats";
import { giveawayStore } from "@/lib/giveaway/store";

/**
 * GET /api/internal/giveaway-stats — the 10-year giveaway in counts, for
 * the reporting bot (fix list rev 2, P1-5; mirrors /api/internal/phone-stats).
 *
 *   Authorization: Bearer <GIVEAWAY_STATS_TOKEN>   (or ?token= for a bot
 *   that cannot set a header)
 *
 *   503  GIVEAWAY_STATS_TOKEN unset
 *   401  wrong or missing token
 *   429  more than 60 requests an hour from one address (per instance)
 *   200  {ok:true, engine:"off"} while GIVEAWAY_ENGINE_ENABLED is off —
 *        nothing is read (the tables may not exist)
 *   200  the counts (lib/giveaway/stats.ts): no names, emails, ZIPs,
 *        phones, codes or hashes; any count of 1–4 reads "<5"
 *
 * Only this deployment's env is counted — production rows on the
 * production deployment — through GiveawayStore. Never cached, never indexed.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
const reply = (body: unknown, status: number, extra: Record<string, string> = {}) => NextResponse.json(body, { status, headers: { ...HEADERS, ...extra } });

const PER_HOUR = 60;
const HOUR_MS = 3_600_000;
const hits = new Map<string, number[]>();

function limited(ip: string, now: number): number | null {
  if (hits.size > 10_000) hits.clear();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < HOUR_MS);
  if (recent.length >= PER_HOUR) {
    hits.set(ip, recent);
    return Math.max(1, Math.ceil((HOUR_MS - (now - recent[0])) / 1000));
  }
  recent.push(now);
  hits.set(ip, recent);
  return null;
}

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

function presentedToken(request: Request, url: URL): string {
  const m = /^Bearer\s+(.+)$/i.exec((request.headers.get("authorization") ?? "").trim());
  return m ? m[1].trim() : (url.searchParams.get("token") ?? "").trim();
}

/** Both sides hashed first, so the compare is constant-time whatever the lengths. */
function tokenMatches(got: string, want: string): boolean {
  if (!got) return false;
  return timingSafeEqual(createHash("sha256").update(got).digest(), createHash("sha256").update(want).digest());
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const retryAfter = limited(clientIp(request), Date.now());
  if (retryAfter != null) return reply({ error: "rate limited" }, 429, { "Retry-After": String(retryAfter) });

  const token = process.env.GIVEAWAY_STATS_TOKEN?.trim();
  if (!token) {
    console.error("[giveaway-stats] not configured — GIVEAWAY_STATS_TOKEN is unset (Vercel → Settings → Environment Variables).");
    return reply({ error: "not configured" }, 503);
  }
  if (!tokenMatches(presentedToken(request, url), token)) return reply({ error: "unauthorized" }, 401);

  if (!giveawayEngineEnabled()) return reply({ ok: true, engine: "off" }, 200);
  const store = giveawayStore();
  if (!store) return reply({ error: "store unavailable" }, 503);
  try {
    return reply(await giveawayStats(store, giveawayNow()), 200);
  } catch (err) {
    console.error(`[giveaway-stats] ${err instanceof Error ? err.message : "unknown error"}`);
    return reply({ error: "stats unavailable" }, 500);
  }
}
