import Quote from "@/components/Quote";
import { getLocation } from "@/lib/locations";
import type { Testimonial } from "@/lib/site-config";

/**
 * A public Google review in the concern-page story slot (Ben, 2026-11-02):
 * the same `Quote` card the client stories use, labelled for what it is —
 * five gold stars (every review the site quotes is a five-star one), the
 * reviewer's display name, the center, and the words "Google review" — and,
 * under it, a small link to that center's Google listing. The link comes from
 * lib/locations.ts (`reviewReadUrl`); a center without one simply has no
 * link. Visible content only: no per-quote Review schema.
 */
export default function GoogleReviewQuote({ review }: { review: Testimonial }) {
  const location = review.center ? getLocation(review.center) : undefined;
  const name = [review.firstName, review.lastInitial].filter(Boolean).join(" ");
  const attribution = [name, location?.name, "Google review"]
    .filter(Boolean)
    .join(" · ");
  return (
    <div className="google-review">
      <Quote
        theme={review.theme}
        text={review.text}
        attribution={attribution}
        lead={
          <div className="google-review-stars" role="img" aria-label="Five stars">
            <span aria-hidden="true">★★★★★</span>
          </div>
        }
      />
      {location?.reviewReadUrl && (
        /* Same rel as the listing link on the location page: no noreferrer,
           so the Business Profile sees the traffic came from the site. */
        <a
          className="google-review-link"
          href={location.reviewReadUrl}
          target="_blank"
          rel="noopener"
        >
          Read more reviews on Google &rarr;
        </a>
      )}
    </div>
  );
}
