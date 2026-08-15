import type { CSSProperties } from "react";
import { SHOW_DRAFT_CONTENT } from "@/lib/site-config";

/**
 * The sage-gradient "photography needed" plate.
 * In development the shot spec stays visible so the missing photo is obvious;
 * in production the plate renders as a quiet brand gradient with no internal
 * notes. The real fix is replacing it with photography — see
 * CONTENT-CHECKLIST.md → Photography.
 */
export default function PlaceholderPlate({
  spec,
  label = "Photography needed",
  height,
  className = "",
  style,
}: {
  spec: string;
  label?: string;
  height?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`plate${className ? ` ${className}` : ""}`}
      style={{ ...(height ? { height } : {}), ...style }}
      aria-hidden="true"
    >
      {SHOW_DRAFT_CONTENT && (
        <div className="spec">
          <b>{label}</b>
          {spec}
        </div>
      )}
    </div>
  );
}
