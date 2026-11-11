"use client";

import { useSyncExternalStore } from "react";

/**
 * Which center /start is showing details for (Ben, 2026-11-11): the header's
 * phone, the Call and Text buttons and the address line follow the center
 * chip picked in the form. The form is the one writer (components/
 * ContactForm.tsx, "start" variant — it also reads ?center= on mount); the
 * header and components/StartCenterDetails.tsx read. Null until a center is
 * chosen, and each reader then falls back to its own default (the page's
 * ?center=, else Nashville). Never stored: it is the form's state, shared.
 */
export type StartCenterSlug = "nashville" | "murfreesboro";

let current: StartCenterSlug | null = null;
const listeners = new Set<() => void>();

export function setStartCenter(next: StartCenterSlug | null) {
  if (next === current) return;
  current = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useStartCenter(fallback: StartCenterSlug = "nashville"): StartCenterSlug {
  const picked = useSyncExternalStore(subscribe, () => current, () => null);
  return picked ?? fallback;
}
