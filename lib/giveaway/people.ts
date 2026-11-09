/**
 * Signing up, verifying, entering (GIVEAWAY-PLAN.md §4; decisions 1, 3, 8,
 * 12, 13, 15). The rules of who is in and with how many chances:
 *
 * THE FORM IS THE OFFICIAL ACTION (Ben, 2026-11-08). Submitting the form
 * puts someone on the list (notify-me) or enters them (live) on the spot —
 * no email click. The emails that follow are a courtesy, never a condition.
 * `verified_at` keeps its column name but now means "submitted the form"
 * (or, for rows from before this change, "clicked the old link").
 *
 *   notify-me  → giveaway_notify row, verified_at set at submit
 *                (notifyFromForm). Nobody is entered yet.
 *   It's live  → the optional one-tap link turns a notify row into a person
 *                + base entry; +1 early_bird before Monday's noon drawing.
 *                Idempotent.
 *   entry      → enterFromForm: the giveaway_people row, then at once
 *                verified_at, the base entry, the referred_bonus (+1) when
 *                a referral code was carried, the referrer's three
 *                referral_bonus rows (cap ten friends, no self-referral),
 *                the offer code, and — for a notify-me signup entering by
 *                form instead of the tap — the same early bird. Idempotent.
 *
 * Every write goes through GiveawayStore (env-scoped). Emails are not sent
 * here: each function returns what the caller should send (the token link,
 * the "You're in" inputs), so the route sends through lib/giveaway/send.ts
 * and the unit tests send nothing. Pure apart from the store and the clock
 * passed in.
 */

import { audit } from "./audit";
import { EARLY_BIRD, REFERRAL, RULES_VERSION, SCHEDULE } from "./config";
import { emailDomain, normalizeEmail } from "./email-normalize";
import type { EntryRow, NotifyRow, OfferRow, PersonRow } from "./rows";
import type { GiveawayStore } from "./store";
import { offerCode, referralCode, sha256Hex } from "./tokens";
import { zipInfo } from "./zip";
import type { Attribution } from "./channel";
import { looksLikeUsPhone } from "../lead-options";
import { displayPhone } from "../email/format";

export const MARKETING_OPT_IN_WORDING = "Yes, send me news from Harmonized Brain Centers after the giveaway.";

/** Throwaway domains that void a referral bonus (the entry itself stands). */
export const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "10minutemail.com",
  "tempmail.com",
  "temp-mail.org",
  "yopmail.com",
  "throwawaymail.com",
  "getnada.com",
  "trashmail.com",
  "sharklasers.com",
  "dispostable.com",
  "maildrop.cc",
  "fakeinbox.com",
  "mintemail.com",
  "mohmal.com",
]);

export type SignupInput = {
  firstName: string;
  lastName: string;
  email: string;
  zip: string;
  ageConfirmed: boolean;
  rulesAccepted: boolean;
  marketingOptIn: boolean;
  /** The referral code carried from /10years?ref=… (entry only). */
  ref?: string | null;
  sourcePage?: string | null;
  /** First-touch UTM tags + channel (P1-6, lib/giveaway/channel.ts). */
  attribution?: Attribution | null;
  /** "Best phone if you win" (Ben, 2026-11-06): optional, on the live entry
   *  form only (never notify-me). Saved on the person for the staff alert. */
  phone?: string | null;
};

/** The attribution columns (migration 0016). */
const ATTRIBUTION_COLUMNS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "channel"] as const;

function attributionColumns(a: Partial<Attribution> | null | undefined): Record<string, string | null> {
  if (!a) return {};
  return { utm_source: a.utm_source ?? null, utm_medium: a.utm_medium ?? null, utm_campaign: a.utm_campaign ?? null, utm_content: a.utm_content ?? null, channel: a.channel ?? null };
}

/** Columns added after 0010 that a write may carry before its migration
 *  is applied: 0016's attribution tags, 0018's phone. */
const LATE_COLUMNS: ReadonlyArray<{ migration: string; columns: readonly string[] }> = [
  { migration: "0016", columns: ATTRIBUTION_COLUMNS },
  { migration: "0018", columns: ["phone"] },
];

/** The late columns a PostgREST PGRST204 / Postgres 42703 error names, if any. */
function missingLateColumns(error: unknown): { migration: string; columns: readonly string[] } | null {
  const e = error as { code?: string; message?: string } | null;
  if (!e || (e.code !== "PGRST204" && e.code !== "42703")) return null;
  return LATE_COLUMNS.find((l) => l.columns.some((c) => new RegExp(`\\b${c}\\b`).test(e.message ?? ""))) ?? null;
}

/** Write a row that may carry late columns; before their migration is
 *  applied, save it without them rather than lose the signup. Retries once
 *  per migration that is missing. */
async function writeTolerant<R extends { error: unknown }>(table: "giveaway_people" | "giveaway_notify", row: Record<string, unknown>, write: (row: Record<string, unknown>) => PromiseLike<R>): Promise<R> {
  let current = row;
  let result = await write(current);
  for (let i = 0; i < LATE_COLUMNS.length; i++) {
    const missing = missingLateColumns(result.error);
    if (!missing || !missing.columns.some((c) => c in current)) break;
    console.error(`[giveaway] ${table}: ${missing.columns.join(", ")} missing — migration ${missing.migration} is not applied; saving without ${missing.columns.length > 1 ? "them" : "it"}.`);
    current = Object.fromEntries(Object.entries(current).filter(([k]) => !missing.columns.includes(k)));
    result = await write(current);
  }
  return result;
}

async function insertAttributed(store: GiveawayStore, table: "giveaway_people" | "giveaway_notify", row: Record<string, unknown>) {
  return writeTolerant(table, row, (r) => store.insert(table, r).select("*").single());
}

export type SignupContext = { ipHash: string | null; uaHash: string | null; now: Date };

export type SignupRefusal = "invalid_name" | "invalid_email" | "invalid_zip" | "invalid_phone" | "not_eligible" | "age" | "rules";

export type Validated = {
  firstName: string;
  lastName: string;
  email: string;
  emailDisplay: string;
  zip: string;
  city: string | null;
  nearestCenter: "nashville" | "murfreesboro" | null;
  /** "(615) 555-0134", or null when left blank. */
  phone: string | null;
};

const clean = (s: string, max: number) => s.replace(/\s+/g, " ").trim().slice(0, max);

/** Shared validation. The ZIP message is the one visible refusal (decision 12). */
export function validateSignup(input: SignupInput): { ok: true; value: Validated } | { ok: false; reason: SignupRefusal } {
  const firstName = clean(input.firstName ?? "", 60);
  const lastName = clean(input.lastName ?? "", 60);
  if (!firstName || !lastName) return { ok: false, reason: "invalid_name" };
  const email = normalizeEmail(input.email ?? "");
  if (!email) return { ok: false, reason: "invalid_email" };
  const zip = (input.zip ?? "").trim();
  const info = zipInfo(zip);
  if (!/^\d{5}$/.test(zip)) return { ok: false, reason: "invalid_zip" };
  if (!info.eligible) return { ok: false, reason: "not_eligible" };
  if (!input.ageConfirmed) return { ok: false, reason: "age" };
  if (!input.rulesAccepted) return { ok: false, reason: "rules" };
  // Optional: blank is fine; anything typed must look like a US number.
  const phoneTyped = clean(input.phone ?? "", 40);
  if (phoneTyped && !looksLikeUsPhone(phoneTyped)) return { ok: false, reason: "invalid_phone" };
  const phone = phoneTyped ? displayPhone(phoneTyped) : null;
  return { ok: true, value: { firstName, lastName, email, emailDisplay: input.email.trim().slice(0, 254), zip, city: info.city, nearestCenter: info.nearestCenter, phone } };
}

const fail = (where: string, error: { message: string } | null) => new Error(`${where}: ${error?.message ?? "unknown error"}`);

/* ------------------------------------------------------------------ */
/* Notify-me                                                           */
/* ------------------------------------------------------------------ */

export type NotifyOutcome =
  | { ok: true; row: NotifyRow; verifyTokenSubject: string; alreadyVerified: boolean }
  | { ok: false; reason: SignupRefusal };

/**
 * A notify-me signup. A repeat signup from the same address updates the
 * details and (if unverified) gets another verification email; a verified
 * one is told it is already on the list and gets no email.
 */
export async function notifySignup(store: GiveawayStore, input: SignupInput, ctx: SignupContext): Promise<NotifyOutcome> {
  const v = validateSignup(input);
  if (!v.ok) return v;
  const { value } = v;
  const existing = await store.select("giveaway_notify", "*").eq("email", value.email).maybeSingle();
  if (existing.error) throw fail("notify lookup", existing.error);
  const fields = {
    email_display: value.emailDisplay,
    first_name: value.firstName,
    last_name: value.lastName,
    zip: value.zip,
    age_confirmed: true,
    rules_accepted_at: ctx.now.toISOString(),
    rules_version: RULES_VERSION,
    marketing_opt_in: input.marketingOptIn,
    marketing_opt_in_wording: MARKETING_OPT_IN_WORDING,
    marketing_opt_in_at: input.marketingOptIn ? ctx.now.toISOString() : null,
    source_page: input.sourcePage ?? null,
    ip_hash: ctx.ipHash,
    ua_hash: ctx.uaHash,
  };
  if (existing.data) {
    const row = existing.data as NotifyRow;
    const { data, error } = await store.update("giveaway_notify", fields).eq("id", row.id).select("*").single();
    if (error) throw fail("notify update", error);
    return { ok: true, row: data as NotifyRow, verifyTokenSubject: row.id, alreadyVerified: Boolean(row.verified_at) };
  }
  // First touch: the tags go on the INSERT only; a repeat signup keeps the first.
  const { data, error } = await insertAttributed(store, "giveaway_notify", { email: value.email, ...fields, ...attributionColumns(input.attribution), created_at: ctx.now.toISOString() });
  if (error) throw fail("notify insert", error);
  const row = data as NotifyRow;
  await audit(store, { actor: "visitor", action: "notify_signup", targetTable: "giveaway_notify", targetId: row.id, ipHash: ctx.ipHash });
  return { ok: true, row, verifyTokenSubject: row.id, alreadyVerified: false };
}

/** The verification click for a notify row. Idempotent. */
export async function verifyNotify(store: GiveawayStore, notifyId: string, now: Date): Promise<{ ok: true; row: NotifyRow; first: boolean } | { ok: false; reason: "unknown" }> {
  const { data, error } = await store.select("giveaway_notify", "*").eq("id", notifyId).maybeSingle();
  if (error) throw fail("notify verify lookup", error);
  if (!data) return { ok: false, reason: "unknown" };
  const row = data as NotifyRow;
  if (row.verified_at) return { ok: true, row, first: false };
  const upd = await store.update("giveaway_notify", { verified_at: now.toISOString() }).eq("id", row.id).select("*").single();
  if (upd.error) throw fail("notify verify", upd.error);
  await audit(store, { actor: "visitor", action: "notify_verified", targetTable: "giveaway_notify", targetId: row.id });
  return { ok: true, row: upd.data as NotifyRow, first: true };
}

/**
 * The notify-me form, as the official action (Ben, 2026-11-08): the signup
 * and, in the same request, verified_at. `alreadyVerified` = this address
 * was on the list before this submit.
 */
export async function notifyFromForm(store: GiveawayStore, input: SignupInput, ctx: SignupContext): Promise<NotifyOutcome> {
  const r = await notifySignup(store, input, ctx);
  if (!r.ok || r.alreadyVerified) return r;
  const v = await verifyNotify(store, r.row.id, ctx.now);
  if (!v.ok) throw new Error("notify: row vanished between signup and confirm");
  return { ...r, row: v.row };
}

/* ------------------------------------------------------------------ */
/* Entry                                                               */
/* ------------------------------------------------------------------ */

export type EntryOutcome =
  | { ok: true; person: PersonRow; alreadyVerified: boolean }
  | { ok: false; reason: SignupRefusal };

/** An entry signup: the person row, unverified. A repeat from a verified
 *  address changes nothing and sends nothing. */
export async function entrySignup(store: GiveawayStore, input: SignupInput, ctx: SignupContext): Promise<EntryOutcome> {
  const v = validateSignup(input);
  if (!v.ok) return v;
  const { value } = v;
  const existing = await store.select("giveaway_people", "*").eq("email", value.email).maybeSingle();
  if (existing.error) throw fail("person lookup", existing.error);
  if (existing.data) {
    const person = existing.data as PersonRow;
    if (person.verified_at) return { ok: true, person, alreadyVerified: true };
    // A blank phone on a repeat keeps the one already given.
    const fields = { first_name: value.firstName, last_name: value.lastName, zip: value.zip, city: value.city, nearest_center: value.nearestCenter, marketing_opt_in: input.marketingOptIn, marketing_opt_in_at: input.marketingOptIn ? ctx.now.toISOString() : null, rules_accepted_at: ctx.now.toISOString(), rules_version: RULES_VERSION, ...(value.phone ? { phone: value.phone } : {}) };
    const { data, error } = await writeTolerant("giveaway_people", fields, (r) => store.update("giveaway_people", r).eq("id", person.id).select("*").single());
    if (error) throw fail("person update", error);
    return { ok: true, person: data as PersonRow, alreadyVerified: false };
  }
  const referrer = input.ref ? await personByReferralCode(store, input.ref) : null;
  const row = {
    email: value.email,
    email_display: value.emailDisplay,
    first_name: value.firstName,
    last_name: value.lastName,
    zip: value.zip,
    city: value.city,
    nearest_center: value.nearestCenter,
    ...(value.phone ? { phone: value.phone } : {}),
    age_confirmed: true,
    rules_accepted_at: ctx.now.toISOString(),
    rules_version: RULES_VERSION,
    referral_code: referralCode(),
    referred_by_person_id: referrer?.id ?? null,
    source_page: input.sourcePage ?? null,
    ip_hash: ctx.ipHash,
    ua_hash: ctx.uaHash,
    marketing_opt_in: input.marketingOptIn,
    marketing_opt_in_wording: MARKETING_OPT_IN_WORDING,
    marketing_opt_in_at: input.marketingOptIn ? ctx.now.toISOString() : null,
  };
  const { data, error } = await insertAttributed(store, "giveaway_people", { ...row, ...attributionColumns(input.attribution), created_at: ctx.now.toISOString() });
  if (error) throw fail("person insert", error);
  const person = data as PersonRow;
  await audit(store, { actor: "visitor", action: "entry_signup", targetTable: "giveaway_people", targetId: person.id, ipHash: ctx.ipHash, after: { referred_by: referrer?.id ?? null } });
  return { ok: true, person, alreadyVerified: false };
}

export async function personByReferralCode(store: GiveawayStore, code: string): Promise<PersonRow | null> {
  const c = code.trim().toUpperCase();
  if (!/^HBC-[A-Z0-9]{6}$/.test(c)) return null;
  const { data } = await store.select("giveaway_people", "*").eq("referral_code", c).maybeSingle();
  return (data as PersonRow | null) ?? null;
}

export async function personById(store: GiveawayStore, id: string): Promise<PersonRow | null> {
  const { data } = await store.select("giveaway_people", "*").eq("id", id).maybeSingle();
  return (data as PersonRow | null) ?? null;
}

export async function personByEmail(store: GiveawayStore, email: string): Promise<PersonRow | null> {
  const { data } = await store.select("giveaway_people", "*").eq("email", email).maybeSingle();
  return (data as PersonRow | null) ?? null;
}

/** Non-void entries a person holds. */
export async function entryCount(store: GiveawayStore, personId: string): Promise<number> {
  const { count, error } = await store.select("giveaway_entries", "id", { count: "exact", head: true }).eq("person_id", personId).is("void_reason", null);
  if (error) throw fail("entry count", error);
  return count ?? 0;
}

export type VerifiedOutcome =
  | { ok: true; person: PersonRow; first: boolean; referredBonus: boolean; offer: OfferRow }
  | { ok: false; reason: "unknown" };

/**
 * The verification click for an entrant: verified_at, the base entry, the
 * referred_bonus and the referrer's credit, the offer code. Idempotent — a
 * second click finds everything in place and writes nothing.
 */
export async function verifyEntry(store: GiveawayStore, personId: string, now: Date): Promise<VerifiedOutcome> {
  const person = await personById(store, personId);
  if (!person) return { ok: false, reason: "unknown" };
  if (person.verified_at) {
    const offer = await ensureOffer(store, person, now);
    const bonus = await store.select("giveaway_entries", "id").eq("person_id", person.id).eq("kind", "referred_bonus").is("void_reason", null).maybeSingle();
    return { ok: true, person, first: false, referredBonus: Boolean(bonus.data), offer };
  }
  const upd = await store.update("giveaway_people", { verified_at: now.toISOString() }).eq("id", person.id).is("verified_at", null).select("*").single();
  if (upd.error) throw fail("verify", upd.error);
  const verified = upd.data as PersonRow;
  await writeBaseEntry(store, verified.id, now);
  const referredBonus = verified.referred_by_person_id ? await creditReferral(store, verified, now) : false;
  const offer = await ensureOffer(store, verified, now);
  await audit(store, { actor: "visitor", action: "entry_verified", targetTable: "giveaway_people", targetId: verified.id, after: { referred_bonus: referredBonus } });
  return { ok: true, person: verified, first: true, referredBonus, offer };
}

export type FormEntryOutcome =
  | { ok: true; person: PersonRow; alreadyEntered: boolean; first: boolean; referredBonus: boolean; earlyBird: boolean }
  | { ok: false; reason: SignupRefusal };

/**
 * The entry form, as the official entry (Ben, 2026-11-08): entrySignup and
 * verifyEntry in one request — base entry, referral credit, offer code —
 * then the notify-me early bird when it applies. A repeat from an address
 * already entered changes nothing (`alreadyEntered`).
 */
export async function enterFromForm(store: GiveawayStore, input: SignupInput, ctx: SignupContext): Promise<FormEntryOutcome> {
  const r = await entrySignup(store, input, ctx);
  if (!r.ok) return r;
  if (r.alreadyVerified) return { ok: true, person: r.person, alreadyEntered: true, first: false, referredBonus: false, earlyBird: false };
  const v = await verifyEntry(store, r.person.id, ctx.now);
  if (!v.ok) throw new Error("entry: person vanished between signup and confirm");
  const earlyBird = await carryNotifySignup(store, v.person, ctx.now);
  return { ok: true, person: v.person, alreadyEntered: false, first: v.first, referredBonus: v.referredBonus, earlyBird };
}

/**
 * A notify-me signup who enters by the form rather than the one-tap link
 * gets exactly what the tap gives: the notify row is marked entered
 * (tapped_at + person_id, so the Monday "you're not in yet" reminder skips
 * them) and +1 early_bird before Monday's noon drawing. The same address
 * after Gmail folding (normalizeEmail) is the same signup.
 */
export async function carryNotifySignup(store: GiveawayStore, person: PersonRow, now: Date): Promise<boolean> {
  const { data, error } = await store.select("giveaway_notify", "*").eq("email", person.email).maybeSingle();
  if (error) throw fail("notify carry lookup", error);
  const row = data as NotifyRow | null;
  if (!row) return false;
  const upd = await store.update("giveaway_notify", { tapped_at: row.tapped_at ?? now.toISOString(), person_id: person.id }).eq("id", row.id);
  if (upd.error) throw fail("notify carry", upd.error);
  if (now.getTime() >= EARLY_BIRD.before.at.getTime()) return false;
  const { error: ebErr } = await store.insert("giveaway_entries", { person_id: person.id, kind: "early_bird", created_at: now.toISOString() });
  if (ebErr && ebErr.code !== "23505") throw fail("early bird (form)", ebErr);
  if (!ebErr) await audit(store, { actor: "visitor", action: "early_bird_form", targetTable: "giveaway_people", targetId: person.id, after: { notify_id: row.id } });
  return true;
}

/** Entries carry the giveaway clock's time, not the database's, so the
 *  pool cut-off (created before the drawing) holds under a fake clock. */
async function writeBaseEntry(store: GiveawayStore, personId: string, now: Date): Promise<void> {
  const { error } = await store.insert("giveaway_entries", { person_id: personId, kind: "base", created_at: now.toISOString() });
  // 23505 = the base entry already exists (a retried click): fine.
  if (error && error.code !== "23505") throw fail("base entry", error);
}

/**
 * Decision 3: the referrer gets three referral_bonus entries per verified
 * friend, the friend one referred_bonus; cap ten credited friends. Voided
 * (logged, not dropped) for self-referral: same normalized email, the same
 * ip+ua pair, or a disposable domain. Returns whether the friend's +1 stood.
 */
export async function creditReferral(store: GiveawayStore, friend: PersonRow, now: Date): Promise<boolean> {
  if (!friend.referred_by_person_id) return false;
  const referrer = await personById(store, friend.referred_by_person_id);
  if (!referrer) return false;
  let voidReason: string | null = null;
  if (referrer.id === friend.id || referrer.email === friend.email) voidReason = "self-referral: same email";
  else if (referrer.ip_hash && referrer.ua_hash && referrer.ip_hash === friend.ip_hash && referrer.ua_hash === friend.ua_hash) voidReason = "self-referral: same device";
  else if (DISPOSABLE_DOMAINS.has(emailDomain(friend.email))) voidReason = "disposable email domain";
  else if (!referrer.verified_at) voidReason = "referrer not verified";

  if (voidReason) {
    const { error } = await store.insert("giveaway_entries", { person_id: friend.id, kind: "referred_bonus", referral_person_id: referrer.id, void_reason: voidReason, voided_at: now.toISOString(), created_at: now.toISOString() });
    if (error && error.code !== "23505") throw fail("void referred bonus", error);
    await audit(store, { actor: "system", action: "referral_voided", targetTable: "giveaway_people", targetId: friend.id, reason: voidReason, after: { referrer: referrer.id } });
    return false;
  }

  // The friend's +1 (unique per person: a retry is a no-op).
  const friendBonus = await store.insert("giveaway_entries", { person_id: friend.id, kind: "referred_bonus", referral_person_id: referrer.id, created_at: now.toISOString() });
  if (friendBonus.error && friendBonus.error.code !== "23505") throw fail("referred bonus", friendBonus.error);
  if (friendBonus.error?.code === "23505") return true; // already credited on an earlier click

  // The referrer's +3, under the cap. Credited friends = distinct friends
  // with a live referral_bonus for this referrer.
  const distinct = await store.select("giveaway_entries", "referral_person_id").eq("person_id", referrer.id).eq("kind", "referral_bonus").is("void_reason", null);
  if (distinct.error) throw fail("credit count", distinct.error);
  const friends = new Set(((distinct.data ?? []) as Array<{ referral_person_id: string | null }>).map((r) => r.referral_person_id).filter(Boolean));
  if (friends.has(friend.id)) return true;
  if (friends.size >= REFERRAL.friendCap) {
    await audit(store, { actor: "system", action: "referral_cap_reached", targetTable: "giveaway_people", targetId: referrer.id, reason: `friend ${friend.id} verified after the ${REFERRAL.friendCap}-friend cap; no bonus`, after: { credited: friends.size } });
    return true;
  }
  const rows = Array.from({ length: REFERRAL.referrerBonus }, () => ({ person_id: referrer.id, kind: "referral_bonus" as const, referral_person_id: friend.id, created_at: now.toISOString() }));
  const { error } = await store.insert("giveaway_entries", rows);
  if (error) throw fail("referral bonus", error);
  await store.update("giveaway_people", { referral_credits: friends.size + 1 }).eq("id", referrer.id);
  await audit(store, { actor: "system", action: "referral_credited", targetTable: "giveaway_people", targetId: referrer.id, after: { friend: friend.id, credited: friends.size + 1 } });
  return true;
}

/** The person's offer row, created on first need. One per person, one kind. */
export async function ensureOffer(store: GiveawayStore, person: PersonRow, now: Date): Promise<OfferRow> {
  const existing = await store.select("giveaway_offers", "*").eq("person_id", person.id).maybeSingle();
  if (existing.data) return existing.data as OfferRow;
  const { data, error } = await store.insert("giveaway_offers", { person_id: person.id, kind: "free_first_visit", code: offerCode(), issued_at: now.toISOString(), expires_at: SCHEDULE.offerEnd.at.toISOString() }).select("*").single();
  if (error) {
    if (error.code === "23505") {
      const again = await store.select("giveaway_offers", "*").eq("person_id", person.id).single();
      return again.data as OfferRow;
    }
    throw fail("offer", error);
  }
  return data as OfferRow;
}

/* ------------------------------------------------------------------ */
/* The one-tap entry from notify-me (decision 13)                      */
/* ------------------------------------------------------------------ */

export type TapOutcome =
  | { ok: true; person: PersonRow; first: boolean; earlyBird: boolean; offer: OfferRow }
  | { ok: false; reason: "unknown" | "not_verified" | "not_open" };

/**
 * Turn a verified notify row into a person + base entry, with no second
 * verification; +1 early_bird when tapped before Monday's noon drawing.
 * Works all week. Idempotent: a second tap finds the person and adds nothing.
 */
export async function liveTap(store: GiveawayStore, notifyId: string, now: Date): Promise<TapOutcome> {
  const { data, error } = await store.select("giveaway_notify", "*").eq("id", notifyId).maybeSingle();
  if (error) throw fail("tap lookup", error);
  if (!data) return { ok: false, reason: "unknown" };
  const row = data as NotifyRow;
  if (!row.verified_at) return { ok: false, reason: "not_verified" };
  if (now.getTime() < SCHEDULE.entriesOpen.at.getTime() || now.getTime() >= SCHEDULE.entriesClose.at.getTime()) return { ok: false, reason: "not_open" };

  let person = row.person_id ? await personById(store, row.person_id) : await personByEmail(store, row.email);
  let first = false;
  if (!person) {
    const info = zipInfo(row.zip);
    // The notify-me row's first touch carries over to the person (P1-6).
    const fromNotify = row as NotifyRow & Partial<Attribution>;
    const { data: created, error: insErr } = await insertAttributed(store, "giveaway_people", {
        email: row.email,
        email_display: row.email_display,
        first_name: row.first_name,
        last_name: row.last_name,
        zip: row.zip,
        city: info.city,
        nearest_center: info.nearestCenter,
        age_confirmed: row.age_confirmed,
        rules_accepted_at: now.toISOString(),
        rules_version: RULES_VERSION,
        verified_at: now.toISOString(),
        referral_code: referralCode(),
        source_page: row.source_page,
        ip_hash: row.ip_hash,
        ua_hash: row.ua_hash,
        marketing_opt_in: row.marketing_opt_in,
        marketing_opt_in_wording: row.marketing_opt_in_wording,
        marketing_opt_in_at: row.marketing_opt_in_at,
        unsubscribed_at: row.unsubscribed_at,
        created_at: now.toISOString(),
        ...attributionColumns(fromNotify.channel ? fromNotify : null),
      });
    if (insErr) {
      if (insErr.code !== "23505") throw fail("tap person insert", insErr);
      person = await personByEmail(store, row.email);
      if (!person) throw new Error("tap: person vanished");
    } else {
      person = created as PersonRow;
      first = true;
    }
  } else if (!person.verified_at) {
    // Entered by hand earlier but never clicked the link: the tap verifies.
    const upd = await store.update("giveaway_people", { verified_at: now.toISOString() }).eq("id", person.id).select("*").single();
    person = upd.data as PersonRow;
    first = true;
  }
  await writeBaseEntry(store, person.id, now);
  let earlyBird = false;
  // One early_bird row = EARLY_BIRD.bonusEntries (1); the unique index allows one per person.
  if (now.getTime() < EARLY_BIRD.before.at.getTime()) {
    const { error: ebErr } = await store.insert("giveaway_entries", { person_id: person.id, kind: "early_bird", created_at: now.toISOString() });
    if (ebErr && ebErr.code !== "23505") throw fail("early bird", ebErr);
    earlyBird = true;
  } else {
    const eb = await store.select("giveaway_entries", "id").eq("person_id", person.id).eq("kind", "early_bird").maybeSingle();
    earlyBird = Boolean(eb.data);
  }
  await store.update("giveaway_notify", { tapped_at: row.tapped_at ?? now.toISOString(), person_id: person.id }).eq("id", row.id);
  const offer = await ensureOffer(store, person, now);
  if (first) await audit(store, { actor: "visitor", action: "live_tap", targetTable: "giveaway_people", targetId: person.id, after: { early_bird: earlyBird, notify_id: row.id } });
  return { ok: true, person, first, earlyBird, offer };
}

/* ------------------------------------------------------------------ */
/* Helpers for routes                                                   */
/* ------------------------------------------------------------------ */

export function hashes(ip: string, ua: string | null, secret: string): { ipHash: string; uaHash: string | null } {
  return { ipHash: sha256Hex(ip, secret), uaHash: ua ? sha256Hex(ua, secret) : null };
}

/** For the admin's entries screen: how many each person holds. */
export async function entryCountsByPerson(store: GiveawayStore): Promise<Map<string, number>> {
  const { data, error } = await store.select("giveaway_entries", "person_id").is("void_reason", null);
  if (error) throw fail("entry counts", error);
  const out = new Map<string, number>();
  for (const r of (data ?? []) as Array<Pick<EntryRow, "person_id">>) out.set(r.person_id, (out.get(r.person_id) ?? 0) + 1);
  return out;
}
