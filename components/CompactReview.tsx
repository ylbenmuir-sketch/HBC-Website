import { getLocation } from "@/lib/locations";
import { reviewExcerpt } from "@/lib/review-excerpt";
import type { Testimonial } from "@/lib/site-config";

/**
 * The compact review at the top of a concern page (Ben, 2026-11-02): five
 * gold stars, the first one or two sentences of the page's own quote
 * (lib/review-excerpt.ts — exact words, cut at a sentence boundary, "…"
 * where it stops short), and one attribution line — "Name · Center · Google
 * review" for a Google review, "Name · Client story" for a permissioned
 * story. It sits directly under the H1 and the intro sentence, with Get
 * Started directly under it; the full card stays further down the page.
 * Visible content only: no Review schema.
 */
export default function CompactReview({ review }: { review: Testimonial }) {
  const isGoogle = review.source === "google";
  const location = isGoogle && review.center ? getLocation(review.center) : undefined;
  const name = [review.firstName, review.lastInitial].filter(Boolean).join(" ");
  const attribution = [name, location?.name, isGoogle ? "Google review" : "Client story"]
    .filter(Boolean)
    .join(" · ");
  return (
    <figure className="compact-review">
      <div className="google-review-stars" role="img" aria-label="Five stars">
        <span aria-hidden="true">★★★★★</span>
      </div>
      <blockquote>
        <p>&ldquo;{reviewExcerpt(review.text)}&rdquo;</p>
      </blockquote>
      <figcaption>&mdash; {attribution}</figcaption>
    </figure>
  );
}
