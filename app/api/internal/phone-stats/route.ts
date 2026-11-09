import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getCache } from "@vercel/functions";
import {
  CENTERS,
  NOTE,
  addDays,
  buildResponse,
  chicagoDate,
  dayStartMs,
  emptyTapRowCounts,
  fetchDays,
  fillNote,
  parseRange,
  type DayRow,
} from "@/lib/phone-stats";
import { supabaseAdmin } from "@/lib/consultation";
import { TAP_LOGGING_START } from "@/lib/tap";
import { TAP_FIELDS, countTaps, type TapStatRow } from "@/lib/tap-stats";

/**
 * GET /api/internal/phone-stats?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * Daily Dialpad call and text COUNTS per center for the outside reporting
 * bot (README "Phone stats for reporting"). Aggregate only: see
 * lib/phone-stats.ts for what is counted and the privacy rule.
 *
 * Order of refusals: rate limit (so token guesses are limited too), then
 * 503 when PHONE_STATS_TOKEN or DIALPAD_STATS_API_KEY is unset, then 401
 * for a wrong or missing token, then 400 for a bad range.
 *
 * Each day's rows are kept in Vercel's runtime cache — 6 hours for a
 * finished day, 15 minutes for today — so however often the bot asks,
 * Dialpad is read at most that often per day. Days whose calls or texts
 * could not be read are not cached and are retried on the next request.
 *
 * The tap counts (taps_*, by_location — Ben, 2026-11-09; lib/tap-stats.ts)
 * are read from the contact_taps table on every request and merged AFTER
 * the cache: the nightly match (/api/cron/tap-match) changes a finished
 * day's numbers, and a six-hour-old copy would be wrong until it expired.
 * One query, counts only.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Dialpad's text export is asynchronous and can take minutes. */
export const maxDuration = 300;

const HEADERS = {
  "Cache-Control": "private, no-store",
  "X-Robots-Tag": "noindex, nofollow",
};

function reply(body: unknown, status: number, extra: Record<string, string> = {}) {
  return NextResponse.json(body, { status, headers: { ...HEADERS, ...extra } });
}

/* --- rate limit: 30 an hour per address ------------------------------------
   In memory, so per instance (the lib/chat/rate-limit.ts caveat). The cache
   below is what actually protects Dialpad; this stops token guessing. */
const PER_HOUR = 30;
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

/* --- token: header first, ?token= for bots that cannot set one ----------- */
function presentedToken(request: Request, url: URL): string {
  const auth = request.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(.+)$/i.exec(auth.trim());
  return m ? m[1].trim() : (url.searchParams.get("token") ?? "").trim();
}

/** Both sides hashed first, so the compare is constant-time whatever the
 *  length of what was sent. */
function tokenMatches(got: string, want: string): boolean {
  if (!got) return false;
  const a = createHash("sha256").update(got).digest();
  const b = createHash("sha256").update(want).digest();
  return timingSafeEqual(a, b);
}

/* --- per-day cache --------------------------------------------------------- */
type CachedDay = { rows: DayRow[]; textsScope: boolean };

const TTL_DONE = 6 * 3600;
const TTL_TODAY = 15 * 60;
const cache = getCache({ namespace: "phone-stats-v1" });

async function readCache(day: string): Promise<CachedDay | null> {
  try {
    const v = (await cache.get(day)) as CachedDay | null;
    return v && Array.isArray(v.rows) ? v : null;
  } catch {
    return null;
  }
}

/** Runs of consecutive days, so one Dialpad read covers each run. */
function runs(days: string[]): string[][] {
  const out: string[][] = [];
  for (const d of days) {
    const last = out[out.length - 1];
    const prev = last?.[last.length - 1];
    if (prev && Date.parse(`${d}T00:00:00Z`) - Date.parse(`${prev}T00:00:00Z`) === 86_400_000) last.push(d);
    else out.push([d]);
  }
  return out;
}

export async function GET(request: Request) {
  const now = Date.now();
  const url = new URL(request.url);

  const retryAfter = limited(clientIp(request), now);
  if (retryAfter != null) {
    return reply({ error: "rate limited" }, 429, { "Retry-After": String(retryAfter) });
  }

  const token = process.env.PHONE_STATS_TOKEN?.trim();
  const apiKey = process.env.DIALPAD_STATS_API_KEY?.trim();
  if (!token || !apiKey) {
    console.error(
      `[phone-stats] not configured — ${!token ? "PHONE_STATS_TOKEN" : "DIALPAD_STATS_API_KEY"} is unset (Vercel → Settings → Environment Variables).`
    );
    return reply({ error: "not configured" }, 503);
  }
  if (!tokenMatches(presentedToken(request, url), token)) {
    return reply({ error: "unauthorized" }, 401);
  }

  const today = chicagoDate(now);
  const range = parseRange(url.searchParams.get("from"), url.searchParams.get("to"), today);
  if (!range.ok) return reply({ error: range.error }, 400);
  const { days } = range;

  const byDay = new Map<string, CachedDay>();
  const cached = await Promise.all(days.map(readCache));
  days.forEach((d, i) => {
    const hit = cached[i];
    if (hit) byDay.set(d, hit);
  });
  const missing = days.filter((d) => !byDay.has(d));

  const callsFailed: string[] = [];
  const keyRejected: string[] = [];
  const textsFailed: string[] = [];
  for (const run of runs(missing)) {
    const got = await fetchDays({ apiKey, fetch }, run, today);
    for (const day of run) {
      const entry: CachedDay = {
        rows: got.rows.filter((r) => r.date === day),
        textsScope: got.texts === "scope",
      };
      byDay.set(day, entry);
      if (got.calls === "rejected") keyRejected.push(day);
      else if (got.calls === "failed") callsFailed.push(day);
      if (got.texts === "failed" && got.calls !== "rejected") textsFailed.push(day);
      if (got.calls !== "ok" || got.texts === "failed") continue;
      const ttl = day === today || got.texts === "scope" ? TTL_TODAY : TTL_DONE;
      try {
        await cache.set(day, entry, { ttl, name: `phone-stats ${day}` });
      } catch {
        // Uncached is only slower.
      }
    }
    // Counts and statuses only — never a Dialpad body.
    console.log(
      `[phone-stats] read ${run[0]}..${run[run.length - 1]} calls=${got.calls} texts=${got.texts}`
    );
  }

  const notes: string[] = [NOTE.definitions, NOTE.firstTime];
  if (days.some((d) => byDay.get(d)!.textsScope)) notes.push(NOTE.textsScope);
  if (textsFailed.length) notes.push(fillNote(NOTE.textsFailed, textsFailed));
  if (callsFailed.length) notes.push(fillNote(NOTE.callsFailed, callsFailed));
  if (keyRejected.length) notes.push(fillNote(NOTE.keyRejected, keyRejected));
  if (days.includes(today)) notes.push(fillNote(NOTE.today, [today]));

  // The tap counts, fresh (see the header). Every row starts null; a day
  // on or after TAP_LOGGING_START with the table readable gets zeros and
  // counts; days before the log existed stay null — nothing was recorded.
  const rows: DayRow[] = days.flatMap((d) => byDay.get(d)!.rows.map((r) => ({ ...r, ...emptyTapRowCounts(), by_location: null })));
  const taps = await readTaps(days);
  if (taps === null) notes.push(NOTE.tapsUnavailable);
  else {
    notes.push(fillNote(NOTE.taps, [TAP_LOGGING_START]));
    for (const row of rows) {
      if (row.date < TAP_LOGGING_START) continue;
      const counts = taps.get(`${row.date}|${row.center}`);
      for (const f of TAP_FIELDS) row[f] = counts?.[f] ?? 0;
      row.by_location = counts ? counts.by_location as DayRow["by_location"] : {};
    }
  }

  return reply(buildResponse({ days, rows, notes, now: new Date(now) }), 200);
}

/** The tap rows for `days`, counted per day per center (lib/tap-stats.ts).
 *  Null when the table cannot be read, and the response says so. */
async function readTaps(days: string[]) {
  const supabase = supabaseAdmin();
  if (!supabase) return null;
  const from = new Date(dayStartMs(days[0])).toISOString();
  const to = new Date(dayStartMs(addDays(days[days.length - 1], 1))).toISOString();
  try {
    const { data, error } = await supabase
      .from("contact_taps")
      .select("ts, center, link_type, location, match_status, answered, duration_bucket, replied_within_24h")
      .gte("ts", from)
      .lt("ts", to)
      .limit(50_000);
    if (error) {
      console.error(`[phone-stats] taps not read: ${error.message}${error.code ? ` (code ${error.code})` : ""}`);
      return null;
    }
    return countTaps((data ?? []) as TapStatRow[], days, CENTERS);
  } catch (err) {
    console.error(`[phone-stats] taps not read: ${err instanceof Error ? err.name : "unknown error"}`);
    return null;
  }
}
