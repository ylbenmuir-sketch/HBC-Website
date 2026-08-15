import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { BRAIN_MAP_PRICE } from "@/lib/site-config";

type BtnVariant = "primary" | "invert" | "ghost" | "outline";

export function Btn({
  href,
  variant = "primary",
  children,
  arrow = false,
  style,
  external = false,
}: {
  href: string;
  variant?: BtnVariant;
  children: ReactNode;
  arrow?: boolean;
  style?: CSSProperties;
  external?: boolean;
}) {
  const className = `btn btn-${variant}`;
  const content = (
    <>
      {children}
      {arrow && <span className="arrow">→</span>}
    </>
  );
  if (external || href.startsWith("tel:") || href.startsWith("http")) {
    return (
      <a
        className={className}
        style={style}
        href={href}
        {...(href.startsWith("http")
          ? { target: "_blank", rel: "noopener" }
          : {})}
      >
        {content}
      </a>
    );
  }
  return (
    <Link className={className} style={style} href={href}>
      {content}
    </Link>
  );
}

/** Primary CTA — the only booking CTA sitewide. Always "Get a Free Call Today" → /contact. */
export function TalkCta({
  variant = "primary",
  style,
}: {
  variant?: BtnVariant;
  style?: CSSProperties;
}) {
  return (
    <Btn href="/contact" variant={variant} style={style}>
      Get a Free Call Today
    </Btn>
  );
}

/**
 * Secondary CTA — the priced first visit, for visitors who arrive already sold.
 * Appears in exactly four places: the homepage hero, the homepage Harmonized
 * Brain Map section, /first-visit, and /how-lens-works. It never appears
 * without TalkCta beside it, and never replaces it: the free call stays the
 * primary ask everywhere.
 *
 * Destination is /contact, same as the primary — there is no booking system
 * yet, so this names the priced step rather than competing for a different
 * conversion path.
 */
export function BrainMapCta({
  variant = "ghost",
  style,
}: {
  variant?: BtnVariant;
  style?: CSSProperties;
}) {
  return (
    <Btn href="/contact" variant={variant} style={style}>
      Book Your Brain Map &mdash; {BRAIN_MAP_PRICE}
    </Btn>
  );
}
