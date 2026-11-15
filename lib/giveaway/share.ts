/**
 * The share block's links (Ben, 2026-11-14) — the card after an entry and the
 * "You're in" email build theirs here, so both carry the same words.
 *
 * Nothing here changes the link itself (send.ts → referralLink) or what an
 * entry is worth: the bonus still comes only from a friend who enters
 * through the link. Facebook takes the link alone — its dialog accepts no
 * prefilled words — and the Email link is a plain mailto:, no script.
 */
import { prizeTotalFloorUsd } from "./config";
import { PAGES } from "./copy";

/** "I just entered … free to enter: <their link>" — Email, the phone's share sheet and Copy. */
export function shareText(link: string): string {
  return PAGES.tenYears.shareText(prizeTotalFloorUsd(), link);
}

export function facebookShareUrl(link: string): string {
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`;
}

export function emailShareUrl(link: string): string {
  return `mailto:?subject=${encodeURIComponent(PAGES.tenYears.shareEmailSubject)}&body=${encodeURIComponent(shareText(link))}`;
}

/**
 * Where the email's "Copy link" button goes: an email cannot copy, so it
 * opens the entrant's own card on /10years (the page a submit lands on),
 * where one tap copies. Built from the link's own ?ref=; a link without one
 * is returned as it is.
 */
export function copyPageUrl(link: string): string {
  try {
    const u = new URL(link);
    const code = u.searchParams.get("ref");
    if (!code) return link;
    return `${u.origin}${u.pathname}?sent=1&share=${encodeURIComponent(code)}#enter`;
  } catch {
    return link;
  }
}
