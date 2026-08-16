import {
  locationHours,
  locations,
  type DayHours,
  type Location,
  type WeeklyHours,
} from "../locations";
import type { BookingDraft, ChatSession } from "./session";
import { contactCollectionAllowed } from "./session";
import { normalize } from "./refusals";

/**
 * The callback request (phase-8-chatbot.md §5).
 *
 * A state machine, and deliberately not a model. The model's job is answering
 * from site content; collecting a name and a phone number is a form, and a
 * form that a model improvises is a form that will one day ask a fifth
 * question, skip the read-back, or invent a callback time. Every question, its
 * order, and the confirmation step are fixed here in code.
 *
 * `advanceBooking()` is pure: it takes a session and a message and returns the
 * reply plus, when the flow is ready, the payload to submit. It performs no
 * network call — app/api/chat/route.ts does the POST to /api/consultation, so
 * the flow can be run end-to-end in a test without a Supabase project.
 */

/** Exactly the fields components/ContactForm.tsx collects — §5's table. */
const HELPING_OPTIONS = ["My child", "Myself", "Someone else"] as const;
const TIME_OPTIONS = ["Mornings", "Afternoons", "Evenings"] as const;
const CENTER_OPTIONS = [
  "Nashville",
  "Murfreesboro",
  "Franklin waitlist",
] as const;

export type BookingSubmission = {
  type: "consultation";
  source: "chat";
  helping_who: string;
  first_name: string;
  phone: string;
  note: string | null;
  best_time: string | null;
  preferred_center: string | null;
  source_page: string | null;
};

export type BookingTurn = {
  reply: string;
  /** Present only when the visitor has confirmed the read-back. */
  submit?: BookingSubmission;
};

/* ------------------------------------------------------------------ */
/* §5.1 — callback expectations                                        */
/* ------------------------------------------------------------------ */

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
};

const WEEKDAY_NAME = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];

function minutesOf(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Weekday index and minutes-since-midnight in the hours' own time zone. */
function localNow(now: Date, timeZone: string): { day: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  // "24" appears for midnight under hour12:false in some ICU versions.
  const hour = Number(get("hour")) % 24;
  return {
    day: WEEKDAY_INDEX[get("weekday")] ?? 0,
    minutes: hour * 60 + Number(get("minute")),
  };
}

/**
 * The week the *practice* answers the phone, pooled across its centers.
 *
 * There is no single business week here — Nashville runs Tuesday to Saturday,
 * Murfreesboro Tuesday to Thursday — and that difference is real enough that
 * the location pages print both. But a visitor at this point in the booking
 * flow has not chosen a center yet, and often does not know there are two, so
 * the promise she is given has to be one the practice as a whole can keep.
 *
 * The union is the honest shape: a day is a day somebody answers if *any*
 * center is open on it, and the window runs from the earliest opening to the
 * latest closing across the centers open that day. Unverified hours are absent
 * (`locationHours` gates them), so a center whose week is not confirmed
 * contributes nothing rather than a guess.
 */
function practiceWeek(centers: Location[]): WeeklyHours | null {
  const weeks = centers.map(locationHours).filter((w): w is WeeklyHours => w !== null);
  if (weeks.length === 0) return null;

  const week = Array.from({ length: 7 }, (_, day): DayHours => {
    const open = weeks.map((w) => w.week[day]).filter((d): d is NonNullable<DayHours> => d !== null);
    if (open.length === 0) return null;
    return {
      opens: open.reduce((a, b) => (minutesOf(a.opens) <= minutesOf(b.opens) ? a : b)).opens,
      closes: open.reduce((a, b) => (minutesOf(a.closes) >= minutesOf(b.closes) ? a : b)).closes,
    };
  }) as WeeklyHours["week"];

  // Every center on this site keeps one time zone. If that ever stops being
  // true, a pooled week is the wrong abstraction and this has to be told which
  // center the visitor picked — which the flow does eventually know.
  return { timeZone: weeks[0].timeZone, week };
}

/** "Tuesday through Saturday", from the pooled week. Never typed as a range. */
function openDaysPhrase(week: WeeklyHours["week"]): string | null {
  const open = week.map((d, i) => (d ? i : -1)).filter((i) => i >= 0);
  if (open.length === 0) return null;
  if (open.length === 1) return WEEKDAY_NAME[open[0]];
  const contiguous = open.every((d, i) => i === 0 || d === open[i - 1] + 1);
  if (!contiguous) return open.map((d) => WEEKDAY_NAME[d]).join(", ");
  return `${WEEKDAY_NAME[open[0]]} through ${WEEKDAY_NAME[open[open.length - 1]]}`;
}

/**
 * What the assistant may say about when someone will be called back.
 *
 * §5.1's three branches, now that the hours behind them are confirmed. This is
 * the only place in the assistant allowed to say anything about callback
 * timing, and it reads the centers' own weeks and nothing else — in particular
 * not SAME_DAY_CALLBACK, whose "today" promise is the homepage's.
 *
 * It speaks for the practice rather than for a center, because at the end of
 * the booking flow the visitor may have skipped the center question entirely.
 * Naming the window ("Tuesday through Saturday") rather than only the day is
 * what stops "we'll call you Tuesday" reading as a delay she wasn't warned
 * about — a promise she can check is worth more than a promise that sounds
 * fast.
 *
 * `centers` is a parameter so the branches can be exercised without editing
 * lib/locations.ts.
 */
export function callbackExpectation(
  now: Date = new Date(),
  centers: Location[] = locations
): string {
  const pooled = practiceWeek(centers);
  // No confirmed week anywhere: no timing claim at all, exactly as before.
  if (!pooled) return "Someone from the team will call you back.";

  const { timeZone, week } = pooled;
  const { day, minutes } = localNow(now, timeZone);
  const days = openDaysPhrase(week);
  const window = days ? ` The team answers ${days}.` : "";

  const today = week[day];
  if (today && minutes >= minutesOf(today.opens) && minutes < minutesOf(today.closes)) {
    return "Someone will call you back today.";
  }
  if (today && minutes < minutesOf(today.opens)) {
    return `The team will call you first thing this morning.${window}`;
  }

  for (let ahead = 1; ahead <= 7; ahead += 1) {
    const next = week[(day + ahead) % 7];
    if (!next) continue;
    const when = ahead === 1 ? "tomorrow" : WEEKDAY_NAME[(day + ahead) % 7];
    return `The team will call you back ${when}, the next day they're open.${window}`;
  }

  // Confirmed as never open. Nonsense, but not worth a wrong promise.
  return "Someone from the team will call you back.";
}

/* ------------------------------------------------------------------ */
/* Reading the visitor                                                 */
/* ------------------------------------------------------------------ */

const YES = /\b(yes|yep|yeah|yup|correct|right|that'?s right|sure|ok|okay|sounds good|please do|go ahead|do it|confirmed?)\b/;
const NO = /\b(no|nope|nah|wrong|incorrect|that'?s wrong|not right)\b/;

/**
 * "I'd rather not." §5: let them leave. Kept separate from a plain "no",
 * because "no" at the read-back means the number is wrong, not that the
 * visitor wants out.
 */
const DECLINE =
  /\b(rather not|prefer not|don'?t want to|do not want to|not comfortable|no thanks|no thank you|not right now|maybe later|i'?ll pass|skip it|stop asking|leave me alone)\b/;

const SKIP = /\b(skip|whatever|any|either|doesn'?t matter|dont matter|no preference|not sure|none|n\/a|pass)\b/;

/**
 * Pull the phone-shaped run out of the message, not the message itself.
 *
 * People answer the read-back with "actually it's (615) 555-4321", and storing
 * that whole sentence in the `phone` column produces a lead nobody can dial —
 * which is the exact failure §5's read-back exists to catch, reintroduced one
 * step later. Formatting inside the run stays the visitor's.
 */
function extractPhone(message: string): string | null {
  // The leading "(" is part of the number as people write it — dropping it
  // leaves "615) 555-4321" in the notification email.
  const candidates = message.match(/\+?\(?\d[\d\s().+-]{7,}\d/g);
  if (!candidates) return null;
  for (const candidate of candidates) {
    const trimmed = candidate.trim();
    const digits = trimmed.replace(/\D/g, "");
    if (digits.length >= 10 && digits.length <= 15) return trimmed.slice(0, 40);
  }
  return null;
}

/** First name only — the form asks for one, so the assistant does too. */
function extractFirstName(message: string): string | null {
  const cleaned = message
    .trim()
    .replace(/^(my name'?s?|my name is|i'?m|im|it'?s|this is|call me)\s+/i, "")
    .replace(/[.!,]+$/, "")
    .trim();
  if (cleaned.length === 0 || cleaned.length > 60) return null;
  // A sentence is not a name; take the first word of one.
  const first = cleaned.split(/\s+/)[0];
  return first.length > 0 && first.length <= 40 ? first : null;
}

function matchOption<T extends string>(
  message: string,
  options: readonly T[]
): T | null {
  const text = normalize(message);
  for (const option of options) {
    if (text.includes(normalize(option))) return option;
  }
  return null;
}

function matchHelpingWho(message: string): string | null {
  const text = normalize(message);
  if (/\b(my (child|kid|son|daughter)|my kids|for my (child|kid|son|daughter)|child|kid|son|daughter)\b/.test(text)) {
    return "My child";
  }
  if (/\b(myself|me|for me|i am|i'?m the one)\b/.test(text)) return "Myself";
  if (/\b(someone else|my (wife|husband|partner|mom|mother|dad|father|friend|parent)|a friend)\b/.test(text)) {
    return "Someone else";
  }
  return matchOption(message, HELPING_OPTIONS);
}

/** Does this message ask to start the callback flow? */
export function wantsBooking(message: string, offered: boolean): boolean {
  const text = normalize(message);
  if (
    /\b(book|schedule|set (it|one|that|this) up|sign me up|call me|give me a call|i'?d like a call|request a call|talk to someone|speak to someone|have someone call)\b/.test(
      text
    )
  ) {
    return true;
  }
  // A bare "yes" only starts the flow when the assistant just offered.
  return offered && YES.test(text) && !DECLINE.test(text);
}

/* ------------------------------------------------------------------ */
/* Copy                                                                */
/* ------------------------------------------------------------------ */

/**
 * One question per turn — §5, and the reason each of these is a single
 * sentence ending in one question mark. Do not stack a second ask into any of
 * them.
 */
const ASK = {
  helpingWho:
    "Happy to set that up. First — who are we helping: your child, yourself, or someone else?",
  firstName: "Got it. What’s your first name?",
  phone: (name: string) =>
    `Thanks, ${name}. What’s the best phone number to reach you on?`,
  // §4.3 — asked once, in their own words, and never followed up on.
  note: "And in your own words, what’s going on? (A sentence is plenty — or say skip.)",
  bestTime:
    "When’s the best time to call — mornings, afternoons, or evenings? (Or skip.)",
  preferredCenter:
    "Last one: Nashville, Murfreesboro, or the Franklin waitlist? (Or skip.)",
};

const CONTACT_PAGE_EXIT =
  "That’s completely fine — I won’t ask again. If you’d rather reach out in your own time, the contact page has the form and the phone number: /contact";

/* ------------------------------------------------------------------ */
/* The flow                                                            */
/* ------------------------------------------------------------------ */

/** True while the flow is mid-collection and owed an answer. */
export function bookingActive(session: ChatSession): boolean {
  return (
    session.step !== "idle" &&
    session.step !== "submitted" &&
    session.step !== "declined"
  );
}

/**
 * The question the visitor still owes an answer to.
 *
 * Used when a §3 refusal interrupts the flow: the decline is stated, then this
 * is re-asked, so the turn still ends on exactly one question and the visitor
 * isn't left guessing what the assistant is waiting for.
 */
export function pendingQuestion(session: ChatSession): string | null {
  switch (session.step) {
    case "helpingWho":
      return ASK.helpingWho;
    case "firstName":
      return ASK.firstName;
    case "phone":
      return ASK.phone(session.draft.firstName ?? "");
    case "note":
      return ASK.note;
    case "bestTime":
      return ASK.bestTime;
    case "preferredCenter":
      return ASK.preferredCenter;
    case "confirmPhone":
      return "What’s the right number?";
    case "confirm":
      return readBack(session.draft);
    default:
      return null;
  }
}

/** Opens the flow. Returns null when §4.2 forbids collecting contact details. */
export function startBooking(session: ChatSession): BookingTurn | null {
  if (!contactCollectionAllowed(session)) return null;
  session.step = "helpingWho";
  session.draft = {};
  return { reply: ASK.helpingWho };
}

/**
 * One turn of the flow.
 *
 * The caller has already run §4 (safety) and §3 (refusals); this is only
 * reached when neither fired, which is what keeps a crisis disclosure from
 * being read as an answer to "what's going on?".
 */
export function advanceBooking(
  session: ChatSession,
  message: string,
  sourcePage: string | null
): BookingTurn {
  const text = normalize(message);
  const draft: BookingDraft = session.draft;

  // §5: let them leave. Applies at every required step, and at the read-back.
  if (DECLINE.test(text) && session.step !== "note" && session.step !== "bestTime" && session.step !== "preferredCenter") {
    session.step = "declined";
    session.draft = {};
    return { reply: CONTACT_PAGE_EXIT };
  }

  switch (session.step) {
    case "helpingWho": {
      const helping = matchHelpingWho(message);
      if (!helping) {
        return {
          reply:
            "Sorry — is this for your child, for yourself, or for someone else?",
        };
      }
      draft.helpingWho = helping;
      session.step = "firstName";
      return { reply: ASK.firstName };
    }

    case "firstName": {
      const name = extractFirstName(message);
      if (!name) {
        return { reply: "Sorry, I missed that — what’s your first name?" };
      }
      draft.firstName = name;
      session.step = "phone";
      return { reply: ASK.phone(name) };
    }

    case "phone": {
      const phone = extractPhone(message);
      if (!phone) {
        return {
          reply:
            "That doesn’t look like a phone number I can dial — could you type it again, digits and all?",
        };
      }
      draft.phone = phone;
      session.step = "note";
      return { reply: ASK.note };
    }

    case "note": {
      // §4.3: whatever they wrote is the note. No follow-up, no clarifying
      // question, nothing asked about symptoms, severity, or history.
      if (!SKIP.test(text) && !DECLINE.test(text)) {
        draft.note = message.trim().slice(0, 2000);
      }
      session.step = "bestTime";
      return { reply: ASK.bestTime };
    }

    case "bestTime": {
      const time = matchOption(message, TIME_OPTIONS);
      if (time) draft.bestTime = time;
      session.step = "preferredCenter";
      return { reply: ASK.preferredCenter };
    }

    case "preferredCenter": {
      const center = matchOption(message, CENTER_OPTIONS);
      if (center) draft.preferredCenter = center;
      session.step = "confirm";
      return { reply: readBack(draft) };
    }

    // Re-asking the number after a failed read-back. A separate step from
    // `phone` so a correction returns straight to the confirmation — routing
    // it back through `phone` would ask "what's going on?" a second time,
    // which §4.3 says happens exactly once.
    case "confirmPhone": {
      const phone = extractPhone(message);
      if (!phone) {
        return {
          reply:
            "Sorry — could you type the number again, digits and all?",
        };
      }
      draft.phone = phone;
      session.step = "confirm";
      return { reply: readBack(draft) };
    }

    case "confirm": {
      // A corrected number can arrive instead of a yes/no — take it, even when
      // the message also says yes ("yes but it's 615-555-9999" must not submit
      // the number being corrected).
      const corrected = extractPhone(message);
      if (corrected && corrected !== draft.phone) {
        draft.phone = corrected;
        return { reply: readBack(draft) };
      }
      if (NO.test(text) && !YES.test(text)) {
        session.step = "confirmPhone";
        return { reply: "No problem — what’s the right number?" };
      }
      if (!YES.test(text)) {
        return { reply: readBack(draft) };
      }
      if (!draft.helpingWho || !draft.firstName || !draft.phone) {
        // Cannot happen from this state machine; if it ever does, the honest
        // move is the contact page rather than a half-empty lead.
        session.step = "declined";
        return { reply: CONTACT_PAGE_EXIT };
      }
      session.step = "submitted";
      return {
        reply: "",
        submit: {
          type: "consultation",
          source: "chat",
          helping_who: draft.helpingWho,
          first_name: draft.firstName,
          phone: draft.phone,
          note: draft.note ?? null,
          best_time: draft.bestTime ?? null,
          preferred_center: draft.preferredCenter ?? null,
          source_page: sourcePage,
        },
      };
    }

    default:
      return { reply: CONTACT_PAGE_EXIT };
  }
}

/** §5: read the name and number back and wait for a yes. */
function readBack(draft: BookingDraft): string {
  return `Let me read that back: ${draft.firstName}, ${draft.phone}. Have I got that right?`;
}

/** Sent after /api/consultation accepts the row. */
export function bookingSuccessReply(name: string, now: Date = new Date()): string {
  return `You’re all set, ${name}. ${callbackExpectation(now)}`;
}

/** Sent when /api/consultation fails. §5: be honest, point at the contact page. */
export const BOOKING_FAILURE_REPLY =
  "Something went wrong on our end and your request didn’t save — I’d rather tell you than leave you waiting on a call that isn’t coming. The contact page will get it to us: /contact";
