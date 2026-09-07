import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  sendGuideNotification,
  sendLeadNotification,
} from "@/lib/lead-notification";
import { forwardInquiry } from "@/lib/inquiry-intake";
import { PHONE_DISPLAY } from "@/lib/site-config";

export const runtime = "nodejs";

const HELPING_OPTIONS = new Set(["My child", "Myself", "Someone else"]);

/**
 * Two row shapes, one table (see the migration):
 *   consultation — the contact form; someone is expecting a call.
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

function str(value: unknown, maxLen: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= maxLen ? trimmed : null;
}

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
 *   supabase — the row of record.
 *   email    — the "go look" ping to the office.
 *   platform — the inquiry on the front desk's Follow-ups screen.
 *
 * This used to be a chain: the insert ran first and returned 500 on failure,
 * so the day the Supabase project paused, a parent who filled in the form saw
 * an error and the platform never heard about her — though the platform was up
 * and would have taken it. Independence is the fix.
 *
 * Each function below returns a boolean and NEVER throws, so the handler can
 * run all three and count what worked. Each logs its own failure under its
 * destination name, and no log line carries a submitted value: what a visitor
 * types here is health information about a real person, usually a child.
 */

/** The row of record. Owns its own config check — a missing env var is this
 *  destination failing, not the request failing. */
async function saveRow(values: Record<string, unknown>): Promise<boolean> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "[destination: supabase] NOT saved — SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set."
    );
    return false;
  }
  try {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
    const { error } = await supabase.from("consultation_requests").insert(values);
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
      return false;
    }
    return true;
  } catch (err) {
    // createClient throws on a malformed URL; fetch can reject outright.
    console.error(
      `[destination: supabase] insert threw: ${
        err instanceof Error ? `${err.name}: ${err.message}` : "unknown error"
      }`
    );
    return false;
  }
}

/**
 * The office notification. Neither sender carries any of what was collected:
 * they say which kind of lead arrived and where to look. The two stay separate
 * messages because a guide signup is not a callback and must not read like one.
 *
 * The guide itself is not sent from here. The visitor gets it in the success
 * state of components/GuideCta.tsx — static files, so delivery has no provider
 * to fail and no key to be missing. An emailed copy could be added over the
 * same Resend path, but only once the sending domain is verified; see the
 * header of lib/lead-notification.ts for why that is not a detail.
 */
async function notifyOffice(isGuide: boolean): Promise<boolean> {
  try {
    const sent = isGuide
      ? await sendGuideNotification()
      : await sendLeadNotification();
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
  } else if (
    !firstName ||
    !phone ||
    !helpingWho ||
    !HELPING_OPTIONS.has(helpingWho)
  ) {
    return NextResponse.json(
      { error: "Please include who we're helping, your first name, and a phone number." },
      { status: 400 }
    );
  }

  const concerns = Array.isArray(body.concerns)
    ? body.concerns
        .filter((c): c is string => typeof c === "string")
        .map((c) => c.trim())
        .filter((c) => c.length > 0 && c.length <= 60)
        .slice(0, 10)
    : [];

  const preferredCenter = str(body.preferred_center, 60);
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
    preferred_center: isGuide ? null : preferredCenter,
    best_time: isGuide ? null : bestTime,
    note: isGuide ? null : note,
    source_page: sourcePage,
  };

  // A guide signup is not an inquiry: no name, no phone, no who-we're-helping,
  // so it cannot satisfy the platform contract and is not sent there. Built as
  // a value rather than checked at the call site so the three fields narrow.
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
  // Awaited rather than fired and forgotten: a serverless runtime may kill the
  // process the moment the response is returned, which would silently drop
  // whichever delivery had not finished.
  const [savedRow, notified, forwarded] = await Promise.all([
    saveRow(row),
    notifyOffice(isGuide),
    inquiry ? forwardInquiry(inquiry).then((r) => r.ok) : Promise.resolve(false),
  ]);

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

  // The email carries none of the submission on purpose (see
  // lib/lead-notification.ts), so it is the one destination that cannot stand
  // alone: if it is all that worked, the office knows a request arrived but has
  // no name or number to call back. Not the visitor's problem — hers did land —
  // but it must be impossible to miss in the log.
  if (!savedRow && !forwarded) {
    console.error(
      "[submission] NO data-bearing destination succeeded — the notification " +
        "email was sent, but neither the Supabase row nor the platform inquiry " +
        "was stored, so this request cannot be returned. Investigate now."
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
