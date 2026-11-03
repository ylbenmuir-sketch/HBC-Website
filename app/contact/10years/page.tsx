import type { Metadata } from "next";
import ContactPageBody from "@/components/ContactPageBody";
import type { GiveawayBooking } from "@/components/ContactForm";
import { giveawayEngineEnabled } from "@/lib/giveaway/engine";
import { checkOffer, offerRefusalMessage } from "@/lib/giveaway/offers";
import { pageMetadata } from "@/lib/pages";

/**
 * /contact?from=10years — the 10-year giveaway's booking path (fix list rev
 * 2, P0-8/P0-9). next.config.ts rewrites /contact with that query here (the
 * address bar keeps /contact?from=10years&code=…), so plain /contact stays
 * a static page and only this variant reads the request.
 *
 * The same page as /contact, minus texting: both centers' numbers as call
 * links, "Best number to call you to book", an unticked call-me box. With
 * the engine on and a code in the link, the code is checked here, read-only
 * (lib/giveaway/offers.ts — through GiveawayStore), and the banner says
 * whether it is ready or why not; the route checks it again on submit and
 * stamps redeemed_at when the lead saves.
 *
 * Canonical /contact; never indexed (the code is in the query).
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function generateMetadata(): Promise<Metadata> {
  return { ...pageMetadata("/contact"), robots: { index: false, follow: false } };
}

type Search = { code?: string | string[] };

export default async function GiveawayContactPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const raw = (Array.isArray(sp.code) ? sp.code[0] : sp.code) ?? "";
  const code = raw.trim().toUpperCase().slice(0, 20) || null;
  const booking: GiveawayBooking = { code, state: null, message: null };
  if (code && giveawayEngineEnabled()) {
    const check = await checkOffer(code).catch(() => ({ ok: false as const, reason: "unavailable" as const }));
    booking.state = check.ok ? "ok" : check.reason;
    booking.message = check.ok ? `Your 10-year code ${code} is ready — it books your free first visit.` : offerRefusalMessage(check.reason);
  }
  return <ContactPageBody giveaway={booking} />;
}
