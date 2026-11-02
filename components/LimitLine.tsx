import { LENS_LIMIT_LINE } from "@/lib/lens";

/**
 * The wellness-service line at the end of a section — plain, small, muted,
 * no box (Ben, 2026-10-16). It replaced the `.note-sage` panels. The 988
 * sentence it once carried on the depression page is gone (Ben, 2026-11-02:
 * no crisis lines anywhere on the site).
 */
export default function LimitLine({ className = "" }: { className?: string }) {
  return (
    <p className={`limit-line${className ? ` ${className}` : ""}`}>
      {LENS_LIMIT_LINE}
    </p>
  );
}
