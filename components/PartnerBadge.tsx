import Image from "next/image";
import PartnerBadgeLink from "@/components/PartnerBadgeLink";
import type { PartnerBadgeLocation } from "@/lib/analytics";
import { AMEN_PARTNER, AMEN_PARTNER_ENABLED } from "@/lib/site-config";

/**
 * The Amen Clinics referral-partner badge (Ben, 2026-11-02): the logo as
 * supplied, in its own colors, at a modest height — 24px on phones, 28px
 * from 761px up (globals.css `.partner-badge`) — beside the one approved
 * line. Two sizes: `strip` is the homepage band under the hero, `small`
 * sits on /contact. Nothing renders while AMEN_PARTNER_ENABLED is off.
 *
 * No link until AMEN_PARTNER.url is set in lib/site-config.ts; then the
 * whole badge links out in a new tab and reports partner_badge_click
 * (components/PartnerBadgeLink.tsx). No schema: visible content only.
 */
export default function PartnerBadge({
  location,
  size = "strip",
}: {
  location: PartnerBadgeLocation;
  size?: "strip" | "small";
}) {
  if (!AMEN_PARTNER_ENABLED) return null;
  const { logo } = AMEN_PARTNER;
  const inner = (
    <>
      <Image
        className="partner-badge-logo"
        src={logo.src}
        alt={AMEN_PARTNER.name}
        width={logo.width}
        height={logo.height}
        // 28px tall at the logo's 800:299 ratio is 75px wide; ask for the
        // 2x-and-change rendition rather than a hero-sized one.
        sizes="160px"
      />
      <span className="partner-badge-line">{AMEN_PARTNER.line}</span>
    </>
  );
  const className = `partner-badge partner-badge-${size}`;
  return AMEN_PARTNER.url ? (
    <PartnerBadgeLink href={AMEN_PARTNER.url} location={location} className={className}>
      {inner}
    </PartnerBadgeLink>
  ) : (
    <div className={className}>{inner}</div>
  );
}
