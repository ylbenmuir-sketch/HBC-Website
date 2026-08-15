"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Wrapper for the homepage concern cards. Desktop: the bordered editorial
 * grid, untouched. Phones (≤760px, globals.css): a horizontal snap rail with
 * a peeking next card — this adds the progress dots + swipe hint so the
 * horizontal interaction is obvious.
 */
export default function ConcernRail({
  children,
  count,
}: {
  children: ReactNode;
  count: number;
}) {
  const railRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = railRef.current;
    if (!el) return;
    const onScroll = () => {
      const max = el.scrollWidth - el.clientWidth;
      if (max <= 0) return;
      setActive(
        Math.min(count - 1, Math.round((el.scrollLeft / max) * (count - 1)))
      );
    };
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [count]);

  return (
    <>
      <div
        className="concern-grid rv"
        ref={railRef}
        role="group"
        aria-label="Concerns we help with — swipe or scroll to browse"
      >
        {children}
      </div>
      <div className="rail-cue m-only">
        <div className="rail-dots" aria-hidden="true">
          {Array.from({ length: count }).map((_, i) => (
            <span key={i} className={i === active ? "on" : ""} />
          ))}
        </div>
        <span className="rail-hint" aria-hidden="true">
          Swipe
        </span>
      </div>
    </>
  );
}
