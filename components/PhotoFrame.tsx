import Image from "next/image";
import type { CSSProperties } from "react";

/**
 * The mockups' `.ph` background-image div, rebuilt on next/image.
 * `position` maps to the mockup's background-position; `height` to the
 * inline height. Pass `sizes` to match the rendered column width.
 */
export default function PhotoFrame({
  src,
  alt,
  position = "center",
  height,
  className = "",
  style,
  sizes = "(max-width: 1060px) 100vw, 50vw",
  priority = false,
}: {
  src: string;
  alt: string;
  position?: string;
  height?: number;
  className?: string;
  style?: CSSProperties;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <div
      className={`ph${className ? ` ${className}` : ""}`}
      style={{ ...(height ? { height } : {}), ...style }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        style={{ objectFit: "cover", objectPosition: position }}
      />
    </div>
  );
}
