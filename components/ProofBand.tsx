import type { CSSProperties } from "react";

export type ProofStat = { stat: string; label: string; todo?: string };

/** The four-stat bordered band (homepage under the hero, about page). */
export default function ProofBand({
  stats,
  style,
}: {
  stats: ProofStat[];
  style?: CSSProperties;
}) {
  return (
    <div className="proof rv" style={style}>
      <div className="wrap-wide proof-grid">
        {stats.map((s) => (
          <div key={s.label}>
            <strong>{s.stat}</strong>
            <span>{s.label}</span>
            {s.todo && <span className="todo">{s.todo}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
