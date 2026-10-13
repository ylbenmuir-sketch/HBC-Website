import { formattedHours, getLocation, locations } from "@/lib/locations";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og/render";

/**
 * Per-center share card: the city as the eyebrow, the page's H1 as the
 * headline, the week's hours beneath, and the address on the foot. A
 * coming-soon center says so and carries no hours — the same gate the page
 * and the LocalBusiness node use. See lib/og/render.tsx.
 */
export const alt = "Harmonized Brain Centers";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return locations.map((l) => ({ slug: l.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const location = getLocation((await params).slug);
  if (!location) return renderOgCard({ eyebrow: "Locations", headline: "Harmonized Brain Centers" });
  const hours = formattedHours(location);
  return renderOgCard({
    eyebrow: location.hero.eyebrow,
    headline: `${location.hero.titleLead}${location.hero.titleAccent}${location.hero.titleTail}`,
    sub: location.comingSoon
      ? "Opening soon — Nashville and Murfreesboro are open now."
      : hours.join("  ·  "),
    foot: location.comingSoon
      ? `${location.name}, Tennessee`
      : `${location.address.addressLocality}, ${location.address.addressRegion}`,
  });
}
