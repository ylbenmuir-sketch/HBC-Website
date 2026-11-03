/**
 * The thank-you offer code at /contact (GIVEAWAY-PLAN.md §4 lead pipeline;
 * decisions 8, 11, 15, 19, 20): a code is valid while the offer window is
 * open and it has not been redeemed; a booking with a valid code becomes a
 * consultation_requests row with source 'giveaway', the offer row records
 * the booking, and the nearer center (from the entrant's ZIP) stands in when
 * the visitor did not choose one. Server-only.
 */

import { giveawayNow } from "./clock";
import { GIFT_CAP, GIFT_FALLBACK, offerOpen } from "./config";
import { giftSpots, type CenterSpots } from "./gift";
import { giveawayEngineEnabled } from "./engine";
import type { OfferRow, PersonRow } from "./rows";
import { giveawayStore, type GiveawayStore } from "./store";
import { audit } from "./audit";

export type OfferCheck =
  | { ok: true; offer: OfferRow; person: PersonRow; nearestCenter: "Nashville" | "Murfreesboro" | null }
  | { ok: false; reason: "unavailable" | "unknown" | "expired" | "redeemed" };

export const OFFER_CODE_SHAPE = /^10Y-[A-Z0-9]{6}$/;

export async function checkOffer(code: string, now = giveawayNow(), store: GiveawayStore | null = giveawayStore()): Promise<OfferCheck> {
  // No code has been issued while the engine is off, and the table may not exist.
  if (!giveawayEngineEnabled()) return { ok: false, reason: "unknown" };
  if (!store) return { ok: false, reason: "unavailable" };
  const c = code.trim().toUpperCase();
  if (!OFFER_CODE_SHAPE.test(c)) return { ok: false, reason: "unknown" };
  const { data } = await store.select("giveaway_offers", "*").eq("code", c).maybeSingle();
  if (!data) return { ok: false, reason: "unknown" };
  const offer = data as OfferRow;
  if (!offerOpen(now) || new Date(offer.expires_at).getTime() < now.getTime()) return { ok: false, reason: "expired" };
  if (offer.redeemed_at) return { ok: false, reason: "redeemed" };
  const { data: p } = await store.select("giveaway_people", "*").eq("id", offer.person_id).single();
  const person = p as PersonRow;
  const nearestCenter = person.nearest_center === "nashville" ? "Nashville" : person.nearest_center === "murfreesboro" ? "Murfreesboro" : null;
  return { ok: true, offer, person, nearestCenter };
}

/** The message a visitor sees for a refused code. */
export function offerRefusalMessage(reason: Exclude<OfferCheck, { ok: true }>["reason"]): string {
  switch (reason) {
    case "expired":
      return "That 10-year code has expired — the offer closed on Dec 5. You can still request a free call.";
    case "redeemed":
      return "That 10-year code has already been used. You can still request a free call.";
    case "unavailable":
      return "We can't check 10-year codes right now. Please try again in a minute, or request a call without the code.";
    default:
      return "That 10-year code isn't one we recognise. Check it against your email, or request a call without the code.";
  }
}

/* ------------------------------------------------------------------ */
/* The per-center cap (fix list rev 2, P1-1; migration 0015)           */
/* ------------------------------------------------------------------ */

export type GiftCenter = "Nashville" | "Murfreesboro";
export type GiftOutcome = "redeemed" | "fallback" | "waitlisted" | "already" | "failed";

const isGiftCenter = (c: string | null | undefined): c is GiftCenter => c === "Nashville" || c === "Murfreesboro";

/**
 * The center a booking counts against. A chosen center is kept; "Not
 * sure" (or nothing) takes the center with more spots left while caps are
 * set, else the entrant's nearer center. Concierge and anything else is
 * not a center's slot and is never capped (returns null).
 */
export function giftCenterFor(chosen: string | null, nearest: GiftCenter | null, spots: CenterSpots[] | null): GiftCenter | null {
  if (isGiftCenter(chosen)) return chosen;
  if (chosen && !/^not sure/i.test(chosen)) return null;
  if (spots && spots.length) {
    const ranked = [...spots].sort((a, b) => b.left - a.left || (a.center === nearest ? -1 : b.center === nearest ? 1 : 0));
    return ranked[0].center;
  }
  return nearest;
}

/** giftCenterFor with the live spot counts (read only while caps are set). */
export async function giftCenterForBooking(chosen: string | null, nearest: GiftCenter | null, store: GiveawayStore | null = giveawayStore(), caps = GIFT_CAP): Promise<GiftCenter | null> {
  const spots = store ? await giftSpots(store, caps).catch(() => null) : null;
  return giftCenterFor(chosen, nearest, spots);
}

/** The cap for a center, from config; null = uncapped. */
export function capFor(center: GiftCenter | null, caps = GIFT_CAP): number | null {
  if (!center) return null;
  return center === "Nashville" ? caps.nashville : caps.murfreesboro;
}

/**
 * Redeem a valid code against its center's cap, in one database
 * transaction (giveaway_redeem_gift). Returns what happened and, for a
 * waitlisted booking, the message the visitor sees.
 */
export async function redeemGift(
  offer: OfferRow,
  input: { consultationRequestId: string | null; center: GiftCenter | null; now?: Date },
  store: GiveawayStore | null = giveawayStore(),
  caps = GIFT_CAP,
  fallback = GIFT_FALLBACK
): Promise<{ outcome: GiftOutcome; message: string | null }> {
  if (!store) return { outcome: "failed", message: null };
  const now = input.now ?? giveawayNow();
  const cap = capFor(input.center, caps);
  const { data, error } = await store.rpc("giveaway_redeem_gift", {
    p_offer_id: offer.id,
    p_center: input.center,
    p_cap: cap,
    p_fallback: Boolean(fallback),
    p_consultation_request_id: input.consultationRequestId,
    p_now: now.toISOString(),
  });
  if (error) {
    console.error(`[giveaway offers] redeem ${offer.id}: ${error.message}`);
    return { outcome: "failed", message: null };
  }
  const outcome = (data as GiftOutcome) ?? "failed";
  await audit(store, { actor: "visitor", action: `offer_${outcome}`, targetTable: "giveaway_offers", targetId: offer.id, after: { consultation_request_id: input.consultationRequestId, center: input.center, cap } });
  if (outcome !== "waitlisted" || !input.center) return { outcome, message: null };
  const spots = await giftSpots(store, caps).catch(() => null);
  return { outcome, message: waitlistMessage(input.center, spots) };
}

/** "All Nashville anniversary visits have been claimed. Murfreesboro has 8 left — …" */
export function waitlistMessage(center: GiftCenter, spots: CenterSpots[] | null): string {
  const other = spots?.find((s) => s.center !== center && s.left > 0);
  const switchLine = other ? ` ${other.center} has ${other.left} left — to switch, choose ${other.center} and send your request again.` : "";
  return `All ${center} anniversary visits have been claimed.${switchLine} You're on our waitlist, and we'll email you if a spot opens.`;
}
