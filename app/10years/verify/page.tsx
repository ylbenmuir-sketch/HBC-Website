import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TenYearsView, { MessageCard, ReminderCard, YoureInCard } from "@/components/giveaway/TenYearsView";
import { giveawayNow } from "@/lib/giveaway/clock";
import { giveawayEngineEnabled } from "@/lib/giveaway/engine";
import { entryPageMode } from "@/lib/giveaway/config";
import { PAGES } from "@/lib/giveaway/copy";
import { handleVerify } from "@/lib/giveaway/web";

/** The verification click from the notify-me and entry emails (?t=token). The /10years view, with the result in the card. */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = { title: "Confirming your email", robots: { index: false, follow: false } };

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  // Not a page at all while the engine is off (lib/giveaway/engine.ts).
  if (!giveawayEngineEnabled()) notFound();
  const now = giveawayNow();
  // Before Nov 9 the real page is already notify-me (Ben, 2026-11-07).
  const mode = entryPageMode(now);
  const { t } = await searchParams;
  const r = await handleVerify(t ?? null);
  const copy = PAGES.tenYears;
  const card = !r.ok ? (
    <MessageCard title={copy.notYetTitle} message={r.message} ok={false} back />
  ) : r.kind === "entry" ? (
    <YoureInCard message={r.message} shareUrl={r.shareUrl} />
  ) : (
    <MessageCard title={copy.onListTitle} message={r.message} ok />
  );
  // Before entries open the page has no card in its hero: the answer sits there as a notice, the reminder strip stays below.
  if (mode === "notify_me") return <TenYearsView mode={mode} now={now} card={<ReminderCard error={null} />} notice={card} />;
  return <TenYearsView mode={mode} now={now} card={card} />;
}
