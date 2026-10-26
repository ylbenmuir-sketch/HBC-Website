// Inquiry intake — website → platform.
//
// The second destination for a contact-form submission. The first is the
// Supabase row + the "go look" email in lib/lead-notification.ts, and that
// path is UNCHANGED: Ben is running both in parallel for a few weeks, so
// nothing here may weaken or replace it. This POST is *in addition*.
//
// Wire contract: hbc-platform/context/reference/inquiry-intake-contract.md
// (platform side: backend/api/src/routes/inquiries-public.ts). The two files
// change together — if a field name here stops matching that document, the
// platform answers 400 and the front desk stops seeing inquiries.
//
// ── THE SECRET ────────────────────────────────────────────────────────────
// INQUIRY_INTAKE_SECRET is read here, in a Node route handler, and travels no
// further than the outbound request header. It has NO NEXT_PUBLIC_ prefix, is
// never returned to the browser, never logged, and never committed. Ben sets
// its value in Vercel; it must match the value set on the platform API. That
// is the whole reason the browser posts to /api/consultation instead of
// posting to the platform directly.
//
// ── THE PHI WALL ──────────────────────────────────────────────────────────
// What a visitor submits is health information about a real person, usually a
// child. Nothing from the body reaches a log line, a URL, or a third party.
// Every console call below prints shape only — an outcome, a status code, a
// count. The platform's own error bodies are safe to log verbatim because the
// contract guarantees they name fields and never echo values.

import { contactMethodLabel } from "./contact-method";

/** The visitor is waiting on this request. A hung platform must not hold the
 *  form open — the Supabase row is already committed by the time we get here,
 *  so giving up costs nothing but this one delivery. */
const INTAKE_TIMEOUT_MS = 5000;

const INTAKE_PATH = "/api/public/inquiries";

/** Site label → governed token (contract §JSON body). The site's copy is free
 *  to change; these three tokens are not. */
const WHO_FOR_TOKENS: Record<string, string> = {
  "My child": "my_child",
  Myself: "myself",
  "Someone else": "someone_else",
};

/** Site label → governed concern token (contract §Concern tokens). The
 *  platform refuses an unknown token outright, so anything not on this list is
 *  dropped from the forward rather than being allowed to 400 the whole
 *  submission — the full set is still on the Supabase row either way. */
const CONCERN_TOKENS: Record<string, string> = {
  "Focus & ADHD": "focus_adhd",
  "Anxiety & stress": "anxiety_stress",
  Sleep: "sleep",
  "Emotional regulation": "emotional_regulation",
  "School struggles": "school_struggles",
  "Brain fog": "brain_fog",
  "Something else": "something_else",
};

/** Both required fields the assistant can legitimately arrive without: a typed
 *  conversation lets a visitor skip or decline either question, but the
 *  contract requires a non-empty string for both. These say "she didn't say"
 *  in words the front desk can read, rather than inventing an answer. */
const CENTER_UNSPECIFIED = "Not sure yet";
const TIME_UNSPECIFIED = "Not specified";

/**
 * ── WHO-FOR, WHEN IT HAS NOT BEEN ASKED YET ──────────────────────────────
 * The contact form saves and forwards the lead at its first step, before it
 * asks who the call is for (components/ContactForm.tsx). The contract's
 * `whoFor` is a strict three-value enum with no "not given" member and an
 * unknown value is a 400 — nothing stored — so a form lead cannot wait on
 * that answer and cannot send the honest token either. Ben's call
 * (2026-10-13): forward on step one anyway and flag the field. So the
 * forward carries this stand-in token and the first line of `message` says,
 * in words, that who-for was not given and will be asked on the call. The
 * honest fix is platform-side — a `not_given` member on INQUIRY_WHO_FOR
 * (additions are allowed there) — and the day it exists this constant is
 * the only thing to change.
 *
 * `someone_else` rather than `myself`: a card that says "someone else"
 * prompts the desk to ask; one that says "myself" presumes.
 */
export const WHO_FOR_STAND_IN = "someone_else";
export const WHO_FOR_NOT_GIVEN_LINE =
  "[Who the call is for: NOT GIVEN on the form — asked after the callback is saved. Confirm on the call.]";

/**
 * ── STEP TWO IS A SECOND POST, LABELLED ──────────────────────────────────
 * The contract has no update endpoint and the 201 carries no id, so what
 * the visitor adds in the form's optional second step cannot be patched
 * onto the inquiry already filed. It is posted again with this as the first
 * line of `message`, so the Follow-ups screen shows a second card that says
 * what it is. Two cards per enriched lead is the platform's limitation,
 * not a reason to drop the answers; an update door is the fix.
 */
export const UPDATE_LINE =
  "[UPDATE — not a new lead. The same person added who the call is for, concerns or a note after requesting the call.]";

/**
 * ── TEXT CONSENT ─────────────────────────────────────────────────────────
 * The contract has no field for it, and the front desk can text from the
 * platform. So a lead who did NOT agree to texts carries this line, ahead of
 * her own words; one who agreed carries nothing extra (texting is then
 * allowed, and the consent itself is on the saved request).
 */
export const NO_TEXT_CONSENT_LINE =
  "[Texts: NO consent to text this number. Call or email only.]";

export type InquiryForward = {
  /** Null when the form has not asked yet — see WHO_FOR_STAND_IN. */
  helpingWho: string | null;
  concerns: string[];
  /** The contract's key. Carries the whole name as the form collected it
   *  (first and last, one field) — the platform stores it; nothing here
   *  splits it. */
  firstName: string;
  phone: string;
  email: string | null;
  preferredCenter: string | null;
  bestTime: string | null;
  /** "Best way to reach you" (call/text/email, lib/consultation.ts); rides in
   *  `message` as a labelled first line. Absent for the chat. */
  contactMethod?: string | null;
  note: string | null;
  /** "Who referred you?" (form step two). The contract has no field for it,
   *  so it rides in the message as a labelled line — ahead of her note, so
   *  the 2,000-character cap can only ever cut the note. */
  referredBy?: string | null;
  /** "How did you hear about us?" (form step two, lib/lead-options.ts) —
   *  a labelled line, like the referral. */
  heardAbout?: string | null;
  /** The honeypot, verbatim. Humans leave it empty; the platform stores a
   *  non-empty one flagged as spam and still answers 201, so a bot learns
   *  nothing from the response. Never used to reject anything here. */
  website: string | null;
  /** True when this is the form's second step re-posting an inquiry already
   *  filed — see UPDATE_LINE. */
  update?: boolean;
  /** Whether she agreed to texts — see NO_TEXT_CONSENT_LINE. */
  smsConsent: boolean;
};

export type InquiryForwardResult =
  | { ok: true }
  | { ok: false; reason: "unconfigured" | "unmappable" | "refused" | "unreachable" };

function cap(value: string, max: number): string {
  return value.length <= max ? value : value.slice(0, max);
}

/**
 * Build the wire body. Returns null only when the submission cannot satisfy
 * the contract's required fields at all (a guide signup, or a `helping_who`
 * that is given but outside the governed three) — those are not inquiries
 * and must not be sent. A missing `helping_who` is not that case: it is the
 * form's first step, and it forwards with the stand-in (see above).
 */
function buildBody(input: InquiryForward): Record<string, unknown> | null {
  const whoFor = input.helpingWho === null ? WHO_FOR_STAND_IN : WHO_FOR_TOKENS[input.helpingWho];
  if (!whoFor) return null;

  const firstName = input.firstName.trim();
  const phone = input.phone.trim();
  if (!firstName || !phone) return null;

  // Map, drop unknowns, de-duplicate — the contract refuses both an unknown
  // token and a repeat, and caps the array at the size of the governed list.
  const concerns = [
    ...new Set(
      input.concerns
        .map((label) => CONCERN_TOKENS[label])
        .filter((token): token is string => Boolean(token))
    ),
  ];

  const body: Record<string, unknown> = {
    whoFor,
    firstName: cap(firstName, 100),
    phone: cap(phone, 40),
    preferredCenter: cap(input.preferredCenter?.trim() || CENTER_UNSPECIFIED, 100),
    bestTimeToCall: cap(input.bestTime?.trim() || TIME_UNSPECIFIED, 100),
    concerns,
    // Present-and-empty is the honest human signal; the key is always sent.
    website: input.website ?? "",
  };

  // Optional keys are omitted rather than sent null — the schema is .strict()
  // and types these as string-or-absent.
  const email = input.email?.trim();
  if (email) body.email = cap(email, 200);

  // The flag lines come first, then her words. Capped as a whole at the
  // contract's limit; the lines are short enough that her note is what gets
  // cut, and only in the last few dozen characters of a 2,000-character one.
  const message = [
    input.update ? UPDATE_LINE : null,
    input.helpingWho === null ? WHO_FOR_NOT_GIVEN_LINE : null,
    input.smsConsent ? null : NO_TEXT_CONSENT_LINE,
    contactMethodLabel(input.contactMethod) ? `Best way to reach them: ${contactMethodLabel(input.contactMethod)}` : null,
    input.referredBy?.trim() ? `Referred by: ${input.referredBy.trim()}` : null,
    input.heardAbout?.trim() ? `Heard about us: ${input.heardAbout.trim()}` : null,
    input.note?.trim() || null,
  ]
    .filter((line): line is string => line !== null)
    .join("\n\n");
  if (message) body.message = cap(message, 2000);

  return body;
}

/** The "off" line is logged once per server instance, not once per lead. */
let loggedUnconfigured = false;

/**
 * Deliver one inquiry to the platform. NEVER throws and never rejects: every
 * caller runs after the Supabase row is committed, so the visitor's submission
 * is already safe and the response she sees must not depend on this.
 */
export async function forwardInquiry(
  input: InquiryForward
): Promise<InquiryForwardResult> {
  const secret = process.env.INQUIRY_INTAKE_SECRET;
  const apiBase = process.env.INQUIRY_API_BASE;

  if (!secret || !apiBase) {
    // Switched OFF on purpose (Ben, 2026-10-15): the two variables stay
    // unset until the HBC app is finished. Skip cleanly — no effect on the
    // lead, the emails or the visitor — and say so once per server
    // instance, quietly, rather than as an error on every lead. Setting both
    // variables again turns delivery back on with no other change.
    if (!loggedUnconfigured) {
      loggedUnconfigured = true;
      const missing = [
        !apiBase ? "INQUIRY_API_BASE" : null,
        !secret ? "INQUIRY_INTAKE_SECRET" : null,
      ]
        .filter(Boolean)
        .join(" and ");
      console.info(`[destination: platform] off — ${missing} not set; skipping.`);
    }
    return { ok: false, reason: "unconfigured" };
  }

  const body = buildBody(input);
  if (!body) {
    console.error(
      "[destination: platform] NOT forwarded — submission has no contract-valid " +
        "shape (who-we're-helping outside the governed three, or missing name/phone)."
    );
    return { ok: false, reason: "unmappable" };
  }

  const url = `${apiBase.replace(/\/+$/, "")}${INTAKE_PATH}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Server-side only. This header is the whole authentication.
        "x-hbc-inquiry-secret": secret,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(INTAKE_TIMEOUT_MS),
    });

    if (response.ok) return { ok: true };

    // Safe to log verbatim: the contract guarantees these bodies name a field
    // and a rule, never a submitted value.
    const detail = await response.text().catch(() => "");
    console.error(
      `[destination: platform] refused: ${response.status} ${cap(detail, 200)}`
    );
    return { ok: false, reason: "refused" };
  } catch (error) {
    // Timeout, DNS, TLS, connection refused. Shape only — an error from fetch
    // can carry the URL, and the URL is ours, but nothing from the body.
    const name = error instanceof Error ? error.name : "unknown";
    console.error(
      `[destination: platform] unreachable (${name}) — timeout, DNS, TLS, or ` +
        "connection refused. The other destinations are unaffected."
    );
    return { ok: false, reason: "unreachable" };
  }
}
