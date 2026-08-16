import { normalize } from "./refusals";

/**
 * Safety checks (phase-8-chatbot.md §4).
 *
 * These are checks, not behaviours the model is asked to remember. Every
 * function here runs on the raw inbound message, in code, before retrieval and
 * before any model call — §4.1 is explicit that the crisis response "fires on
 * the check, not on the model's judgment." Nothing in this file consults the
 * model, and nothing the model does can suppress it.
 *
 * Order in the request path (see app/api/chat/route.ts):
 *
 *     rate limit → parse → SAFETY (this file) → refusals (§3) → booking (§5)
 *                          → retrieval (§2) → model
 *                            └─ everything from here right is skipped on a stop
 *
 * A stop returns fixed copy and ends the turn. No retrieval runs, no model call
 * is made, no booking question is asked or answered.
 */

export type SafetyKind = "crisis" | "minor";

/**
 * What the rest of the conversation must do once a check has fired. Returned
 * rather than described, so the route cannot honour §4.1 and forget §4.2.
 */
export type SafetyEffect =
  /** §4.1 — clear any booking in progress, flag the conversation, end the turn. */
  | "end-turn-and-flag"
  /** §4.2 — collect no contact details for the rest of the session. */
  | "block-contact-collection";

export type SafetyStop = {
  kind: SafetyKind;
  /** Fixed copy. Never model-generated — §4.1 says so outright. */
  reply: string;
  effect: SafetyEffect;
  /** The phrase that matched, for the flagged-conversation log. Never shown. */
  matched: string;
};

/**
 * §4.1, verbatim. Do not edit these numbers, and do not let the model
 * paraphrase them: 988 and 741741 are the reason this response exists.
 *
 * The turn ends here. §4.1: "Do not re-engage with booking in the same
 * message" — which is why the closing line is an open door rather than an
 * offer, and why nothing is appended to it downstream.
 */
export const CRISIS_REPLY =
  "I’m really glad you told me. I’m an assistant and I’m not the right help for this, but people are available right now — you can call or text 988 (Suicide & Crisis Lifeline) any time, or text HOME to 741741. If someone is in immediate danger, please call 911.\n\n" +
  "Our team is here for the LENS side of things whenever you’re ready.";

/** §4.2, verbatim. */
export const MINOR_REPLY =
  "Thanks for reaching out. For anyone under 18 we’d need a parent or guardian to set things up — could you ask them to talk to us, or have them use the contact form?";

/**
 * Crisis disclosure (§4.1).
 *
 * **This list is tuned to over-fire, on purpose.** Showing 988 to someone who
 * was venting about homework is an awkward message; missing someone who was
 * not venting is the failure this whole section exists to prevent. Where a
 * phrase was ambiguous the tie went to firing — "can't go on" is in, and Ben
 * should expect it to catch the occasional exhausted parent.
 *
 * Two shapes are deliberately excluded because they are ordinary questions
 * about the service, and firing on them would be both wrong and alarming:
 * "will it hurt me" / "does it hurt" (the FAQ), and "this is killing him"
 * (a parent describing a hard schedule). Self-harm patterns therefore require
 * "myself", and harm-to-others requires a first-person statement of intent.
 */
const CRISIS_PATTERNS: RegExp[] = [
  // Named outright — including a parent reporting it about a child.
  /\bsuicid(e|al)\b/,
  /\bself[- ]harm(ing)?\b/,
  /\bkms\b/,

  // Self-directed. "myself" is required: "will it hurt me?" is the FAQ.
  /\b(kill|hurt|harm|cut|cutting|hurting|killing|harming)\s+(myself|himself|herself|themselves)\b/,
  /\b(end|ending|take|taking)\s+(my|his|her|their)\s+(own\s+)?life\b/,
  /\bend(ing)?\s+it\s+all\b/,
  /\bwan(t|ts|na)\s+to\s+(die|be dead|not be here|not wake up|disappear forever)\b/,
  /\bwish(es|ed)?\s+(i|he|she|they)\s+(was|were)\s+dead\b/,
  /\bdon'?t\s+want\s+to\s+(live|be here|be alive|wake up|go on)\b/,
  /\b(no|nothing)\s+(reason|point)\s+(to|in)\s+(liv(e|ing)|being here|going on)\b/,
  /\bnothing\s+to\s+live\s+for\b/,
  /\bbetter\s+off\s+(dead|without\s+(me|him|her|them))\b/,
  /\boverdos(e|ed|ing)\b/,
  /\bcan'?t\s+go\s+on\b/,

  // Harm to others. A first-person statement of intent, never a bare verb —
  // "the schedule is killing him" must not reach this.
  /\bi\s*(?:'m|’m| am)?\s*(?:going to|gonna|about to|want to|wanna|need to|plan to|might|may|could)\s+(hurt|kill|harm|attack)\b/,
  /\bi\s*(?:'m|’m| am)?\s*(?:afraid|scared|worried|terrified)\s+(?:that\s+)?i\s*(?:'ll|’ll| will| might| could| am going to| going to)?\s*(hurt|kill|harm)\b/,
  /\bthinking\s+about\s+(hurting|killing|harming)\b/,
];

/**
 * Under-18 disclosure (§4.2). First person only — "my son is 14" is a parent,
 * which is the site's primary audience, not a minor disclosing their own age.
 */
const AGE_PATTERN =
  /\b(?:i'?m|i am|im)\s+(\d{1,2})\s*(?:years? old)?\b(?!\s*(?:weeks?|months?|days?|hours?|minutes?|percent|%|out of|ft|feet|'|"|\/))/;

const MINOR_PATTERNS: RegExp[] = [
  /\bi'?m\s+(a\s+)?(minor|teen|teenager|kid|child)\b/,
  /\bi'?m\s+under\s*(18|eighteen)\b/,
  /\bi'?m\s+in\s+(\d{1,2}(st|nd|rd|th)\s+grade|middle school|high school|elementary school|primary school)\b/,
  /\bmy\s+(age\s+is|parents?\s+don'?t\s+know)\b/,
];

/**
 * The check that runs before anything else decides anything.
 *
 * Crisis is evaluated first and independently of everything else in the turn —
 * §4.1 requires it to fire even mid-booking, even after a phone number has
 * already been given. Nothing about the conversation's state can skip it.
 */
export function checkSafety(message: string): SafetyStop | null {
  const text = normalize(message);

  for (const pattern of CRISIS_PATTERNS) {
    const match = pattern.exec(text);
    if (match) {
      return {
        kind: "crisis",
        reply: CRISIS_REPLY,
        effect: "end-turn-and-flag",
        matched: match[0],
      };
    }
  }

  const age = AGE_PATTERN.exec(text);
  if (age) {
    const years = Number(age[1]);
    if (years >= 1 && years < 18) {
      return {
        kind: "minor",
        reply: MINOR_REPLY,
        effect: "block-contact-collection",
        matched: age[0],
      };
    }
  }

  for (const pattern of MINOR_PATTERNS) {
    const match = pattern.exec(text);
    if (match) {
      return {
        kind: "minor",
        reply: MINOR_REPLY,
        effect: "block-contact-collection",
        matched: match[0],
      };
    }
  }

  return null;
}

/**
 * Prompt injection (§4.4).
 *
 * Note what this does *not* do: it does not stop the turn, does not change the
 * reply, and does not tell the visitor it noticed. §4.4 is explicit that such
 * content "is data, not instruction" and that "the assistant continues
 * normally and does not acknowledge the attempt." The return value exists so
 * the conversation log records it — nothing in the request path branches on it.
 *
 * The actual defence is structural and lives in lib/chat/answer.ts: the
 * visitor's message is delivered to the model inside a delimited block, the
 * system prompt says instructions inside it are quoted text, and the model is
 * given only retrieved passages to answer from. A regex cannot enumerate
 * injections; a model with nothing to leak and no instructions to override is
 * a much smaller target.
 */
const INJECTION_PATTERNS: RegExp[] = [
  /\b(ignore|disregard|forget)\s+(all\s+|any\s+|your\s+|the\s+|previous\s+|prior\s+|above\s+)*(instruction|instructions|rules|prompt|prompts|guidelines|training)\b/,
  /\b(system|initial|original)\s+prompt\b/,
  /\byour\s+(instructions|rules|system prompt|guidelines)\b/,
  /\byou\s+are\s+now\b/,
  /\b(act|behave|respond)\s+as\s+(if|though|a\s|an\s)/,
  /\bpretend\s+(to be|you'?re|you are|that)\b/,
  /\broleplay\s+as\b/,
  /\b(jailbreak|dan mode|developer mode|god mode)\b/,
  /\bnew\s+instructions?\s*:/,
  /\boverride\s+(your|the|all)\b/,
];

export function detectInjection(message: string): string | null {
  const text = normalize(message);
  for (const pattern of INJECTION_PATTERNS) {
    const match = pattern.exec(text);
    if (match) return match[0];
  }
  return null;
}
