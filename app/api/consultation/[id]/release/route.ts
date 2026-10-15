import { NextResponse } from "next/server";
import { releaseHeld } from "@/lib/held-notification";
import { sendHeldRow, supabaseHeldStore } from "@/lib/held-notification-store";

export const runtime = "nodejs";

/**
 * POST /api/consultation/<id>/release — the contact form's "Skip for now"
 * (and a page-two "Save" with nothing filled in).
 *
 * Sends the held staff notification now instead of at the two-minute mark
 * (lib/held-notification.ts). It changes nothing a visitor typed and takes no
 * body. Only a held row can be claimed, so on a chat row, a row already
 * sent, or a row that was never held this does nothing at all — and answers
 * the same 200, so the response says nothing about the row.
 *
 * The id is the authority, as for the PATCH beside it: an unguessable uuid
 * v4 handed only to the browser that made the request.
 */
const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!UUID_V4.test(id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  // Awaited: a serverless runtime may stop the moment the response returns.
  // Never throws (releaseHeld logs its own outcome); if it cannot send, the
  // row stays held and the release job retries it.
  await releaseHeld(supabaseHeldStore, sendHeldRow, id, "skip");
  return NextResponse.json({ ok: true }, { status: 200 });
}
