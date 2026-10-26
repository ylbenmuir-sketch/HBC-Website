import { NextResponse, after } from "next/server";
import { forwardInquiry } from "@/lib/inquiry-intake";
import { rfcMessageIdOf, sendDetailsUpdate, type SendResult } from "@/lib/lead-notification";
import { notificationSubject, routeLead, type RouteName } from "@/lib/lead-routing";
import { HELPING_OPTIONS, concernList, isContactMethod, str, supabaseAdmin } from "@/lib/consultation";
import { TIME_OPTIONS, isHeardAbout } from "@/lib/lead-options";
import { CONSENT_TEXT_MAX } from "@/lib/sms-consent";
import { sendConfirmationText } from "@/lib/sms-confirmation";
import { onPageTwoSaved, type HoldState } from "@/lib/held-notification";
import { sendHeldRow, supabaseHeldStore } from "@/lib/held-notification-store";
import { sweepDue } from "@/lib/release-job";

export const runtime = "nodejs";

/**
 * PATCH /api/consultation/<id> — the contact form's optional second step.
 *
 * Step one (POST ../route.ts) saved the callback (and, for a form lead,
 * usually HELD the staff email rather than sending it — see below);
 * this adds who the call is for, what's bringing them in, and a note to
 * **that same row**. One lead, one record: it never inserts.
 *
 * ## What it can change, and what it cannot
 *
 * Step two's answers (Ben, 2026-10-26) — `helping_who`, `concerns`,
 * `best_time`, `contact_method`, `heard_about`, `referred_by`, the text
 * consent (`sms_consent` true + the `sms_consent_text` shown; the server
 * stamps the time) — and `note`, which older open tabs still send. A body
 * naming any other key is refused outright, so this endpoint cannot be used
 * to change a name, a phone number, an email or a center after the email
 * that carried them has gone. A consent tick is a yes only: it can never be
 * withdrawn here (STOP does that), never applies to a row without a phone,
 * and sends the confirmation text the first time it lands. Only `type = 'consultation'` rows from the form are
 * touched: a chat row has these answers already and no browser was ever
 * handed its id.
 *
 * ## One staff email; a second platform post
 *
 * While the staff email is still HELD (lib/held-notification.ts), saving page
 * two sends it — once, with these details in it. ("Skip for now" sends it
 * through ./release instead.) Only when it has ALREADY gone out — sent at
 * step one because the release job was not running, or by the job after
 * two minutes — does a save send the update: "Details added" to the same recipients —
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

const PATCHABLE = new Set([
  "helping_who",
  "concerns",
  "note",
  "referred_by",
  "best_time",
  "contact_method",
  "heard_about",
  "sms_consent",
  "sms_consent_text",
]);

/** PostgREST's "no such column" for one named column (see the POST). */
function isMissingColumn(error: { code?: string; message?: string }, column: string): boolean {
  return (
    (error.code === "PGRST204" || error.code === "42703") &&
    typeof error.message === "string" &&
    error.message.includes(column)
  );
}
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
  /** Read, never written here. Absent until migration 0011 is applied. */
  contact_method?: string | null;
  note: string | null;
  referred_by: string | null;
  /** Absent until migration 0012 is applied. */
  heard_about?: string | null;
  /** Carried to the re-post (NO_TEXT_CONSENT_LINE) and the emails. */
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

/** `*`, not a list: a column a pending migration has not added yet
 *  (contact_method, 0011) would fail the select and with it the save. */
const ROW_COLUMNS = "*";

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
    heardAbout: row.heard_about ?? null,
    bestTime: row.best_time,
    contactMethod: row.contact_method ?? null,
    smsConsent: row.sms_consent === true,
  };
  if (Object.values(details).every((v) => !v || (Array.isArray(v) && v.length === 0))) return;

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
        contactMethod: row.contact_method ?? null,
        note: row.note,
        referredBy: row.referred_by,
        heardAbout: row.heard_about ?? null,
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
    best_time?: string;
    contact_method?: string;
    heard_about?: string;
    sms_consent?: true;
    sms_consent_text?: string;
    sms_consent_at?: string;
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
  if ("best_time" in fields) {
    const bestTime = str(fields.best_time, 40);
    if (!bestTime || !(TIME_OPTIONS as readonly string[]).includes(bestTime)) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    update.best_time = bestTime;
  }
  if ("contact_method" in fields) {
    if (!isContactMethod(fields.contact_method)) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    update.contact_method = fields.contact_method;
  }
  if ("heard_about" in fields) {
    if (!isHeardAbout(fields.heard_about)) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    update.heard_about = fields.heard_about;
  }
  // Text consent: a literal true WITH the wording she was shown, or nothing.
  // The time is the server's, at the moment the tick arrived.
  if ("sms_consent" in fields || "sms_consent_text" in fields) {
    const consentText = str(fields.sms_consent_text, CONSENT_TEXT_MAX);
    if (fields.sms_consent !== true || !consentText) {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }
    update.sms_consent = true;
    update.sms_consent_text = consentText;
    update.sms_consent_at = new Date().toISOString();
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

  // The consent is about a number: no phone on the row, no consent stored.
  // And a yes that is already on the row is not a new yes (no second text).
  let consentIsNew = false;
  if (update.sms_consent) {
    const { data: before } = await supabase
      .from("consultation_requests")
      .select("phone, sms_consent")
      .eq("id", id)
      .maybeSingle();
    if (!before?.phone?.trim() || before.sms_consent === true) {
      delete update.sms_consent;
      delete update.sms_consent_text;
      delete update.sms_consent_at;
    } else {
      consentIsNew = true;
    }
  }

  let row: UpdatedRow | null = null;
  try {
    const write = (values: typeof update) =>
      supabase
        .from("consultation_requests")
        .update(values)
        .eq("id", id)
        .eq("type", "consultation")
        .eq("source", "form")
        .select(ROW_COLUMNS);
    let { data, error } = await write(update);
    // heard_about (0012) may not exist yet: save everything else rather than
    // nothing, and say what to apply.
    if (error && "heard_about" in update && isMissingColumn(error, "heard_about")) {
      console.error("[details] heard_about column missing — migration 0012 is not applied; saving the rest without it.");
      const { heard_about: _dropped, ...rest } = update;
      void _dropped;
      ({ data, error } = await write(rest));
    }
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
      "best_time" in update && "best_time",
      "contact_method" in update && "contact_method",
      "heard_about" in update && "heard_about",
      "sms_consent" in update && "sms_consent",
    ]
      .filter(Boolean)
      .join(", ")}`
  );

  // The staff email (Ben, 2026-10-15: one per form lead). Still held → it
  // goes now, ONCE, with these details in it. Already sent → the threaded
  // "Details added" update, as before. Mid-send → wait for it, then the
  // update. lib/held-notification.ts → onPageTwoSaved has the cases.
  // Awaited, never thrown — the visitor's answer below does not depend on it.
  const savedRow = row;
  try {
    // Read on its own, after this save committed, rather than in the
    // UPDATE's select: a database without migration 0009 answers undefined
    // here (→ the old path) instead of failing the save. Any claim that
    // happened before this read but after the save carries the details.
    const holdState: HoldState | null = (await supabaseHeldStore.state(savedRow.id)) ?? null;
    const outcome = await onPageTwoSaved(
      supabaseHeldStore,
      sendHeldRow,
      savedRow.id,
      holdState,
      async () => {
        // Re-read: a send that finished while this waited has changed the
        // notify_* columns the update threads under.
        const { data } = await supabase.from("consultation_requests").select(ROW_COLUMNS).eq("id", savedRow.id);
        // A held email claimed in the moment between this save and the
        // state read above already carried these details: no update.
        if (holdState !== null) {
          const { data: sent } = await supabase
            .from("consultation_requests")
            .select("notify_had_details")
            .eq("id", savedRow.id)
            .maybeSingle();
          if (sent?.notify_had_details === true) return;
        }
        await emailDetails((data?.[0] as UpdatedRow | undefined) ?? savedRow, supabase);
      }
    );
    console.log(`[details] lead=${savedRow.id} staff email: ${outcome}`);
  } catch (err) {
    console.error(`[details email] lead=${savedRow.id} threw: ${err instanceof Error ? err.name : "unknown error"}`);
  }
  after(sweepDue);

  // The confirmation text, on the first yes — the consent box lives on step
  // two now, so this is where the opt-in arrives. Awaited, never thrown.
  if (consentIsNew && row.sms_consent === true && row.first_name && row.phone?.trim()) {
    await sendConfirmationText({
      name: row.first_name,
      phone: row.phone,
      preferredCenter: row.preferred_center,
      honeypot: "",
      leadId: row.id,
    });
  }

  // The enriched inquiry, re-posted as a labelled update. Awaited, never
  // thrown; forwardInquiry logs its own outcome. No honeypot at this step —
  // the bot field lives on step one, which a bot that got this far already
  // passed.
  if (row.first_name && row.phone?.trim()) {
    await forwardInquiry({
      helpingWho: row.helping_who,
      concerns: row.concerns ?? [],
      firstName: row.first_name,
      phone: row.phone,
      email: row.email,
      preferredCenter: row.preferred_center,
      bestTime: row.best_time,
      contactMethod: row.contact_method ?? null,
      note: row.note,
      referredBy: row.referred_by,
      heardAbout: row.heard_about ?? null,
      website: "",
      update: true,
      smsConsent: row.sms_consent === true,
    });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
