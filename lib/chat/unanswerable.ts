import { SESSION_LENGTH } from "../site-config";
import { hoursSummary, locationHours, locations } from "../locations";
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
 * Hours were the original case, and they are now the case that graduated.
 * While the week was unconfirmed they were absent by design, so "when are you
 * open" retrieved Franklin's coming-soon passage and "what are your hours"
 * retrieved the session-length FAQ — both on one shared word, both scoring
 * well enough to pass every gate, and the model was then handed passages that
 * do not answer the question and left to decline.
 *
 * Ben has since confirmed both weeks, per center, so hours are **answered**
 * here rather than declined — same stage, same determinism, opposite outcome.
 * They stay in this module rather than joining the index because there is no
 * single week to retrieve: the two centers differ, the answer has to name both
 * and the difference between them, and that is a sentence assembled from data
 * (lib/locations.ts `hoursSummary`), not a passage. A retrieved passage would
 * have to be written twice and would disagree with the location pages the
 * first time one changed.
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

export type PreRetrievalTopic = {
  /** Short name, for the conversation log. Never shown. */
  topic: string;
  patterns: RegExp[];
  /**
   * The turn's copy, built at request time from whatever gates the topic, or
   * null to let the question through to retrieval and the model as normal.
   *
   * Split the way §3's refusals are split. `body` is the whole answer to the
   * topic — a decline for something the practice has not settled, the answer
   * itself for something it has; `offer` is what follows. They are separate
   * because a topic raised *during* the booking flow has to end with the
   * booking question the visitor still owes, and "Want me to set one up?" is
   * nonsense when one is already being set up. Never model-generated.
   *
   * Built at request time, not at module load, which is what lets a topic
   * change its own answer — or retire itself — the moment the data behind it
   * is confirmed, with no second cleanup task to remember.
   */
  respond: () => { body: string; offer: string } | null;
};

/**
 * The hours answer: both weeks, and the difference between them.
 *
 * Assembled from `hoursSummary`, the same function the location pages and the
 * cards print, so the assistant cannot drift from the page. Centers with no
 * confirmed week contribute nothing — Franklin has no hours at all until it
 * has an opening date.
 *
 * **Saturday is not buried.** Nashville is the only center open on one, and a
 * visitor whose only free day is Saturday is exactly the person this question
 * comes from. Same for Friday, which Murfreesboro does not keep. The centers
 * are named on their own lines rather than merged into a single week, because
 * a merged week would be true of neither.
 */
function hoursReply(): { body: string; offer: string } | null {
  const published = locations.filter((l) => locationHours(l) !== null);
  if (published.length === 0) return null;

  const lines = published
    .map((l) => `${l.name} is open ${hoursSummary(l)!.replace(/ · /g, ", ")}.`)
    .join(" ");

  return {
    body:
      published.length > 1
        ? `Our centers keep different weeks, so it depends which one you'd come to. ${lines}`
        : lines,
    offer:
      "If you tell me which days work for you, the team can find one on the free call. Want me to set one up?",
  };
}

/**
 * Written to the §3 shape: say plainly what I can't tell them, then the single
 * primary ask. No apology, no hedge, no second CTA — the launcher is worded so
 * it isn't a button making the primary ask, and neither is this.
 */
export const PRE_RETRIEVAL_TOPICS: PreRetrievalTopic[] = [
  {
    topic: "hours",
    respond: hoursReply,
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
      // A named day is an hours question on this site, because the two centers
      // keep different weeks: Friday is a Nashville day and not a Murfreesboro
      // one, and Saturday is Nashville alone. "Can I come on a Friday?" has a
      // real answer and it is not the same answer for both centers.
      //
      // But a day *word* is not a day question. This practice sees families
      // whose Saturdays are the hard part: "she melts down every Saturday
      // morning" and "weekends are the worst" are the concern, not the
      // schedule. So the day has to arrive with a word about availability
      // before it counts — order-independent, because "are you open Friday"
      // and "Friday — are you open?" are the same question.
      /(?=.*\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekend|weekday)s?\b)(?=.*\b(open|closed?|appointments?|available|availability|schedule|scheduling|walk[- ]?ins?|come in|come on|drop in|book|visit)\b)/,
      // "hours" is deliberately absent from that second list: a parent writing
      // "he cries for hours every Saturday" is describing the problem, not
      // asking when we open. The phrasings where the word really is about the
      // schedule are matched directly instead.
      /\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekend)s? hours\b/,
      /\bhours (on|for) (a |the )?(monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekend)/,
      /\bwalk[- ]?ins?\b/,
    ],
  },
  {
    topic: "session-length",
    // Dormant while SESSION_LENGTH is verified — the passages carrying the
    // duration are in the index and answer it. Kept, not deleted: flipping the
    // Verifiable false takes the claim out of the assistant's mouth again
    // without touching a page.
    respond: () =>
      SESSION_LENGTH.verified
        ? null
        : {
            body: "I’d rather not quote a session length the practice hasn’t confirmed yet.",
            offer:
              "The team can tell you exactly what to plan for on the free call. Want me to set one up?",
          },
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
  },
];

export type PreRetrievalAnswer = {
  topic: string;
  /** The body and its follow-on, which is what a visitor normally sees. */
  reply: string;
  /** The body alone, for a topic raised mid-booking. See `respond` above. */
  bodyOnly: string;
  /** The phrase that matched, for the conversation log. Never shown. */
  matched: string;
};

/**
 * The check. Returns fixed copy for a topic this stage owns — the answer for
 * one the practice has settled, the decline for one it hasn't — or null, in
 * which case the turn continues to booking and retrieval exactly as before.
 *
 * Runs after §3 refusals, so an out-of-scope question is refused as one rather
 * than deflected as a gap, and before retrieval, so no passage is ever scored
 * against a question this stage was always going to answer itself.
 */
export function checkPreRetrieval(message: string): PreRetrievalAnswer | null {
  const text = normalize(message);

  for (const { topic, patterns, respond } of PRE_RETRIEVAL_TOPICS) {
    const copy = respond();
    if (!copy) continue;
    for (const pattern of patterns) {
      const match = pattern.exec(text);
      if (match) {
        return {
          topic,
          reply: `${copy.body} ${copy.offer}`,
          bodyOnly: copy.body,
          // The day rule is two lookaheads, so it matches zero characters —
          // its groups hold the words that actually fired. A log line saying a
          // turn was gated on "" is the kind of thing that costs a morning.
          matched: match[0] || match.slice(1).filter(Boolean).join(" + ") || topic,
        };
      }
    }
  }
  return null;
}
