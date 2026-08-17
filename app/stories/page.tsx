import type { Metadata } from "next";
import PhotoFrame from "@/components/PhotoFrame";
import Quote from "@/components/Quote";
import FinalCTA from "@/components/FinalCTA";
import { Btn } from "@/components/Buttons";
import ConfirmTag from "@/components/ConfirmTag";
import { combinedReviewCount, reviewCountLabel } from "@/lib/locations";
import {
  EXPERIENCES_DISCLAIMER,
  REVIEWS,
  VERIFIED_TESTIMONIALS,
} from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Client Stories",
  description:
    "No miracle stories — just the specific, daily-life changes clients report at check-in. Individual experiences vary, and we'd rather understate than oversell.",
};

export default function StoriesPage() {
  // Gated on there being a count to print — see the same pair on the homepage.
  const reviewCount = combinedReviewCount();
  const showReviewBand = reviewCount !== null;
  // Real, permissioned quotes only. The page used to carry six sample quotes
  // for design review; those are gone now that verified ones exist, and the
  // grid simply renders however many there are rather than being padded.
  const stories = VERIFIED_TESTIMONIALS;
  return (
    <>
      <section className="page-hero center">
        <div className="wrap rv">
          <div className="eyebrow">Client stories</div>
          <h1>Small changes. Real weeks. Honest telling.</h1>
          <p className="sub" style={{ maxWidth: "60ch" }}>
            No miracle stories &mdash; just the specific, daily-life changes
            clients report at check-in. Individual experiences vary, and
            we&rsquo;d rather understate than oversell.
          </p>
        </div>
      </section>

      <section className="sec">
        <div className="wrap">
          {stories.length > 0 ? (
            <>
              <div className="trio-quotes rv">
                {stories.map((t) => (
                  <Quote
                    key={t.text}
                    theme={t.theme}
                    text={t.text}
                    attribution={
                      t.firstName
                        ? `${t.firstName} ${t.lastInitial ?? ""} · ${t.relationship}`
                        : t.relationship
                    }
                    place={t.city}
                  />
                ))}
              </div>
              <p className="sample-note rv">{EXPERIENCES_DISCLAIMER}</p>
            </>
          ) : (
            <div className="rv" style={{ maxWidth: 680 }}>
              <p className="sub">
                We&rsquo;re collecting stories from clients who have agreed to
                share them &mdash; in their own words, with their permission.
                Check back soon, or ask us anything directly.
              </p>
            </div>
          )}
          {showReviewBand && (
            <div className="review-band rv">
              <div>
                <strong>{REVIEWS.value.rating} ★</strong>
                <span>Google rating across locations</span>
              </div>
              <div>
                {/* Same summed figure as the homepage band, from the same
                    helper — the two pages state one number and cannot come
                    apart. See combinedReviewCount() in lib/locations.ts. */}
                <strong>{reviewCountLabel(reviewCount)}</strong>
                {/* Not "Read them unfiltered on Google": this band carries no
                    link — 159 is a total that exists on no Google page — and
                    "read them" invited a click that isn't here. States where
                    the reviews are instead, which is true and checkable. The
                    per-center lines on the location pages are where the read
                    links live. */}
                <span>Every one of them public on Google</span>
              </div>
              <div>
                <strong>Video stories</strong>
                <span>Client interviews in their own words</span>
                <ConfirmTag style={{ display: "block", marginTop: 4 }}>
                  Film 2–3 short testimonials
                </ConfirmTag>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="sec sec-ivory2">
        <div className="wrap split">
          <div className="rv">
            <PhotoFrame
              src="/images/checkin.jpg"
              alt="A structured check-in conversation at a Harmonized center"
              position="68% 35%"
              height={460}
            />
          </div>
          <div className="rv">
            <div className="eyebrow">Why the stories are specific</div>
            <h2>We track outcomes at every single visit.</h2>
            <p>
              Every session opens with a structured check-in on sleep, mood,
              focus, and energy. That&rsquo;s why our clients talk in specifics
              &mdash; homework, Tuesdays, paragraphs &mdash; instead of vague
              transformations.
            </p>
            <Btn href="/how-lens-works" variant="ghost" arrow>
              How the check-ins work
            </Btn>
          </div>
        </div>
      </section>

      <FinalCTA />
    </>
  );
}
