import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { giveawayNow } from "@/lib/giveaway/clock";
import { DRAWINGS, OFFER, REFERRAL, RULES_VERSION, SCHEDULE, pageMode, prizeFor, prizeName } from "@/lib/giveaway/config";
import { PAGES } from "@/lib/giveaway/copy";
import { DBA_SENTENCE, LEGAL_ENTITY, REGISTERED_ADDRESS_LINE } from "@/lib/sms-identity";

/**
 * /10years/rules — a PLACEHOLDER for counsel's Official Rules
 * (GIVEAWAY-PLAN.md §8 legal item 1). The form links here and records
 * RULES_VERSION on acceptance. Everything below is a [DRAFT] skeleton of
 * what the real rules must cover, with the facts pulled from config; the
 * words are counsel's to replace before Nov 9.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = { title: "Official Rules — 10-year giveaway", robots: { index: false, follow: true } };

export default function RulesPage() {
  if (pageMode(giveawayNow()) === "hidden") notFound();
  const D = (s: string) => `[DRAFT — counsel to replace] ${s}`;
  return (
    <section className="page-hero">
      <div className="wrap article policy" style={{ maxWidth: 760 }}>
        <div className="eyebrow">{PAGES.tenYears.eyebrow}</div>
        <h1 style={{ fontSize: 36 }}>Official Rules</h1>
        <p className="sub">Rules version {RULES_VERSION}. {D("Placeholder text. The Official Rules are being prepared by counsel and will replace this page before entries open.")}</p>
        <h2>Sponsor</h2>
        <p>{D(`${LEGAL_ENTITY}, doing business as Harmonized Brain Centers, ${REGISTERED_ADDRESS_LINE}. ${DBA_SENTENCE}`)}</p>
        <h2>No purchase necessary</h2>
        <p>{D("No purchase or payment of any kind is necessary to enter or win. A purchase will not improve your chances of winning.")}</p>
        <h2>Eligibility</h2>
        <p>{D("Open to legal residents of Tennessee who are 18 years of age or older at the time of entry. Employees of the Sponsor and their immediate families are not eligible. Current clients of the Sponsor are eligible.")}</p>
        <h2>Entry period</h2>
        <p>{D(`Entries open ${SCHEDULE.entriesOpen.ct} and close ${SCHEDULE.entriesClose.ct}. Sign-ups before that date are notifications only and are not entries until the person taps the entry link.`)}</p>
        <h2>How to enter</h2>
        <p>{D(`Complete the form at harmonizedbraincenterstn.com/10years and confirm your email address. One entry per person. Each friend who enters through your personal link and confirms adds ${REFERRAL.referrerBonus} entries for you and ${REFERRAL.referredBonus} for them, up to ${REFERRAL.friendCap} friends. Self-referral voids the bonus.`)}</p>
        <h2>Drawings</h2>
        <ul>
          {DRAWINGS.map((d) => (
            <li key={d.slot}>
              {D(`${d.dayName}${d.kind === "grand" ? " (grand prize)" : ""}: ${d.ct} — ${prizeName(prizeFor(d.slot, "new_client"))} (current clients: ${prizeName(prizeFor(d.slot, "current_client"))})`)}
            </li>
          ))}
        </ul>
        <p>{D("Winners are selected at random from all eligible entries received before each drawing. A daily winner is not eligible for later daily drawings but remains eligible for the grand prize. Odds depend on the number of eligible entries.")}</p>
        <h2>Winner notification and claim</h2>
        <p>{D("Winners are notified by email and telephone. A winner must respond within 72 hours (a deadline that would fall on a Sunday or Monday is extended to the following Tuesday at 5:00 pm CT) or the prize is forfeited and an alternate winner is drawn from the same pool. Prizes valued over $600 require a completed tax form before delivery.")}</p>
        <h2>Publicity</h2>
        <p>{D("With the winner's consent, given on the claim call, the Sponsor may publish the winner's first name, last initial and city.")}</p>
        <h2>Thank-you offer</h2>
        <p>{D(`Every verified entrant receives a code for a free first visit (a Brain Map and consultation, normally $${OFFER.normallyUsd}), to be booked by ${OFFER.bookBy.ct} for a visit through ${OFFER.visitBy.ct}. The ${OFFER.packageSessions + 1}th-session bonus applies to the in-center ${OFFER.packageSessions}-session package only.`)}</p>
        <h2>General</h2>
        <p>{D("Governing law, limitation of liability, release, and the privacy notice at harmonizedbraincenterstn.com/privacy-policy.")}</p>
      </div>
    </section>
  );
}
