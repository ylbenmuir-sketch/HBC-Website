"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/**
 * The one place that decides which bottom bar is on screen.
 *
 * Before this existed there were two independent hide rules pointing at each
 * other: MobileCtaBar marked `body[data-cta-bar]` and a CSS rule under
 * `@media (max-width: 760px)` stood the assistant launcher down; the launcher
 * marked `body[data-assistant-open]` and a mirrored rule stood the CTA bar
 * down. Two rules, two owners, and nothing that could answer "what is at the
 * bottom of the screen right now" in one place.
 *
 * Now one reducer answers it. Every bottom-anchored thing reports its state
 * here and reads `active` back:
 *
 *   assistant panel open  →  "none"   (the panel is the bottom of the screen)
 *   CTA bar showing       →  "call"   (the primary conversion path always wins)
 *   otherwise             →  "ask"
 *
 * The bars themselves do not decide anything. BottomBarDock renders both into
 * a single fixed footprint and crossfades between them off this value, so a
 * yield reads as one bar changing state rather than two elements fighting.
 */

type Active = "call" | "ask" | "none";

/**
 * A request to open the assistant, with whatever the visitor had typed into
 * the ask bar. `nonce` rather than a bare string so that asking the same
 * question twice in a session still fires — the value has to change for the
 * effect on the other end to see it.
 */
type AssistantRequest = { text: string; nonce: number };

type BottomBarValue = {
  active: Active;
  /** True while the visitor is reading down the page: the ask bar collapses. */
  compact: boolean;
  assistantOpen: boolean;
  assistantRequest: AssistantRequest | null;
  /** Ask bar → assistant. `text` is passed through as the first message. */
  openAssistant: (text?: string) => void;
  /** Assistant → controller. */
  setAssistantOpen: (on: boolean) => void;
  /** CTA bar → controller: "I exist on this route" (returns its unregister). */
  registerCallBar: () => () => void;
  /** CTA bar → controller: "I am showing right now". */
  setCallBarActive: (on: boolean) => void;
  /** True when at least one bar could occupy the dock on this route. */
  docked: boolean;
  /** The dock's portal target for the CTA bar's markup. */
  slot: HTMLElement | null;
  setSlot: (el: HTMLElement | null) => void;
};

const BottomBarContext = createContext<BottomBarValue | null>(null);

/**
 * Reading the controller from outside the provider is a wiring mistake, not a
 * runtime condition to degrade around — every consumer lives under the
 * provider in app/layout.tsx.
 */
export function useBottomBar(): BottomBarValue {
  const value = useContext(BottomBarContext);
  if (!value) {
    throw new Error("useBottomBar must be used inside <BottomBarProvider>");
  }
  return value;
}

/** Past this the ask bar is allowed to collapse; above it, never. */
const COMPACT_AFTER_PX = 160;
/**
 * How far the visitor has to keep going in one direction before the bar
 * changes state. Accumulated rather than compared frame to frame, and with a
 * real threshold rather than a jitter epsilon, because the small corrections
 * a browser makes on its own are indistinguishable from a deliberate flick at
 * that scale: scroll anchoring after an image lands, an iOS rubber-band
 * settle, or the ~10px a headless jump reports one frame late will all read as
 * "scrolled up" and pop the full bar back open under a visitor who never
 * moved. A slow deliberate scroll still crosses this in a few frames.
 */
const DIRECTION_THRESHOLD_PX = 24;

export function BottomBarProvider({
  askAvailable,
  children,
}: {
  /**
   * Whether an ask bar can exist at all — i.e. whether the assistant is
   * behind its feature flag. Passed in rather than imported so the provider
   * stays a pure state container and app/layout.tsx keeps making the one
   * call about the flag.
   */
  askAvailable: boolean;
  children: React.ReactNode;
}) {
  const [callBars, setCallBars] = useState(0);
  const [callBarActive, setCallBarActive] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantRequest, setAssistantRequest] =
    useState<AssistantRequest | null>(null);
  const [compact, setCompact] = useState(false);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  const nonce = useRef(0);

  const registerCallBar = useCallback(() => {
    setCallBars((n) => n + 1);
    return () => setCallBars((n) => n - 1);
  }, []);

  const openAssistant = useCallback((text = "") => {
    nonce.current += 1;
    setAssistantRequest({ text, nonce: nonce.current });
  }, []);

  const docked = askAvailable || callBars > 0;

  /**
   * Precedence, in one expression. The assistant panel is the bottom of the
   * screen while it is open; after that the CTA bar always wins, because it
   * is the primary conversion path and the ask bar is not a conversion at
   * all. The ask bar is what is left.
   */
  const active: Active = assistantOpen
    ? "none"
    : callBarActive
      ? "call"
      : askAvailable
        ? "ask"
        : "none";

  /**
   * Reserve the dock's height at the end of the page so a fixed bar never
   * permanently covers the last of the footer. A body attribute rather than a
   * blanket rule because the reserve must not appear on a page that has no
   * bar to reserve for — globals.css hangs the footer padding off it.
   */
  useEffect(() => {
    if (!docked) return;
    document.body.dataset.bottombar = "on";
    return () => {
      delete document.body.dataset.bottombar;
    };
  }, [docked]);

  /**
   * One scroll listener for the whole dock. Reading down collapses the ask
   * bar to a pill; the first scroll up brings the full bar back, which is the
   * same vocabulary as the compact header (Header.tsx `.tucked`).
   */
  useEffect(() => {
    if (!docked) return;
    let last = window.scrollY;
    /** Distance travelled since the last direction change, signed. */
    let run = 0;
    let frame = 0;
    const read = () => {
      frame = 0;
      const y = window.scrollY;
      const delta = y - last;
      last = y;
      if (y <= COMPACT_AFTER_PX) {
        run = 0;
        setCompact(false);
        return;
      }
      if (delta === 0) return;
      // A change of direction starts the run over, so backtracking has to
      // earn the flip rather than inheriting the momentum of the way down.
      if (delta > 0 !== run > 0) run = 0;
      run += delta;
      if (run > DIRECTION_THRESHOLD_PX) {
        run = 0;
        setCompact(true);
      } else if (run < -DIRECTION_THRESHOLD_PX) {
        run = 0;
        setCompact(false);
      }
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(read);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [docked]);

  const value = useMemo<BottomBarValue>(
    () => ({
      active,
      compact,
      assistantOpen,
      assistantRequest,
      openAssistant,
      setAssistantOpen,
      registerCallBar,
      setCallBarActive,
      docked,
      slot,
      setSlot,
    }),
    [
      active,
      compact,
      assistantOpen,
      assistantRequest,
      openAssistant,
      registerCallBar,
      docked,
      slot,
    ]
  );

  return (
    <BottomBarContext.Provider value={value}>
      {children}
    </BottomBarContext.Provider>
  );
}
