"use client";

import { useRef, useState, type ReactNode } from "react";

/**
 * The heat map's site tooltips (Ben, 2026-10-19): hover, tap or focus a site
 * and a small label says "F7 · 41 µV · Higher" — the text is on the site's
 * own `data-tip`, written by the server from lib/brain-map-sample.ts, so
 * this file knows nothing about the data. One delegated listener set on the
 * wrapper, one tooltip element positioned over the site. A tap pins it
 * (tap again, or tap elsewhere, to let go); keyboard focus shows it too.
 * The sites themselves are focusable `<g>`s with aria-labels, so a screen
 * reader never needs this.
 */
type Tip = { text: string; x: number; y: number };

export default function HeatTooltips({ children, className = "" }: { children: ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip | null>(null);
  const [pinned, setPinned] = useState(false);

  const tipFor = (el: Element | null): Tip | null => {
    const site = el?.closest<HTMLElement>("[data-tip]");
    if (!site || !root.current) return null;
    const r = site.getBoundingClientRect();
    const b = root.current.getBoundingClientRect();
    return { text: site.dataset.tip ?? "", x: r.left + r.width / 2 - b.left, y: r.top - b.top };
  };

  return (
    <div
      ref={root}
      className={`bmh${className ? ` ${className}` : ""}`}
      onPointerOver={(e) => {
        if (pinned) return;
        const t = tipFor(e.target as Element);
        if (t) setTip(t);
      }}
      onPointerOut={(e) => {
        if (pinned) return;
        if ((e.target as Element).closest("[data-tip]")) setTip(null);
      }}
      onClick={(e) => {
        const t = tipFor(e.target as Element);
        if (t && !(pinned && tip?.text === t.text)) {
          setTip(t);
          setPinned(true);
        } else {
          setPinned(false);
          setTip(null);
        }
      }}
      onFocus={(e) => {
        const t = tipFor(e.target as Element);
        if (t) setTip(t);
      }}
      onBlur={(e) => {
        if (!pinned && (e.target as Element).closest("[data-tip]")) setTip(null);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setPinned(false);
          setTip(null);
        }
      }}
    >
      {children}
      {tip && (
        <div className="bmh-tip" role="status" style={{ left: tip.x, top: tip.y }}>
          {tip.text}
        </div>
      )}
    </div>
  );
}
