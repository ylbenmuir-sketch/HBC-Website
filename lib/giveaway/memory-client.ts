/**
 * An in-memory stand-in for the Supabase client, shaped like PostgREST's
 * query builder, for the giveaway tables only.
 *
 * Why it exists: the engine (entries, drawings, sends) is written once
 * against GiveawayStore / the Supabase builder, and it has to be testable
 * without a database — the Supabase connector could not apply migration
 * 0010 from a session, and this machine has no Postgres. So the unit tests
 * and `check:giveaway` drive the real code through this client, and the
 * server runs on it when `GIVEAWAY_REPO=memory` (local/test env only; see
 * store.ts). Once 0010 is applied, nothing changes but the client.
 *
 * What it emulates, faithfully enough for the subset the engine uses:
 *   from(t).select(cols, {count, head}) .insert(rows) .upsert(rows, {onConflict,
 *   ignoreDuplicates}) .update(patch) .delete(); filters eq/neq/is/in/lt/lte/
 *   gt/gte/like/not; order/limit/range; single/maybeSingle; `.select()` after
 *   a write; the unique keys and column defaults of 0010; the
 *   giveaway_rate_limit_hit RPC; errors as {message, code}. Seeded with the
 *   prizes and drawings for every env, like the migration.
 *
 * Not emulated: `.or()`, joins/embeds, text search, transactions (PostgREST
 * has none either). Keep the engine to the list above.
 */

import { randomUUID } from "node:crypto";
import { GIVEAWAY_ENVS } from "./env";
import { DRAWINGS, PRIZES, prizeDescription, prizeName, prizePractitionerCostUsd, prizeRetailUsd, prizeTaxFormRequired } from "./config";
import { GIVEAWAY_TABLES, type GiveawayTable, type MinimalClient } from "./store";

export type Row = Record<string, unknown>;
type Filter = (row: Row) => boolean;
type Result = { data: unknown; error: { message: string; code?: string; details?: string } | null; count: number | null; status: number; statusText: string };

/** Column defaults, as 0010 declares them. */
const DEFAULTS: Partial<Record<GiveawayTable, () => Row>> = {
  giveaway_people: () => ({ city: null, nearest_center: null, is_existing_client: false, age_confirmed: false, rules_accepted_at: null, rules_version: null, verified_at: null, referred_by_person_id: null, referral_credits: 0, source_page: null, ip_hash: null, ua_hash: null, marketing_opt_in: false, marketing_opt_in_wording: null, marketing_opt_in_at: null, unsubscribed_at: null }),
  giveaway_notify: () => ({ is_existing_client: false, age_confirmed: false, rules_accepted_at: null, rules_version: null, marketing_opt_in: false, marketing_opt_in_wording: null, marketing_opt_in_at: null, verify_token_hash: null, verified_at: null, live_token_hash: null, sent_live_at: null, reminded_at: null, tapped_at: null, person_id: null, source_page: null, ip_hash: null, ua_hash: null, unsubscribed_at: null }),
  giveaway_entries: () => ({ referral_person_id: null, void_reason: null, voided_at: null }),
  giveaway_prizes: () => ({ vibro_chair: true, hoolest_keychain: false, hoolest_handheld: false, partner_services: false, fulfilment_status: "pending" }),
  giveaway_drawings: () => ({ status: "scheduled", pool_snapshot_hash: null, pool_size: null, entries_count: null, seed: null, winner_entry_id: null, winner_person_id: null, drawn_at: null, drawn_by: null, claimed_at: null }),
  giveaway_winners: () => ({ entry_id: null, claim_token_hash: null, phone: null, status: "drawn", call_attempts: [], contacted_at: null, claimed_at: null, public_ok: false, public_ok_at: null, public_label: null, tax_form_required: false, tax_form_received_at: null, redraw_reason: null, redrawn_at: null, notes: null }),
  giveaway_audit: () => ({ target_table: null, target_id: null, reason: null, before: null, after: null, ip_hash: null }),
  giveaway_offers: () => ({ kind: "free_first_visit", redeemed_at: null, consultation_request_id: null, redeemed_center: null }),
  giveaway_admin_allowlist: () => ({ added_by: "env" }),
  rate_limits: () => ({ count: 0 }),
  scheduled_sends: () => ({ person_id: null, notify_id: null, claimed_at: null, sent_at: null, skipped_reason: null, message_id: null, error: null }),
};

/** Unique keys, as 0010 declares them (name, columns, optional partial filter). */
const UNIQUES: Partial<Record<GiveawayTable, Array<{ name: string; cols: string[]; where?: (r: Row) => boolean }>>> = {
  giveaway_people: [
    { name: "giveaway_people_env_email_key", cols: ["env", "email"] },
    { name: "giveaway_people_env_referral_code_key", cols: ["env", "referral_code"] },
  ],
  giveaway_notify: [{ name: "giveaway_notify_env_email_key", cols: ["env", "email"] }],
  giveaway_entries: [
    { name: "giveaway_entries_one_base_idx", cols: ["env", "person_id"], where: (r) => r.kind === "base" },
    { name: "giveaway_entries_one_early_bird_idx", cols: ["env", "person_id"], where: (r) => r.kind === "early_bird" },
    { name: "giveaway_entries_one_referred_bonus_idx", cols: ["env", "person_id"], where: (r) => r.kind === "referred_bonus" },
  ],
  giveaway_prizes: [{ name: "giveaway_prizes_env_slot_version_key", cols: ["env", "slot", "version"] }],
  giveaway_drawings: [
    { name: "giveaway_drawings_env_scheduled_at_kind_key", cols: ["env", "scheduled_at", "kind"] },
    { name: "giveaway_drawings_env_slot_key", cols: ["env", "slot"] },
  ],
  giveaway_drawing_pool: [
    { name: "giveaway_drawing_pool_drawing_id_entry_id_key", cols: ["drawing_id", "entry_id"] },
    { name: "giveaway_drawing_pool_drawing_id_position_key", cols: ["drawing_id", "position"] },
  ],
  giveaway_offers: [
    { name: "giveaway_offers_env_person_id_key", cols: ["env", "person_id"] },
    { name: "giveaway_offers_env_code_key", cols: ["env", "code"] },
  ],
  giveaway_admin_allowlist: [{ name: "giveaway_admin_allowlist_env_email_key", cols: ["env", "email"] }],
  rate_limits: [{ name: "rate_limits_pkey", cols: ["env", "bucket", "key_hash", "window_start"] }],
  scheduled_sends: [{ name: "scheduled_sends_once_idx", cols: ["env", "kind", "due_at", "person_id", "notify_id"] }],
};

const NO_ID = new Set<GiveawayTable>(["rate_limits"]);
let serial = 0;

/** Timestamps compare as ISO strings; normalise what the caller passes. */
function norm(v: unknown): unknown {
  if (v instanceof Date) return v.toISOString();
  return v;
}
function cmp(a: unknown, b: unknown): number {
  const x = norm(a);
  const y = norm(b);
  if (x === y) return 0;
  if (x === null || x === undefined) return 1;
  if (y === null || y === undefined) return -1;
  if (typeof x === "number" && typeof y === "number") return x - y;
  const sx = String(x);
  const sy = String(y);
  // ISO timestamps vs. the same instant written with a different precision.
  const tx = Date.parse(sx);
  const ty = Date.parse(sy);
  if (/^\d{4}-\d{2}-\d{2}T/.test(sx) && /^\d{4}-\d{2}-\d{2}T/.test(sy) && !Number.isNaN(tx) && !Number.isNaN(ty)) return tx - ty;
  return sx < sy ? -1 : 1;
}
const same = (a: unknown, b: unknown) => cmp(a, b) === 0;

function keyOf(row: Row, cols: string[]): string {
  return JSON.stringify(cols.map((c) => norm(row[c]) ?? "\u0000null"));
}

function project(row: Row, cols: string): Row {
  if (cols.trim() === "*") return { ...row };
  const out: Row = {};
  for (const raw of cols.split(",")) {
    const c = raw.trim().split(":")[0]!.trim();
    if (c) out[c] = row[c];
  }
  return out;
}

class Builder implements PromiseLike<Result> {
  private filters: Filter[] = [];
  private op: "select" | "insert" | "upsert" | "update" | "delete" = "select";
  private cols = "*";
  private countMode: string | undefined;
  private head = false;
  private payload: Row[] = [];
  private patch: Row = {};
  private upsertOpts: { onConflict?: string; ignoreDuplicates?: boolean } = {};
  private orders: Array<{ col: string; asc: boolean }> = [];
  private lim: number | null = null;
  private from_ = 0;
  private single_: "single" | "maybe" | null = null;
  private returning = false;

  private readonly db: MemoryDb;
  private readonly table: GiveawayTable;

  constructor(db: MemoryDb, table: GiveawayTable) {
    this.db = db;
    this.table = table;
  }

  select(cols = "*", opts: { count?: string; head?: boolean } = {}) {
    if (this.op !== "select") this.returning = true;
    this.cols = cols;
    this.countMode = opts.count;
    this.head = Boolean(opts.head);
    return this;
  }
  insert(rows: Row | Row[]) {
    this.op = "insert";
    this.payload = Array.isArray(rows) ? rows : [rows];
    return this;
  }
  upsert(rows: Row | Row[], opts: { onConflict?: string; ignoreDuplicates?: boolean } = {}) {
    this.op = "upsert";
    this.payload = Array.isArray(rows) ? rows : [rows];
    this.upsertOpts = opts;
    return this;
  }
  update(patch: Row) {
    this.op = "update";
    this.patch = patch;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  eq(col: string, v: unknown) {
    this.filters.push((r) => same(r[col], v));
    return this;
  }
  neq(col: string, v: unknown) {
    this.filters.push((r) => !same(r[col], v));
    return this;
  }
  is(col: string, v: unknown) {
    this.filters.push((r) => (v === null ? r[col] === null || r[col] === undefined : r[col] === v));
    return this;
  }
  in(col: string, vs: unknown[]) {
    this.filters.push((r) => vs.some((v) => same(r[col], v)));
    return this;
  }
  lt(col: string, v: unknown) {
    this.filters.push((r) => r[col] != null && cmp(r[col], v) < 0);
    return this;
  }
  lte(col: string, v: unknown) {
    this.filters.push((r) => r[col] != null && cmp(r[col], v) <= 0);
    return this;
  }
  gt(col: string, v: unknown) {
    this.filters.push((r) => r[col] != null && cmp(r[col], v) > 0);
    return this;
  }
  gte(col: string, v: unknown) {
    this.filters.push((r) => r[col] != null && cmp(r[col], v) >= 0);
    return this;
  }
  like(col: string, pattern: string) {
    const re = new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".")}$`);
    this.filters.push((r) => typeof r[col] === "string" && re.test(r[col] as string));
    return this;
  }
  ilike(col: string, pattern: string) {
    const re = new RegExp(`^${pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*").replace(/_/g, ".")}$`, "i");
    this.filters.push((r) => typeof r[col] === "string" && re.test(r[col] as string));
    return this;
  }
  not(col: string, operator: string, v: unknown) {
    if (operator === "is") this.filters.push((r) => !(v === null ? r[col] == null : r[col] === v));
    else if (operator === "eq") this.filters.push((r) => !same(r[col], v));
    else if (operator === "in") this.filters.push((r) => !(v as unknown[]).some((x) => same(r[col], x)));
    else throw new Error(`memory-client: not(${operator}) unsupported`);
    return this;
  }
  order(col: string, opts: { ascending?: boolean } = {}) {
    this.orders.push({ col, asc: opts.ascending !== false });
    return this;
  }
  limit(n: number) {
    this.lim = n;
    return this;
  }
  range(from: number, to: number) {
    this.from_ = from;
    this.lim = to - from + 1;
    return this;
  }
  single() {
    this.single_ = "single";
    return this;
  }
  maybeSingle() {
    this.single_ = "maybe";
    return this;
  }

  then<T1 = Result, T2 = never>(onfulfilled?: ((v: Result) => T1 | PromiseLike<T1>) | null, onrejected?: ((e: unknown) => T2 | PromiseLike<T2>) | null): Promise<T1 | T2> {
    let result: Result;
    try {
      result = this.run();
    } catch (err) {
      result = { data: null, error: { message: err instanceof Error ? err.message : String(err), code: (err as { code?: string }).code }, count: null, status: 400, statusText: "Bad Request" };
    }
    return Promise.resolve(result).then(onfulfilled, onrejected);
  }

  private matching(rows: Row[]): Row[] {
    return rows.filter((r) => this.filters.every((f) => f(r)));
  }

  private shape(rows: Row[]): Result {
    let out = rows;
    for (const o of [...this.orders].reverse()) out = [...out].sort((a, b) => (o.asc ? cmp(a[o.col], b[o.col]) : cmp(b[o.col], a[o.col])));
    const count = this.countMode ? out.length : null;
    if (this.lim !== null) out = out.slice(this.from_, this.from_ + this.lim);
    const data = this.head ? null : out.map((r) => project(r, this.cols));
    if (this.single_ === "single") {
      if (!data || data.length !== 1) return { data: null, error: { message: data && data.length ? "multiple rows" : "no rows", code: "PGRST116" }, count, status: 406, statusText: "Not Acceptable" };
      return { data: data[0], error: null, count, status: 200, statusText: "OK" };
    }
    if (this.single_ === "maybe") {
      if (data && data.length > 1) return { data: null, error: { message: "multiple rows", code: "PGRST116" }, count, status: 406, statusText: "Not Acceptable" };
      return { data: data?.[0] ?? null, error: null, count, status: 200, statusText: "OK" };
    }
    return { data, error: null, count, status: 200, statusText: "OK" };
  }

  private run(): Result {
    const rows = this.db.rows(this.table);
    if (this.op === "select") return this.shape(this.matching(rows));
    if (this.op === "insert" || this.op === "upsert") {
      const written: Row[] = [];
      for (const given of this.payload) {
        const row = this.db.withDefaults(this.table, given);
        const conflict = this.db.conflictOf(this.table, row);
        if (conflict) {
          if (this.op === "insert") throw Object.assign(new Error(`duplicate key value violates unique constraint "${conflict.name}"`), { code: "23505" });
          if (this.upsertOpts.ignoreDuplicates) continue;
          Object.assign(conflict.row, given);
          written.push(conflict.row);
          continue;
        }
        rows.push(row);
        written.push(row);
      }
      return this.returning ? this.shape(written) : { data: null, error: null, count: null, status: 201, statusText: "Created" };
    }
    if (this.op === "update") {
      const hit = this.matching(rows);
      for (const r of hit) {
        const next = { ...r, ...this.patch };
        const conflict = this.db.conflictOf(this.table, next, r);
        if (conflict) throw Object.assign(new Error(`duplicate key value violates unique constraint "${conflict.name}"`), { code: "23505" });
      }
      for (const r of hit) Object.assign(r, this.patch);
      return this.returning ? this.shape(hit) : { data: null, error: null, count: null, status: 204, statusText: "No Content" };
    }
    const hit = this.matching(rows);
    this.db.set(this.table, rows.filter((r) => !hit.includes(r)));
    return this.returning ? this.shape(hit) : { data: null, error: null, count: null, status: 204, statusText: "No Content" };
  }
}

export class MemoryDb {
  readonly tables = new Map<GiveawayTable, Row[]>();

  constructor({ seed = true } = {}) {
    for (const t of GIVEAWAY_TABLES) this.tables.set(t, []);
    if (seed) this.seed();
  }

  rows(table: GiveawayTable): Row[] {
    const r = this.tables.get(table);
    if (!r) throw Object.assign(new Error(`Could not find the table 'public.${table}' in the schema cache`), { code: "PGRST205" });
    return r;
  }
  set(table: GiveawayTable, rows: Row[]) {
    this.tables.set(table, rows);
  }

  withDefaults(table: GiveawayTable, given: Row): Row {
    const row: Row = { ...(DEFAULTS[table]?.() ?? {}) };
    if (!NO_ID.has(table)) row.id = table === "giveaway_audit" || table === "giveaway_drawing_pool" ? ++serial : randomUUID();
    if (table !== "rate_limits" && table !== "giveaway_prizes" && table !== "giveaway_drawing_pool") row.created_at = new Date().toISOString();
    if (table === "giveaway_audit") row.at = new Date().toISOString();
    if (table === "giveaway_offers") row.issued_at = new Date().toISOString();
    if (table === "giveaway_admin_allowlist") row.added_at = new Date().toISOString();
    for (const [k, v] of Object.entries(given)) row[k] = norm(v);
    return row;
  }

  conflictOf(table: GiveawayTable, candidate: Row, except?: Row): { name: string; row: Row } | null {
    for (const u of UNIQUES[table] ?? []) {
      if (u.where && !u.where(candidate)) continue;
      const k = keyOf(candidate, u.cols);
      const hit = this.rows(table).find((r) => r !== except && (!u.where || u.where(r)) && keyOf(r, u.cols) === k);
      if (hit) return { name: u.name, row: hit };
    }
    return null;
  }

  /** The migration's seed: prizes and drawings for every env. */
  seed() {
    for (const env of GIVEAWAY_ENVS) {
      for (const p of PRIZES) {
        this.rows("giveaway_prizes").push(this.withDefaults("giveaway_prizes", { env, slot: p.slot, version: p.version, name: prizeName(p), description: prizeDescription(p), brain_map: p.brainMap, sessions: p.sessions, vibro_chair: p.vibroChair, hoolest_keychain: p.hoolestKeychain, hoolest_handheld: p.hoolestHandheld, partner_services: p.partnerServices, retail_value_usd: prizeRetailUsd(p), practitioner_cost_usd: prizePractitionerCostUsd(p), tax_form_required: prizeTaxFormRequired(p) }));
      }
      for (const d of DRAWINGS) {
        this.rows("giveaway_drawings").push(this.withDefaults("giveaway_drawings", { env, slot: d.slot, kind: d.kind, scheduled_at: d.at.toISOString() }));
      }
    }
  }

  /** Forget everything in one env except the seed. For checks between runs. */
  resetEnv(env: string) {
    for (const t of GIVEAWAY_TABLES) {
      if (t === "giveaway_prizes") continue;
      if (t === "giveaway_drawings") {
        for (const r of this.rows(t)) if (r.env === env) Object.assign(r, DEFAULTS.giveaway_drawings!());
        continue;
      }
      this.set(t, this.rows(t).filter((r) => r.env !== env));
    }
  }

  rpc(fn: string, args: Record<string, unknown>): Result {
    if (fn === "giveaway_rate_limit_hit") {
      const key = { env: args.p_env, bucket: args.p_bucket, key_hash: args.p_key_hash, window_start: norm(args.p_window_start) };
      const rows = this.rows("rate_limits");
      let row = rows.find((r) => r.env === key.env && r.bucket === key.bucket && r.key_hash === key.key_hash && same(r.window_start, key.window_start));
      if (!row) {
        row = { ...key, count: 0 };
        rows.push(row);
      }
      row.count = Number(row.count) + 1;
      return { data: row.count, error: null, count: null, status: 200, statusText: "OK" };
    }
    return { data: null, error: { message: `Could not find the function public.${fn} in the schema cache`, code: "PGRST202" }, count: null, status: 404, statusText: "Not Found" };
  }
}

/** A client over a MemoryDb, usable wherever MinimalClient is. */
export function memoryClient(db = new MemoryDb()): MinimalClient & { db: MemoryDb } {
  const client = {
    db,
    from: (table: string) => new Builder(db, table as GiveawayTable),
    rpc: (fn: string, args: Record<string, unknown> = {}) => Promise.resolve(db.rpc(fn, args)),
  };
  return client as unknown as MinimalClient & { db: MemoryDb };
}
