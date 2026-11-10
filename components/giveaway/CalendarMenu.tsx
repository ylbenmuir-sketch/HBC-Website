"use client";

import { useEffect, useRef } from "react";

/**
 * "Add to my calendar" (Ben, 2026-11-10): the hype page's one button before
 * entries open, and the phone bar's. A <details>, so it opens without
 * JavaScript; the script only closes it on a tap elsewhere or Escape. The
 * two links are the notify-me email's own routes (lib/giveaway/calendar.ts)
 * with the page's UTM tags.
 */
export default function CalendarMenu({ label, google, ics, variant = "hero" }: { label: string; google: { label: string; href: string }; ics: { label: string; href: string }; variant?: "hero" | "bar" }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
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
  const done = () => {
    if (ref.current) ref.current.open = false;
  };
  return (
    <details ref={ref} className={`ty-cal ty-cal-${variant}`} data-calendar={variant}>
      <summary className="btn btn-primary ty-cal-btn">{label}</summary>
      <div className="ty-cal-menu">
        <a href={google.href} target="_blank" rel="noopener" data-cal="google" onClick={done}>
          {google.label}
        </a>
        <a href={ics.href} data-cal="ics" onClick={done}>
          {ics.label}
        </a>
      </div>
    </details>
  );
}
