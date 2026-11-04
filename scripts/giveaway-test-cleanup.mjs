/**
 * The shared cleanup behind `scripts/giveaway-reset-env.mjs` and the end of
 * every `check:giveaway -- --db` run (Ben, 2026-11-03: the check deletes
 * every TEST row it creates).
 *
 *   resetGiveawayEnv(store)        every giveaway row of one TESTING env
 *                                  (test | local) deleted; the drawings
 *                                  reset to "scheduled"; the prize seed kept
 *   deleteTestLeads(db, sinceIso)  consultation_requests rows with an
 *                                  @example.test email created since the run
 *                                  began (the check's bookings: "TEST Dan
 *                                  Tester", "TEST NoJS Tester", GIFT-MON)
 *
 * Every giveaway delete goes through GiveawayStore, which adds
 * `env = <env>`, so a production or preview row cannot be touched. The
 * leads delete is pinned to the reserved example.test domain (RFC 2606: no
 * real visitor can have it) AND the run's start time.
 */

/** Children before parents (0010's foreign keys). */
export const GIVEAWAY_TABLES = ["giveaway_drawing_pool", "giveaway_winners", "scheduled_sends", "giveaway_offers", "giveaway_entries", "giveaway_notify", "giveaway_people", "giveaway_audit", "rate_limits", "giveaway_admin_allowlist"];

export async function countGiveawayRows(store) {
  const out = {};
  for (const t of GIVEAWAY_TABLES) {
    const { count, error } = await store.select(t, "env", { count: "exact", head: true });
    if (error) throw new Error(`${t}: ${error.message}`);
    out[t] = count ?? 0;
  }
  const { count: drawn } = await store.select("giveaway_drawings", "env", { count: "exact", head: true }).neq("status", "scheduled");
  out["giveaway_drawings not scheduled"] = drawn ?? 0;
  return out;
}

export async function resetGiveawayEnv(store) {
  if (store.env !== "test" && store.env !== "local") throw new Error(`refused: env must be "test" or "local" (got ${JSON.stringify(store.env)})`);
  const must = (label, r) => {
    if (r.error) throw new Error(`${label}: ${r.error.message}`);
  };
  // The drawings point at entries and people: clear those links first.
  must("drawings reset", await store.update("giveaway_drawings", { status: "scheduled", pool_snapshot_hash: null, pool_size: null, entries_count: null, seed: null, winner_entry_id: null, winner_person_id: null, drawn_at: null, drawn_by: null, claimed_at: null }).neq("status", "__none__"));
  // People refer to people (referred_by).
  must("people referrals", await store.update("giveaway_people", { referred_by_person_id: null }).not("referred_by_person_id", "is", null));
  // store.delete() carries `env = <env>`: the only filter, and the one that matters.
  for (const t of GIVEAWAY_TABLES) must(t, await store.delete(t));
}

/** Returns the number of rows deleted. */
export async function deleteTestLeads(db, sinceIso) {
  if (!sinceIso) throw new Error("deleteTestLeads needs the run's start time");
  const { data, error } = await db.from("consultation_requests").delete().ilike("email", "%@example.test").gte("created_at", sinceIso).select("id");
  if (error) throw new Error(`consultation_requests: ${error.message}`);
  return (data ?? []).length;
}

/** SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY from the environment, else .env.local (never overriding a set key). */
export function supabaseCredentials(root, readFileSync, existsSync, join) {
  const env = { ...process.env };
  const file = join(root, ".env.local");
  if (existsSync(file)) {
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
      if (m && env[m[1]] === undefined) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return { url: env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || "", key: env.SUPABASE_SERVICE_ROLE_KEY || "" };
}
