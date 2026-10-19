/**
 * Read models and the CSV exports for /admin/10years (GIVEAWAY-PLAN.md §5).
 *
 * Every screen fetches whole tables through GiveawayStore (already scoped to
 * this env) and groups, joins and searches in JavaScript: the data is small
 * (a few thousand rows at most), the in-memory stand-in has no joins, no
 * `.or()` and no aggregates, and one code path then serves both databases.
 * Nothing here writes except `buildExport`, which audits the export.
 * Server-only.
 */

import { audit } from "./audit";
import { DRAWINGS, centralParts, prizeFor, prizeName, type Drawing, type PrizeVersion } from "./config";
import { buildPool } from "./drawings";
import type { AuditRow, DrawingRow, EntryRow, NotifyRow, OfferRow, PersonRow, WinnerRow } from "./rows";
import { jobStatus } from "./sends";
import type { GiveawayStore, GiveawayTable } from "./store";
import { publicLabel } from "./zip";

const fail = (where: string, error: { message: string } | null) => new Error(`${where}: ${error?.message ?? "unknown error"}`);

async function allRows<T>(store: GiveawayStore, table: GiveawayTable, orderBy?: { col: string; ascending?: boolean }): Promise<T[]> {
  const q = store.select(table, "*");
  const { data, error } = await (orderBy ? q.order(orderBy.col, { ascending: orderBy.ascending !== false }) : q);
  if (error) throw fail(table, error);
  return (data ?? []) as T[];
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-11-16" — the Central calendar date of an instant. */
export function centralDayKey(iso: string): string {
  const p = centralParts(new Date(iso));
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export const SLOT_ORDER: Record<string, number> = Object.fromEntries(DRAWINGS.map((d, i) => [d.slot, i]));

export function versionLabel(v: PrizeVersion): string {
  return v === "current_client" ? "current-client version" : "new-client version";
}

export function personName(p: PersonRow | null): string {
  return p ? `${p.first_name} ${p.last_name}`.trim() : "(person missing)";
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                            */
/* ------------------------------------------------------------------ */

export type DrawingSummary = {
  config: Drawing;
  row: DrawingRow | null;
  winner: WinnerRow | null;
  person: PersonRow | null;
  /** The stored scheduled_at differs from the config's instant. */
  timeMismatch: boolean;
};

export type Dashboard = {
  people: { total: number; verified: number; unsubscribed: number };
  notify: { total: number; verified: number; tapped: number };
  entriesByKind: Array<{ kind: string; live: number; voided: number }>;
  entriesByDay: Array<{ day: string; count: number }>;
  referralCredits: number;
  offers: { issued: number; redeemed: number };
  drawings: DrawingSummary[];
  jobs: Awaited<ReturnType<typeof jobStatus>>;
  warnings: string[];
};

function summarizeDrawings(drawings: DrawingRow[], winners: WinnerRow[], people: Map<string, PersonRow>): DrawingSummary[] {
  return DRAWINGS.map((config) => {
    const row = drawings.find((d) => d.slot === config.slot) ?? null;
    const winner = row ? (winners.filter((w) => w.drawing_id === row.id).find((w) => w.status !== "redrawn") ?? null) : null;
    return {
      config,
      row,
      winner,
      person: winner ? (people.get(winner.person_id) ?? null) : null,
      timeMismatch: Boolean(row && new Date(row.scheduled_at).getTime() !== config.at.getTime()),
    };
  });
}

export async function loadDashboard(store: GiveawayStore): Promise<Dashboard> {
  const [people, notify, entries, offers, drawings, winners, jobs] = await Promise.all([
    allRows<PersonRow>(store, "giveaway_people"),
    allRows<NotifyRow>(store, "giveaway_notify"),
    allRows<EntryRow>(store, "giveaway_entries"),
    allRows<OfferRow>(store, "giveaway_offers"),
    allRows<DrawingRow>(store, "giveaway_drawings", { col: "scheduled_at" }),
    allRows<WinnerRow>(store, "giveaway_winners", { col: "created_at" }),
    jobStatus(store),
  ]);

  const byKind = new Map<string, { live: number; voided: number }>();
  const byDay = new Map<string, number>();
  for (const e of entries) {
    const k = byKind.get(e.kind) ?? { live: 0, voided: 0 };
    if (e.void_reason) k.voided++;
    else k.live++;
    byKind.set(e.kind, k);
    if (!e.void_reason) {
      const day = centralDayKey(e.created_at);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }
  }

  const peopleById = new Map(people.map((p) => [p.id, p]));
  const summaries = summarizeDrawings(drawings, winners, peopleById);
  const warnings: string[] = [];
  for (const s of summaries) {
    if (!s.row) warnings.push(`No giveaway_drawings row for the ${s.config.dayName} slot (${s.config.slot}) in env ${store.env}.`);
    else if (s.timeMismatch) warnings.push(`${s.config.dayName} (${s.config.slot}) is scheduled at ${s.row.scheduled_at} in the database but the config says ${s.config.at.toISOString()} (${s.config.ct}).`);
  }

  return {
    people: {
      total: people.length,
      verified: people.filter((p) => p.verified_at).length,
      unsubscribed: people.filter((p) => p.unsubscribed_at).length,
    },
    notify: {
      total: notify.length,
      verified: notify.filter((n) => n.verified_at).length,
      tapped: notify.filter((n) => n.tapped_at).length,
    },
    entriesByKind: [...byKind.entries()].map(([kind, v]) => ({ kind, ...v })).sort((a, b) => a.kind.localeCompare(b.kind)),
    entriesByDay: [...byDay.entries()].map(([day, count]) => ({ day, count })).sort((a, b) => a.day.localeCompare(b.day)),
    referralCredits: people.reduce((sum, p) => sum + (Number(p.referral_credits) || 0), 0),
    offers: { issued: offers.length, redeemed: offers.filter((o) => o.redeemed_at).length },
    drawings: summaries,
    jobs,
    warnings,
  };
}

/* ------------------------------------------------------------------ */
/* Drawings                                                             */
/* ------------------------------------------------------------------ */

export type DrawingView = DrawingSummary & {
  /** Stored pool_size once drawn; a live buildPool() preview while scheduled. */
  poolSize: number | null;
  poolIsPreview: boolean;
  canDrawNow: boolean;
  canRedraw: boolean;
  auditTrail: AuditRow[];
};

export async function loadDrawings(store: GiveawayStore, now: Date): Promise<DrawingView[]> {
  const [people, drawings, winners, auditRows] = await Promise.all([
    allRows<PersonRow>(store, "giveaway_people"),
    allRows<DrawingRow>(store, "giveaway_drawings", { col: "scheduled_at" }),
    allRows<WinnerRow>(store, "giveaway_winners", { col: "created_at" }),
    (async () => {
      const { data, error } = await store.select("giveaway_audit", "*").eq("target_table", "giveaway_drawings").order("at", { ascending: false });
      if (error) throw fail("audit", error);
      return (data ?? []) as AuditRow[];
    })(),
  ]);
  const summaries = summarizeDrawings(drawings, winners, new Map(people.map((p) => [p.id, p])));
  const out: DrawingView[] = [];
  for (const s of summaries) {
    let poolSize: number | null = s.row?.pool_size ?? null;
    let poolIsPreview = false;
    if (s.row && s.row.status === "scheduled") {
      try {
        poolSize = (await buildPool(store, s.row)).entries.length;
        poolIsPreview = true;
      } catch {
        poolSize = null;
      }
    }
    const scheduled = s.row?.status === "scheduled" || s.row?.status === "drawing";
    out.push({
      ...s,
      poolSize,
      poolIsPreview,
      canDrawNow: Boolean(s.row && scheduled && new Date(s.row.scheduled_at).getTime() <= now.getTime()),
      canRedraw: Boolean(s.row && (s.row.status === "drawn" || s.row.status === "redrawn")),
      auditTrail: s.row ? auditRows.filter((a) => a.target_id === s.row!.id) : [],
    });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Winners                                                              */
/* ------------------------------------------------------------------ */

export type WinnerView = {
  winner: WinnerRow;
  person: PersonRow | null;
  drawing: DrawingRow | null;
  config: Drawing | null;
  prizeName: string;
  versionLabel: string;
  /** What the public OK toggle would publish. */
  publicLabelPreview: string;
};

export async function loadWinners(store: GiveawayStore): Promise<{ current: WinnerView[]; history: WinnerView[] }> {
  const [people, drawings, winners] = await Promise.all([
    allRows<PersonRow>(store, "giveaway_people"),
    allRows<DrawingRow>(store, "giveaway_drawings"),
    allRows<WinnerRow>(store, "giveaway_winners", { col: "created_at" }),
  ]);
  const peopleById = new Map(people.map((p) => [p.id, p]));
  const drawingsById = new Map(drawings.map((d) => [d.id, d]));
  const views: WinnerView[] = winners.map((w) => {
    const person = peopleById.get(w.person_id) ?? null;
    const drawing = drawingsById.get(w.drawing_id) ?? null;
    const config = drawing ? (DRAWINGS.find((d) => d.slot === drawing.slot) ?? null) : null;
    const spec = config ? prizeFor(config.slot, w.prize_version) : null;
    return {
      winner: w,
      person,
      drawing,
      config,
      prizeName: spec ? prizeName(spec) : "(prize unknown)",
      versionLabel: versionLabel(w.prize_version),
      publicLabelPreview: person ? publicLabel(person.first_name, person.last_name, person.city) : "",
    };
  });
  const order = (v: WinnerView) => (v.config ? SLOT_ORDER[v.config.slot] : 99);
  views.sort((a, b) => order(a) - order(b) || a.winner.created_at.localeCompare(b.winner.created_at));
  return {
    current: views.filter((v) => v.winner.status !== "redrawn"),
    history: views.filter((v) => v.winner.status === "redrawn"),
  };
}

/* ------------------------------------------------------------------ */
/* Entries                                                              */
/* ------------------------------------------------------------------ */

export const SUSPICIOUS_SHARED_IP_OTHERS = 3;
export const SUSPICIOUS_REFERRAL_CREDITS = 5;

export type PersonView = {
  person: PersonRow;
  entries: EntryRow[];
  liveEntries: number;
  referredBy: PersonRow | null;
  /** Why the "Suspicious" filter would show this person (empty = clean). */
  flags: string[];
};

export type PeopleQuery = { q?: string; filter?: string };

export async function loadPeople(store: GiveawayStore, query: PeopleQuery): Promise<{ people: PersonView[]; total: number }> {
  const [people, entries] = await Promise.all([
    allRows<PersonRow>(store, "giveaway_people", { col: "created_at", ascending: false }),
    allRows<EntryRow>(store, "giveaway_entries", { col: "created_at" }),
  ]);
  const peopleById = new Map(people.map((p) => [p.id, p]));
  const entriesByPerson = new Map<string, EntryRow[]>();
  for (const e of entries) entriesByPerson.set(e.person_id, [...(entriesByPerson.get(e.person_id) ?? []), e]);

  // Suspicion signals, computed over everyone so the flags show on every view.
  const ipGroups = new Map<string, number>();
  for (const p of people) if (p.ip_hash) ipGroups.set(p.ip_hash, (ipGroups.get(p.ip_hash) ?? 0) + 1);
  const voidedReferral = new Map<string, string[]>();
  for (const e of entries) {
    if (!e.void_reason || (e.kind !== "referral_bonus" && e.kind !== "referred_bonus")) continue;
    voidedReferral.set(e.person_id, [...(voidedReferral.get(e.person_id) ?? []), `voided ${e.kind}: ${e.void_reason}`]);
    // A voided referred_bonus implicates the referrer too (self-referral, same device).
    if (e.kind === "referred_bonus" && e.referral_person_id) {
      voidedReferral.set(e.referral_person_id, [...(voidedReferral.get(e.referral_person_id) ?? []), `referred someone whose bonus was voided: ${e.void_reason}`]);
    }
  }

  const views: PersonView[] = people.map((p) => {
    const flags: string[] = [];
    const sharing = p.ip_hash ? (ipGroups.get(p.ip_hash) ?? 1) - 1 : 0;
    if (sharing >= SUSPICIOUS_SHARED_IP_OTHERS) flags.push(`shares an IP hash with ${sharing} other people`);
    if ((Number(p.referral_credits) || 0) >= SUSPICIOUS_REFERRAL_CREDITS) flags.push(`${p.referral_credits} referral credits`);
    flags.push(...(voidedReferral.get(p.id) ?? []));
    const list = entriesByPerson.get(p.id) ?? [];
    return {
      person: p,
      entries: list,
      liveEntries: list.filter((e) => !e.void_reason).length,
      referredBy: p.referred_by_person_id ? (peopleById.get(p.referred_by_person_id) ?? null) : null,
      flags,
    };
  });

  let filtered = views;
  if (query.filter === "suspicious") filtered = filtered.filter((v) => v.flags.length > 0);
  const q = (query.q ?? "").trim().toLowerCase();
  if (q) {
    filtered = filtered.filter((v) => {
      const p = v.person;
      return [p.email, p.email_display, p.first_name, p.last_name, `${p.first_name} ${p.last_name}`, p.zip, p.referral_code].some((f) => (f ?? "").toLowerCase().includes(q));
    });
  }
  return { people: filtered, total: people.length };
}

/* ------------------------------------------------------------------ */
/* CSV exports                                                          */
/* ------------------------------------------------------------------ */

export const EXPORT_NAMES = ["people", "entries", "offers", "winners"] as const;
export type ExportName = (typeof EXPORT_NAMES)[number];

export function isExportName(v: string): v is ExportName {
  return (EXPORT_NAMES as readonly string[]).includes(v);
}

/** RFC 4180 quoting, plus a leading apostrophe on =, @, tab and CR so a cell
 *  cannot run as a formula when the file is opened in a spreadsheet. */
export function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s = typeof v === "string" ? v : typeof v === "object" ? JSON.stringify(v) : String(v);
  if (/^[=@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

/** Build one export and audit it. */
export async function buildExport(store: GiveawayStore, name: ExportName, admin: string, now: Date): Promise<{ filename: string; csv: string; rows: number }> {
  let header: string[] = [];
  let rows: unknown[][] = [];

  if (name === "people") {
    const [people, entries, offers] = await Promise.all([
      allRows<PersonRow>(store, "giveaway_people", { col: "created_at" }),
      allRows<EntryRow>(store, "giveaway_entries"),
      allRows<OfferRow>(store, "giveaway_offers"),
    ]);
    const counts = new Map<string, number>();
    for (const e of entries) if (!e.void_reason) counts.set(e.person_id, (counts.get(e.person_id) ?? 0) + 1);
    const offerByPerson = new Map(offers.map((o) => [o.person_id, o]));
    const byId = new Map(people.map((p) => [p.id, p]));
    header = ["id", "created_at", "email", "email_display", "first_name", "last_name", "zip", "city", "nearest_center", "is_existing_client", "verified_at", "entries", "referral_code", "referral_credits", "referred_by_email", "marketing_opt_in", "marketing_opt_in_at", "unsubscribed_at", "source_page", "offer_code", "offer_redeemed_at", "offer_redeemed_center"];
    rows = people.map((p) => {
      const o = offerByPerson.get(p.id);
      return [p.id, p.created_at, p.email, p.email_display, p.first_name, p.last_name, p.zip, p.city, p.nearest_center, p.is_existing_client, p.verified_at, counts.get(p.id) ?? 0, p.referral_code, p.referral_credits, p.referred_by_person_id ? (byId.get(p.referred_by_person_id)?.email ?? p.referred_by_person_id) : "", p.marketing_opt_in, p.marketing_opt_in_at, p.unsubscribed_at, p.source_page, o?.code ?? "", o?.redeemed_at ?? "", o?.redeemed_center ?? ""];
    });
  } else if (name === "entries") {
    const [people, entries] = await Promise.all([allRows<PersonRow>(store, "giveaway_people"), allRows<EntryRow>(store, "giveaway_entries", { col: "created_at" })]);
    const byId = new Map(people.map((p) => [p.id, p]));
    header = ["id", "created_at", "person_id", "email", "kind", "referral_person_id", "referral_person_email", "void_reason", "voided_at"];
    rows = entries.map((e) => [e.id, e.created_at, e.person_id, byId.get(e.person_id)?.email ?? "", e.kind, e.referral_person_id, e.referral_person_id ? (byId.get(e.referral_person_id)?.email ?? "") : "", e.void_reason, e.voided_at]);
  } else if (name === "offers") {
    const [people, offers] = await Promise.all([allRows<PersonRow>(store, "giveaway_people"), allRows<OfferRow>(store, "giveaway_offers", { col: "issued_at" })]);
    const byId = new Map(people.map((p) => [p.id, p]));
    header = ["id", "code", "kind", "person_id", "email", "first_name", "last_name", "zip", "is_existing_client", "issued_at", "expires_at", "redeemed_at", "redeemed_center", "consultation_request_id"];
    rows = offers.map((o) => {
      const p = byId.get(o.person_id);
      return [o.id, o.code, o.kind, o.person_id, p?.email ?? "", p?.first_name ?? "", p?.last_name ?? "", p?.zip ?? "", p?.is_existing_client ?? "", o.issued_at, o.expires_at, o.redeemed_at, o.redeemed_center, o.consultation_request_id];
    });
  } else {
    const { current, history } = await loadWinners(store);
    header = ["id", "drawing_slot", "drawing_day", "status", "person_id", "first_name", "last_name", "email", "phone", "zip", "city", "prize", "prize_version", "claim_deadline_at", "contacted_at", "claimed_at", "call_attempts", "public_ok", "public_label", "tax_form_required", "tax_form_received_at", "redraw_reason", "redrawn_at", "notes", "created_at"];
    rows = [...current, ...history].map(({ winner: w, person: p, config, prizeName: prize }) => [w.id, config?.slot ?? "", config?.dayName ?? "", w.status, w.person_id, p?.first_name ?? "", p?.last_name ?? "", p?.email ?? "", w.phone, p?.zip ?? "", p?.city ?? "", prize, w.prize_version, w.claim_deadline_at, w.contacted_at, w.claimed_at, (w.call_attempts ?? []).map((c) => `${c.at} ${c.by}: ${c.outcome}`).join(" | "), w.public_ok, w.public_label, w.tax_form_required, w.tax_form_received_at, w.redraw_reason, w.redrawn_at, w.notes, w.created_at]);
  }

  await audit(store, { actor: admin, action: "export_csv", targetTable: `giveaway_${name}`, reason: name, after: { rows: rows.length } });
  const stamp = now.toISOString().slice(0, 10);
  return { filename: `10years-${name}-${store.env}-${stamp}.csv`, csv: toCsv(header, rows), rows: rows.length };
}
