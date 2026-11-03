/**
 * The thank-you offer code at /contact (GIVEAWAY-PLAN.md §4 lead pipeline;
 * decisions 8, 11, 15, 19, 20): a code is valid while the offer window is
 * open and it has not been redeemed; a booking with a valid code becomes a
 * consultation_requests row with source 'giveaway', the offer row records
 * the booking, and the nearer center (from the entrant's ZIP) stands in when
 * the visitor did not choose one. Server-only.
 */

import { giveawayNow } from "./clock";
import { offerOpen } from "./config";
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
/* Redemption (migration 0015's function, no cap — Ben, 2026-11-03)     */
/* ------------------------------------------------------------------ */

export type GiftCenter = "Nashville" | "Murfreesboro";
export type GiftOutcome = "redeemed" | "already" | "failed";

const isGiftCenter = (c: string | null | undefined): c is GiftCenter => c === "Nashville" || c === "Murfreesboro";

/**
 * The center a redemption is recorded against: the center chosen, else
 * the entrant's nearer center by ZIP — for "Not sure" and for Concierge
 * bookings alike (Ben, 2026-11-03).
 */
export function giftCenterFor(chosen: string | null, nearest: GiftCenter | null): GiftCenter | null {
  return isGiftCenter(chosen) ? chosen : nearest;
}

/**
 * Stamp a valid code as redeemed, in one database transaction
 * (giveaway_redeem_gift, migration 0015, called with no cap). First
 * booking wins; a second is "already".
 */
export async function redeemGift(
  offer: OfferRow,
  input: { consultationRequestId: string | null; center: GiftCenter | null; now?: Date },
  store: GiveawayStore | null = giveawayStore()
): Promise<{ outcome: GiftOutcome }> {
  if (!store) return { outcome: "failed" };
  const now = input.now ?? giveawayNow();
  const { data, error } = await store.rpc("giveaway_redeem_gift", {
    p_offer_id: offer.id,
    p_center: input.center,
    p_cap: null,
    p_fallback: false,
    p_consultation_request_id: input.consultationRequestId,
    p_now: now.toISOString(),
  });
  if (error) {
    console.error(`[giveaway offers] redeem ${offer.id}: ${error.message}`);
    return { outcome: "failed" };
  }
  const outcome: GiftOutcome = data === "redeemed" ? "redeemed" : data === "already" ? "already" : "failed";
  if (outcome === "redeemed") await audit(store, { actor: "visitor", action: "offer_redeemed", targetTable: "giveaway_offers", targetId: offer.id, after: { consultation_request_id: input.consultationRequestId, center: input.center } });
  return { outcome };
}
