import type { Metadata } from "next";
import { notFound } from "next/navigation";
import TenYearsView, { FormCard, MessageCard, ReminderCard, YoureInCard } from "@/components/giveaway/TenYearsView";
import { giveawayNow } from "@/lib/giveaway/clock";
import { giveawayEngineEnabled } from "@/lib/giveaway/engine";
import { entryPageMode } from "@/lib/giveaway/config";
import { PAGES } from "@/lib/giveaway/copy";
import { handleTap } from "@/lib/giveaway/web";

/**
 * The one-tap link from the "It's live" email (decision 13). It opens the
 * entry form with what the reminder holds filled in — the email, the first
 * name if given — and asks for the rest: last name, ZIP, phone, the
 * 18+/rules box (Ben, 2026-11-10). Nothing is entered until that form is
 * submitted; a refusal (say, no phone) comes back here with ?error=. Someone
 * already entered sees "You're in". The /10years view, with the form or
 * the answer in the card.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = { title: "Finish your entry", robots: { index: false, follow: false } };

export default async function EnterPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  // Not a page at all while the engine is off (lib/giveaway/engine.ts).
  if (!giveawayEngineEnabled()) notFound();
  const now = giveawayNow();
  // Before Nov 9 the real page is already notify-me (Ben, 2026-11-07).
  const mode = entryPageMode(now);
  const token = decodeURIComponent((await params).token);
  const errorCode = (await searchParams).error ?? null;
  const r = await handleTap(token);
  const t = PAGES.tenYears;
  const card = !r.ok ? (
    <MessageCard title={t.notYetTitle} message={r.message} ok={false} />
  ) : r.kind === "form" ? (
    <FormCard now={now} refCode="" error={errorCode ? errorText(errorCode) : null} errorCode={errorCode} prefill={r.prefill} tap={r.token} />
  ) : (
    <YoureInCard message={r.message} shareUrl={r.shareUrl} />
  );
  // Before entries open the page has no card in its hero: the answer sits there as a notice, the reminder strip stays below.
  if (mode === "notify_me") return <TenYearsView mode={mode} now={now} card={<ReminderCard error={null} />} notice={card} />;
  return <TenYearsView mode={mode} now={now} card={card} />;
}

function errorText(code: string): string {
  const e = PAGES.tenYears.errors as Record<string, string>;
  if (code === "not_eligible") return PAGES.notEligibleZip;
  return e[code] ?? e.unavailable;
}
