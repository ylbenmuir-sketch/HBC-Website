import { calendarUtmFor, entriesOpenEvent, icsText } from "@/lib/giveaway/calendar";
import { siteUrl } from "@/lib/giveaway/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The "Apple / Outlook" calendar file, from the notify-me email and from /10years (lib/giveaway/calendar.ts). */
export function GET(request: Request) {
  return new Response(icsText(entriesOpenEvent(siteUrl(), calendarUtmFor(request.url))), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="hbc-10-year-giveaway.ics"',
      "Cache-Control": "public, max-age=3600",
      "X-Robots-Tag": "noindex",
    },
  });
}
