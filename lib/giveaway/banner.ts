/**
 * The site-wide 10-year banner (fix list rev 2, P0-7): a slim bar at the
 * top of every page but /10years*, /admin* and /start, shown only while the giveaway
 * engine is on, its copy following the config clock:
 *
 *   notify   Mon Nov 9 12:00 AM  – Sun Nov 15 6:00 PM CT
 *   live     Sun Nov 15 6:00 PM  – Sat Nov 21 5:00 PM CT
 *   closed   Sat Nov 21 5:00 PM  – Sat Dec 5 11:59:59 PM CT ("see the winners")
 *   off      before and after
 *
 * The mode is picked BEFORE first paint by a tiny inline <head> script
 * (bannerScript) that sets <html data-hbc-banner="notify|live|closed|off">;
 * CSS shows the matching copy and hides the rest, so the bar is in the
 * layout from the first frame and nothing shifts. The client component
 * re-runs the same decision on client-side navigation (bannerModeAt).
 * The two are one decision written twice — banner.test.mjs runs the
 * script's text against bannerModeAt across every boundary.
 *
 * The banner never mentions the thank-you gift: non-entrants can't claim it.
 * Pure: no environment reads (the layout checks the engine switch).
 */

import { SCHEDULE } from "./config";

export type BannerMode = "notify" | "live" | "closed" | "off";

/** sessionStorage key; "0" = dismissed for this tab session. */
export const BANNER_STORAGE_KEY = "hbc10y.banner";

/** [notify from, live from, closed from, closed until (inclusive)] in ms. */
export const BANNER_BOUNDS: readonly [number, number, number, number] = [
  SCHEDULE.notifyMeStart.at.getTime(),
  SCHEDULE.entriesOpen.at.getTime(),
  SCHEDULE.entriesClose.at.getTime(),
  SCHEDULE.offerEnd.at.getTime(),
];

/** Routes the bar never shows on. */
export function bannerExcludedPath(path: string): boolean {
  // /start (2026-11-11): the ad landing page has one job and no exits.
  // /contact (Ben, 2026-11-12): the bar cost the form 57px of a phone's
  // first screen and offered an exit from the page whose job is the request.
  return path.startsWith("/10years") || path === "/admin" || path.startsWith("/admin/") || path === "/start" || path.startsWith("/start/") || path === "/contact" || path.startsWith("/contact/");
}

export function bannerModeAt(nowMs: number, path: string, dismissed: boolean, b: readonly number[] = BANNER_BOUNDS): BannerMode {
  if (bannerExcludedPath(path)) return "off";
  let m: BannerMode = "off";
  if (nowMs >= b[0] && nowMs < b[1]) m = "notify";
  else if (nowMs >= b[1] && nowMs < b[2]) m = "live";
  else if (nowMs >= b[2] && nowMs <= b[3]) m = "closed";
  if (m !== "off" && dismissed) return "off";
  return m;
}

/**
 * The inline <head> script: the same decision as bannerModeAt, in plain
 * ES5, with the bounds baked in from config. Any error leaves the bar off.
 */
export function bannerScript(b: readonly number[] = BANNER_BOUNDS): string {
  return `(function(){var m="off";try{var p=location.pathname,t=Date.now(),b=${JSON.stringify(b)};if(!(p.indexOf("/10years")===0||p==="/admin"||p.indexOf("/admin/")===0||p==="/start"||p.indexOf("/start/")===0||p==="/contact"||p.indexOf("/contact/")===0)){if(t>=b[0]&&t<b[1])m="notify";else if(t>=b[1]&&t<b[2])m="live";else if(t>=b[2]&&t<=b[3])m="closed";if(m!=="off"){var s=null;try{s=sessionStorage.getItem(${JSON.stringify(BANNER_STORAGE_KEY)})}catch(e){}if(s==="0")m="off"}}}catch(e){m="off"}document.documentElement.setAttribute("data-hbc-banner",m)})();`;
}

/**
 * The link: plain /10years (Ben, 2026-11-12). It carried
 * ?utm_source=site&utm_medium=banner until then, and a utm tag on an
 * internal link restarts the GA4 session's attribution — the visit's real
 * source was overwritten by "site / banner". GA4 still sees the tap as
 * giveaway_banner_click; the giveaway's own stats still see it through
 * bannerFirstTouch below.
 */
export const BANNER_HREF = "/10years";

/**
 * What the banner's click handler leaves in sessionStorage under
 * UTM_STORAGE_KEY (lib/giveaway/channel.ts) when no first touch is stored
 * yet — the same four values the link used to carry, so an entrant who came
 * through the banner still counts as channel `site_banner`
 * (components/giveaway/UtmCapture.tsx fills the entry form from it). Never
 * in a URL, so GA4 never reads it.
 */
export function bannerFirstTouch(mode: Exclude<BannerMode, "off">): Record<"utm_source" | "utm_medium" | "utm_campaign" | "utm_content", string> {
  return { utm_source: "site", utm_medium: "banner", utm_campaign: "hbc10y", utm_content: mode };
}
