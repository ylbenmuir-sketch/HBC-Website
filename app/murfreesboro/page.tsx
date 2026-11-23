import type { Metadata } from "next";
import Image from "next/image";
import ContactForm from "@/components/ContactForm";
import { getVideo } from "@/lib/videos";
import { cleanHook } from "@/lib/attribution";
import { SITE_NAME } from "@/lib/site-config";
import { startCenters } from "@/lib/start-centers";
import { getLocation } from "@/lib/locations";
import { MURFREESBORO_OFFER, MURFREESBORO_PHOTO, murfreesboroHook } from "@/lib/murfreesboro";

/**
 * /murfreesboro — the Murfreesboro paid-ad landing page (Ben, 2026-11-22;
 * two columns to his mockup since 2026-11-23): a short opt-in page for
 * cold Meta traffic, one job — the request.
 *
 *   /murfreesboro?h=k1&utm_source=facebook&utm_medium=paid&utm_campaign=…
 *
 * Desktop: the copy and the photo on the left, the form card on the right,
 * whole on a 1280×800 first screen. Phone: one column — eyebrow, headline,
 * sentence, reviews, photo, then the card. Under the hero a thin rule and
 * three reassurances; then the legal footer. No bottom band, no menu.
 *
 * - The form is /start's component in its "start" variant — same route,
 *   spam guard, funnel events, Key event — with `requireAll`. The card's
 *   head (eyebrow, title, price) is this page's; after the send the
 *   follow-up questions and the thank-you take the card (the head goes:
 *   app/globals.css → .mb-card:has(.start-step)). The form is plain HTML
 *   in the first response, so it is the same form without JavaScript.
 * - One center. The form's center is locked to Murfreesboro (a ?center= on
 *   the link is ignored), the header shows that center's line, and nothing
 *   on the page names another center.
 * - `h` picks the headline (lib/murfreesboro.ts → murfreesboroHook; the
 *   codes are /start's). A code, never a word; the <title> and description
 *   below are the same for every variant, and the address is a place name:
 *   nothing the Meta pixel or GA sees says what a visitor is dealing with.
 * - The photo is a real HBC session (lib/murfreesboro.ts →
 *   MURFREESBORO_PHOTO). The card over it is drawn here; its dot map is a
 *   drawing and says so.
 * - Exits: the reviews row opens that center's Google listing in a new
 *   tab; Privacy and SMS Terms. No menu, no 10-year banner, no assistant,
 *   no phone action bar.
 *
 * /start itself and the organic /locations/murfreesboro are untouched.
 *
 * Rendered per request (it reads the query), so the right headline is in
 * the first HTML. Hidden from search: noindex here and by header
 * (next.config.ts), not in the sitemap, in no menu. No JSON-LD.
 */
export const metadata: Metadata = {
  title: "Request a Brain Map Session",
  description: `Request a Brain Map Session at ${SITE_NAME} in Murfreesboro. We'll call to find a time that works for you.`,
  robots: { index: false, follow: false, nocache: true },
};

/** The form's default (non-start) confirmation wants one; this page never shows it. */
const FIRST_VISIT_VIDEO = getVideo("FCUyUqzE3Dk");

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function MurfreesboroAdPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const h = one(params.h);
  const hook = murfreesboroHook(h);
  const center = startCenters().murfreesboro;

  const reviewsUrl = getLocation("murfreesboro")?.reviewReadUrl ?? null;
  const o = MURFREESBORO_OFFER;
  const reviews = (
    <>
      <GoogleG />
      <span className="mb-stars" role="img" aria-label="Five stars">
        <span aria-hidden="true">★★★★★</span>
      </span>
      <span>
        <strong>{o.reviews.rating}</strong> <span className="mb-reviews-text">{o.reviews.text}</span>
      </span>
    </>
  );

  return (
    <div className="start-page mb-page">
      <section className="mb-hero">
        <div className="mb-copy">
          <p className="mb-eyebrow">
            <span className="mb-spark" aria-hidden="true">
              ✦
            </span>
            {o.eyebrow[0]}
            <span className="mb-slash" aria-hidden="true">
              /
            </span>
            {o.eyebrow[1]}
          </p>
          <h1>
            {hook.lead} <em>{hook.tail}</em>
          </h1>
          <p className="mb-sub">{o.sub}</p>
          {reviewsUrl ? (
            <a className="mb-reviews" href={reviewsUrl} target="_blank" rel="noopener">
              {reviews}
            </a>
          ) : (
            <p className="mb-reviews">{reviews}</p>
          )}
        </div>

        <figure className="mb-photo">
          <div className="mb-photo-frame">
            <Image src={MURFREESBORO_PHOTO.src} alt={MURFREESBORO_PHOTO.alt} fill priority sizes="(min-width: 1000px) 560px, 100vw" />
            <p className="mb-chip">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M3 13c2.2 0 2.2-4 4.5-4s2.2 6 4.5 6 2.2-6 4.5-6 2.3 4 4.5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              {o.photoChip}
            </p>
          </div>
          <figcaption className="mb-keep">
            <p className="mb-keep-top">
              <span>{o.keep.brand}</span>
              <span className="mb-keep-tag">{o.keep.tag}</span>
            </p>
            <div className="mb-keep-body">
              <div className="mb-keep-map">
                <DotMap />
                <span>{o.keep.mapLabel}</span>
              </div>
              <div>
                <p className="mb-keep-title">
                  {o.keep.title[0]}
                  <br />
                  {o.keep.title[1]}
                </p>
                <ul>
                  {o.keep.lines.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
          </figcaption>
        </figure>

        {/* The form card. It is the page's one action, and it is here with
            or without JavaScript. */}
        <div className="mb-card" id="send-a-message">
          <div className="mb-card-head">
            <p className="mb-card-top">
              <span>{o.card.eyebrow}</span>
              <span className="mb-pill">{o.card.pill}</span>
            </p>
            <h2>{o.card.title}</h2>
            <p className="mb-price">
              <strong>{o.card.price}</strong>
              <span>
                {o.card.priceWhat}
                <small>{o.card.priceNote}</small>
              </span>
            </p>
          </div>
          <ContactForm
            centerPhones={[{ name: center.name, phone: center.phone }]}
            video={FIRST_VISIT_VIDEO}
            variant="start"
            hook={cleanHook(h)}
            lockedCenter="Murfreesboro"
            requireAll
            startCopy={{
              formHeading: null,
              formSub: o.card.formSub,
              fields: o.card.fields,
              quiet: o.card.quiet,
              guarantee: o.card.guarantee,
            }}
          />
        </div>
      </section>

      <section className="mb-points" aria-label="What to expect">
        <ul>
          {o.points.map((point) => (
            <li key={point.title}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="10.5" stroke="currentColor" strokeWidth="1.2" />
                <path d="M8 12.4l2.7 2.7L16 9.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <div>
                <h3>{point.title}</h3>
                <p>{point.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** Google's "G", beside the stars: says whose reviews they are. Decoration. */
function GoogleG() {
  return (
    <svg className="mb-g" width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/**
 * The card's drawing: a head from above with dots where a map's sites sit.
 * A picture of the idea, not a client's map — labeled so beside it.
 */
function DotMap() {
  const sage = "#8fa08d";
  const gold = "#b8924a";
  const mist = "#a9bccb";
  const deep = "#596e5b";
  const dots: [number, number, string][] = [
    [40, 22, sage], [60, 22, deep],
    [24, 36, mist], [38, 36, gold], [50, 36, sage], [62, 36, gold], [76, 36, deep],
    [22, 52, deep], [36, 52, sage], [50, 52, gold], [64, 52, sage], [78, 52, mist],
    [24, 68, sage], [38, 68, mist], [50, 68, deep], [62, 68, sage], [76, 68, gold],
    [40, 82, deep], [60, 82, mist],
  ];
  return (
    <svg viewBox="0 0 100 104" aria-hidden="true">
      <path d="M45 7l5-5 5 5" fill="none" stroke="#c9cfc4" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M6 46c-4 2-4 12 0 14M94 46c4 2 4 12 0 14" fill="none" stroke="#c9cfc4" strokeWidth="1.2" strokeLinecap="round" />
      <ellipse cx="50" cy="53" rx="44" ry="46" fill="#fbf8f1" stroke="#c9cfc4" strokeWidth="1.2" />
      {dots.map(([x, y, fill]) => (
        <circle key={`${x}-${y}`} cx={x} cy={y} r="4.6" fill={fill} />
      ))}
    </svg>
  );
}
