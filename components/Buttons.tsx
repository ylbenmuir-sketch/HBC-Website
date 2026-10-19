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

/**
 * Primary CTA — the only booking CTA sitewide. Always "See If It’s a Fit"
 * → /contact (it read "Get a Free Call Today" until 2026-10-19, Ben). `href` exists for one reason: a location page passes
 * `/contact?center=<slug>` so its own center is preselected on the form.
 */
export function TalkCta({
  variant = "primary",
  style,
  href = "/contact",
}: {
  variant?: BtnVariant;
  style?: CSSProperties;
  href?: string;
}) {
  return (
    <Btn href={href} variant={variant} style={style}>
      See If It&rsquo;s a Fit
    </Btn>
  );
}

/**
 * Secondary CTA — the priced first visit, for visitors who arrive already sold.
 * Appears in exactly five places: the homepage hero, /lens-neurofeedback,
 * /brain-map, /first-visit, and /how-lens-works. (The homepage Brain Map
 * section held a slot until /brain-map took the copy, Oct 2026; the
 * /lens-neurofeedback hero had one since that page shipped, which the old
 * "four" never counted.) It never appears without TalkCta beside it, and
 * never replaces it: the free call stays the primary ask everywhere. The
 * label was "Book Your Brain Map — $150" until 2026-10-19 (Ben).
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
      Book a First Visit &mdash; {BRAIN_MAP_PRICE}
    </Btn>
  );
}
