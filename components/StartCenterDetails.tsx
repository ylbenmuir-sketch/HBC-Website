"use client";

import { useStartCenter, type StartCenterSlug } from "@/lib/start-center";
import type { StartCenterInfo } from "@/lib/start-centers";

/**
 * One quiet line in /start's footer (Ben, 2026-11-13; it was an address
 * line with Call and Text buttons under the form): where the picked center
 * is, when that is not the address the footer already prints. The footer's
 * own line is Nashville's (the registered address — lib/sms-identity.ts),
 * so this renders for Murfreesboro only: after the Murfreesboro chip, or a
 * link that named it (?center=murfreesboro, which the form passes on —
 * lib/start-center.ts). No link in it: the header's phone is the page's one
 * way to call.
 */
export default function StartCenterDetails({ centers }: { centers: Record<StartCenterSlug, StartCenterInfo> }) {
  const slug = useStartCenter();
  if (slug === "nashville") return null;
  const c = centers[slug];
  return (
    <p className="start-footer-center">
      {c.name} center: {c.addressLine}
    </p>
  );
}
