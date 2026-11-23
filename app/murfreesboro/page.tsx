import type { Metadata } from "next";
import BrainMapVideo from "@/components/BrainMapVideo";
import ContactForm from "@/components/ContactForm";
import { getVideo } from "@/lib/videos";
import { cleanHook } from "@/lib/attribution";
import { SITE_NAME } from "@/lib/site-config";
import { START_TRUST } from "@/lib/start";
import { startCenters } from "@/lib/start-centers";
import { BRAIN_MAP_VIDEO, MURFREESBORO_BULLETS, MURFREESBORO_OFFER, murfreesboroHook } from "@/lib/murfreesboro";

/**
 * /murfreesboro — the Murfreesboro paid-ad landing page (Ben, 2026-11-22):
 * a short opt-in page for cold Meta traffic, one job — the request form.
 *
 *   /murfreesboro?h=k1&utm_source=facebook&utm_medium=paid&utm_campaign=…
 *
 * The rule it is cut by: if it does not raise the share of qualified
 * visitors who send the form, it is not here. So, top to bottom: the logo
 * and the Murfreesboro phone; a headline and one sentence; the "What is a
 * Brain Map?" video slot; the form on the sage band — name, phone, an
 * optional email, the text-message box — with the guarantee under its
 * button. Below that, three lines and the legal footer. No how-it-works,
 * no reviews wall, no FAQ, no story.
 *
 * It is /start's sibling and reuses it: the same form component in its
 * "start" variant (same route, spam guard, funnel events and Key event),
 * the same headline codes, the same follow-up and thank-you, the same
 * editorial CSS. /start itself and the organic /locations/murfreesboro are
 * untouched.
 *
 * - One center. The form's center is locked to Murfreesboro (no select; a
 *   ?center= on the link is ignored), the header shows that center's line,
 *   and nothing on the page names another center.
 * - `h` picks the headline (lib/murfreesboro.ts → murfreesboroHook; the
 *   codes are /start's). A code, never a word; the <title> and description
 *   below are the same for every variant, and the address is a place name:
 *   nothing the Meta pixel or GA sees says what a visitor is dealing with.
 * - The video slot is a marked placeholder until the clip is recorded
 *   (lib/murfreesboro.ts → BRAIN_MAP_VIDEO has the one TODO).
 * - No exits: no menu, no 10-year banner, no assistant, no phone action
 *   bar, no link to any other page but Privacy and SMS Terms.
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

  return (
    <div className="start-page mb-page">
      <section className="mb-hero">
        <div className="mb-pane">
          <p className="start-eyebrow">{MURFREESBORO_OFFER.eyebrow}</p>
          <h1>
            {hook.lead} <em>{hook.tail}</em>
          </h1>
          <p className="start-sub">{MURFREESBORO_OFFER.sub}</p>
          <BrainMapVideo video={BRAIN_MAP_VIDEO} />
        </div>

        <div className="start-form mb-form" id="send-a-message">
          <ContactForm
            centerPhones={[{ name: center.name, phone: center.phone }]}
            video={FIRST_VISIT_VIDEO}
            variant="start"
            hook={cleanHook(h)}
            lockedCenter="Murfreesboro"
            startCopy={{
              formHeading: null,
              formSub: MURFREESBORO_OFFER.formSub,
              guarantee: MURFREESBORO_OFFER.guarantee,
              badges: MURFREESBORO_OFFER.badges,
              proof: START_TRUST,
            }}
          />
        </div>
      </section>

      {/* Below the first screen: exactly three lines, then the footer. */}
      <section className="mb-points">
        <ul aria-label="Before you ask">
          {MURFREESBORO_BULLETS.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
