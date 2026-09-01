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

export type SafetyKind = "crisis" | "minor" | "head-injury" | "headache";

/**
 * What the rest of the conversation must do once a check has fired. Returned
 * rather than described, so the route cannot honour §4.1 and forget §4.2.
 */
export type SafetyEffect =
  /** §4.1 — clear any booking in progress, flag the conversation, end the turn. */
  | "end-turn-and-flag"
  /** §4.2 — collect no contact details for the rest of the session. */
  | "block-contact-collection"
  /**
   * Recent head injury, or an acute headache — clear any booking in progress
   * and end the turn, but do not flag the conversation and do not block
   * contact for the rest of it.
   *
   * The booking is cleared for the same reason §4.1 clears it: somebody who
   * hit their head on Saturday should not be walked through name, phone and
   * preferred center in the same breath as "go to urgent care". Contact
   * collection is *not* blocked, because nothing about a head injury or a
   * headache makes this person a minor or a crisis — they may well be back
   * in the same session asking about later, and the assistant should be able
   * to help.
   */
  | "end-turn";

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
  /** The word itself — "overdose", "overdosed". */
  | "overdose"
  /**
   * A described act with a quantity — "took a bunch of my pills", "swallowed
   * the whole bottle". Kept apart from `overdose` because it reads as
   * something that may **already have happened**, which is a different thing
   * for a reviewer to see than someone using the word.
   */
  | "overdose-disclosed"
  | "harm-to-others"
  | "harm-to-others-feared"
  /** Target unstated — "thinking about hurting". Ambiguous by nature. */
  | "harm-ideation";

/**
 * Which head-injury signal fired. Same contract as CrisisPattern.
 *
 * Two, because they are two different things for a reviewer to see: someone
 * saying *when* it happened, and someone describing a symptom that means the
 * emergency room whenever it happened.
 */
export type HeadInjuryPattern = "recent-head-injury" | "head-injury-red-flag";

/**
 * Which headache signal fired. Same contract as CrisisPattern.
 *
 * Three, because they are three different things for a reviewer to see —
 * and because two of them get the emergency reply and one gets the gentler
 * one. "headache-red-flag" is a headache with a neurological symptom beside
 * it; "headache-severe" is the thunderclap presentation named as such
 * ("worst headache of my life", sudden); "headache-now" is someone in the
 * middle of an attack with no red flag in the message.
 */
export type HeadachePattern =
  | "headache-red-flag"
  | "headache-severe"
  | "headache-now";

/** Which under-18 signal fired. Same contract as CrisisPattern. */
export type MinorPattern =
  | "age-stated"
  | "under-18-stated"
  | "self-identified-minor"
  | "school-grade"
  | "age-referenced"
  | "parents-unaware";

export type SafetyPattern =
  | CrisisPattern
  | HeadInjuryPattern
  | HeadachePattern
  | MinorPattern;

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

/**
 * Recent head injury.
 *
 * Not in §4 — the section predates /concerns/concussion — but it belongs
 * here for §4.1's reason: it has to fire on the check rather than on the
 * model's judgment, and it has to fire *before* refusals, because "do I have
 * a concussion? I hit my head an hour ago" is a diagnosis question by shape
 * and an emergency by content. A refusal would answer the shape.
 *
 * Every sentence is the concussion page's own approved copy, in the same
 * words, plus the 911 line — which is ours, and is the only thing here the
 * page does not say, because a page cannot tell whether the person reading it
 * is vomiting.
 *
 * It does NOT end on "Want me to set one up?". The site's every other reply
 * closes on the free call; this one must not, because the next thing this
 * visitor does should be seeing a doctor and not booking us. The door is left
 * open instead, the way CRISIS_REPLY leaves it.
 */
export const HEAD_INJURY_REPLY =
  "If your head injury was recent, start with a doctor. Emergency care exists for a reason, and the first days after a head injury are not the time for anything else. Nothing here replaces that, and we’d tell you the same thing on the phone. If anyone has been knocked out, is vomiting, confused, or getting worse, call 911.\n\n" +
  "We’re here for later — weeks or months out, once you’ve been checked and cleared and something still isn’t back.";

/**
 * Acute headache — the emergency presentations.
 *
 * Not in §4 — the section predates /concerns/migraines — but it belongs here
 * for the head-injury check's reason, and with more force: a sudden severe
 * headache, or "the worst headache of my life", is the textbook call-911
 * presentation, and before this check existed both fell through every stage
 * to NO_MATCH_REPLY — which ends "Want me to set one up?". An assistant
 * offering to book a free consultation to somebody describing a thunderclap
 * headache is the exact failure this file exists to prevent.
 *
 * It also has to exist *before* the migraine page does: the moment that page
 * enters the index, "I have a migraine right now" stops being a no-match and
 * starts retrieving passages about who comes in for LENS. The check and the
 * page ship together, the way `head-injury` shipped with /concerns/concussion.
 *
 * The first two sentences are the migraine page's own medical-first copy, in
 * the same words. The reply must not end on a booking ask, for the
 * HEAD_INJURY_REPLY reason: the next thing this visitor does should be
 * calling a doctor, not us.
 */
export const HEADACHE_EMERGENCY_REPLY =
  "A sudden, severe headache — or the worst headache of your life — is a medical emergency: call 911 or get to an emergency room now. The same goes for a headache with anything new alongside it — confusion, trouble seeing or speaking, weakness or numbness, a stiff neck with a fever. Nothing here comes before that, and we’d tell you the same thing on the phone.\n\n" +
  "We’re here for later, alongside the care of a doctor who already knows your headaches.";

/**
 * The gentler variant, for somebody in the middle of an attack with no red
 * flag in the message. Ben's call (Sept 2026): someone mid-attack should hear
 * "if this one is unusual for you or the worst you've had, that's a doctor
 * now," not be walked toward a booking. So the reply names the line a person
 * can check themselves against, keeps the 911 route visible, and leaves the
 * door open the way HEAD_INJURY_REPLY does — no ask.
 */
export const HEADACHE_NOW_REPLY =
  "If this headache is unusual for you, or the worst you’ve had, that’s a doctor right now — not a chat with us, and we’d tell you the same thing on the phone. If anything new has come with it — confusion, trouble seeing or speaking, weakness or numbness — call 911.\n\n" +
  "And if it’s the migraine you already know and manage, the middle of one isn’t the time for anything here. We’re here for later, once it’s passed.";

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
  // "unalive" and "sewerslide" are here for the reason they exist: they are
  // the euphemisms people reach for *because* they get past filters, which
  // makes the population using them disproportionately the one §4.1 was
  // written for. A list that catches "suicide" and misses these is tuned for
  // the people who were never hiding. Matching them is the whole job.
  //
  // Neither appears in an ordinary sentence, so there is no trade-off to
  // make and the spelling is as loose as everything else here: any
  // inflection, and any of the space/hyphen/joined spellings.
  {
    pattern: "suicide-named",
    regex: /\bun[\s-]*aliv(?:e|ed|es|ing)\b/i,
  },
  {
    // "sewerslidal" is the one worth spelling out: it is to "sewerslide"
    // what "suicidal" is to "suicide", and a suffix list built from the verb
    // forms alone misses the adjective people are most likely to type about
    // themselves.
    pattern: "suicide-named",
    regex: /\bsewer[\s-]*slid(?:e|es|ed|ing|al)\b/i,
  },

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
  //
  // ┌─ DELIBERATE OMISSION — do not "fix" this ─────────────────────────────┐
  // │ "can't do this anymore" is NOT in the alternation above, and that is  │
  // │ a decision, not an oversight. It reads like a sibling of "can't go    │
  // │ on", and the temptation to add it will recur.                        │
  // │                                                                      │
  // │ It is also the single most likely sentence for an exhausted parent    │
  // │ venting about homework to type — and an exhausted parent venting      │
  // │ about homework is this site's *primary visitor*, not an edge case.    │
  // │ Everywhere else in this file the over-fire trade is cheap: a rare     │
  // │ sentence, one awkward 988 message. Here it inverts. The phrase is     │
  // │ common in ordinary traffic and rare as a crisis disclosure that       │
  // │ nothing else in this list would already have caught, so adding it     │
  // │ buys very little detection and spends a lot of trust.                 │
  // │                                                                      │
  // │ If it ever goes in, it should go in on evidence from real            │
  // │ conversations, not on symmetry with the line above it.               │
  // └──────────────────────────────────────────────────────────────────────┘
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

  // --- overdose described rather than named --------------------------------
  // Someone writing "i took a bunch of my pills" is not raising a topic, they
  // are reporting something that may already have happened. That is the most
  // acute thing this file can be handed, so these err harder toward firing
  // than anything else in the list.
  //
  // The one discipline holding them back from ordinary traffic is **tense**:
  // the verbs are past-tense ingestion (took / swallowed / downed / ate), not
  // habitual present. "my son takes a bunch of pills for adhd" is a sentence
  // a parent on this site really does write, and it stays quiet because
  // "takes" is not in the list. Do not add it.
  //
  // A quantity word is also required, so "i took his pills to the doctor"
  // does not reach these. Two over-fires are accepted and tested for rather
  // than engineered around — "took a bunch of pills to the pharmacy" and
  // "took all my meds this morning" both fire. A lookahead chasing "to the
  // pharmacy" would be an arms race that weakens the pattern against the case
  // it exists for.
  {
    // "swallowed a bunch of…" — no object needed. There is no innocuous
    // sentence that starts this way.
    pattern: "overdose-disclosed",
    regex:
      /\b(?:swallow(?:ed|ing)?|downed)\s+(?:a\s+)?(?:whole\s+)?(?:bunch|handful|load|lots?|ton|bottle|box|pack|packet|all)\b/i,
  },
  {
    // Past-tense ingestion + a quantity + something you can be prescribed.
    // The possessive slot repeats, because "my mom's pills" stacks two of
    // them and a single slot silently missed the whole phrase.
    pattern: "overdose-disclosed",
    regex:
      /\b(?:took|taken|swallow(?:ed|ing)?|downed|ate)\s+(?:a\s+)?(?:whole\s+)?(?:bunch|handful|load|lots?|ton|bottle|box|pack|packet|all|everything)\s+(?:of\s+)?(?:(?:my|the|his|her|their|mums?|moms?|dads?|kids?|sons?|daughters?)\s+){0,2}(?:pills?|meds?|medications?|medicine|tablets?|capsules?|painkillers?)\b/i,
  },
  {
    // "took the whole bottle" — the container stands in for the count.
    pattern: "overdose-disclosed",
    regex:
      /\b(?:took|taken|swallow(?:ed|ing)?|drank|downed|ate)\s+(?:the\s+|a\s+)?(?:whole|entire|rest\s+of\s+the|last\s+of\s+the)\s+(?:bottle|packet|pack|box|container|script|prescription|supply)\b/i,
  },
  {
    // "took all my …" with the object left open, as asked: whatever noun
    // follows, a first-person "took all my" is a disclosure worth firing on.
    pattern: "overdose-disclosed",
    regex:
      /\b(?:took|taken|swallow(?:ed|ing)?|downed|ate)\s+all\s+(?:of\s+)?(?:my|his|her|their)\s+\w+/i,
  },

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

/* -------------------------------------------------------------------------
 * Recent head injury
 *
 * /concerns/concussion is written for someone weeks or months past a head
 * injury who was cleared and still isn't right. A meaningful share of the
 * traffic that finds a concussion page is not that person: they hit their
 * head on Saturday and are searching on Sunday. For them the correct answer
 * is urgent care, and the wrong answer is a passage about neurofeedback —
 * which is exactly what retrieval will hand back now that the page exists and
 * is filed under "concussion", "head", "injury" and "hit".
 *
 * So this fires here, before retrieval and before refusals, and returns fixed
 * copy. Same contract as everything else in this file: no model, no passages,
 * nothing a widening of the alias list can reach.
 *
 * ## The line it draws
 *
 * The topic is not the trigger. "Do you help with post-concussion symptoms?"
 * and "I had a concussion two years ago and still feel foggy" are the page's
 * audience, and both must reach the page — a check that fired on the word
 * would delete the concern from the assistant entirely, which is the opposite
 * failure and just as real. What fires is an injury described with either:
 *
 *   - **recency** — today, last night, three days ago, "just hit"; or
 *   - **a red flag** — knocked out, vomiting, confused, won't wake up.
 *
 * Both halves must appear in the same message, in either order, which is why
 * these are written as lookahead pairs rather than as distance-bounded
 * patterns: "I hit my head. I've been throwing up since." puts a full stop
 * between them, and a `[^.?!]` window would have missed it.
 *
 * Where the two pull against each other the tie goes to firing, as everywhere
 * else in this file — but the over-fire here is cheap in a way it isn't for
 * crisis. Somebody browsing the concussion page who gets told to see a doctor
 * first has been told the page's own opening line.
 * ---------------------------------------------------------------------- */

/**
 * The injury itself: named, or described as a blow to the head.
 *
 * Not "car accident" or "whiplash" on their own, deliberately. Both are on
 * the concussion page as things people arrive with *months and sometimes
 * years* after the fact, and a bare mention of either is far more likely to
 * be that visitor than an acute one. They still fire when they arrive with a
 * head blow or a red flag beside them, because then the pattern below has its
 * other half.
 */
const HEAD_EVENT = [
  String.raw`concussion(?:s|ed)?`,
  String.raw`concussed`,
  String.raw`head\s+injur(?:y|ies)`,
  String.raw`head\s+trauma`,
  String.raw`(?:traumatic\s+)?brain\s+injur(?:y|ies)`,
  String.raw`\btbi\b`,
  String.raw`skull\s+fractur`,
  // "hit my head", "banged his head", "cracked her head". The possessive is
  // required: "hit my brother" and "the deadline hit me" are not this.
  String.raw`(?:hit|hits|hitting|bang|banged|bump|bumped|smack|smacked|whack|whacked|knock|knocked|struck|slam|slammed|crack|cracked)\s+(?:my|his|her|their|our|the)\s+head`,
  String.raw`hit\s+in\s+the\s+head`,
  String.raw`(?:took|take|takes|taking)\s+(?:a\s+)?(?:hit|blow|knock|shot)\s+to\s+(?:the|my|his|her|their)\s+head`,
  // "got knocked out", not bare "knocked out" — "I'm knocked out from work"
  // is a tired parent, and this site is full of them.
  String.raw`(?:got|was|were|been|being)\s+knocked\s+(?:out|unconscious)`,
].join("|");

/**
 * When it happened.
 *
 * Everything here means days rather than weeks. The page's own boundary is
 * "weeks or months out", so "three weeks ago" is deliberately absent: that
 * visitor is the audience, not the emergency.
 *
 * Bare "just" is not in this list. "I just want to know if you help with
 * concussions" would have fired on it, and that is the one over-fire worth
 * engineering around — it is a question about the service from someone who is
 * fine. The word is admitted only glued to a verb of injury.
 */
const RECENT = [
  "today",
  "tonight",
  "yesterday",
  String.raw`last\s+night`,
  String.raw`this\s+(?:morning|afternoon|evening|week|weekend)`,
  String.raw`an?\s+hour\s+ago`,
  String.raw`\d+\s+(?:hours?|minutes?|mins?)\s+ago`,
  String.raw`a\s+few\s+(?:hours?|days?)\s+ago`,
  String.raw`(?:a\s+)?couple\s+(?:of\s+)?days?\s+ago`,
  String.raw`[1-6]\s+days?\s+ago`,
  String.raw`(?:just|right)\s+now`,
  String.raw`just\s+(?:hit|bang|banged|bump|bumped|got|had|took|knocked|fell|fallen|crash|crashed)`,
  String.raw`earlier\s+(?:today|tonight)`,
  "recently",
].join("|");

/**
 * Symptoms that mean the emergency room whatever the timeline says.
 *
 * These count only alongside a HEAD_EVENT, which is what keeps "I threw up
 * this morning" and "he had a seizure years ago" out of it.
 */
const RED_FLAG = [
  String.raw`knocked\s+(?:out|unconscious)`,
  String.raw`lost\s+consciousness`,
  String.raw`black(?:ed)?\s+out`,
  String.raw`passed\s+out`,
  "unconscious",
  String.raw`vomit(?:s|ed|ing)?`,
  String.raw`throw(?:ing|n)?\s+up`,
  String.raw`threw\s+up`,
  String.raw`slurr(?:ed|ing)`,
  "seizure",
  "convulsi",
  String.raw`won['’]?t\s+wake`,
  String.raw`can['’]?t\s+stay\s+awake`,
  String.raw`(?:one\s+)?pupil`,
  String.raw`clear\s+fluid`,
  String.raw`getting\s+worse`,
].join("|");

/**
 * Both halves anywhere in the message, in either order.
 *
 * Lookaheads rather than a distance window, for the reason in the section
 * note above — and the same shape the hours topic in ./unanswerable.ts uses
 * for "a day word plus an availability word".
 */
const bothPresent = (a: string, b: string) =>
  new RegExp(String.raw`(?=[\s\S]*(?:${a}))(?=[\s\S]*(?:${b}))`, "i");

const HEAD_INJURY_PATTERNS: Array<{
  pattern: HeadInjuryPattern;
  regex: RegExp;
}> = [
  { pattern: "recent-head-injury", regex: bothPresent(HEAD_EVENT, RECENT) },
  { pattern: "head-injury-red-flag", regex: bothPresent(HEAD_EVENT, RED_FLAG) },
];

/* -------------------------------------------------------------------------
 * Acute headache
 *
 * /concerns/migraines is written for someone whose migraines are long-
 * standing and already under a doctor's care. As with the concussion page, a
 * share of the traffic that finds a migraine page is not that person: they
 * have the worst headache of their life and are typing it into a chat box.
 * For them the correct answer is 911, and the wrong answer is a passage
 * about who comes in for LENS — which is what retrieval hands back now that
 * the page exists and is filed under "migraine" and "headache".
 *
 * ## The line it draws
 *
 * The topic is not the trigger — the head-injury rule, restated because the
 * temptation recurs per page. "Do you help with migraines?", "I get
 * migraines", "chronic migraines after a concussion" are the page's
 * audience, and all must reach it. What fires is:
 *
 *   - **a red flag** — a headache with a neurological symptom beside it
 *     (confusion, trouble speaking, numbness, a stiff neck with fever); or
 *   - **the thunderclap presentation named as such** — "worst headache of my
 *     life", sudden, out of nowhere; or
 *   - **an attack happening now** — "I have a migraine right now". This one
 *     gets the gentler reply: for a known migraine sufferer mid-attack the
 *     answer is "if this one is unusual, that's a doctor now", not a 911
 *     order, and either way not a booking. Ben's call, Sept 2026.
 *
 * ## Deliberately NOT in the severe list
 *
 * "excruciating", "unbearable" and "blinding" — the adjectives chronic
 * sufferers use for their *normal*. "I've had excruciating migraines for
 * twenty years, can you help?" is the page's core audience, and sending that
 * person a 911 message deletes the concern for exactly the people it was
 * built for. The over-fire trade inverts here the way "can't do this
 * anymore" inverts in the crisis list: common in ordinary traffic, rare as a
 * disclosure nothing else would catch. If any of the three ever goes in, it
 * goes in on evidence from real conversations.
 *
 * Also absent: "vomiting" and "light and noise" (routine parts of an
 * ordinary migraine — vomiting stays a red flag where it belongs, beside a
 * HEAD_EVENT), and bare "vision" ("I can't see properly during an aura" is a
 * sufferer describing their known condition; "can't see" still fires,
 * because a message in the middle of that is a message to hand a doctor).
 * ---------------------------------------------------------------------- */

/**
 * The headache itself: named, or described as present-tense head pain.
 * "headaches" and "head ache" both reach `head\s*aches?`.
 */
const HEADACHE_WORD = [
  String.raw`migraines?`,
  String.raw`head\s*aches?`,
  String.raw`head\s+pain`,
  String.raw`my\s+head\s+is\s+(?:pounding|splitting|throbbing|killing\s+me|exploding)`,
].join("|");

/**
 * Neurological symptoms that mean the emergency room when they arrive with a
 * headache. Narrower than the head-injury RED_FLAG on purpose — see the
 * section note for what was left out and why.
 */
const HEADACHE_RED_FLAG = [
  String.raw`confus(?:ed|ion|ing)`,
  String.raw`can['’]?t\s+see`,
  String.raw`los(?:t|ing)\s+(?:my\s+)?vision`,
  String.raw`trouble\s+(?:seeing|speaking|talking)`,
  String.raw`slurr(?:ed|ing)`,
  String.raw`numb(?:ness)?\b`,
  String.raw`weakness`,
  String.raw`stiff\s+neck`,
  String.raw`fever`,
  String.raw`seizure`,
  String.raw`convulsi`,
  String.raw`passed\s+out`,
  String.raw`fainted?`,
  String.raw`black(?:ed)?\s+out`,
  String.raw`won['’]?t\s+wake`,
].join("|");

/**
 * The thunderclap presentation, named. "sudden(ly)" is here even though "my
 * migraines suddenly got worse" will catch an occasional chronic sufferer —
 * sudden change is the medically significant word, and the tie goes to
 * firing.
 */
const HEADACHE_SUDDEN = [
  String.raw`thunderclap`,
  String.raw`out\s+of\s+nowhere`,
  String.raw`sudden(?:ly)?`,
  String.raw`never\s+had\s+(?:one|a\s+head\s*ache|a\s+migraine)\s+like`,
].join("|");

/**
 * An attack happening now. Three shapes: the singular first-person report
 * ("I have a migraine" — the plural "I have migraines" is the chronic
 * visitor and does not match), present-tense head pain, and a headache word
 * beside a right-now word.
 */
const HEADACHE_NOW_PATTERNS: RegExp[] = [
  new RegExp(
    String.raw`\b(?:${IM}\s+having|i\s+have|i\s*['’]?\s*ve\s+got)\s+(?:a|this|the)\s+(?:\w+\s+){0,2}(?:migraine|head\s*ache)\b`,
    "i"
  ),
  /\bmy\s+head\s+is\s+(?:pounding|splitting|throbbing|killing\s+me|exploding)\b/i,
  bothPresent(
    HEADACHE_WORD,
    String.raw`right\s+now|as\s+we\s+speak|at\s+the\s+moment|in\s+the\s+middle\s+of\s+one`
  ),
];

/**
 * Ordered most-acute first: a red flag outranks "severe", which outranks
 * "now", so the message that carries two signals is logged (and answered) as
 * the worse one. Checked *after* the head-injury patterns, so "I got knocked
 * out and I have a headache and I'm confused" keeps firing as
 * head-injury-red-flag — the injury is the fact a reviewer needs first.
 */
const HEADACHE_PATTERNS: Array<{
  pattern: HeadachePattern;
  regex: RegExp;
  reply: string;
}> = [
  {
    pattern: "headache-red-flag",
    regex: bothPresent(HEADACHE_WORD, HEADACHE_RED_FLAG),
    reply: HEADACHE_EMERGENCY_REPLY,
  },
  {
    // "worst headache", with up to two words in between — "worst ever
    // headache", "the worst possible migraine". The adjacency is what keeps
    // "the worst part of my week is the migraines" from firing.
    pattern: "headache-severe",
    regex: /\bworst\s+(?:\w+\s+){0,2}(?:migraine|head\s*ache|head\s+pain)/i,
    reply: HEADACHE_EMERGENCY_REPLY,
  },
  {
    pattern: "headache-severe",
    regex: bothPresent(HEADACHE_WORD, HEADACHE_SUDDEN),
    reply: HEADACHE_EMERGENCY_REPLY,
  },
  ...HEADACHE_NOW_PATTERNS.map((regex) => ({
    pattern: "headache-now" as const,
    regex,
    reply: HEADACHE_NOW_REPLY,
  })),
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

  // Before the minor checks, deliberately: a fifteen-year-old who writes "I
  // hit my head at practice today" needs the doctor line, not a note about
  // parental consent. Nothing here changes what §4.2 does on the next turn.
  for (const { pattern, regex } of HEAD_INJURY_PATTERNS) {
    if (regex.test(text)) {
      return {
        kind: "head-injury",
        reply: HEAD_INJURY_REPLY,
        effect: "end-turn",
        pattern,
      };
    }
  }

  // After head-injury (see the ordering note on HEADACHE_PATTERNS), before
  // the minor checks for the head-injury reason: the fifteen-year-old with
  // the worst headache of their life needs the doctor line first.
  for (const { pattern, regex, reply } of HEADACHE_PATTERNS) {
    if (regex.test(text)) {
      return {
        kind: "headache",
        reply,
        effect: "end-turn",
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
