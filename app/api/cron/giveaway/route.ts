import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { giveawayNow } from "@/lib/giveaway/clock";
import { runDueDrawings } from "@/lib/giveaway/drawings";
import { liveNotifier, sendDeps } from "@/lib/giveaway/notify";
import { runDueSends, scheduleJobs } from "@/lib/giveaway/sends";
import { giveawayStore } from "@/lib/giveaway/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Every minute (vercel.json): draw whatever drawing is due, then send
 * whatever scheduled email is due (GIVEAWAY-PLAN.md §4). Both are
 * idempotent on their unique keys, so a missed minute is caught by the next
 * and a doubled minute does nothing twice. Protected by CRON_SECRET exactly
 * like /api/cron/release-held-leads (lib/release-job.ts).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.error("[giveaway cron] CRON_SECRET is not set — refusing (nothing is drawn or sent until it is)");
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }
  const got = Buffer.from(request.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  if (got.length !== want.length || !timingSafeEqual(got, want)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const store = giveawayStore();
  if (!store) return NextResponse.json({ error: "database not configured" }, { status: 503 });
  const now = giveawayNow();
  let scheduled = 0;
  try {
    scheduled = await scheduleJobs(store);
  } catch (err) {
    console.error(`[giveaway cron] schedule: ${err instanceof Error ? err.message : "unknown"}`);
  }
  const drawings = await runDueDrawings(store, now, "cron", liveNotifier(store, giveawayNow));
  let sends = { jobs: 0, sent: 0, skipped: 0, failed: 0 };
  try {
    sends = await runDueSends(store, now, sendDeps(store));
  } catch (err) {
    console.error(`[giveaway cron] sends: ${err instanceof Error ? err.message : "unknown"}`);
  }
  if (drawings.due || sends.jobs) {
    console.log(`[giveaway cron] env=${store.env} now=${now.toISOString()} drawings due=${drawings.due} drawn=${drawings.drawn.map((d) => d.drawing.slot).join(",") || "-"} sends jobs=${sends.jobs} sent=${sends.sent} skipped=${sends.skipped} failed=${sends.failed}`);
  }
  return NextResponse.json({
    ok: true,
    env: store.env,
    now: now.toISOString(),
    scheduled,
    drawings: { due: drawings.due, drawn: drawings.drawn.map((d) => ({ slot: d.drawing.slot, winner: d.winner.id })), skipped: drawings.skipped },
    sends,
  });
}
