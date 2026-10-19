/**
 * Signing up, verifying, entering (GIVEAWAY-PLAN.md §4; decisions 1, 3, 8,
 * 12, 13, 15). The rules of who is in and with how many chances:
 *
 *   notify-me  → giveaway_notify row + verification email; the click sets
 *                verified_at. Nobody is entered yet.
 *   It's live  → the one-tap link turns a VERIFIED notify row into a person
 *                + base entry, no second verification; +1 early_bird when
 *                tapped before Monday's noon drawing. Idempotent.
 *   entry      → giveaway_people row (unverified) + verification email; the
 *                click sets verified_at and writes the base entry, the
 *                referred_bonus (+1) when a referral code was carried, the
 *                referrer's three referral_bonus rows (cap ten friends, no
 *                self-referral), and the offer code. Idempotent.
 *
 * Every write goes through GiveawayStore (env-scoped). Emails are not sent
 * here: each function returns what the caller should send (the token link,
 * the "You're in" inputs), so the route sends through lib/giveaway/send.ts
 * and the unit tests send nothing. Pure apart from the store and the clock
 * passed in.
 */

import { audit } from "./audit";
import { REFERRAL, RULES_VERSION, SCHEDULE, drawing } from "./config";
import { emailDomain, normalizeEmail } from "./email-normalize";
import type { EntryRow, NotifyRow, OfferRow, PersonRow } from "./rows";
import type { GiveawayStore } from "./store";
import { offerCode, referralCode, sha256Hex } from "./tokens";
import { zipInfo } from "./zip";

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
  isExistingClient: boolean;
  marketingOptIn: boolean;
  /** The referral code carried from /10years?ref=… (entry only). */
  ref?: string | null;
  sourcePage?: string | null;
};

export type SignupContext = { ipHash: string | null; uaHash: string | null; now: Date };

export type SignupRefusal = "invalid_name" | "invalid_email" | "invalid_zip" | "not_tennessee" | "age" | "rules";

export type Validated = {
  firstName: string;
  lastName: string;
  email: string;
  emailDisplay: string;
  zip: string;
  city: string | null;
  nearestCenter: "nashville" | "murfreesboro" | null;
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
  if (!info.tennessee) return { ok: false, reason: "not_tennessee" };
  if (!input.ageConfirmed) return { ok: false, reason: "age" };
  if (!input.rulesAccepted) return { ok: false, reason: "rules" };
  return { ok: true, value: { firstName, lastName, email, emailDisplay: input.email.trim().slice(0, 254), zip, city: info.city, nearestCenter: info.nearestCenter } };
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
    is_existing_client: input.isExistingClient,
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
  const { data, error } = await store.insert("giveaway_notify", { email: value.email, ...fields, created_at: ctx.now.toISOString() }).select("*").single();
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
    const { data, error } = await store
      .update("giveaway_people", { first_name: value.firstName, last_name: value.lastName, zip: value.zip, city: value.city, nearest_center: value.nearestCenter, is_existing_client: input.isExistingClient, marketing_opt_in: input.marketingOptIn, marketing_opt_in_at: input.marketingOptIn ? ctx.now.toISOString() : null, rules_accepted_at: ctx.now.toISOString(), rules_version: RULES_VERSION })
      .eq("id", person.id)
      .select("*")
      .single();
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
    is_existing_client: input.isExistingClient,
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
  const { data, error } = await store.insert("giveaway_people", { ...row, created_at: ctx.now.toISOString() }).select("*").single();
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
    const { data: created, error: insErr } = await store
      .insert("giveaway_people", {
        email: row.email,
        email_display: row.email_display,
        first_name: row.first_name,
        last_name: row.last_name,
        zip: row.zip,
        city: info.city,
        nearest_center: info.nearestCenter,
        is_existing_client: row.is_existing_client,
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
      })
      .select("*")
      .single();
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
  if (now.getTime() < drawing("mon").at.getTime()) {
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
