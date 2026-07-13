import type { CSSProperties } from "react";

/**
 * Gold [CONFIRM] / [Insert …] tag — marks unverified facts, kept visible in
 * dev on purpose. Values come from lib/site-config.ts; see README for the
 * replacement checklist.
 */
export default function ConfirmTag({
  children,
  style,
}: {
  children: string;
  style?: CSSProperties;
}) {
  return (
    <span className="todo-tag" style={style}>
      {children}
    </span>
  );
}
