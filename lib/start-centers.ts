import { getLocation, locationPhone } from "./locations";
import { PHONE_DISPLAY, PHONE_TEL } from "./site-config";
import { START_CENTER_NOTE } from "./start";
import type { StartCenterSlug } from "./start-center";

/**
 * The two open centers' phone and street line for /start (Ben, 2026-11-11),
 * read from the same records every other page reads (lib/locations.ts) and
 * handed to the client pieces as plain props, so the location content itself
 * never enters a client bundle. Server-side only.
 */
export type StartCenterInfo = { name: string; phone: { display: string; tel: string }; addressLine: string };

function info(slug: StartCenterSlug): StartCenterInfo {
  const l = getLocation(slug);
  const phone = (l && locationPhone(l)) || { display: PHONE_DISPLAY, tel: PHONE_TEL };
  const street = l ? `${l.address.streetAddress}, ${l.address.addressLocality}` : "";
  const note = START_CENTER_NOTE[slug];
  return { name: l?.name ?? "", phone, addressLine: note ? `${street} · ${note}` : street };
}

export function startCenters(): Record<StartCenterSlug, StartCenterInfo> {
  return { nashville: info("nashville"), murfreesboro: info("murfreesboro") };
}
