"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import ConfirmTag from "./ConfirmTag";

/**
 * The homepage Brain Map section as a 1-2-3 stage (Ben, 2026-10-19): three
 * steps — Scan, Results, Plan — and one large visual panel that changes with
 * the step. Step 1 is active on load; a click or arrow key switches; nothing
 * auto-advances. Desktop puts the steps on the left as large rows and the
 * panel on the right; under 1024px the steps are a segmented tab bar, the
 * panel follows, then the active step's text, then the buttons.
 *
 * Accessibility: the WAI-ARIA tabs pattern — role=tablist/tab/tabpanel,
 * aria-selected, roving tabindex, Left/Right/Up/Down/Home/End — with the
 * inactive panels `hidden` from the tree (`inert` + aria-hidden) and
 * crossfaded by CSS; prefers-reduced-motion drops the fade. The Map|Bars
 * pill on the Scan panel is two aria-pressed buttons.
 *
 * Everything with copy or data arrives as props from the server page
 * (app/page.tsx): the step text, the heat map and bars (server-rendered SVG
 * from lib/brain-map-sample.ts), the gated Results callouts, the Plan photo
 * and the buttons. This file owns only the interaction.
 */
export type StageStep = { title: string; text: ReactNode };
export type StageCallout = { n: number; where: string; line: string | null; note?: string };

export default function BrainMapStage({
  head,
  steps,
  heat,
  bars,
  resultsHeat,
  callouts,
  plan,
  actions,
  about,
  caption,
  heatLive,
}: {
  head: ReactNode;
  steps: [StageStep, StageStep, StageStep];
  heat: ReactNode;
  bars: ReactNode;
  resultsHeat: ReactNode;
  callouts: StageCallout[];
  plan: ReactNode;
  actions: ReactNode;
  about: ReactNode;
  caption: ReactNode;
  /** BRAIN_MAP_HEATMAP_LIVE: when false the Map view wears a "Coming soon" tag. */
  heatLive: boolean;
}) {
  const [active, setActive] = useState(0);
  const [view, setView] = useState<"map" | "bars">("map");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const base = useId();
  const tabId = (i: number) => `${base}-tab-${i}`;
  const panelId = (i: number) => `${base}-panel-${i}`;

  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = steps.length;
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % n;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + n) % n;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    if (next === null) return;
    e.preventDefault();
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  const panels: ReactNode[] = [
    <div className="bms-scan" key="scan">
      {!heatLive && view === "map" && <span className="bms-soon">Coming soon</span>}
      <div className="bms-toggle" role="group" aria-label="Show the sample as">
        <button type="button" aria-pressed={view === "map"} onClick={() => setView("map")}>
          Map
        </button>
        <button type="button" aria-pressed={view === "bars"} onClick={() => setView("bars")}>
          Bars
        </button>
      </div>
      <div className="bms-heat" hidden={view !== "map"}>
        {heat}
      </div>
      <div className="bms-bars" hidden={view !== "bars"}>
        {bars}
      </div>
    </div>,
    <div className="bms-results" key="results">
      <div className="bms-heat bms-heat-results">{resultsHeat}</div>
      <ol className="bms-callouts">
        {callouts.map((c) => (
          <li className="bms-callout" key={c.n}>
            <span className="bms-callout-n" aria-hidden="true">
              {c.n}
            </span>
            <span>
              <b>{c.where}</b>
              {c.line && (
                <>
                  {c.line}
                  {c.note && <ConfirmTag>{c.note}</ConfirmTag>}
                </>
              )}
            </span>
          </li>
        ))}
      </ol>
    </div>,
    <div className="bms-plan" key="plan">
      {plan}
      <div className="bms-plan-labels" aria-label="Your map, then your plan, then brief, passive sessions">
        <span>Your map</span>
        <span className="sep" aria-hidden="true">
          →
        </span>
        <span>Your plan</span>
        <span className="sep" aria-hidden="true">
          →
        </span>
        <span>Brief, passive sessions</span>
      </div>
    </div>,
  ];

  return (
    <div className="bms">
      <div className="bms-head">{head}</div>

      <div className="bms-tabs" role="tablist" aria-label="The Brain Map in three steps" aria-orientation="vertical">
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
            onClick={() => setActive(i)}
            onKeyDown={(e) => onKey(e, i)}
          >
            <span className="bms-n" aria-hidden="true">
              {i + 1}
            </span>
            <span className="bms-t">{s.title}</span>
            <span className="bms-x">{s.text}</span>
          </button>
        ))}
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
        <p className="bms-caption">{caption}</p>
      </div>

      {/* The active step's text, for the stacked layout only (CSS hides it
          from 1024px up, where the text sits inside the active row). */}
      <div className="bms-text-m" aria-hidden="true">
        {steps[active].text}
      </div>

      <div className="bms-actions-wrap">
        <div className="bms-actions">{actions}</div>
        {about}
      </div>
    </div>
  );
}
