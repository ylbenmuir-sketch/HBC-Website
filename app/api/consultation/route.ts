import { NextResponse, after } from "next/server";
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
  sendVisitorConfirmation,
  type LeadDetails,
  type SendResult,
} from "@/lib/lead-notification";
import { shouldEmailVisitor, visitorReplyTo } from "@/lib/email/format";
import { visitorContent } from "@/lib/email/visitor-content";
import { GUIDE_TITLE } from "@/lib/site-config";
import { notificationSubject, routeLead, type LeadSource, type Recipients } from "@/lib/lead-routing";
import { forwardInquiry } from "@/lib/inquiry-intake";
import { sendConfirmationText } from "@/lib/sms-confirmation";
import { PHONE_DISPLAY } from "@/lib/site-config";
import { CONSENT_TEXT_MAX } from "@/lib/sms-consent";
import { capitalizeName } from "@/lib/name-case";
import { RELEASE_JOB, holdEnv, holdMs, shouldHold } from "@/lib/held-notification";
import { supabaseHeldStore } from "@/lib/held-notification-store";
import { sweepDue } from "@/lib/release-job";
import { checkOffer, offerRefusalMessage, redeemOffer } from "@/lib/giveaway/offers";

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
const SUBMISSION_SOURCES = new Set(["form", "chat", "giveaway"]);

/**
 * Whether the visitor is ready to book. Absent means "book" — every caller
 * today. "more_info" routes to LEADS_MORE_INFO (lib/lead-routing.ts); no page
 * sends it yet, so adding a "just want more information" path to a form is
 * this one key and nothing else.
 */
const SUBMISSION_INTENTS = new Set(["book", "more_info"]);

type Payload = {
  type?: unknown;
  source?: unknown;
  /** The 10-year giveaway offer code (source "giveaway" only). */
  offer_code?: unknown;
  intent?: unknown;
  helping_who?: unknown;
  concerns?: unknown;
  first_name?: unknown;
  phone?: unknown;
  email?: unknown;
  preferred_center?: unknown;
  best_time?: unknown;
  note?: unknown;
  source_page?: unknown;
  /** True only when she ticked the box (form) or said yes (chat). */
  sms_consent?: unknown;
  /** The consent wording exactly as it was shown to her, ticked or not. */
  sms_consent_text?: unknown;
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
 * In order, and the order is the guarantee (Ben, 2026-10-14):
 *
 *   1. supabase — the row of record, written FIRST. Nothing is emailed or
 *                 texted before this has answered.
 *   2. email    — the lead itself, to the inbox lib/lead-routing.ts names.
 *                 A contact-form lead's is HELD instead (Ben, 2026-10-15)
 *                 and sent once, with page two in it, when she saves or
 *                 skips page two or after two minutes — but only while
 *                 the release job is demonstrably running; otherwise it
 *                 goes here as before (lib/held-notification.ts).
 *      platform — the inquiry on the front desk's Follow-ups screen.
 *                 These two run side by side.
 *   3. the row is stamped with where the email went (notify_* columns, and
 *      the delivered Message-ID the page-two update threads under), so
 *      every lead can be audited against its route later.
 *   4. the visitor's confirmation email (lib/email/format.ts →
 *      shouldEmailVisitor) and the confirmation text (only with consent),
 *      side by side, only on a saved row. Each is written down on the row
 *      and neither can change what the visitor is told.
 *
 * What the visitor is told follows the row alone. Saved → success, whatever
 * the email or the text did; their failures are logged against the row's id
 * and stamped on it. NOT saved → a clear error with the phone number, never
 * a success: the record does not exist. The email is still sent in that
 * case, marked as the only copy, so the lead is not lost while she decides
 * whether to call.
 *
 * Each function below NEVER throws. Log lines carry the route, the row id
 * and the error — never a submitted value: what a visitor types here is
 * health information about a real person, usually a child.
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
 * The office notification (lib/lead-notification.ts), already routed. A
 * consultation carries the lead in the body; a guide signup carries the
 * address. Separate messages, because a guide signup is not a callback and
 * must not read like one.
 *
 * The guide itself is not sent from here. The visitor gets it in the success
 * state of components/GuideCta.tsx — static files, so delivery has no provider
 * to fail and no key to be missing.
 */
async function notifyOffice(
  guide: { email: string; sourcePage: string | null; rowId: string | null } | null,
  lead: LeadDetails | null,
  recipients: Recipients,
  subject: string
): Promise<SendResult & { rfcMessageId: string | null }> {
  const leadId = (guide ?? lead)?.rowId ?? "NOT-SAVED";
  let result: SendResult & { rfcMessageId: string | null };
  try {
    result = guide
      ? { ...(await sendGuideNotification({ ...guide, guideTitle: GUIDE_TITLE }, recipients, subject)), rfcMessageId: null }
      : lead
        ? await sendLeadNotification(lead, recipients, subject)
        : { status: "not_configured", messageId: null, error: "nothing to send", rfcMessageId: null };
  } catch (err) {
    result = {
      status: "failed",
      messageId: null,
      error: `threw: ${err instanceof Error ? err.name : "unknown error"}`,
      rfcMessageId: null,
    };
  }
  const where = `route=${recipients.route} env=${recipients.envVar ?? "none"} lead=${leadId}`;
  if (result.status === "sent") {
    console.log(`[destination: email] sent ${where} resend_id=${result.messageId ?? "?"}`);
  } else {
    console.error(`[destination: email] NOT sent (${result.status}) ${where} error="${result.error}"`);
  }
  return result;
}

/**
 * Step 2a: hold a form lead's staff notification instead of sending it
 * (lib/held-notification.ts). True only when the hold was decided AND
 * written; false means "send it now", and the log says why. Never throws.
 */
async function holdNotification(
  rowId: string,
  lead: LeadDetails,
  recipients: Recipients
): Promise<boolean> {
  if (lead.source !== "form") return false;
  const cronSecretSet = Boolean(process.env.CRON_SECRET?.trim());
  const env = holdEnv();
  // The heartbeat is read only when it could matter.
  const heartbeat = cronSecretSet && !lead.honeypotFilled
    ? await supabaseHeldStore.heartbeat(`${RELEASE_JOB}:${env}`)
    : null;
  const now = new Date();
  const decision = shouldHold({
    type: "consultation",
    source: lead.source,
    saved: true,
    honeypotFilled: lead.honeypotFilled,
    cronSecretSet,
    heartbeat,
    now,
  });
  if (!decision.hold) {
    console.log(`[held notification] not held lead=${rowId} — ${decision.reason}; sending at step one`);
    return false;
  }
  const ok = await supabaseHeldStore.hold(rowId, {
    until: new Date(now.getTime() + holdMs()),
    env,
    recipients,
  });
  if (ok) console.log(`[held notification] held lead=${rowId} env=${env} for ${Math.round(holdMs() / 1000)} s`);
  else console.error(`[held notification] hold failed lead=${rowId} — sending at step one`);
  return ok;
}

/**
 * Step 3: stamp the row with where its notification went. A separate update
 * rather than part of the insert, so these audit columns can never be the
 * reason a lead fails to save. A failure here is logged and nothing more.
 */
async function recordRouting(
  rowId: string,
  recipients: Recipients,
  result: SendResult & { rfcMessageId: string | null }
): Promise<void> {
  const supabase = supabaseAdmin();
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from("consultation_requests")
      .update({
        notify_route: recipients.route,
        notify_env: recipients.envVar,
        notify_to: recipients.to,
        notify_cc: recipients.cc,
        notify_status: result.status,
        notify_message_id: result.messageId,
        notify_error: result.error,
        notify_rfc_message_id: result.rfcMessageId,
      })
      .eq("id", rowId);
    if (error) {
      console.error(
        `[routing record] lead=${rowId} not stamped: ${error.message}${
          error.code ? ` (code ${error.code})` : ""
        }`
      );
    }
  } catch (err) {
    console.error(
      `[routing record] lead=${rowId} not stamped: ${
        err instanceof Error ? `${err.name}: ${err.message}` : "unknown error"
      }`
    );
  }
}

/**
 * The visitor's "We got your request" email, written down on her row like
 * the notification. Never throws; a failure is logged and stored, and the
 * response she gets does not change.
 */
async function confirmToVisitor(
  rowId: string,
  email: string,
  name: string | null,
  recipients: Recipients
): Promise<void> {
  let result: SendResult;
  try {
    result = await sendVisitorConfirmation({
      to: email,
      replyTo: visitorReplyTo(recipients),
      content: visitorContent(name, recipients.route),
    });
  } catch (err) {
    result = { status: "failed", messageId: null, error: `threw: ${err instanceof Error ? err.name : "unknown error"}` };
  }
  if (result.status === "sent") {
    console.log(`[destination: visitor email] sent lead=${rowId} resend_id=${result.messageId ?? "?"}`);
  } else {
    console.error(`[destination: visitor email] NOT sent (${result.status}) lead=${rowId} error="${result.error}"`);
  }
  const supabase = supabaseAdmin();
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from("consultation_requests")
      .update({
        confirm_email_status: result.status,
        confirm_email_message_id: result.messageId,
        confirm_email_error: result.error,
      })
      .eq("id", rowId);
    if (error) console.error(`[visitor email record] lead=${rowId} not stamped: ${error.message}`);
  } catch (err) {
    console.error(`[visitor email record] lead=${rowId} not stamped: ${err instanceof Error ? err.name : "unknown error"}`);
  }
}

/**
 * POST — a new request. For the contact form this is **step one**: name,
 * phone, email, preferred center, best time. The row is saved
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

  const intent = str(body.intent, 20) ?? "book";
  if (!SUBMISSION_INTENTS.has(intent)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // A 10-year giveaway booking (GIVEAWAY-PLAN.md §4): the code must be one we
  // issued, unredeemed, inside the offer window. Refused codes say why, so
  // the visitor can fix the code or book without it. The offer row is
  // stamped after the lead saves (step 1b below).
  const offerCode = source === "giveaway" ? str(body.offer_code, 20) : null;
  const offer = offerCode ? await checkOffer(offerCode) : null;
  if (source === "giveaway" && (!offer || !offer.ok)) {
    return NextResponse.json({ error: offerRefusalMessage(offer && !offer.ok ? offer.reason : "unknown") }, { status: 400 });
  }

  // The form and the chat both send first and last in one field under this
  // key — the column is older than the field — and every consumer stores it
  // whole; only the greetings use the first word (lib/first-name.ts).
  // Capitalized here, once, so the row, the email, the subject, the platform
  // and the text all carry "Ben Muir" for "ben muir" (lib/name-case.ts).
  const rawName = str(body.first_name, 100);
  const firstName = rawName ? capitalizeName(rawName) : null;
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
      { error: "Please add your name and a phone number so we can call you." },
      { status: 400 }
    );
  } else if (source === "form" && !email) {
    // Required on the form since 2026-10-13 (Ben). The chat does not ask
    // for an address and is not held to it.
    return NextResponse.json(
      { error: "Please add your email address so we can reach you." },
      { status: 400 }
    );
  }

  // Optional on a consultation (the form asks it in step two), but when it is
  // sent it has to be one of the three the row and the platform understand.
  if (helpingWho && !HELPING_OPTIONS.has(helpingWho)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const concerns = concernList(body.concerns);
  // The nearer center from the entrant's ZIP stands in when a giveaway
  // booking did not choose one (decision 9).
  const chosenCenter = str(body.preferred_center, 60);
  const preferredCenter = isGuide
    ? null
    : offer?.ok && (!chosenCenter || chosenCenter === CENTER_UNSPECIFIED) && offer.nearestCenter
      ? offer.nearestCenter
      : (chosenCenter ?? CENTER_UNSPECIFIED);
  const bestTime = str(body.best_time, 40);
  const note = str(body.note, 2000);
  const sourcePage = str(body.source_page, 200);

  // Text-message consent (lib/sms-consent.ts). Opt-in, never assumed: only
  // a literal `true` that arrives WITH the wording she was shown counts, so
  // an old cached form, a script, or a guide signup is a no. The wording is
  // stored whether or not she ticked it — what she was offered is part of
  // the record — and the time is the server's, at the moment the request
  // that carried her answer arrived, never a time the browser sent.
  const smsConsentText = isGuide ? null : str(body.sms_consent_text, CONSENT_TEXT_MAX);
  const smsConsent = !isGuide && body.sms_consent === true && smsConsentText !== null;

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
    sms_consent: smsConsent,
    sms_consent_text: smsConsentText,
    sms_consent_at: smsConsent ? new Date().toISOString() : null,
  };

  // Every consultation is forwarded here, at the lead. A form lead has no
  // who-for yet — the form asks in step two — and goes with the stand-in
  // token and a flag line (lib/inquiry-intake.ts); step two re-posts it as a
  // labelled update. A guide signup is not an inquiry at all. Built as a
  // value so the two required fields narrow.
  const inquiry =
    !isGuide && firstName && phone
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
          smsConsent,
        }
      : null;

  // ── 1. The row of record, before anything is sent ─────────────────────
  // Awaited, like everything below: a serverless runtime may kill the
  // process the moment the response is returned, which would silently drop
  // whichever delivery had not finished.
  const savedRowId = await saveRow(row);

  // ── 1b. A giveaway booking stamps its offer code as redeemed ────────────
  if (offer?.ok) {
    const redeemed = await redeemOffer(offer.offer, { consultationRequestId: savedRowId, center: preferredCenter });
    if (!redeemed) console.error(`[consultation] offer ${offer.offer.id} could not be marked redeemed (lead ${savedRowId ?? "unsaved"})`);
  }

  // ── 2. Route, then email and platform side by side ─────────────────────
  // Sent whether or not the row saved: when it did not, the email is the
  // rescue copy (it says so at the top) and the visitor is told to call.
  const recipients = routeLead({
    type: isGuide ? "guide" : "consultation",
    source: source as LeadSource,
    intent: intent as "book" | "more_info",
    preferredCenter,
  });
  const subject = notificationSubject({
    route: recipients.route,
    source: source as LeadSource,
    preferredCenter,
    name: firstName,
    email,
  });

  const lead: LeadDetails | null = isGuide
    ? null
    : {
        source: source as LeadDetails["source"],
        intent: intent as LeadDetails["intent"],
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
        smsConsent,
        honeypotFilled: honeypot.trim().length > 0,
      };

  // The platform copy starts first and is never waited on by the hold
  // decision below: holding the staff email must not delay or change it.
  const forwarding = inquiry ? forwardInquiry(inquiry).then((r) => r.ok) : Promise.resolve(false);

  // ── 2a. A form lead's staff email is HELD, not sent (Ben, 2026-10-15) ──
  // It goes once, when she saves page two or skips it, or after two minutes
  // (lib/held-notification.ts). Held only while the release job is
  // demonstrably running; otherwise sent right here, as before.
  const held = savedRowId !== null && lead !== null ? await holdNotification(savedRowId, lead, recipients) : false;

  const [notified, forwarded] = await Promise.all([
    held
      ? null
      : notifyOffice(
          isGuide && email ? { email, sourcePage, rowId: savedRowId } : null,
          lead,
          recipients,
          subject
        ),
    forwarding,
  ]);

  // ── Not saved: say so, with the number ─────────────────────────────────
  // Never a success the record cannot back up. Whatever else went out is
  // named in the log so the lead can be found. (Never held: there is no row.)
  if (savedRowId === null) {
    console.error(
      `[submission] Supabase row NOT saved — visitor shown the error. Rescue copies: email ${
        notified?.status === "sent" ? `sent (resend_id=${notified.messageId ?? "?"}, route=${recipients.route})` : `NOT sent (${notified?.error ?? "not attempted"})`
      }${inquiry ? `, platform ${forwarded ? "accepted" : "NOT accepted"}` : ""}. Check the Supabase project (paused?).`
    );
    return NextResponse.json(
      {
        error: `We couldn't send your request just now. Please try again in a moment — or call us at ${PHONE_DISPLAY} and we'll take it down over the phone.`,
      },
      { status: 502 }
    );
  }

  // ── 3. Stamp the row with where the email went ─────────────────────────
  // (A held lead's route was stamped by the hold itself.)
  if (notified) await recordRouting(savedRowId, recipients, notified);

  // ── 4. Tell her it landed ──────────────────────────────────────────────
  // By email whenever she gave an address (never for a guide download), and
  // by text only if she agreed to texts — without consent there is no text
  // at all. Last, after the row exists: both say "we got your request",
  // which is only true once the record does. Side by side, awaited (a
  // serverless runtime may stop the moment the response returns), and
  // neither can change the response.
  await Promise.all([
    email &&
    shouldEmailVisitor({
      type: isGuide ? "guide" : "consultation",
      intent: intent as "book" | "more_info",
      email,
      saved: true,
      honeypotFilled: honeypot.trim().length > 0,
    })
      ? confirmToVisitor(savedRowId, email, firstName, recipients)
      : null,
    lead && firstName && phone && smsConsent
      ? sendConfirmationText({
          name: firstName,
          phone,
          preferredCenter,
          honeypot,
          leadId: savedRowId,
        })
      : null,
  ]);

  // Anything overdue for this deployment goes out after this answers — a
  // second chance should a cron tick run late. Never delays the response.
  after(sweepDue);

  // The id is what the form's second step needs, and nothing else: an
  // unguessable uuid v4 that names one row and can change three columns of it.
  return NextResponse.json({ ok: true, id: savedRowId }, { status: 201 });
}
