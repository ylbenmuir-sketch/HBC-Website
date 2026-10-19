/**
 * Which deployment's giveaway rows this process may read and write
 * (GIVEAWAY-PLAN.md §3): every giveaway table carries `env`, and every read
 * and write goes through lib/giveaway/store.ts, which stamps and filters on
 * this value. A test run on a preview or a laptop can therefore never draw
 * from, email, or count a real entrant — the same idea as LEAD_HOLD_ENV in
 * lib/held-notification.ts.
 *
 *   GIVEAWAY_ENV   explicit: production | preview | local | test
 *   VERCEL_ENV     production → production, preview → preview,
 *                  development → local
 *   neither        local
 *
 * Anything unrecognised in GIVEAWAY_ENV is refused loudly rather than
 * guessed: a typo must not land test rows in production.
 */

export const GIVEAWAY_ENVS = ["production", "preview", "local", "test"] as const;
export type GiveawayEnv = (typeof GIVEAWAY_ENVS)[number];

export function isGiveawayEnv(value: unknown): value is GiveawayEnv {
  return typeof value === "string" && (GIVEAWAY_ENVS as readonly string[]).includes(value);
}

export function giveawayEnv(env: Record<string, string | undefined> = process.env): GiveawayEnv {
  const explicit = env.GIVEAWAY_ENV?.trim();
  if (explicit) {
    if (isGiveawayEnv(explicit)) return explicit;
    throw new Error(`GIVEAWAY_ENV="${explicit}" is not one of ${GIVEAWAY_ENVS.join(", ")}`);
  }
  const vercel = env.VERCEL_ENV?.trim();
  if (vercel === "production") return "production";
  if (vercel === "preview") return "preview";
  return "local";
}

/** True for the two envs a check or a test may write to. */
export function isTestingEnv(env: GiveawayEnv): boolean {
  return env === "test" || env === "local";
}
