import type { ReactNode } from "react";

export type FaqItem = { q: string; a: ReactNode };

/**
 * Native <details> accordion — keyboard and screen-reader accessible by
 * default (summary is a real disclosure button). `openFirst` expands the
 * first item so the pattern is self-evident.
 */
export default function FAQAccordion({
  items,
  className = "faq-list rv",
  openFirst = false,
}: {
  items: FaqItem[];
  className?: string;
  openFirst?: boolean;
}) {
  return (
    <div className={className}>
      {items.map((item, i) => (
        <details className="faq" key={item.q} open={openFirst && i === 0}>
          <summary>{item.q}</summary>
          <div className="a">{item.a}</div>
        </details>
      ))}
    </div>
  );
}
