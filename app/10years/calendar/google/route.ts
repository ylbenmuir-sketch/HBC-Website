import { NextResponse } from "next/server";
import { entriesOpenEvent, googleCalendarUrl } from "@/lib/giveaway/calendar";
import { siteUrl } from "@/lib/giveaway/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The notify-me email's "Google Calendar" button: our URL (counted by its UTM tags in the logs), then Google's template link. */
export function GET() {
  return NextResponse.redirect(googleCalendarUrl(entriesOpenEvent(siteUrl())), { status: 302, headers: { "X-Robots-Tag": "noindex", "Cache-Control": "no-store" } });
}
