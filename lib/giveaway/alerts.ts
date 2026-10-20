/**
 * Who gets the staff winner alert (GIVEAWAY-PLAN.md §4; decision 9):
 *
 *   Tue–Fri drawings           → GIVEAWAY_ALERTS        (Denise; cc Ben, Kylie)
 *   Monday and Saturday grand  → GIVEAWAY_ALERTS_OWNER  (Ben; cc Denise)
 *
 * Same format as the LEADS_* lists: first address To, the rest CC. Either
 * unset → LEADS_FALLBACK, then LEADS_NOTIFY_EMAIL, each step logged, so a
 * winner is never drawn into silence. No address is written in code.
 * Import-free apart from lib/lead-routing.ts's parser so the test runs
 * under plain node.
 */

import { LEGACY_ENV, ROUTE_ENV, parseAddressList, type Recipients } from "../lead-routing";
import type { Slot } from "./config";

export const ALERTS_ENV = "GIVEAWAY_ALERTS";
export const ALERTS_OWNER_ENV = "GIVEAWAY_ALERTS_OWNER";

export type AlertRoute = "owner" | "staff";

export function alertRouteFor(slot: Slot): AlertRoute {
  return slot === "mon" || slot === "grand" ? "owner" : "staff";
}

export function alertRecipients(slot: Slot, env: Record<string, string | undefined> = process.env, warn: (m: string) => void = console.warn): Recipients {
  const route = alertRouteFor(slot);
  const chain = [route === "owner" ? ALERTS_OWNER_ENV : ALERTS_ENV, ROUTE_ENV.fallback, LEGACY_ENV];
  const warnings: string[] = [];
  for (let i = 0; i < chain.length; i++) {
    const name = chain[i];
    const { addresses, ignored } = parseAddressList(env[name]);
    if (ignored > 0) {
      const line = `[giveaway alerts] ${name}: ${ignored} entr${ignored === 1 ? "y is" : "ies are"} not an email address and skipped.`;
      warnings.push(line);
      warn(line);
    }
    if (addresses.length) return { route: "fallback", envVar: name, to: addresses[0], cc: addresses.slice(1), warnings };
    const next = chain[i + 1];
    const line = next ? `[giveaway alerts] ${name} is not set (${slot} drawing) — using ${next}.` : `[giveaway alerts] ${name} is not set (${slot} drawing) — nobody to alert.`;
    warnings.push(line);
    warn(line);
  }
  return { route: "fallback", envVar: null, to: null, cc: [], warnings };
}
