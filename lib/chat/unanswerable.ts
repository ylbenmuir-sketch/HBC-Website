import {
  BUSINESS_HOURS,
  SESSION_LENGTH,
  type Verifiable,
} from "../site-config";
import { normalize } from "./refusals";

/**
 * Topics the site deliberately does not answer yet (phase-8-chatbot.md §2, §5.1).
 *
 * ## The gap this fills
 *
 * Retrieval has two outcomes, and §2 is emphatic that both are fine: passages,
 * or "I don't know". What it has no outcome for is a question the site has
 * *decided* not to answer — where the copy exists but is gated, so the words
 * are missing from the index while every word *around* them is still there.
 *
 * Hours are the original case. They are absent by design (BUSINESS_HOURS is
 * unverified), so "when are you open" retrieved Franklin's coming-soon passage
 * and "what are your hours" retrieved the session-length FAQ — both on one
 * shared word, both scoring well enough to pass every gate. The model was then
 * handed passages that do not answer the question and left to decline: the
 * prompt covering for a structural hole, which is the arrangement §3 and §4
 * exist to avoid everywhere else.
 *
 * The `confirmTag` exclusions made a second case (see ./content-index.ts).
 * Dropping the session-length passages left "how long is a session" landing on
 * FAQ 7, "How many sessions will I need?" — a confident answer to a question
 * nobody asked, which is worse than the no-match it replaced.
 *
 * ## The shape
 *
 * The same shape as the §3 refusals and §4 safety checks, for the same reason:
 * deterministic, fixed copy, decided before any model is involved. A topic
 * declares the patterns that mean it and the `Verifiable` that gates it.
 *
 * ## How each topic retires itself
 *
 * `gate.verified` is read at request time, not at module load. The moment Ben
 * sets `verified: true` the check stops firing and the topic flows to retrieval
 * and the model like anything else — the same edit that unlocks the rest of
 * what the fact was blocking. For hours that is `callbackExpectation()`'s
 * open/closed branches and `openingHoursSpecification` in the JSON-LD; for
 * session length it is the passages ./content-index.ts is holding back. There
 * is no second cleanup task and nothing to remember to delete, which is the
 * point: a check that has to be removed by hand is a check that outlives its
 * reason.
 */

export type UnanswerableTopic = {
  /** Short name, for the conversation log. Never shown. */
  topic: string;
  /** Checked at request time. While unverified, the topic is unanswerable. */
  gate: Verifiable<unknown>;
  patterns: RegExp[];
  /**
   * Fixed copy, split the way §3's refusals are split. `decline` is the whole
   * answer to the topic; `offer` is the redirect that follows it. They are
   * separate because a topic raised *during* the booking flow has to end with
   * the booking question the visitor still owes — and "Want me to set one up?"
   * is nonsense when one is already being set up. Never model-generated.
   */
  decline: string;
  offer: string;
};

/**
 * Written to the §3 shape: say plainly what I can't tell them, then the single
 * primary ask. No apology, no hedge, no second CTA — the launcher is worded so
 * it isn't a button making the primary ask, and neither is this.
 */
export const UNANSWERABLE_TOPICS: UnanswerableTopic[] = [
  {
    topic: "hours",
    gate: BUSINESS_HOURS,
    patterns: [
      /\bwhen .{0,12}\bopen\b/,
      /\bare you open\b/,
      /\bare you closed\b/,
      /\byour hours\b/,
      /\bhours of operation\b/,
      /\bopening hours\b/,
      // "what time" needs the practice as its subject. Bare, it also begins
      // "what time is the Titans game?" — which has an honest no-match already
      // and should not be answered as though the visitor asked about us.
      /\bwhat time\b[^.?!]{0,24}\b(you|open|close|start|available)\b/,
      /\bwhat days\b/,
      // A weekend question is an hours question on this site — the location
      // pages print "Sat by appointment", which is an appointment slot rather
      // than a statement of when anyone is there, and BUSINESS_HOURS records
      // Saturday as null for exactly that reason.
      //
      // But a weekend *word* is not a weekend question. This practice sees
      // families whose Saturdays are the hard part: "she melts down every
      // Saturday morning" and "weekends are the worst" are the concern, not
      // the schedule. So the day has to arrive with a word about availability
      // before it counts — order-independent, because "are you open Saturday"
      // and "Saturday — are you open?" are the same question.
      /(?=.*\b(saturday|sunday|weekend)s?\b)(?=.*\b(open|closed?|appointments?|available|availability|schedule|scheduling|walk[- ]?ins?|come in|drop in)\b)/,
      // "hours" is deliberately absent from that second list: a parent writing
      // "he cries for hours every Saturday" is describing the problem, not
      // asking when we open. The two phrasings where the word really is about
      // the schedule are matched directly instead.
      /\b(saturday|sunday|weekend)s? hours\b/,
      /\bhours (on|for) (a |the )?(saturday|sunday|weekend)/,
      /\bwalk[- ]?ins?\b/,
    ],
    decline:
      "I don’t want to give you hours I’m not certain of. The team can tell you " +
      "exactly when they’re around.",
    offer:
      "The free call is the quickest way, or the contact page has the number: /contact",
  },
  {
    topic: "session-length",
    gate: SESSION_LENGTH,
    patterns: [
      // "how long" has to be tied to the thing being timed. On its own it also
      // begins "how long have you been open" and "how long until she's
      // better" — the second of which is a §3 prediction and is refused
      // before this check ever runs.
      /\bhow long\b[^.?!]{0,24}\b(session|visit|appointment|take|last)/,
      /\bhow much time\b[^.?!]{0,24}\b(session|visit|appointment|take|last)/,
      /\bhow many minutes\b/,
      /\b(session|visit|appointment)s? length\b/,
      /\blength of (a |the |my )?(session|visit|appointment)\b/,
    ],
    decline:
      "I’d rather not quote a session length the practice hasn’t confirmed yet.",
    offer:
      "The team can tell you exactly what to plan for on the free call. Want me to set one up?",
  },
];

export type Unanswerable = {
  topic: string;
  /** The decline and its redirect, which is what a visitor normally sees. */
  reply: string;
  /** The decline alone, for a topic raised mid-booking. See `decline` above. */
  declineOnly: string;
  /** The phrase that matched, for the conversation log. Never shown. */
  matched: string;
};

/**
 * The check. Returns fixed copy for a question the site has decided not to
 * answer yet, or null — in which case the turn continues to booking and
 * retrieval exactly as before.
 *
 * Runs after §3 refusals, so an out-of-scope question is refused as one rather
 * than deflected as a gap, and before retrieval, so no passage is ever scored
 * against a question the index was never going to answer.
 */
export function checkUnanswerable(message: string): Unanswerable | null {
  const text = normalize(message);

  for (const { topic, gate, patterns, decline, offer } of UNANSWERABLE_TOPICS) {
    if (gate.verified) continue;
    for (const pattern of patterns) {
      const match = pattern.exec(text);
      if (match) {
        return {
          topic,
          reply: `${decline} ${offer}`,
          declineOnly: decline,
          // The weekend rule is two lookaheads, so it matches zero characters
          // — its groups hold the words that actually fired. A log line saying
          // a turn was gated on "" is the kind of thing that costs a morning.
          matched: match[0] || match.slice(1).filter(Boolean).join(" + ") || topic,
        };
      }
    }
  }
  return null;
}
