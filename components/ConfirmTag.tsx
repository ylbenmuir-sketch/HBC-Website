import type { CSSProperties } from "react";
import { SHOW_DRAFT_CONTENT } from "@/lib/site-config";

/**
 * Gold [CONFIRM] / [Insert …] tag — marks unverified facts. Visible in dev
 * on purpose; renders NOTHING in production so internal notes cannot ship.
 * Values come from lib/site-config.ts; see CONTENT-CHECKLIST.md.
 */
export default function ConfirmTag({
  children,
  style,
}: {
  children: string;
  style?: CSSProperties;
}) {
  if (!SHOW_DRAFT_CONTENT) return null;
  return (
    <span className="todo-tag" style={style}>
      {children}
    </span>
  );
}
