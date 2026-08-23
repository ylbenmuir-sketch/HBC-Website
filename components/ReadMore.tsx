import Link from "next/link";
import type { Resource } from "@/lib/resources";

/**
 * The bottom half of a cluster: links down from a concern page to the articles
 * that feed it, and across from an article to its siblings.
 *
 * Every article linked up to two destinations and nothing linked back, which
 * left the ten of them on one inbound link apiece, at depth 2, holding 0.49%
 * of the internal PageRank against 3.52% for every chrome-linked page — a 7.2x
 * deficit on exactly the pages doing the informational-query work
 * (SEO-AUDIT-2.md §4). This block is the return leg.
 *
 * Deliberately the same language as "Related concerns" directly above it on
 * the concern template: an eyebrow and a row of plain `.related` links, not a
 * card grid and not a CTA. It is a reading suggestion at the end of a page,
 * and it stays subordinate to the call band that follows it. The anchor is
 * each article's own headline — written to be read, descriptive, and never
 * "read more" — so the block earns its inbound links twice.
 */
export default function ReadMore({
  articles,
  eyebrow = "Read more",
  tone = "plain",
}: {
  articles: Resource[];
  eyebrow?: string;
  /** Which band colour to sit in, so the page keeps alternating. */
  tone?: "plain" | "ivory2";
}) {
  if (articles.length === 0) return null;
  return (
    <section className={tone === "ivory2" ? "sec sec-ivory2" : "sec"}>
      <div className="wrap" style={{ maxWidth: 900 }}>
        <div className="eyebrow">{eyebrow}</div>
        <div className="related">
          {articles.map((a) => (
            <Link key={a.slug} href={`/resources/${a.slug}`}>
              {a.title} <span className="arrow">&rarr;</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
