import Image from "next/image";
import type { CSSProperties } from "react";

/**
 * The mockups' `.ph` background-image div, rebuilt on next/image.
 * `position` maps to the mockup's background-position; `height` to the
 * inline height. Pass `sizes` to match the rendered column width.
 *
 * Mobile art direction: `positionMobile` re-crops the image below 760px
 * (via the `--ph-pos-m` custom property read in globals.css), and
 * `aspect` pins an aspect-ratio instead of a fixed height — both are
 * additive and leave existing desktop callers untouched.
 *
 * An aspect-pinned frame also carries `.ph-aspect`. The design system's
 * mobile heights are declared `!important` specifically to beat the inline
 * `height={N}` this component writes for fixed-height callers — and an
 * `!important` stylesheet height beats a non-important inline `height: auto`
 * too, which is not what those rules mean. A definite height alongside a
 * definite `aspect-ratio` resolves to a definite *width*, so the frame stops
 * fitting its column and starts sizing it. `.ph-aspect` is what lets those
 * rules exclude the ratio-pinned case and keep meaning what they say.
 */
export default function PhotoFrame({
  src,
  alt,
  position = "center",
  positionMobile,
  height,
  aspect,
  className = "",
  style,
  sizes = "(max-width: 1060px) 100vw, 50vw",
  priority = false,
}: {
  src: string;
  alt: string;
  position?: string;
  /** object-position override applied ≤760px for mobile-specific crops. */
  positionMobile?: string;
  height?: number;
  /** CSS aspect-ratio (e.g. "4 / 5"); alternative to a fixed height. */
  aspect?: string;
  className?: string;
  style?: CSSProperties;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <div
      className={`ph${aspect ? " ph-aspect" : ""}${className ? ` ${className}` : ""}`}
      style={{
        ...(height ? { height } : {}),
        ...(aspect ? { aspectRatio: aspect } : {}),
        ...(positionMobile
          ? ({ "--ph-pos-m": positionMobile } as CSSProperties)
          : {}),
        ...style,
      }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        style={{
          objectFit: "cover",
          // --ph-pos-active is only defined ≤760px (globals.css), where it
          // resolves to --ph-pos-m; everywhere else the fallback wins.
          objectPosition: `var(--ph-pos-active, ${position})`,
        }}
      />
    </div>
  );
}
