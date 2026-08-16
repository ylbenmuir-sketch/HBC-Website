/**
 * The answer-framing audit (phase 11b).
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
 * bug, and it should never be undetectable because billing lapsed.
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
 * 3. **One limit, not three.** Two limitation sentences in a row is the shape
 *    that reads as a warning label.
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
const { checkUnanswerable } = await import(`${ROOT}/lib/chat/unanswerable.ts`);
const { STANDING_FACT_TEXT } = await import(`${ROOT}/lib/chat/answer.ts`);

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
 * A sentence whose job is a limit. Two in a row is the shape that reads as a
 * warning label, whatever the sentences say.
 */
const LIMITATION =
  /\b(?:not a (?:treatment|medical|substitute|cure|therapy)|wellness service,? (?:not|and)|doesn'?t (?:treat|diagnose|cure|replace)|don'?t (?:treat|diagnose|cure)|isn'?t (?:a )?(?:treatment|therapy|medical)|never in place of|not intended to|can'?t (?:say|tell|predict|promise|guarantee)|i can'?t|we can'?t|i'?m not able)\b/i;

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

async function audit(label, questions) {
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

    if (!BOUNDARY_QUESTION.test(question)) {
      for (let s = 1; s < parts.length; s += 1) {
        if (LIMITATION.test(parts[s]) && LIMITATION.test(parts[s - 1])) {
          failures.push("two limitation sentences in a row");
          break;
        }
      }
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

    rows.push({ question, first, failures, flags, grounded, retrieval });

    const mark = failures.length === 0 ? "ok  " : "FAIL";
    console.log(`\n${mark} ${i + 1}. ${question}`);
    console.log(wrap(reply));
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
  ["Should I take him off his medication?", "medication"],
  ["Should he stop taking Adderall?", "medication"],
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
  "Does my child have to sit still?",
  "Do we have to commit to a package?",
  "Can it help with sleep?",
  "Can I help my child without medication?",
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

/** Hours are absent from the index by decision — ./unanswerable.ts owns them. */
const MUST_BE_UNANSWERABLE = [
  ["When are you open?", "hours"],
  ["What are your hours?", "hours"],
  ["Are you open Saturday?", "hours"],
  ["Do you take walk-ins?", "hours"],
];

/** A weekend *word* is not a weekend question. These must fall through. */
const MUST_NOT_BE_UNANSWERABLE = [
  "She melts down every Saturday morning",
  "Weekends are the worst",
  "He cries for hours every Saturday",
  "What time is the Titans game?",
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
    const unanswerable = checkUnanswerable(question);
    if (unanswerable) failures.push(`gated as ${unanswerable.topic}: ${question}`);
  }
  console.log(`  answerable      ${MUST_ANSWER.length} cases`);

  for (const question of MUST_NOT_MATCH) {
    const result = retrieve(question);
    if (result.status === "grounded") {
      failures.push(`grounded when it should not: ${question} → ${result.passages[0].passage.id}`);
    }
  }
  console.log(`  gates           ${MUST_NOT_MATCH.length} off-topic probes`);

  for (const [question, topic] of MUST_BE_UNANSWERABLE) {
    const result = checkUnanswerable(question);
    if (!result) failures.push(`not gated: ${question}`);
    else if (result.topic !== topic) {
      failures.push(`gated as ${result.topic}, expected ${topic}: ${question}`);
    }
  }
  for (const question of MUST_NOT_BE_UNANSWERABLE) {
    const result = checkUnanswerable(question);
    if (result) failures.push(`over-gated as ${result.topic}: ${question}`);
  }
  console.log(
    `  unanswerable    ${MUST_BE_UNANSWERABLE.length} gated, ${MUST_NOT_BE_UNANSWERABLE.length} must not be`
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
const concerns = await audit("THE CONCERN SET", CONCERNS);
const all = [...visitor, ...concerns];
const failed = all.filter((r) => r.failures.length > 0);

console.log(`\n${"=".repeat(78)}\nSUMMARY\n${"=".repeat(78)}`);
for (const row of all) {
  const state = row.failures.length ? "FAIL" : row.flags.length ? "read" : "ok  ";
  console.log(`${state}  ${row.question}`);
}
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
