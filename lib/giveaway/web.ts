/**
 * What the /10years routes and pages share: the request context (hashed
 * address and agent), the signup handler (notify-me or entry by mode, the
 * limiter, the honeypot, the verification email), the verification and
 * one-tap handlers that also send the follow-up email, and the public
 * winners list in its three states. Server-only.
 */

import { giveawayNow } from "./clock";
import { DRAWINGS, REFERRAL, pageMode, type PageMode } from "./config";
import { PAGES } from "./copy";
import { currentWinner } from "./drawings";
import { entryVerifyEmail, notifyVerifyEmail, youreInEmail } from "./emails";
import { entryCount, entrySignup, hashes, liveTap, notifySignup, verifyEntry, verifyNotify, type SignupInput } from "./people";
import { clientAddress, rateLimit, supabaseCounter } from "./rate-limit";
import type { WinnerRow } from "./rows";
import { bookLink, footingFor, referralLink, sendGiveawayEmail, tokenLink } from "./send";
import { requireGiveawayStore, type GiveawayStore } from "./store";
import { tokenSecret, verifyToken } from "./tokens";
import { audit } from "./audit";

export const VERIFY_LINK_TTL_MS = 7 * 24 * 60 * 60_000;

export type RequestContext = { ip: string; ipHash: string; uaHash: string | null; now: Date };

export function requestContext(request: Request, secret: string): RequestContext {
  const ip = clientAddress(request);
  const { ipHash, uaHash } = hashes(ip, request.headers.get("user-agent"), secret);
  return { ip, ipHash, uaHash, now: giveawayNow() };
}

export function field(form: FormData | null, name: string, max = 200): string {
  const v = form?.get(name);
  return typeof v === "string" ? v.slice(0, max) : "";
}

export function checked(form: FormData | null, name: string): boolean {
  const v = form?.get(name);
  return v === "on" || v === "true" || v === "1" || v === "yes";
}

export type SignupResult = { to: string; query: string };

/**
 * One handler for the form in both modes. Always answers with where to
 * redirect: `?sent=1`, `?already=1`, or `?error=<reason>`.
 */
export async function handleSignup(request: Request, form: FormData | null): Promise<SignupResult> {
  const back = (query: string): SignupResult => ({ to: "/10years", query });
  let store: GiveawayStore;
  let secret: string;
  try {
    store = requireGiveawayStore();
    secret = tokenSecret();
  } catch (err) {
    console.error(`[giveaway signup] not configured: ${err instanceof Error ? err.message : "unknown"}`);
    return back("?error=unavailable");
  }
  const ctx = requestContext(request, secret);
  const mode = pageMode(ctx.now);
  if (mode === "hidden") return { to: "/10years", query: "" };
  if (mode === "closed" || mode === "thank_you") return back("?error=closed");

  const input: SignupInput = {
    firstName: field(form, "first_name", 60),
    lastName: field(form, "last_name", 60),
    email: field(form, "email", 254),
    zip: field(form, "zip", 10),
    // One box on the form: "I'm 18+ and agree to the Official Rules".
    ageConfirmed: checked(form, "age_rules"),
    rulesAccepted: checked(form, "age_rules"),
    isExistingClient: checked(form, "existing_client"),
    marketingOptIn: checked(form, "marketing"),
    ref: field(form, "ref", 20) || null,
    sourcePage: field(form, "source_page", 200) || "/10years",
  };

  // The honeypot: a filled "website" field is a bot. Answer as if it worked,
  // write nothing but the audit line.
  if (field(form, "website", 200).trim()) {
    await audit(store, { actor: "visitor", action: "signup_honeypot", ipHash: ctx.ipHash });
    return back("?sent=1");
  }

  const counter = supabaseCounter(store);
  const limited = await rateLimit(counter, "entry_ip", ctx.ip, { now: ctx.now, salt: secret });
  if (!limited.allowed) return back(limited.reason === "error" ? "?error=unavailable" : "?error=rate_limited");

  if (mode === "notify_me") {
    const r = await notifySignup(store, input, ctx);
    if (!r.ok) return back(`?error=${r.reason}`);
    if (r.alreadyVerified) return back("?already=1");
    const perEmail = await rateLimit(counter, "verify_email", r.row.email, { now: ctx.now, salt: secret });
    if (!perEmail.allowed) return back("?sent=1"); // one email per ten minutes; say nothing more
    const email = notifyVerifyEmail({ firstName: r.row.first_name, verifyUrl: tokenLink("verify_notify", r.row.id, store.env, { secret, expiresAt: new Date(ctx.now.getTime() + VERIFY_LINK_TTL_MS) }), footing: footingFor(r.row.email, store.env, false, secret) });
    const sent = await sendGiveawayEmail({ to: r.row.email, email, marketing: false, footing: null });
    if (sent.status !== "sent") {
      console.error(`[giveaway signup] notify verification not sent: ${sent.error}`);
      return back("?error=send_failed");
    }
    return back("?sent=1");
  }

  // live
  const r = await entrySignup(store, input, ctx);
  if (!r.ok) return back(`?error=${r.reason}`);
  if (r.alreadyVerified) return back("?already=1");
  if (input.ref) {
    const byCode = await rateLimit(counter, "referral_code", input.ref, { now: ctx.now, salt: secret });
    if (!byCode.allowed) await audit(store, { actor: "system", action: "referral_code_burst", reason: input.ref.toUpperCase(), ipHash: ctx.ipHash });
  }
  const perEmail = await rateLimit(counter, "verify_email", r.person.email, { now: ctx.now, salt: secret });
  if (!perEmail.allowed) return back("?sent=1");
  const email = entryVerifyEmail({ firstName: r.person.first_name, verifyUrl: tokenLink("verify_entry", r.person.id, store.env, { secret, expiresAt: new Date(ctx.now.getTime() + VERIFY_LINK_TTL_MS) }), footing: footingFor(r.person.email, store.env, false, secret) });
  const sent = await sendGiveawayEmail({ to: r.person.email, email, marketing: false, footing: null });
  if (sent.status !== "sent") {
    console.error(`[giveaway signup] entry verification not sent: ${sent.error}`);
    return back("?error=send_failed");
  }
  return back("?sent=1");
}

/** `shareUrl` is set once an entry is confirmed (the card shows it with a copy button). */
export type VerifyPageResult = { ok: true; kind: "notify" | "entry"; message: string; shareUrl?: string } | { ok: false; message: string };

/** The verification click, either kind. Sends "You're in" on a first entry verification. */
export async function handleVerify(token: string | null): Promise<VerifyPageResult> {
  let store: GiveawayStore;
  let secret: string;
  try {
    store = requireGiveawayStore();
    secret = tokenSecret();
  } catch {
    return { ok: false, message: PAGES.tenYears.errors.unavailable };
  }
  if (!token) return { ok: false, message: PAGES.tenYears.verifyInvalid };
  const now = giveawayNow();
  const asNotify = verifyToken(token, { kind: "verify_notify", env: store.env, now }, secret);
  if (asNotify.ok) {
    const r = await verifyNotify(store, asNotify.payload.s, now);
    return r.ok ? { ok: true, kind: "notify", message: PAGES.tenYears.verifiedNotify } : { ok: false, message: PAGES.tenYears.verifyInvalid };
  }
  const asEntry = verifyToken(token, { kind: "verify_entry", env: store.env, now }, secret);
  if (!asEntry.ok) return { ok: false, message: PAGES.tenYears.verifyInvalid };
  const r = await verifyEntry(store, asEntry.payload.s, now);
  if (!r.ok) return { ok: false, message: PAGES.tenYears.verifyInvalid };
  if (r.first) await sendYoureIn(store, secret, r.person.id, r.referredBonus, r.offer.code, now);
  return { ok: true, kind: "entry", message: PAGES.tenYears.verifiedEntry(await entryCount(store, r.person.id)), shareUrl: await shareUrlFor(store, r.person.id) };
}

/** The one-tap link. Sends "You're in" on the first tap. */
export async function handleTap(token: string | null): Promise<VerifyPageResult> {
  let store: GiveawayStore;
  let secret: string;
  try {
    store = requireGiveawayStore();
    secret = tokenSecret();
  } catch {
    return { ok: false, message: PAGES.tenYears.errors.unavailable };
  }
  if (!token) return { ok: false, message: PAGES.tenYears.verifyInvalid };
  const now = giveawayNow();
  const v = verifyToken(token, { kind: "live_tap", env: store.env, now }, secret);
  if (!v.ok) return { ok: false, message: PAGES.tenYears.verifyInvalid };
  const r = await liveTap(store, v.payload.s, now);
  if (!r.ok) {
    if (r.reason === "not_open") return { ok: false, message: pageMode(now) === "notify_me" ? PAGES.tenYears.tapNotOpen : PAGES.tenYears.tapClosed };
    return { ok: false, message: PAGES.tenYears.verifyInvalid };
  }
  if (r.first) await sendYoureIn(store, secret, r.person.id, false, r.offer.code, now);
  return { ok: true, kind: "entry", message: PAGES.tenYears.tapped(r.earlyBird), shareUrl: await shareUrlFor(store, r.person.id) };
}

async function shareUrlFor(store: GiveawayStore, personId: string): Promise<string | undefined> {
  const { data } = await store.select("giveaway_people", "referral_code").eq("id", personId).single();
  const code = (data as { referral_code?: string } | null)?.referral_code;
  return code ? referralLink(code) : undefined;
}

async function sendYoureIn(store: GiveawayStore, secret: string, personId: string, referredBonus: boolean, offerCode: string, now: Date): Promise<void> {
  const { data } = await store.select("giveaway_people", "*").eq("id", personId).single();
  const p = data as { email: string; first_name: string; is_existing_client: boolean; referral_code: string };
  const next = DRAWINGS.find((d) => d.at.getTime() > now.getTime()) ?? null;
  const footing = footingFor(p.email, store.env, false, secret);
  const email = youreInEmail({ firstName: p.first_name, isExistingClient: p.is_existing_client, referredBonus, nextDrawing: next, referralUrl: referralLink(p.referral_code), offerCode, bookUrl: bookLink(offerCode), footing });
  const sent = await sendGiveawayEmail({ to: p.email, email, marketing: false, footing });
  if (sent.status !== "sent") console.error(`[giveaway] You're in not sent: ${sent.error}`);
}

/* ------------------------------------------------------------------ */
/* The public winners list (decision 7)                                */
/* ------------------------------------------------------------------ */

/** `label` is the public "First L., City" when the winner said yes; the ladder cards show it bare. */
export type PublicWinner = { slot: string; day: string; line: string; label: string | null; state: "named" | "claimed" | "reaching" | "pending" };

export async function publicWinners(store: GiveawayStore): Promise<PublicWinner[]> {
  const { data } = await store.select("giveaway_drawings", "id, slot, status, scheduled_at");
  const rows = (data ?? []) as Array<{ id: string; slot: string; status: string; scheduled_at: string }>;
  const out: PublicWinner[] = [];
  for (const d of DRAWINGS) {
    const row = rows.find((r) => r.slot === d.slot);
    const dayLabel = d.kind === "grand" ? `${d.dayName} (grand prize)` : d.dayName;
    const t = PAGES.tenYears;
    let winner: WinnerRow | null = null;
    if (row && (row.status === "drawn" || row.status === "redrawn")) winner = await currentWinner(store, row.id);
    if (!winner) {
      out.push({ slot: d.slot, day: d.dayName, line: t.winnerPending(dayLabel, d.ct), label: null, state: "pending" });
    } else if (winner.public_ok && winner.public_label) {
      out.push({ slot: d.slot, day: d.dayName, line: t.winnerNamed(dayLabel, winner.public_label), label: winner.public_label, state: "named" });
    } else if (winner.status === "contacted" || winner.status === "claimed") {
      out.push({ slot: d.slot, day: d.dayName, line: t.winnerClaimed(dayLabel), label: null, state: "claimed" });
    } else {
      out.push({ slot: d.slot, day: d.dayName, line: t.winnerReaching(dayLabel), label: null, state: "reaching" });
    }
  }
  return out;
}

export { pageMode, REFERRAL };
export type { PageMode };
