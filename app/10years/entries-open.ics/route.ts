import { entriesOpenEvent, icsText } from "@/lib/giveaway/calendar";
import { siteUrl } from "@/lib/giveaway/send";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The notify-me email's "Apple / Outlook" calendar file (lib/giveaway/calendar.ts). */
export function GET() {
  return new Response(icsText(entriesOpenEvent(siteUrl())), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="hbc-10-year-giveaway.ics"',
      "Cache-Control": "public, max-age=3600",
      "X-Robots-Tag": "noindex",
    },
  });
}
