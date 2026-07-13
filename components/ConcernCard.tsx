import Link from "next/link";

/** One cell of the bordered concern grid (homepage, adults page). */
export default function ConcernCard({
  title,
  audience,
  points,
  href,
}: {
  title: string;
  audience: string;
  points: string[];
  href: string;
}) {
  return (
    <div className="ccard rv">
      <h3>{title}</h3>
      <div className="aud">{audience}</div>
      <ul>
        {points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
      <Link href={href}>
        Read more <span className="arrow">→</span>
      </Link>
    </div>
  );
}
