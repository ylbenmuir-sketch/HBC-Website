// Aggregate-only Dialpad phone stats for an outside reporting bot (Ben,
// 2026-11-02). The route is app/api/internal/phone-stats/route.ts; this file
// is everything that can be tested without a network: the day arithmetic,
// the line → center map, the two Dialpad readers (fetch passed in), and the
// counting.
//
// PRIVACY, the hard rule: raw Dialpad records live only inside the functions
// below, as local variables. What leaves this file is a DayRow (numbers, a
// date, a center from a fixed list) and notes built only from the fixed
// strings in NOTE — never a number, name, id, message or a Dialpad error
// body. lib/phone-stats.test.mjs feeds in records full of numbers, names and
// message text and proves none of it survives into the response.
//
// Two Dialpad reads, both read-only:
//
//   calls  GET /api/v2/call (Dialpad's "List calls", scope calls:list).
//          Synchronous, paged by cursor, newest first, concluded calls only.
//   texts  POST /api/v2/stats {export_type: "records", stat_type: "texts"},
//          then GET /api/v2/stats/{id} until the CSV is ready. Asking for an
//          export is a POST but changes nothing in Dialpad. Dialpad documents
//          text records as needing message_content_export:all on top of the
//          key; without it, Dialpad refuses and texts come back null.
//
// The line → center map mirrors config.js in the HBC Dialpad Data App (the
// front-desk report), which is where the line assignments were worked out.

export const TIMEZONE = "America/Chicago";
export const MAX_DAYS = 120;

export const CENTERS = ["nashville", "murfreesboro", "other"] as const;
export type Center = (typeof CENTERS)[number];

/** Ten-digit lines. 239-5693 is Nashville traffic even though Dialpad labels
 *  it "Murfreesboro Office" (Data App config.js). */
export const CENTER_LINES: Record<Exclude<Center, "other">, readonly string[]> = {
  nashville: ["6153318762", "6152378417", "6152395693"],
  murfreesboro: ["6152032650"],
};

export const ROW_FIELDS = [
  "date",
  "center",
  "calls_inbound",
  "calls_inbound_answered",
  "calls_inbound_missed",
  "calls_outbound",
  "texts_inbound",
  "texts_outbound",
  "unique_inbound_callers",
  "first_time_inbound_callers",
] as const;

export type DayRow = {
  date: string;
  center: Center;
  calls_inbound: number | null;
  calls_inbound_answered: number | null;
  calls_inbound_missed: number | null;
  calls_outbound: number | null;
  texts_inbound: number | null;
  texts_outbound: number | null;
  unique_inbound_callers: number | null;
  first_time_inbound_callers: number | null;
};

/** Every note the endpoint can emit. Notes are chosen from here, never
 *  composed from Dialpad's words; `{days}` is the only substitution and it is
 *  filled with a list of YYYY-MM-DD dates. */
export const NOTE = {
  definitions:
    "Calls are counted once per call (legs and the main line's hand-off are folded together) by the start time in America/Chicago; desk-to-desk calls between clinic lines are left out. Missed = inbound not answered by a person, so it includes voicemail and hang-ups. Center is the clinic line the call or text used; any other Dialpad line is 'other'.",
  firstTime:
    "first_time_inbound_callers is null: Dialpad has no first-time flag, and deriving it would mean keeping a history of caller numbers, which this endpoint does not do.",
  textsScope:
    "texts are null: Dialpad refused the text-records export for this key. Add the message_content_export:all scope to DIALPAD_STATS_API_KEY (or make the key with it).",
  textsFailed: "texts are null for {days}: Dialpad's text export failed or timed out; they will be retried on the next request.",
  callsFailed: "calls are null for {days}: Dialpad's call list failed; they will be retried on the next request.",
  keyRejected:
    "calls and texts are null for {days}: Dialpad rejected DIALPAD_STATS_API_KEY (revoked, or missing the List calls scope, calls:list).",
  today: "{days} is today and still in progress; it refreshes every 15 minutes.",
} as const;

export function fillNote(template: string, days: string[]): string {
  return template.replace("{days}", days.join(", "));
}

/* --- days in America/Chicago ---------------------------------------------- */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const partsFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
});

export function chicagoDate(ms: number): string {
  return dateFmt.format(new Date(ms));
}

function offsetMs(ms: number): number {
  const p = Object.fromEntries(partsFmt.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  const wall = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return wall - Math.floor(ms / 1000) * 1000;
}

/** UTC ms of local midnight starting `date`. 06:00Z is local midnight or
 *  1am, before any 2am DST change, so its offset is midnight's. */
export function dayStartMs(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const utcMidnight = Date.UTC(y, m - 1, d);
  return utcMidnight - offsetMs(utcMidnight + 6 * 3_600_000);
}

export function addDays(date: string, n: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d) + n * DAY_MS).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

function isRealDate(s: string): boolean {
  return DATE_RE.test(s) && new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;
}

export type RangeResult = { ok: true; days: string[] } | { ok: false; error: string };

/** from/to are inclusive Chicago days, at most MAX_DAYS, none after today. */
export function parseRange(from: string | null, to: string | null, today: string): RangeResult {
  if (!from || !to) return { ok: false, error: "from and to are required (YYYY-MM-DD)" };
  if (!isRealDate(from) || !isRealDate(to)) return { ok: false, error: "from and to must be dates (YYYY-MM-DD)" };
  if (from > to) return { ok: false, error: "from is after to" };
  if (to > today) return { ok: false, error: `to is after today (${today}, America/Chicago)` };
  const days = daysBetween(from, to);
  if (days.length > MAX_DAYS) return { ok: false, error: `at most ${MAX_DAYS} days per request` };
  return { ok: true, days };
}

/* --- lines ----------------------------------------------------------------- */

/** Last ten digits, so +16153318762, (615) 331-8762 and 6153318762 agree. */
function tenDigits(v: unknown): string {
  return String(v ?? "").replace(/\D/g, "").slice(-10);
}

const LINE_CENTER = new Map<string, Center>();
for (const [center, lines] of Object.entries(CENTER_LINES)) {
  for (const line of lines) LINE_CENTER.set(line, center as Center);
}

function centerOf(line: unknown): Center {
  return LINE_CENTER.get(tenDigits(line)) ?? "other";
}

/* --- counting -------------------------------------------------------------- */

type Counts = Omit<DayRow, "date" | "center">;

function emptyCounts(): Counts {
  return {
    calls_inbound: 0,
    calls_inbound_answered: 0,
    calls_inbound_missed: 0,
    calls_outbound: 0,
    texts_inbound: 0,
    texts_outbound: 0,
    unique_inbound_callers: 0,
    first_time_inbound_callers: null,
  };
}

/** Days × centers, every count zero. Callers null out what they could not read. */
export function emptyRows(days: string[]): DayRow[] {
  return days.flatMap((date) => CENTERS.map((center) => ({ date, center, ...emptyCounts() })));
}

/** Dialpad stamps are ms since epoch as strings; tolerate seconds and ISO. */
function parseTs(v: unknown): number | null {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    return n < 1e12 ? n * 1000 : n;
  }
  const t = Date.parse(s);
  return Number.isFinite(t) ? t : null;
}

function idOf(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

type CallCounts = Record<
  "calls_inbound" | "calls_inbound_answered" | "calls_inbound_missed" | "calls_outbound" | "unique_inbound_callers",
  number
>;

/**
 * Counts calls per Chicago day per center. `records` are Dialpad call objects
 * (List calls); every field is read here and nothing is kept.
 *
 * A call is a group: a parent record (empty entry_point_call_id) plus its
 * legs, and since the Sep 2026 routing change a record whose master_call_id
 * names another record joins that record's group (the main line's hand-off
 * to the department, or a second pass of the same call). The group's root
 * gives the start time, direction and center; answered is decided across all
 * of it — the parent can read missed while a leg answered.
 */
export function countCalls(records: unknown[], days: string[]): Map<string, CallCounts> {
  type Rec = Record<string, unknown>;
  const byId = new Map<string, Rec>();
  for (const r of records) {
    if (!r || typeof r !== "object") continue;
    const id = idOf((r as Rec).call_id);
    if (id) byId.set(id, r as Rec);
  }

  const rootOf = (id: string): string => {
    const seen = new Set<string>();
    let cur = id;
    for (;;) {
      if (seen.has(cur)) return cur;
      seen.add(cur);
      const r = byId.get(cur)!;
      const entry = idOf(r.entry_point_call_id);
      if (entry && entry !== cur && byId.has(entry)) { cur = entry; continue; }
      const master = idOf(r.master_call_id);
      if (master && master !== cur && byId.has(master)) { cur = master; continue; }
      return cur;
    }
  };

  const groups = new Map<string, Rec[]>();
  for (const id of byId.keys()) {
    const root = rootOf(id);
    const g = groups.get(root);
    if (g) g.push(byId.get(id)!);
    else groups.set(root, [byId.get(id)!]);
  }

  const wanted = new Set(days);
  const out = new Map<string, CallCounts>();
  const callers = new Map<string, Set<string>>();
  for (const [rootId, legs] of groups) {
    const root = byId.get(rootId)!;
    const ts = parseTs(root.date_started);
    if (ts == null) continue;
    const date = chicagoDate(ts);
    if (!wanted.has(date)) continue;

    const external = tenDigits(root.external_number);
    if (LINE_CENTER.has(external)) continue; // desk ringing desk
    const key = `${date}|${centerOf(root.internal_number)}`;
    const c =
      out.get(key) ??
      { calls_inbound: 0, calls_inbound_answered: 0, calls_inbound_missed: 0, calls_outbound: 0, unique_inbound_callers: 0 };
    out.set(key, c);

    const direction = String(root.direction ?? "").toLowerCase();
    if (direction === "outbound") {
      c.calls_outbound++;
      continue;
    }
    if (direction !== "inbound") continue;
    c.calls_inbound++;
    const answered = legs.some(
      (l) =>
        parseTs(l.date_connected) != null &&
        String(l.state ?? "").toLowerCase() !== "voicemail" &&
        !l.voicemail_link &&
        !l.voicemail_recording_id
    );
    if (answered) c.calls_inbound_answered++;
    else c.calls_inbound_missed++;
    if (external) {
      const set = callers.get(key) ?? new Set<string>();
      set.add(external);
      callers.set(key, set);
      c.unique_inbound_callers = set.size;
    }
  }
  return out;
}

type TextCounts = Record<"texts_inbound" | "texts_outbound", number>;

/** Dialpad's text export labels a text "internal" when it left one of our
 *  lines and "external" when it arrived (Data App API_TEXT_DIRECTION). */
const TEXT_DIRECTION: Record<string, "inbound" | "outbound"> = {
  internal: "outbound",
  external: "inbound",
  outbound: "outbound",
  inbound: "inbound",
};

/**
 * Counts texts per day per center from the export's rows (already reduced to
 * the four columns this reads). `date` is wall time in America/Chicago,
 * because the export is requested in that timezone. Direction comes from
 * which side a clinic line is on, falling back to Dialpad's label for other
 * lines; the center is the clinic side.
 */
export function countTexts(rows: Record<string, string>[], days: string[]): Map<string, TextCounts> {
  const wanted = new Set(days);
  const out = new Map<string, TextCounts>();
  const seen = new Set<string>();
  for (const r of rows) {
    const id = idOf(r.message_id);
    if (id) {
      if (seen.has(id)) continue;
      seen.add(id);
    }
    const date = String(r.date ?? "").trim().slice(0, 10);
    if (!wanted.has(date)) continue;
    const from = tenDigits(r.from_phone);
    const to = tenDigits(r.to_phone);
    let dir: "inbound" | "outbound" | undefined;
    let center: Center;
    if (LINE_CENTER.has(from) && !LINE_CENTER.has(to)) {
      dir = "outbound";
      center = LINE_CENTER.get(from)!;
    } else if (LINE_CENTER.has(to) && !LINE_CENTER.has(from)) {
      dir = "inbound";
      center = LINE_CENTER.get(to)!;
    } else if (LINE_CENTER.has(to) && LINE_CENTER.has(from)) {
      continue; // desk to desk
    } else {
      dir = TEXT_DIRECTION[String(r.direction ?? "").trim().toLowerCase()];
      center = "other";
    }
    if (!dir) continue;
    const key = `${date}|${center}`;
    const c = out.get(key) ?? { texts_inbound: 0, texts_outbound: 0 };
    out.set(key, c);
    if (dir === "inbound") c.texts_inbound++;
    else c.texts_outbound++;
  }
  return out;
}

/* --- CSV ------------------------------------------------------------------- */

/** RFC 4180 rows, keeping only `keep` columns. Every other column (names,
 *  emails, the encrypted message body) is dropped as each row is read. */
export function parseCsv(text: string, keep: readonly string[]): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }

  const header = (rows.shift() ?? []).map((h) => h.trim().replace(/^﻿/, ""));
  const idx = keep.map((k) => header.indexOf(k));
  return rows
    .filter((r) => r.length > 1 || (r[0] ?? "") !== "")
    .map((r) => Object.fromEntries(keep.map((k, j) => [k, idx[j] >= 0 ? (r[idx[j]] ?? "") : ""])));
}

/* --- Dialpad --------------------------------------------------------------- */

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

export type DialpadOptions = {
  apiKey: string;
  fetch: Fetch;
  base?: string;
  sleep?: (ms: number) => Promise<void>;
  /** Give up on the text export after this long (ms). */
  textDeadlineMs?: number;
  now?: () => number;
};

/** A Dialpad failure, carrying only a status — never the response body,
 *  which can quote numbers. */
export class DialpadError extends Error {
  status: number;
  constructor(status: number, what: string) {
    super(`${what}: HTTP ${status}`);
    this.status = status;
  }
}

const sleepReal = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function dialpad(
  opts: DialpadOptions,
  method: "GET" | "POST",
  path: string,
  what: string,
  body?: unknown
): Promise<unknown> {
  const base = (opts.base ?? "https://dialpad.com").replace(/\/+$/, "");
  const sleep = opts.sleep ?? sleepReal;
  for (let attempt = 1; ; attempt++) {
    let res: Response;
    try {
      res = await opts.fetch(base + path, {
        method,
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${opts.apiKey}`,
          ...(body ? { "Content-Type": "application/json" } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(30_000),
      });
    } catch {
      if (attempt < 4) { await sleep(1000 * attempt); continue; }
      throw new DialpadError(0, what);
    }
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      const after = Number(res.headers.get("retry-after"));
      await sleep(after > 0 ? Math.min(after, 20) * 1000 : 1000 * attempt);
      continue;
    }
    if (!res.ok) throw new DialpadError(res.status, what);
    try {
      return await res.json();
    } catch {
      throw new DialpadError(res.status, `${what} (not JSON)`);
    }
  }
}

/** Every call that started inside [startMs, endMs). The span is read in
 *  week-long slices, four at a time, then merged, so a call whose legs
 *  straddle a slice edge still groups. */
export async function listCalls(opts: DialpadOptions, startMs: number, endMs: number): Promise<unknown[]> {
  const SLICE = 7 * DAY_MS;
  const slices: [number, number][] = [];
  for (let a = startMs; a < endMs; a += SLICE) slices.push([a, Math.min(a + SLICE, endMs)]);

  const readSlice = async ([a, b]: [number, number]) => {
    const items: unknown[] = [];
    let cursor = "";
    for (let page = 0; page < 400; page++) {
      const q = new URLSearchParams({ started_after: String(a - 1), started_before: String(b) });
      if (cursor) q.set("cursor", cursor);
      const res = (await dialpad(opts, "GET", `/api/v2/call?${q}`, "list calls")) as {
        items?: unknown[] | null;
        cursor?: string | null;
      };
      items.push(...(res.items ?? []));
      cursor = res.cursor ?? "";
      if (!cursor || !(res.items ?? []).length) return items;
    }
    return items;
  };

  const all: unknown[] = [];
  for (let i = 0; i < slices.length; i += 4) {
    const got = await Promise.all(slices.slice(i, i + 4).map(readSlice));
    for (const g of got) all.push(...g);
  }
  return all;
}

export type TextsResult =
  | { ok: true; rows: Record<string, string>[] }
  | { ok: false; reason: "scope" | "failed" };

const TEXT_COLUMNS = ["date", "message_id", "direction", "from_phone", "to_phone"] as const;

/**
 * Text records for days `from`..`to` via the stats export. days_ago_* count
 * back from `today` in America/Chicago; days_ago_start is the NEAR edge
 * (Data App automation/dialpad.js). The download link is a signed storage
 * URL and is fetched without our key.
 */
export async function exportTexts(
  opts: DialpadOptions,
  from: string,
  to: string,
  today: string
): Promise<TextsResult> {
  const sleep = opts.sleep ?? sleepReal;
  const now = opts.now ?? Date.now;
  const deadline = now() + (opts.textDeadlineMs ?? 150_000);
  const daysAgo = (d: string) => Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${d}T00:00:00Z`)) / DAY_MS);
  try {
    const started = (await dialpad(opts, "POST", "/api/v2/stats", "text export", {
      export_type: "records",
      stat_type: "texts",
      days_ago_start: daysAgo(to),
      days_ago_end: daysAgo(from),
      timezone: TIMEZONE,
    })) as { request_id?: string };
    if (!started.request_id) return { ok: false, reason: "failed" };

    await sleep(15_000); // Dialpad asks for 15–20 s before the first look
    while (now() < deadline) {
      const r = (await dialpad(
        opts,
        "GET",
        `/api/v2/stats/${encodeURIComponent(started.request_id)}`,
        "text export status"
      )) as { status?: string; download_url?: string };
      if (r.status === "failed") return { ok: false, reason: "failed" };
      if (r.status === "complete" && r.download_url) {
        const res = await opts.fetch(r.download_url, { signal: AbortSignal.timeout(60_000) });
        if (!res.ok) return { ok: false, reason: "failed" };
        const csv = await res.text();
        if (/^\s*[<{]/.test(csv)) return { ok: false, reason: "failed" };
        return { ok: true, rows: parseCsv(csv, TEXT_COLUMNS) };
      }
      await sleep(8_000);
    }
    return { ok: false, reason: "failed" };
  } catch (err) {
    const status = err instanceof DialpadError ? err.status : 0;
    return { ok: false, reason: status === 401 || status === 403 ? "scope" : "failed" };
  }
}

/* --- one fetch for a run of days ------------------------------------------- */

export type DaysResult = {
  rows: DayRow[];
  calls: "ok" | "rejected" | "failed";
  texts: "ok" | "scope" | "failed";
};

/**
 * Reads Dialpad once for `days` (consecutive, oldest first) and returns three
 * rows per day. Calls and texts are read side by side; either failing nulls
 * only its own columns. The raw records go out of scope when this returns.
 */
export async function fetchDays(opts: DialpadOptions, days: string[], today: string): Promise<DaysResult> {
  const from = days[0];
  const to = days[days.length - 1];
  const [calls, texts] = await Promise.all([
    listCalls(opts, dayStartMs(from), dayStartMs(addDays(to, 1))).then(
      (records) => countCalls(records, days),
      (err) => (err instanceof DialpadError && (err.status === 401 || err.status === 403) ? "rejected" : "failed") as
        | "rejected"
        | "failed"
    ),
    exportTexts(opts, from, to, today).then((r) => (r.ok ? { counts: countTexts(r.rows, days) } : r)),
  ]);

  const rows = emptyRows(days);
  for (const row of rows) {
    const key = `${row.date}|${row.center}`;
    if (typeof calls !== "string") Object.assign(row, calls.get(key) ?? {});
    else {
      row.calls_inbound = row.calls_inbound_answered = row.calls_inbound_missed = row.calls_outbound = null;
      row.unique_inbound_callers = null;
    }
    if ("counts" in texts) Object.assign(row, texts.counts.get(key) ?? {});
    else row.texts_inbound = row.texts_outbound = null;
  }
  return {
    rows,
    calls: typeof calls === "string" ? calls : "ok",
    // A rejected key refuses texts too; that is not a missing texts scope.
    texts: "counts" in texts ? "ok" : calls === "rejected" ? "failed" : texts.reason,
  };
}

/* --- the response ---------------------------------------------------------- */

export type PhoneStatsResponse = {
  generated_at: string;
  timezone: typeof TIMEZONE;
  from: string;
  to: string;
  rows: DayRow[];
  notes: string[];
};

/** Rebuilds each row from the allow-list, so nothing but ROW_FIELDS can reach
 *  the wire even if a row picked up an extra property on the way. */
export function buildResponse(input: {
  days: string[];
  rows: DayRow[];
  notes: string[];
  now: Date;
}): PhoneStatsResponse {
  const count = (v: unknown): number | null =>
    typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null;
  const rows = input.rows.map((r) => ({
    date: DATE_RE.test(r.date) ? r.date : "",
    center: (CENTERS as readonly string[]).includes(r.center) ? r.center : "other",
    calls_inbound: count(r.calls_inbound),
    calls_inbound_answered: count(r.calls_inbound_answered),
    calls_inbound_missed: count(r.calls_inbound_missed),
    calls_outbound: count(r.calls_outbound),
    texts_inbound: count(r.texts_inbound),
    texts_outbound: count(r.texts_outbound),
    unique_inbound_callers: count(r.unique_inbound_callers),
    first_time_inbound_callers: count(r.first_time_inbound_callers),
  })) as DayRow[];
  return {
    generated_at: input.now.toISOString(),
    timezone: TIMEZONE,
    from: input.days[0],
    to: input.days[input.days.length - 1],
    rows,
    notes: [...new Set(input.notes)],
  };
}
