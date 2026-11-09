/**
 * Tap → conversation matching (Ben, 2026-11-09). Pure: taps and Dialpad
 * events in, decisions out; the job (app/api/cron/tap-match/route.ts) reads
 * and writes the rows. lib/tap-match.test.mjs holds it to the rules below.
 *
 * The rule: a phone tap is matched to the FIRST inbound call to that
 * center's line that started 0–3 minutes after the tap; a text tap to the
 * first inbound text to that center's line in the same window. Each Dialpad
 * event matches at most one tap (the earliest tap takes it), and a tap on
 * an "other" line matches nothing. It is an estimate — two visitors tapping
 * within a minute cannot be told apart — and the stats endpoint says so in
 * its notes.
 *
 * What is recorded for a match: the Dialpad event id (so the event cannot be
 * matched twice), for a call whether a person answered and the talk-time
 * bucket (<30s, 30s–2m, >2m), for a text whether a staff reply went back to
 * the same number within 24 hours — decided only once those 24 hours have
 * passed, null until then. The number itself is used for that one
 * comparison and never stored.
 *
 * A tap whose window has not closed yet is left pending (its events may not
 * be in Dialpad yet); the job runs nightly on completed days, so in practice
 * everything it sees has closed.
 */

import type { CallEvent, TextEvent } from "./phone-stats";
import { TAP_MATCH_WINDOW_MS, type TapCenter, type TapLinkType } from "./tap";

export const REPLY_WINDOW_MS = 24 * 3_600_000;

export const DURATION_BUCKETS = ["<30s", "30s-2m", ">2m"] as const;
export type DurationBucket = (typeof DURATION_BUCKETS)[number];

export type TapRow = {
  id: string;
  /** ms since epoch. */
  ts: number;
  link_type: TapLinkType;
  center: TapCenter;
  /** For a re-check of a matched text's reply: the matched message id. */
  dialpad_event_id?: string | null;
  match_status?: "pending" | "matched" | "unmatched";
  replied_within_24h?: boolean | null;
};

export type MatchDecision = {
  id: string;
  match_status: "matched" | "unmatched";
  dialpad_event_id: string | null;
  answered: boolean | null;
  duration_bucket: DurationBucket | null;
  replied_within_24h: boolean | null;
  reply_checked_at: string | null;
};

export function durationBucket(talkMs: number | null): DurationBucket | null {
  if (talkMs == null) return null;
  if (talkMs < 30_000) return "<30s";
  if (talkMs <= 120_000) return "30s-2m";
  return ">2m";
}

/** Did a center line text this number back within the reply window? */
export function repliedWithin(inbound: TextEvent, texts: TextEvent[]): boolean {
  return texts.some(
    (t) =>
      t.direction === "outbound" &&
      t.center === inbound.center &&
      t.external === inbound.external &&
      t.ts > inbound.ts &&
      t.ts <= inbound.ts + REPLY_WINDOW_MS,
  );
}

/**
 * Decide every tap whose window has closed. `used` seeds the event ids
 * already matched to earlier taps (from the table), so a re-run cannot hand
 * one event to two taps.
 */
export function matchTaps(input: {
  taps: TapRow[];
  calls: CallEvent[];
  texts: TextEvent[];
  now: number;
  used?: Iterable<string>;
  windowMs?: number;
}): MatchDecision[] {
  const windowMs = input.windowMs ?? TAP_MATCH_WINDOW_MS;
  const used = new Set(input.used ?? []);
  const inboundCalls = input.calls.filter((c) => c.direction === "inbound").sort((a, b) => a.ts - b.ts);
  const inboundTexts = input.texts.filter((t) => t.direction === "inbound").sort((a, b) => a.ts - b.ts);
  const out: MatchDecision[] = [];
  const nowIso = new Date(input.now).toISOString();

  for (const tap of [...input.taps].sort((a, b) => a.ts - b.ts)) {
    // A matched text whose reply was still unknown: answer only the reply.
    if (tap.match_status === "matched" && tap.link_type === "text" && tap.dialpad_event_id) {
      const inbound = inboundTexts.find((t) => t.id === tap.dialpad_event_id);
      if (!inbound || input.now < inbound.ts + REPLY_WINDOW_MS) continue;
      out.push({
        id: tap.id,
        match_status: "matched",
        dialpad_event_id: tap.dialpad_event_id,
        answered: null,
        duration_bucket: null,
        replied_within_24h: repliedWithin(inbound, input.texts),
        reply_checked_at: nowIso,
      });
      continue;
    }
    if (tap.match_status && tap.match_status !== "pending") continue;
    if (input.now < tap.ts + windowMs) continue; // window still open
    const unmatched: MatchDecision = {
      id: tap.id,
      match_status: "unmatched",
      dialpad_event_id: null,
      answered: null,
      duration_bucket: null,
      replied_within_24h: null,
      reply_checked_at: null,
    };
    if (tap.center === "other") {
      out.push(unmatched);
      continue;
    }
    const inWindow = (ts: number) => ts >= tap.ts && ts <= tap.ts + windowMs;
    if (tap.link_type === "phone") {
      const call = inboundCalls.find((c) => c.center === tap.center && inWindow(c.ts) && !used.has(c.id));
      if (!call) {
        out.push(unmatched);
        continue;
      }
      used.add(call.id);
      out.push({
        id: tap.id,
        match_status: "matched",
        dialpad_event_id: call.id,
        answered: call.answered,
        duration_bucket: call.answered ? durationBucket(call.talkMs) : null,
        replied_within_24h: null,
        reply_checked_at: null,
      });
      continue;
    }
    const text = inboundTexts.find((t) => t.center === tap.center && inWindow(t.ts) && !used.has(t.id));
    if (!text) {
      out.push(unmatched);
      continue;
    }
    used.add(text.id);
    const replyKnown = input.now >= text.ts + REPLY_WINDOW_MS;
    out.push({
      id: tap.id,
      match_status: "matched",
      dialpad_event_id: text.id,
      answered: null,
      duration_bucket: null,
      replied_within_24h: replyKnown ? repliedWithin(text, input.texts) : null,
      reply_checked_at: replyKnown ? nowIso : null,
    });
  }
  return out;
}
