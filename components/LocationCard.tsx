import Link from "next/link";
import type { ReactNode } from "react";
import PhotoFrame from "./PhotoFrame";
import PlaceholderPlate from "./PlaceholderPlate";
import type { Location } from "@/lib/locations";

/**
 * Location card for grids (homepage + locations index).
 *
 * `headingLevel` for the reason ConcernCard has one: on /locations this grid
 * *is* the page body, sitting directly under the h1 with no section heading
 * between, so each card is a top-level section and an h3 there was a skipped
 * level. On the homepage the same card sits under an h2 and stays an h3. Both
 * render identically — see `.loc-card h3, .loc-card h2` in globals.css.
 */
export default function LocationCard({
  location,
  meta,
  imageHeight = 240,
  plateSpecOverride,
  headingLevel = 3,
}: {
  location: Location;
  /** Card meta lines — content differs slightly between homepage and index. */
  meta: ReactNode;
  imageHeight?: number;
  /** The mockups word the photography specs differently per page. */
  plateSpecOverride?: string;
  headingLevel?: 2 | 3;
}) {
  const Heading = `h${headingLevel}` as "h2" | "h3";
  /**
   * The anchor names the destination.
   *
   * "Explore this location →" appeared three times, pointing at the two
   * highest-value local pages on the site, and was the only anchor in `<main>`
   * that said nothing about where it went (SEO-AUDIT-2.md §2.5). Three
   * identical anchors for three different URLs is also the shape a crawler
   * reads as one repeated link rather than three destinations.
   *
   * The waitlist label was already descriptive and is unchanged.
   */
  const go = location.comingSoon
    ? { href: "/contact", label: "Join the Franklin waitlist →" }
    : {
        href: `/locations/${location.slug}`,
        label: `About the ${location.name} center →`,
      };

  return (
    <div className="loc-card">
      {location.image ? (
        <PhotoFrame
          src={location.image.src}
          alt={`${location.name} center`}
          position={location.image.position}
          height={imageHeight}
          sizes="(max-width: 640px) 100vw, (max-width: 1060px) 50vw, 33vw"
        />
      ) : (
        <PlaceholderPlate
          spec={plateSpecOverride ?? location.plateSpec ?? ""}
          height={imageHeight}
        />
      )}
      <div className="body">
        <Heading>
          {location.name}
          {location.comingSoon && <span className="soon">Coming soon</span>}
        </Heading>
        <div className="city">{location.county}</div>
        <div className="meta">{meta}</div>
        <Link className="go" href={go.href}>
          {go.label}
        </Link>
      </div>
    </div>
  );
}
