"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { concernChipEvent, trackEvent } from "@/lib/analytics";
import type { HomeConcernCard, HomeConcernIcon, HomeConcernLink } from "@/lib/home-concerns";

/**
 * The homepage's "What brings you in?" tabs (Ben, 2026-11-22): "For adults"
 * and "For children & families", each a grid of concern cards beside one
 * photo. The cards and their words come from lib/home-concerns.ts; this file
 * owns the interaction and the icons.
 *
 * WAI-ARIA tabs with automatic activation: role=tablist/tab/tabpanel,
 * aria-selected, a roving tabindex, Left/Right and Home/End. Both panels are
 * always in the HTML — the inactive one is `hidden`, so every card link is
 * there for a crawler and for a visitor without JavaScript's first tab.
 *
 * A card tap reports `concern_chip_click` with the card's fixed label — the
 * event the hero chips reported before these cards replaced them. An
 * ordinary link either way: measurement never gates navigation.
 */
export type ConcernTabGroup = {
  id: string;
  label: string;
  cards: HomeConcernCard[];
  /** The group's photo, rendered on the server and handed in. */
  photo: ReactNode;
  /** A plain link under the cards (the children tab's "How we work with
   *  children"). No event of its own. */
  link?: { href: string; label: string };
};

/** 24px line icons, drawn here: one stroke weight, no fills, `currentColor`. */
const ICONS: Record<HomeConcernIcon, ReactNode> = {
  // a pulse settling into a flat line
  anxiety: <path d="M2 12h3l2-6 3 12 3-9 2 3h7" />,
  // layers carried at once
  stress: (
    <>
      <path d="M12 3 3 8l9 5 9-5-9-5Z" />
      <path d="m3 12 9 5 9-5" />
      <path d="m3 16 9 5 9-5" />
    </>
  ),
  // a cloud with the sun behind it
  mood: (
    <>
      <path d="M7 18h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7.2 9.1 4.5 4.5 0 0 0 7 18Z" />
      <path d="M12 2v1.5M4.9 4.9 6 6M19.1 4.9 18 6" />
    </>
  ),
  // a target
  focus: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </>
  ),
  // a crescent moon
  sleep: <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />,
  // a cloud with lines of fog under it
  fog: (
    <>
      <path d="M7 14h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7.2 5.1 4.5 4.5 0 0 0 7 14Z" />
      <path d="M5 18h14M8 21.5h8" />
    </>
  ),
  // an open book
  school: (
    <>
      <path d="M12 6.5C10 5 7 4.5 3 5v13c4-.5 7 0 9 1.5 2-1.5 5-2 9-1.5V5c-4-.5-7 0-9 1.5Z" />
      <path d="M12 6.5V19.5" />
    </>
  ),
  // a heart
  regulation: <path d="M12 20.5s-8-4.9-8-11A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5c0 6.1-8 11-8 11Z" />,
};

function Icon({ name }: { name: HomeConcernIcon }) {
  return (
    <svg
      className="hc-icon"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICONS[name]}
    </svg>
  );
}

export default function ConcernTabs({
  groups,
  more = [],
}: {
  groups: ConcernTabGroup[];
  /** The "More we help with" row under the panels: concerns with no card.
   *  Outside the tabs, so it shows whichever tab is open. */
  more?: HomeConcernLink[];
}) {
  const [active, setActive] = useState(0);
  const pathname = usePathname();
  const base = useId();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const tabId = (i: number) => `${base}-tab-${i}`;
  const panelId = (i: number) => `${base}-panel-${i}`;

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = groups.length;
    let next: number | null = null;
    if (e.key === "ArrowRight") next = (i + 1) % n;
    else if (e.key === "ArrowLeft") next = (i - 1 + n) % n;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className="hc">
      <div className="hc-tabs" role="tablist" aria-label="Who it is for">
        {groups.map((g, i) => (
          <button
            key={g.id}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={tabId(i)}
            className="hc-tab"
            aria-selected={active === i}
            aria-controls={panelId(i)}
            tabIndex={active === i ? 0 : -1}
            onClick={() => setActive(i)}
            onKeyDown={(e) => onKey(e, i)}
          >
            {g.label}
          </button>
        ))}
      </div>
      {groups.map((g, i) => (
        <div
          key={g.id}
          id={panelId(i)}
          role="tabpanel"
          aria-labelledby={tabId(i)}
          className="hc-panel"
          hidden={active !== i}
        >
          <ul className="hc-cards">
            {g.cards.map((c) => (
              <li key={c.slug}>
                <Link
                  className="hc-card"
                  href={c.href}
                  onClick={() => trackEvent(concernChipEvent(c.chip, pathname))}
                >
                  <span className="hc-icon-wrap">
                    <Icon name={c.icon} />
                  </span>
                  <span className="hc-text">
                    <span className="hc-name">{c.title}</span>
                    <span className="hc-line">{c.line}</span>
                  </span>
                </Link>
              </li>
            ))}
            {g.link && (
              <li className="hc-panel-link">
                <Link href={g.link.href}>{g.link.label} &rarr;</Link>
              </li>
            )}
          </ul>
          <div className="hc-photo">{g.photo}</div>
        </div>
      ))}
      {more.length > 0 && (
        <nav className="hc-more" aria-labelledby={`${base}-more`}>
          <span className="hc-more-label" id={`${base}-more`}>
            More we help with
          </span>
          <ul>
            {more.map((l) => (
              <li key={l.slug}>
                <Link href={l.href} onClick={() => trackEvent(concernChipEvent(l.chip, pathname))}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
