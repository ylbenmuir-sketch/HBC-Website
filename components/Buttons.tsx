import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

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
 * Primary CTA — the only booking CTA sitewide. Always "Get Started"
 * → /contact (Ben, 2026-10-26; earlier labels are listed in README.md under
 * "Compliance guardrails"). `href` exists for one reason: a location page passes
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
      Get Started
    </Btn>
  );
}

/**
 * The small muted line under TalkCta that says what happens after the tap
 * (Ben, 2026-10-26): the homepage hero and both concern-page heroes. Placed
 * inside a `.hero-ctas` row; `.cta-reassure` in globals.css gives it a row of
 * its own on a desktop and its phone colours over the homepage scrim.
 */
export function CtaReassure() {
  return (
    <p className="cta-reassure">
      No pressure. We&rsquo;ll reach out to answer your questions and find a
      time.
    </p>
  );
}

/*
 * BrainMapCta ("Book a First Visit — $150", and "Book Your Brain Map — $150"
 * before 2026-10-19) was retired on 2026-11-02 (Ben): it opened the same
 * free-call form as TalkCta, so the label promised a booking the tap did not
 * make, and it put a dollar amount in a button. The prices live in body copy
 * now — /first-visit's cost card, /brain-map's "What it costs",
 * /lens-neurofeedback's first-visit step, the FAQ — after the value they
 * price. Every button that opens the form says "Get Started".
 */
