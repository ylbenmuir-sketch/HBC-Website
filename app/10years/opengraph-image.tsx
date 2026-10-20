import { OG_CONTENT_TYPE, OG_SIZE } from "@/lib/og/render";
import { renderTenYearsCard } from "@/lib/og/ten-years";

/** The /10years share card — lib/og/ten-years.tsx. Static at build; the page itself stays noindex. */
export const alt = "10 Years of Harmonized Brain Centers";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderTenYearsCard();
}
