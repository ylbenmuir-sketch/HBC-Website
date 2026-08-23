/**
 * The answer-framing audit (phase 11b, recounted in 11d).
 *
 *   NEXT_PUBLIC_FEATURE_ASSISTANT=true PORT=3010 npm run dev
 *   CHAT_BASE=http://localhost:3010 npm run check:answers
 *   npm run check:answers -- --retrieval    # no server, no key, no spend
 *
 * The run has two halves and they fail for different reasons. The **retrieval
 * half** — refusals, gates, unanswerable topics, concern routing — is pure
 * functions over the index: no server, no model, no API key, deterministic.
 * The **answer half** posts to a running route and needs `ANTHROPIC_API_KEY`
 * to have credit on it.
 *
 * `--retrieval` runs the first half alone, which is what to run in CI, after a
 * merge, or on any day the key is empty: a boundary moving is a correctness
 * bug, and it should never be undetectable because billing lapsed. The
 * head-injury stop is in that half for the same reason — it is the one check
 * on this site whose failure sends somebody to the wrong kind of building.
 *
 * `npm run check:chat` prints transcripts and asserts nothing, by design — §7
 * wants them read. This one asserts, because the thing it is checking is
 * mechanical: not whether an answer is *true* (retrieval and the [CONFIRM]
 * gates decide that) but whether it is *shaped* like the site's voice.
 *
 * The failure it was written for: a visitor describes three hours of homework
 * and the reply opens "LENS is not a treatment, and I can't say what it would
 * do for your child." Every clause of that is honest and the whole thing reads
 * as "this doesn't work". The facts were never the problem — the order was.
 *
 * So each answer is checked against the four beats:
 *
 *   recognition → the answer → the proof → the ask
 *
 * 1. **Opens on recognition, not a negation.** The lived detail first, in the
 *    visitor's words. A negation-led opening is a hard failure; any negation
 *    *word* in the first sentence is flagged for a human to read, because the
 *    site's own copy says things like "a mind that won't shut off at night"
 *    and that is a recognition, not a denial.
 * 2. **No announced honesty.** "I'll be straight with you" and its variants.
 * 3. **One limit, counted over the whole answer.** Phase 11b checked for two
 *    limitation sentences *in a row*, and the answers routed around it: the
 *    recognition opened, and then two or three limits came one after another
 *    with a sentence of something else wedged between them. "Does it help with
 *    ADHD?" came back with three — not a treatment for ADHD or any diagnosis;
 *    works alongside, never in place of, your doctor, therapist, or school;
 *    nobody can say in advance how it would go. Adjacency was never what made
 *    that read as a warning label; the count did. So the count is what is
 *    checked, at every position, and one is the limit.
 * 4. **The call is the ask.** The turn ends on "Want me to set one up?" —
 *    which is also what app/api/chat/route.ts `offersCall()` looks for, so a
 *    bare "yes" starts the booking flow. A page link may appear, but before
 *    the ask: it is for someone who would rather read first, not an
 *    alternative to the call.
 * 5. **Grounding.** Every figure and every path in the reply has to appear in
 *    a passage retrieval actually handed over, or in the standing facts. This
 *    is the check that would catch an invented price.
 *
 * Retrieval runs in-process (Node's TypeScript stripping, same trick as
 * check:index) so the passages a reply is checked against are the exact ones
 * the route gave the model, not a guess from the log.
 */

import { registerHooks } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

// lib/ imports are extensionless, which Node's ESM resolver will not do on its
// own. Everything under lib/chat is plain erasable TypeScript, so appending the
// extension is the whole of what a build step would have done here.
// node_modules is exempt: lib/chat/answer.ts pulls in the Anthropic SDK, whose
// own CommonJS dependencies resolve extensionless relative paths the normal
// way and break if this touches them.
registerHooks({
  resolve(spec, ctx, next) {
    const local = !ctx.parentURL?.includes("/node_modules/");
    if (local && spec.startsWith(".") && !/\.(ts|tsx|js|mjs|cjs|json)$/.test(spec)) {
      return next(`${spec}.ts`, ctx);
    }
    return next(spec, ctx);
  },
});

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const { retrieve } = await import(`${ROOT}/lib/chat/retrieve.ts`);
const { checkRefusal } = await import(`${ROOT}/lib/chat/refusals.ts`);
const { checkSafety } = await import(`${ROOT}/lib/chat/safety.ts`);
const { checkPreRetrieval } = await import(`${ROOT}/lib/chat/unanswerable.ts`);
const { STANDING_FACT_TEXT } = await import(`${ROOT}/lib/chat/answer.ts`);
const { confirmed, CONTENT_INDEX } = await import(`${ROOT}/lib/chat/content-index.ts`);
const { advanceBooking, startBooking } = await import(`${ROOT}/lib/chat/booking.ts`);
const { STAT_SESSIONS, ESTABLISHED_YEAR } = await import(`${ROOT}/lib/site-config.ts`);

const BASE = `${process.env.CHAT_BASE ?? "http://localhost:3000"}/api/chat`;

/* ------------------------------------------------------------------ */
/* The sets                                                            */
/* ------------------------------------------------------------------ */

/**
 * The 25 answerable visitor questions — §7's accuracy list, the three starter
 * questions the empty state ships, and the questions that came up most in the
 * hand-run. Every one of these is answerable from published copy; a no-match
 * here is a finding about the index, not about framing.
 */
const VISITOR = [
  "How does LENS work?",
  "What is LENS neurofeedback?",
  "Is it safe?",
  "Is this safe for kids?",
  "Does it hurt?",
  "What happens at a first visit?",
  "What does it cost?",
  "Do you take insurance?",
  "Can I use my HSA?",
  "Where are you located?",
  "Is there parking?",
  "Do you have a center in Franklin?",
  "How many sessions will I need?",
  "Do I have to do anything during the session?",
  "Can my child come?",
  "What do you help with?",
  "Who will I see?",
  "Can I keep seeing my therapist?",
  "What's your phone number?",
  "Is this therapy or medical treatment?",
  "How are your practitioners trained?",
  "What if I'm not sure it's right for us?",
  "What is the Brain Map?",
  "Do you work with adults?",
  "What happens on the free call?",
];

/**
 * The concern set: one line per concern, written the way a parent or an adult
 * actually types it — the lived detail, not the category name. These are the
 * answers the whole audit exists for. A visitor who writes three hours of
 * homework is not asking what LENS is; she is asking whether we have seen this
 * before.
 */
const CONCERNS = [
  "Homework takes three hours and ends in tears most nights",
  "My son can't sit still long enough to finish anything",
  "My mind won't shut off at night and I'm awake at 3am",
  "I feel on edge all day and can't settle",
  "My daughter melts down over the smallest change of plan",
  "I keep losing words and forgetting why I walked into a room",
  "I'm burned out and running on empty",
  "Something happened years ago and I'm still jumpy all the time",
];

/**
 * The demand set (phase 11d): "does this help with X", asked flat.
 *
 * Neither a concern line nor a §7 accuracy question. A visitor asks it in four
 * words, and it is the one shape where the passages retrieval hands over are
 * mostly boundary copy — "Does it help with ADHD?" pulls
 * `concern:focus-adhd:limits` *and* `concern:focus-adhd:faq:2`, so two of four
 * passages say what LENS is not. A model handed that and told to stay honest
 * writes three limitation sentences and thinks it has done its job. It is the
 * hardest place on the site for one limit to stay one limit, which is exactly
 * why it belongs in the audit rather than in a hand-run.
 *
 * Also the sharpest place the standing prohibition can break: none of these
 * may be answered yes. What LENS does is what people come in *for*, and the
 * answer to "does it help with ADHD" is what the focus page recognises, never
 * a claim about a diagnosis.
 *
 * "Can I help my child without medication?" was the fourth line here and is
 * now in `MEDICATION_SUBSTITUTION` below instead: it is answered before
 * retrieval, in fixed copy, and never reaches the model at all. See there for
 * why.
 */
const DEMAND = [
  "Does it help with ADHD?",
  "Can it help with sleep?",
  "Does LENS help with anxiety?",
  "Do you help with brain fog?",
  // The hardest one on the list. Every passage this retrieves belongs to a
  // page about a brain injury, one of the four *is* the boundary note, and the
  // approved copy forbids saying LENS treats, heals or speeds recovery from
  // anything. If one limit can stay one limit here it can stay one anywhere.
  "Do you help with concussions?",
];

/* ------------------------------------------------------------------ */
/* The checks                                                          */
/* ------------------------------------------------------------------ */

const BANNED = [
  {
    name: "announced honesty",
    re: /\b(i'?ll be (straight|honest|blunt|frank)|i (have|need|want) to be (honest|clear|straight|upfront)|to be (honest|clear|straight|upfront|fair)|let me be (clear|honest|straight)|the honest (answer|truth)|in all honesty|full disclosure|i won'?t sugar-?coat|truthfully)\b/i,
  },
  { name: "hedge preamble", re: /^\s*(honestly|frankly|look,|so,)\b/i },
  // Recognition is a thing, not a remark about the question. Left unchecked,
  // "that's a fair thing to wonder" became the opening on eight of the
  // twenty-five — a beat spent complimenting the question instead of
  // recognising what she came in with, which is the padding the whole pattern
  // was meant to cut.
  {
    name: "compliments the question",
    re: /\b((good|great|fair|reasonable|excellent|smart) question|fair thing to (want to know|wonder|ask)|first thing (most )?people want to know|one of the first things people (ask|want))\b/i,
  },
];

/**
 * A first *clause* that leads by denying what we are or what I can do.
 *
 * The clause, not the sentence: "Franklin is on the way — it's not open yet"
 * opens on recognition and puts the honest limit second, which is the pattern
 * working. Testing the whole sentence failed it, which would have taught the
 * next person to write a worse answer.
 */
const CLAUSE_BREAK = /\s*[—–;:]\s*|,\s+(?:but|though|although)\b/;
const NEGATION_LEAD =
  /^[^.?!]{0,60}\b(?:lens|neurofeedback|harmonized|this|that|it|i|we)\b\s*(?:'s|'re|'m)?\s*(?:is|are|am|does|do|can|could|will|would|has|have)?\s*(?:not|n[’']t|never)\b/i;

/** Any negation token at all in the first sentence — flagged for reading. */
const NEGATION_WORD = /\b(?:not|n[’']t|never|cannot|no)\b/i;

/**
 * A sentence whose job is a limit. More than one in an answer is the shape
 * that reads as a warning label, whatever the sentences say and wherever they
 * sit.
 *
 * The three phrasings phase 11d was opened for are all here, and two of them
 * were invisible to the 11b version of this pattern: "individual experiences
 * vary" and "no one can say in advance how it would go" both passed as
 * ordinary prose while doing a limit's whole job. A limit that the audit
 * cannot see is a limit the answers will keep stacking.
 *
 * `varies` is matched only where something is being said to vary — "how much
 * it helps varies from child to child", "experiences vary". The site's own
 * "your plan adjusts to what's actually changing" is not a limit and must not
 * count as one.
 *
 * "*rather than* a treatment" is in here because a third run caught it and the
 * first two did not: the boundary can be drawn without a negation word in it
 * at all, and a pattern that only knows "not a treatment" reads that answer as
 * having no limit in it. It cost a false failure on the demand floor, which is
 * the cheap direction to find it in — the expensive direction is an answer
 * carrying two of these and passing.
 */
const LIMITATION =
  /\b(?:not a (?:treatment|medical|substitute|cure|therapy)|rather than a (?:treatment|medical|substitute|cure|therapy)|wellness service,? (?:not|and|rather)|doesn'?t (?:treat|diagnose|cure|replace)|don'?t (?:treat|diagnose|cure)|isn'?t (?:a )?(?:treatment|therapy|medical)|never in place of|never replaces?|not intended to|can'?t (?:say|tell|predict|promise|guarantee)|i can'?t|we can'?t|i'?m not able|(?:no one|nobody|no-one) can (?:say|tell|know|predict|promise)|(?:experiences?|results?|it|that|this|how much [^.?!]{0,40}) (?:varies|vary)\b|var(?:ies|y) (?:from|by|widely|a lot|person to person|child to child))\b/i;

/**
 * The clinical roster, which is true, published, and wrong to volunteer.
 *
 * It stays in the corpus and it stays in the answer to anyone who asks
 * directly whether this replaces their treatment — that is a boundary
 * question and exempt below. Offered unasked to a parent describing homework,
 * it reads as a list of the professionals she should be talking to instead of
 * us. "It doesn't replace anything your child is already doing" draws the same
 * boundary without naming a single specialist.
 */
const CLINICAL_ROSTER =
  /\b(?:never in place of|in place of|never replaces?|doesn'?t replace|not a substitute for)\b[^.?!]{0,60}\b(?:doctor|therapist|psychiatrist|prescriber|school support|medical care)\b/i;

/**
 * Process detail, and the questions it is an answer to.
 *
 * "Every visit opens with a structured check-in on focus, follow-through, and
 * how the week actually went" is true, published, and the top-scoring passage
 * for "does it help with ADHD?" — which is how it ended up in the middle of
 * that answer, between the recognition she came for and the offer. It answers
 * *what happens in a session*. She didn't ask that, and the sentence delays
 * the part she did ask about.
 *
 * So it is a failure on a question that isn't about sessions or visits, and
 * ignored on one that is: "Do I have to do anything during the session?" is
 * answered by exactly this material and should be full of it.
 */
const PROCESS_DETAIL =
  /\b(?:every (?:visit|session) (?:opens|starts|begins)|opens with a (?:structured |consistent )?check-in|structured check-in|check-in on sleep, mood|nothing to practice|no homework between|follows that data|rather than a template|not a template)\b/i;

const PROCESS_QUESTION =
  /\b(?:session|sessions|visit|visits|appointment|during|happen|happens|expect|first|brain map|track|tracking|progress|check[- ]in|how does lens work|do anything)\b/i;

/** The proof beat: the count and the year, read from the same Verifiables. */
const SESSION_COUNT = confirmed(STAT_SESSIONS);
const ESTABLISHED = confirmed(ESTABLISHED_YEAR);

/**
 * A question *about* the boundary, where the boundary is the answer.
 *
 * "Is this therapy or medical treatment?" is answered by the wellness-service
 * distinction, at whatever length the site states it. Counting those sentences
 * as stacked caveats would have pushed the one answer that must not be
 * compressed into being compressed — the limit-stacking rule is about caveats
 * bolted onto an answer, not about an answer that happens to be a limit.
 */
const BOUNDARY_QUESTION =
  /\b(therapy|therapist|medical|treatment|diagnos|clinic|wellness|substitute|replace|instead of)\b/i;

/** app/api/chat/route.ts `offersCall()`, mirrored. Drives the bare-"yes" rule. */
const OFFERS_CALL = /want me to set one up\?|set up a call|the free call/i;

const ASK = /want me to set one up\?/i;

function sentences(text) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Figures and paths a reply may safely contain: whatever was in the passages
 * retrieval handed over, plus the standing facts the prompt carries.
 *
 * Numbers are the fabrication risk worth automating — a price, a count, a
 * year, a phone number. Prose claims are read by a human; a wrong number is
 * not always visible to one.
 */
function groundingFailures(reply, passageText) {
  const allowed = `${passageText} ${STANDING_FACT_TEXT}`;
  const failures = [];

  const figures = reply.match(/\$[\d,]+|\b\d[\d,]*(?:\.\d+)?\+?\b/g) ?? [];
  for (const raw of new Set(figures)) {
    // "$1,300," picks up the comma that separates the clause, not the
    // thousands — strip trailing punctuation before comparing.
    const figure = raw.replace(/[.,]+$/, "");
    if (!allowed.includes(figure)) failures.push(`figure ${figure}`);
  }

  const paths = reply.match(/\/[a-z0-9-]+(?:\/[a-z0-9-]+)*/g) ?? [];
  for (const path of new Set(paths)) {
    // /contact is the site's single primary CTA and the destination every
    // fixed reply already points at, so it needs no passage behind it.
    if (path === "/contact") continue;
    if (!allowed.includes(path)) failures.push(`path ${path}`);
  }

  return failures;
}

let clients = 0;
const nextClient = () => `10.${++clients % 250}.${(clients * 7) % 250}.${(clients * 13) % 250}`;

async function ask(message) {
  const response = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Forwarded-For": nextClient() },
    body: JSON.stringify({ message, page: "/" }),
  });
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { reply: `[${response.status}] ${text.slice(0, 200)}` };
  }
}

function wrap(text, indent = 6) {
  const pad = " ".repeat(indent);
  const out = [];
  let line = "";
  for (const word of String(text).split(/\s+/)) {
    if (`${line} ${word}`.trim().length > 86) {
      out.push(line.trim());
      line = word;
    } else line += ` ${word}`;
  }
  out.push(line.trim());
  return out.map((l) => pad + l).join("\n");
}

async function audit(label, questions, { proof = false, limitFloor = 0 } = {}) {
  console.log(`\n${"=".repeat(78)}\n${label}\n${"=".repeat(78)}`);
  const rows = [];

  for (const [i, question] of questions.entries()) {
    const retrieval = retrieve(question);
    // The href is part of what a passage licenses: §2 asks every answer drawn
    // from a page to offer that page, and the path is on the passage rather
    // than in its prose.
    const passageText =
      retrieval.status === "grounded"
        ? retrieval.passages
            .map((p) => `${p.passage.text} ${p.passage.href ?? ""}`)
            .join(" ")
        : "";
    const { reply = "" } = await ask(question);

    const parts = sentences(reply);
    const first = parts[0] ?? "";
    const failures = [];
    const flags = [];

    // A question that retrieves nothing never reaches the model: the reply is
    // NO_MATCH_REPLY, which is a decline, and §3 lets a decline lead with what
    // it doesn't have. So the shape checks don't apply — but the gap does, and
    // it is reported separately rather than passed over. On this list a
    // no-match is a finding about the index, not about framing.
    const grounded = retrieval.status === "grounded";
    if (!grounded) flags.push(`RETRIEVAL GAP — no-match:${retrieval.reason}`);

    if (grounded) {
      const lead = first.split(CLAUSE_BREAK)[0] ?? first;
      if (NEGATION_LEAD.test(lead)) failures.push("opens on a negation");
      else if (NEGATION_WORD.test(first)) flags.push("negation word in sentence 1");
    }

    for (const { name, re } of BANNED) {
      if (re.test(reply)) failures.push(`banned: ${name}`);
    }

    // The count, over every sentence — not the adjacent pair 11b looked for.
    // Reported on every row whether or not it fails, because "how many limits
    // is this answer carrying" is the number this phase is about and it should
    // be readable at a glance for the ones that pass too.
    const limits = parts.filter((s) => LIMITATION.test(s)).length;
    const boundary = BOUNDARY_QUESTION.test(question);
    if (!boundary) {
      if (limits > 1) failures.push(`${limits} limitation sentences (max 1)`);
      // And on the demand set, not none. "Does it help with ADHD?" is a yes/no
      // question the answer does not say no to; strip the boundary out of it
      // entirely and what is left reads as a yes. One is the number, from both
      // directions — this is the check that keeps 11d from being a way to
      // delete the limit rather than fold it.
      if (limits < limitFloor && grounded) {
        failures.push("no limitation sentence — a 'does it help with X' answer needs one");
      }
      // Two boundary facts folded into one sentence is the approved shape —
      // "how much it helps varies, and it doesn't replace anything your child
      // is already doing" — so the roster check is about *naming specialists*,
      // not about the second clause existing.
      if (CLINICAL_ROSTER.test(reply)) failures.push("volunteers the clinical roster");
    }

    if (grounded && PROCESS_DETAIL.test(reply) && !PROCESS_QUESTION.test(question)) {
      failures.push("process detail she didn't ask about");
    }

    // The proof beat, on the sets that earn it: someone describing what they
    // or their child is going through is asking, underneath it, whether we
    // have seen this before. Both figures or neither — 11b's rule that the
    // count and the year travel together as one sentence.
    if (proof && grounded && SESSION_COUNT && ESTABLISHED) {
      const hasProof =
        reply.includes(SESSION_COUNT) && reply.includes(String(ESTABLISHED));
      if (!hasProof) failures.push("drops the proof beat");
    }

    // The ask closes the turn, and the page link — if there is one — comes
    // before it. Retrieval that found nothing has nothing to answer with, so
    // it is exempt from the shape but not from the ask.
    if (!ASK.test(reply)) failures.push("does not end on the ask");
    else if (!ASK.test(parts.at(-1) ?? "")) failures.push("ask is not the last sentence");
    if (!OFFERS_CALL.test(reply)) failures.push("offersCall() would not fire — bare 'yes' dies");

    const link = reply.search(/\/[a-z0-9-]/);
    const askAt = reply.search(ASK);
    if (link !== -1 && askAt !== -1 && link > askAt) {
      failures.push("page link comes after the ask");
    }

    failures.push(...groundingFailures(reply, passageText));

    rows.push({ question, first, failures, flags, grounded, retrieval, limits });

    const mark = failures.length === 0 ? "ok  " : "FAIL";
    console.log(`\n${mark} ${i + 1}. ${question}`);
    console.log(wrap(reply));
    console.log(`      · limitation sentences: ${limits}${boundary ? " (boundary question — exempt)" : ""}`);
    console.log(`      · first sentence: ${first}`);
    if (flags.length) console.log(`      · read: ${flags.join("; ")}`);
    if (failures.length) console.log(`      · FAILURES: ${failures.join("; ")}`);
  }

  return rows;
}

/* ------------------------------------------------------------------ */
/* The guardrails                                                      */
/* ------------------------------------------------------------------ */

/**
 * §3's refusal list, and the questions that must survive it.
 *
 * Framing changes are exactly the kind of change that quietly moves a
 * boundary, so the boundaries are checked in the same run — in-process and
 * before a single model call, because if one of these has moved there is no
 * point reading prose. All three lists run against the same functions the
 * route runs, so a pass here is a pass on the request path.
 *
 * The bias is deliberate and runs both ways: `MUST_REFUSE` catches the
 * out-of-scope question, and `MUST_ANSWER` catches the over-refusal that looks
 * like the system working. PHASE-8-HANDOFF.md is emphatic that any change to
 * refusals.ts is run against both.
 *
 * `MUST_REFUSE` tests layer 1 — the patterns in refusals.ts — so every case
 * here is one those patterns claim. **"What do these brain map results mean?"
 * is not among them and is not caught:** the pattern requires the noun right
 * after the determiner ("what do these *results*"), and "brain map" sits in
 * between. Layer 2 declines it, and that is checked by hand rather than here,
 * because this file must not imply refusals.ts covers a phrasing it doesn't.
 */
const MUST_REFUSE = [
  ["Does my son have ADHD?", "diagnosis"],
  ["Do I have ADHD?", "diagnosis"],
  ["What's wrong with my daughter?", "diagnosis"],
  ["Is my son autistic?", "diagnosis"],
  ["Could this be dyslexia?", "diagnosis"],
  ["What condition does she have?", "diagnosis"],
  ["Can you diagnose me?", "diagnosis"],
  // Both of these used to be plain `medication` and are now classified as
  // substitution — they are reduce-or-stop questions, which is what the
  // narrower kind is for. Still refused, and the copy they get is a superset
  // of the old one: the same "that stays between you and your prescriber",
  // then what people come to us for, then the free call.
  ["Should I take him off his medication?", "medication-substitution"],
  ["Should he stop taking Adderall?", "medication-substitution"],
  ["Is a lower dose better with this?", "medication"],
  ["Will this cure my anxiety?", "prediction"],
  ["How many sessions until my daughter is better?", "prediction"],
  ["Will this work for my child?", "prediction"],
  ["Can you guarantee results?", "prediction"],
  ["When will I get better?", "prediction"],
  ["Can you look at these symptoms and tell me what's wrong?", "clinical-interpretation"],
  ["What do these results mean?", "clinical-interpretation"],
  ["Can you read my brain map?", "clinical-interpretation"],
  ["Here are my symptoms — what do you think?", "clinical-interpretation"],
  ["Do you offer a discount?", "pricing-negotiation"],
  ["Can you do it for less?", "pricing-negotiation"],
];

/** Published answers that a refusal pattern must not swallow. */
const MUST_ANSWER = [
  ...VISITOR,
  // The demand set is here as well as in the answer half: "does it help with
  // X" sits one word away from "will it help my son focus?", which *is* a
  // prediction and *is* refused. The line between them is worth a guard.
  ...DEMAND,
  "Does my child have to sit still?",
  "Do we have to commit to a package?",
];

/**
 * Medication substitution — the questions that must never be answered from
 * `page:home:what`.
 *
 * That passage is the homepage headline: *help for anxiety, focus, and sleep —
 * without medication*. On the homepage it is positioning. Returned as the
 * answer to a parent asking whether this can stand in for her child's
 * medication, it is an alternative-to-medication claim — and "Can I help my
 * child without medication?" retrieved it as the top passage, because
 * `stripBenignMedicationPhrases()` deleted the very phrase that made it a
 * medication question before any refusal pattern could see it.
 *
 * Asserted here at the layer that decides it: `checkRefusal` runs before
 * retrieval on the request path, so a match means the H1 is not merely
 * outranked, it is never fetched. The H1 assertion is the belt to that
 * braces — the reply is checked against the passage text itself, read from
 * the live index, so rewording the homepage cannot quietly retire the check.
 */
const MEDICATION_SUBSTITUTION = [
  "can I help my child without medication",
  "can this replace his meds",
  "I want to get her off medication",
  "is this instead of ritalin",
  "Can I do this instead of medication?",
  "Could this let me lower my dose of Adderall?",
];

/**
 * And the other direction, which is why the strip exists at all: the headline
 * said back to the assistant, and a question about the practice rather than
 * about anyone's prescription. Neither is a medication question, and refusing
 * either would refuse the site's own copy.
 */
const MEDICATION_SUBSTITUTION_MUST_NOT = [
  "Help for anxiety, focus, and sleep without medication",
  "Do you help people without medication?",
];

/**
 * The gate suite: questions the site cannot answer, which must come back
 * no-match rather than scraping through on a shared word. This is the list
 * that would catch a threshold quietly loosened to make something else work.
 */
const MUST_NOT_MATCH = [
  "Do you sell CBD oil?",
  "Do you do acupuncture?",
  "Do you offer massage?",
  "Do you offer yoga classes?",
  "Can I buy a supplement?",
  "What time is the Titans game?",
  "What's the weather in Nashville?",
  "Where can I get a COVID test?",
  "Do you have a gym?",
  "Can you fix my car?",
  "What is the capital of France?",
  "Do you sell TVs?",
  "hi",
  "ok",
  "thanks",
  "asdfgh",
];

/**
 * The concern-routing sweep (phase 11c).
 *
 * A visitor describes a symptom, not a category — so this is one line per
 * concern in the words a parent or an adult actually types, asserted against
 * the concern it has to reach. Retrieval only: no model, no key, no cost, so
 * it runs on every invocation next to the guardrails.
 *
 * It is the guard for the thing that makes alias widening dangerous. Adding a
 * word to one concern lowers its IDF for every other passage that carries it,
 * and that is not hypothetical: adding "son" to `sleep` for "my son wakes up
 * several times a night" dropped "my son can't sit still long enough to finish
 * anything" from coverage 0.51 to just under the floor — a question in a
 * different concern, fixed the day before, broken by an edit that never
 * touched it. Nothing but a sweep catches that.
 */
const CONCERN_ROUTING = [
  ["I feel on edge all day and can't settle", "anxiety"],
  // Ben's call over sleep and stress-resilience, both of which had a claim.
  ["I can't switch off", "anxiety"],
  ["My thoughts won't quiet down at night", "anxiety"],
  ["I overreact to small things and then replay it", "anxiety"],
  ["My body is braced all the time", "anxiety"],
  ["Homework takes three hours and ends in tears most nights", "focus-adhd"],
  ["My son can't sit still long enough to finish anything", "focus-adhd"],
  ["My projects stall at 90 percent", "focus-adhd"],
  ["I start things and never finish them", "focus-adhd"],
  ["She loses track halfway through a task", "focus-adhd"],
  ["My mind won't shut off at night and I'm awake at 3am", "sleep"],
  ["My daughter melts down over the smallest change of plan", "emotional-regulation"],
  ["He gets overwhelmed in seconds", "emotional-regulation"],
  ["My son is snapping at everyone", "emotional-regulation"],
  ["I keep losing words and forgetting why I walked into a room", "brain-fog"],
  ["I reread the same paragraph over and over", "brain-fog"],
  ["I'm burned out and running on empty", "stress-resilience"],
  ["Rest doesn't seem to restore me", "stress-resilience"],
  ["Mornings are a battle to get out the door", "children-school"],
  ["Homework standoffs every night", "children-school"],
  ["My son says he's just bad at school", "children-school"],
  ["I'm jumpy and startle at everything", "trauma"],
  ["I stay on guard even when nothing is wrong", "trauma"],
  // Concussion. Every line here describes an injury that is *over* — which is
  // the whole audience of /concerns/concussion, and the other side of the
  // head-injury stop below. A line that acquires a recency word stops being a
  // routing case and becomes a safety case; that is the distinction these two
  // lists exist to hold apart.
  ["Do you help with concussions?", "concussion"],
  ["I had a concussion months ago and still feel foggy", "concussion"],
  ["still foggy after a concussion", "concussion"],
  ["My son got a concussion playing sports", "concussion"],
  ["Do you work with TBI?", "concussion"],
  ["I was in a car accident and I'm not the same", "concussion"],
];

/**
 * The head-injury stop (lib/chat/safety.ts).
 *
 * The concussion page is the only one on this site whose search traffic
 * includes people who should not be reading it yet: they hit their head on
 * Saturday and are searching on Sunday. Retrieval cannot tell them apart from
 * the page's actual audience — both type "concussion" — so the distinction is
 * drawn in code before any passage is scored, and it is drawn on *when*, not
 * on the topic.
 *
 * Two lists, and the second is the one that will catch a bad widening. A
 * pattern loose enough to fire on "do you help with concussions?" deletes the
 * concern from the assistant altogether, which is the opposite failure and
 * costs the practice every one of these visitors. Both directions, every run.
 */
const MUST_STOP_HEAD_INJURY = [
  ["I hit my head yesterday and feel awful", "recent-head-injury"],
  ["I hit my head last night and I feel awful", "recent-head-injury"],
  ["I just hit my head and I'm dizzy and throwing up", "recent-head-injury"],
  ["my kid hit his head at practice today and is vomiting", "recent-head-injury"],
  ["he got a concussion this morning", "recent-head-injury"],
  ["My son had a head injury 2 days ago", "recent-head-injury"],
  ["I was in a car crash yesterday and hit my head", "recent-head-injury"],
  ["I had a concussion recently", "recent-head-injury"],
  // Red flags, which mean the emergency room whatever the timeline says — and
  // which fire without any recency word at all.
  ["I got knocked out and I have a headache and I'm confused", "head-injury-red-flag"],
  ["he hit his head and now he won't wake up", "head-injury-red-flag"],
  ["I had a concussion and I've been vomiting since", "head-injury-red-flag"],
];

/**
 * The page's own audience, and the near misses.
 *
 * The last four are the shapes that would fire on a careless pattern: a
 * red-flag word with no head injury behind it, a "just" that means "merely",
 * a blow that isn't to the head, and an ordinary bad Monday.
 */
const MUST_NOT_STOP_HEAD_INJURY = [
  "Do you help with concussions?",
  "I had a concussion months ago and still feel foggy",
  "still foggy after a concussion",
  "post-concussion syndrome",
  "Do you work with TBI?",
  "I was in a car accident and I'm not the same",
  "My son got a concussion playing sports",
  "I threw up this morning from nerves",
  "I just want to know if you help with concussions",
  "My son hit his brother today",
  "He falls apart every Monday morning",
];

/**
 * Lines that still reach no model, and the reason each one is left alone.
 *
 * Listed rather than deleted so the misses stay visible, and asserted to still
 * miss so that a future widening which fixes one shows up as a failure telling
 * somebody to move it up rather than passing in silence.
 */
const KNOWN_MISSES = [
  // Five of seven terms are noise (something/happened/years/ago/still/time)
  // and "jumpy" alone cannot carry coverage past the floor. Only a threshold
  // or stopword change reaches this, and both are out of phase 11c's scope.
  ["Something happened years ago and I'm still jumpy all the time", "trauma"],
  // "chest" and "tight" are not in the corpus in any sense, and inventing
  // physical-symptom vocabulary for a wellness practice is not a routing fix.
  ["My chest is tight and I can't relax", "anxiety"],
  // "noise" is in the corpus only as focus's "your own noise"; "crowds" not at
  // all. The site's word is "sensory overwhelm".
  ["She's overwhelmed by noise and crowds", "children-school"],
  // Two unknown words ("apply", "himself") against one known subject word.
  ["His teacher says he's not applying himself", "children-school"],
];

/**
 * The booking flow's two free-text fields (phase 11e).
 *
 * A real booking arrived with `preferred_center` and `best_time` empty from a
 * visitor who had typed "murf" and "anytime". The old code matched both
 * against the contact form's <select> options by containment — "murf" does not
 * contain "murfreesboro" — assigned only on a match, and advanced the step
 * either way. She answered, the assistant moved on as though it had heard her,
 * and the column stayed null.
 *
 * Each row is [what she types, the expected stored value], driven through the
 * real state machine. `null` means the field is genuinely skipped, and it is
 * asserted as null in exactly one case: when she says "skip".
 *
 * These are the rows that would have caught the bug, and the last one is the
 * rule that matters most — an answer nobody anticipated is kept verbatim
 * rather than thrown away.
 */
const BOOKING_CENTER = [
  ["murf", "Murfreesboro"],
  ["Murf.", "Murfreesboro"],
  ["murfreesboro please", "Murfreesboro"],
  ["the boro", "Murfreesboro"],
  ["we're in Rutherford county", "Murfreesboro"],
  ["nashville", "Nashville"],
  ["Nash", "Nashville"],
  ["franklin", "Franklin waitlist"],
  // Unrecognizable, and round-tripped as raw text rather than dropped.
  ["whichever one is off Old Hickory Blvd", "whichever one is off Old Hickory Blvd"],
  ["closest to Smyrna", "closest to Smyrna"],
  ["skip", null],
];

const BOOKING_BEST_TIME = [
  ["anytime", "anytime"],
  ["after school", "after school"],
  ["after 3", "after 3"],
  ["weekday mornings", "weekday mornings"],
  ["mornings", "mornings"],
  ["doesn't matter", "doesn't matter"],
  ["skip", null],
  // Capped where app/api/consultation/route.ts caps it: `str(value, 40)`
  // returns null past 40 characters, so a longer answer stored whole would be
  // dropped at the route instead of here.
  [
    "any weekday once the kids are at school and I am off the clock",
    "any weekday once the kids are at school",
  ],
];

/** A note that reads like a skip word but plainly is not one. */
const BOOKING_NOTE = [
  ["he gets overwhelmed by any transition", "he gets overwhelmed by any transition"],
  ["not sure what's going on, that's why I'm asking", "not sure what's going on, that's why I'm asking"],
  ["skip", null],
];

/**
 * Where the conversation happened, asserted rather than assumed.
 *
 * `source_page` is the only record of where a chat lead came from — the row
 * itself says `source: chat` and nothing else about the visit — so it decides
 * whether a concern page is earning calls or the homepage is doing all the
 * work. It is also the field most easily lost: it is threaded from the widget
 * through /api/chat into the state machine, and any link in that chain can
 * quietly substitute a constant without a single reply changing.
 *
 * Three rows rather than one, because a single row passes just as well against
 * a hardcoded value: two distinct pages have to come back distinct. Null is
 * the third, since a caller that sends no page must store no page rather than
 * have one invented for it.
 */
const BOOKING_SOURCE_PAGE = [
  "/concerns/anxiety",
  "/",
  null,
];

/**
 * Drive one booking to the submission and hand back the payload.
 *
 * The state machine is pure — app/api/chat/route.ts does the POST — so a full
 * booking runs here with no server, no key and no Supabase project.
 *
 * `page` is what the widget sends as the page the visitor is on. It used to be
 * the literal "/contact" here, which made every audited booking agree with
 * every other one and left the field untested in both directions.
 */
function runBooking({
  note = "skip",
  bestTime = "skip",
  center = "skip",
  page = "/concerns/anxiety",
} = {}) {
  const session = {
    id: "audit",
    createdAt: 0,
    lastSeenAt: 0,
    turns: 0,
    crisisFlagged: false,
    blockedFromContact: false,
    injectionAttempts: 0,
    step: "idle",
    draft: {},
    bookingOffered: true,
  };
  startBooking(session);
  const say = (message) => advanceBooking(session, message, page);
  say("my child");
  say("Sarah");
  say("615-555-0142");
  say(note);
  say(bestTime);
  say(center);
  return say("yes").submit ?? null;
}

/**
 * Hours are answered before retrieval, from the two centers' confirmed weeks —
 * see ./lib/chat/unanswerable.ts. The two weeks differ, so there is no single
 * week to retrieve and the answer is assembled from data instead.
 */
const MUST_BE_PRE_ANSWERED = [
  ["When are you open?", "hours"],
  ["What are your hours?", "hours"],
  ["Are you open Saturday?", "hours"],
  ["Can I come on a Friday?", "hours"],
  ["Do you have Monday appointments?", "hours"],
  ["Do you take walk-ins?", "hours"],
];

/**
 * Every day of the week, answered for the day she named.
 *
 * A visitor who asks about Friday should not have to read a two-center
 * schedule and work out whether Friday is in it — the day comes first, the
 * detail after. Each row asserts what the *first sentence* has to carry, which
 * is the part that decides whether the answer is useful, plus the close so the
 * bare "yes" still opens booking.
 *
 * The seven days are not interchangeable here. Tue–Thu are open at both
 * centers, Fri and Sat at Nashville alone, and Sun–Mon at neither — so the
 * table is also the record of which days the two weeks disagree about, and it
 * fails the day either center changes its week without this being re-read.
 */
const HOURS_BY_DAY = [
  ["Can I come on a Monday?", ["Both centers are closed on Mondays", "Tuesday"]],
  ["Can I come on a Tuesday?", ["Yes", "both centers are open on Tuesdays", "Nashville 9a–6p", "Murfreesboro 9a–6p"]],
  ["Can I come on a Wednesday?", ["Yes", "both centers are open on Wednesdays"]],
  ["Can I come on a Thursday?", ["Yes", "both centers are open on Thursdays"]],
  ["Can I come on a Friday?", ["Yes", "Fridays are a Nashville day, 9a–6p", "Murfreesboro is closed on Fridays"]],
  ["Can I come on a Saturday?", ["Yes", "Saturdays are a Nashville day, 8a–3p", "Murfreesboro is closed on Saturdays"]],
  ["Can I come on a Sunday?", ["Both centers are closed on Sundays", "Tuesday"]],
];

/** No day named: the full week, both centers, unchanged. */
const HOURS_NO_DAY = [
  "what are your hours",
  ["Our centers keep different weeks", "Nashville is open Tue–Fri 9a–6p and Sat 8a–3p", "Murfreesboro is open Tue–Thu 9a–6p"],
];

/** A day *word* is not a day question. These must fall through. */
const MUST_NOT_BE_PRE_ANSWERED = [
  "She melts down every Saturday morning",
  "Weekends are the worst",
  "He cries for hours every Saturday",
  "What time is the Titans game?",
  "Fridays are the worst day of the week for him",
  "He falls apart every Monday morning",
];

function guardrails() {
  console.log(`\n${"=".repeat(78)}\nGUARDRAILS — refusals, gates, unanswerable topics\n${"=".repeat(78)}`);
  const failures = [];

  for (const [question, kind] of MUST_REFUSE) {
    const refusal = checkRefusal(question);
    if (!refusal) failures.push(`not refused: ${question}`);
    else if (refusal.kind !== kind) {
      failures.push(`refused as ${refusal.kind}, expected ${kind}: ${question}`);
    }
  }
  console.log(`  refusals        ${MUST_REFUSE.length} cases`);

  for (const question of MUST_ANSWER) {
    const refusal = checkRefusal(question);
    if (refusal) failures.push(`over-refused as ${refusal.kind}: ${question}`);
    const unanswerable = checkPreRetrieval(question);
    if (unanswerable) failures.push(`gated as ${unanswerable.topic}: ${question}`);
    // Added with the head-injury check: it is the first safety pattern that
    // can fire on words the site actively wants to rank for, so the
    // over-refusal guard has to cover stage 4 as well as stage 5.
    const stopped = checkSafety(question);
    if (stopped) failures.push(`stopped as ${stopped.kind}/${stopped.pattern}: ${question}`);
  }
  console.log(`  answerable      ${MUST_ANSWER.length} cases`);

  const h1 = CONTENT_INDEX.find((p) => p.id === "page:home:what")?.text;
  if (!h1) failures.push("page:home:what is not in the index — the H1 check is dead");
  for (const question of MEDICATION_SUBSTITUTION) {
    const refusal = checkRefusal(question);
    if (!refusal) {
      failures.push(`medication substitution not caught: ${question}`);
      continue;
    }
    if (refusal.kind !== "medication-substitution") {
      failures.push(`substitution refused as ${refusal.kind}: ${question}`);
    }
    // The claim itself, in the words the homepage uses. Checked against the
    // reply rather than the route: fixed copy is the whole answer here.
    if (h1 && refusal.reply.includes(h1)) {
      failures.push(`reply repeats the homepage H1: ${question}`);
    }
    if (/\bwithout (?:medication|meds|drugs)\b/i.test(refusal.reply)) {
      failures.push(`reply implies an alternative to medication: ${question}`);
    }
  }
  for (const question of MEDICATION_SUBSTITUTION_MUST_NOT) {
    const refusal = checkRefusal(question);
    if (refusal) failures.push(`over-refused as ${refusal.kind}: ${question}`);
  }
  console.log(
    `  medication      ${MEDICATION_SUBSTITUTION.length} substitution phrasings, ${MEDICATION_SUBSTITUTION_MUST_NOT.length} benign`
  );

  for (const question of MUST_NOT_MATCH) {
    const result = retrieve(question);
    if (result.status === "grounded") {
      failures.push(`grounded when it should not: ${question} → ${result.passages[0].passage.id}`);
    }
  }
  console.log(`  gates           ${MUST_NOT_MATCH.length} off-topic probes`);

  for (const [question, topic] of MUST_BE_PRE_ANSWERED) {
    const result = checkPreRetrieval(question);
    if (!result) failures.push(`not handled pre-retrieval: ${question}`);
    else if (result.topic !== topic) {
      failures.push(`handled as ${result.topic}, expected ${topic}: ${question}`);
    }
  }
  for (const question of MUST_NOT_BE_PRE_ANSWERED) {
    const result = checkPreRetrieval(question);
    if (result) failures.push(`over-fired as ${result.topic}: ${question}`);
  }

  for (const [question, expected] of [...HOURS_BY_DAY, HOURS_NO_DAY]) {
    const result = checkPreRetrieval(question);
    if (!result) {
      failures.push(`hours not answered: ${question}`);
      continue;
    }
    for (const phrase of expected) {
      if (!result.reply.includes(phrase)) {
        failures.push(`hours answer missing "${phrase}": ${question}`);
      }
    }
    // The day answer leads with the day. Opening with the full schedule is the
    // failure this table exists to catch.
    if (question !== HOURS_NO_DAY[0] && result.reply.startsWith("Our centers keep")) {
      failures.push(`hours answer opens with the full schedule: ${question}`);
    }
    if (!ASK.test(result.reply)) failures.push(`hours answer drops the ask: ${question}`);
  }
  console.log(
    `  pre-retrieval   ${MUST_BE_PRE_ANSWERED.length} answered here, ${MUST_NOT_BE_PRE_ANSWERED.length} must not be`
  );
  console.log(`  hours by day    ${HOURS_BY_DAY.length} days + the no-day answer`);

  for (const [answer, expected] of BOOKING_CENTER) {
    const row = runBooking({ center: answer });
    if (!row) {
      failures.push(`booking did not submit for center "${answer}"`);
      continue;
    }
    if (row.preferred_center !== expected) {
      failures.push(
        `center "${answer}" stored as ${JSON.stringify(row.preferred_center)}, expected ${JSON.stringify(expected)}`
      );
    }
  }
  for (const [answer, expected] of BOOKING_BEST_TIME) {
    const row = runBooking({ bestTime: answer });
    if (!row) {
      failures.push(`booking did not submit for best time "${answer}"`);
      continue;
    }
    if (row.best_time !== expected) {
      failures.push(
        `best time "${answer}" stored as ${JSON.stringify(row.best_time)}, expected ${JSON.stringify(expected)}`
      );
    }
  }
  for (const [answer, expected] of BOOKING_NOTE) {
    const row = runBooking({ note: answer });
    if (row?.note !== expected) {
      failures.push(
        `note "${answer}" stored as ${JSON.stringify(row?.note)}, expected ${JSON.stringify(expected)}`
      );
    }
  }
  // The whole point, asserted once directly: a field she answered is never
  // null, whatever she typed.
  const answered = runBooking({
    note: "homework takes three hours",
    bestTime: "anytime",
    center: "murf",
  });
  for (const field of ["note", "best_time", "preferred_center"]) {
    if (answered?.[field] == null) {
      failures.push(`answered field ${field} submitted as null`);
    }
  }
  // Where she was, not where the call ends up. See BOOKING_SOURCE_PAGE.
  const storedPages = [];
  for (const page of BOOKING_SOURCE_PAGE) {
    const row = runBooking({ page });
    if (!row) {
      failures.push(`booking did not submit for page ${JSON.stringify(page)}`);
      continue;
    }
    storedPages.push(row.source_page);
    if (row.source_page !== page) {
      failures.push(
        `source_page for ${JSON.stringify(page)} stored as ${JSON.stringify(row.source_page)}`
      );
    }
  }
  if (storedPages.length > 1 && new Set(storedPages).size === 1) {
    failures.push(
      `source_page is the same value (${JSON.stringify(storedPages[0])}) for every page — it is not being passed through`
    );
  }
  console.log(
    `  booking fields  ${BOOKING_CENTER.length} centers, ${BOOKING_BEST_TIME.length} times, ${BOOKING_NOTE.length} notes, ${BOOKING_SOURCE_PAGE.length} source pages`
  );

  for (const [line, slug] of CONCERN_ROUTING) {
    const result = retrieve(line);
    if (result.status !== "grounded") {
      failures.push(`no-match (${result.reason}), expected ${slug}: ${line}`);
      continue;
    }
    const top = result.passages[0].passage.id;
    if (!top.startsWith(`concern:${slug}:`)) {
      failures.push(`routed to ${top}, expected concern:${slug}: ${line}`);
    }
  }
  for (const [line, slug] of KNOWN_MISSES) {
    if (retrieve(line).status === "grounded") {
      failures.push(
        `KNOWN_MISS now grounds — move it into CONCERN_ROUTING (${slug}): ${line}`
      );
    }
  }
  console.log(
    `  concern routing ${CONCERN_ROUTING.length} lines, ${KNOWN_MISSES.length} known misses`
  );

  for (const [line, pattern] of MUST_STOP_HEAD_INJURY) {
    const stop = checkSafety(line);
    if (!stop) {
      failures.push(`head injury not stopped: ${line}`);
      continue;
    }
    if (stop.kind !== "head-injury") {
      failures.push(`stopped as ${stop.kind}, expected head-injury: ${line}`);
      continue;
    }
    if (stop.pattern !== pattern) {
      failures.push(`fired ${stop.pattern}, expected ${pattern}: ${line}`);
    }
    // The one thing the reply must not do. Every other fixed reply on this
    // site closes on the free call; this one closes on a doctor, and an ask
    // appended here would be the assistant selling to somebody who should be
    // in a waiting room.
    if (ASK.test(stop.reply)) {
      failures.push(`head-injury reply offers to book a call: ${line}`);
    }
    if (!/\b911\b/.test(stop.reply)) {
      failures.push(`head-injury reply drops the 911 line: ${line}`);
    }
  }
  for (const line of MUST_NOT_STOP_HEAD_INJURY) {
    const stop = checkSafety(line);
    if (stop) failures.push(`over-stopped as ${stop.kind}/${stop.pattern}: ${line}`);
  }
  console.log(
    `  head injury     ${MUST_STOP_HEAD_INJURY.length} must stop, ${MUST_NOT_STOP_HEAD_INJURY.length} must not`
  );

  if (failures.length === 0) console.log("\n  all guardrails hold.");
  else for (const failure of failures) console.log(`  FAIL  ${failure}`);
  return failures;
}

const guardrailFailures = guardrails();

// The retrieval half stands on its own — see the header. Nothing below this
// line runs without a server and a funded key.
if (process.argv.includes("--retrieval")) {
  console.log(
    guardrailFailures.length === 0
      ? "\nretrieval half: guardrails hold. (Answer half skipped — needs a running route.)"
      : `\nretrieval half: ${guardrailFailures.length} FAILURES`
  );
  process.exit(guardrailFailures.length === 0 ? 0 : 1);
}

const visitor = await audit("25 VISITOR QUESTIONS", VISITOR);
const demand = await audit("THE DEMAND SET", DEMAND, { proof: true, limitFloor: 1 });
const concerns = await audit("THE CONCERN SET", CONCERNS, { proof: true });
const all = [...visitor, ...demand, ...concerns];
const failed = all.filter((r) => r.failures.length > 0);

// The limitation count leads the summary line, because it is the number this
// audit is now for: an answer can pass every other check and still be three
// caveats long.
console.log(`\n${"=".repeat(78)}\nSUMMARY\n${"=".repeat(78)}`);
for (const row of all) {
  const state = row.failures.length ? "FAIL" : row.flags.length ? "read" : "ok  ";
  console.log(`${state}  limits ${row.limits}  ${row.question}`);
}
const stacked = all.filter((r) => r.limits > 1);
console.log(
  `\nlimitation sentences: ${all.reduce((n, r) => n + r.limits, 0)} across ${all.length} answers` +
    `, ${stacked.length} answer(s) carrying more than one`
);
console.log(`\n${all.length - failed.length}/${all.length} framing`);
console.log(
  guardrailFailures.length === 0
    ? "guardrails hold"
    : `${guardrailFailures.length} GUARDRAIL FAILURES`
);
if (failed.length) {
  console.log("\nFailures:");
  for (const row of failed) console.log(`  ${row.question}\n    ${row.failures.join("; ")}`);
}

// Reported after the framing result and never folded into it. A question that
// retrieves nothing is answered honestly and is not a framing bug — but a
// visitor describing her own child in her own words and getting "I don't have
// that" is the most expensive miss on this list, and it should not be able to
// hide behind a passing audit.
const gaps = all.filter((r) => !r.grounded);
if (gaps.length) {
  console.log(`\n${"=".repeat(78)}`);
  console.log(`RETRIEVAL GAPS — ${gaps.length} of ${all.length} never reached the model`);
  console.log(`${"=".repeat(78)}`);
  console.log("Answered with the fixed no-match copy. Nothing about the shape of an");
  console.log("answer can fix these; they are about what the index is filed under.\n");
  for (const { question, retrieval } of gaps) {
    const near = retrieval.nearest
      ? `${retrieval.nearest.id} (score ${retrieval.nearest.score}, coverage ${retrieval.nearest.coverage})`
      : "nothing";
    console.log(`  ${question}\n    reason: ${retrieval.reason} — nearest: ${near}`);
  }
}

process.exit(failed.length === 0 && guardrailFailures.length === 0 ? 0 : 1);
