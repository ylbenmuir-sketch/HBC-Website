import { SESSION_LENGTH } from "../site-config";
import {
  formattedHours,
  locationHours,
  locations,
  type Location,
} from "../locations";
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
  respond: (message: string) => { body: string; offer: string } | null;
};

/** Sunday-first, matching the `week` tuple and JS `Date#getDay()`. */
const DAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
] as const;

/**
 * The day the visitor named, or null.
 *
 * Full names only, deliberately: the patterns that bring a message here match
 * full names too, so this can never disagree with what fired. It also keeps
 * "sat" out of it — a word that is a day in a schedule and a verb in "he sat
 * still through the whole thing".
 *
 * First match wins. "Friday or Saturday" is answered for Friday and the offer
 * carries the rest, which is better than an answer that tries to be a table.
 */
function namedDay(text: string): number | null {
  const found = DAY_NAMES.map((day, i) => ({ i, at: text.indexOf(day.toLowerCase()) }))
    .filter((d) => d.at >= 0)
    .sort((a, b) => a.at - b.at)[0];
  return found ? found.i : null;
}

/** "9a–6p" for one center on one day, or null when it is closed. */
function dayLabel(center: Location, day: number): string | null {
  const week = locationHours(center);
  const hours = week?.week[day];
  return hours ? `${clockLabel(hours.opens)}–${clockLabel(hours.closes)}` : null;
}

/** "09:00" → "9a". Mirrors lib/locations.ts, which keeps its copy private. */
function clockLabel(hhmm: string): string {
  const [hour, minute] = hhmm.split(":").map(Number);
  const suffix = hour < 12 ? "a" : "p";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return minute === 0
    ? `${hour12}${suffix}`
    : `${hour12}:${String(minute).padStart(2, "0")}${suffix}`;
}

/** The first day this center opens after `day`. Null if it never opens. */
function nextOpenDay(center: Location, day: number): number | null {
  const week = locationHours(center);
  if (!week) return null;
  for (let ahead = 1; ahead <= 7; ahead += 1) {
    const next = (day + ahead) % 7;
    if (week.week[next]) return next;
  }
  return null;
}

/** "Nashville and Murfreesboro", "Nashville, Murfreesboro and Franklin". */
function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * The answer when the visitor named a day.
 *
 * The day she asked about is the first thing she reads, because that is the
 * question. Opening with the full two-center schedule and leaving her to find
 * Friday in it is the same failure as opening an answer with a disclaimer:
 * everything is present and the thing she came for is buried.
 *
 * **Saturday and Friday are the reason this exists.** They are the two days
 * the centers disagree about, and they are also the two a working parent is
 * most likely to ask about. "Yes — Nashville, 8a–3p" is an answer; the full
 * schedule is a document.
 */
function dayAnswer(published: Location[], day: number): string {
  const name = DAY_NAMES[day];
  const open = published
    .map((center) => ({ center, times: dayLabel(center, day) }))
    .filter((c): c is { center: Location; times: string } => c.times !== null);
  const shut = published.filter((c) => dayLabel(c, day) === null);

  // Closed everywhere: say so, then where she can actually go instead.
  if (open.length === 0) {
    const nearest = published.map((center) => ({
      center,
      next: nextOpenDay(center, day),
    }));
    const days = [...new Set(nearest.map((n) => (n.next === null ? "" : DAY_NAMES[n.next])))];
    const where =
      days.length === 1 && days[0]
        ? `The next open day is ${days[0]} at ${published.length > 1 ? "both centers" : published[0].name}.`
        : nearest
            .filter((n) => n.next !== null)
            .map((n) => `${n.center.name} opens again ${DAY_NAMES[n.next!]}.`)
            .join(" ");
    const everywhere =
      published.length > 1 ? "Both centers are closed" : `${published[0].name} is closed`;
    return `${everywhere} on ${name}s. ${where}`.trim();
  }

  // Open everywhere it could be.
  if (shut.length === 0) {
    const times = open.map((c) => `${c.center.name} ${c.times}`).join(" and ");
    const lead = published.length > 1 ? "both centers are open" : `${open[0].center.name} is open`;
    return `Yes — ${lead} on ${name}s: ${times}.`;
  }

  // The interesting case, and the one the two weeks make common: open at some
  // centers and not others. Lead with the yes and where, then the exception —
  // a visitor told only "yes" would turn up at the wrong door.
  const no = joinNames(shut.map((c) => c.name));
  const isAre = shut.length > 1 ? "are" : "is";
  const yes =
    open.length === 1
      ? `${name}s are a ${open[0].center.name} day, ${open[0].times}`
      : `${name}s are open at ${joinNames(
          open.map((c) => `${c.center.name} ${c.times}`)
        )}`;
  return `Yes — ${yes}. ${no} ${isAre} closed on ${name}s.`;
}

/**
 * The hours answer: the day she asked about, or both weeks and the difference
 * between them when she didn't ask about one.
 *
 * Assembled from lib/locations.ts — `formattedHours` for the full week, the
 * same function the location pages and the cards print, so the assistant
 * cannot drift from the page. Centers with no confirmed week contribute
 * nothing; Franklin has no hours at all until it has an opening date.
 *
 * **Saturday is never buried.** Nashville is the only center that keeps one,
 * and a visitor whose only free day is Saturday is exactly the person this
 * question comes from. Same for Friday, which Murfreesboro does not keep.
 */
function hoursReply(message: string): { body: string; offer: string } | null {
  const published = locations.filter((l) => locationHours(l) !== null);
  if (published.length === 0) return null;

  const day = namedDay(message);
  if (day !== null) {
    return {
      body: dayAnswer(published, day),
      offer: "The free call is the quickest way to sort a time. Want me to set one up?",
    };
  }

  // The page prints the week as list lines ("Tue–Fri 9a–6p", "Closed Sun–Mon")
  // and a sentence cannot just join them: "Murfreesboro is open Tue–Thu 9a–6p,
  // Closed Fri–Mon" reads as a contradiction. Open runs and closed runs are
  // separated and given their own clause instead — same data, same order,
  // read aloud.
  const lines = published
    .map((l) => {
      const week = formattedHours(l);
      const open = week.filter((line) => !line.startsWith("Closed"));
      const shut = week
        .filter((line) => line.startsWith("Closed"))
        .map((line) => line.replace(/^Closed /, ""));
      const closed = shut.length > 0 ? `, and closed ${shut.join(" and ")}` : "";
      return `${l.name} is open ${open.join(" and ")}${closed}.`;
    })
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
    const copy = respond(text);
    if (!copy) continue;
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return {
          topic,
          reply: `${copy.body} ${copy.offer}`,
          bodyOnly: copy.body,
        };
      }
    }
  }
  return null;
}
