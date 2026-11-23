"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Which footer a route gets. The giveaway's pages (/10years and below) take
 * the slim one — Official Rules and Privacy, nothing to wander off into —
 * and every other route the full footer. Both are rendered on the server
 * and handed in; this only picks, because the root layout cannot see the
 * route.
 */
export default function RouteFooter({ full, slim, start, murfreesboro }: { full: ReactNode; slim: ReactNode; start: ReactNode; murfreesboro: ReactNode }) {
  const pathname = usePathname() ?? "";
  // /start, the ad landing page: its own short footer (components/StartFooter.tsx).
  if (pathname === "/start") return <>{start}</>;
  // /murfreesboro, the Murfreesboro ad page: that center's own (components/MurfreesboroFooter.tsx).
  if (pathname === "/murfreesboro") return <>{murfreesboro}</>;
  return <>{pathname === "/10years" || pathname.startsWith("/10years/") ? slim : full}</>;
}
