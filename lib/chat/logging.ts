/**
 * Conversation logging (phase-8-chatbot.md §6 and §4.1).
 *
 * §6: "Log every conversation with a timestamp and session id. Retention and
 * review process are Ben's call; flag it rather than deciding." So this file
 * writes the log and does not decide where it lives or how long it lives
 * there — everything goes to the server log, which on Vercel means the
 * platform's own retention until somebody chooses otherwise.
 *
 * ## Three things Ben had to decide before this carries real traffic
 *
 * 1. **Retention.** Answered by (3): there is nothing left in the log that
 *    needs a retention policy, because the words are not written.
 * 2. **Where flagged conversations go.** Still open. §4.1 says crisis
 *    conversations are logged *and flagged for human review*. This writes
 *    them at warn level with a greppable marker, which is a log line, not a
 *    review process — nobody is paged. Deciding who reads them, and how
 *    often, is §8's second open item. Note for whoever designs that path:
 *    a flagged line now carries a *category* (`SafetyPattern`), not the
 *    sentence that triggered it. The review process has to work from that.
 * 3. **Whether transcripts are logged at all.** Settled: they are not. The
 *    default is off, in code — `CHAT_LOG_TRANSCRIPTS=true` is now the opt-in,
 *    not `=false` the escape hatch. What a visitor typed about her child does
 *    not belong in a server log that has no retention policy, and it is
 *    already stored properly in Supabase when it matters. Every turn still
 *    logs its shape: timing, outcome, flags, grounding. Only the words are
 *    gone. Turning it on is a deliberate act with a deliberate scope — read
 *    the 20 transcripts §8 asks for, then turn it back off.
 *
 * ## What a log line can contain
 *
 * With transcripts off — the default — no field here holds anything the
 * visitor typed. That is a property of every call site, not just of the
 * `message`/`reply` guard below, and it is worth keeping true:
 *
 * - `detail` is always a fixed category. `SafetyPattern` on a crisis or minor
 *   turn ("self-harm-intent", "age-stated"), `RefusalKind` on a refusal
 *   ("medication"), a topic slug on an unanswerable ("hours"). All three are
 *   closed unions in their own modules, so none can drift back into being a
 *   quotation. It used to be `stop.matched` — the phrase that tripped the
 *   pattern — which is exactly the sentence that should not sit in a log.
 * - `passages` are ids from our own content index. Our words, not theirs.
 * - `injectionSuspected` is a boolean. `detectInjection` does return the
 *   matched phrase, but app/api/chat/route.ts coerces it and never logs it.
 * - `sessionId` is an opaque id. The client may supply its own (≤64 chars),
 *   so a visitor's browser could in principle put text there; nothing on our
 *   side ever writes content into it.
 *
 * Adding a field that carries message text — even a "short" one, even a
 * "clipped" one — undoes the decision above. Log the category instead.
 *
 * Nothing here is on the request's critical path: a logging failure must never
 * cost a visitor their answer, so every call is wrapped.
 */

/** What ended the turn. One of these is always true. */
export type TurnOutcome =
  | "crisis"
  | "minor"
  /**
   * A head injury described as recent, or with a red-flag symptom beside it.
   * Not flagged the way a crisis is — the turn ends with the doctor-first copy
   * and the conversation carries on normally — but worth counting separately,
   * because how often it fires is the number that says whether the concussion
   * page is reaching people it should be sending elsewhere first.
   */
  | "head-injury"
  | "refusal"
  /** A topic the site has decided not to answer yet — see ./unanswerable.ts. */
  | "unanswerable"
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

// Off unless explicitly asked for. Anything other than the exact string "true"
// — unset, empty, "1", a typo — logs no message text, which is the failure
// direction to prefer.
const LOG_TRANSCRIPTS = process.env.CHAT_LOG_TRANSCRIPTS === "true";

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
