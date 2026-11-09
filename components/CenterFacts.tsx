import Link from "next/link";
import { Btn, TalkCta } from "@/components/Buttons";
import {
  type Location,
  formattedAddress,
  formattedHours,
  locationPhone,
  mapsUrl,
} from "@/lib/locations";

/**
 * One open center's practical facts, as a block (the local search pass, Ben,
 * 2026-11-09): the address, the week, where to park, a directions link, and
 * the three ways in — Get Started with the center preselected, Call, Text.
 *
 * Used where a page is about the service and still has to say where to get
 * it — /brain-map and /lens-neurofeedback show both open centers, the
 * Franklin page shows Nashville's (the center it sends people to). Every
 * line reads lib/locations.ts through the same gated helpers the location
 * page and the LocalBusiness markup use, so a block here cannot print an
 * address, an hour or a number that page would not.
 *
 * The directions link is `mapsUrl()` — Google's documented URL scheme built
 * from the confirmed address, the same URL the schema's `hasMap` carries —
 * rather than an embedded map: no third-party frame, no cookies before a
 * tap, nothing to load on a phone (the site's YouTube embeds make the same
 * trade). The Call and Text buttons carry `data-link-location` from the
 * caller, so contact_link_click (and the tap log) say which page they were on.
 */
export default function CenterFacts({
  location,
  linkLocation = "local_page",
  heading,
}: {
  location: Location;
  /** The contact_link_click location for the Call/Text buttons. */
  linkLocation?: string;
  /** Overrides "Our {name} center". */
  heading?: string;
}) {
  const address = formattedAddress(location);
  const hours = formattedHours(location);
  const phone = locationPhone(location);
  const directions = mapsUrl(location);
  return (
    <div className="center-facts" data-link-location={linkLocation}>
      <h3>{heading ?? `Our ${location.name} center`}</h3>
      <dl>
        {address && (
          <div>
            <dt>Address</dt>
            <dd>
              {location.address.streetAddress}
              <br />
              {location.address.addressLocality}, {location.address.addressRegion}{" "}
              {location.address.postalCode}
            </dd>
          </div>
        )}
        {hours.length > 0 && (
          <div>
            <dt>Hours</dt>
            <dd>
              {hours.map((l, i) => (
                <span key={l}>
                  {i > 0 && <br />}
                  {l}
                </span>
              ))}
            </dd>
          </div>
        )}
        <div>
          <dt>Parking</dt>
          <dd>{location.cardExtra}</dd>
        </div>
      </dl>
      <p className="center-facts-links">
        {directions && (
          <a href={directions} target="_blank" rel="noopener">
            Get directions &rarr;
          </a>
        )}
        <Link href={`/locations/${location.slug}`}>About the {location.name} center &rarr;</Link>
      </p>
      <div className="hero-ctas center-facts-ctas">
        <TalkCta href={`/contact?center=${location.slug}`} />
        {phone && (
          <>
            <Btn href={`tel:${phone.tel}`} variant="ghost">
              Call {phone.display}
            </Btn>
            <Btn href={`sms:${phone.tel}`} variant="ghost" external>
              Text {phone.display}
            </Btn>
          </>
        )}
      </div>
    </div>
  );
}
