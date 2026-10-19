/**
 * ZIP → Tennessee? city? nearer center? (GIVEAWAY-PLAN.md §4; decisions 9,
 * 12). Five digits are collected at entry; this answers the three questions
 * the giveaway asks of them, with no network.
 *
 * - **Tennessee:** 37010–38589 is the state's range (USPS). Anything else
 *   gets the polite "this one's for Tennessee residents" message.
 * - **City** (for the public winner line, "Jane D., Franklin"): a table of
 *   the Middle Tennessee ZIPs the centers draw from, then the state's metro
 *   prefixes, then null (the label falls back to "Tennessee").
 * - **Nearer center** (for routing an offer booking): Rutherford County and
 *   everything south-east along I-24 → Murfreesboro; the rest of Middle and
 *   West Tennessee → Nashville; East Tennessee → Murfreesboro (it is the
 *   nearer of the two by road). My call where a ZIP sits between the two
 *   (Nolensville, College Grove, Lebanon → Nashville) — Ben can move a ZIP
 *   in the table. Unknown → null → today's fallback route.
 */

export type Center = "nashville" | "murfreesboro";

export const TN_ZIP_MIN = 37010;
export const TN_ZIP_MAX = 38589;

export function isFiveDigitZip(value: string): boolean {
  return /^\d{5}$/.test(value.trim());
}

export function isTennesseeZip(zip: string): boolean {
  if (!isFiveDigitZip(zip)) return false;
  const n = Number(zip);
  return n >= TN_ZIP_MIN && n <= TN_ZIP_MAX;
}

/** Exact ZIPs around the two centers. [zip, city, center]. */
const EXACT: Array<[string, string, Center]> = [
  // Rutherford County and neighbours → Murfreesboro
  ["37127", "Murfreesboro", "murfreesboro"],
  ["37128", "Murfreesboro", "murfreesboro"],
  ["37129", "Murfreesboro", "murfreesboro"],
  ["37130", "Murfreesboro", "murfreesboro"],
  ["37131", "Murfreesboro", "murfreesboro"],
  ["37132", "Murfreesboro", "murfreesboro"],
  ["37133", "Murfreesboro", "murfreesboro"],
  ["37167", "Smyrna", "murfreesboro"],
  ["37086", "La Vergne", "murfreesboro"],
  ["37037", "Christiana", "murfreesboro"],
  ["37153", "Rockvale", "murfreesboro"],
  ["37085", "Lascassas", "murfreesboro"],
  ["37118", "Milton", "murfreesboro"],
  ["37149", "Readyville", "murfreesboro"],
  ["37190", "Woodbury", "murfreesboro"],
  ["37160", "Shelbyville", "murfreesboro"],
  ["37020", "Bell Buckle", "murfreesboro"],
  ["37180", "Unionville", "murfreesboro"],
  ["37355", "Manchester", "murfreesboro"],
  ["37388", "Tullahoma", "murfreesboro"],
  ["37110", "McMinnville", "murfreesboro"],
  ["37016", "Auburntown", "murfreesboro"],
  ["37026", "Bradyville", "murfreesboro"],
  // Williamson County → Nashville
  ["37064", "Franklin", "nashville"],
  ["37065", "Franklin", "nashville"],
  ["37067", "Franklin", "nashville"],
  ["37068", "Franklin", "nashville"],
  ["37069", "Franklin", "nashville"],
  ["37027", "Brentwood", "nashville"],
  ["37135", "Nolensville", "nashville"],
  ["37179", "Thompson's Station", "nashville"],
  ["37174", "Spring Hill", "nashville"],
  ["37046", "College Grove", "nashville"],
  ["37014", "Arrington", "nashville"],
  ["37062", "Fairview", "nashville"],
  // Davidson County and the ring → Nashville
  ["37013", "Antioch", "nashville"],
  ["37072", "Goodlettsville", "nashville"],
  ["37075", "Hendersonville", "nashville"],
  ["37077", "Hendersonville", "nashville"],
  ["37076", "Hermitage", "nashville"],
  ["37115", "Madison", "nashville"],
  ["37138", "Old Hickory", "nashville"],
  ["37122", "Mt. Juliet", "nashville"],
  ["37087", "Lebanon", "nashville"],
  ["37090", "Lebanon", "nashville"],
  ["37066", "Gallatin", "nashville"],
  ["37221", "Bellevue", "nashville"],
  ["37189", "Whites Creek", "nashville"],
  ["37080", "Joelton", "nashville"],
  ["37015", "Ashland City", "nashville"],
  ["37055", "Dickson", "nashville"],
  ["37143", "Pegram", "nashville"],
  ["37082", "Kingston Springs", "nashville"],
  ["37146", "Pleasant View", "nashville"],
  ["37040", "Clarksville", "nashville"],
  ["37042", "Clarksville", "nashville"],
  ["37043", "Clarksville", "nashville"],
  ["38401", "Columbia", "nashville"],
  ["37172", "Springfield", "nashville"],
  ["37148", "Portland", "nashville"],
  ["37188", "White House", "nashville"],
];
const EXACT_MAP = new Map(EXACT.map(([zip, city, center]) => [zip, { city, center }]));

/** Metro prefixes for the city label when the exact ZIP is not listed. */
const PREFIX_CITY: Array<[string, string, Center]> = [
  ["372", "Nashville", "nashville"],
  ["373", "Chattanooga", "murfreesboro"],
  ["374", "Chattanooga", "murfreesboro"],
  ["376", "Johnson City", "murfreesboro"],
  ["377", "Kingsport", "murfreesboro"],
  ["378", "Knoxville", "murfreesboro"],
  ["379", "Knoxville", "murfreesboro"],
  ["380", "Memphis", "nashville"],
  ["381", "Memphis", "nashville"],
  ["383", "Jackson", "nashville"],
];

export type ZipInfo = {
  zip: string;
  tennessee: boolean;
  city: string | null;
  nearestCenter: Center | null;
};

export function zipInfo(value: string): ZipInfo {
  const zip = value.trim();
  if (!isTennesseeZip(zip)) return { zip, tennessee: false, city: null, nearestCenter: null };
  const exact = EXACT_MAP.get(zip);
  if (exact) return { zip, tennessee: true, city: exact.city, nearestCenter: exact.center };
  const prefix = PREFIX_CITY.find(([p]) => zip.startsWith(p));
  if (prefix) return { zip, tennessee: true, city: prefix[1], nearestCenter: prefix[2] };
  // Middle/West Tennessee without a listed city: Nashville is the nearer
  // center; East Tennessee (375–379, caught above) is Murfreesboro.
  const n = Number(zip);
  const center: Center = n >= 37300 && n <= 37999 ? "murfreesboro" : "nashville";
  return { zip, tennessee: true, city: null, nearestCenter: center };
}

/** "Jane D., Franklin" — the public winner line. City falls back to the state. */
export function publicLabel(firstName: string, lastName: string, city: string | null): string {
  const initial = lastName.trim().charAt(0).toUpperCase();
  return `${firstName.trim()}${initial ? ` ${initial}.` : ""}, ${city ?? "Tennessee"}`;
}
