"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { PrizeVersion } from "@/lib/giveaway/config";

/**
 * The one choice the /10years page keeps for the visit: new client or
 * current client (Ben, 2026-10-20). Three things read and write it — the
 * "Which one are you?" picker in the hero, the form's required choice, the
 * ladder's New/Current toggle — and they stay in sync through this
 * context. Remembered in sessionStorage (wrapped: a private window or a
 * blocked store just forgets), read after mount so the server and the
 * first client render agree.
 *
 * `null` = not chosen yet: the ladder shows the new-client version (its
 * default), the form has neither option picked.
 */
export type PathChoice = PrizeVersion | null;

const KEY = "hbc10y.path";

type Ctx = { version: PathChoice; setVersion: (v: PrizeVersion) => void };
const PathContext = createContext<Ctx>({ version: null, setVersion: () => {} });

function read(): PathChoice {
  try {
    const v = window.sessionStorage.getItem(KEY);
    return v === "new_client" || v === "current_client" ? v : null;
  } catch {
    return null;
  }
}

export default function PathProvider({ children }: { children: ReactNode }) {
  const [version, set] = useState<PathChoice>(null);
  useEffect(() => {
    const v = read();
    if (v) set(v);
  }, []);
  const setVersion = useCallback((v: PrizeVersion) => {
    set(v);
    try {
      window.sessionStorage.setItem(KEY, v);
    } catch {
      // Forgetting is fine.
    }
  }, []);
  return <PathContext.Provider value={{ version, setVersion }}>{children}</PathContext.Provider>;
}

export function usePath(): Ctx {
  return useContext(PathContext);
}
