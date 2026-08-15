import Link from "next/link";

/**
 * One cell of the bordered concern grid (homepage, adults page).
 *
 * The whole card is the link — there is no separate "Read more" affordance,
 * because a card with one destination shouldn't make you aim at four words of
 * it. The heading stays an <h3> inside the anchor, so the page outline and the
 * link text a screen reader announces are both intact.
 */
export default function ConcernCard({
  title,
  points,
  href,
}: {
  title: string;
  points: string[];
  href: string;
}) {
  return (
    <Link className="ccard rv" href={href}>
      <h3>{title}</h3>
      <ul>
        {points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </Link>
  );
}
