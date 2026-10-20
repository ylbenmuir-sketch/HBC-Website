"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * The prize ladder's six cards, each opening to its value breakdown. One
 * open at a time: tap (any device) to open, tap again or tap another to
 * switch; on a device with a real pointer, hovering opens one too, and
 * leaving the ladder closes a hover-opened card (a tapped one stays). The
 * head is a real button (Enter/Space, aria-expanded); the panel is inert
 * while closed.
 *
 * Where the panel goes: on a wide screen it is a popover under its card,
 * so the climbing row never changes height; on a phone, where the row
 * swipes sideways and would clip a popover, the open card's breakdown
 * renders as one block under the row instead. The words and numbers are
 * rendered on the server and handed in — this only decides which card is
 * open and where its panel sits.
 */
export type LadderCard = { slot: string; className: string; state: string; head: ReactNode; panel: ReactNode };

const NARROW = "(max-width: 760px)";

export default function Ladder({ cards }: { cards: LadderCard[] }) {
  const [open, setOpen] = useState<string | null>(null);
  const [narrow, setNarrow] = useState(false);
  const openedBy = useRef<"tap" | "hover" | null>(null);
  const hoverable = () => typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  useEffect(() => {
    const mq = window.matchMedia(NARROW);
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

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

  const current = cards.find((c) => c.slot === open) ?? null;
  const panelId = (slot: string) => (narrow ? "ty-ladder-detail" : `ty-panel-${slot}`);

  return (
    <div className="ty-ladder-wrap" onMouseLeave={leave}>
      <ol className="ty-ladder" data-prizes>
        {cards.map((c) => {
          const isOpen = open === c.slot;
          return (
            <li key={c.slot} className={c.className} data-state={c.state} data-slot={c.slot} data-open={isOpen ? "" : undefined} onMouseEnter={() => enter(c.slot)}>
              <button type="button" className="ty-step-head" aria-expanded={isOpen} aria-controls={panelId(c.slot)} onClick={() => tap(c.slot)}>
                {c.head}
                <span className="ty-step-more" aria-hidden="true">
                  {isOpen ? "−" : "+"}
                </span>
              </button>
              {!narrow && (
                <div id={`ty-panel-${c.slot}`} className="ty-step-panel" inert={!isOpen}>
                  <div className="ty-step-panel-in">{c.panel}</div>
                </div>
              )}
            </li>
          );
        })}
      </ol>
      {narrow && (
        <div id="ty-ladder-detail" className={`ty-ladder-detail${current?.className.includes("ty-step-grand") ? " ty-step-grand" : ""}`} data-open={current ? "" : undefined} inert={!current}>
          <div className="ty-step-panel-in">{current?.panel}</div>
        </div>
      )}
    </div>
  );
}
