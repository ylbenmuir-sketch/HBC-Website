/**
 * What the /10years routes and pages share: the request context (hashed
 * address and agent), the signup handler (notify-me or entry by mode, the
 * limiter, the honeypot, the follow-up email), the old verification and
 * one-tap handlers that also send the follow-up email, and the public
 * winners list in its three states. Server-only.
 */

import { giveawayNow } from "./clock";
import { DRAWINGS, REFERRAL, entryPageMode, pageMode, type PageMode } from "./config";
import { PAGES } from "./copy";
import { currentWinner } from "./drawings";
import { notifyOnListEmail, youreInEmail } from "./emails";
import { REMINDER_BLANK, enterFromForm, entryCount, hashes, notifyFromForm, tapLookup, verifyEntry, verifyNotify, type SignupInput } from "./people";
import { clientAddress, rateLimit, supabaseCounter } from "./rate-limit";
import type { WinnerRow } from "./rows";
import { footingFor, referralLink, sendGiveawayEmail, siteUrl } from "./send";
import { attributionFrom } from "./channel";
import { requireGiveawayStore, type GiveawayStore } from "./store";
import { tokenSecret, verifyToken } from "./tokens";
import { audit } from "./audit";


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
  // Before Nov 9 the real page is already notify-me (Ben, 2026-11-07).
  const mode = entryPageMode(ctx.now);
  if (mode === "closed" || mode === "thank_you") return back("?error=closed");

  // The honeypot: a filled "website" field is a bot. Answer as if it worked,
  // write nothing but the audit line.
  if (field(form, "website", 200).trim()) {
    await audit(store, { actor: "visitor", action: "signup_honeypot", ipHash: ctx.ipHash });
    return back("?sent=1");
  }

  const counter = supabaseCounter(store);
  const limited = await rateLimit(counter, "entry_ip", ctx.ip, { now: ctx.now, salt: secret });
  if (!limited.allowed) return back(limited.reason === "error" ? "?error=unavailable" : "?error=rate_limited");

  // First-touch tags (P1-6): cleaned and normalized, never trusted as typed.
  const attribution = attributionFrom({ utm_source: field(form, "utm_source", 200), utm_medium: field(form, "utm_medium", 200), utm_campaign: field(form, "utm_campaign", 200), utm_content: field(form, "utm_content", 200), ref: field(form, "ref", 20) });
  const sourcePage = field(form, "source_page", 200) || "/10years";

  // The form is the official action (Ben, 2026-11-08). Before entries open it
  // is a REMINDER and nothing more (Ben, 2026-11-10): an email address and,
  // if given, a first name. The email after it is a follow-up — a send
  // failure is logged and the visitor still sees success, because they are.
  if (mode === "notify_me") {
    const r = await notifyFromForm(store, { email: field(form, "email", 254), firstName: field(form, "first_name", 60), marketingOptIn: checked(form, "marketing"), sourcePage, attribution }, ctx);
    if (!r.ok) return back(`?error=${r.reason}`);
    if (r.alreadyVerified) return back("?already=1");
    // One courtesy email per address per ten minutes (no inbox flooding).
    const perEmail = await rateLimit(counter, "verify_email", r.row.email, { now: ctx.now, salt: secret });
    if (perEmail.allowed) {
      // With the one-click unsubscribe link (Ben, 2026-11-09): the same signed /unsubscribe the countdown emails use.
      const footing = footingFor(r.row.email, store.env, true, secret);
      const email = notifyOnListEmail({ firstName: r.row.first_name ?? "", pageUrl: `${siteUrl()}/10years`, footing });
      const sent = await sendGiveawayEmail({ to: r.row.email, email, marketing: false, footing });
      if (sent.status !== "sent") console.error(`[giveaway signup] on-the-list email not sent (the signup stands): ${sent.error}`);
    }
    return back("?sent=1");
  }

  // live — the entry. No new/current question (Ben, 2026-11-03): one prize
  // per drawing; staff ask on the winner call.
  const input: SignupInput = {
    firstName: field(form, "first_name", 60),
    lastName: field(form, "last_name", 60),
    email: field(form, "email", 254),
    zip: field(form, "zip", 10),
    // One box on the form: "I'm 18+ and agree to the Official Rules".
    ageConfirmed: checked(form, "age_rules"),
    rulesAccepted: checked(form, "age_rules"),
    marketingOptIn: checked(form, "marketing"),
    // Required to enter (Ben, 2026-11-10); only ever used to reach a winner.
    phone: field(form, "phone", 40) || null,
    ref: field(form, "ref", 20) || null,
    sourcePage,
    attribution,
  };
  // The one-tap link's form (Ben, 2026-11-10) carries its token: the entry is tied to that reminder, and a refusal goes back to that same filled-in form.
  const tapToken = field(form, "tap", 600);
  const tap = tapToken ? verifyToken(tapToken, { kind: "live_tap", env: store.env, now: ctx.now }, secret) : null;
  const notifyId = tap?.ok ? tap.payload.s : null;
  const r = await enterFromForm(store, input, ctx, { notifyId });
  if (!r.ok) return notifyId ? { to: `/10years/enter/${encodeURIComponent(tapToken)}`, query: `?error=${r.reason}` } : back(`?error=${r.reason}`);
  if (r.alreadyEntered) return back("?already=1");
  if (input.ref) {
    const byCode = await rateLimit(counter, "referral_code", input.ref, { now: ctx.now, salt: secret });
    if (!byCode.allowed) await audit(store, { actor: "system", action: "referral_code_burst", reason: input.ref.toUpperCase(), ipHash: ctx.ipHash });
  }
  if (r.first) await sendYoureIn(store, secret, r.person.id, r.referredBonus, ctx.now);
  // The card shows the share link at once, so the email isn't needed for it either.
  return back(`?sent=1&share=${encodeURIComponent(r.person.referral_code)}${r.earlyBird ? "&eb=1" : ""}`);
}

/** `shareUrl` is set once an entry is confirmed (the card shows it with a copy button). */
export type VerifyPageResult = { ok: true; kind: "notify" | "entry"; message: string; shareUrl?: string } | { ok: false; message: string };

/** What the reminder knows, for the entry form the one-tap link opens. */
export type TapPrefill = { email: string; firstName: string; lastName: string; zip: string; marketing: boolean };
export type TapPageResult = VerifyPageResult | { ok: true; kind: "form"; prefill: TapPrefill; token: string };

/** The verification click from emails sent before 2026-11-08, either kind
 *  (idempotent; a row the form already confirmed just says so). Sends
 *  "You're in" on a first entry verification. */
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
  if (r.first) await sendYoureIn(store, secret, r.person.id, r.referredBonus, now);
  return { ok: true, kind: "entry", message: PAGES.tenYears.verifiedEntry(await entryCount(store, r.person.id)), shareUrl: await shareUrlFor(store, r.person.id) };
}

/**
 * The one-tap link (Ben, 2026-11-10). It opens the live entry form filled
 * in with what the reminder holds — the email, the first name if given, and
 * the last name and ZIP on rows from the earlier, longer form — and writes
 * nothing: the entry counts when that form is submitted with the rest
 * (phone, the 18+/rules box). Someone already entered sees "You're in".
 */
export async function handleTap(token: string | null): Promise<TapPageResult> {
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
  const r = await tapLookup(store, v.payload.s, now);
  if (!r.ok) {
    if (r.reason === "not_open") return { ok: false, message: entryPageMode(now) === "notify_me" ? PAGES.tenYears.tapNotOpen : PAGES.tenYears.tapClosed };
    return { ok: false, message: PAGES.tenYears.verifyInvalid };
  }
  if (r.state === "entered") return { ok: true, kind: "entry", message: PAGES.tenYears.tapped(r.earlyBird), shareUrl: await shareUrlFor(store, r.person.id) };
  const n = r.row;
  // A database without 0021 holds blanks for what a reminder never gave (people.ts REMINDER_BLANK).
  const zip = n.zip && n.zip !== REMINDER_BLANK.zip ? n.zip : "";
  return { ok: true, kind: "form", prefill: { email: n.email_display, firstName: n.first_name ?? "", lastName: n.last_name ?? "", zip, marketing: n.marketing_opt_in }, token };
}

async function shareUrlFor(store: GiveawayStore, personId: string): Promise<string | undefined> {
  const { data } = await store.select("giveaway_people", "referral_code").eq("id", personId).single();
  const code = (data as { referral_code?: string } | null)?.referral_code;
  return code ? referralLink(code) : undefined;
}

async function sendYoureIn(store: GiveawayStore, secret: string, personId: string, referredBonus: boolean, now: Date): Promise<void> {
  const { data } = await store.select("giveaway_people", "*").eq("id", personId).single();
  const p = data as { email: string; first_name: string; referral_code: string };
  const next = DRAWINGS.find((d) => d.at.getTime() > now.getTime()) ?? null;
  // With the one-click unsubscribe link (Ben, 2026-11-09); unsubscribing stops the emails, never the entry.
  const footing = footingFor(p.email, store.env, true, secret);
  const email = youreInEmail({ firstName: p.first_name, referredBonus, nextDrawing: next, referralUrl: referralLink(p.referral_code), footing });
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
