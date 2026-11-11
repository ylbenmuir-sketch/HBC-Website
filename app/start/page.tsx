import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";
import StartCenterDetails from "@/components/StartCenterDetails";
import { getVideo } from "@/lib/videos";
import { cleanHook } from "@/lib/attribution";
import { EXPERIENCES_DISCLAIMER, PROOF_LINE_SHORT, SHOW_PHONE, SITE_NAME, googleReviewNamed } from "@/lib/site-config";
import { START_FAQS, START_OFFER, START_REVIEWERS, startHook } from "@/lib/start";
import { startCenters } from "@/lib/start-centers";

/**
 * /start — the ad landing page (Ben, 2026-11-11; it began on 2026-11-09 as
 * the Instagram bio link's page, and that link still lands here). Cold Meta
 * and Google ad traffic, one job: the request form.
 *
 *   /start?h=k1&center=murfreesboro&utm_source=…
 *
 * - `h` picks the headline (lib/start.ts). It is a code, never a word, and
 *   the <title> and description below are the same for every variant: the
 *   page address and title are what the Meta pixel and GA see, and they
 *   must not say what a visitor is dealing with. The code is saved on the
 *   lead as `hook` (lib/attribution.ts, migration 0022).
 * - The offer is the "Brain Map Session", worded in one constant
 *   (START_OFFER). The form is /contact's own component in its "start"
 *   variant: same route, same spam guard, same funnel events and Key event.
 * - `center=murfreesboro`, or the Murfreesboro chip, switches the header
 *   number, the Call and Text buttons and the address line to that center
 *   (lib/start-center.ts); otherwise Nashville.
 * - No exits: the header is the logo and the phone (components/Header.tsx),
 *   no 10-year banner (lib/giveaway/banner.ts), a short footer
 *   (components/StartFooter.tsx), no phone action bar, no assistant, and no
 *   link to any concern page.
 *
 * Rendered per request (it reads the query), so the right headline and
 * number are in the first HTML — no swap after load. Hidden from search the
 * way /review is: noindex here and by header (next.config.ts), not in the
 * sitemap, in no menu. No JSON-LD: not indexable.
 */
export const metadata: Metadata = {
  title: "Book a Brain Map Session",
  description: `Request a Brain Map Session at ${SITE_NAME} in Nashville or Murfreesboro. We'll reach out to pick a time.`,
  robots: { index: false, follow: false, nocache: true },
};

/** The first-visit video the form shows once the request is sent. */
const FIRST_VISIT_VIDEO = getVideo("FCUyUqzE3Dk");

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function StartPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const h = one(params.h);
  const hook = startHook(h);
  const initialCenter = one(params.center)?.trim().toLowerCase() === "murfreesboro" ? "murfreesboro" : "nashville";
  const centers = startCenters();
  const centerPhones = [centers.nashville, centers.murfreesboro].map((c) => ({ name: c.name, phone: c.phone }));
  const reviews = START_REVIEWERS.flatMap((r) => {
    const t = googleReviewNamed(r.firstName, r.center);
    return t ? [t] : [];
  });

  return (
    <div className="desk-compact start-page">
      <section className="start-top">
        <div className="wrap start-grid">
          <div className="start-pitch">
            <h1>{hook.headline}</h1>
            <p className="start-sub">{hook.sub}</p>
            <ul className="start-values">
              {START_OFFER.values.map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
            <p className="start-guarantee">{START_OFFER.guarantee}</p>
          </div>

          <div className="start-form" id="send-a-message">
            <ContactForm centerPhones={centerPhones} video={FIRST_VISIT_VIDEO} variant="start" hook={cleanHook(h)} />
            <StartCenterDetails centers={centers} initial={initialCenter} showPhone={SHOW_PHONE} />
          </div>
        </div>
      </section>

      <section className="start-more">
        <div className="wrap start-more-col">
          <ol className="start-steps">
            {START_OFFER.steps.map((s, i) => (
              <li key={s}>
                <span className="start-step-n" aria-hidden="true">
                  {i + 1}
                </span>
                {s}
              </li>
            ))}
          </ol>

          {reviews.length > 0 && (
            <div className="start-reviews">
              {reviews.map((t) => (
                <figure key={t.firstName} className="start-review">
                  <div className="start-stars" role="img" aria-label="5 out of 5 stars">
                    ★★★★★
                  </div>
                  <blockquote>{t.text}</blockquote>
                  <figcaption>
                    {t.firstName}
                    {t.lastInitial ? ` ${t.lastInitial}` : ""} &middot; Google review
                  </figcaption>
                </figure>
              ))}
              <p className="proof-line start-proof">{PROOF_LINE_SHORT}</p>
              <p className="start-vary">{EXPERIENCES_DISCLAIMER}</p>
            </div>
          )}

          <div className="start-faq">
            <h2>Questions</h2>
            {START_FAQS.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>

          <p className="start-back">
            <a className="btn btn-primary" href="#send-a-message">
              {START_OFFER.button}
            </a>
          </p>
        </div>
      </section>
    </div>
  );
}
