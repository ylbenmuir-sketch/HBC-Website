import type { CSSProperties, ReactNode } from "react";

export default function Eyebrow({
  children,
  center = false,
  style,
  className = "",
}: {
  children: ReactNode;
  center?: boolean;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={`eyebrow${center ? " center" : ""}${className ? ` ${className}` : ""}`}
      style={style}
    >
      {children}
    </div>
  );
}
