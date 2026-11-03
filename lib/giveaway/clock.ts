/**
 * The giveaway's clock. Every "is it time?" question — the page mode, which
 * drawings and sends are due, the early-bird cut-off, the offer window, a
 * claim deadline — asks `giveawayNow()`, never `new Date()` directly, so a
 * test run can walk the whole week in minutes by moving ONE clock
 * (check:giveaway sets it through /api/giveaway/test-clock).
 *
 * The fake clock (and GIVEAWAY_FAKE_NOW, below) is honoured only when the
 * giveaway env is local or test (lib/giveaway/env.ts). On production and preview it is ignored, loudly,
 * so nothing can make the real giveaway think it is Saturday.
 */

import { giveawayEnv, isTestingEnv } from "./env";

const g = globalThis as unknown as { __hbcGiveawayFakeNow?: number | null };

export function giveawayNow(env: Record<string, string | undefined> = process.env): Date {
  const testing = isTestingEnv(giveawayEnv(env));
  const fake = g.__hbcGiveawayFakeNow;
  if (fake != null && testing) return new Date(fake);
  // A fixed "now" from the environment (Ben, 2026-11-03): a Vercel preview
  // runs many server instances, so the in-process fake clock cannot hold
  // there. GIVEAWAY_FAKE_NOW (an ISO instant) pins every instance to one
  // moment — honoured only in a testing env (test/local), never production
  // or preview giveaway envs.
  const pinned = testing ? env.GIVEAWAY_FAKE_NOW?.trim() : "";
  if (pinned) {
    const at = new Date(pinned);
    if (!Number.isNaN(at.getTime())) return at;
  }
  return new Date();
}

/** Set (or clear with null) the fake clock. False when refused. */
export function setFakeNow(at: Date | null, log: Pick<Console, "error" | "log"> = console): boolean {
  if (!isTestingEnv(giveawayEnv())) {
    log.error(`[giveaway clock] fake clock refused for env "${giveawayEnv()}"`);
    return false;
  }
  g.__hbcGiveawayFakeNow = at ? at.getTime() : null;
  log.log(`[giveaway clock] now = ${at ? at.toISOString() : "real time"}`);
  return true;
}

export function fakeNowActive(): boolean {
  return g.__hbcGiveawayFakeNow != null && isTestingEnv(giveawayEnv());
}
