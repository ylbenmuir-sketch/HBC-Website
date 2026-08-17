import {
  BRAIN_MAP_NAME,
  BRAIN_MAP_PRICE,
  PACKAGE_NOTE,
  PACKAGE_PRICE,
  PACKAGE_SESSIONS,
  RISK_REVERSAL,
  SESSION_PRICE,
} from "../site-config";

/**
 * Refusals (phase-8-chatbot.md §3).
 *
 * The §1 out-of-scope list is not a tone the assistant is asked to adopt — it
 * is a set of questions that must not reach the answering model at all. This
 * module is the check that keeps them out: it runs on the raw inbound message,
 * before retrieval and before any model call, and a match short-circuits the
 * turn with fixed copy.
 *
 * Two layers cover §3, and it is worth being clear about which does what:
 *
 * 1. **This module** — the categories that can be recognised from the words
 *    themselves: a diagnosis question, a medication question, a prediction, a
 *    request to interpret something clinical, a request for a different price.
 *    Deterministic, so the §7 checklist gives the same answer every run.
 * 2. **The system prompt** (lib/chat/answer.ts) — the long tail, and the
 *    "describe what people come in *for*, never that LENS treats anything"
 *    rule, which is a matter of wording rather than a category of question.
 *
 * Layer 1 is deliberately biased toward over-refusing. Every pattern here was
 * written to catch a §7 case and then loosened only where a loose match would
 * swallow a question the site can plainly answer ("Is it safe?", "How many
 * sessions will I need?", "Is this therapy or medical treatment?"). Where the
 * two pull against each other, §3 decides it: the assistant "does not hedge,
 * and does not partially answer."
 *
 * Every reply here follows the §3 shape — decline and redirect in one short
 * turn, no explanation at length, no partial answer.
 */

export type RefusalKind =
  | "medication"
  | "medication-substitution"
  | "clinical-interpretation"
  | "diagnosis"
  | "prediction"
  | "pricing-negotiation";

export type Refusal = {
  kind: RefusalKind;
  /** Fixed copy. Never model-generated — see §3. */
  reply: string;
  /**
   * The decline without the trailing offer of a call.
   *
   * Used when a refusal lands *during* the booking flow, where "Want me to set
   * one up?" is nonsense — one is already being set up — and where the reply
   * has to end with the booking question the visitor still owes an answer to.
   * §5's "one question at a time" survives either way: the decline is a
   * statement, and exactly one question follows it.
   */
  declineOnly: string;
};

/**
 * The one-turn decline. §3's own wording, used for the categories that have no
 * more specific line of their own.
 */
const CALL_OFFER = "The free call is exactly for this. Want me to set one up?";

/** Each refusal is a decline plus an offer, so the offer can be dropped. */
const REPLIES: Record<RefusalKind, { decline: string; offer: string }> = {
  // The site's existing language, verbatim. §3: never elaborate — the offer
  // redirects, it does not discuss the medication.
  medication: {
    decline: "That stays between you and your prescriber.",
    offer:
      "If you’d like to talk through how LENS fits alongside the care you already have, the free call is the place for it.",
  },
  /*
   * Replace, reduce, substitute — the medication question that arrives as a
   * question about *us*.
   *
   * "Can I help my child without medication?" used to fall through to
   * retrieval, where it topped `page:home:what` and came back with the
   * homepage headline: *help for anxiety, focus, and sleep — without
   * medication*. On the homepage that line is positioning. Returned as the
   * answer to a parent asking whether this can stand in for her child's
   * medication, it is an alternative-to-medication claim, and the assistant is
   * not permitted to make one at any volume.
   *
   * So it is answered here, in fixed copy, and never reaches retrieval or the
   * model — which is the only way to be certain the H1 cannot come back. The
   * three beats are the decline, what people actually come to us for (lifted
   * from the /faq answer to "What kinds of concerns do clients come in with?"),
   * and the free call with the fit promise. None of them says or implies that
   * LENS is an alternative to anything.
   */
  "medication-substitution": {
    decline:
      "Whether medication stays, changes, or comes down isn’t something I can weigh in on — that stays between you and your prescriber.",
    offer:
      "What I can tell you is what people come to us for: anxiety and stress, focus and ADHD, sleep, emotional regulation, brain fog and memory, burnout, school struggles, and trauma-related stress. " +
      `The first call is free. ${RISK_REVERSAL} Want me to set one up?`,
  },
  "clinical-interpretation": {
    decline:
      "I can’t read symptoms or interpret anything clinical — that’s a practitioner’s job rather than mine.",
    offer: CALL_OFFER,
  },
  diagnosis: {
    decline:
      "That’s a question for a practitioner rather than me — it depends on specifics I shouldn’t guess at.",
    offer: CALL_OFFER,
  },
  // §3: refuse the prediction, note that LENS is a wellness service and
  // doesn't treat conditions, offer the call.
  prediction: {
    decline:
      "I can’t predict how it would go for someone — LENS is a wellness service and doesn’t treat conditions, so that isn’t something I’d guess at.",
    offer:
      "A practitioner will tell you honestly on the free call whether it’s a fit. Want me to set one up?",
  },
  // §3: the published prices only. All of them, now that they are published —
  // quoting the first visit alone reads as evasion when the site states the
  // session and package prices two lines further down, and a visitor asking
  // for a discount is precisely the one who will notice.
  "pricing-negotiation": {
    decline: `The published prices are the only ones I have: the phone call is free, your first visit — ${BRAIN_MAP_NAME} — is ${BRAIN_MAP_PRICE}, regular sessions are ${SESSION_PRICE}, and a ${PACKAGE_SESSIONS}-session package is ${PACKAGE_PRICE}.`,
    offer: PACKAGE_NOTE,
  },
};

/** Lowercased, straight apostrophes, single spaces. Patterns assume this. */
export function normalize(message: string): string {
  return message
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** Conditions named on the site or likely to be typed at it. */
const CONDITIONS =
  "adhd|add|autism|autistic|asperger|anxiety|anxious|depression|depressed|ocd|ptsd|bipolar|dyslexia|dyspraxia|odd|spd|concussion|tbi|dementia|alzheimer|insomnia|migraine";

/**
 * Ordered: the first match wins, so the more specific request shape is listed
 * before the more general one. "Can you look at these symptoms and tell me
 * what's wrong?" is a request to interpret, not a request to diagnose, and
 * reads better in the log that way — the reply is a decline either way.
 */
const PATTERNS: Array<{ kind: RefusalKind; pattern: RegExp }> = [
  // --- medication -------------------------------------------------------
  {
    kind: "medication",
    pattern:
      /\b(medication|medications|medicine|meds|prescription|prescribe[sd]?|prescriber|dosage|dose|adderall|ritalin|concerta|vyvanse|strattera|prozac|zoloft|lexapro|ssri|stimulant|antidepressant|wean(ing)? (him|her|them|me|off)|taper(ing)?)\b/,
  },

  // --- clinical interpretation ------------------------------------------
  {
    kind: "clinical-interpretation",
    pattern:
      /\b(look at|read|interpret|analyse|analyze|review|check)\b[^.?!]{0,30}\b(symptom|symptoms|brain map|map|scan|result|results|reading|readings|report|chart|numbers)\b/,
  },
  {
    kind: "clinical-interpretation",
    pattern:
      /\bwhat (do|does|did) (these|those|this|my|his|her|their|the) (symptom|symptoms|result|results|reading|readings|number|numbers|map)\b/,
  },
  {
    kind: "clinical-interpretation",
    pattern: /\bhere('s| is| are)? (my|his|her|their|the) symptoms?\b/,
  },

  // --- diagnosis --------------------------------------------------------
  {
    kind: "diagnosis",
    // "…have to" is a modal, not a question about having a condition. Without
    // the exclusion this refused "do I have to do anything during the
    // session?" — which is FAQ 5, published on the site with a plain answer.
    pattern: /\b(do|does|did)\s+(i|he|she|they|we|my\s+\w+)\s+have\b(?!\s+to\b)/,
  },
  { kind: "diagnosis", pattern: /\bwhat'?s wrong with\b/ },
  {
    kind: "diagnosis",
    pattern: new RegExp(
      `\\b(is|are|am)\\s+(it|this|i|he|she|they|my\\s+\\w+)\\s+(${CONDITIONS})\\b`
    ),
  },
  {
    kind: "diagnosis",
    pattern: new RegExp(
      `\\b(could|might|maybe)\\s+(it|this|he|she|they|my\\s+\\w+)\\s+(be|have)\\b[^.?!]{0,20}\\b(${CONDITIONS})\\b`
    ),
  },
  { kind: "diagnosis", pattern: /\bwhat (condition|disorder|diagnosis)\b/ },
  {
    kind: "diagnosis",
    pattern: /\b(can|could|will|would)\s+you\s+(diagnose|tell me (what|whether|if) (i|he|she|they|my)\b)/,
  },
  { kind: "diagnosis", pattern: /\bdiagnos(e|ing)\s+(me|him|her|them|my)\b/ },

  // --- prediction -------------------------------------------------------
  // "How many sessions will I need?" is a published FAQ, so the trigger is the
  // "until <a better state>" shape, not the question about a number.
  {
    kind: "prediction",
    pattern: /\b(how many|how long|how much longer)\b[^.?!]{0,30}\b(until|before|til|till)\b/,
  },
  {
    kind: "prediction",
    pattern: /\b(will|would|can|could|does|do)\b[^.?!]{0,30}\bcure\b/,
  },
  // Person-directed outcome: "will this help my child's ADHD", "can it work
  // for me". The object is what makes it a prediction about someone.
  {
    kind: "prediction",
    pattern:
      /\b(will|would|can|could)\s+(this|it|lens|neurofeedback|you|that)\b[^.?!]{0,40}\b(work|help|fix|heal|solve|get rid of)\b[^.?!]{0,12}\b(me|my|him|her|them|us|our)\b/,
  },
  // Bare outcome prediction: "will this work?", "will it help?". Deliberately
  // "will/would" only — "can it help with sleep?" is a question about what
  // people come in for, which /what-we-help-with answers plainly, and
  // refusing it would refuse the site's own copy.
  {
    kind: "prediction",
    pattern: /\b(will|would)\s+(this|it|lens|neurofeedback)\s+(work|help|do anything)\b/,
  },
  {
    kind: "prediction",
    pattern: /\b(will|would)\s+(i|he|she|they|my\s+\w+)\b[^.?!]{0,30}\b(get better|be better|improve|be fixed|be cured|be normal|be ok|be okay)\b/,
  },
  { kind: "prediction", pattern: /\bguarantee[ds]?\b/ },
  { kind: "prediction", pattern: /\bwhen will (i|he|she|they|my|we)\b/ },

  // --- pricing ----------------------------------------------------------
  {
    kind: "pricing-negotiation",
    pattern:
      /\b(discount|coupon|promo code|voucher|negotiate|payment plan|sliding scale|financial aid|scholarship|cheaper|cheapest|any deals?|special offer|price match|waive)\b/,
  },
  {
    kind: "pricing-negotiation",
    pattern: /\b(lower|reduce|come down on|knock off)\b[^.?!]{0,15}\b(price|cost|fee)\b/,
  },
  {
    kind: "pricing-negotiation",
    pattern: /\bdo it for (less|cheaper|\$?\d)/,
  },
];

/**
 * "Help without medication" is the homepage headline, not a medication
 * question. Removed before matching so the phrase can be said back to the
 * assistant without tripping the medication rule.
 *
 * The strip is why the substitution patterns below run *first*, on the
 * unstripped text: it is exactly the phrasing a parent uses when she is asking
 * about her own child, and stripping it sent "can I help my child without
 * medication?" past every refusal and into the homepage H1.
 */
function stripBenignMedicationPhrases(text: string): string {
  return text.replace(
    /\b(without|no|non|free of|instead of|rather than)[ -](medication|medications|meds|medicine|drugs)\b/g,
    " "
  );
}

/** The named drugs and the words for them. Not "dose"/"dosage": a question
 * about a dose is a medication question and is answered by that rule. */
const MEDICATIONS =
  "medication|medications|medicine|meds|drugs|prescription|pills?|adderall|ritalin|concerta|vyvanse|strattera|prozac|zoloft|lexapro|ssri|stimulant|antidepressant";

/**
 * Someone in particular — her, her child, herself.
 *
 * Deliberately not "you" or "your": "do you help people without medication?"
 * is a question about the practice, and the homepage answers it. The line
 * between that and "can I help *my child* without medication?" is whose
 * medication is being discussed, and a pronoun is what marks it.
 */
const A_PARTICULAR_PERSON = /\b(i|me|my|we|our|he|him|his|she|her|hers|they|them|their)\b/;

/**
 * Asking whether LENS can stand in for medication — for her, or for her child.
 *
 * Two shapes. The first names the swap outright ("instead of ritalin",
 * "replace his meds") and needs nothing else: nobody asks that idly. The
 * second is the softer phrasing — without, off, reduce, come off — which is
 * *also* how the site describes itself, so it counts only when the message is
 * about a particular person. That keeps the homepage headline sayable and
 * catches the parent asking about her own child, which is the whole distance
 * between positioning and a claim.
 */
const SUBSTITUTION: Array<{ pattern: RegExp; needsPerson: boolean }> = [
  {
    pattern: new RegExp(
      `\\b(replace|replaces|replacing|substitute|substituting|instead of|in place of|rather than|alternative to|swap)\\b[^.?!]{0,20}\\b(${MEDICATIONS})\\b`
    ),
    needsPerson: false,
  },
  {
    pattern: new RegExp(
      `\\b(without|off|reduce|reducing|lower|lowering|wean|weaning|cut back on|come off|stop|stopping|avoid|avoiding|skip)\\b[^.?!]{0,20}\\b(${MEDICATIONS})\\b`
    ),
    needsPerson: true,
  },
];

/**
 * The §3 check. Returns fixed copy for an out-of-scope question, or null when
 * the message is not one — in which case the turn continues to retrieval.
 *
 * Runs before retrieval and before any model call. Nothing about this decision
 * is delegated to the model.
 */
export function checkRefusal(message: string): Refusal | null {
  const normalized = normalize(message);

  // Before the strip, and before every other pattern: the substitution
  // phrasings are the ones the strip was built to let through, and the ones
  // that must never reach retrieval.
  for (const { pattern, needsPerson } of SUBSTITUTION) {
    if (!pattern.test(normalized)) continue;
    if (needsPerson && !A_PARTICULAR_PERSON.test(normalized)) continue;
    const { decline, offer } = REPLIES["medication-substitution"];
    return {
      kind: "medication-substitution",
      reply: `${decline} ${offer}`,
      declineOnly: decline,
    };
  }

  const text = stripBenignMedicationPhrases(normalized);

  for (const { kind, pattern } of PATTERNS) {
    if (pattern.test(text)) {
      const { decline, offer } = REPLIES[kind];
      return {
        kind,
        reply: `${decline} ${offer}`,
        declineOnly: decline,
      };
    }
  }
  return null;
}
