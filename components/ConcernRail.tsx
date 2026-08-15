"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

/**
 * Wrapper for the homepage concern cards. Desktop: the bordered editorial
 * grid, untouched. Phones (≤760px, globals.css): a horizontal snap rail with
 * a peeking next card — this adds the progress dots + swipe hint so the
 * horizontal interaction is obvious.
 *
 * The homepage renders one of these per audience group, so `label` names which
 * set this rail holds — two rails both announcing "Concerns we help with"
 * would be indistinguishable.
 */
export default function ConcernRail({
  children,
  count,
  label,
  cols = 3,
}: {
  children: ReactNode;
  count: number;
  label: string;
  cols?: number;
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
        aria-label={`${label} — swipe or scroll to browse`}
        style={{ "--concern-cols": cols } as CSSProperties}
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
