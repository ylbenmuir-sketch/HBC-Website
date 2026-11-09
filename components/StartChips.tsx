"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { concernChipEvent, trackEvent, type ConcernChip } from "@/lib/analytics";

/**
 * /start's three concern chips (Ben, 2026-11-09): the homepage's chip
 * pattern (components/HeroConcernChips.tsx) cut to the three the sitewide
 * FAQ names first, same links, same concern_chip_click event with the fixed
 * label. Under the form, so they never push step one down the screen.
 */
const CHIPS: { label: ConcernChip; href: string }[] = [
  { label: "Anxiety", href: "/concerns/anxiety" },
  { label: "Focus & ADHD", href: "/concerns/focus-adhd" },
  { label: "Sleep", href: "/concerns/sleep" },
];

export default function StartChips() {
  const pathname = usePathname();
  return (
    <nav className="hero-chips start-chips" aria-label="What brings you in?">
      <span className="hero-chips-label" aria-hidden="true">
        What brings you in?
      </span>
      <div className="hero-chips-list">
        {CHIPS.map((c) => (
          <Link
            key={c.label}
            className="hero-chip"
            href={c.href}
            onClick={() => trackEvent(concernChipEvent(c.label, pathname))}
          >
            {c.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
