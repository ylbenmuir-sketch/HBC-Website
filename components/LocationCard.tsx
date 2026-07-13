import Link from "next/link";
import type { ReactNode } from "react";
import PhotoFrame from "./PhotoFrame";
import PlaceholderPlate from "./PlaceholderPlate";
import type { Location } from "@/lib/locations";

/** Location card for grids (homepage + locations index). */
export default function LocationCard({
  location,
  meta,
  imageHeight = 240,
}: {
  location: Location;
  /** Card meta lines — content differs slightly between homepage and index. */
  meta: ReactNode;
  imageHeight?: number;
}) {
  const go = location.comingSoon
    ? { href: "/contact", label: "Join the Franklin waitlist →" }
    : { href: `/locations/${location.slug}`, label: "Explore this location →" };

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
        <PlaceholderPlate spec={location.plateSpec ?? ""} height={imageHeight} />
      )}
      <div className="body">
        <h3>
          {location.name}
          {location.comingSoon && <span className="soon">Coming soon</span>}
        </h3>
        <div className="city">{location.county}</div>
        <div className="meta">{meta}</div>
        <Link className="go" href={go.href}>
          {go.label}
        </Link>
      </div>
    </div>
  );
}
