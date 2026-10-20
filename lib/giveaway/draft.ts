/**
 * The display-only switch for the "[DRAFT] " prefix (Ben, 2026-10-19).
 *
 * GIVEAWAY_HIDE_DRAFT_TAGS=1 strips the prefix from everything RENDERED —
 * pages, admin, email previews — so the copy can be read as a visitor will
 * read it. It is honoured locally and on a Vercel preview only; production
 * always shows the tags.
 *
 * It unlocks nothing: COPY_IS_DRAFT (lib/giveaway/copy.ts) stays true and
 * lib/giveaway/send.ts refuses to send while it is, whatever the subject
 * line looks like. lib/giveaway/draft.test.mjs proves both.
 */

import { giveawayEnv } from "./env";

export function hideDraftTags(env: Record<string, string | undefined> = process.env): boolean {
  if (env.GIVEAWAY_HIDE_DRAFT_TAGS?.trim() !== "1") return false;
  return giveawayEnv(env) !== "production";
}
