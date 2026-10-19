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
export default function RouteFooter({ full, slim }: { full: ReactNode; slim: ReactNode }) {
  const pathname = usePathname() ?? "";
  return <>{pathname === "/10years" || pathname.startsWith("/10years/") ? slim : full}</>;
}
