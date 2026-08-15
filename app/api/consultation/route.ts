import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  sendGuideNotification,
  sendLeadNotification,
} from "@/lib/lead-notification";

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
        { error: "Please add an email address so we know where to send it." },
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

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "Supabase env vars missing (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)"
    );
    return NextResponse.json(
      { error: "The form isn't configured yet. Please call us instead." },
      { status: 500 }
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const preferredCenter = str(body.preferred_center, 60);
  const bestTime = str(body.best_time, 40);
  const note = str(body.note, 2000);
  const sourcePage = str(body.source_page, 200);

  // Guide signups carry nothing but an address; the rest stays null rather
  // than being filled with empty strings.
  const { error } = await supabase.from("consultation_requests").insert({
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
  });

  if (error) {
    console.error("consultation_requests insert failed:", error.message);
    return NextResponse.json(
      { error: "We couldn't save your request. Please try again, or call us." },
      { status: 500 }
    );
  }

  // The row is saved — from here the request has succeeded no matter what.
  //
  // Both kinds of lead page a human, with a message shaped to what was
  // actually collected: a guide signup is an address, not a callback.
  //
  // TODO: attach guide PDF — once the guide exists, email it to the visitor
  // here, over the same Resend path lib/lead-notification.ts already uses.
  // The notification below tells the team; it does not send the guide.
  if (isGuide && email) {
    await sendGuideNotification({
      email,
      sourcePage,
      submittedAt: new Date(),
    });
  } else if (!isGuide && firstName && phone && helpingWho) {
    // sendLeadNotification never throws; it logs its own failures and returns
    // false, so this is awaited (rather than fired and forgotten, which a
    // serverless runtime may kill before the request finishes) without any
    // risk to the response.
    await sendLeadNotification({
      firstName,
      phone,
      helpingWho,
      concerns,
      preferredCenter,
      bestTime,
      note,
      sourcePage,
      source,
    });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
