import Image from "next/image";
import PartnerBadgeLink from "@/components/PartnerBadgeLink";
import type { PartnerBadgeLocation } from "@/lib/analytics";
import { AMEN_PARTNER, AMEN_PARTNER_ENABLED } from "@/lib/site-config";

/**
 * The Amen Clinics referral-partner badge (Ben, 2026-11-02): the logo as
 * supplied, in its own colors — 40px tall beside the one approved line from
 * 768px up; under 768px it stacks, the logo centred on top at 42px and the
 * line under it (globals.css `.partner-badge`). Two placements: `strip` is
 * the homepage band under the hero, `small` sits under the /contact form.
 * Nothing renders while AMEN_PARTNER_ENABLED is off.
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
        // 42px tall at the logo's 800:299 ratio is 112px wide; ask for the
        // 2x rendition (256) rather than a hero-sized one.
        sizes="120px"
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
