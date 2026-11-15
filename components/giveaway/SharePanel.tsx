"use client";

import { useEffect, useState } from "react";
import { giveawayShareEvent, trackEvent, type GiveawayShareMethod } from "@/lib/analytics";

/** The Instagram app's Story camera. Tried on phones only, after the link is copied. */
const INSTAGRAM_APP = "instagram://story-camera";

/**
 * The share block on the card after an entry (Ben's mockup, 2026-11-14):
 * the link in a soft box, two large navy buttons (Instagram, Facebook) and
 * three small outline ones (Copy link, Email, and — where the browser has a
 * share sheet, phones — Share).
 *
 * - Instagram has no share link: the button copies the link alone (what a
 *   Story's link sticker takes), says so, and on a phone then tries the
 *   Instagram app. If the app does not open, the link is still copied.
 * - Facebook and Email are plain links, so they work without JavaScript;
 *   Facebook takes the link alone.
 * - Copy link, Email and Share carry the prefilled sentence (`text`, which
 *   ends in the link).
 *
 * Each tap reports `giveaway_share_click` with the method and nothing else
 * (lib/analytics.ts). `data-share` keeps the Email link out of the
 * site-wide `contact_link_click` (components/Analytics.tsx): it is not a
 * message to the centers.
 */
export default function SharePanel({
  url,
  text,
  facebookHref,
  emailHref,
  emailSubject,
  labels,
}: {
  url: string;
  text: string;
  facebookHref: string;
  emailHref: string;
  emailSubject: string;
  labels: {
    link: string;
    instagram: string;
    instagramSub: string;
    instagramCopied: string;
    facebook: string;
    facebookSub: string;
    copy: string;
    copied: string;
    copyFailed: string;
    email: string;
    phone: string;
  };
}) {
  const [copied, setCopied] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [phone, setPhone] = useState(false);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    // Phones and tablets only: a desktop browser can have a share sheet too, and there Copy is the better button.
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    setPhone(coarse);
    setCanShare(coarse && typeof navigator.share === "function");
  }, []);
  const report = (method: GiveawayShareMethod) => {
    const event = giveawayShareEvent(method, window.location.origin);
    if (event) trackEvent(event);
  };
  const write = async (value: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // No clipboard (an old or locked-down browser): select the link so it can be copied by hand.
      const el = document.getElementById("ty-share-url");
      if (el) window.getSelection()?.selectAllChildren(el);
      return false;
    }
  };
  // The link as the mockup shows it: no "https://", and a break allowed after the site's name.
  const shown = url.replace(/^https?:\/\//, "");
  const slash = shown.indexOf("/");
  return (
    <div className="ty-share" data-share-panel>
      {/* One tap or click selects all of it. The buttons copy the full address, "https://" included. */}
      <p id="ty-share-url" className="ty-share-link" aria-label={labels.link} data-share-url={url}>
        {slash > 0 ? (
          <>
            {shown.slice(0, slash + 1)}
            <wbr />
            <span>{shown.slice(slash + 1)}</span>
          </>
        ) : (
          shown
        )}
      </p>
      <div className="ty-share-big">
        <button
          type="button"
          className="ty-share-btn"
          data-share="instagram"
          onClick={async () => {
            report("instagram");
            const ok = await write(url);
            setNote(ok ? labels.instagramCopied : labels.copyFailed);
            // On a phone, try the app. Where it is not installed nothing opens and the link is still copied.
            if (ok && phone) window.location.href = INSTAGRAM_APP;
          }}
        >
          <span className="ty-share-btn-name">{labels.instagram}</span>
          <span className="ty-share-btn-sub">{labels.instagramSub}</span>
        </button>
        <a className="ty-share-btn" href={facebookHref} target="_blank" rel="noopener noreferrer" data-share="facebook" onClick={() => report("facebook")}>
          <span className="ty-share-btn-name">{labels.facebook}</span>
          <span className="ty-share-btn-sub">{labels.facebookSub}</span>
        </a>
      </div>
      <p className="ty-share-note" aria-live="polite" data-share-note>
        {note}
      </p>
      <div className="ty-share-more">
        <button
          type="button"
          className="btn btn-outline"
          data-share="copy"
          onClick={async () => {
            report("copy");
            if (await write(text)) {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            } else setNote(labels.copyFailed);
          }}
        >
          <span aria-live="polite">{copied ? labels.copied : labels.copy}</span>
        </button>
        <a className="btn btn-outline" href={emailHref} data-share="email" onClick={() => report("email")}>
          {labels.email}
        </a>
        {canShare && (
          <button
            type="button"
            className="btn btn-outline"
            data-share="phone"
            onClick={() => {
              report("phone");
              // The sentence already ends in the link, so no separate `url` (some apps would print it twice).
              navigator.share({ title: emailSubject, text }).catch(() => {});
            }}
          >
            {labels.phone}
          </button>
        )}
      </div>
    </div>
  );
}
