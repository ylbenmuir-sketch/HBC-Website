"use client";

import { useEffect, useState } from "react";
import { giveawayShareEvent, trackEvent, type GiveawayShareMethod } from "@/lib/analytics";

/**
 * The share block on the card after an entry (Ben, 2026-11-14): the link in
 * full, a big "Copy link" button, and small Facebook and Email
 * buttons. Facebook and Email are plain links, so they work without
 * JavaScript; without it the link is still selectable. Where the browser
 * has its own share sheet (phones) a third small button opens it.
 *
 * Copy, Email and the share sheet carry the prefilled sentence (`text`,
 * which ends in the link); Facebook takes the link alone.
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
  labels: { link: string; copy: string; copied: string; facebook: string; email: string; phone: string };
}) {
  const [done, setDone] = useState(false);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    // Phones and tablets only: a desktop browser can have a share sheet too, and there Copy is the better button.
    setCanShare(typeof navigator.share === "function" && window.matchMedia("(pointer: coarse)").matches);
  }, []);
  const report = (method: GiveawayShareMethod) => {
    const event = giveawayShareEvent(method, window.location.origin);
    if (event) trackEvent(event);
  };
  return (
    <div className="ty-share" data-share-panel>
      {/* The whole link, wrapping on a phone (a field would cut it off); one tap or click selects all of it. */}
      <p id="ty-share-url" className="ty-share-link" aria-label={labels.link} data-share-url>
        {url}
      </p>
      <button
        type="button"
        className="btn btn-primary ty-share-copy"
        data-share="copy"
        onClick={async () => {
          report("copy");
          try {
            await navigator.clipboard.writeText(text);
            setDone(true);
            setTimeout(() => setDone(false), 2000);
          } catch {
            // No clipboard (an old or locked-down browser): select the link so it can be copied by hand.
            const el = document.getElementById("ty-share-url");
            if (el) window.getSelection()?.selectAllChildren(el);
          }
        }}
      >
        <span aria-live="polite">{done ? labels.copied : labels.copy}</span>
      </button>
      <div className="ty-share-more">
        <a className="btn btn-outline" href={facebookHref} target="_blank" rel="noopener noreferrer" data-share="facebook" onClick={() => report("facebook")}>
          {labels.facebook}
        </a>
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
