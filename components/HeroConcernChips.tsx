"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CONCERN_CHIPS, concernChipEvent, trackEvent, type ConcernChip } from "@/lib/analytics";

/**
 * The "What brings you in?" row under the homepage hero's buttons (Ben,
 * 2026-10-19): a small grey label and eight quiet pill links to the concern
 * pages. Quieter than both buttons by design — thin border, ivory ground,
 * small type — and they wrap at every width; there is no horizontal scroll
 * and all eight are always visible.
 *
 * A tap reports `concern_chip_click` with the chip's fixed label and the page
 * (lib/analytics.ts); the labels are this list, so nothing a visitor typed
 * can reach GA. Not a Key event. The links are ordinary links either way —
 * measurement never gates navigation.
 */
const CHIP_HREFS: Record<ConcernChip, string> = {
  Anxiety: "/concerns/anxiety",
  Stress: "/concerns/stress-resilience",
  Depression: "/concerns/depression",
  "Focus & ADHD": "/concerns/focus-adhd",
  Sleep: "/concerns/sleep",
  Concussion: "/concerns/concussion",
  "Brain fog": "/concerns/brain-fog",
  Migraines: "/concerns/migraines",
};

export default function HeroConcernChips() {
  const pathname = usePathname();
  return (
    <nav className="hero-chips" aria-label="What brings you in?">
      <span className="hero-chips-label" aria-hidden="true">
        What brings you in?
      </span>
      <div className="hero-chips-list">
        {CONCERN_CHIPS.map((label) => (
          <Link
            key={label}
            className="hero-chip"
            href={CHIP_HREFS[label]}
            onClick={() => trackEvent(concernChipEvent(label, pathname))}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
