/**
 * The /10years SHOWCASE (Ben, 2026-10-19): the page goes live on the real
 * site as a hidden page — anyone with the link sees it, nobody can find
 * it — long before the giveaway itself runs. In showcase the page renders
 * the notify-me stage with the [DRAFT] tags hidden, and ?mode=live |
 * closed | thanks shows each later stage with a representative "now", the
 * way the fake clock does on a laptop. The forms show their normal success
 * message and write nothing; the winners are sample people.
 *
 * When the showcase shows (both must hold for the real page):
 *
 *   engine off (lib/giveaway/engine.ts)   → showcase, whatever the date
 *   engine on, before Nov 9               → showcase
 *   engine on, from Nov 9                 → the real page; ?mode= is ignored
 *
 * So on Nov 9 the showcase ends on its own ONLY if the engine is on; with
 * it off, the page stays a showcase. The decision reads giveawayNow(), so
 * a local fake clock moves it the same way it moves the real page.
 */

import { giveawayNow } from "./clock";
import { DRAWINGS, centralToUtc, pageMode, type PageMode } from "./config";
import { PAGES } from "./copy";
import { giveawayEngineEnabled } from "./engine";
import type { PublicWinner } from "./web";

export type ShowcaseMode = Exclude<PageMode, "hidden">;

/** The ?mode= values Sheri can type. Anything else is the notify-me stage. */
export const SHOWCASE_PARAMS: Record<string, ShowcaseMode> = {
  notify: "notify_me",
  live: "live",
  closed: "closed",
  thanks: "thank_you",
};

export function showcaseParamFor(mode: ShowcaseMode): string {
  return Object.entries(SHOWCASE_PARAMS).find(([, m]) => m === mode)?.[0] ?? "notify";
}

export function showcaseMode(param: string | string[] | undefined): ShowcaseMode {
  const key = (Array.isArray(param) ? param[0] : param)?.trim().toLowerCase() ?? "";
  return SHOWCASE_PARAMS[key] ?? "notify_me";
}

/** True while /10years is the showcase rather than the real page. */
export function showcaseActive(now: Date = giveawayNow(), env: Record<string, string | undefined> = process.env): boolean {
  if (!giveawayEngineEnabled(env)) return true;
  return pageMode(now) === "hidden";
}

/**
 * A representative "now" for each stage — mid-morning Central, so the
 * countdown has days on it and, in the live stage, two drawings are done
 * and Wednesday's is next.
 */
export function showcaseNow(mode: ShowcaseMode): Date {
  switch (mode) {
    case "notify_me":
      return centralToUtc(2026, 11, 10, 10, 0);
    case "live":
      return centralToUtc(2026, 11, 18, 10, 0);
    case "closed":
      return centralToUtc(2026, 11, 23, 10, 0);
    case "thank_you":
      return centralToUtc(2026, 12, 10, 10, 0);
  }
}

export type Showcase = { mode: ShowcaseMode; param: string; now: Date; winners: PublicWinner[] };

/** Everything the page needs for one showcase stage. */
export function showcaseFor(param: string | string[] | undefined): Showcase {
  const mode = showcaseMode(param);
  const now = showcaseNow(mode);
  return { mode, param: showcaseParamFor(mode), now, winners: showcaseWinners(mode, now) };
}

/** Sample winners — made-up neighbours, never a row. Nothing here is real. */
const SAMPLE_LABELS = ["Sarah K., Franklin", "Marcus T., Murfreesboro", "Elena R., Nashville", "James W., Smyrna", "Priya N., Brentwood", "Daniel O., Clarksville"];

export function showcaseWinners(mode: ShowcaseMode, now: Date): PublicWinner[] {
  const t = PAGES.tenYears;
  return DRAWINGS.map((d, i) => {
    const dayLabel = d.kind === "grand" ? `${d.dayName} (grand prize)` : d.dayName;
    const drawn = mode === "closed" || mode === "thank_you" || (mode === "live" && d.at.getTime() <= now.getTime());
    if (!drawn) return { slot: d.slot, day: d.dayName, line: t.winnerPending(dayLabel, d.ct), label: null, state: "pending" };
    // In the live stage the most recent drawing is still being reached — the
    // three states the real list has, all on one screen.
    if (mode === "live") {
      const later = DRAWINGS.slice(i + 1).some((e) => e.at.getTime() <= now.getTime());
      if (!later) return { slot: d.slot, day: d.dayName, line: t.winnerClaimed(dayLabel), label: null, state: "claimed" };
    }
    const label = SAMPLE_LABELS[i] ?? SAMPLE_LABELS[0];
    return { slot: d.slot, day: d.dayName, line: t.winnerNamed(dayLabel, label), label, state: "named" };
  });
}
