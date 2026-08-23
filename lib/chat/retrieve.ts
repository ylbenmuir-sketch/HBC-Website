import { CONTENT_INDEX } from "./content-index";
import type { Passage } from "./types";

/**
 * Retrieval over the content index (phase-8-chatbot.md §2).
 *
 * Server-side only. Lexical BM25 across ~100 short passages, not embeddings —
 * three reasons, in order of how much they matter here:
 *
 * 1. **It can be checked by hand.** Ben has to be able to run the §7 accuracy
 *    list and see why a question found what it found. Every input to a score
 *    is a word in a file he can read.
 * 2. **It is deterministic.** The same question retrieves the same passages
 *    today and after a redeploy, so a wrong answer is reproducible.
 * 3. **Nothing leaves the server, and no key is involved.** Retrieval runs
 *    before any model call, which is what makes the "answer only from these
 *    passages" instruction enforceable rather than aspirational.
 *
 * The corpus is ~100 passages of published copy. This is the size where BM25
 * is simply the right tool; revisit if the knowledge base ever grows an order
 * of magnitude, not before.
 *
 * **Retrieval never answers.** It returns passages or it returns no-match. The
 * answering layer (§2's "using only those passages") and the refusal and
 * safety checks (§3, §4) sit on top and are not built yet.
 */

/**
 * Tunables, together, because they are what gets adjusted when a question in
 * §7 finds the wrong thing. Every one of them trades a wrong answer against a
 * missed one, and §2 is explicit about which way to lean: a confident wrong
 * answer about a wellness service is worse than "I don't know."
 */
export const RETRIEVAL = {
  /** Passages handed to the answering layer, at most. */
  maxPassages: 4,
  /** Character budget across those passages, so a long answer can't crowd out the rules. */
  maxChars: 2600,
  /** BM25 saturation and length normalization — standard values. */
  k1: 1.2,
  b: 0.75,
  /** A passage's own question and title are the strongest signal of what it answers. */
  questionWeight: 3,
  titleWeight: 2,
  keywordWeight: 2,
  /** Below this BM25 score the best passage is not about the question. */
  minScore: 3.2,
  /**
   * The floor for a question that reduces to a single known term.
   *
   * `minScore` is an absolute BM25 score, and BM25 sums over query terms — so
   * the floor carries a length bias that has nothing to do with relevance. The
   * shortest, most-asked questions on this site are exactly the ones it
   * rejected: "how does it work" scored 2.75 and "what is LENS" 1.64, both
   * with coverage 1.0 against the right /how-lens-works passage. The passage
   * answered the whole question; there was simply only one term to score.
   *
   * This is not a loosening of `minScore`, which is unchanged for every
   * multi-term question. It applies only when the query has one known term,
   * and the coverage and subject gates below still have to pass — so the
   * passage must account for the whole question AND be filed under it.
   */
  minScoreSingleTerm: 1.4,
  /** Share of the question's meaning the best passage has to account for. */
  minCoverage: 0.5,
  /** A supporting passage scoring less than this much of the best one is padding. */
  supportingScoreRatio: 0.35,
  /**
   * What a word the site has never used costs. Unknown words are the clearest
   * signal that a question is about something else — "Do you sell CBD oil?" is
   * three of them — so they count against coverage. Capped, because a long
   * message about a real concern should not be rejected for the incidental
   * words around it.
   */
  unknownTermIdf: 3.4,
  maxUnknownTerms: 3,
} as const;

const STOPWORDS = new Set(
  ("a about after all also am an and any are as at be because been before being " +
    "but by can cant come could did do does doesnt doing dont for from get give go " +
    "had has have having he her here hers him his how i if in into is it its ive just " +
    "know like ll me might much must my need no not now of on once one only or other " +
    "our out over own re please put said same say see " +
    // "several" joins "some", "any" and "all" above, and arrives the same way
    // "everyone" did — the guide uses it once ("one problem with several
    // outputs"), which took the word from unknown to known-once and pushed
    // every question containing it down. It broke "my son wakes up several
    // times a night", which had been reaching concern:sleep:goals and became
    // an off-topic no-match: coverage fell below the gate because the
    // denominator grew and no sleep passage contains the word.
    //
    // Same test as before: is any passage ever going to be *about* this word?
    // No. So scoring it can only cost, and the fix belongs here rather than in
    // the guide's sentence.
    "several " +
    "she should so some such take tell " +
    // "everyone" sits with "all", "any", "some" and "one" above, and its
    // absence went unnoticed only because the site had never used the word.
    // /concerns/concussion does — once, in "cluster in everyone else" — and
    // that single use broke "My son is snapping at everyone", a routing case
    // in the audit that had nothing to do with concussion.
    //
    // The mechanism is worth writing down, because any new page can repeat
    // it. A word the corpus has never used costs `unknownTermIdf`, 3.4. A
    // word it uses *once* is worth log(1 + (N - 0.5)/1.5) ≈ 4.3 — more. So a
    // term crossing from unknown to known-once raises the denominator in
    // coverageOf() and pushes every question containing it *down*, even
    // though nothing about those questions changed. Adding copy is not
    // supposed to be able to un-route a question somewhere else, and for a
    // word that carries meaning it doesn't — the passage that gains the word
    // gains the score too. It only bites on words like this one, which no
    // passage is ever going to be *about*.
    "everyone " +
    "than that the their them then there these they thing think this those through to " +
    // "where" and "who" are deliberately NOT here. On this corpus they are
    // discriminative rather than noise: they appear almost only in the curated
    // routing keywords (LOCATION_KEYWORDS, the team passages), so keeping them
    // lets "where are you" and "who will I see" — which otherwise tokenize to
    // nothing at all — reach the right passage. "when" stays a stopword: it
    // routes hours questions, and hours are deliberately absent from the index
    // (§5.1), so scoring it would only produce confident answers from
    // unrelated copy.
    "too us use very want was way we well were what when which while whom why " +
    "will with would you your yours").split(" ")
);

/** Words the plural/tense rules below must not touch. */
const STEM_EXCEPTIONS = new Set(["lens", "stress", "less", "adhd", "ptsd", "hsa", "fsa", "was", "has"]);

/**
 * Deliberately crude stemming: the query and the passages go through the same
 * function, so consistency matters more than linguistic correctness. "waking"
 * becoming "wak" is fine as long as it happens on both sides.
 */
function stem(token: string): string {
  if (STEM_EXCEPTIONS.has(token)) return token;
  if (token.length > 5 && token.endsWith("ies")) return `${token.slice(0, -3)}y`;
  if (token.length > 5 && token.endsWith("ing")) return token.slice(0, -3);
  if (token.length > 4 && token.endsWith("ed")) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith("es") && !token.endsWith("ses")) return token.slice(0, -2);
  if (token.length > 3 && token.endsWith("s") && !token.endsWith("ss")) return token.slice(0, -1);
  return token;
}

export function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^a-z0-9']+/g, " ")
    .replace(/'/g, "")
    .split(" ")
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map(stem);
}

type IndexedPassage = {
  passage: Passage;
  /** Term frequencies, with question/title/keyword hits already weighted. */
  tf: Map<string, number>;
  length: number;
  /**
   * What the passage is filed under — its question, title and keywords, and
   * not its prose. See the subject check in retrieve().
   */
  subject: Set<string>;
};

function weightedTokens(passage: Passage): string[] {
  const repeat = (text: string, times: number) =>
    Array.from({ length: times }, () => tokenize(text)).flat();
  return [
    ...tokenize(passage.text),
    ...repeat(passage.question ?? "", RETRIEVAL.questionWeight),
    ...repeat(passage.title, RETRIEVAL.titleWeight),
    ...repeat((passage.keywords ?? []).join(" "), RETRIEVAL.keywordWeight),
  ];
}

function buildSearchIndex(passages: Passage[]) {
  const documents: IndexedPassage[] = passages.map((passage) => {
    const tokens = weightedTokens(passage);
    const tf = new Map<string, number>();
    for (const token of tokens) tf.set(token, (tf.get(token) ?? 0) + 1);
    const subject = new Set(
      tokenize(
        [passage.question ?? "", passage.title, (passage.keywords ?? []).join(" ")].join(" ")
      )
    );
    return { passage, tf, length: tokens.length, subject };
  });

  const df = new Map<string, number>();
  for (const doc of documents) {
    for (const term of doc.tf.keys()) df.set(term, (df.get(term) ?? 0) + 1);
  }

  const total = documents.length;
  const avgLength = documents.reduce((sum, d) => sum + d.length, 0) / total;
  const idf = (term: string) => {
    const seen = df.get(term) ?? 0;
    // Unseen terms are not free: they are what tells an off-topic question
    // from a badly worded one. See RETRIEVAL.unknownTermIdf.
    if (seen === 0) return null;
    return Math.log(1 + (total - seen + 0.5) / (seen + 0.5));
  };

  return { documents, total, avgLength, idf };
}

/**
 * Built once per server process. The index is derived from modules that are
 * constant at runtime, so there is nothing to invalidate.
 */
const search = buildSearchIndex(CONTENT_INDEX);

export type Scored = { passage: Passage; score: number };

export type NoMatchReason =
  /** Nothing left after stopwords — "hi", "ok", "thanks". */
  | "no-terms"
  /** Not one word of the question appears anywhere in the site's copy. */
  | "nothing-known"
  /** Something matched, but too little of the question. */
  | "off-topic"
  /** The words matched in passing prose, not in what the passage is about. */
  | "incidental"
  /** Matched broadly and weakly — common words, no real subject. */
  | "weak-match";

export type Retrieval =
  | {
      status: "grounded";
      passages: Scored[];
      /** Every distinct page behind those passages, for the links §2 asks for. */
      links: Array<{ title: string; href: string }>;
      terms: string[];
      coverage: number;
    }
  | {
      status: "no-match";
      reason: NoMatchReason;
      terms: string[];
      /** The closest thing found, for the conversation log. Never shown. */
      nearest: { id: string; score: number; coverage: number } | null;
    };

/**
 * How much of the question a passage accounts for, 0–1.
 *
 * IDF-weighted rather than a plain word count, so matching "insurance" counts
 * for more than matching "session", and words the site has never used count
 * against the total. This is the measure that decides "I don't know": a
 * question can score respectably on one common word and still be about
 * something the site has nothing to say on.
 */
function coverageOf(terms: string[], doc: IndexedPassage): number {
  let matched = 0;
  let possible = 0;
  let unknown = 0;

  for (const term of terms) {
    const idf = search.idf(term);
    if (idf === null) {
      unknown += 1;
      continue;
    }
    possible += idf;
    if (doc.tf.has(term)) matched += idf;
  }

  possible +=
    Math.min(unknown, RETRIEVAL.maxUnknownTerms) * RETRIEVAL.unknownTermIdf;

  return possible === 0 ? 0 : matched / possible;
}

function scoreOf(terms: string[], doc: IndexedPassage): number {
  const { k1, b } = RETRIEVAL;
  let score = 0;
  for (const term of terms) {
    const idf = search.idf(term);
    if (idf === null) continue;
    const tf = doc.tf.get(term) ?? 0;
    if (tf === 0) continue;
    const norm = 1 - b + (b * doc.length) / search.avgLength;
    score += idf * ((tf * (k1 + 1)) / (tf + k1 * norm));
  }
  return score;
}

/**
 * Find the passages that answer a visitor's message, or report that none do.
 *
 * The no-match path is not a failure mode — it is the behaviour §2 asks for,
 * and it is the reason the thresholds above exist. Nothing is returned
 * "just in case": a passage the answering layer is told to answer from is a
 * passage it will answer from.
 */
export function retrieve(message: string): Retrieval {
  const terms = [...new Set(tokenize(message))];

  if (terms.length === 0) {
    return { status: "no-match", reason: "no-terms", terms, nearest: null };
  }
  if (terms.every((term) => search.idf(term) === null)) {
    return { status: "no-match", reason: "nothing-known", terms, nearest: null };
  }

  const ranked = search.documents
    .map((doc) => ({ doc, score: scoreOf(terms, doc) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score);

  const best = ranked[0];
  const bestCoverage = best ? coverageOf(terms, best.doc) : 0;
  const nearest = best
    ? { id: best.doc.passage.id, score: round(best.score), coverage: round(bestCoverage) }
    : null;

  // The floor drops for a one-term question, because BM25 sums over terms and
  // an absolute floor otherwise penalises brevity rather than irrelevance.
  // The coverage and subject gates below are unchanged and still apply.
  const knownTerms = terms.filter((term) => search.idf(term) !== null).length;
  const floor =
    knownTerms <= 1 ? RETRIEVAL.minScoreSingleTerm : RETRIEVAL.minScore;

  if (!best || best.score < floor) {
    return { status: "no-match", reason: "weak-match", terms, nearest };
  }
  if (bestCoverage < RETRIEVAL.minCoverage) {
    return { status: "no-match", reason: "off-topic", terms, nearest };
  }
  // The passage has to be *about* something that was asked, not merely contain
  // the word somewhere. "Do you take walk-ins on Sundays?" otherwise lands on
  // /about, on the strength of "which door you walk through" — a strong score
  // and decent coverage on a passage with nothing to say about the question.
  // Opening hours are deliberately not in the index (§5.1), so this question
  // has no right answer available and belongs in no-match.
  if (!terms.some((term) => best.doc.subject.has(term))) {
    return { status: "no-match", reason: "incidental", terms, nearest };
  }

  const passages: Scored[] = [];
  let chars = 0;
  for (const { doc, score } of ranked) {
    if (passages.length >= RETRIEVAL.maxPassages) break;
    // Supporting passages ride on the best one's relevance, but a passage that
    // scores a fraction of it is padding, and padding is what gets quoted when
    // the real answer is thin.
    if (score < best.score * RETRIEVAL.supportingScoreRatio) break;
    if (chars + doc.passage.text.length > RETRIEVAL.maxChars && passages.length > 0) break;
    passages.push({ passage: doc.passage, score: round(score) });
    chars += doc.passage.text.length;
  }

  const links: Array<{ title: string; href: string }> = [];
  for (const { passage } of passages) {
    if (passage.href && !links.some((l) => l.href === passage.href)) {
      links.push({ title: passage.title, href: passage.href });
    }
  }

  return {
    status: "grounded",
    passages,
    links,
    terms,
    coverage: round(bestCoverage),
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * What the assistant says when retrieval comes back empty — fixed copy, not
 * model-generated, for the same reason the crisis response in §4.1 is fixed:
 * the one moment it must not improvise is the moment it has nothing to go on.
 *
 * The ask is the site's single primary CTA — the free call — in the site's
 * voice: plain, brief, no exclamation marks. §5 replaces the last sentence
 * with the booking flow once that exists; it does not add a second offer
 * beside it.
 *
 * It ends on the question rather than on the offer. "The free call is the
 * right place for it" describes a call; "Want me to set one up?" asks for one,
 * and it is also what app/api/chat/route.ts `offersCall()` looks for — so the
 * bare "yes" a visitor actually types opens the booking flow instead of
 * landing on nothing. Same two facts as before, one sentence more.
 */
export const NO_MATCH_REPLY =
  "That isn’t something I have on the site, and I don’t want to guess at it. " +
  "The free call is the right place for it — someone on the team can answer it properly. " +
  "Want me to set one up?";

/**
 * The same, for a visitor who has already booked or has already said they'd
 * rather not give a number.
 *
 * §5's "let them leave" is a promise the assistant makes in so many words —
 * "I won't ask again" — and a mandatory closing ask would break it on the next
 * message. The facts are identical; only the door held open is different.
 */
export const NO_MATCH_REPLY_NO_ASK =
  "That isn’t something I have on the site, and I don’t want to guess at it. " +
  "The contact page has the form and the number if you’d like to ask the team " +
  "directly: /contact";
