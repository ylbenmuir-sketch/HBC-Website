import type { Metadata } from "next";
import BrainMapVideo from "@/components/BrainMapVideo";
import ContactForm from "@/components/ContactForm";
import RequestDialog from "@/components/RequestDialog";
import { getVideo } from "@/lib/videos";
import { cleanHook } from "@/lib/attribution";
import { SITE_NAME } from "@/lib/site-config";
import { START_OFFER } from "@/lib/start";
import { startCenters } from "@/lib/start-centers";
import { BRAIN_MAP_VIDEO, MURFREESBORO_OFFER, REQUEST_ANCHOR, murfreesboroHook } from "@/lib/murfreesboro";

/**
 * /murfreesboro — the Murfreesboro paid-ad landing page (Ben, 2026-11-22;
 * one centered column since 2026-11-23): a short opt-in page for cold Meta
 * traffic, one job — the request.
 *
 *   /murfreesboro?h=k1&utm_source=facebook&utm_medium=paid&utm_campaign=…
 *
 * The rule it is cut by: if it does not raise the share of qualified
 * visitors who send the form, it is not here. So, top to bottom, centered
 * in one narrow column: the logo and the Murfreesboro phone; a gold
 * eyebrow; a short serif headline with a smaller italic line under it; one
 * sentence; the "What is a Brain Map?" frame; one button; the price and
 * reviews on one quiet line; the guarantee. Then the legal footer. Nothing
 * else — no bullets, no how-it-works, no reviews wall, no FAQ.
 *
 * - The button opens the request form over the page (components/
 *   RequestDialog.tsx): a card on a desktop, the full screen on a phone.
 *   It is /start's form component in its "start" variant — same route,
 *   spam guard, funnel events, Key event, follow-up and thank-you — asked
 *   as two short screens (`stepped`): name, then phone, optional email and
 *   the text-message box. Without JavaScript the button is a link to the
 *   same form, laid out plainly at the foot of the page.
 * - One center. The form's center is locked to Murfreesboro (a ?center= on
 *   the link is ignored), the header shows that center's line, and nothing
 *   on the page names another center.
 * - `h` picks the headline (lib/murfreesboro.ts → murfreesboroHook; the
 *   codes are /start's). A code, never a word; the <title> and description
 *   below are the same for every variant, and the address is a place name:
 *   nothing the Meta pixel or GA sees says what a visitor is dealing with.
 * - The frame is the poster photo with a small "What is a Brain Map?"
 *   badge until the clip is recorded (lib/murfreesboro.ts →
 *   BRAIN_MAP_VIDEO has the one TODO); then it is the player.
 * - No exits: no menu, no 10-year banner, no assistant, no phone action
 *   bar, no link to any other page but Privacy and SMS Terms.
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

  return (
    <div className="start-page mb-page">
      <section className="mb-hero">
        <p className="start-eyebrow">{MURFREESBORO_OFFER.eyebrow}</p>
        <h1>
          {hook.lead} <em>{hook.tail}</em>
        </h1>
        <p className="mb-sub">{MURFREESBORO_OFFER.sub}</p>
        <BrainMapVideo video={BRAIN_MAP_VIDEO} />
        {/* The page's one action. A link, so it works without JavaScript
            (it jumps to the form); with it, RequestDialog opens the form. */}
        <a className="mb-cta" href={`#${REQUEST_ANCHOR}`}>
          {START_OFFER.button}
          <span className="mb-cta-arrow" aria-hidden="true">
            →
          </span>
        </a>
        <p className="mb-quiet">{MURFREESBORO_OFFER.quiet}</p>
        <p className="mb-guarantee">{MURFREESBORO_OFFER.guarantee}</p>
      </section>

      <RequestDialog label="Request a Brain Map Session">
        <div className="start-form mb-form" id="send-a-message">
          <ContactForm
            centerPhones={[{ name: center.name, phone: center.phone }]}
            video={FIRST_VISIT_VIDEO}
            variant="start"
            hook={cleanHook(h)}
            lockedCenter="Murfreesboro"
            stepped
            startCopy={{ formSub: MURFREESBORO_OFFER.formSub }}
          />
        </div>
      </RequestDialog>
    </div>
  );
}
