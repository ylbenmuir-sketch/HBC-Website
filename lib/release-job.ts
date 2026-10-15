// The release job for held staff notifications (lib/held-notification.ts),
// shared by its two Vercel Cron routes:
//
//   /api/cron/release-held-leads   every minute — writes the heartbeat step
//                                  one checks before holding, then sends
//                                  everything due
//   /api/cron/lead-backstop        once a day — sends anything still due,
//                                  writes NO heartbeat, so it can never be
//                                  what makes step one start holding
//
// Both are protected by CRON_SECRET, Vercel's standard: Vercel sends
// `Authorization: Bearer <CRON_SECRET>` on every cron call when the variable
// is set. Unset, both routes refuse every call (503) and step one sends at
// once, exactly as before the hold existed.

import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { RELEASE_JOB, holdEnv, releaseDue, type ReleasedBy } from "./held-notification";
import { sendHeldRow, supabaseHeldStore } from "./held-notification-store";

function authorized(request: Request, secret: string): boolean {
  const got = Buffer.from(request.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

export async function runReleaseJob(request: Request, kind: "minute" | "backstop") {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.error(
      `[release job] CRON_SECRET is not set — refusing. Form leads are emailed at step one until it is (Vercel → Settings → Environment Variables).`
    );
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }
  if (!authorized(request, secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const env = holdEnv();
  const now = new Date();
  if (kind === "minute") {
    try {
      await supabaseHeldStore.beat(`${RELEASE_JOB}:${env}`, now);
    } catch (err) {
      // No heartbeat → step one stops holding within HEARTBEAT_FRESH_MS.
      console.error(`[release job] ${err instanceof Error ? err.message : "heartbeat failed"}`);
    }
  }
  const by: ReleasedBy = kind === "minute" ? "cron" : "sweep";
  const result = await releaseDue(supabaseHeldStore, sendHeldRow, {
    env,
    by,
    now,
    limit: kind === "minute" ? 20 : 200,
  });
  if (result.due > 0 || kind === "backstop") {
    console.log(`[release job] ${kind} env=${env} due=${result.due} sent=${result.sent} failed=${result.failed}`);
  }
  return NextResponse.json({ ok: true, env, ...result });
}

let sweepQueryFailedLogged = false;
/** The sweep's own logger: a failing due query (migration 0009 not applied
 *  yet, say) is said once per server instance, not after every request.
 *  A failed SEND is still logged every time. */
const sweepLog: Pick<Console, "log" | "error"> = {
  log: (m: string) => console.log(m),
  error: (m: string) => {
    if (/due query failed/.test(m)) {
      if (sweepQueryFailedLogged) return;
      sweepQueryFailedLogged = true;
    }
    console.error(m);
  },
};

/**
 * A quiet sweep run after a lead request has answered (next/server `after`):
 * anything overdue for this deployment goes out even if a cron tick is
 * late. Never throws.
 */
export async function sweepDue(): Promise<void> {
  try {
    await releaseDue(supabaseHeldStore, sendHeldRow, { env: holdEnv(), by: "sweep", limit: 5 }, sweepLog);
  } catch (err) {
    console.error(`[held notification] sweep threw: ${err instanceof Error ? err.message : "unknown error"}`);
  }
}
