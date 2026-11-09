/**
 * The contact form's fixed answers and its two reachability checks, shared by
 * the form (components/ContactForm.tsx), the two consultation routes and the
 * tests. No imports, on purpose: the form is a client component, and the
 * tests load this under plain `node`.
 *
 * The short step one (Ben, 2026-10-26): leads fell ~75% after launch, and
 * about three in four of the old site's leads were referrals who typed who
 * sent them. Step one is now first name, a phone OR an email, the center, and
 * two optional lines; everything else is an optional step two.
 */

/** "Best time" — a step-two answer. Nothing preselected. */
export const TIME_OPTIONS = ["Any time", "Mornings", "Afternoons", "Evenings"] as const;

/** "How did you hear about us?" — a step-two answer, saved to heard_about
 *  (migration 0012, which holds the column to this list). */
export const HEARD_ABOUT_OPTIONS = [
  "Google search",
  "Referral from a friend or family",
  "Referral from a doctor or provider",
  "Instagram",
  "Facebook",
  "TikTok",
  "Other",
] as const;
export type HeardAbout = (typeof HEARD_ABOUT_OPTIONS)[number];

export function isHeardAbout(value: unknown): value is HeardAbout {
  return typeof value === "string" && (HEARD_ABOUT_OPTIONS as readonly string[]).includes(value);
}

/** Either referral answer — the form then asks "Who referred you?" if step
 *  one's referral line was left blank. */
export function isReferral(value: unknown): boolean {
  return typeof value === "string" && value.startsWith("Referral");
}

/**
 * A US phone number typed any common way: "(615) 555-0134", "615.555.0134",
 * "615 555 0134", "6155550134", "1-615-555-0134", "+1 615 555 0134", with or
 * without an extension ("x12", "ext. 12"). Ten digits, or eleven with a
 * leading 1, before any extension. Deliberately forgiving: a form that
 * refuses a real number loses the lead.
 */
export function looksLikeUsPhone(value: string): boolean {
  const main = value.split(/\s*(?:x|ext\.?|extension|#)\s*\d*\s*$/i)[0];
  if (/[^\d\s().+\-]/.test(main)) return false;
  const digits = main.replace(/\D/g, "");
  return digits.length === 10 || (digits.length === 11 && digits.startsWith("1"));
}

/**
 * Every area code in service in the US and its territories (PR 787/939, VI
 * 340, GU 671, AS 684, MP 670), toll-free included. Generated 2026-11-08
 * from libphonenumber-js 1.13.15's "max" metadata (Google's libphonenumber,
 * October 2026): each NPA 200–999 was tried as +1 NPA-xxx-4567 against
 * several exchanges and kept when the number parsed as valid for a US
 * region. Then removed by hand: 900 (premium-rate) and the non-geographic
 * 5XX "personal communications" codes (500, 521–529, 532, 533, 544, 566,
 * 577, 588), which no visitor's own phone has.
 *
 * Why a list and not the NANP shape rules alone: the spam that started
 * 2026-11-08 used numbers like 991-…, and random area codes pass the shape
 * rules about half the time; this list refuses about 60% of them. The cost
 * is staleness — a brand-new overlay is refused until it is added here. The
 * form's message tells that visitor to leave the phone blank and use email,
 * so the lead is not lost; add the code here when NANPA puts one in service
 * (nationalnanpa.com → "Planning Letters").
 */
export const US_AREA_CODES: ReadonlySet<number> = new Set([
  201, 202, 203, 205, 206, 207, 208, 209, 210, 212, 213, 214, 215, 216, 217, 218, 219, 220, 223, 224,
  225, 227, 228, 229, 231, 234, 235, 239, 240, 248, 251, 252, 253, 254, 256, 260, 262, 267, 269, 270,
  272, 274, 276, 279, 281, 283, 301, 302, 303, 304, 305, 307, 308, 309, 310, 312, 313, 314, 315, 316,
  317, 318, 319, 320, 321, 323, 324, 325, 326, 327, 329, 330, 331, 332, 334, 336, 337, 339, 340, 341,
  346, 347, 350, 351, 352, 353, 360, 361, 363, 364, 369, 380, 385, 386, 401, 402, 404, 405, 406, 407,
  408, 409, 410, 412, 413, 414, 415, 417, 419, 423, 424, 425, 430, 432, 434, 435, 440, 442, 443, 445,
  447, 448, 458, 463, 464, 469, 470, 472, 475, 478, 479, 480, 484, 501, 502, 503, 504, 505, 507, 508,
  509, 510, 512, 513, 515, 516, 517, 518, 520, 530, 531, 534, 539, 540, 541, 551, 557, 559, 561, 562,
  563, 564, 567, 570, 571, 572, 573, 574, 575, 580, 582, 585, 586, 601, 602, 603, 605, 606, 607, 608,
  609, 610, 612, 614, 615, 616, 617, 618, 619, 620, 623, 626, 628, 629, 630, 631, 636, 640, 641, 645,
  646, 650, 651, 656, 657, 659, 660, 661, 662, 667, 669, 670, 671, 678, 680, 681, 682, 684, 686, 689,
  701, 702, 703, 704, 706, 707, 708, 712, 713, 714, 715, 716, 717, 718, 719, 720, 724, 725, 726, 727,
  728, 730, 731, 732, 734, 737, 738, 740, 743, 747, 748, 754, 757, 760, 762, 763, 765, 769, 770, 771,
  772, 773, 774, 775, 779, 781, 785, 786, 787, 800, 801, 802, 803, 804, 805, 806, 808, 810, 812, 813,
  814, 815, 816, 817, 818, 820, 821, 826, 828, 830, 831, 832, 833, 835, 838, 839, 840, 843, 844, 845,
  847, 848, 850, 854, 855, 856, 857, 858, 859, 860, 862, 863, 864, 865, 866, 870, 872, 877, 878, 888,
  901, 903, 904, 906, 907, 908, 909, 910, 912, 913, 914, 915, 916, 917, 918, 919, 920, 925, 928, 929,
  930, 931, 934, 936, 937, 938, 939, 940, 941, 943, 945, 947, 948, 949, 951, 952, 954, 956, 959, 970,
  971, 972, 973, 975, 978, 979, 980, 983, 984, 985, 986, 989,
]);

/**
 * A real US number: written like one (looksLikeUsPhone), an area code in
 * service (US_AREA_CODES), and an exchange that can be dialled — it cannot
 * start with 0 or 1, and cannot be a service code like 411 or 911. The
 * form and the route both hold a typed phone to this; a blank phone is not
 * this function's business (phone OR email is the rule).
 */
export function isUsPhone(value: string): boolean {
  if (!looksLikeUsPhone(value)) return false;
  const main = value.split(/\s*(?:x|ext\.?|extension|#)\s*\d*\s*$/i)[0];
  const ten = main.replace(/\D/g, "").slice(-10);
  const area = Number(ten.slice(0, 3));
  const exchange = ten.slice(3, 6);
  if (!US_AREA_CODES.has(area)) return false;
  if (exchange[0] === "0" || exchange[0] === "1") return false;
  if (exchange[1] === "1" && exchange[2] === "1") return false;
  return true;
}

/** Deliberately loose — a sanity check, not RFC 5322. The address is proven by
 *  delivery, not by a regex, and over-strict patterns reject valid addresses. */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
