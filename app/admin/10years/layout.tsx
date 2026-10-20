import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { giveawayEngineEnabled } from "@/lib/giveaway/engine";

/**
 * Every /admin/10years screen is a 404 while the engine is off
 * (lib/giveaway/engine.ts): migration 0010 may not be applied, and a staff
 * screen that queries the giveaway tables must not exist until it is. The
 * route handlers under here answer the same way (actions/_guard.ts,
 * request-code, verify, logout).
 */
export default function AdminTenYearsLayout({ children }: { children: ReactNode }) {
  if (!giveawayEngineEnabled()) notFound();
  return <>{children}</>;
}
