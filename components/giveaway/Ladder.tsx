"use client";

import { useRef, useState, type ReactNode } from "react";

/**
 * The prize ladder's six steps, each opening to its value breakdown. One
 * open at a time: tap (any device) to open, tap again or tap another to
 * switch; on a device with a real pointer, hovering opens one too, and
 * leaving the ladder closes a hover-opened step (a tapped one stays). The
 * head is a real button (Enter/Space, aria-expanded, aria-controls); the
 * panel is inert while closed.
 *
 * Two looks, one DOM (Ben, 2026-10-20): the head carries both the climbing
 * card (`.ty-head-card`, from 768px) and the phone row (`.ty-head-row`:
 * day, prize in one line, value, a gold bar as long as the day's share of
 * the grand prize); CSS shows one. The panel is a popover under the card
 * on a wide screen and opens inline under the row on a phone. The words
 * and numbers are rendered on the server and handed in — this only decides
 * which step is open.
 */
export type LadderCard = { slot: string; className: string; state: string; head: ReactNode; row: ReactNode; panel: ReactNode };

export default function Ladder({ cards }: { cards: LadderCard[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const openedBy = useRef<"tap" | "hover" | null>(null);
  const hoverable = () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  const tap = (slot: string) => {
    openedBy.current = "tap";
    setOpen((o) => (o === slot ? null : slot));
  };
  const enter = (slot: string) => {
    if (!hoverable()) return;
    if (openedBy.current === "tap" && open) return;
    openedBy.current = "hover";
    setOpen(slot);
  };
  const leave = () => {
    if (openedBy.current !== "hover") return;
    openedBy.current = null;
    setOpen(null);
  };

  return (
    <div className="ty-ladder-wrap" onMouseLeave={leave}>
      <ol className="ty-ladder" data-prizes>
        {cards.map((c) => {
          const isOpen = open === c.slot;
          return (
            <li key={c.slot} className={c.className} data-state={c.state} data-slot={c.slot} data-open={isOpen ? "" : undefined} onMouseEnter={() => enter(c.slot)}>
              <button type="button" className="ty-step-head" aria-expanded={isOpen} aria-controls={`ty-panel-${c.slot}`} onClick={() => tap(c.slot)}>
                <span className="ty-head-card">{c.head}</span>
                <span className="ty-head-row">{c.row}</span>
                <span className="ty-step-more" aria-hidden="true">
                  {isOpen ? "−" : "+"}
                </span>
              </button>
              <div id={`ty-panel-${c.slot}`} className="ty-step-panel" inert={!isOpen}>
                <div className="ty-step-panel-in">{c.panel}</div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
