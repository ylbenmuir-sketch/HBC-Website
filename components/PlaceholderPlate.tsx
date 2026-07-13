import type { CSSProperties } from "react";

/**
 * The sage-gradient "photography needed" plate from the mockups.
 * Renders the shot spec so the missing photo stays visible in dev.
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
    >
      <div className="spec">
        <b>{label}</b>
        {spec}
      </div>
    </div>
  );
}
