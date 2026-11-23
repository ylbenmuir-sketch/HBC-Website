import Link from "next/link";
import PhotoFrame from "./PhotoFrame";
import {
  formattedAddress,
  hoursSummary,
  locationPhone,
  type Location,
} from "@/lib/locations";

/**
 * A center's card on the homepage (Ben, 2026-11-22): the center's photo, its
 * address, hours and its own phone number as a call link, and a link to its
 * page. Every fact is read from lib/locations.ts through the same gated
 * readers the location page uses, so an unconfirmed address or number is
 * left off here exactly as it is there.
 *
 * The phone link reports contact_link_click with location "home_locations"
 * (lib/analytics.ts), from the `data-link-location` on the card.
 *
 * The link names its destination — "Explore the Nashville center" — for the
 * reason components/LocationCard.tsx gives: two identical anchors pointing
 * at two different pages read to a crawler as one repeated link.
 */
export default function HomeLocationCard({
  location,
  blurb,
}: {
  location: Location;
  /** The one descriptive line the homepage card already carried. */
  blurb: string;
}) {
  // The interior shot when there is one; otherwise the street photo, whose
  // alt already says what the building looks like (LocationCard's rule).
  const photo = location.image
    ? { ...location.image, alt: `${location.name} center` }
    : location.arrivalPhoto;
  const address = formattedAddress(location);
  const hours = hoursSummary(location);
  const phone = locationPhone(location);
  return (
    <div className="loc-card home-loc-card" data-link-location="home_locations">
      {photo && (
        <PhotoFrame
          src={photo.src}
          alt={photo.alt}
          position={photo.position}
          height={260}
          sizes="(max-width: 760px) 100vw, 50vw"
        />
      )}
      <div className="body">
        <h3>{location.name}</h3>
        <div className="city">{location.county}</div>
        <div className="meta">
          <b>Open &mdash; welcoming new clients</b>
          <br />
          {blurb}
          {address && (
            <>
              <br />
              {address}
            </>
          )}
          {hours && (
            <>
              <br />
              {hours}
            </>
          )}
        </div>
        {phone && (
          <a className="home-loc-tel" href={`tel:${phone.tel}`}>
            {phone.display}
          </a>
        )}
        <Link className="go" href={`/locations/${location.slug}`}>
          Explore the {location.name} center &rarr;
        </Link>
      </div>
    </div>
  );
}
