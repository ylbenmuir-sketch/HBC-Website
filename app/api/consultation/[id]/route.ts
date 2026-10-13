import { NextResponse } from "next/server";
import { forwardInquiry } from "@/lib/inquiry-intake";
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
 * Exactly three columns — `helping_who`, `concerns`, `note` — and a body
 * naming any other key is refused outright, so this endpoint cannot be used
 * to change a name, a phone number, a center or a time after the email that
 * carried them has gone. Only `type = 'consultation'` rows from the form are
 * touched: a chat row has these answers already and no browser was ever
 * handed its id.
 *
 * ## No second email
 *
 * The email went at step one and is the lead (lib/lead-notification.ts); it
 * says these answers may follow and where to read them. This route forwards
 * the inquiry to the platform when `helping_who` arrives, because the
 * platform contract requires it and the POST could not satisfy that for a
 * form lead — see the `inquiry` note in ../route.ts.
 *
 * ## The id is the authority
 *
 * A uuid v4 the server generated and returned to the browser that made the
 * request — 122 bits of randomness, which is the whole access control. A
 * wrong or unknown id answers 404, with nothing to distinguish "never
 * existed" from "not yours".
 */

const PATCHABLE = new Set(["helping_who", "concerns", "note"]);
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
};

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

  // Anything that is not one of the three is a refusal, not an ignore: a
  // caller sending `phone` here is either a bug to surface or an attempt.
  const keys = Object.keys(fields);
  if (keys.length === 0 || keys.some((k) => !PATCHABLE.has(k))) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const update: { helping_who?: string; concerns?: string[]; note?: string | null } = {};

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
        "id, helping_who, concerns, first_name, phone, email, preferred_center, best_time, note"
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
    ]
      .filter(Boolean)
      .join(", ")}`
  );

  // The platform now has what its contract needs. Awaited, never thrown;
  // forwardInquiry logs its own outcome. No honeypot at this step — the bot
  // field lives on step one, which a bot that got this far already passed.
  if (row.helping_who && row.first_name && row.phone) {
    await forwardInquiry({
      helpingWho: row.helping_who,
      concerns: row.concerns ?? [],
      firstName: row.first_name,
      phone: row.phone,
      email: row.email,
      preferredCenter: row.preferred_center,
      bestTime: row.best_time,
      note: row.note,
      website: "",
    });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
