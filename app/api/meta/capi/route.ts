import { NextResponse, after } from "next/server";
import { metaContext, sendMetaEvent } from "@/lib/meta-capi";
import { isMetaEventId } from "@/lib/meta";
import { SITE_URL } from "@/lib/site-config";

/**
 * POST /api/meta/capi — the server copy of a browser `Contact` (a tel: or
 * sms: tap; components/MetaPixel.tsx), same event_id (lib/meta-capi.ts).
 *
 * Contact only: a Lead is sent by /api/consultation itself, after the row
 * saves, and cannot be posted from a browser. Same-origin only — the Origin
 * header must name the host the request came to. The body is
 * { event_id, page, fbclid?, landed_at? } and nothing else is read; the
 * page is cut down by metaSourceUrl before Meta sees it. Always 204: the
 * visitor's tap is never waiting on this, and a refusal tells a caller nothing.
 */
export async function POST(request: Request) {
  const done = new NextResponse(null, { status: 204 });
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  let originHost: string | null = null;
  try {
    originHost = origin ? new URL(origin).host : null;
  } catch {
    originHost = null;
  }
  if (!originHost || !host || originHost !== host) return done;

  const body = (await request.json().catch(() => null)) as
    | { event_id?: unknown; page?: unknown; fbclid?: unknown; landed_at?: unknown }
    | null;
  if (!body || !isMetaEventId(body.event_id)) return done;

  const ctx = metaContext(request.headers, { fbclid: body.fbclid, landedAt: body.landed_at });
  const eventId = body.event_id;
  after(() => sendMetaEvent({ eventName: "Contact", eventId, page: body.page, ctx, origin: SITE_URL }));
  return done;
}
