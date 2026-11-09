import type { Metadata } from "next";
import ReviewLinkButton from "@/components/ReviewLinkButton";
import { REVIEW_CENTERS, type ReviewCenter } from "@/lib/analytics";
import { getLocation } from "@/lib/locations";
import { SITE_NAME } from "@/lib/site-config";

/**
 * /review — the page staff text a client after a visit (Ben, 2026-11-09;
 * Murfreesboro had 16 Google reviews to Nashville's 145). One question,
 * "How was your experience?", and a button per center that opens that
 * center's Google "write a review" page — `reviewWriteUrl` in
 * lib/locations.ts, the only place on the site that link renders (see the
 * note on the type). `/review?center=murfreesboro` skips the choice and
 * shows that center's button alone, so the text can carry the right link.
 *
 * What it deliberately is not: there is no rating shown, no incentive, no
 * "were you happy?" step ahead of the button. Every client is asked the same
 * way and sent to the same public form — filtering happy from unhappy
 * clients before asking is review gating, which Google's policy forbids.
 *
 * Hidden from search four ways: noindex here and by header
 * (next.config.ts), absent from the sitemap (not in lib/pages.ts), and in
 * no menu or footer. It is not disallowed in robots.txt: a disallow would
 * hide the noindex from the one crawler that already has the URL (the
 * /unsubscribe reasoning). GA stays on, for review_link_click. No JSON-LD:
 * the page is not indexable and claims nothing. The phone action bar and
 * the assistant stay off it (lib/site-config.ts).
 */
export const metadata: Metadata = {
  title: "How was your experience?",
  description: `Leave ${SITE_NAME} a Google review.`,
  robots: { index: false, follow: false, nocache: true },
};

/** Read per request, so `?center=` works. */
export const dynamic = "force-dynamic";

function isReviewCenter(value: string | undefined): value is ReviewCenter {
  return typeof value === "string" && (REVIEW_CENTERS as readonly string[]).includes(value);
}

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ center?: string | string[] }>;
}) {
  const raw = (await searchParams).center;
  const requested = (Array.isArray(raw) ? raw[0] : raw)?.trim().toLowerCase();
  const chosen = isReviewCenter(requested) ? requested : null;
  // Each center's own write link, from its record; a center without one has
  // no button, and a page with no buttons at all says so plainly.
  const buttons = (chosen ? [chosen] : [...REVIEW_CENTERS]).flatMap((slug) => {
    const location = getLocation(slug);
    return location?.reviewWriteUrl ? [{ slug, name: location.name, href: location.reviewWriteUrl }] : [];
  });

  return (
    <section className="page-hero center review-page">
      <div className="wrap rv">
        <div className="eyebrow">{SITE_NAME}</div>
        <h1>How was your experience?</h1>
        <p className="sub" style={{ maxWidth: "48ch" }}>
          {chosen
            ? "A Google review takes a minute, and it helps the next family find us. Thank you."
            : "A Google review takes a minute, and it helps the next family find us. Choose the center you visited."}
        </p>
        {buttons.length > 0 ? (
          <div className="review-buttons">
            {buttons.map((b) => (
              <ReviewLinkButton key={b.slug} href={b.href} center={b.slug}>
                {chosen ? "Leave a Google review" : b.name}
              </ReviewLinkButton>
            ))}
          </div>
        ) : (
          <p className="sub">Reviews for this center are not open yet.</p>
        )}
        {chosen && <p className="micro">Our {buttons[0]?.name ?? ""} center</p>}
      </div>
    </section>
  );
}
