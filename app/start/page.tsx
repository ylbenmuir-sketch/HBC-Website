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
 * Ultra simple since 2026-11-13 (Ben, of the phone view: "too wordy and over
 * stimulating"). A phone's first screen is the logo and the phone, the
 * sample brain map with its caption, a headline of six words or fewer, one
 * line, one quiet trust line and the start of the form. Below: the rest of
 * the form, one guarantee sentence, "How it works" (the session photo and
 * three numbered lines), the footer. No lists, cards, badges or
 * bands, and one accent (the gold star).
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
        {/* The hero is the sample brain map (Ben, 2026-11-13; the session
            photo it replaced is under "How it works" now): the home page's
            own heat map (components/BrainMapHeat.tsx, without its legend),
            centered on a soft ivory panel with its caption. `eager`: it is
            on the first screen, so its field is in the server's HTML. */}
        <figure className="start-map">
          <BrainMapHeat legend={false} eager />
          <figcaption>{START_HOW.caption}</figcaption>
        </figure>

        <div className="start-pane">
          <h1>{hook.headline}</h1>
          <p className="start-line">{START_OFFER.line}</p>
          <p className="start-trust">
            <span className="start-star" aria-hidden="true">
              {START_TRUST.star}
            </span>{" "}
            {START_TRUST.text}
          </p>

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

      {/* How it works (Ben, 2026-11-13): the session photo, small and
          rounded — a real HBC photo — then three numbered lines. */}
      <section className="start-how" id={START_HOW.id}>
        <div className="start-how-photo">
          <Image
            src="/images/concierge.jpg"
            alt="A practitioner places a small sensor behind a client's ear during a LENS session"
            fill
            sizes="(min-width: 900px) 440px, (min-width: 701px) 512px, calc(100vw - 48px)"
          />
        </div>
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
