import type { ReactNode } from "react";

/**
 * A proprietary name set as a brand inside running copy — "Harmonized
 * Method" first (Ben, 2026-10-20): semibold navy with a thin antique-gold
 * rule just under the letters (`.brand-name` in app/globals.css). A plain
 * span — it is a name, not a link, and nothing about it invites a click.
 */
export default function BrandName({ children = "Harmonized Method" }: { children?: ReactNode }) {
  return <span className="brand-name">{children}</span>;
}
