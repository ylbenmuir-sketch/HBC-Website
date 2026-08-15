import type { CSSProperties } from "react";
import ConfirmTag from "./ConfirmTag";

export type ProofStat = {
  stat: string;
  label: string;
  todo?: string;
  /**
   * Unverified stats drop out of a production build entirely, the same way the
   * hero drops the claim built on them — a number hidden in one place and shown
   * in another is worse than either. Omit for stats that need no verification.
   */
  verified?: boolean;
};

/** The bordered stat band (homepage under the hero, about page). */
export default function ProofBand({
  stats,
  style,
}: {
  stats: ProofStat[];
  style?: CSSProperties;
}) {
  const visible = stats.filter((s) => s.verified !== false);
  return (
    <div className="proof rv" style={style}>
      {/* Column count follows the surviving stats so gating never leaves a
          hole in the grid; the mobile 2-up rules override it untouched. */}
      <div
        className="wrap-wide proof-grid"
        style={{ "--proof-cols": visible.length } as CSSProperties}
      >
        {visible.map((s) => (
          <div key={s.label}>
            <strong>{s.stat}</strong>
            <span>{s.label}</span>
            {s.todo && (
              <ConfirmTag style={{ display: "block", marginTop: 6, fontSize: 11 }}>
                {s.todo}
              </ConfirmTag>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
