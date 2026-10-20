import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TenYearsView, { MessageCard, YoureInCard } from "@/components/giveaway/TenYearsView";
import { giveawayNow } from "@/lib/giveaway/clock";
import { pageMode } from "@/lib/giveaway/config";
import { PAGES } from "@/lib/giveaway/copy";
import { handleTap } from "@/lib/giveaway/web";

/** The one-tap entry from the "It's live" email (decision 13). The /10years view, with the result in the card. */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = { title: "Entering you", robots: { index: false, follow: false } };

export default async function EnterPage({ params }: { params: Promise<{ token: string }> }) {
  const now = giveawayNow();
  const mode = pageMode(now);
  if (mode === "hidden") notFound();
  const { token } = await params;
  const r = await handleTap(decodeURIComponent(token));
  const card = r.ok ? <YoureInCard message={r.message} shareUrl={r.shareUrl} /> : <MessageCard title={PAGES.tenYears.notYetTitle} message={r.message} ok={false} />;
  return <TenYearsView mode={mode} now={now} card={card} />;
}
