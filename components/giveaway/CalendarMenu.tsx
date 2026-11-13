"use client";

import { useEffect, useRef, useState } from "react";
import { addToCalendarEvent, trackEvent, type CalendarType } from "@/lib/analytics";
import { trackMetaCalendar } from "@/lib/meta-pixel";

/** Facebook's and Instagram's in-app browsers, by their own user-agent tags. */
const IN_APP_BROWSER = /FBAN|FBAV|FB_IAB|FBIOS|FB4A|Instagram/i;

/**
 * "Add to my calendar" (Ben, 2026-11-10): the hype page's one button before
 * entries open, and the phone bar's. A <details>, so it opens without
 * JavaScript; the script only closes it on a tap elsewhere or Escape. The
 * two links are the notify-me email's own routes (lib/giveaway/calendar.ts)
 * with the page's UTM tags.
 *
 * Every tap on a link (a click, or Enter on the focused link — the browser
 * sends a click for both) reports `add_to_calendar` to GA4 before the
 * browser follows it (Ben, 2026-11-13), and the custom AddToCalendar to the
 * Meta pixel where the pixel already runs.
 *
 * Inside Facebook's or Instagram's in-app browser the Google link is the
 * weak one: a new window is often blocked there, and Google asks for a
 * sign-in the app's browser does not have. So there the calendar file comes
 * first, the Google link opens in the same window, and `fallback` says what
 * to do if it does not open.
 */
export default function CalendarMenu({ label, google, ics, fallback, variant = "hero" }: { label: string; google: { label: string; href: string }; ics: { label: string; href: string }; fallback?: string; variant?: "hero" | "bar" }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const [inApp, setInApp] = useState(false);
  useEffect(() => {
    setInApp(IN_APP_BROWSER.test(navigator.userAgent));
    const close = (e: Event) => {
      const el = ref.current;
      if (!el?.open) return;
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !el.contains(e.target as Node)) el.open = false;
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", close);
    };
  }, []);
  const tapped = (type: CalendarType) => () => {
    const event = addToCalendarEvent(type, window.location.href);
    if (event) trackEvent(event);
    trackMetaCalendar(type);
    if (ref.current) ref.current.open = false;
  };
  const googleLink = (
    <a key="google" href={google.href} {...(inApp ? {} : { target: "_blank", rel: "noopener" })} data-cal="google" onClick={tapped("google")}>
      {google.label}
    </a>
  );
  const icsLink = (
    <a key="ics" href={ics.href} data-cal="ics" onClick={tapped("ics")}>
      {ics.label}
    </a>
  );
  return (
    <details ref={ref} className={`ty-cal ty-cal-${variant}`} data-calendar={variant} data-in-app={inApp ? "" : undefined}>
      <summary className="btn btn-primary ty-cal-btn">{label}</summary>
      <div className="ty-cal-menu">
        {inApp ? [icsLink, googleLink] : [googleLink, icsLink]}
        {inApp && fallback && (
          <p className="ty-cal-note" data-cal-note>
            {fallback}
          </p>
        )}
      </div>
    </details>
  );
}
