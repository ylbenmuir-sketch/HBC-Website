import { NextResponse } from "next/server";
import {
  CENTER_UNSPECIFIED,
  HELPING_OPTIONS,
  concernList,
  str,
  supabaseAdmin,
} from "@/lib/consultation";
import {
  sendGuideNotification,
  sendLeadNotification,
  type LeadDetails,
} from "@/lib/lead-notification";
import { forwardInquiry } from "@/lib/inquiry-intake";
import { sendConfirmationText } from "@/lib/sms-confirmation";
import { PHONE_DISPLAY } from "@/lib/site-config";

export const runtime = "nodejs";

/**
 * Two row shapes, one table (see the migrations):
 *   consultation — the contact form or the chat; someone is expecting a call.
 *   guide        — the "Not ready to call?" capture; an email address only.
 */
const SUBMISSION_TYPES = new Set(["consultation", "guide"]);

/**
 * Which channel the request arrived through (phase-8-chatbot.md §5). The site
 * assistant reuses this route rather than getting one of its own, so `source`
 * is the whole of what distinguishes the two. Absent means the form, which is
 * what every caller before the assistant existed was.
 */
const SUBMISSION_SOURCES = new Set(["form", "chat"]);

type Payload = {
  type?: unknown;
  source?: unknown;
  helping_who?: unknown;
  concerns?: unknown;
  first_name?: unknown;
  phone?: unknown;
  email?: unknown;
  preferred_center?: unknown;
  best_time?: unknown;
  note?: unknown;
  source_page?: unknown;
  /** The honeypot (see the read in the handler) — hidden from real visitors. */
  website?: unknown;
};

/** Deliberately loose — a sanity check, not RFC 5322. The address is proven by
 *  delivery, not by a regex, and over-strict patterns reject valid addresses. */
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/* ------------------------------------------------------------------ */
/* The destinations                                                    */
/* ------------------------------------------------------------------ */
/**
 * A submission fans out to three places, and NONE may take the others down
 * with it:
 *
 *   supabase — the row of record. Its id is returned to the form so the
 *              optional second step can add to the same row
 *              (app/api/consultation/[id]/route.ts).
 *   email    — the lead itself, routed to the chosen center's inbox. While the
 *              platform is in testing this is the one the office works from.
 *   platform — the inquiry on the front desk's Follow-ups screen.
 *
 * This used to be a chain: the insert ran first and returned 500 on failure,
 * so the day the Supabase project paused, a parent who filled in the form saw
 * an error and the platform never heard about her — though the platform was up
 * and would have taken it. Independence is the fix.
 *
 * Each function below NEVER throws, so the handler can run all three and count
 * what worked. Each logs its own failure under its destination name, and no
 * log line carries a submitted value: what a visitor types here is health
 * information about a real person, usually a child.
 */

/** The row of record. Owns its own config check — a missing env var is this
 *  destination failing, not the request failing. Resolves to the new row's id,
 *  or null when nothing was saved. */
async function saveRow(values: Record<string, unknown>): Promise<string | null> {
  const supabase = supabaseAdmin();
  if (!supabase) {
    console.error(
      "[destination: supabase] NOT saved — SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set."
    );
    return null;
  }
  try {
    const { data, error } = await supabase
      .from("consultation_requests")
      .insert(values)
      .select("id")
      .single();
    if (error) {
      // `message` and `code` only — deliberately NOT `details` or `hint`,
      // which are where Postgres puts the offending value ("Key (email)=(…)").
      // A network failure (paused project, DNS, TLS) surfaces here too, as
      // "TypeError: fetch failed".
      console.error(
        `[destination: supabase] insert failed: ${error.message}${
          error.code ? ` (code ${error.code})` : ""
        }`
      );
      return null;
    }
    return typeof data?.id === "string" ? data.id : null;
  } catch (err) {
    // createClient throws on a malformed URL; fetch can reject outright.
    console.error(
      `[destination: supabase] insert threw: ${
        err instanceof Error ? `${err.name}: ${err.message}` : "unknown error"
      }`
    );
    return null;
  }
}

/**
 * The office notification (lib/lead-notification.ts). A consultation goes to
 * the inbox for the center the visitor chose, with the lead in the body; a
 * guide signup goes to the default inbox with the address. The two stay
 * separate messages because a guide signup is not a callback and must not
 * read like one.
 *
 * The guide itself is not sent from here. The visitor gets it in the success
 * state of components/GuideCta.tsx — static files, so delivery has no provider
 * to fail and no key to be missing.
 */
async function notifyOffice(
  guide: { email: string; sourcePage: string | null } | null,
  lead: LeadDetails | null
): Promise<boolean> {
  try {
    const sent = guide
      ? await sendGuideNotification(guide.email, guide.sourcePage)
      : lead
        ? await sendLeadNotification(lead)
        : false;
    if (!sent) {
      // lead-notification.ts has already said which env var is missing or what
      // the provider answered. This line names the destination so all three
      // are countable in one log.
      console.error("[destination: email] notification not sent.");
    }
    return sent;
  } catch (err) {
    console.error(
      `[destination: email] notification threw: ${
        err instanceof Error ? err.name : "unknown error"
      }`
    );
    return false;
  }
}

/**
 * POST — a new request. For the contact form this is **step one**: first
 * name, phone, preferred center, best time, optional email. The row is saved
 * and the lead email sent here, before the form shows anything else; the
 * optional second step (who the call is for, concerns, a note) PATCHes the
 * row whose id this returns. The chat sends everything in one POST, with
 * `helping_who` already answered.
 */
export async function POST(request: Request) {
  let body: Payload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const type = str(body.type, 20) ?? "consultation";
  if (!SUBMISSION_TYPES.has(type)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const isGuide = type === "guide";

  const source = str(body.source, 20) ?? "form";
  if (!SUBMISSION_SOURCES.has(source)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const firstName = str(body.first_name, 100);
  const phone = str(body.phone, 40);
  const helpingWho = str(body.helping_who, 40);
  const email = str(body.email, 200);

  if (email && !looksLikeEmail(email)) {
    return NextResponse.json(
      { error: "That email address doesn't look right." },
      { status: 400 }
    );
  }

  if (isGuide) {
    // A guide signup is only ever an address — nothing else is collected.
    if (!email) {
      return NextResponse.json(
        { error: "Please add an email address to get the guide." },
        { status: 400 }
      );
    }
  } else if (!firstName || !phone) {
    return NextResponse.json(
      { error: "Please add your first name and a phone number so we can call you." },
      { status: 400 }
    );
  }

  // Optional on a consultation (the form asks it in step two), but when it is
  // sent it has to be one of the three the row and the platform understand.
  if (helpingWho && !HELPING_OPTIONS.has(helpingWho)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const concerns = concernList(body.concerns);
  const preferredCenter = isGuide
    ? null
    : (str(body.preferred_center, 60) ?? CENTER_UNSPECIFIED);
  const bestTime = str(body.best_time, 40);
  const note = str(body.note, 2000);
  const sourcePage = str(body.source_page, 200);

  // The honeypot, read raw rather than through str(): empty is the normal
  // human answer, and str() maps empty to null. It is never used to reject
  // anything here — classification is the platform's job (a non-empty value is
  // stored flagged there and still answers 201), so a bot gets exactly the same
  // response a parent does.
  const honeypot = typeof body.website === "string" ? body.website : "";

  // Guide signups carry nothing but an address; the rest stays null rather than
  // being filled with empty strings.
  const row = {
    type,
    source,
    helping_who: isGuide ? null : helpingWho,
    concerns: isGuide ? [] : concerns,
    first_name: isGuide ? null : firstName,
    phone: isGuide ? null : phone,
    email,
    preferred_center: preferredCenter,
    best_time: isGuide ? null : bestTime,
    note: isGuide ? null : note,
    source_page: sourcePage,
  };

  // The platform contract requires who-we're-helping (lib/inquiry-intake.ts),
  // and a form lead does not have it yet: the form asks in step two and
  // forwards from there (app/api/consultation/[id]/route.ts) once it is
  // answered. A chat lead has it here and is forwarded now. A guide signup is
  // not an inquiry at all. Built as a value so the three fields narrow.
  const inquiry =
    !isGuide && firstName && phone && helpingWho
      ? {
          helpingWho,
          concerns,
          firstName,
          phone,
          email,
          preferredCenter,
          bestTime,
          note,
          website: honeypot,
        }
      : null;

  // ── Fan out ────────────────────────────────────────────────────────────
  // All destinations at once: they are independent, and the visitor waits on
  // the slowest rather than on the sum. None throws, so Promise.all cannot
  // reject and no failure can escape into the response.
  //
  // The email does not wait for the row: it carries the lead, and the row id
  // is only a pointer in its footer. If the insert fails, the email still goes
  // and simply has no row to point at.
  //
  // Awaited rather than fired and forgotten: a serverless runtime may kill the
  // process the moment the response is returned, which would silently drop
  // whichever delivery had not finished.
  const savedRowId = await saveRow(row);

  const lead: LeadDetails | null = isGuide
    ? null
    : {
        source: source as LeadDetails["source"],
        rowId: savedRowId,
        helpingWho,
        concerns,
        firstName,
        phone,
        email,
        preferredCenter,
        bestTime,
        note,
        sourcePage,
      };

  const [notified, forwarded] = await Promise.all([
    notifyOffice(isGuide && email ? { email, sourcePage } : null, lead),
    inquiry ? forwardInquiry(inquiry).then((r) => r.ok) : Promise.resolve(false),
  ]);
  const savedRow = savedRowId !== null;

  // ── What the visitor is told ───────────────────────────────────────────
  // She hears "received" if ANY destination took it. Filling the form in again
  // cannot help with an outage on our side, and telling her to try again when
  // the request did land would be a lie.
  if (!savedRow && !notified && !forwarded) {
    console.error(
      `[submission] EVERY destination failed (supabase, email${
        inquiry ? ", platform" : ""
      }) — nothing was stored or delivered.`
    );
    return NextResponse.json(
      {
        error: `We couldn't send your request just now. Please try again in a moment — or call us at ${PHONE_DISPLAY} and we'll take it down over the phone.`,
      },
      { status: 502 }
    );
  }

  // The row of record did not save but the lead did reach someone (the email
  // and the platform both carry the submission). Not the visitor's problem —
  // hers landed — but Supabase being down is worth a loud line. The form also
  // gets no id back, so it skips its optional second step: there is no row to
  // add to.
  if (!savedRow) {
    console.error(
      "[submission] Supabase row NOT saved — the request was delivered by " +
        `${[notified && "email", forwarded && "platform"]
          .filter(Boolean)
          .join(" and ")} only. Check the Supabase project (paused?).`
    );
  }

  // ── Tell her it landed ─────────────────────────────────────────────────
  // After the fan-out, not alongside it: the text says "we got your request",
  // which is only true once something above accepted it. Not a destination —
  // a failed text changes nothing about the response. Awaited for the same
  // serverless reason the fan-out is.
  if (lead && firstName && phone) {
    await sendConfirmationText({
      firstName,
      phone,
      preferredCenter,
      honeypot,
    });
  }

  // The id is what the form's second step needs, and nothing else: an
  // unguessable uuid v4 that names one row and can change three columns of it.
  return NextResponse.json({ ok: true, id: savedRowId }, { status: 201 });
}
