import type { CSSProperties } from "react";
import { SHOW_DRAFT_CONTENT } from "@/lib/site-config";

/**
 * Serif italic testimonial card. Footer is optional (concern "common goal"
 * cards omit it). Pass `sample` for unverified quote copy — sample quotes
 * render in development only and can never ship to production.
 */
export default function Quote({
  theme,
  text,
  attribution,
  place,
  sample = false,
  style,
  footerStyle,
  attributionStyle,
  textStyle,
}: {
  theme: string;
  text: string;
  attribution?: string;
  place?: string;
  /** Unverified/sample copy — rendered in draft mode only. */
  sample?: boolean;
  style?: CSSProperties;
  footerStyle?: CSSProperties;
  attributionStyle?: CSSProperties;
  textStyle?: CSSProperties;
}) {
  if (sample && !SHOW_DRAFT_CONTENT) return null;
  return (
    <div className="quote" style={style}>
      <div className="theme">{theme}</div>
      <p style={textStyle}>&ldquo;{text}&rdquo;</p>
      {attribution && (
        <footer style={footerStyle}>
          <b style={attributionStyle}>{attribution}</b>
          {place && <> &middot; {place}</>}
        </footer>
      )}
    </div>
  );
}
