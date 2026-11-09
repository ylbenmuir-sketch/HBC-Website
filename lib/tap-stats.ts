/**
 * Tap counts for the phone-stats endpoint (Ben, 2026-11-09): per Chicago
 * day per center, the taps and how many of them became a conversation
 * (lib/tap-match.ts), plus the same seven counts broken out by the button
 * location. Counts only — the rows this reads carry no number, name or
 * message to begin with (lib/tap.ts), and what leaves is integers keyed by
 * fixed-list strings.
 */

import { LINK_LOCATIONS, type LinkLocation } from "./analytics";
import { chicagoDate, type Center } from "./phone-stats";

export const TAP_FIELDS = [
  "taps_phone",
  "taps_text",
  "taps_phone_matched",
  "taps_phone_matched_answered",
  "taps_phone_matched_2min_plus",
  "taps_text_matched",
  "taps_text_matched_replied",
] as const;
export type TapField = (typeof TAP_FIELDS)[number];
export type TapCounts = Record<TapField, number>;

/** One contact_taps row, the columns this reads. */
export type TapStatRow = {
  ts: string;
  center: string;
  link_type: string;
  location: string;
  match_status: string;
  answered: boolean | null;
  duration_bucket: string | null;
  replied_within_24h: boolean | null;
};

export type DayTapCounts = TapCounts & { by_location: Partial<Record<LinkLocation, TapCounts>> };

export function emptyTapCounts(): TapCounts {
  return Object.fromEntries(TAP_FIELDS.map((f) => [f, 0])) as TapCounts;
}

function add(c: TapCounts, r: TapStatRow): void {
  const matched = r.match_status === "matched";
  if (r.link_type === "phone") {
    c.taps_phone++;
    if (matched) {
      c.taps_phone_matched++;
      if (r.answered === true) c.taps_phone_matched_answered++;
      if (r.answered === true && r.duration_bucket === ">2m") c.taps_phone_matched_2min_plus++;
    }
  } else if (r.link_type === "text") {
    c.taps_text++;
    if (matched) {
      c.taps_text_matched++;
      if (r.replied_within_24h === true) c.taps_text_matched_replied++;
    }
  }
}

/** `date|center` → the day's counts, for the days asked. Rows on another
 *  day, or with a center or location off the lists, are skipped. */
export function countTaps(rows: TapStatRow[], days: string[], centers: readonly Center[]): Map<string, DayTapCounts> {
  const wanted = new Set(days);
  const out = new Map<string, DayTapCounts>();
  for (const r of rows) {
    const ms = Date.parse(r.ts);
    if (!Number.isFinite(ms)) continue;
    const date = chicagoDate(ms);
    if (!wanted.has(date)) continue;
    if (!(centers as readonly string[]).includes(r.center)) continue;
    const key = `${date}|${r.center}`;
    const day = out.get(key) ?? { ...emptyTapCounts(), by_location: {} };
    out.set(key, day);
    add(day, r);
    const location: LinkLocation = (LINK_LOCATIONS as readonly string[]).includes(r.location) ? (r.location as LinkLocation) : "other";
    const loc = day.by_location[location] ?? emptyTapCounts();
    day.by_location[location] = loc;
    add(loc, r);
  }
  return out;
}
