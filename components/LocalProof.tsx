import PartnerBadge from "@/components/PartnerBadge";
import { PROOF_LINE } from "@/lib/site-config";

/**
 * The proof line and the Amen Clinics partner line together, for the local
 * search pages (Ben, 2026-11-09): the rating, the rounded review count and
 * the session count since the founding year — PROOF_LINE in
 * lib/site-config.ts, where every number has one home — and under it the
 * referral-partner badge, which renders only while AMEN_PARTNER_ENABLED is
 * on and says only the approved line. A `<p>`, not a stat band: these pages
 * already carry a review and FAQs, and the line is a reminder, not a hero.
 */
export default function LocalProof({ className = "" }: { className?: string }) {
  return (
    <div className={`local-proof${className ? ` ${className}` : ""}`}>
      <p className="proof-line">{PROOF_LINE}</p>
      <PartnerBadge location="local_page" size="small" />
    </div>
  );
}
