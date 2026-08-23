import Link from "next/link";

/**
 * One cell of the bordered concern grid (homepage, adults page).
 *
 * The whole card is the link — there is no separate "Read more" affordance,
 * because a card with one destination shouldn't make you aim at four words of
 * it. The heading stays inside the anchor, so the page outline and the link
 * text a screen reader announces are both intact.
 *
 * `fill` marks the card that closes a grid whose count doesn't fill its last
 * row: it spans the remaining columns instead of leaving three empty cells and
 * a stub border beside it. "narrow" is the same thing scoped below 1060px, for
 * a grid that fills its desktop row exactly and only goes ragged once the
 * columns drop to two. See `.ccard-fill` in globals.css for the seam rules
 * that travel with it.
 *
 * `headingLevel` exists because the homepage now nests these grids under
 * audience group headings (themselves h3s) — the cards drop to h4 there so the
 * outline nests instead of flattening. /adults sits directly under an h2 and
 * keeps the default. Both levels render identically (see .ccard in globals.css).
 */
export default function ConcernCard({
  title,
  points,
  href,
  headingLevel = 3,
  fill,
}: {
  title: string;
  points: string[];
  href: string;
  headingLevel?: 3 | 4;
  fill?: "always" | "narrow";
}) {
  const Heading = `h${headingLevel}` as "h3" | "h4";
  const fillClass =
    fill === "always" ? " ccard-fill" : fill === "narrow" ? " ccard-fill-sm" : "";
  return (
    <Link className={`ccard rv${fillClass}`} href={href}>
      <Heading>{title}</Heading>
      <ul>
        {points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </Link>
  );
}
