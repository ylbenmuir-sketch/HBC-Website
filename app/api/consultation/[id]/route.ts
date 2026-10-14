import { NextResponse } from "next/server";
import { forwardInquiry } from "@/lib/inquiry-intake";
import { rfcMessageIdOf, sendDetailsUpdate, type SendResult } from "@/lib/lead-notification";
import { notificationSubject, routeLead, type RouteName } from "@/lib/lead-routing";
import { HELPING_OPTIONS, concernList, str, supabaseAdmin } from "@/lib/consultation";

export const runtime = "nodejs";

/**
 * PATCH /api/consultation/<id> — the contact form's optional second step.
 *
 * Step one (POST ../route.ts) saved the callback and sent the lead email;
 * this adds who the call is for, what's bringing them in, and a note to
 * **that same row**. One lead, one record: it never inserts.
 *
 * ## What it can change, and what it cannot
 *
 * Exactly four columns — `helping_who`, `concerns`, `note`, `referred_by` —
 * and a body naming any other key is refused outright, so this endpoint cannot be used
 * to change a name, a phone number, a center or a time after the email that
 * carried them has gone. Only `type = 'consultation'` rows from the form are
 * touched: a chat row has these answers already and no browser was ever
 * handed its id.
 *
 * ## A threaded "Details added" email; a second platform post
 *
 * The lead email went at step one. When page two is SAVED (Skip sends no
 * PATCH, so nothing), this sends "Details added" to the same recipients —
 * read off the row's notify_* columns — with the same subject plus "Re: "
 * and In-Reply-To / References naming the original's Message-ID, so it
 * lands in the same Gmail thread (Ben, 2026-10-14). If the original failed
 * it goes on its own, carrying the whole lead. Recorded in details_email_*.
 * The platform was also told at step one; it has no update door, so this
 * route posts the enriched inquiry again with an "UPDATE — not a new lead"
 * first line (UPDATE_LINE in lib/inquiry-intake.ts).
 *
 * ## The id is the authority
 *
 * A uuid v4 the server generated and returned to the browser that made the
 * request — 122 bits of randomness, which is the whole access control. A
 * wrong or unknown id answers 404, with nothing to distinguish "never
 * existed" from "not yours".
 */

const PATCHABLE = new Set(["helping_who", "concerns", "note", "referred_by"]);
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type UpdatedRow = {
  id: string;
  helping_who: string | null;
  concerns: string[] | null;
  first_name: string | null;
  phone: string | null;
  email: string | null;
  preferred_center: string | null;
  best_time: string | null;
  note: string | null;
  referred_by: string | null;
  /** Read, never written here — carried to the re-post (NO_TEXT_CONSENT_LINE). */
  sms_consent: boolean | null;
  source_page: string | null;
  notify_route: string | null;
  notify_env: string | null;
  notify_to: string | null;
  notify_cc: string[] | null;
  notify_status: string | null;
  notify_message_id: string | null;
  notify_rfc_message_id: string | null;
};

const ROUTES = new Set<RouteName>(["guide", "more_info", "concierge", "nashville", "murfreesboro", "fallback"]);

/**
 * "Details added", to the original's recipients and threaded under it. Never
 * throws; the outcome is logged and written to details_email_*, and the
 * visitor's response does not depend on it.
 */
async function emailDetails(row: UpdatedRow, supabase: NonNullable<ReturnType<typeof supabaseAdmin>>): Promise<void> {
  const details = {
    helpingWho: row.helping_who,
    concerns: row.concerns ?? [],
    note: row.note,
    referredBy: row.referred_by,
  };
  if (!details.helpingWho && !details.concerns.length && !details.note && !details.referredBy) return;

  // The recipients the original went to, as recorded; recomputed only for a
  // row from before the notify_* columns.
  const recorded = row.notify_to && row.notify_route && ROUTES.has(row.notify_route as RouteName);
  const recipients = recorded
    ? {
        route: row.notify_route as RouteName,
        envVar: row.notify_env,
        to: row.notify_to,
        cc: row.notify_cc ?? [],
      }
    : routeLead({ type: "consultation", source: "form", preferredCenter: row.preferred_center });
  const subject = notificationSubject({
    route: recipients.route,
    source: "form",
    preferredCenter: row.preferred_center,
    name: row.first_name,
    email: row.email,
  });

  const originalSent = row.notify_status === "sent";
  let originalMessageId = row.notify_rfc_message_id;
  if (originalSent && !originalMessageId && row.notify_message_id) {
    // Not read back at step one (Resend had not assigned it yet): read it
    // now, and keep it.
    originalMessageId = await rfcMessageIdOf(row.notify_message_id);
    if (originalMessageId) {
      await supabase
        .from("consultation_requests")
        .update({ notify_rfc_message_id: originalMessageId })
        .eq("id", row.id)
        .then(({ error }) => {
          if (error) console.error(`[details email] lead=${row.id} message id not stored: ${error.message}`);
        });
    }
  }

  let result: SendResult;
  try {
    result = await sendDetailsUpdate({
      lead: {
        source: "form",
        intent: "book",
        rowId: row.id,
        helpingWho: row.helping_who,
        concerns: row.concerns ?? [],
        firstName: row.first_name,
        phone: row.phone,
        email: row.email,
        preferredCenter: row.preferred_center,
        bestTime: row.best_time,
        note: row.note,
        referredBy: row.referred_by,
        sourcePage: row.source_page,
        smsConsent: row.sms_consent === true,
        honeypotFilled: false,
      },
      recipients,
      subject,
      originalSent,
      originalMessageId,
    });
  } catch (err) {
    result = { status: "failed", messageId: null, error: `threw: ${err instanceof Error ? err.name : "unknown error"}` };
  }
  const where = `route=${recipients.route} lead=${row.id} threaded=${originalSent && originalMessageId ? "yes" : "no"}`;
  if (result.status === "sent") {
    console.log(`[destination: details email] sent ${where} resend_id=${result.messageId ?? "?"}`);
  } else {
    console.error(`[destination: details email] NOT sent (${result.status}) ${where} error="${result.error}"`);
  }
  const { error } = await supabase
    .from("consultation_requests")
    .update({
      details_email_status: result.status,
      details_email_message_id: result.messageId,
      details_email_error: result.error,
    })
    .eq("id", row.id);
  if (error) console.error(`[details email record] lead=${row.id} not stamped: ${error.message}`);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_V4.test(id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const fields = body as Record<string, unknown>;

  // Anything that is not one of the four is a refusal, not an ignore: a
  // caller sending `phone` here is either a bug to surface or an attempt.
  const keys = Object.keys(fields);
  if (keys.length === 0 || keys.some((k) => !PATCHABLE.has(k))) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const update: {
    helping_who?: string;
    concerns?: string[];
    note?: string | null;
    referred_by?: string | null;
  } = {};

  if ("helping_who" in fields) {
    const helpingWho = str(fields.helping_who, 40);
    // One of the three, and never cleared: a wrong answer re-asks, a blank
    // one is simply not sent.
    if (!helpingWho || !HELPING_OPTIONS.has(helpingWho)) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    update.helping_who = helpingWho;
  }
  if ("concerns" in fields) {
    if (!Array.isArray(fields.concerns)) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    update.concerns = concernList(fields.concerns);
  }
  if ("note" in fields) {
    if (fields.note !== null && typeof fields.note !== "string") {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    if (typeof fields.note === "string" && fields.note.trim().length > 2000) {
      return NextResponse.json(
        { error: "That note is a little long — 2,000 characters is the most we can take here." },
        { status: 400 }
      );
    }
    update.note = str(fields.note, 2000);
  }
  if ("referred_by" in fields) {
    // "Who referred you?" — optional, as typed. A name or a practice, so a
    // short cap; anything longer is refused rather than clipped.
    if (fields.referred_by !== null && typeof fields.referred_by !== "string") {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    if (typeof fields.referred_by === "string" && fields.referred_by.trim().length > 200) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    update.referred_by = str(fields.referred_by, 200);
  }

  const supabase = supabaseAdmin();
  if (!supabase) {
    console.error(
      "[details] NOT saved — SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set."
    );
    return NextResponse.json(
      { error: "We couldn't save those details just now — your call is already requested." },
      { status: 503 }
    );
  }

  let row: UpdatedRow | null = null;
  try {
    const { data, error } = await supabase
      .from("consultation_requests")
      .update(update)
      .eq("id", id)
      .eq("type", "consultation")
      .eq("source", "form")
      .select(
        "id, helping_who, concerns, first_name, phone, email, preferred_center, best_time, note, referred_by, sms_consent, source_page, notify_route, notify_env, notify_to, notify_cc, notify_status, notify_message_id, notify_rfc_message_id"
      );
    if (error) {
      // `message` and `code` only — never `details`, where Postgres echoes values.
      console.error(
        `[details] update failed: ${error.message}${error.code ? ` (code ${error.code})` : ""}`
      );
      return NextResponse.json(
        { error: "We couldn't save those details just now — your call is already requested." },
        { status: 502 }
      );
    }
    row = (data?.[0] as UpdatedRow | undefined) ?? null;
  } catch (err) {
    console.error(
      `[details] update threw: ${err instanceof Error ? err.name : "unknown error"}`
    );
    return NextResponse.json(
      { error: "We couldn't save those details just now — your call is already requested." },
      { status: 502 }
    );
  }

  if (!row) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // Shape only: which columns moved, never what to.
  console.log(
    `[details] added to a request: ${[
      "helping_who" in update && "helping_who",
      "concerns" in update && `concerns×${update.concerns?.length ?? 0}`,
      "note" in update && (update.note ? "note" : "note cleared"),
      "referred_by" in update && (update.referred_by ? "referred_by" : "referred_by cleared"),
    ]
      .filter(Boolean)
      .join(", ")}`
  );

  // The "Details added" email, threaded under the lead email. Awaited, never
  // thrown — the visitor's answer below does not depend on it.
  try {
    await emailDetails(row, supabase);
  } catch (err) {
    console.error(`[details email] lead=${row.id} threw: ${err instanceof Error ? err.name : "unknown error"}`);
  }

  // The enriched inquiry, re-posted as a labelled update. Awaited, never
  // thrown; forwardInquiry logs its own outcome. No honeypot at this step —
  // the bot field lives on step one, which a bot that got this far already
  // passed.
  if (row.first_name && row.phone) {
    await forwardInquiry({
      helpingWho: row.helping_who,
      concerns: row.concerns ?? [],
      firstName: row.first_name,
      phone: row.phone,
      email: row.email,
      preferredCenter: row.preferred_center,
      bestTime: row.best_time,
      note: row.note,
      referredBy: row.referred_by,
      website: "",
      update: true,
      smsConsent: row.sms_consent === true,
    });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
