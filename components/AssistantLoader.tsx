"use client";

import { useEffect, useState, type ComponentType } from "react";
import { useBottomBar } from "./BottomBarContext";

/**
 * Loads the site assistant's code when the browser is idle, not when the
 * page hydrates.
 *
 * `next/dynamic` in app/layout.tsx split SiteAssistant into its own chunk,
 * which kept it out of the shared bundle — but a dynamic component that is
 * rendered on the server is still a client reference in the page's RSC
 * payload, so Next listed its chunk among the page's scripts and React
 * waited on it to hydrate the boundary. The chunk rode the critical path
 * after all; the only thing the split saved was the parse of pages the
 * widget was not on, and it is on every page.
 *
 * Nothing the visitor can see depends on that code arriving early.
 * SiteAssistant renders null until an idle callback plus a 1.4 s beat
 * (its own `mounted` gate), and the panel's markup does not exist until
 * the ask bar opens it. So the import waits for the same idle moment the
 * component itself already waits for, and the main thread during the
 * first seconds of a visit belongs to the page.
 *
 * The one way it can be needed sooner is the ask bar: an `assistantRequest`
 * is a visitor who has already pressed it. That triggers the import at
 * once, and SiteAssistant's request effect runs on mount with the request
 * still in context, so the panel opens with the question they typed. In
 * the window between hydration and the idle import — a few hundred
 * milliseconds on a throttled phone — that open lands after the chunk
 * arrives rather than inside the tap, which on iOS means the composer
 * takes focus without raising the keyboard for that one press. Before this
 * change the same tap in the same window suspended on the same chunk; the
 * window is now slightly longer because the download starts later.
 *
 * phase-8-chatbot.md §6: "Must not block or degrade LCP. It loads after the
 * page is interactive." This is that sentence, made literal.
 */
export default function AssistantLoader() {
  const { assistantRequest } = useBottomBar();
  const [Assistant, setAssistant] = useState<ComponentType | null>(null);
  const requested = assistantRequest !== null;

  useEffect(() => {
    if (Assistant) return;
    let cancelled = false;
    const load = () => {
      import("./SiteAssistant").then((m) => {
        if (!cancelled) setAssistant(() => m.default);
      });
    };
    if (requested) {
      load();
      return () => {
        cancelled = true;
      };
    }
    const hasIdle = typeof window.requestIdleCallback === "function";
    // The 3 s timeout is the same one SiteAssistant's arrival timer uses:
    // a page that never goes idle still gets its assistant.
    const handle = hasIdle
      ? window.requestIdleCallback(load, { timeout: 3000 })
      : window.setTimeout(load, 1200);
    return () => {
      cancelled = true;
      if (hasIdle) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
    };
  }, [requested, Assistant]);

  return Assistant ? <Assistant /> : null;
}
