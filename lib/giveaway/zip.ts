/**
 * ZIP → eligible? which state? city? nearer center? (GIVEAWAY-PLAN.md §4;
 * decisions 9, 12; Ben, 2026-10-19: open to Tennessee and its bordering
 * states). Five digits are collected at entry; this answers the questions
 * the giveaway asks of them, with no network.
 *
 * - **State:** the USPS three-digit prefix ranges of the nine states in
 *   ELIGIBLE_STATES (lib/giveaway/config.ts). A ZIP outside them gets the
 *   polite "neighbors within driving distance" message.
 * - **City** (for the public winner line, "Jane D., Franklin"): a table of
 *   the Middle Tennessee ZIPs the centers draw from, then the metro
 *   prefixes of all nine states, then null (the label falls back to the
 *   state's name).
 * - **Nearer center** (for routing an offer booking): Rutherford County and
 *   everything south-east along I-24 → Murfreesboro; the rest of Middle and
 *   West Tennessee → Nashville; East Tennessee → Murfreesboro (the nearer
 *   of the two by road). Out of state, by the road in: Kentucky, Missouri,
 *   Arkansas and Mississippi arrive by I-65, I-24 or I-40 from the north
 *   and west → Nashville; Alabama and Georgia by I-65 and I-24 from the
 *   south → Murfreesboro; the Carolinas and Virginia by I-40 and I-81
 *   through East Tennessee → Murfreesboro. My calls where a ZIP sits
 *   between the two (Nolensville, College Grove, Lebanon → Nashville) —
 *   Ben can move a ZIP in the table. Unknown → null → today's fallback.
 */

import { ELIGIBLE_STATES, eligibleStateName, isEligibleStateCode, type EligibleStateCode } from "./config";

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

/**
 * The USPS three-digit prefix ranges of the nine states, inclusive. A
 * prefix belongs to one state; the five-digit ranges inside are not
 * checked (a prefix with no assigned ZIPs just fails to arrive).
 */
const STATE_PREFIXES: Array<[from: number, to: number, state: EligibleStateCode]> = [
  [370, 385, "TN"],
  [400, 427, "KY"],
  [201, 201, "VA"],
  [220, 246, "VA"],
  [270, 289, "NC"],
  [300, 319, "GA"],
  [398, 399, "GA"],
  [350, 369, "AL"],
  [386, 397, "MS"],
  [716, 729, "AR"],
  [630, 658, "MO"],
];

/** The state a five-digit ZIP belongs to, or null outside the nine. */
export function stateOfZip(zip: string): EligibleStateCode | null {
  if (!isFiveDigitZip(zip)) return null;
  const n = Number(zip);
  // Tennessee's exact five-digit range (USPS), ahead of the prefix table.
  if (n >= TN_ZIP_MIN && n <= TN_ZIP_MAX) return "TN";
  const prefix = Math.floor(n / 100);
  const hit = STATE_PREFIXES.find(([from, to]) => prefix >= from && prefix <= to);
  return hit ? hit[2] : null;
}

/** True for a ZIP in one of ELIGIBLE_STATES. */
export function isEligibleZip(zip: string): boolean {
  return isEligibleStateCode(stateOfZip(zip));
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

/** Metro prefixes for the city label when the exact ZIP is not listed.
 *  [prefix, city, center]; the center is the nearer one by road. */
const PREFIX_CITY: Array<[string, string, Center]> = [
  // Tennessee
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
  // Kentucky
  ["400", "Louisville", "nashville"],
  ["401", "Louisville", "nashville"],
  ["402", "Louisville", "nashville"],
  ["403", "Lexington", "nashville"],
  ["404", "Lexington", "nashville"],
  ["405", "Lexington", "nashville"],
  ["410", "Covington", "nashville"],
  ["411", "Covington", "nashville"],
  ["420", "Paducah", "nashville"],
  ["421", "Bowling Green", "nashville"],
  ["423", "Owensboro", "nashville"],
  // Virginia
  ["201", "Northern Virginia", "murfreesboro"],
  ["220", "Fairfax", "murfreesboro"],
  ["221", "Fairfax", "murfreesboro"],
  ["222", "Arlington", "murfreesboro"],
  ["223", "Alexandria", "murfreesboro"],
  ["224", "Fredericksburg", "murfreesboro"],
  ["226", "Winchester", "murfreesboro"],
  ["228", "Harrisonburg", "murfreesboro"],
  ["229", "Charlottesville", "murfreesboro"],
  ["230", "Richmond", "murfreesboro"],
  ["231", "Richmond", "murfreesboro"],
  ["232", "Richmond", "murfreesboro"],
  ["233", "Norfolk", "murfreesboro"],
  ["234", "Norfolk", "murfreesboro"],
  ["235", "Norfolk", "murfreesboro"],
  ["236", "Newport News", "murfreesboro"],
  ["237", "Portsmouth", "murfreesboro"],
  ["238", "Petersburg", "murfreesboro"],
  ["240", "Roanoke", "murfreesboro"],
  ["241", "Roanoke", "murfreesboro"],
  ["242", "Bristol", "murfreesboro"],
  ["243", "Bristol", "murfreesboro"],
  ["244", "Staunton", "murfreesboro"],
  ["245", "Lynchburg", "murfreesboro"],
  ["246", "Bluefield", "murfreesboro"],
  // North Carolina
  ["270", "Winston-Salem", "murfreesboro"],
  ["271", "Winston-Salem", "murfreesboro"],
  ["272", "Greensboro", "murfreesboro"],
  ["273", "Greensboro", "murfreesboro"],
  ["274", "Greensboro", "murfreesboro"],
  ["275", "Raleigh", "murfreesboro"],
  ["276", "Raleigh", "murfreesboro"],
  ["277", "Durham", "murfreesboro"],
  ["278", "Rocky Mount", "murfreesboro"],
  ["280", "Charlotte", "murfreesboro"],
  ["281", "Charlotte", "murfreesboro"],
  ["282", "Charlotte", "murfreesboro"],
  ["283", "Fayetteville", "murfreesboro"],
  ["284", "Wilmington", "murfreesboro"],
  ["286", "Hickory", "murfreesboro"],
  ["287", "Asheville", "murfreesboro"],
  ["288", "Asheville", "murfreesboro"],
  ["289", "Murphy", "murfreesboro"],
  // Georgia
  ["300", "Atlanta", "murfreesboro"],
  ["301", "Atlanta", "murfreesboro"],
  ["302", "Atlanta", "murfreesboro"],
  ["303", "Atlanta", "murfreesboro"],
  ["306", "Athens", "murfreesboro"],
  ["307", "Dalton", "murfreesboro"],
  ["311", "Atlanta", "murfreesboro"],
  ["312", "Macon", "murfreesboro"],
  ["313", "Savannah", "murfreesboro"],
  ["314", "Savannah", "murfreesboro"],
  ["318", "Columbus", "murfreesboro"],
  ["319", "Columbus", "murfreesboro"],
  // Alabama
  ["350", "Birmingham", "murfreesboro"],
  ["351", "Birmingham", "murfreesboro"],
  ["352", "Birmingham", "murfreesboro"],
  ["354", "Tuscaloosa", "murfreesboro"],
  ["356", "Decatur", "murfreesboro"],
  ["357", "Huntsville", "murfreesboro"],
  ["358", "Huntsville", "murfreesboro"],
  ["360", "Montgomery", "murfreesboro"],
  ["361", "Montgomery", "murfreesboro"],
  ["365", "Mobile", "murfreesboro"],
  ["366", "Mobile", "murfreesboro"],
  // Mississippi
  ["386", "Southaven", "nashville"],
  ["387", "Greenville", "nashville"],
  ["388", "Tupelo", "nashville"],
  ["390", "Jackson", "nashville"],
  ["391", "Jackson", "nashville"],
  ["392", "Jackson", "nashville"],
  ["393", "Meridian", "nashville"],
  ["394", "Hattiesburg", "nashville"],
  ["395", "Gulfport", "nashville"],
  // Arkansas
  ["716", "Pine Bluff", "nashville"],
  ["718", "Texarkana", "nashville"],
  ["719", "Hot Springs", "nashville"],
  ["720", "Little Rock", "nashville"],
  ["721", "Little Rock", "nashville"],
  ["722", "Little Rock", "nashville"],
  ["723", "West Memphis", "nashville"],
  ["724", "Jonesboro", "nashville"],
  ["727", "Fayetteville", "nashville"],
  ["729", "Fort Smith", "nashville"],
  // Missouri
  ["630", "St. Louis", "nashville"],
  ["631", "St. Louis", "nashville"],
  ["633", "St. Charles", "nashville"],
  ["636", "Cape Girardeau", "nashville"],
  ["638", "Sikeston", "nashville"],
  ["639", "Poplar Bluff", "nashville"],
  ["640", "Kansas City", "nashville"],
  ["641", "Kansas City", "nashville"],
  ["644", "St. Joseph", "nashville"],
  ["651", "Jefferson City", "nashville"],
  ["652", "Columbia", "nashville"],
  ["656", "Springfield", "nashville"],
  ["657", "Springfield", "nashville"],
  ["658", "Springfield", "nashville"],
];

/** The nearer center for a state with no listed city, by the road in. */
const STATE_CENTER: Record<EligibleStateCode, Center> = {
  TN: "nashville",
  KY: "nashville",
  MO: "nashville",
  AR: "nashville",
  MS: "nashville",
  AL: "murfreesboro",
  GA: "murfreesboro",
  NC: "murfreesboro",
  VA: "murfreesboro",
};

export type ZipInfo = {
  zip: string;
  /** In one of ELIGIBLE_STATES. */
  eligible: boolean;
  state: EligibleStateCode | null;
  city: string | null;
  nearestCenter: Center | null;
};

export function zipInfo(value: string): ZipInfo {
  const zip = value.trim();
  const state = stateOfZip(zip);
  if (!state) return { zip, eligible: false, state: null, city: null, nearestCenter: null };
  const exact = EXACT_MAP.get(zip);
  if (exact) return { zip, eligible: true, state, city: exact.city, nearestCenter: exact.center };
  const prefix = PREFIX_CITY.find(([p]) => zip.startsWith(p));
  if (prefix) return { zip, eligible: true, state, city: prefix[1], nearestCenter: prefix[2] };
  // Tennessee without a listed city: Middle/West → Nashville; East (375–379,
  // mostly caught above) → Murfreesboro. Other states: by the road in.
  const n = Number(zip);
  const center: Center = state === "TN" ? (n >= 37300 && n <= 37999 ? "murfreesboro" : "nashville") : STATE_CENTER[state];
  return { zip, eligible: true, state, city: null, nearestCenter: center };
}

/** "Jane D., Franklin" — the public winner line. City falls back to the
 *  state's name (from the ZIP), then to Tennessee. */
export function publicLabel(firstName: string, lastName: string, city: string | null, zip?: string | null): string {
  const initial = lastName.trim().charAt(0).toUpperCase();
  const state = zip ? stateOfZip(zip) : null;
  const place = city ?? (state ? eligibleStateName(state) : ELIGIBLE_STATES[0].name);
  return `${firstName.trim()}${initial ? ` ${initial}.` : ""}, ${place}`;
}
