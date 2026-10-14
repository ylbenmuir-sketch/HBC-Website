import type { BookingDraft, BookingStep, ChatSession } from "./session";
import { contactCollectionAllowed } from "./session";
import { normalize } from "./refusals";
import {
  CENTER_BUTTONS,
  CONFIRM_BUTTONS,
  FIX_BUTTONS,
  TIME_BUTTONS,
  extractEmail,
  extractName,
  extractPhone,
  formatPhone,
  isFullName,
  matchBestTime,
  matchCenter,
  matchConfirm,
  matchFixField,
  mentionsFranklin,
  type CenterValue,
} from "./booking-parse";
import { CHAT_CONSENT_QUESTION } from "../sms-consent";
import { PHONE_DISPLAY } from "../site-config";
import { firstName } from "../first-name";
import { capitalizeName } from "../name-case";

/**
 * The callback request (phase-8-chatbot.md §5), rebuilt to six steps (Ben,
 * 2026-10-14):
 *
 *   1. "What's your name and the best number to reach you?" — both from one
 *      reply; whichever is missing is asked for alone. First AND last name.
 *   2. "What email should we send your confirmation to?" — required; an
 *      invalid one is asked again with an example.
 *   3. "Which center?" — buttons: Nashville · Murfreesboro · Come to me ·
 *      Not sure, stored as Nashville / Murfreesboro / Concierge / Not sure.
 *      A typed answer is matched to the closest (typos too), or the buttons
 *      come back. Free-typed center text is never stored.
 *   4. "Who's this for, and what's going on? A sentence is plenty." — into
 *      the same columns the form's step two uses (helping_who, note).
 *   5. "Best time to call?" — buttons: Morning · Afternoon · Any time.
 *   6. The read-back and the text-consent question in ONE message — buttons:
 *      Yes, text me · No, just call · Fix something. "Fix something" asks
 *      what to change, changes it, and shows step 6 again.
 *
 * A state machine, and deliberately not a model. The model's job is answering
 * from site content; collecting a name and a phone number is a form, and a
 * form that a model improvises is a form that will one day ask a seventh
 * question, skip the read-back, or invent a callback time. Every question, its
 * order, and the confirmation step are fixed here in code.
 *
 * `advanceBooking()` is pure: it takes a session and a message and returns the
 * reply plus, when the flow is ready, the payload to submit. It performs no
 * network call — app/api/chat/route.ts calls the consultation handler, and
 * only says "you're all set" when that handler returns a saved row id.
 * The buttons are a function of the step (`bookingButtons()`), so a re-asked
 * question after a refusal or an hours answer carries its buttons too.
 *
 * The reading of answers — names, numbers, emails, centers, times, the
 * read-back's yes/no/fix — is lib/chat/booking-parse.ts, import-free and
 * unit-tested (lib/chat-booking-parse.test.mjs).
 */

export type BookingSubmission = {
  type: "consultation";
  source: "chat";
  /** Null when step 4's answer named nobody we could place. */
  helping_who: string | null;
  /** The full name, first and last. The route capitalizes it on save. */
  first_name: string;
  phone: string;
  email: string;
  note: string | null;
  best_time: string;
  preferred_center: CenterValue;
  source_page: string | null;
  /** True only after "Yes, text me" (or a typed yes) at step 6. */
  sms_consent: boolean;
  /** The consent question exactly as asked, yes or no. */
  sms_consent_text: string;
};

export type BookingTurn = {
  reply: string;
  /** Present only when the visitor has answered the read-back. */
  submit?: BookingSubmission;
};

/* ------------------------------------------------------------------ */
/* Reading the visitor                                                 */
/* ------------------------------------------------------------------ */

const YES = /\b(yes|yep|yeah|yup|correct|right|that'?s right|sure|ok|okay|sounds good|please do|go ahead|do it|confirmed?)\b/;

/**
 * "I'd rather not." §5: let them leave — at the steps that ask for contact
 * details. Not at the read-back, where "no thanks" means "no texts", and not
 * at the steps that have a "not sure" or "any time" to fall back on.
 */
const DECLINE =
  /\b(rather not|prefer not|don'?t want to|do not want to|not comfortable|no thanks|no thank you|not right now|maybe later|i'?ll pass|skip it|stop asking|leave me alone)\b/;

/** An answer that declines to answer — and only that. */
const EXPLICIT_SKIP = /\b(skip|pass|n\/a|none)\b/;

/** Step 4: who the call is for, when the sentence says. Child first ("my son
 *  and I…" is about the son), then someone else, then the visitor. */
function matchHelpingWho(message: string): string | null {
  const text = normalize(message);
  if (/\b(my (child|kid|kids|son|daughter|boy|girl|teen|teenager|toddler|grandson|granddaughter)|child|kid|kids|son|daughter|teen|teenager|grandson|granddaughter)\b/.test(text)) {
    return "My child";
  }
  if (/\b(someone else|my (wife|husband|partner|spouse|mom|mother|dad|father|friend|parent|parents|brother|sister|grandma|grandmother|grandpa|grandfather|aunt|uncle|fiance|fiancee|boyfriend|girlfriend)|a friend|for a friend)\b/.test(text)) {
    return "Someone else";
  }
  if (/\b(myself|me|i|i'?m|i'?ve|i am|i have|my own)\b/.test(text)) return "Myself";
  return null;
}

/** Collapse whitespace; keep her capitalization and her punctuation. */
function verbatim(message: string, maxLength: number): string | null {
  const raw = message.trim().replace(/\s+/g, " ").slice(0, maxLength).trim();
  return raw.length > 0 ? raw : null;
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

/** "Ben" from whatever she typed, capitalized the way the row will be. */
function greet(draft: BookingDraft): string {
  return firstName(capitalizeName(draft.fullName ?? ""));
}

/**
 * One question per turn — §5. The six questions are Ben's words; the
 * re-asks around them are the shortest way to get the missing piece.
 */
const ASK = {
  contact: "What’s your name and the best number to reach you?",
  contactAgain:
    "Sorry, I didn’t catch that — what’s your full name and the best number to reach you?",
  phoneOnly: (name: string) =>
    `Thanks${name ? `, ${name}` : ""}. What’s the best number to reach you?`,
  phoneShort: "That number looks short — could you type all ten digits?",
  nameOnly: "Got it. And your full name — first and last?",
  lastName: (name: string) => `Thanks, ${name} — and your last name?`,
  email: "What email should we send your confirmation to?",
  emailAgain:
    "That doesn’t look like an email address — could you type it again, like name@gmail.com?",
  center: "Which center?",
  centerAgain: "Sorry, I didn’t catch that — which center? Tap one below.",
  centerFranklin:
    "Our Franklin center isn’t open yet — Nashville and Murfreesboro are open now, or we can come to you. Which center?",
  note: "Who’s this for, and what’s going on? A sentence is plenty.",
  bestTime: "Best time to call?",
  bestTimeAgain: "Sorry — morning, afternoon, or any time? Tap one below.",
  fix: "No problem — what would you like to change?",
  fixAgain: "Which part — your name, phone, email, center, or best time?",
  fixName: "What’s your full name — first and last?",
  fixNameAgain: "Could you give me your first and last name?",
  fixPhone: "What’s the right number?",
  fixPhoneAgain: "Sorry — could you type the number again, all ten digits?",
  fixEmail: "What’s the right email?",
  fixCenter: "Which center?",
  fixTime: "Best time to call?",
};

const CONTACT_PAGE_EXIT =
  "That’s completely fine — I won’t ask again. If you’d rather reach out in your own time, the contact page has the form and the phone number: /contact";

/**
 * Step 6: the read-back and the consent question, one message (Ben). The
 * phone is shown formatted, "(615) 555-1234", whatever she typed.
 */
function readBack(draft: BookingDraft): string {
  const name = capitalizeName(draft.fullName ?? "");
  const phone = formatPhone(draft.phone ?? "");
  return `Here’s what I have: ${name}, ${phone}, ${draft.email}, ${draft.preferredCenter}, ${draft.bestTime}. ${CHAT_CONSENT_QUESTION}`;
}

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

/** The tappable answers for the step she is on, or none. */
export function bookingButtons(step: BookingStep): string[] | undefined {
  switch (step) {
    case "center":
    case "fixCenter":
      return [...CENTER_BUTTONS];
    case "bestTime":
    case "fixTime":
      return [...TIME_BUTTONS];
    case "confirm":
      return [...CONFIRM_BUTTONS];
    case "fix":
      return [...FIX_BUTTONS];
    default:
      return undefined;
  }
}

/**
 * The question the visitor still owes an answer to.
 *
 * Used when a §3 refusal interrupts the flow: the decline is stated, then this
 * is re-asked, so the turn still ends on exactly one question and the visitor
 * isn't left guessing what the assistant is waiting for.
 */
export function pendingQuestion(session: ChatSession): string | null {
  const draft = session.draft;
  switch (session.step) {
    case "contact":
      if (draft.fullName && !draft.phone) return ASK.phoneOnly(greet(draft));
      if (draft.phone && !draft.fullName) return ASK.nameOnly;
      if (draft.fullName && !isFullName(draft.fullName)) return ASK.lastName(greet(draft));
      return ASK.contact;
    case "email":
      return ASK.email;
    case "center":
      return ASK.center;
    case "note":
      return ASK.note;
    case "bestTime":
      return ASK.bestTime;
    case "confirm":
      return readBack(draft);
    case "fix":
      return ASK.fixAgain;
    case "fixName":
      return ASK.fixName;
    case "fixPhone":
      return ASK.fixPhone;
    case "fixEmail":
      return ASK.fixEmail;
    case "fixCenter":
      return ASK.fixCenter;
    case "fixTime":
      return ASK.fixTime;
    default:
      return null;
  }
}

/** Opens the flow. Returns null when §4.2 forbids collecting contact details. */
export function startBooking(session: ChatSession): BookingTurn | null {
  if (!contactCollectionAllowed(session)) return null;
  session.step = "contact";
  session.draft = {};
  return { reply: ASK.contact };
}

/** Back to step 6 after a fix. */
function backToConfirm(session: ChatSession): BookingTurn {
  session.step = "confirm";
  return { reply: readBack(session.draft) };
}

/**
 * Step 1, any turn of it: take whatever this message adds, then ask for
 * exactly what is still missing.
 */
function collectContact(session: ChatSession, message: string): BookingTurn {
  const draft = session.draft;
  const phone = extractPhone(message);
  const name = extractName(message);

  if (phone) draft.phone = phone;
  if (name) {
    // "Ben" then, asked for a last name, "Muir": one name, not a new one.
    draft.fullName =
      draft.askedLastName && draft.fullName && !isFullName(name) && !isFullName(draft.fullName)
        ? `${draft.fullName} ${name}`
        : name;
  }

  if (!draft.phone) {
    const digits = message.replace(/\D/g, "").length;
    if (digits >= 5) return { reply: ASK.phoneShort };
    if (draft.fullName) return { reply: ASK.phoneOnly(greet(draft)) };
    return { reply: ASK.contactAgain };
  }
  if (!draft.fullName) return { reply: ASK.nameOnly };
  if (!isFullName(draft.fullName)) {
    draft.askedLastName = true;
    return { reply: ASK.lastName(greet(draft)) };
  }
  delete draft.askedLastName;
  session.step = "email";
  return { reply: ASK.email };
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

  // §5: let them leave — at the steps that ask for contact details. The
  // other steps have a neutral answer to fall back on instead, and at the
  // read-back "no thanks" means no texts (consent is never a condition).
  if (DECLINE.test(text) && (session.step === "contact" || session.step === "email")) {
    session.step = "declined";
    session.draft = {};
    return { reply: CONTACT_PAGE_EXIT };
  }

  switch (session.step) {
    case "contact":
      return collectContact(session, message);

    case "email": {
      const email = extractEmail(message);
      if (!email) return { reply: ASK.emailAgain };
      draft.email = email;
      session.step = "center";
      return { reply: ASK.center };
    }

    case "center": {
      const center =
        matchCenter(message) ??
        (EXPLICIT_SKIP.test(text) || DECLINE.test(text) ? "Not sure" : null);
      if (!center) {
        return { reply: mentionsFranklin(message) ? ASK.centerFranklin : ASK.centerAgain };
      }
      draft.preferredCenter = center;
      session.step = "note";
      return { reply: ASK.note };
    }

    case "note": {
      // §4.3: whatever they wrote is the note. No follow-up, no clarifying
      // question, nothing asked about symptoms, severity, or history.
      const skipped = EXPLICIT_SKIP.test(text) || DECLINE.test(text);
      const note = skipped ? null : verbatim(message, 2000);
      if (note) draft.note = note;
      const helping = skipped ? null : matchHelpingWho(message);
      if (helping) draft.helpingWho = helping;
      session.step = "bestTime";
      return { reply: ASK.bestTime };
    }

    case "bestTime": {
      const time =
        matchBestTime(message) ??
        (EXPLICIT_SKIP.test(text) || DECLINE.test(text) ? "Any time" : null);
      if (!time) return { reply: ASK.bestTimeAgain };
      draft.bestTime = time;
      return backToConfirm(session);
    }

    case "confirm": {
      // A corrected number or address typed instead of a button — take it
      // and read back again, even when the message also says yes ("yes but
      // it's 615-555-9999" must not submit the number being corrected).
      const phone = extractPhone(message);
      const email = extractEmail(message);
      if ((phone && phone !== draft.phone) || (email && email !== draft.email)) {
        if (phone) draft.phone = phone;
        if (email) draft.email = email;
        return backToConfirm(session);
      }
      const answer = matchConfirm(message);
      if (answer === "fix") {
        session.step = "fix";
        return { reply: ASK.fix };
      }
      if (answer === null) return { reply: readBack(draft) };
      return submitDraft(session, answer === "yes", sourcePage);
    }

    case "fix": {
      // Straight to the change when the message carries it ("my email is
      // x@y.com", "Murfreesboro instead"); otherwise ask for the new value.
      const phone = extractPhone(message);
      const email = extractEmail(message);
      if (phone || email) {
        if (phone) draft.phone = phone;
        if (email) draft.email = email;
        return backToConfirm(session);
      }
      const field = matchFixField(message);
      if (field === "center") {
        const center = matchCenter(message);
        if (center) {
          draft.preferredCenter = center;
          return backToConfirm(session);
        }
        session.step = "fixCenter";
        return { reply: ASK.fixCenter };
      }
      if (field === "bestTime") {
        const time = matchBestTime(message);
        if (time) {
          draft.bestTime = time;
          return backToConfirm(session);
        }
        session.step = "fixTime";
        return { reply: ASK.fixTime };
      }
      if (field === "name") {
        const name = extractName(message);
        if (name && isFullName(name)) {
          draft.fullName = name;
          return backToConfirm(session);
        }
        session.step = "fixName";
        return { reply: ASK.fixName };
      }
      if (field === "phone") {
        session.step = "fixPhone";
        return { reply: ASK.fixPhone };
      }
      if (field === "email") {
        session.step = "fixEmail";
        return { reply: ASK.fixEmail };
      }
      // "Never mind" / "it's fine" — back to the read-back.
      if (DECLINE.test(text) || matchConfirm(message) === "yes") return backToConfirm(session);
      return { reply: ASK.fixAgain };
    }

    case "fixName": {
      if (DECLINE.test(text)) return backToConfirm(session);
      const name = extractName(message);
      if (!name || !isFullName(name)) return { reply: ASK.fixNameAgain };
      draft.fullName = name;
      return backToConfirm(session);
    }

    case "fixPhone": {
      if (DECLINE.test(text)) return backToConfirm(session);
      const phone = extractPhone(message);
      if (!phone) return { reply: ASK.fixPhoneAgain };
      draft.phone = phone;
      return backToConfirm(session);
    }

    case "fixEmail": {
      if (DECLINE.test(text)) return backToConfirm(session);
      const email = extractEmail(message);
      if (!email) return { reply: ASK.emailAgain };
      draft.email = email;
      return backToConfirm(session);
    }

    case "fixCenter": {
      if (DECLINE.test(text)) return backToConfirm(session);
      const center = matchCenter(message);
      if (!center) {
        return { reply: mentionsFranklin(message) ? ASK.centerFranklin : ASK.centerAgain };
      }
      draft.preferredCenter = center;
      return backToConfirm(session);
    }

    case "fixTime": {
      if (DECLINE.test(text)) return backToConfirm(session);
      const time = matchBestTime(message);
      if (!time) return { reply: ASK.bestTimeAgain };
      draft.bestTime = time;
      return backToConfirm(session);
    }

    default:
      // A conversation saved mid-way through the flow before it was rebuilt
      // (2026-10-14) carries a step this version does not have. Start over
      // rather than guess what its draft means.
      session.step = "contact";
      session.draft = {};
      return { reply: ASK.contact };
  }
}

/** Step 6 answered: the payload, or the contact page if the draft is short. */
function submitDraft(
  session: ChatSession,
  smsConsent: boolean,
  sourcePage: string | null
): BookingTurn {
  const draft = session.draft;
  if (!draft.fullName || !draft.phone || !draft.email || !draft.preferredCenter || !draft.bestTime) {
    // Cannot happen from this state machine; if it ever does, the honest
    // move is the contact page rather than a half-empty lead.
    session.step = "declined";
    return { reply: CONTACT_PAGE_EXIT };
  }
  draft.smsConsent = smsConsent;
  session.step = "submitted";
  return {
    reply: "",
    submit: {
      type: "consultation",
      source: "chat",
      helping_who: draft.helpingWho ?? null,
      first_name: draft.fullName,
      phone: draft.phone,
      email: draft.email,
      note: draft.note ?? null,
      best_time: draft.bestTime,
      preferred_center: draft.preferredCenter,
      source_page: sourcePage,
      sms_consent: smsConsent,
      sms_consent_text: CHAT_CONSENT_QUESTION,
    },
  };
}

/**
 * Sent only after /api/consultation returns a saved row id. Never "today":
 * no timing promise at all (Ben, 2026-10-14). A center she chose is named;
 * Concierge and "Not sure" are "our team".
 */
export function bookingSuccessReply(submission: BookingSubmission): string {
  const name = firstName(capitalizeName(submission.first_name));
  const center = submission.preferred_center;
  const who =
    center === "Nashville" || center === "Murfreesboro"
      ? `Someone from our ${center} center`
      : "Someone from our team";
  return `You’re all set, ${name}. ${who} will call you soon.`;
}

/** Sent when /api/consultation did not save the request. §5: be honest. The
 *  phone number leads, because when the save is failing the contact page,
 *  which saves the same way, may fail with it (Ben, 2026-10-14). */
export const BOOKING_FAILURE_REPLY =
  `Something went wrong on our end and your request didn’t save — I’d rather tell you than leave you waiting on a call that isn’t coming. Please call us at ${PHONE_DISPLAY} and we’ll take it down over the phone, or try the contact page: /contact`;
