import type { Metadata } from "next";
import Image from "next/image";
import BrainMapHeat from "@/components/BrainMapHeat";
import ContactForm from "@/components/ContactForm";
import { getVideo } from "@/lib/videos";
import { cleanHook } from "@/lib/attribution";
import { SITE_NAME } from "@/lib/site-config";
import { START_HOW, START_OFFER, START_TRUST, startHook } from "@/lib/start";
import { startCenters } from "@/lib/start-centers";

/**
 * /start — the ad landing page (Ben, 2026-11-11; it began on 2026-11-09 as
 * the Instagram bio link's page, and that link still lands here). Cold Meta
 * and Google ad traffic, one job: the request form.
 *
 *   /start?h=k1&center=murfreesboro&utm_source=…
 *
 * Editorial since 2026-11-13, to Ben's reference image (the same day's
 * ultra-simple page before it: he had called the phone view "too wordy and
 * over stimulating"). Top to bottom on a phone: the logo and the phone, one
 * photo, an eyebrow, a serif headline with its last line in italic, one
 * sentence, the offer and the reviews on one row; then the form on a sage
 * band; then "How it works" and the footer. On a desktop the photo is the
 * left half and the text and form the right.
 *
 * - `h` picks the headline (lib/start.ts). It is a code, never a word, and
 *   the <title> and description below are the same for every variant: the
 *   page address and title are what the Meta pixel and GA see, and they
 *   must not say what a visitor is dealing with. The code is saved on the
 *   lead as `hook` (lib/attribution.ts, migration 0022).
 * - The offer is the "Brain Map Session", worded in one constant
 *   (START_OFFER). The form is /contact's own component in its "start"
 *   variant: same route, same spam guard, same funnel events and Key event.
 * - `center=murfreesboro` selects that chip in the first HTML; it, or a tap
 *   on the chip, switches the header number and adds the center's address
 *   to the footer (lib/start-center.ts); otherwise Nashville.
 * - No exits: the header is the logo and the phone (components/Header.tsx),
 *   no 10-year banner (lib/giveaway/banner.ts), a short footer
 *   (components/StartFooter.tsx), no phone action bar, no assistant, and no
 *   link to any concern page.
 *
 * Rendered per request (it reads the query), so the right headline and
 * center are in the first HTML — no swap after load. Hidden from search the
 * way /review is: noindex here and by header (next.config.ts), not in the
 * sitemap, in no menu. No JSON-LD: not indexable.
 */
export const metadata: Metadata = {
  title: "Request a Brain Map Session",
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
  const initialCenter = one(params.center)?.trim().toLowerCase() === "murfreesboro" ? "Murfreesboro" : null;
  const centers = startCenters();
  const centerPhones = [centers.nashville, centers.murfreesboro].map((c) => ({ name: c.name, phone: c.phone }));

  return (
    <div className="start-page">
      <section className="start-hero">
        {/* The hero photo: a real HBC photo of a practitioner with a client
            (Ben, 2026-11-13), and the page's LCP element. Full width on a
            phone; the left half, staying put, on a desktop.
            TODO(Ben): swap in a real HBC photo of a practitioner going over
            a brain map with a client once one exists — none of the photos
            in public/images shows a map review. */}
        <div className="start-photo">
          <Image
            src="/images/concierge.jpg"
            alt="A practitioner places a small sensor behind a client's ear during a LENS session"
            fill
            priority
            sizes="(min-width: 900px) 50vw, 100vw"
          />
        </div>

        <div className="start-side">
          <div className="start-pane">
            <p className="start-eyebrow">{START_OFFER.eyebrow}</p>
            {/* The last line in the italic, for every code (lib/start.ts). */}
            <h1>
              {hook.lead} <em>{hook.tail}</em>
            </h1>
            <p className="start-sub">{START_OFFER.sub}</p>
            <p className="start-meta">
              <span className="start-meta-offer">{START_OFFER.meta}</span>
              <span>
                <span className="start-star" aria-hidden="true">
                  {START_TRUST.star}
                </span>{" "}
                {START_TRUST.text}
              </span>
            </p>
          </div>

          <div className="start-form" id="send-a-message">
            <ContactForm
              centerPhones={centerPhones}
              video={FIRST_VISIT_VIDEO}
              variant="start"
              hook={cleanHook(h)}
              initialCenter={initialCenter}
            />
          </div>
        </div>
      </section>

      {/* How it works (Ben, 2026-11-13): the home page's own sample heat
          map (components/BrainMapHeat.tsx, without its legend) with its
          caption, and three numbered lines. */}
      <section className="start-how" id={START_HOW.id}>
        <figure className="start-how-map">
          <BrainMapHeat legend={false} />
          <figcaption>{START_HOW.caption}</figcaption>
        </figure>
        <div className="start-how-copy">
          <h2>{START_HOW.heading}</h2>
          <ol>
            {START_HOW.steps.map((step, i) => (
              <li key={step}>
                <span className="start-how-n" aria-hidden="true">
                  {i + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
