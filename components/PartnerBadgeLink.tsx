"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { partnerBadgeEvent, trackEvent, type PartnerBadgeLocation } from "@/lib/analytics";

/**
 * The linked form of the partner badge — only rendered once AMEN_PARTNER.url
 * is set (components/PartnerBadge.tsx). New tab, `rel="noopener"`, and a
 * partner_badge_click with the badge's location on the way out.
 */
export default function PartnerBadgeLink({
  href,
  location,
  className,
  children,
}: {
  href: string;
  location: PartnerBadgeLocation;
  className?: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  return (
    <a
      className={className}
      href={href}
      target="_blank"
      rel="noopener"
      onClick={() => trackEvent(partnerBadgeEvent(location, pathname))}
    >
      {children}
    </a>
  );
}
