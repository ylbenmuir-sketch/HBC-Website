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

/**
 * Which crisis pattern fired. These names are the *only* thing about a crisis
 * turn that reaches the conversation log, so they are grouped to be useful to
 * whoever ends up reviewing flagged lines: "self-harm-intent" and
 * "harm-to-others" want different responses, and a reviewer who can only see
 * `outcome: "crisis"` cannot tell them apart.
 *
 * Deliberately a closed union rather than a free string — a category cannot
 * drift back into being a quotation if it has to be one of these.
 */
export type CrisisPattern =
  | "suicide-named"
  | "self-harm-named"
  | "self-harm-intent"
  | "life-ending-intent"
  | "death-wish"
  | "hopelessness"
  | "burden"
  | "overdose"
  | "harm-to-others"
  | "harm-to-others-feared"
  /** Target unstated — "thinking about hurting". Ambiguous by nature. */
  | "harm-ideation";

/** Which under-18 signal fired. Same contract as CrisisPattern. */
export type MinorPattern =
  | "age-stated"
  | "under-18-stated"
  | "self-identified-minor"
  | "school-grade"
  | "age-referenced"
  | "parents-unaware";

export type SafetyPattern = CrisisPattern | MinorPattern;

export type SafetyStop = {
  kind: SafetyKind;
  /** Fixed copy. Never model-generated — §4.1 says so outright. */
  reply: string;
  effect: SafetyEffect;
  /**
   * Which pattern fired, as a fixed category — **never the phrase that
   * matched it.** This is what the flagged-conversation log records, and a
   * log line is not the place for a sentence somebody typed about wanting to
   * die. Category is enough to make the line actionable; the words are not
   * ours to keep. Never shown to the visitor either way.
   */
  pattern: SafetyPattern;
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

/* -------------------------------------------------------------------------
 * Shared fragments
 *
 * These exist because the worst bug this file has had was a copy-paste
 * divergence, not a missing idea: the *minor* patterns spelled it `i'?m` and
 * so caught apostrophe-less "im", while the *crisis* patterns spelled it
 * `i\s*(?:'m| am)?` and did not. The result was that "im going to hurt
 * someone" — typed without the apostrophe, which is how most people type on a
 * phone — was silently missed by the more important of the two lists.
 *
 * Writing each shape once means the next fix lands everywhere at once. Any
 * new pattern that needs "I'm" or "don't" must use these rather than inline
 * its own spelling.
 *
 * normalize() already lowercases and folds curly quotes to straight ones, so
 * the `['’]` classes and the `i` flags below are belt-and-braces: these
 * patterns must keep working if that ever stops being true.
 * ---------------------------------------------------------------------- */

/** "i'm" · "im" · "i m" · "i am" · "iam". The `m` is required. */
const IM = String.raw`i(?:\s*['’]?\s*m|\s*am)`;

/** The same, with the `m` optional — so bare "i might", "i could" still hit. */
const I_MAYBE = String.raw`i(?:\s*['’]?\s*m|\s*am)?`;

/** "i'll" · "ill" · "i will" · "i might" … Optional, so bare "i" still hits. */
const ILL = String.raw`i(?:\s*['’]?\s*ll|\s+will|\s+might|\s+may|\s+could|\s+am\s+going\s+to|\s+going\s+to)?`;

/** "don't" · "dont" · "do not" · "doesn't" · "didnt". */
const DONT = String.raw`(?:do|does|did)(?:\s*n['’]?t|\s+not)`;

/**
 * "want to" · "wants to" · "wanna" · "wana" — **the trailing "to" is
 * optional**, which is the entire point. The old pattern was
 * `wan(t|ts|na)\s+to\s+die`, so it required "wanna *to* die" and therefore
 * never matched the way anyone actually types it.
 */
const WANT_TO = String.raw`(?:want|wants|wanted|wanna|wana|wanne|wnat)(?:\s+to)?`;

/**
 * Crisis disclosure (§4.1).
 *
 * **This list is tuned to over-fire, on purpose.** Showing 988 to someone who
 * was venting about homework is an awkward message; missing someone who was
 * not venting is the failure this whole section exists to prevent. Where a
 * phrase was ambiguous the tie went to firing — "can't go on" is in, and Ben
 * should expect it to catch the occasional exhausted parent.
 *
 * That principle now extends to spelling. These are typed on phones, in
 * distress, by people who are not proofreading: apostrophes are dropped,
 * words are misspelled, spaces land in the wrong place. Every pattern here
 * accepts those variants, because a false positive costs one awkward message
 * and a false negative costs someone the 988 number.
 *
 * Two shapes are still deliberately excluded, because they are ordinary
 * questions about the service and firing on them would be both wrong and
 * alarming: "will it hurt me" / "does it hurt" (the FAQ), and "this is
 * killing him" (a parent describing a hard schedule). Self-harm patterns
 * therefore require a "-self" word, and harm-to-others requires a
 * first-person statement of intent. Both exclusions are covered by the
 * negative corpus in the audit — see the tests noted at the foot of the file.
 */
const CRISIS_PATTERNS: Array<{ pattern: CrisisPattern; regex: RegExp }> = [
  // --- named outright, including a parent reporting it about a child -------
  // Spelling is loose on purpose. "sucide", "suiside" and "suicidle" are all
  // things people type, and no ordinary English word has this shape — the
  // other "-cide" words (homicide, pesticide) can't reach it, because the
  // pattern is anchored to a word starting "su".
  { pattern: "suicide-named", regex: /\bsu[iu]?[cs]id(?:e|es|al|le|ial)?\b/i },
  { pattern: "suicide-named", regex: /\bsui\s+cide\b/i },
  { pattern: "suicide-named", regex: /\bkms\b/i },
  { pattern: "self-harm-named", regex: /\bself[\s-]*harm(?:s|ed|ing)?\b/i },

  // --- self-directed. A "-self" word is required: "will it hurt me?" is the
  // FAQ. "my self" (spaced) counts; so do the past and plural verb forms the
  // original list left out.
  {
    pattern: "self-harm-intent",
    regex:
      /\b(?:kill|kills|killed|killing|hurt|hurts|hurting|harm|harms|harmed|harming|cut|cuts|cutting)\s+(?:my|him|her|them|your|it)\s*sel(?:f|ves)\b/i,
  },
  {
    pattern: "life-ending-intent",
    // "took her life" was missed by the old (end|ending|take|taking); "thier"
    // and "live" are the two typos that actually show up.
    regex:
      /\b(?:end|ends|ended|ending|take|takes|took|taking)\s+(?:my|his|her|their|thier)\s+(?:own\s+)?li(?:f|v)e\b/i,
  },
  { pattern: "life-ending-intent", regex: /\bend(?:s|ed|ing)?\s+it\s+all\b/i },
  {
    pattern: "death-wish",
    regex: new RegExp(
      String.raw`\b${WANT_TO}\s+(?:die|be\s+dead|not\s+be\s+here|not\s+wake\s+up|disappear\s+forever)\b`,
      "i"
    ),
  },
  {
    pattern: "death-wish",
    regex: /\bwish(?:es|ed)?\s+(?:i|he|she|they|we)\s+(?:was|were)\s+(?:dead|gone)\b/i,
  },
  {
    pattern: "death-wish",
    regex:
      /\bwish(?:es|ed)?\s+(?:i|he|she|they|we)\s+(?:was|were)\s*n['’]?t\s+(?:here|alive|born)\b/i,
  },
  {
    pattern: "death-wish",
    regex: new RegExp(
      String.raw`\b${DONT}\s+${WANT_TO}\s+(?:live|be\s+here|be\s+alive|wake\s+up|go\s+on|exist)\b`,
      "i"
    ),
  },
  {
    pattern: "hopelessness",
    regex:
      /\b(?:no|nothing|not\s+any)\s+(?:reason|point|purpose)\s+(?:to|in|for)\s+(?:liv(?:e|ing)|be(?:ing)?\s+here|go(?:ing)?\s+on|exist(?:ing)?)\b/i,
  },
  { pattern: "hopelessness", regex: /\bnothing\s+(?:left\s+)?to\s+live\s+for\b/i },
  // "cannot" and "can not" were both missed by the old `can'?t`.
  {
    pattern: "hopelessness",
    regex:
      /\b(?:can['’]?t|cannot|can\s+not)\s+(?:go\s+on|keep\s+going|carry\s+on)\b/i,
  },
  // One alternation split in two, so the log can tell "better off dead" (a
  // death wish) from "better off without me" (feeling like a burden). "of"
  // for "off" is the typo that shows up here.
  { pattern: "death-wish", regex: /\bbetter\s+o(?:ff|f)\s+dead\b/i },
  {
    pattern: "burden",
    regex: /\bbetter\s+o(?:ff|f)\s+with\s*out\s+(?:me|him|her|them|us)\b/i,
  },
  { pattern: "overdose", regex: /\bover\s*dos(?:e|ed|es|ing)\b/i },

  // --- harm to others. Still a first-person statement of intent, never a
  // bare verb — "the schedule is killing him" must not reach this. The
  // subject fragment is what used to require an apostrophe.
  {
    pattern: "harm-to-others",
    regex: new RegExp(
      String.raw`\b${I_MAYBE}\s+(?:going\s+to|gonna|gunna|about\s+to|want\s+to|wanna|wana|need\s+to|plan\s+to|planning\s+to|might|may|could|will)\s+(?:hurt|kill|harm|attack)\b`,
      "i"
    ),
  },
  {
    pattern: "harm-to-others-feared",
    regex: new RegExp(
      String.raw`\b${I_MAYBE}\s+(?:afraid|scared|worried|terrified|frightened)\s+(?:that\s+)?${ILL}\s+(?:hurt|kill|harm|attack)\b`,
      "i"
    ),
  },
  // Sits under "harm to others" by history, but the target is unstated —
  // named honestly so a reviewer doesn't read certainty into it.
  {
    pattern: "harm-ideation",
    regex:
      /\b(?:think(?:ing|in|s)?|thoughts?)\s+(?:about|of)\s+(?:hurt|kill|harm)(?:ing)?\b/i,
  },
];

/**
 * Under-18 disclosure (§4.2). First person only — "my son is 14" is a parent,
 * which is the site's primary audience, not a minor disclosing their own age.
 */
const AGE_PATTERN = new RegExp(
  // The `\b` sits after the optional unit so that "im 12yo" matches while
  // "im 12345" still does not — the old pattern got the second half right
  // and the first half wrong. The lookahead is unchanged in intent: it keeps
  // "im 6 months pregnant" and "im 5'2" out.
  String.raw`\b${IM}\s*(\d{1,2})\s*(?:y\/?o|yrs?|years?)?\b(?!\s*(?:weeks?|months?|days?|hours?|minutes?|percent|%|out\s+of|ft|feet|['’]|"|\/|:))`,
  "i"
);

const MINOR_PATTERNS: Array<{ pattern: MinorPattern; regex: RegExp }> = [
  {
    pattern: "self-identified-minor",
    // "i am a teen" was missed by the old `i'?m` — it had no "am" branch.
    regex: new RegExp(
      String.raw`\b${IM}\s+(?:a\s+|an\s+|still\s+a\s+|only\s+a\s+|just\s+a\s+)?(?:minor|teen|teens|teenager|kid|child|underage|under\s*age)\b`,
      "i"
    ),
  },
  {
    pattern: "under-18-stated",
    regex: new RegExp(String.raw`\b${IM}\s+under\s*(?:18|eighteen)\b`, "i"),
  },
  {
    pattern: "school-grade",
    // Adds "grade 7", "the 7th grade", "middleschool", and junior high.
    regex: new RegExp(
      String.raw`\b${IM}\s+in\s+(?:the\s+)?(?:\d{1,2}\s*(?:st|nd|rd|th)?\s+grade|grade\s+\d{1,2}|middle\s*school|high\s*school|elementary\s*school|primary\s*school|jr\.?\s*high|junior\s*high)\b`,
      "i"
    ),
  },
  // Split from one alternation for the same reason as "better off dead"
  // above: "my parents don't know" is a different thing to know about a
  // conversation than "my age is", and the log should say which.
  { pattern: "age-referenced", regex: /\bmy\s+age\s+is\b/i },
  {
    pattern: "parents-unaware",
    // Widened past "parents": a minor writing this names whichever adult they
    // have. "doesnt" and "do not" were both missed by the old `don'?t`.
    regex: new RegExp(
      String.raw`\bmy\s+(?:parents?|mom|mum|dad|mother|father|guardian)\s+${DONT}\s+know\b`,
      "i"
    ),
  },
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

  // .test rather than .exec throughout: the matched text is no longer wanted
  // anywhere, so it is never lifted out of the message in the first place.
  // None of these carry /g, so .test holds no state between calls.
  for (const { pattern, regex } of CRISIS_PATTERNS) {
    if (regex.test(text)) {
      return {
        kind: "crisis",
        reply: CRISIS_REPLY,
        effect: "end-turn-and-flag",
        pattern,
      };
    }
  }

  // The one place a capture is still read — to check the number is a
  // plausible age. The number itself is used for the comparison and then
  // dropped; "age-stated" is what the log gets, not "i'm 12".
  const age = AGE_PATTERN.exec(text);
  if (age) {
    const years = Number(age[1]);
    if (years >= 1 && years < 18) {
      return {
        kind: "minor",
        reply: MINOR_REPLY,
        effect: "block-contact-collection",
        pattern: "age-stated",
      };
    }
  }

  for (const { pattern, regex } of MINOR_PATTERNS) {
    if (regex.test(text)) {
      return {
        kind: "minor",
        reply: MINOR_REPLY,
        effect: "block-contact-collection",
        pattern,
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
