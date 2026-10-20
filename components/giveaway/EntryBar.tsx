"use client";

import { useEffect, useState } from "react";

/**
 * The slim bottom bar on phones (Ben, 2026-10-20): once the form card is
 * off screen, one button that scrolls back to it. Hidden while the card is
 * in view; never rendered in closed/thank-you modes (the page decides).
 * Phone-only by CSS (.ty-entrybar is display:none from 768px up); the
 * padding respects the iOS toolbar through env(safe-area-inset-bottom).
 */
export default function EntryBar({ label }: { label: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const card = document.getElementById("enter");
    if (!card || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting), { threshold: 0.05 });
    io.observe(card);
    return () => io.disconnect();
  }, []);
  const go = () => {
    document.getElementById("enter")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  return (
    <div className="ty-entrybar" data-entry-bar data-show={show ? "" : undefined} aria-hidden={!show}>
      <button type="button" className="btn btn-primary ty-entrybar-btn" onClick={go} tabIndex={show ? 0 : -1}>
        {label}
      </button>
    </div>
  );
}
