"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The heat map's painted field (/brain-map-field.png), fetched only once the
 * chart is within a screen of the viewport.
 *
 * An SVG `<image>` has no `loading="lazy"` the way an `<img>` does: the
 * preload scanner requested the 42 kB field on the homepage at the same
 * moment as the hero photo, for a chart two and a half screens down, and in
 * Lighthouse's simulated 4G those bytes came straight out of the hero
 * image's share of the connection (perf pass, 2026-11-02). Below the fold
 * the `href` is set from an IntersectionObserver with a generous margin,
 * so a visitor reading down never sees the field arrive; in the first
 * screen (`eager`) it is server-rendered exactly as before.
 *
 * The only loss is a browser with JavaScript off, which gets the sites and
 * labels without the painted field behind them.
 */
export default function HeatField({
  href,
  eager = false,
  ...rest
}: {
  href: string;
  eager?: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  preserveAspectRatio: string;
  clipPath: string;
}) {
  const ref = useRef<SVGImageElement>(null);
  const [near, setNear] = useState(eager);
  useEffect(() => {
    if (near) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver !== "function") {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "900px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [near]);
  return <image ref={ref} href={near ? href : undefined} {...rest} />;
}
