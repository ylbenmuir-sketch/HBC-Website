/**
 * Reading the visitor's answers in the assistant's booking flow
 * (lib/chat/booking.ts). Pure string work, and import-free, so
 * lib/chat-booking-parse.test.mjs runs it under plain `node --test`.
 *
 * The flow has six steps (Ben, 2026-10-14) and three of them offer tappable
 * buttons. A tapped button arrives as its label, verbatim; a typed answer
 * arrives as anything at all. Everything here maps both onto the same fixed
 * values — and for the center, ONLY onto a fixed value: free-typed center
 * text is never stored.
 */

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

/** Step 3. The labels, in order. */
export const CENTER_BUTTONS = ["Nashville", "Murfreesboro", "Come to me", "Not sure"] as const;

/** What each button stores in preferred_center. lib/lead-routing.ts routes
 *  "Concierge" to LEADS_CONCIERGE and "Not sure" to LEADS_FALLBACK. */
export const CENTER_VALUES = ["Nashville", "Murfreesboro", "Concierge", "Not sure"] as const;
export type CenterValue = (typeof CENTER_VALUES)[number];

/** Step 5. Stored as the label. */
export const TIME_BUTTONS = ["Morning", "Afternoon", "Any time"] as const;
export type TimeValue = (typeof TIME_BUTTONS)[number];

/** Step 6. */
export const CONFIRM_BUTTONS = ["Yes, text me", "No, just call", "Fix something"] as const;

/** After "Fix something". */
export const FIX_BUTTONS = ["Name", "Phone", "Email", "Center", "Best time"] as const;
export type FixField = "name" | "phone" | "email" | "center" | "bestTime";

/* ------------------------------------------------------------------ */
/* Text                                                                */
/* ------------------------------------------------------------------ */

/** Lower case, curly quotes straightened, punctuation to spaces. */
export function simplify(message: string): string {
  return message
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[^\p{L}\p{N}'@.+\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Classic edit distance — insertions, deletions, substitutions — plus
 *  adjacent swaps, the commonest typo on a phone ("Nahsville"). */
export function editDistance(a: string, b: string): number {
  const d: number[][] = Array.from({ length: a.length + 1 }, (_, i) =>
    Array.from({ length: b.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/* ------------------------------------------------------------------ */
/* Step 1 — name and phone                                             */
/* ------------------------------------------------------------------ */

/** The digits of a dialable number, or null. 10 digits, or 11 starting 1. */
function dialable(digits: string): boolean {
  return digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
}

/**
 * The phone-shaped run in a message, as typed, or null. 10 digits (or 11
 * with a leading 1) — the site's callers are US numbers, and the
 * confirmation text only goes to a ten-digit US number anyway.
 */
export function extractPhone(message: string): string | null {
  const candidates = message.match(/\+?\(?\d[\d\s().+-]{7,}\d/g);
  if (!candidates) return null;
  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    if (dialable(trimmed.replace(/\D/g, ""))) return trimmed.slice(0, 40);
  }
  return null;
}

/** "6155551234" / "+1 615.555.1234" → "(615) 555-1234". Anything that is not
 *  a US ten-digit number is returned as typed. */
export function formatPhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (digits.length !== 10) return phone;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * Phrases that sit around a name and a number but are neither, removed
 * before the words that are left are read as the name. Phrases rather than
 * single words where a word could also be a surname ("best", "call").
 */
const NAME_FILLER_PHRASES: RegExp[] = [
  /\b(my\s+)?(best\s+|cell\s+|mobile\s+|home\s+|work\s+)?(phone\s+)?(number|no\.|#)(\s+is|'s|’s)?\b/gi,
  /\b(my\s+)?(full\s+|first\s+|last\s+)?name(\s+is|'s|’s)?\b/gi,
  /\b(you\s+can\s+)?(reach|call|text|contact)\s+me(\s+at|\s+on)?\b/gi,
  /\b(i'm|i’m|i\s+am|im|this\s+is|it's|it’s|its|here's|here’s)\b/gi,
  /\b(hi|hello|hey|sure|yes|yeah|yep|ok|okay|thanks|thank\s+you)\b/gi,
];

/** Single words that are never part of a name. Only words no one is named. */
const NAME_FILLER = new Set(["and", "at", "on", "is", "my", "the", "of", "or", "it", "me", "i", "a"]);

/**
 * Words that mean the message is a sentence, not a name — "why do you need
 * that", "I don't want to say". Function words only; nothing on this list is
 * anyone's first or last name.
 */
const NOT_A_NAME = new Set([
  "why", "what", "how", "who", "where", "when", "do", "does", "did", "need",
  "want", "that", "would", "should", "could", "not", "don't", "dont", "no",
  "please", "just", "you", "your", "we", "us", "about", "with", "for", "can",
]);

/** A token that can be part of a name: letters, inner apostrophes, hyphens
 *  and periods ("O'Neil", "Smith-Jones", "Jr."). */
const NAME_WORD = /^\p{L}[\p{L}'’.-]*$/u;

/**
 * The name in a message, with the phone number, any email address and the
 * filler around them taken out. Null when what is left does not look like a
 * name — no words, a word with digits in it, a question, a sentence's
 * function words, or more words than a name has (asking again beats storing
 * a sentence as a name).
 *
 * Capitalization is the visitor's here; lib/name-case.ts applies on save.
 */
export function extractName(message: string): string | null {
  if (message.includes("?")) return null;
  const phone = extractPhone(message);
  let rest = phone ? message.replace(phone, " ") : message;
  rest = rest.replace(/\S+@\S+/g, " ");
  for (const phrase of NAME_FILLER_PHRASES) rest = rest.replace(phrase, " ");
  const words = rest
    .replace(/[,;:!()"“”/\\]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^[.'’-]+/, "").replace(/['’-]+$/, ""))
    .filter((w) => w.length > 0 && w !== ".")
    .filter((w) => !NAME_FILLER.has(w.toLowerCase()));
  if (words.length === 0 || words.length > 5) return null;
  if (!words.every((w) => NAME_WORD.test(w))) return null;
  if (words.some((w) => NOT_A_NAME.has(w.toLowerCase().replace(/’/g, "'")))) return null;
  const name = words.join(" ").replace(/\.$/, "");
  return name.length > 0 && name.length <= 100 ? name : null;
}

/** First and last: two words or more. */
export function isFullName(name: string): boolean {
  return name.trim().split(/\s+/).length >= 2;
}

/* ------------------------------------------------------------------ */
/* Step 2 — email                                                      */
/* ------------------------------------------------------------------ */

/** The address in a message, or null. Same loose shape the consultation
 *  route accepts, with a real-looking top-level domain, and the sentence's
 *  closing period not swallowed. */
export function extractEmail(message: string): string | null {
  const match = message.match(/[^\s@<>(),;:"']+@[^\s@<>(),;:"']+\.[a-z]{2,}/i);
  if (!match) return null;
  const email = match[0].replace(/\.+$/, "");
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 200 ? email : null;
}

/* ------------------------------------------------------------------ */
/* Step 3 — center                                                     */
/* ------------------------------------------------------------------ */

/** Phrases that mean each value, matched on word boundaries. */
const CENTER_PHRASES: Array<{ value: CenterValue; pattern: RegExp }> = [
  {
    value: "Concierge",
    pattern:
      /\b(come to me|come to us|come to my|comes to me|concierge|at home|in home|in-home|my home|my house|our house|our home|home visit|house call)\b/,
  },
  {
    value: "Not sure",
    pattern:
      /\b(not sure|unsure|don't know|dont know|do not know|no idea|idk|either|whichever|either one|no preference|doesn't matter|doesnt matter|don't mind|dont mind|whatever|any|undecided|not certain)\b/,
  },
  { value: "Murfreesboro", pattern: /\b(murf|boro|rutherford)\b/ },
  { value: "Nashville", pattern: /\b(nash|davidson|belle meade|green hills)\b/ },
];

/** The names typos are measured against, and how far off a word may be. */
const CENTER_WORDS: Array<{ value: CenterValue; word: string; maxDistance: number }> = [
  { value: "Nashville", word: "nashville", maxDistance: 2 },
  { value: "Murfreesboro", word: "murfreesboro", maxDistance: 3 },
  { value: "Concierge", word: "concierge", maxDistance: 2 },
];

/**
 * A tapped button or a typed answer → one of the four fixed values, or null
 * when nothing matches well enough (the caller shows the buttons again).
 *
 * In order: the button labels exactly; the stored values; phrases ("come to
 * me", "not sure", "murf"); then typos, word by word, against the three
 * place names — "Nashvile", "Nahsville", "Murfreesbro", "conceirge".
 * "Franklin" matches nothing: there is no Franklin center to book yet.
 */
export function matchCenter(message: string): CenterValue | null {
  const text = simplify(message);
  if (!text) return null;

  for (let i = 0; i < CENTER_BUTTONS.length; i++) {
    if (text === CENTER_BUTTONS[i].toLowerCase() || text === CENTER_VALUES[i].toLowerCase()) {
      return CENTER_VALUES[i];
    }
  }
  for (const { value, word } of CENTER_WORDS) {
    if (new RegExp(`\\b${word}\\b`).test(text)) return value;
  }
  for (const { value, pattern } of CENTER_PHRASES) {
    if (pattern.test(text)) return value;
  }

  let best: { value: CenterValue; distance: number } | null = null;
  for (const token of text.split(/[\s.-]+/)) {
    if (token.length < 4) continue;
    for (const { value, word, maxDistance } of CENTER_WORDS) {
      const distance = editDistance(token, word);
      if (distance <= maxDistance && (!best || distance < best.distance)) {
        best = { value, distance };
      }
    }
  }
  return best?.value ?? null;
}

/** "Franklin"-ish — so the reply can say why the buttons came back. */
export function mentionsFranklin(message: string): boolean {
  return simplify(message)
    .split(/\s+/)
    .some((t) => t.length >= 5 && editDistance(t, "franklin") <= 2);
}

/* ------------------------------------------------------------------ */
/* Step 5 — best time                                                  */
/* ------------------------------------------------------------------ */

/** A tapped button or typed answer → one of the three, or null. */
export function matchBestTime(message: string): TimeValue | null {
  const text = simplify(message);
  if (!text) return null;
  const morning = /\b(morning|mornings|am|a\.m\.|early|before noon|mornin|morn)\b/.test(text) ||
    text.split(/\s+/).some((t) => t.length >= 6 && editDistance(t, "morning") <= 2);
  const afternoon = /\b(afternoon|afternoons|pm|p\.m\.|after lunch|after noon|later in the day|arvo)\b/.test(text) ||
    text.split(/\s+/).some((t) => t.length >= 7 && editDistance(t, "afternoon") <= 2);
  const any = /\b(any time|anytime|any|whenever|either|both|all day|doesn't matter|doesnt matter|no preference|flexible|whatever)\b/.test(text);
  if (any || (morning && afternoon)) return "Any time";
  if (morning) return "Morning";
  if (afternoon) return "Afternoon";
  return null;
}

/* ------------------------------------------------------------------ */
/* Step 6 — the read-back's answer                                     */
/* ------------------------------------------------------------------ */

export type ConfirmAnswer = "yes" | "no" | "fix" | null;

/**
 * "Yes, text me" / "No, just call" / "Fix something", tapped or typed.
 * "Fix" wins over everything ("no, that's wrong" is a fix, not a no); a
 * negation anywhere vetoes a yes ("yes but don't text me" is a no) — a
 * doubtful yes to texts is a no.
 */
export function matchConfirm(message: string): ConfirmAnswer {
  const text = simplify(message);
  if (!text) return null;
  if (text === "yes, text me" || text === "yes text me") return "yes";
  if (text === "no, just call" || text === "no just call") return "no";
  if (/\b(fix|change|wrong|incorrect|edit|correction|mistake|typo|not right|isn't right|isnt right)\b/.test(text)) {
    return "fix";
  }
  const negative =
    /\b(no|nope|nah|don't|dont|do not|not|never|stop|just call|call only|only call|no texts?|rather not|no thanks)\b/.test(text);
  if (negative) return "no";
  if (/\b(yes|yep|yeah|yup|sure|ok|okay|please|text me|texts? (is|are) fine|sounds good|go ahead|perfect|great|that works|all good|looks good|right|correct|y)\b/.test(text)) {
    return "yes";
  }
  return null;
}

/** "Name" / "my email" / "the phone number" → which field to change. */
export function matchFixField(message: string): FixField | null {
  const text = simplify(message);
  if (/\b(name|spelling|spelled|last name|first name|surname)\b/.test(text)) return "name";
  if (/\b(phone|number|cell|mobile|digits)\b/.test(text)) return "phone";
  if (/\b(email|e-mail|mail|address)\b/.test(text)) return "email";
  if (/\b(center|centre|location|office|clinic|place)\b/.test(text) || matchCenter(message)) return "center";
  if (/\b(time|best time|when|morning|afternoon)\b/.test(text)) return "bestTime";
  return null;
}
