import { CRISIS_LINE, LENS_LIMIT_LINE } from "@/lib/lens";

/**
 * The wellness-service line at the end of a section — plain, small, muted,
 * no box (Ben, 2026-10-16). It replaced the `.note-sage` panels. `crisis`
 * adds the 988 sentence; only the depression page and article pass it.
 */
export default function LimitLine({
  crisis = false,
  className = "",
}: {
  crisis?: boolean;
  className?: string;
}) {
  return (
    <p className={`limit-line${className ? ` ${className}` : ""}`}>
      {LENS_LIMIT_LINE}
      {crisis && <> {CRISIS_LINE}</>}
    </p>
  );
}
