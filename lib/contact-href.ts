/**
 * Where "Get Started" goes from a given page, for the links that are not
 * the page's own: the header button, the drawer's, and the phone action
 * bar's (Ben, 2026-11-21).
 *
 * Everywhere it is /contact. On /locations/franklin it is
 * /contact?center=nashville: Franklin is not open yet, Nashville is the
 * center that serves it (servingCenter() in lib/locations.ts, which the
 * page's own two buttons use), and four of that page's five "Get Started"
 * links used to drop the center. `npm run check:cta` opens the page and
 * fails if any "Get Started" on it lacks center=nashville, so this map and
 * servingCenter() cannot drift apart unnoticed.
 *
 * No imports, on purpose: the header is on every page, and this must not
 * pull the locations file into its bundle.
 */
const SERVED_BY: Record<string, string> = { franklin: "nashville" };

export function contactHrefFor(pathname: string | null | undefined): string {
  const slug = pathname?.match(/^\/locations\/([^/]+)\/?$/)?.[1];
  const center = slug ? SERVED_BY[slug] : undefined;
  return center ? `/contact?center=${center}` : "/contact";
}
