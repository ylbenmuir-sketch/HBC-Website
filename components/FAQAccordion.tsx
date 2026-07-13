import type { ReactNode } from "react";

export type FaqItem = { q: string; a: ReactNode };

/** Native <details> accordion, exactly as the mockups render it. */
export default function FAQAccordion({
  items,
  className = "faq-list rv",
}: {
  items: FaqItem[];
  className?: string;
}) {
  return (
    <div className={className}>
      {items.map((item) => (
        <details className="faq" key={item.q}>
          <summary>{item.q}</summary>
          <div className="a">{item.a}</div>
        </details>
      ))}
    </div>
  );
}
