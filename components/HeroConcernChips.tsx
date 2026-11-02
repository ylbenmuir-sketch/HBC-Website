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
 * Two places on the homepage since 2026-11-02 (Ben): the hero row from
 * 761px up (`variant="hero"`, the default) and, on a phone, a section of
 * its own right after the hero with a real heading and a two-column grid of
 * full-width, 44px-tall chips (`variant="section"`). Each is `display: none`
 * where the other shows (globals.css `.hero-chips` / `.concern-chips-sec`),
 * so a visitor sees exactly one set. Same links, same event.
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

export default function HeroConcernChips({
  variant = "hero",
}: {
  variant?: "hero" | "section";
}) {
  const pathname = usePathname();
  const chips = CONCERN_CHIPS.map((label) => (
    <Link
      key={label}
      className="hero-chip"
      href={CHIP_HREFS[label]}
      onClick={() => trackEvent(concernChipEvent(label, pathname))}
    >
      {label}
    </Link>
  ));
  if (variant === "section") {
    return (
      <section className="concern-chips-sec" aria-labelledby="concern-chips-h">
        <div className="wrap">
          <h2 id="concern-chips-h" className="concern-chips-h">
            What brings you in?
          </h2>
          <nav className="concern-chips-grid" aria-label="Concerns">
            {chips}
          </nav>
        </div>
      </section>
    );
  }
  return (
    <nav className="hero-chips" aria-label="What brings you in?">
      <span className="hero-chips-label" aria-hidden="true">
        What brings you in?
      </span>
      <div className="hero-chips-list">{chips}</div>
    </nav>
  );
}
