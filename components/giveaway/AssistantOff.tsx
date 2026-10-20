"use client";

import { useEffect } from "react";
import { useBottomBar } from "@/components/BottomBarContext";

/**
 * Rendered by a page that has decided, on the server and from the giveaway
 * clock, that the assistant is off (lib/giveaway/assistant.ts). Tells the
 * bottom-bar provider so, for as long as it is mounted; leaving the page
 * unmounts it and the assistant returns. The hidden span is a marker the
 * checks can read in the HTML.
 */
export default function AssistantOff() {
  const { setPageSuppressed } = useBottomBar();
  useEffect(() => {
    setPageSuppressed(true);
    return () => setPageSuppressed(false);
  }, [setPageSuppressed]);
  return <span hidden data-assistant-off="" />;
}
