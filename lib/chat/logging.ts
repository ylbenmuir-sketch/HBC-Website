/**
 * Conversation logging (phase-8-chatbot.md §6 and §4.1).
 *
 * §6: "Log every conversation with a timestamp and session id. Retention and
 * review process are Ben's call; flag it rather than deciding." So this file
 * writes the log and does not decide where it lives or how long it lives
 * there — everything goes to the server log, which on Vercel means the
 * platform's own retention until somebody chooses otherwise.
 *
 * ## Three things Ben has to decide before this carries real traffic
 *
 * 1. **Retention.** Transcripts contain what visitors typed about their
 *    children. Right now they inherit the hosting platform's log retention,
 *    which is a default, not a decision. §8 already lists this.
 * 2. **Where flagged conversations go.** §4.1 says crisis conversations are
 *    logged *and flagged for human review*. This writes them at warn level
 *    with a greppable marker, which is a log line, not a review process —
 *    nobody is paged. Deciding who reads them, and how often, is §8's second
 *    open item.
 * 3. **Whether transcripts are logged at all.** `CHAT_LOG_TRANSCRIPTS=false`
 *    keeps the shape of every turn (timing, outcome, flags) and drops the
 *    words. §8 asks Ben to read 20 real transcripts in the first week, so the
 *    default is on — but it is one env var, and it is the right lever if the
 *    retention answer turns out to be "not in application logs".
 *
 * Nothing here is on the request's critical path: a logging failure must never
 * cost a visitor their answer, so every call is wrapped.
 */

/** What ended the turn. One of these is always true. */
export type TurnOutcome =
  | "crisis"
  | "minor"
  | "refusal"
  | "booking"
  | "booking-submitted"
  | "booking-failed"
  | "answered"
  | "no-match"
  | "error";

export type TurnLog = {
  sessionId: string;
  turn: number;
  outcome: TurnOutcome;
  /** Refusal category or safety kind, when one applied. */
  detail?: string;
  /** Passage ids the answer was grounded in (§2). */
  passages?: string[];
  /** §4.4 — recorded, never acted on. */
  injectionSuspected?: boolean;
  latencyMs?: number;
  message?: string;
  reply?: string;
};

const LOG_TRANSCRIPTS = process.env.CHAT_LOG_TRANSCRIPTS !== "false";

/** Truncated so one pasted essay can't dominate the log. */
function clip(text: string, max = 1200): string {
  return text.length > max ? `${text.slice(0, max)}…[truncated]` : text;
}

export function logTurn(entry: TurnLog): void {
  try {
    const record: Record<string, unknown> = {
      at: new Date().toISOString(),
      sessionId: entry.sessionId,
      turn: entry.turn,
      outcome: entry.outcome,
    };
    if (entry.detail) record.detail = entry.detail;
    if (entry.passages?.length) record.passages = entry.passages;
    if (entry.injectionSuspected) record.injectionSuspected = true;
    if (typeof entry.latencyMs === "number") record.latencyMs = entry.latencyMs;
    if (LOG_TRANSCRIPTS) {
      if (entry.message) record.message = clip(entry.message);
      if (entry.reply) record.reply = clip(entry.reply);
    }

    // §4.1: crisis conversations are flagged for human review. warn level and
    // a fixed marker so they can be alerted on without parsing every line.
    if (entry.outcome === "crisis") {
      console.warn(`[chat:FLAGGED:crisis] ${JSON.stringify(record)}`);
      return;
    }
    if (entry.outcome === "error" || entry.outcome === "booking-failed") {
      console.error(`[chat] ${JSON.stringify(record)}`);
      return;
    }
    console.log(`[chat] ${JSON.stringify(record)}`);
  } catch {
    // A logging failure must not cost the visitor their answer.
  }
}
