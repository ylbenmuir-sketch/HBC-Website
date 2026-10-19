import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { fakeNowActive, giveawayNow, setFakeNow } from "@/lib/giveaway/clock";
import { giveawayEnv, isTestingEnv } from "@/lib/giveaway/env";
import { giveawayStore, isGiveawayTable, memoryDb } from "@/lib/giveaway/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * check:giveaway's time machine. Only answers when the giveaway env is local
 * or test (404 otherwise, as if it did not exist) and the caller carries the
 * CRON_SECRET. POST {"now": "<iso>"} moves the clock, {"now": null} restores
 * real time, {"reset": true} forgets this env's rows in memory mode.
 */
function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const got = Buffer.from(request.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function GET(request: Request) {
  if (!isTestingEnv(giveawayEnv())) return new NextResponse(null, { status: 404 });
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  // ?dump=<giveaway table>: this env's rows, for the check's assertions.
  const table = new URL(request.url).searchParams.get("dump");
  if (table) {
    if (!isGiveawayTable(table)) return NextResponse.json({ error: "not a giveaway table" }, { status: 400 });
    const store = giveawayStore();
    if (!store) return NextResponse.json({ error: "no store" }, { status: 503 });
    const { data, error } = await store.select(table, "*");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ env: store.env, table, rows: data ?? [] });
  }
  return NextResponse.json({ env: giveawayEnv(), now: giveawayNow().toISOString(), fake: fakeNowActive(), memory: Boolean(memoryDb()) });
}

export async function POST(request: Request) {
  if (!isTestingEnv(giveawayEnv())) return new NextResponse(null, { status: 404 });
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { now?: string | null; reset?: boolean } | null;
  if (body && "now" in body) {
    const at = body.now ? new Date(body.now) : null;
    if (at && Number.isNaN(at.getTime())) return NextResponse.json({ error: "bad time" }, { status: 400 });
    setFakeNow(at);
  }
  let reset = false;
  if (body?.reset) {
    const db = memoryDb();
    if (db) {
      db.resetEnv(giveawayEnv());
      reset = true;
    }
  }
  return NextResponse.json({ env: giveawayEnv(), now: giveawayNow().toISOString(), fake: fakeNowActive(), reset });
}
