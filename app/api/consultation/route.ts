import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendLeadNotification } from "@/lib/lead-notification";

export const runtime = "nodejs";

const HELPING_OPTIONS = new Set(["My child", "Myself", "Someone else"]);

type Payload = {
  helping_who?: unknown;
  concerns?: unknown;
  first_name?: unknown;
  phone?: unknown;
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

export async function POST(request: Request) {
  let body: Payload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const firstName = str(body.first_name, 100);
  const phone = str(body.phone, 40);
  const helpingWho = str(body.helping_who, 40);
  if (!firstName || !phone || !helpingWho || !HELPING_OPTIONS.has(helpingWho)) {
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

  const { error } = await supabase.from("consultation_requests").insert({
    helping_who: helpingWho,
    concerns,
    first_name: firstName,
    phone,
    preferred_center: preferredCenter,
    best_time: bestTime,
    note,
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
  // Page a human so the lead is actually seen. sendLeadNotification never
  // throws; it logs its own failures and returns false, so this is awaited
  // (rather than fired and forgotten, which a serverless runtime may kill
  // before the request finishes) without any risk to the response.
  await sendLeadNotification({
    firstName,
    phone,
    helpingWho,
    concerns,
    preferredCenter,
    bestTime,
    note,
    sourcePage,
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
