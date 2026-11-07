import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageSchema from "@/components/PageSchema";
import TenYearsView, { FormCard, MessageCard, WinnersCard } from "@/components/giveaway/TenYearsView";
import { giveawayNow } from "@/lib/giveaway/clock";
import { giftRevealed, pageMode } from "@/lib/giveaway/config";
import { PAGES } from "@/lib/giveaway/copy";
import { showcaseActive, showcaseFor, showcaseHiddenWithoutParam, tenYearsPublic } from "@/lib/giveaway/showcase";
import { giveawayStore } from "@/lib/giveaway/store";
import { publicWinners } from "@/lib/giveaway/web";
import { OFFER_CODE_SHAPE } from "@/lib/giveaway/offers";
import { UTM_FIELDS, type UtmField } from "@/lib/giveaway/channel";
import { SHARED_OPEN_GRAPH } from "@/lib/metadata";
import { ogDescription, ogTitle } from "@/lib/og/ten-years";
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
 * engine is off, the page is a hidden preview — the notify-me stage,
 * ?mode=live | closed | thanks for the others. With the engine ON before
 * Nov 9 (Ben, 2026-11-06), plain /10years is hidden (404) and only a
 * ?mode=notify | live | closed | thanks link shows a stage (not on the
 * production deployment, which ignores ?mode=). In both, the forms succeeding on screen and writing nothing, sample
 * winners. Hidden means: noindex, nofollow, disallowed in robots.txt,
 * absent from the sitemap, linked from nowhere.
 *
 * UN-HIDDEN ON THE CLOCK (fix list rev 2, P0-6): from the moment the real
 * page shows — engine on and Nov 9 reached (tenYearsPublic) — the meta
 * robots says index, robots.txt drops the /10years disallow (the token
 * routes stay disallowed and noindex) and the sitemap lists /10years and
 * /10years/rules. No deploy needed: this route, robots and the sitemap
 * are all answered per request. ?mode= is ignored on the
 * production deployment (lib/giveaway/showcase.ts, P0-3).
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function generateMetadata(): Promise<Metadata> {
  const indexable = tenYearsPublic();
  return {
    ...pageMetadata("/10years"),
    robots: indexable ? { index: true, follow: true } : { index: false, follow: false },
    // The share preview (Ben, 2026-10-20): its own title and line over the
    // shared set, WITHOUT its default image — an `images` set here would
    // beat the file-based card, app/10years/opengraph-image.tsx.
    openGraph: { ...(({ images: _default, ...rest }) => (void _default, rest))(SHARED_OPEN_GRAPH), type: "website", title: ogTitle(), description: ogDescription() },
    twitter: { card: "summary_large_image", title: ogTitle(), description: ogDescription() },
  };
}

type Search = { code?: string; sent?: string; already?: string; error?: string; ref?: string; mode?: string | string[]; utm_source?: string; utm_medium?: string; utm_campaign?: string; utm_content?: string };

export default async function TenYearsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const t = PAGES.tenYears;
  const ref = (sp.ref ?? "").toUpperCase().slice(0, 20);
  const error = sp.error ? errorText(sp.error) : null;

  // Engine on, before Nov 9: no ?mode= (or production) → hidden, as the real page is (Ben, 2026-11-06).
  if (showcaseHiddenWithoutParam(sp.mode)) notFound();
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
    else card = <FormCard mode={mode} now={now} refCode={ref} error={error} showcase={showcase?.param ?? null} utm={utmOf(sp)} />;
  } else {
    // The gift is named only after the reveal on the REAL clock — never the showcase's stage "now" (P0-2).
    // P1-3: the claim button carries a code the visitor arrived with (the reveal email's links go straight to /contact).
    const code = typeof sp.code === "string" && OFFER_CODE_SHAPE.test(sp.code.trim().toUpperCase()) ? sp.code.trim().toUpperCase() : null;
    card = <WinnersCard winners={winners} notice={error} revealed={giftRevealed(giveawayNow())} mode={mode === "thank_you" ? "thank_you" : "closed"} code={code} />;
  }

  return (
    <>
      <PageSchema path="/10years" />
      <TenYearsView mode={mode} now={now} card={card} winners={winners} assistantOff={showcase !== null} />
    </>
  );
}

/** This request's own UTM tags, as typed (cleaned again on the server when posted). */
function utmOf(sp: Search): Partial<Record<UtmField, string>> {
  const out: Partial<Record<UtmField, string>> = {};
  for (const f of UTM_FIELDS) {
    const v = sp[f];
    if (typeof v === "string" && v) out[f] = v.slice(0, 64);
  }
  return out;
}

function errorText(code: string): string {
  const e = PAGES.tenYears.errors as Record<string, string>;
  if (code === "not_eligible") return PAGES.notEligibleZip;
  if (code === "closed") return PAGES.tenYears.tapClosed;
  return e[code] ?? e.unavailable;
}
