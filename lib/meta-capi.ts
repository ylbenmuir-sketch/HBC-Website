/**
 * Meta Conversions API — the server half of the Meta Pixel (Ben, 2026-11-09).
 * Rules shared with the browser are in lib/meta.ts; read that first.
 *
 * Two events, each with the SAME event_id the browser pixel used, so Meta
 * counts one:
 *   Lead     sent by /api/consultation after the row saves (form, chat and a
 *            giveaway booking — exactly where GA's submit_lead_form fires).
 *   Contact  sent by /api/meta/capi when the browser reports a tel:/sms: tap.
 *
 * What Meta receives, and nothing more (buildMetaEvent picks named fields):
 *   event_name, event_time, event_id, action_source "website",
 *   event_source_url — origin + "/" unless the page is a general one
 *                      (metaAllowedPath); query strings dropped except utm_*.
 *   user_data        — client_ip_address, client_user_agent, fbc, fbp.
 * NO email or phone (hashed or not), no name, no location, no custom_data
 * (Ben, 2026-11-09): the privacy policy promises the phone number and
 * text-message opt-in data are never shared, and nothing about health is.
 *
 * Never throws and never delays a visitor: callers run it in `after()`, it
 * gives up after 3 s, and a failure is one log line with the HTTP status and
 * Meta's error code — never the token, the payload or anything a visitor sent.
 *
 * Sends only when NEXT_PUBLIC_META_PIXEL_ID and META_CAPI_TOKEN are set AND
 * this is the Production deployment answering on the site's own domain (a
 * *.vercel.app alias or a preview sends nothing) — or META_CAPI=on, for a
 * local test. META_TEST_EVENT_CODE (Events Manager → Test events) routes
 * events to the test view while checking; unset it afterwards.
 */

import { analyticsAllowedHost } from "./analytics";
import { META_PIXEL_ID, isMetaEventId, metaAllowedPath, metaBlockedPath } from "./meta";

/** Graph API version (v25.0, released 2026-02-18; supported into 2028). */
export const META_GRAPH_VERSION = "v25.0";
const SEND_TIMEOUT_MS = 3_000;

export type MetaEventName = "Lead" | "Contact";

/** What a request tells us about the browser — read from its own headers and cookies. */
export type MetaContext = {
  host: string | null;
  ip: string | null;
  userAgent: string | null;
  fbc: string | null;
  fbp: string | null;
};

type Env = Record<string, string | undefined>;

export function metaCapiEnabled(host: string | null, env: Env = process.env): boolean {
  if (!META_PIXEL_ID || !env.META_CAPI_TOKEN) return false;
  if (env.META_CAPI === "on") return true;
  return env.VERCEL_ENV === "production" && analyticsAllowedHost(host?.split(":")[0]);
}

/**
 * The page address Meta may see: null on a blocked page (send nothing),
 * origin + "/" on anything but a general page, else origin + path with only
 * the utm_* parameters kept.
 */
export function metaSourceUrl(page: unknown, origin: string): string | null {
  if (typeof page !== "string" || !page.startsWith("/") || page.startsWith("//")) return `${origin}/`;
  let url: URL;
  try {
    url = new URL(page, origin);
  } catch {
    return `${origin}/`;
  }
  if (metaBlockedPath(url.pathname)) return null;
  if (!metaAllowedPath(url.pathname)) return `${origin}/`;
  const kept = new URLSearchParams();
  for (const [k, v] of url.searchParams) if (k.toLowerCase().startsWith("utm_")) kept.append(k, v);
  const q = kept.toString();
  return `${origin}${url.pathname}${q ? `?${q}` : ""}`;
}

/** One cookie's value from a Cookie header. */
export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) {
      const v = part.slice(i + 1).trim();
      return v ? decodeURIComponent(v) : null;
    }
  }
  return null;
}

const FB_COOKIE = /^fb\.\d\.\d+\.[A-Za-z0-9._-]+$/;

/**
 * _fbc as the pixel set it; else, when the visit landed with ?fbclid=, the
 * same format built from it: fb.1.<landing time ms>.<fbclid>.
 */
export function metaFbc(cookie: string | null, fbclid: unknown, landedAt: unknown, now = Date.now()): string | null {
  if (cookie && FB_COOKIE.test(cookie)) return cookie;
  if (typeof fbclid !== "string" || !/^[A-Za-z0-9._-]{1,500}$/.test(fbclid)) return null;
  const ts = typeof landedAt === "number" && Number.isFinite(landedAt) && landedAt > 0 && landedAt <= now ? Math.floor(landedAt) : now;
  return `fb.1.${ts}.${fbclid}`;
}

/** The browser's details from a request: first X-Forwarded-For hop, user agent, the two Meta cookies. */
export function metaContext(headers: Headers, click: { fbclid?: unknown; landedAt?: unknown } = {}): MetaContext {
  const cookie = headers.get("cookie");
  const fbp = readCookie(cookie, "_fbp");
  const ip = (headers.get("x-forwarded-for")?.split(",")[0] ?? headers.get("x-real-ip") ?? "").trim();
  return {
    host: headers.get("host"),
    ip: ip || null,
    userAgent: headers.get("user-agent")?.slice(0, 500) || null,
    fbc: metaFbc(readCookie(cookie, "_fbc"), click.fbclid, click.landedAt),
    fbp: fbp && FB_COOKIE.test(fbp) ? fbp : null,
  };
}

/** The headers to hand an in-process request (the chat's submit) so the context carries over. */
export function metaForwardHeaders(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  for (const h of ["host", "cookie", "x-forwarded-for", "x-real-ip", "user-agent"]) {
    const v = headers.get(h);
    if (v) out[h] = v;
  }
  return out;
}

/** The one event object Meta receives. Named fields only — nothing is spread in. */
export function buildMetaEvent(input: {
  eventName: MetaEventName;
  eventId: string;
  sourceUrl: string;
  ctx: MetaContext;
  now?: number;
}) {
  const userData: Record<string, string> = {};
  if (input.ctx.ip) userData.client_ip_address = input.ctx.ip;
  if (input.ctx.userAgent) userData.client_user_agent = input.ctx.userAgent;
  if (input.ctx.fbc) userData.fbc = input.ctx.fbc;
  if (input.ctx.fbp) userData.fbp = input.ctx.fbp;
  return {
    event_name: input.eventName,
    event_time: Math.floor((input.now ?? Date.now()) / 1000),
    event_id: input.eventId,
    action_source: "website" as const,
    event_source_url: input.sourceUrl,
    user_data: userData,
  };
}

/**
 * Send one event. Resolves either way; a refusal or a timeout is logged
 * without anything a visitor sent.
 */
export async function sendMetaEvent(
  input: { eventName: MetaEventName; eventId: string; page: unknown; ctx: MetaContext; origin: string },
  env: Env = process.env
): Promise<void> {
  try {
    if (!metaCapiEnabled(input.ctx.host, env)) return;
    if (!isMetaEventId(input.eventId)) return;
    const sourceUrl = metaSourceUrl(input.page, input.origin);
    if (sourceUrl === null) return;
    const event = buildMetaEvent({ eventName: input.eventName, eventId: input.eventId, sourceUrl, ctx: input.ctx });
    // The token rides in the body, never the URL, so no URL in a log can carry it.
    const body: Record<string, unknown> = { data: [event], access_token: env.META_CAPI_TOKEN };
    if (env.META_TEST_EVENT_CODE) body.test_event_code = env.META_TEST_EVENT_CODE;
    const res = await fetch(
      `https://graph.facebook.com/${META_GRAPH_VERSION}/${encodeURIComponent(META_PIXEL_ID)}/events`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      }
    );
    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { error?: { code?: unknown; error_subcode?: unknown } } | null;
      console.error(
        `[meta capi] ${input.eventName} refused: status=${res.status} code=${String(err?.error?.code ?? "?")} subcode=${String(err?.error?.error_subcode ?? "-")}`
      );
      return;
    }
    console.log(`[meta capi] ${input.eventName} sent event_id=${input.eventId}`);
  } catch (error) {
    console.error(`[meta capi] ${input.eventName} failed: ${error instanceof Error ? error.name : "error"}`);
  }
}
