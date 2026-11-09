import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/consultation";
import {
  addDays,
  chicagoDate,
  callEvents,
  dayStartMs,
  exportTexts,
  listCalls,
  textEvents,
  type CallEvent,
  type TextEvent,
} from "@/lib/phone-stats";
import { TAP_MATCH_WINDOW_MS, type TapCenter, type TapLinkType } from "@/lib/tap";
import { REPLY_WINDOW_MS, matchTaps, type TapRow } from "@/lib/tap-match";

/**
 * GET /api/cron/tap-match — pair logged taps with the Dialpad call or text
 * that followed them (lib/tap-match.ts), and record the outcome on the tap
 * row. Nightly from Vercel Cron (vercel.json, 08:15 UTC = 2:15 CST / 3:15
 * CDT), and on request for a completed day:
 *
 *   GET /api/cron/tap-match                 the sweep: every pending tap
 *                                           from the last three days whose
 *                                           window has closed, plus matched
 *                                           texts whose 24-hour reply is
 *                                           still unknown
 *   GET /api/cron/tap-match?day=YYYY-MM-DD  rematch every tap on that
 *                                           (completed) Chicago day from
 *                                           scratch
 *
 * Auth: `Authorization: Bearer <CRON_SECRET>` (what Vercel Cron sends), or
 * the reporting bot's PHONE_STATS_TOKEN for the on-request form. Reads
 * Dialpad with DIALPAD_STATS_API_KEY — the same read-only key and the same
 * two readers as /api/internal/phone-stats; the raw records live in this
 * function and go out of scope when it returns. What is written to a tap
 * row: a status, a Dialpad event id, and the verdicts (answered, bucket,
 * replied). Never a number.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Dialpad's text export is asynchronous and can take minutes. */
export const maxDuration = 300;

const HEADERS = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" };
const reply = (body: unknown, status: number) => NextResponse.json(body, { status, headers: HEADERS });

function tokenMatches(got: string, want: string): boolean {
  if (!got || !want) return false;
  return timingSafeEqual(createHash("sha256").update(got).digest(), createHash("sha256").update(want).digest());
}

function authorized(request: Request): boolean {
  const m = /^Bearer\s+(.+)$/i.exec((request.headers.get("authorization") ?? "").trim());
  const got = m ? m[1].trim() : "";
  const cron = process.env.CRON_SECRET?.trim() ?? "";
  const stats = process.env.PHONE_STATS_TOKEN?.trim() ?? "";
  return tokenMatches(got, cron) || tokenMatches(got, stats);
}

type DbTap = {
  id: string;
  ts: string;
  link_type: TapLinkType;
  center: TapCenter;
  match_status: "pending" | "matched" | "unmatched";
  dialpad_event_id: string | null;
  replied_within_24h: boolean | null;
};

const TAP_COLUMNS = "id, ts, link_type, center, match_status, dialpad_event_id, replied_within_24h";

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET?.trim() && !process.env.PHONE_STATS_TOKEN?.trim()) {
    console.error("[tap match] neither CRON_SECRET nor PHONE_STATS_TOKEN is set — refusing.");
    return reply({ error: "not configured" }, 503);
  }
  if (!authorized(request)) return reply({ error: "unauthorized" }, 401);
  const apiKey = process.env.DIALPAD_STATS_API_KEY?.trim();
  if (!apiKey) {
    console.error("[tap match] DIALPAD_STATS_API_KEY is unset — nothing matched.");
    return reply({ error: "not configured" }, 503);
  }
  const supabase = supabaseAdmin();
  if (!supabase) return reply({ error: "not configured" }, 503);

  const now = Date.now();
  const today = chicagoDate(now);
  const url = new URL(request.url);
  const day = url.searchParams.get("day");
  if (day !== null && (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day >= today)) {
    return reply({ error: "day must be a completed Chicago day, YYYY-MM-DD" }, 400);
  }

  // The taps to decide. The sweep: pending taps and reply-unknown texts from
  // the last three days (anything older is left as it is). A day: every tap
  // on it, from scratch.
  let query = supabase.from("contact_taps").select(TAP_COLUMNS).order("ts", { ascending: true }).limit(5000);
  if (day) {
    query = query.gte("ts", new Date(dayStartMs(day)).toISOString()).lt("ts", new Date(dayStartMs(addDays(day, 1))).toISOString());
  } else {
    query = query
      .gte("ts", new Date(now - 3 * 86_400_000).toISOString())
      .or("match_status.eq.pending,and(match_status.eq.matched,link_type.eq.text,replied_within_24h.is.null)");
  }
  const { data, error } = await query;
  if (error) {
    const missing = error.code === "PGRST205" || error.code === "42P01";
    console.error(`[tap match] taps not read: ${error.message}${missing ? " — migration 0019 is not applied" : ""}`);
    return reply({ error: missing ? "contact_taps table missing (migration 0019)" : "taps not read" }, 503);
  }
  const taps = ((data ?? []) as DbTap[]).map<TapRow>((t) => ({
    id: t.id,
    ts: Date.parse(t.ts),
    link_type: t.link_type,
    center: t.center,
    // A full-day rematch starts every tap over.
    match_status: day ? "pending" : t.match_status,
    dialpad_event_id: day ? null : t.dialpad_event_id,
    replied_within_24h: day ? null : t.replied_within_24h,
  }));
  if (taps.length === 0) return reply({ ok: true, taps: 0, decided: 0, matched: 0 }, 200);

  // The Dialpad span: from the first tap to the last tap's reply window, no
  // later than now. One read of each kind.
  const first = Math.min(...taps.map((t) => t.ts));
  const last = Math.max(...taps.map((t) => t.ts));
  const spanStart = first - 60_000;
  const spanEnd = Math.min(now, last + TAP_MATCH_WINDOW_MS + REPLY_WINDOW_MS + 60_000);
  let calls: CallEvent[] = [];
  let texts: TextEvent[] = [];
  let callsRead = "ok";
  let textsRead = "ok";
  try {
    calls = callEvents(await listCalls({ apiKey, fetch }, spanStart, spanEnd));
  } catch {
    callsRead = "failed";
  }
  const textResult = await exportTexts({ apiKey, fetch }, chicagoDate(spanStart), chicagoDate(spanEnd), today);
  if (textResult.ok) texts = textEvents(textResult.rows);
  else textsRead = textResult.reason;

  // Event ids already taken by other taps, so a sweep cannot reuse one.
  const used = new Set<string>();
  if (!day) {
    const { data: taken } = await supabase
      .from("contact_taps")
      .select("dialpad_event_id")
      .not("dialpad_event_id", "is", null)
      .gte("ts", new Date(spanStart - 86_400_000).toISOString());
    for (const r of (taken ?? []) as { dialpad_event_id: string | null }[]) if (r.dialpad_event_id) used.add(r.dialpad_event_id);
  }

  // Without the Dialpad data for a kind, that kind's taps are left pending
  // for the next run rather than written as unmatched.
  const decidable = taps.filter((t) => (t.link_type === "phone" ? callsRead === "ok" : textsRead === "ok"));
  const decisions = matchTaps({ taps: decidable, calls, texts, now, used });

  let written = 0;
  let matched = 0;
  for (const d of decisions) {
    const { id, ...fields } = d;
    const { error: writeError } = await supabase
      .from("contact_taps")
      .update({ ...fields, matched_at: new Date(now).toISOString() })
      .eq("id", id);
    if (writeError) {
      console.error(`[tap match] tap ${id} not written: ${writeError.message}`);
      continue;
    }
    written++;
    if (d.match_status === "matched") matched++;
  }
  console.log(`[tap match] ${day ? `day ${day}` : "sweep"} taps=${taps.length} decided=${written} matched=${matched} calls=${callsRead} texts=${textsRead}`);
  return reply({ ok: true, day: day ?? null, taps: taps.length, decided: written, matched, calls: callsRead, texts: textsRead }, 200);
}
