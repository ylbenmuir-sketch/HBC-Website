import { NextResponse } from "next/server";
import { calendarUtmFor, entriesOpenEvent, googleCalendarUrl } from "@/lib/giveaway/calendar";
import { siteUrl } from "@/lib/giveaway/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The "Google Calendar" button, in the notify-me email and on /10years: our URL (counted by its UTM tags in the logs), then Google's template link. */
export function GET(request: Request) {
  return NextResponse.redirect(googleCalendarUrl(entriesOpenEvent(siteUrl(), calendarUtmFor(request.url))), { status: 302, headers: { "X-Robots-Tag": "noindex", "Cache-Control": "no-store" } });
}
