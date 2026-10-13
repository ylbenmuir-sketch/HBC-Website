// Shared by the two consultation route handlers — the POST that saves a
// request (app/api/consultation/route.ts) and the PATCH that adds the
// optional second step to it (app/api/consultation/[id]/route.ts). A route
// file may export only its handlers, so the pieces both need live here.

import { createClient } from "@supabase/supabase-js";

/** The three answers to "who are we helping?" — the row and the platform
 *  contract (lib/inquiry-intake.ts) both understand exactly these. */
export const HELPING_OPTIONS = new Set(["My child", "Myself", "Someone else"]);

/**
 * What a consultation row says when the visitor did not choose a center. The
 * form's <select> defaults to this string; the chat records null when she
 * declines the question. Migration 0004 made `preferred_center` required —
 * the inbox and the Dialpad line are both routed by it — so the two channels
 * now write the same value for "unsure", on every insert.
 */
export const CENTER_UNSPECIFIED = "Not sure yet";

/** A trimmed, bounded string, or null for anything else (missing, wrong type,
 *  empty, too long). The caller decides whether null is an error. */
export function str(value: unknown, maxLen: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLen ? trimmed : null;
}

/** The concern chips, as sent by the form. Strings, not an enum: the chat may
 *  one day send its own words, and the row is read by a person. Capped so a
 *  scripted post cannot store a novel. */
export function concernList(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter((c): c is string => typeof c === "string")
        .map((c) => c.trim())
        .filter((c) => c.length > 0 && c.length <= 60)
        .slice(0, 10)
    : [];
}

/** One service-role client per call, or null when the env is not set — that
 *  is the Supabase destination failing, not the request. Server-side only. */
export function supabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
