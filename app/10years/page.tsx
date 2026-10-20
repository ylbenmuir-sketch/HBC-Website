import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageSchema from "@/components/PageSchema";
import TenYearsView, { FormCard, MessageCard, WinnersCard } from "@/components/giveaway/TenYearsView";
import { giveawayNow } from "@/lib/giveaway/clock";
import { pageMode } from "@/lib/giveaway/config";
import { PAGES } from "@/lib/giveaway/copy";
import { showcaseActive, showcaseFor } from "@/lib/giveaway/showcase";
import { giveawayStore } from "@/lib/giveaway/store";
import { publicWinners } from "@/lib/giveaway/web";
import { pageMetadata } from "@/lib/pages";

/**
 * /10years — the anniversary giveaway page (GIVEAWAY-PLAN.md §4, §6).
 *
 * Four modes, switched by the config clock, never by a deploy:
 *   hidden     before Nov 9      → 404 (this route does not exist yet)
 *   notify_me  Nov 9 – Nov 15    → the full form (so the Sunday email can
 *                                  be one tap), the prizes, three questions
 *   live       Nov 15 – Nov 21   → the same form, now entering; the prizes
 *                                  row marks the next drawing and the drawn
 *   closed     Nov 21 – Dec 5    → the card becomes the winners list
 *   thank_you  after Dec 5       → the same, permanently
 *
 * Layout and its one-screen budget: components/giveaway/TenYearsView.tsx.
 * Plain HTML forms (POST to /10years/signup, redirect back with a query)
 * so it works without JavaScript and the check can drive it with fetch.
 * Every time and prize comes from lib/giveaway/config.ts. The assistant is
 * off this route for the whole window (lib/site-config.ts). Copy is [DRAFT]
 * (lib/giveaway/copy.ts).
 *
 * THE SHOWCASE (Ben, 2026-10-19; lib/giveaway/showcase.ts): while the
 * engine is off, and before Nov 9 even with it on, the page is a hidden
 * preview — the notify-me stage, ?mode=live | closed | thanks for the
 * others, the forms succeeding on screen and writing nothing, sample
 * winners. Hidden means: noindex, nofollow (here and the header in
 * next.config.ts), disallowed in robots.txt, absent from the sitemap,
 * linked from nowhere.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = { ...pageMetadata("/10years"), robots: { index: false, follow: false } };

type Search = { sent?: string; already?: string; error?: string; ref?: string; mode?: string | string[] };

export default async function TenYearsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const t = PAGES.tenYears;
  const ref = (sp.ref ?? "").toUpperCase().slice(0, 20);
  const error = sp.error ? errorText(sp.error) : null;

  const showcase = showcaseActive() ? showcaseFor(sp.mode) : null;
  const now = showcase ? showcase.now : giveawayNow();
  const mode = showcase ? showcase.mode : pageMode(now);
  if (mode === "hidden") notFound();

  // The winners: the ladder's drawn cards during the week, the card itself
  // after close. The showcase's are sample people; nothing is read.
  const store = showcase || mode === "notify_me" ? null : giveawayStore();
  const winners = showcase ? showcase.winners : store ? await publicWinners(store).catch(() => []) : [];

  let card;
  if (mode === "notify_me" || mode === "live") {
    if (sp.sent) card = <MessageCard title={t.sentTitle} message={mode === "notify_me" ? t.notifySent : t.liveSent} />;
    else if (sp.already) card = mode === "notify_me" ? <MessageCard title={t.alreadyNotifyTitle} message={t.notifyAlready} /> : <MessageCard title={t.alreadyLiveTitle} message={t.liveAlready} />;
    else card = <FormCard mode={mode} now={now} refCode={ref} error={error} showcase={showcase?.param ?? null} />;
  } else {
    card = <WinnersCard winners={winners} notice={error} />;
  }

  return (
    <>
      <PageSchema path="/10years" />
      <TenYearsView mode={mode} now={now} card={card} winners={winners} assistantOff={showcase !== null} />
    </>
  );
}

function errorText(code: string): string {
  const e = PAGES.tenYears.errors as Record<string, string>;
  if (code === "not_eligible") return PAGES.notEligibleZip;
  if (code === "closed") return PAGES.tenYears.tapClosed;
  return e[code] ?? e.unavailable;
}
