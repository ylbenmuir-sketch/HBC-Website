import type { CSSProperties } from "react";

/** Serif italic testimonial card. Footer is optional (concern "common goal" cards omit it). */
export default function Quote({
  theme,
  text,
  attribution,
  place,
  style,
  footerStyle,
  attributionStyle,
  textStyle,
}: {
  theme: string;
  text: string;
  attribution?: string;
  place?: string;
  style?: CSSProperties;
  footerStyle?: CSSProperties;
  attributionStyle?: CSSProperties;
  textStyle?: CSSProperties;
}) {
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
