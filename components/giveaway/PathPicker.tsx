"use client";

import { usePathname } from "next/navigation";
import { giveawayPathPickEvent, trackEvent } from "@/lib/analytics";
import type { PrizeVersion } from "@/lib/giveaway/config";
import { usePath } from "./PathProvider";

/**
 * "Which one are you?" — two equal buttons under the hero's lines (Ben,
 * 2026-10-20). A tap sets the visit's choice (PathProvider: the ladder's
 * version and the form's choice follow), highlights the button, reports
 * giveaway_path_pick, and scrolls to the prize ladder; the ladder's
 * scroll-margin-top keeps it clear of the sticky header.
 */
export default function PathPicker({ label, newLabel, currentLabel }: { label: string; newLabel: string; currentLabel: string }) {
  const { version, setVersion } = usePath();
  const pathname = usePathname();
  const pick = (v: PrizeVersion) => {
    setVersion(v);
    trackEvent(giveawayPathPickEvent(v === "new_client" ? "new" : "current", pathname ?? "/10years"));
    document.getElementById("ty-prizes")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const button = (v: PrizeVersion, text: string) => (
    <button type="button" className="ty-path-btn" aria-pressed={version === v} data-choice={v} onClick={() => pick(v)}>
      {text}
    </button>
  );
  return (
    <div className="ty-path" data-path-picker>
      <p className="ty-path-label" id="ty-path-label">
        {label}
      </p>
      <div className="ty-path-btns" role="group" aria-labelledby="ty-path-label">
        {button("new_client", newLabel)}
        {button("current_client", currentLabel)}
      </div>
    </div>
  );
}
