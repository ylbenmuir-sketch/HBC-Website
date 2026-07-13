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

/** Primary CTA — the only booking CTA sitewide. Always "Talk With Our Team" → /contact. */
export function TalkCta({
  variant = "primary",
  style,
}: {
  variant?: BtnVariant;
  style?: CSSProperties;
}) {
  return (
    <Btn href="/contact" variant={variant} style={style}>
      Talk With Our Team
    </Btn>
  );
}
