"use client";

import { useEffect, useState } from "react";

/**
 * Four boxes — days, hours, minutes, seconds — ticking to a config time.
 *
 * The target and "now" both come from the server (giveawayNow(), which can
 * be the fake clock on a laptop), so the first render matches on both
 * sides and the client ticks from the server's idea of now, not its own.
 * Stops at zero; the page's mode flips on the next load.
 */
export default function Countdown({ targetIso, nowIso, label, units }: { targetIso: string; nowIso: string; label: string; units: { days: string; hours: string; minutes: string; seconds: string } }) {
  const target = Date.parse(targetIso);
  const [remaining, setRemaining] = useState(() => Math.max(0, target - Date.parse(nowIso)));
  useEffect(() => {
    const offset = Date.parse(nowIso) - Date.now();
    const tick = () => setRemaining(Math.max(0, target - (Date.now() + offset)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target, nowIso]);
  const s = Math.floor(remaining / 1000);
  const parts = [
    [Math.floor(s / 86400), units.days],
    [Math.floor((s % 86400) / 3600), units.hours],
    [Math.floor((s % 3600) / 60), units.minutes],
    [s % 60, units.seconds],
  ] as const;
  return (
    <div className="ty-count" role="timer" aria-label={`${parts.map(([n, u]) => `${n} ${u}`).join(", ")} ${label}`} data-countdown>
      <div className="ty-count-boxes">
        {parts.map(([n, u]) => (
          <div className="ty-count-box" key={u}>
            <span className="ty-count-n" suppressHydrationWarning>
              {String(n).padStart(2, "0")}
            </span>
            <span className="ty-count-u">{u}</span>
          </div>
        ))}
      </div>
      <p className="ty-count-label">{label}</p>
    </div>
  );
}
