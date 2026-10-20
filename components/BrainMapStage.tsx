"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import BrainMapViews from "./BrainMapViews";

/**
 * The homepage Brain Map section as a 1-2-3 stage (Ben, 2026-10-19): Scan,
 * Results, Plan, and one visual panel that changes with the step.
 *
 * Desktop (≥1024px): the three steps are rows on the left with all three
 * texts visible — the active one on a white card with the sage rule, the
 * others lighter — and a fixed-height panel on the right that crossfades.
 * It advances itself every 7 s (a thin sage line fills under the active
 * step) while at least half the section is in view, stops for good on any
 * hover, click or focus inside it, and never runs under
 * prefers-reduced-motion.
 *
 * Phone and tablet (<1024px): eyebrow, H2, a segmented tab bar, the active
 * step's text card (with a "Next: … →" link that switches the tab and
 * brings the bar back into view), then the visual, caption and buttons. No
 * auto-advance.
 *
 * WAI-ARIA tabs: role=tablist/tab/tabpanel, aria-selected, roving tabindex,
 * arrow keys, Home/End; inactive panels are inert and aria-hidden. Copy,
 * data and visuals arrive as props from app/page.tsx — this file owns the
 * interaction only.
 */
export type StageStep = { title: string; text: ReactNode };
export type StageCallout = { n: number; head: string; text: string };

const ADVANCE_MS = 7000;

export default function BrainMapStage({
  head,
  steps,
  heat,
  bars,
  resultsHeat,
  callouts,
  scanLine,
  plan,
  actions,
  about,
  caption,
}: {
  head: ReactNode;
  steps: [StageStep, StageStep, StageStep];
  heat: ReactNode;
  bars: ReactNode;
  resultsHeat: ReactNode;
  callouts: StageCallout[];
  /** The quiet line under the Scan visual. */
  scanLine: ReactNode;
  plan: ReactNode;
  actions: ReactNode;
  about: ReactNode;
  /** Shown under the visual on Scan and Results; its space is kept on Plan. */
  caption: ReactNode;
}) {
  const [active, setActive] = useState(0);
  // Auto-advance: on until the visitor touches the section.
  const [auto, setAuto] = useState(true);
  const [inView, setInView] = useState(false);
  const [canAuto, setCanAuto] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const base = useId();
  const tabId = (i: number) => `${base}-tab-${i}`;
  const panelId = (i: number) => `${base}-panel-${i}`;

  // Desktop, motion allowed, and the section at least half in view.
  useEffect(() => {
    const desk = window.matchMedia("(min-width: 1024px)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setCanAuto(desk.matches && !reduce.matches);
    update();
    desk.addEventListener("change", update);
    reduce.addEventListener("change", update);
    const el = root.current;
    const io = el
      ? new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.5 })
      : null;
    if (el && io) io.observe(el);
    return () => {
      desk.removeEventListener("change", update);
      reduce.removeEventListener("change", update);
      io?.disconnect();
    };
  }, []);

  const running = auto && canAuto && inView;
  useEffect(() => {
    if (!running) return;
    const t = window.setTimeout(() => setActive((i) => (i + 1) % steps.length), ADVANCE_MS);
    return () => window.clearTimeout(t);
  }, [running, active, steps.length]);

  const stop = () => setAuto(false);

  const go = (i: number) => {
    stop();
    setActive(i);
  };

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = steps.length;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % n;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + n) % n;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    if (next === null) return;
    e.preventDefault();
    go(next);
    tabRefs.current[next]?.focus();
  };

  // The phone card's "Next: … →": switch, then bring the tab bar back up.
  const next = (i: number) => {
    go(i);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    tabsRef.current?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
  };

  const panels: ReactNode[] = [
    <BrainMapViews key="scan" heat={heat} bars={bars} onChoose={stop}>
      <p className="bms-scanline">{scanLine}</p>
    </BrainMapViews>,
    <div className="bms-results" key="results">
      <div className="bms-heat bms-heat-results">{resultsHeat}</div>
      <ol className="bms-callouts">
        {callouts.map((c) => (
          <li className="bms-callout" key={c.n}>
            <span className="bms-callout-n" aria-hidden="true">
              {c.n}
            </span>
            <span>
              <b>{c.head}</b>
              {c.text}
            </span>
          </li>
        ))}
      </ol>
    </div>,
    <div className="bms-plan" key="plan">
      {plan}
      <div className="bms-plan-labels" aria-label="Your map, then your plan, then brief, passive sessions">
        <span>Your map</span>
        <span className="sep" aria-hidden="true">→</span>
        <span>Your plan</span>
        <span className="sep" aria-hidden="true">→</span>
        <span>Brief, passive sessions</span>
      </div>
    </div>,
  ];

  return (
    <div
      ref={root}
      className={`bms${running ? " is-auto" : ""}`}
      onPointerOver={stop}
      onClickCapture={stop}
      onFocusCapture={stop}
    >
      <div className="bms-head">{head}</div>

      <div ref={tabsRef} className="bms-tabs" role="tablist" aria-label="The Brain Map in three steps" aria-orientation="vertical">
        {steps.map((s, i) => (
          <button
            key={s.title}
            ref={(el) => {
              tabRefs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={tabId(i)}
            className="bms-tab"
            aria-selected={active === i}
            aria-controls={panelId(i)}
            tabIndex={active === i ? 0 : -1}
            onClick={() => go(i)}
            onKeyDown={(e) => onKey(e, i)}
          >
            <span className="bms-n" aria-hidden="true">
              {i + 1}
            </span>
            <span className="bms-t">{s.title}</span>
            <span className="bms-x">{s.text}</span>
            {running && active === i && <span className="bms-progress" aria-hidden="true" key={`p-${i}`} />}
          </button>
        ))}
      </div>

      {/* The active step on a card, for the stacked layout only (hidden from
          1024px up, where the text sits in its row). */}
      <div className="bms-card-m" aria-hidden="true">
        <span className="bms-n">{active + 1}</span>
        <span className="bms-t">{steps[active].title}</span>
        <div className="bms-x">{steps[active].text}</div>
        {active < steps.length - 1 && (
          <button type="button" className="bms-next" onClick={() => next(active + 1)} tabIndex={-1}>
            Next: {steps[active + 1].title.replace(/\.$/, "")} →
          </button>
        )}
      </div>

      <div className="bms-stage">
        <div className="bms-frame">
          {panels.map((p, i) => (
            <div
              key={i}
              id={panelId(i)}
              role="tabpanel"
              aria-labelledby={tabId(i)}
              className={`bms-panel${active === i ? " is-active" : ""}`}
              aria-hidden={active !== i}
              inert={active !== i}
            >
              {p}
            </div>
          ))}
        </div>
        <p className="bms-caption" style={{ visibility: active === 2 ? "hidden" : "visible" }}>
          {caption}
        </p>
      </div>

      <div className="bms-actions-wrap">
        <div className="bms-actions">{actions}</div>
        {about}
      </div>
    </div>
  );
}
