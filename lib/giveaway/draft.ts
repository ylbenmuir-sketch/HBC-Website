/**
 * The display-only switch for the "[DRAFT] " prefix (Ben, 2026-10-19).
 *
 * The prefix is hidden from everything RENDERED — pages, admin, email
 * previews — in two cases:
 *
 *   - the engine is off (lib/giveaway/engine.ts): /10years is then the
 *     showcase, which Ben wants read as a visitor will read it, on the
 *     real site included (Ben, 2026-10-19, "all [DRAFT] tags hidden");
 *   - GIVEAWAY_HIDE_DRAFT_TAGS=1, locally and on a Vercel preview only.
 *
 * With the engine ON, production always shows the tags: a live giveaway
 * still carrying draft words must be unmistakable.
 *
 * It unlocks nothing: COPY_IS_DRAFT (lib/giveaway/copy.ts) stays true and
 * lib/giveaway/send.ts refuses to send while it is, whatever the subject
 * line looks like. lib/giveaway/draft.test.mjs proves both.
 */

import { giveawayEngineEnabled } from "./engine";
import { giveawayEnv } from "./env";

export function hideDraftTags(env: Record<string, string | undefined> = process.env): boolean {
  if (!giveawayEngineEnabled(env)) return true;
  if (env.GIVEAWAY_HIDE_DRAFT_TAGS?.trim() !== "1") return false;
  return giveawayEnv(env) !== "production";
}
