/**
 * The thank-you gift's spots, counts only (fix list rev 2, P0-10 / P1-2):
 * "Nashville: 12 of 40 left · Murfreesboro: 8 of 30 left", read from
 * giveaway_offers.redeemed_center through GiveawayStore at the moment it is
 * shown or sent. No names, no codes — a count per center.
 *
 * Returns null while GIFT_CAP (config) has no caps, so nothing claims a
 * scarcity that has not been set.
 */

import { GIFT_CAP } from "./config";
import type { GiveawayStore } from "./store";

export type CenterSpots = { center: "Nashville" | "Murfreesboro"; cap: number; redeemed: number; left: number };

export async function giftSpots(store: GiveawayStore, caps = GIFT_CAP): Promise<CenterSpots[] | null> {
  const centers = [
    { center: "Nashville" as const, cap: caps.nashville },
    { center: "Murfreesboro" as const, cap: caps.murfreesboro },
  ].filter((c): c is { center: "Nashville" | "Murfreesboro"; cap: number } => c.cap != null);
  if (centers.length === 0) return null;
  const { data, error } = await store.select("giveaway_offers", "redeemed_center, fallback").not("redeemed_at", "is", null);
  if (error) throw new Error(`gift spots: ${error.message}`);
  // A fallback redemption (migration 0015) never takes a spot.
  const rows = ((data ?? []) as Array<{ redeemed_center: string | null; fallback?: boolean }>).filter((r) => !r.fallback);
  return centers.map(({ center, cap }) => {
    const redeemed = rows.filter((r) => r.redeemed_center === center).length;
    return { center, cap, redeemed, left: Math.max(0, cap - redeemed) };
  });
}

/** "Nashville: 12 of 40 left · Murfreesboro: all claimed" */
export function spotsLine(spots: CenterSpots[]): string {
  return spots.map((s) => (s.left > 0 ? `${s.center}: ${s.left} of ${s.cap} left` : `${s.center}: all claimed`)).join(" · ");
}
