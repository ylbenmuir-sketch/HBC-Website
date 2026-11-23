import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ClosedView from "@/components/giveaway/ClosedView";
import { giveawayClosed } from "@/lib/giveaway/engine";

/**
 * Any other address under /10years (Ben, 2026-11-23) — /10years/thank-you,
 * /10years/claim, an old link — shows the closed message: next.config.ts
 * sends every address that is not a route of its own here (a `fallback`
 * rewrite, the address bar unchanged). The rules, the calendar links and
 * the images keep their own routes. Not a page at all when the checks have
 * reopened the giveaway.
 */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "The 10-year giveaway has closed", robots: { index: false, follow: false } };

export default function TenYearsClosedPage() {
  if (!giveawayClosed()) notFound();
  return <ClosedView />;
}
