/**
 * The drawing engine (GIVEAWAY-PLAN.md §3, §4; decisions 1, 2, 4, 6, 16–18).
 *
 * ── THE POOL ───────────────────────────────────────────────────────────────
 * Every non-void entry whose person is verified and was created before the
 * drawing's time. A DAILY drawing leaves out everyone who currently holds a
 * daily prize (winners with status drawn / contacted / claimed on a daily
 * drawing); the GRAND drawing takes everyone, daily winners included. The
 * pool is frozen into giveaway_drawing_pool in position order and hashed.
 *
 * ── THE PICK ───────────────────────────────────────────────────────────────
 * seed = 32 random bytes (crypto). index = SHA-256(seed ‖ poolHash ‖
 * excluded) mod eligible.length over the frozen pool in position order
 * minus the excluded entries. Deterministic given what is stored, so
 * `reverify()` recomputes every result — the first draw and each redraw —
 * from the rows alone. Weights are row counts: a person with four entries
 * occupies four positions.
 *
 * ── NEVER TWICE ────────────────────────────────────────────────────────────
 * `runDueDrawings` claims a row with one conditional UPDATE (scheduled →
 * drawing); only one caller wins it. A claim older than CLAIM_STALE_MS is a
 * runner that died and may be re-claimed; the pool write and the winner
 * write are idempotent (unique keys), so a re-run finishes what the first
 * started. Unique (env, scheduled_at, kind) means a second tick cannot make
 * a second drawing.
 *
 * ── REDRAW ─────────────────────────────────────────────────────────────────
 * From that drawing's frozen pool, minus every entry of every person already
 * picked for it, minus (daily only) anyone who has won a daily since. The
 * previous winner row becomes `redrawn` with the reason; a new winner row
 * is written with its own seed and exclusion list.
 *
 * Side effects (the alert, the winner email) go through a Notifier passed
 * in, so the tests send nothing.
 */

import { createHash, randomBytes } from "node:crypto";
import { audit } from "./audit";
import { claimDeadline, drawing as drawingFor, prizeVersionFor, type Slot } from "./config";
import { HOLDING_STATUSES, type DrawingRow, type EntryRow, type PersonRow, type PoolRow, type PrizeRow, type WinnerRow } from "./rows";
import type { GiveawayStore } from "./store";
import { randomCode, sha256Hex } from "./tokens";

export const CLAIM_STALE_MS = 5 * 60_000;

export type DrawResult = {
  drawing: DrawingRow;
  winner: WinnerRow;
  person: PersonRow;
  prize: PrizeRow;
  /** The raw claim token (hashed on the row) — only the winner email sees it. */
  claimToken: string;
  redraw: boolean;
};

export interface Notifier {
  /** Called once per result; must not throw. */
  winnerDrawn(result: DrawResult): Promise<void>;
}

export const silentNotifier: Notifier = { winnerDrawn: async () => {} };

const fail = (where: string, error: { message: string } | null) => new Error(`${where}: ${error?.message ?? "unknown error"}`);

/* ------------------------------------------------------------------ */
/* Pure pieces                                                         */
/* ------------------------------------------------------------------ */

export function poolHash(entryIds: string[]): string {
  return createHash("sha256").update(entryIds.join("\n")).digest("hex");
}

/** The deterministic index into `eligible` for a seed. */
export function pickIndex(seed: string, hash: string, excluded: string[], eligibleCount: number): number {
  if (eligibleCount <= 0) throw new Error("empty pool");
  const digest = createHash("sha256").update(`${seed}\n${hash}\n${[...excluded].sort().join(",")}`).digest("hex");
  return Number(BigInt(`0x${digest}`) % BigInt(eligibleCount));
}

export function newSeed(): string {
  return randomBytes(32).toString("hex");
}

/* ------------------------------------------------------------------ */
/* Reads                                                                */
/* ------------------------------------------------------------------ */

export async function drawingBySlot(store: GiveawayStore, slot: Slot): Promise<DrawingRow | null> {
  const { data } = await store.select("giveaway_drawings", "*").eq("slot", slot).maybeSingle();
  return (data as DrawingRow | null) ?? null;
}

export async function drawingById(store: GiveawayStore, id: string): Promise<DrawingRow | null> {
  const { data } = await store.select("giveaway_drawings", "*").eq("id", id).maybeSingle();
  return (data as DrawingRow | null) ?? null;
}

export async function allDrawings(store: GiveawayStore): Promise<DrawingRow[]> {
  const { data, error } = await store.select("giveaway_drawings", "*").order("scheduled_at");
  if (error) throw fail("drawings", error);
  return (data ?? []) as DrawingRow[];
}

export async function winnersOf(store: GiveawayStore, drawingId: string): Promise<WinnerRow[]> {
  const { data, error } = await store.select("giveaway_winners", "*").eq("drawing_id", drawingId).order("created_at");
  if (error) throw fail("winners", error);
  return (data ?? []) as WinnerRow[];
}

/** The current (not redrawn) winner row of a drawing, if any. */
export async function currentWinner(store: GiveawayStore, drawingId: string): Promise<WinnerRow | null> {
  const rows = await winnersOf(store, drawingId);
  return rows.find((w) => w.status !== "redrawn") ?? null;
}

/** People currently holding a DAILY prize. */
export async function dailyHolders(store: GiveawayStore): Promise<Set<string>> {
  const { data: dailies } = await store.select("giveaway_drawings", "id").eq("kind", "daily");
  const ids = ((dailies ?? []) as Array<{ id: string }>).map((d) => d.id);
  if (!ids.length) return new Set();
  const { data, error } = await store.select("giveaway_winners", "person_id, status").in("drawing_id", ids).in("status", [...HOLDING_STATUSES]);
  if (error) throw fail("daily holders", error);
  return new Set(((data ?? []) as Array<{ person_id: string }>).map((w) => w.person_id));
}

/** Verified people (id → row). */
async function verifiedPeople(store: GiveawayStore): Promise<Map<string, PersonRow>> {
  const { data, error } = await store.select("giveaway_people", "*").not("verified_at", "is", null);
  if (error) throw fail("people", error);
  return new Map(((data ?? []) as PersonRow[]).map((p) => [p.id, p]));
}

/** The entries that would make up a drawing's pool right now (preview). */
export async function buildPool(store: GiveawayStore, d: DrawingRow): Promise<{ entries: EntryRow[]; excludedPeople: Set<string> }> {
  const people = await verifiedPeople(store);
  const excludedPeople = d.kind === "daily" ? await dailyHolders(store) : new Set<string>();
  const { data, error } = await store.select("giveaway_entries", "*").is("void_reason", null).lt("created_at", d.scheduled_at).order("created_at").order("id");
  if (error) throw fail("entries", error);
  const entries = ((data ?? []) as EntryRow[]).filter((e) => people.has(e.person_id) && !excludedPeople.has(e.person_id));
  return { entries, excludedPeople };
}

/* ------------------------------------------------------------------ */
/* The draw                                                             */
/* ------------------------------------------------------------------ */

export type RunOutcome = { due: number; drawn: DrawResult[]; skipped: Array<{ slot: Slot; reason: string }> };

/** Every scheduled drawing whose time has come, in order. */
export async function runDueDrawings(store: GiveawayStore, now: Date, by: string, notify: Notifier, log: Pick<Console, "log" | "error"> = console): Promise<RunOutcome> {
  const { data, error } = await store.select("giveaway_drawings", "*").lte("scheduled_at", now.toISOString()).in("status", ["scheduled", "drawing"]).order("scheduled_at");
  if (error) {
    log.error(`[giveaway drawings] due query failed: ${error.message}`);
    return { due: 0, drawn: [], skipped: [] };
  }
  const due = (data ?? []) as DrawingRow[];
  const out: RunOutcome = { due: due.length, drawn: [], skipped: [] };
  for (const d of due) {
    try {
      const r = await drawOne(store, d, now, by, notify, log);
      if (r) out.drawn.push(r);
      else out.skipped.push({ slot: d.slot, reason: "claimed by another runner" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error";
      log.error(`[giveaway drawings] ${d.slot}: ${message}`);
      out.skipped.push({ slot: d.slot, reason: message });
    }
  }
  return out;
}

/** Admin "Draw now" for a slot whose time has passed. */
export async function drawNow(store: GiveawayStore, slot: Slot, now: Date, admin: string, notify: Notifier, log: Pick<Console, "log" | "error"> = console): Promise<DrawResult | { error: string }> {
  const d = await drawingBySlot(store, slot);
  if (!d) return { error: "no such drawing" };
  if (d.status !== "scheduled" && d.status !== "drawing") return { error: `already ${d.status}` };
  if (new Date(d.scheduled_at).getTime() > now.getTime()) return { error: "its time has not come" };
  const r = await drawOne(store, d, now, admin, notify, log);
  return r ?? { error: "another runner has it" };
}

async function drawOne(store: GiveawayStore, d: DrawingRow, now: Date, by: string, notify: Notifier, log: Pick<Console, "log" | "error">): Promise<DrawResult | null> {
  // The claim: exactly one caller turns scheduled → drawing.
  const stale = new Date(now.getTime() - CLAIM_STALE_MS).toISOString();
  const claimScheduled = await store.update("giveaway_drawings", { status: "drawing", claimed_at: now.toISOString() }).eq("id", d.id).eq("status", "scheduled").select("id");
  let claimed = (claimScheduled.data?.length ?? 0) > 0;
  if (!claimed) {
    const reclaim = await store.update("giveaway_drawings", { claimed_at: now.toISOString() }).eq("id", d.id).eq("status", "drawing").lt("claimed_at", stale).select("id");
    claimed = (reclaim.data?.length ?? 0) > 0;
  }
  if (!claimed) return null;

  // A re-run after a crash: the winner may already exist.
  const existing = await currentWinner(store, d.id);
  if (existing) {
    await store.update("giveaway_drawings", { status: "drawn", claimed_at: null }).eq("id", d.id);
    log.log(`[giveaway drawings] ${d.slot}: finishing an interrupted draw`);
    const person = (await store.select("giveaway_people", "*").eq("id", existing.person_id).single()).data as PersonRow;
    const prize = (await store.select("giveaway_prizes", "*").eq("id", existing.prize_id).single()).data as PrizeRow;
    return { drawing: { ...d, status: "drawn" }, winner: existing, person, prize, claimToken: "", redraw: false };
  }

  // Freeze the pool (idempotent: unique (drawing_id, entry_id)).
  const { entries, excludedPeople } = await buildPool(store, d);
  if (entries.length === 0) {
    await store.update("giveaway_drawings", { status: "scheduled", claimed_at: null }).eq("id", d.id);
    await audit(store, { actor: by, action: "draw_skipped_empty_pool", targetTable: "giveaway_drawings", targetId: d.id, reason: "no eligible entries" });
    throw new Error("empty pool — left scheduled");
  }
  const poolRows = entries.map((e, i) => ({ drawing_id: d.id, entry_id: e.id, person_id: e.person_id, position: i }));
  const frozen = await store.upsert("giveaway_drawing_pool", poolRows, { onConflict: "drawing_id,entry_id", ignoreDuplicates: true });
  if (frozen.error) throw fail("freeze pool", frozen.error);
  const hash = poolHash(entries.map((e) => e.id));
  const seed = newSeed();
  const index = pickIndex(seed, hash, [], entries.length);
  const picked = entries[index];
  const result = await writeWinner(store, d, picked, { seed, excluded: [], now, by, redraw: false, reason: null });
  const { error: finErr } = await store
    .update("giveaway_drawings", { status: "drawn", pool_snapshot_hash: hash, pool_size: entries.length, entries_count: entries.length, seed, winner_entry_id: picked.id, winner_person_id: picked.person_id, drawn_at: now.toISOString(), drawn_by: by, claimed_at: null })
    .eq("id", d.id);
  if (finErr) throw fail("finalize drawing", finErr);
  await audit(store, { actor: by, action: "drawn", targetTable: "giveaway_drawings", targetId: d.id, after: { winner: result.winner.id, person: picked.person_id, pool_size: entries.length, excluded_people: [...excludedPeople].length, seed, hash } });
  log.log(`[giveaway drawings] ${d.slot} drawn: pool=${entries.length} winner=${result.winner.id}`);
  const full: DrawResult = { ...result, drawing: { ...d, status: "drawn", pool_snapshot_hash: hash, pool_size: entries.length, seed, winner_entry_id: picked.id, winner_person_id: picked.person_id, drawn_at: now.toISOString(), drawn_by: by } };
  try {
    await notify.winnerDrawn(full);
  } catch (err) {
    log.error(`[giveaway drawings] notify failed: ${err instanceof Error ? err.message : "unknown"}`);
  }
  return full;
}

async function writeWinner(store: GiveawayStore, d: DrawingRow, entry: EntryRow, opts: { seed: string; excluded: string[]; now: Date; by: string; redraw: boolean; reason: string | null }): Promise<Omit<DrawResult, "drawing">> {
  const person = (await store.select("giveaway_people", "*").eq("id", entry.person_id).single()).data as PersonRow;
  const version = prizeVersionFor(person.is_existing_client);
  const prizeRes = await store.select("giveaway_prizes", "*").eq("slot", d.slot).eq("version", version).single();
  if (prizeRes.error) throw fail("prize", prizeRes.error);
  const prize = prizeRes.data as PrizeRow;
  const claimToken = randomCode(24);
  const { data, error } = await store
    .insert("giveaway_winners", {
      drawing_id: d.id,
      person_id: person.id,
      entry_id: entry.id,
      prize_id: prize.id,
      prize_version: version,
      claim_token_hash: sha256Hex(claimToken),
      status: "drawn",
      claim_deadline_at: claimDeadline(opts.now).toISOString(),
      tax_form_required: prize.tax_form_required,
      seed: opts.seed,
      pool_excluded: opts.excluded,
      redraw_reason: null,
    })
    .select("*")
    .single();
  if (error) throw fail("winner", error);
  return { winner: data as WinnerRow, person, prize, claimToken, redraw: opts.redraw };
}

/* ------------------------------------------------------------------ */
/* Redraw                                                               */
/* ------------------------------------------------------------------ */

export async function redraw(store: GiveawayStore, drawingId: string, reason: string, now: Date, admin: string, notify: Notifier, log: Pick<Console, "log" | "error"> = console): Promise<DrawResult | { error: string }> {
  const d = await drawingById(store, drawingId);
  if (!d) return { error: "no such drawing" };
  if (d.status !== "drawn" && d.status !== "redrawn") return { error: `drawing is ${d.status}` };
  if (!reason.trim()) return { error: "a reason is required" };
  const previous = await winnersOf(store, d.id);
  const current = previous.find((w) => w.status !== "redrawn");
  if (!current) return { error: "no current winner" };

  const { data: poolData, error: poolErr } = await store.select("giveaway_drawing_pool", "*").eq("drawing_id", d.id).order("position");
  if (poolErr) return { error: poolErr.message };
  const pool = (poolData ?? []) as PoolRow[];
  const pickedPeople = new Set(previous.map((w) => w.person_id));
  const holders = d.kind === "daily" ? await dailyHolders(store) : new Set<string>();
  holders.delete(current.person_id);
  const excludedEntryIds = pool.filter((p) => pickedPeople.has(p.person_id) || holders.has(p.person_id)).map((p) => p.entry_id);
  const eligible = pool.filter((p) => !excludedEntryIds.includes(p.entry_id));
  if (eligible.length === 0) return { error: "nobody left in the frozen pool" };
  const seed = newSeed();
  const index = pickIndex(seed, d.pool_snapshot_hash ?? "", excludedEntryIds, eligible.length);
  const pickedPool = eligible[index];
  const entry = (await store.select("giveaway_entries", "*").eq("id", pickedPool.entry_id).single()).data as EntryRow;

  const before = { winner: current.id, person: current.person_id, status: current.status };
  const mark = await store.update("giveaway_winners", { status: "redrawn", redraw_reason: reason.trim(), redrawn_at: now.toISOString() }).eq("id", current.id).neq("status", "redrawn").select("id");
  if (mark.error || !(mark.data?.length)) return { error: "could not mark the previous winner" };
  const result = await writeWinner(store, d, entry, { seed, excluded: excludedEntryIds, now, by: admin, redraw: true, reason });
  await store.update("giveaway_drawings", { status: "redrawn", winner_entry_id: entry.id, winner_person_id: entry.person_id, drawn_at: now.toISOString(), drawn_by: admin }).eq("id", d.id);
  await audit(store, { actor: admin, action: "redrawn", targetTable: "giveaway_drawings", targetId: d.id, reason: reason.trim(), before, after: { winner: result.winner.id, person: entry.person_id, seed, excluded: excludedEntryIds.length } });
  log.log(`[giveaway drawings] ${d.slot} redrawn by ${admin}: ${reason}`);
  const full: DrawResult = { ...result, drawing: { ...d, status: "redrawn", winner_entry_id: entry.id, winner_person_id: entry.person_id, drawn_at: now.toISOString(), drawn_by: admin } };
  try {
    await notify.winnerDrawn(full);
  } catch (err) {
    log.error(`[giveaway drawings] notify failed: ${err instanceof Error ? err.message : "unknown"}`);
  }
  return full;
}

/* ------------------------------------------------------------------ */
/* Re-verify                                                            */
/* ------------------------------------------------------------------ */

export type Reverified = { winnerId: string; ok: boolean; expectedEntry: string | null; actualEntry: string | null };

/** Recompute every result of a drawing from the stored seed, pool and
 *  exclusion lists. All true = the audit trail is intact. */
export async function reverify(store: GiveawayStore, drawingId: string): Promise<{ hashOk: boolean; results: Reverified[] }> {
  const d = await drawingById(store, drawingId);
  if (!d) return { hashOk: false, results: [] };
  const { data: poolData } = await store.select("giveaway_drawing_pool", "*").eq("drawing_id", d.id).order("position");
  const pool = (poolData ?? []) as PoolRow[];
  const hashOk = poolHash(pool.map((p) => p.entry_id)) === d.pool_snapshot_hash;
  const results: Reverified[] = [];
  for (const w of await winnersOf(store, d.id)) {
    if (!w.seed) {
      results.push({ winnerId: w.id, ok: false, expectedEntry: null, actualEntry: w.entry_id });
      continue;
    }
    const excluded = new Set(w.pool_excluded ?? []);
    const eligible = pool.filter((p) => !excluded.has(p.entry_id));
    if (!eligible.length) {
      results.push({ winnerId: w.id, ok: false, expectedEntry: null, actualEntry: w.entry_id });
      continue;
    }
    const expected = eligible[pickIndex(w.seed, d.pool_snapshot_hash ?? "", [...excluded], eligible.length)].entry_id;
    results.push({ winnerId: w.id, ok: expected === w.entry_id, expectedEntry: expected, actualEntry: w.entry_id });
  }
  return { hashOk, results };
}

/* ------------------------------------------------------------------ */
/* Winner updates (admin + claim page)                                  */
/* ------------------------------------------------------------------ */

export async function winnerByToken(store: GiveawayStore, token: string): Promise<WinnerRow | null> {
  const { data } = await store.select("giveaway_winners", "*").eq("claim_token_hash", sha256Hex(token)).maybeSingle();
  return (data as WinnerRow | null) ?? null;
}

export async function winnerById(store: GiveawayStore, id: string): Promise<WinnerRow | null> {
  const { data } = await store.select("giveaway_winners", "*").eq("id", id).maybeSingle();
  return (data as WinnerRow | null) ?? null;
}

/** The winner gave a number on the claim page. */
export async function claimWithPhone(store: GiveawayStore, winner: WinnerRow, phone: string, now: Date): Promise<WinnerRow> {
  const patch: Partial<WinnerRow> = { phone: phone.trim().slice(0, 40) };
  if (winner.status === "drawn") Object.assign(patch, { status: "claimed", claimed_at: now.toISOString() });
  else if (winner.status === "contacted") Object.assign(patch, { status: "claimed", claimed_at: now.toISOString() });
  const { data, error } = await store.update("giveaway_winners", patch).eq("id", winner.id).select("*").single();
  if (error) throw fail("claim", error);
  await audit(store, { actor: "visitor", action: "winner_claimed", targetTable: "giveaway_winners", targetId: winner.id, before: { status: winner.status }, after: { status: (data as WinnerRow).status } });
  return data as WinnerRow;
}

export type WinnerAction =
  | { kind: "call_attempt"; outcome: string }
  | { kind: "status"; status: "contacted" | "claimed" | "unreachable" | "declined" | "ineligible" }
  | { kind: "public_ok"; on: boolean; label: string }
  | { kind: "tax_form_received"; on: boolean }
  | { kind: "note"; notes: string };

export async function updateWinner(store: GiveawayStore, winner: WinnerRow, action: WinnerAction, now: Date, admin: string): Promise<WinnerRow> {
  const patch: Record<string, unknown> = {};
  const at = now.toISOString();
  switch (action.kind) {
    case "call_attempt":
      patch.call_attempts = [...(winner.call_attempts ?? []), { at, by: admin, outcome: action.outcome.trim().slice(0, 200) }];
      if (winner.status === "drawn" && /reached|spoke|talked|answered/i.test(action.outcome)) {
        patch.status = "contacted";
        patch.contacted_at = at;
      }
      break;
    case "status":
      patch.status = action.status;
      if (action.status === "contacted" && !winner.contacted_at) patch.contacted_at = at;
      if (action.status === "claimed") {
        patch.claimed_at = at;
        if (!winner.contacted_at) patch.contacted_at = at;
      }
      break;
    case "public_ok":
      patch.public_ok = action.on;
      patch.public_ok_at = action.on ? at : null;
      patch.public_label = action.on ? action.label : null;
      break;
    case "tax_form_received":
      patch.tax_form_received_at = action.on ? at : null;
      break;
    case "note":
      patch.notes = action.notes.trim().slice(0, 2000);
      break;
  }
  const { data, error } = await store.update("giveaway_winners", patch).eq("id", winner.id).select("*").single();
  if (error) throw fail("winner update", error);
  await audit(store, { actor: admin, action: `winner_${action.kind}`, targetTable: "giveaway_winners", targetId: winner.id, before: pickFields(winner, Object.keys(patch)), after: patch });
  return data as WinnerRow;
}

function pickFields(row: WinnerRow, keys: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of keys) out[k] = (row as unknown as Record<string, unknown>)[k];
  return out;
}

/** The Slot's config, for callers holding a row. */
export function configOf(d: DrawingRow) {
  return drawingFor(d.slot);
}
