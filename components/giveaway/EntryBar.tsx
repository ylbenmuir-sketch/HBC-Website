"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * The slim bottom bar on phones (Ben, 2026-10-20): once the thing it stands
 * in for is off screen, one button for it. Live: the form card (`#enter`),
 * and the button scrolls back to it. Before entries open (Ben, 2026-11-10):
 * the hero's "Add to my calendar" button, and the bar holds the same menu
 * (`children`). Hidden while that element is in view; never rendered in
 * closed/thank-you modes (the page decides). Phone-only by CSS
 * (.ty-entrybar is display:none from 768px up); the padding respects the
 * iOS toolbar through env(safe-area-inset-bottom).
 */
export default function EntryBar({ label, watchId = "enter", children }: { label?: string; watchId?: string; children?: ReactNode }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const watched = document.getElementById(watchId);
    if (!watched || typeof IntersectionObserver === "undefined") return;
    // The slim footer pads itself above the bar while this is mounted (globals.css).
    document.body.setAttribute("data-entrybar", "");
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting), { threshold: 0.05 });
    io.observe(watched);
    return () => {
      io.disconnect();
      document.body.removeAttribute("data-entrybar");
    };
  }, [watchId]);
  const go = () => {
    document.getElementById(watchId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <div className="ty-entrybar" data-entry-bar data-show={show ? "" : undefined} aria-hidden={!show} inert={!show}>
      {children ?? (
        <button type="button" className="btn btn-primary ty-entrybar-btn" onClick={go}>
          {label}
        </button>
      )}
    </div>
  );
}
