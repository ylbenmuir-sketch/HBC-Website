/**
 * The registered texting identity — what a carrier reviewer matches against
 * the A2P 10DLC brand record (CR2020). Read by the footer, /sms-terms and the
 * Organization schema. Server-side only: it reads lib/locations.ts. The
 * consent wording is lib/sms-consent.ts.
 *
 * The legal entity and DBA are as registered. The address is the SITE's —
 * Nashville's record in lib/locations.ts, Suite S included — read from there
 * rather than restated. The first filing omitted the suite; Ben settled it
 * (2026-10-14): the site is right, and the Dialpad brand record is being
 * corrected to match it, not the other way round. So there is one address,
 * and the footer, /sms-terms, the Organization schema and the location page
 * cannot disagree about it.
 */
import { PHONE } from "./site-config";
import { locations } from "./locations";
import { DBA_NAME } from "./sms-consent";

/** The registered legal entity. */
export const LEGAL_ENTITY = "Five Dog Enterprises Inc";

const nashville = locations.find((l) => l.slug === "nashville");
if (!nashville) throw new Error("lib/sms-identity.ts: no Nashville record in lib/locations.ts");

/**
 * The business address the texting registration names: Nashville's, from
 * lib/locations.ts ("197 Thompson Ln, Suite S, Nashville, TN 37211"). If it
 * ever moves, the Dialpad brand record has to be amended the same day.
 */
export const REGISTERED_ADDRESS = {
  street: nashville.address.streetAddress,
  locality: nashville.address.addressLocality,
  region: nashville.address.addressRegion,
  postalCode: nashville.address.postalCode,
} as const;

export const REGISTERED_ADDRESS_LINE = `${REGISTERED_ADDRESS.street}, ${REGISTERED_ADDRESS.locality}, ${REGISTERED_ADDRESS.region} ${REGISTERED_ADDRESS.postalCode}`;

/**
 * The registered support number. It is the practice's primary line (PHONE),
 * and it is read from there rather than restated so the two cannot drift —
 * but if PHONE ever changes, the registration has to be amended the same
 * day, or the support number on file stops answering.
 */
export const SUPPORT_PHONE = PHONE.value;

/** "Harmonized Brain Centers is a DBA of Five Dog Enterprises Inc." */
export const DBA_SENTENCE = `${DBA_NAME} is a DBA of ${LEGAL_ENTITY}.`;
