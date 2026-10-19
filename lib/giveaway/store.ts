/**
 * The one door to the giveaway tables. Every query is scoped to this
 * deployment's `env` (lib/giveaway/env.ts): selects, updates and deletes get
 * `.eq("env", env)` before the caller adds anything, inserts and upserts get
 * `env` stamped on every row, and a table outside the giveaway set is
 * refused — so nothing here can touch consultation_requests or chat_sessions
 * by accident, and nothing can see another env's rows.
 *
 * The client is passed in, so lib/giveaway/store.test.mjs drives it with a
 * recording fake; `giveawayStore()` builds the real one from the service
 * role (lib/consultation.ts → supabaseAdmin). Server-only.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "../consultation";
import { giveawayEnv, isTestingEnv, type GiveawayEnv } from "./env";

export const GIVEAWAY_TABLES = [
  "giveaway_people",
  "giveaway_notify",
  "giveaway_entries",
  "giveaway_prizes",
  "giveaway_drawings",
  "giveaway_drawing_pool",
  "giveaway_winners",
  "giveaway_audit",
  "giveaway_offers",
  "giveaway_admin_allowlist",
  "rate_limits",
  "scheduled_sends",
] as const;
export type GiveawayTable = (typeof GIVEAWAY_TABLES)[number];

export function isGiveawayTable(name: string): name is GiveawayTable {
  return (GIVEAWAY_TABLES as readonly string[]).includes(name);
}

type Row = Record<string, unknown>;

/** The subset of the Supabase client this module uses — a fake in tests. */
export type MinimalClient = Pick<SupabaseClient, "from" | "rpc">;

export class GiveawayStore {
  readonly client: MinimalClient;
  readonly env: GiveawayEnv;

  constructor(client: MinimalClient, env: GiveawayEnv) {
    this.client = client;
    this.env = env;
  }

  private table(name: GiveawayTable) {
    if (!isGiveawayTable(name)) throw new Error(`${name} is not a giveaway table`);
    return this.client.from(name);
  }

  /** `select(...)` already filtered to this env; chain more filters on it. */
  select(table: GiveawayTable, columns = "*", options?: { count?: "exact" | "planned" | "estimated"; head?: boolean }) {
    return this.table(table).select(columns, options).eq("env", this.env);
  }

  /** Every row stamped with this env; a row that names another env is refused. */
  insert<T extends Row>(table: GiveawayTable, rows: T | T[]) {
    return this.table(table).insert(this.stamp(rows));
  }

  upsert<T extends Row>(table: GiveawayTable, rows: T | T[], options?: { onConflict?: string; ignoreDuplicates?: boolean }) {
    return this.table(table).upsert(this.stamp(rows), options);
  }

  /** `update(...)` already filtered to this env; chain more filters on it. */
  update(table: GiveawayTable, patch: Row) {
    if ("env" in patch && patch.env !== this.env) throw new Error("a giveaway row cannot change env");
    return this.table(table).update(patch).eq("env", this.env);
  }

  /** `delete()` already filtered to this env; chain more filters on it. */
  delete(table: GiveawayTable) {
    return this.table(table).delete().eq("env", this.env);
  }

  /** A SQL function call with `p_env` filled in. */
  rpc(fn: string, args: Record<string, unknown> = {}) {
    return this.client.rpc(fn, { ...args, p_env: this.env });
  }

  private stamp<T extends Row>(rows: T | T[]): Array<T & { env: GiveawayEnv }> {
    const list = Array.isArray(rows) ? rows : [rows];
    return list.map((r) => {
      if ("env" in r && r.env !== undefined && r.env !== this.env) {
        throw new Error(`refusing to write a row for env "${String(r.env)}" from env "${this.env}"`);
      }
      return { ...r, env: this.env };
    });
  }
}

/**
 * `GIVEAWAY_REPO=memory`: the server keeps the giveaway tables in this
 * process (lib/giveaway/memory-client.ts) instead of Supabase — for
 * check:giveaway and local work while migration 0010 is not on the project.
 * Honoured ONLY when the giveaway env is local or test; anywhere else it is
 * refused with an error in the log and Supabase is used, so a stray variable
 * on a production deployment cannot make the real giveaway run on air.
 * One MemoryDb per process, kept on globalThis so every route shares it.
 */
export const MEMORY_REPO_ENV = "GIVEAWAY_REPO";

type MemoryModule = typeof import("./memory-client");
const memoryGlobal = globalThis as unknown as { __hbcGiveawayMemoryDb?: InstanceType<MemoryModule["MemoryDb"]>; __hbcGiveawayMemoryModule?: MemoryModule };

function memoryRepoWanted(env: GiveawayEnv): boolean {
  if (process.env[MEMORY_REPO_ENV]?.trim() !== "memory") return false;
  if (isTestingEnv(env)) return true;
  console.error(`[giveaway store] ${MEMORY_REPO_ENV}=memory is refused for env "${env}" — using Supabase`);
  return false;
}

/** The shared in-memory database when memory mode is on, else null. */
export function memoryDb(): InstanceType<MemoryModule["MemoryDb"]> | null {
  const env = giveawayEnv();
  if (!memoryRepoWanted(env)) return null;
  if (!memoryGlobal.__hbcGiveawayMemoryDb) {
    // Required lazily so a Supabase deployment never loads the stand-in.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = (memoryGlobal.__hbcGiveawayMemoryModule ??= require("./memory-client") as MemoryModule);
    memoryGlobal.__hbcGiveawayMemoryDb = new mod.MemoryDb();
    console.log(`[giveaway store] ${MEMORY_REPO_ENV}=memory — giveaway tables live in this process (env ${env})`);
  }
  return memoryGlobal.__hbcGiveawayMemoryDb;
}

/** The real store for this process, or null when Supabase is not configured. */
export function giveawayStore(): GiveawayStore | null {
  const env = giveawayEnv();
  const db = memoryDb();
  if (db) {
    const mod = memoryGlobal.__hbcGiveawayMemoryModule!;
    return new GiveawayStore(mod.memoryClient(db), env);
  }
  const client = supabaseAdmin();
  if (!client) return null;
  return new GiveawayStore(client, env);
}

/** The real store, or a thrown error naming what is missing. */
export function requireGiveawayStore(): GiveawayStore {
  const store = giveawayStore();
  if (!store) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set");
  return store;
}
