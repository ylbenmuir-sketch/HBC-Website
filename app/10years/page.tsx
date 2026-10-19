import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageSchema from "@/components/PageSchema";
import TenYearsView, { FormCard, MessageCard, WinnersCard } from "@/components/giveaway/TenYearsView";
import { giveawayNow } from "@/lib/giveaway/clock";
import { pageMode } from "@/lib/giveaway/config";
import { PAGES } from "@/lib/giveaway/copy";
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
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = pageMetadata("/10years");

type Search = { sent?: string; already?: string; error?: string; ref?: string };

export default async function TenYearsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const now = giveawayNow();
  const mode = pageMode(now);
  if (mode === "hidden") notFound();
  const sp = await searchParams;
  const t = PAGES.tenYears;
  const ref = (sp.ref ?? "").toUpperCase().slice(0, 20);
  const error = sp.error ? errorText(sp.error) : null;

  // The winners: the ladder's drawn cards during the week, the card itself after close.
  const store = mode === "notify_me" ? null : giveawayStore();
  const winners = store ? await publicWinners(store).catch(() => []) : [];

  let card;
  if (mode === "notify_me" || mode === "live") {
    if (sp.sent) card = <MessageCard title={t.sentTitle} message={mode === "notify_me" ? t.notifySent : t.liveSent} />;
    else if (sp.already) card = mode === "notify_me" ? <MessageCard title={t.alreadyNotifyTitle} message={t.notifyAlready} /> : <MessageCard title={t.alreadyLiveTitle} message={t.liveAlready} />;
    else card = <FormCard mode={mode} now={now} refCode={ref} error={error} />;
  } else {
    card = <WinnersCard winners={winners} notice={error} />;
  }

  return (
    <>
      <PageSchema path="/10years" />
      <TenYearsView mode={mode} now={now} card={card} winners={winners} />
    </>
  );
}

function errorText(code: string): string {
  const e = PAGES.tenYears.errors as Record<string, string>;
  if (code === "not_tennessee") return PAGES.nonTennesseeZip;
  if (code === "closed") return PAGES.tenYears.tapClosed;
  return e[code] ?? e.unavailable;
}
