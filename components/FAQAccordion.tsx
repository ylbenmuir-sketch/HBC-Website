import type { ReactNode } from "react";

/**
 * One Q&A pair.
 *
 * `a` is always plain text, never JSX, because it feeds two consumers: this
 * accordion and the FAQPage JSON-LD (lib/schema.ts → faqPageSchema). Schema
 * needs a string, and deriving one from a React tree is not something to do
 * at render time.
 *
 * `rendered` is the optional richer variant — an answer with an inline link,
 * a [CONFIRM] tag, or typographic markup — and displays in place of `a` when
 * present. Keep the two saying the same thing: `a` is what search engines
 * read as the answer, so it should mirror what a visitor sees, minus the
 * markup and minus anything draft-gated.
 */
export type FaqItem = { q: string; a: string; rendered?: ReactNode };

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
  items: readonly FaqItem[];
  className?: string;
  openFirst?: boolean;
}) {
  return (
    <div className={className}>
      {items.map((item, i) => (
        <details className="faq" key={item.q} open={openFirst && i === 0}>
          <summary>{item.q}</summary>
          <div className="a">{item.rendered ?? item.a}</div>
        </details>
      ))}
    </div>
  );
}
