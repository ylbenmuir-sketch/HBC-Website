import { concerns, getConcern } from "@/lib/concerns";
import { OG_CONTENT_TYPE, OG_SIZE, renderOgCard } from "@/lib/og/render";

/**
 * Per-concern share card: the title that ranks ("Neurofeedback for Sleep in
 * Nashville & Murfreesboro, TN") as the eyebrow's category line, the page's
 * own headline as the headline, the hero sub beneath. Generated at build
 * for all eleven — see lib/og/render.tsx.
 */
export const alt = "Harmonized Brain Centers";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return concerns.map((c) => ({ slug: c.slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const concern = getConcern((await params).slug);
  if (!concern) return renderOgCard({ eyebrow: "What we help with", headline: "Harmonized Brain Centers" });
  // The metaTitle up to the geography — "Neurofeedback for Sleep" — is the
  // category line; the cities are on the card's foot already.
  const eyebrow = concern.metaTitle.replace(/(?: in |, )(?:Nashville|Middle).*$/, "");
  return renderOgCard({
    eyebrow,
    headline: `${concern.titleLead}${concern.titleAccent}`,
    sub: concern.heroSub,
  });
}
