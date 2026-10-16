import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";
import { getVideo } from "@/lib/videos";
import { locationPhone, locations } from "@/lib/locations";
import { hubTrail, pageMetadata } from "@/lib/pages";
import Breadcrumbs from "@/components/Breadcrumbs";
import PageSchema from "@/components/PageSchema";

// Title, description and the page's content date live in lib/pages.ts.
export const metadata: Metadata = pageMetadata("/contact");

/** The first-visit video the form shows once the call is requested — step
 *  three of components/ContactForm.tsx — and the page's VideoObject. */
const FIRST_VISIT_VIDEO = getVideo("FCUyUqzE3Dk");

export default function ContactPage() {
  const trail = hubTrail("/contact");
  /**
   * Both open centers' own lines, not the one sitewide number: the person on
   * this page is deciding which center to visit, and the local number is part
   * of that decision — it shouldn't take a trip to a location page to find.
   * Each number carries its own center's gate (locationPhone), so one line in
   * doubt comes off this list without taking the other with it. Franklin has
   * no line of its own and is filtered with comingSoon, not by phone: its
   * `phone` field holds the sitewide number, which is not a fact about a
   * center a person could call.
   */
  const centerPhones = locations
    .filter((l) => !l.comingSoon)
    .flatMap((l) => {
      const phone = locationPhone(l);
      return phone ? [{ name: l.name, phone }] : [];
    });

  return (
    // `desk-compact`: this page keeps the ~90% desktop scale the rest of the
    // site gave back (Ben, 2026-10-15) — see the end of globals.css.
    <div className="desk-compact">
      <PageSchema path="/contact" breadcrumb={trail} video={FIRST_VISIT_VIDEO} />
      <Breadcrumbs trail={trail} />
      {/* `compact`: the form's first step has to sit above the fold on a
          desktop, so this hero and the section below it run tighter than the
          site default — see the contact block in globals.css. */}
      <section className="page-hero center compact">
        <div className="wrap rv">
          <div className="eyebrow">Talk with our team</div>
          {/* The form's first step asks only where to reach her; "what's
              going on" is step two's question now, so the H1 asks for the
              call and nothing else (Ben, 2026-10-13). */}
          <h1>Start with a free call.</h1>
          <p className="sub" style={{ maxWidth: "60ch" }}>
            Tell us where to reach you. We&rsquo;ll call, answer your
            questions, and tell you honestly whether LENS is a fit &mdash; you
            decide what comes next.
          </p>
        </div>
      </section>

      <section className="sec sec-form">
        {/* One centered column (Ben, 2026-10-13). The "What happens next"
            column that used to sit beside the form repeated step three's
            three steps and its phone box; the one line it had that nothing
            else did — what is helpful to have ready — moved into step three
            (components/ContactForm.tsx). */}
        <div className="wrap form-solo">
          {/* The center lines come from the gated reader in
              lib/locations.ts, so step three can never print a number a
              location page would not. (BOOKING_CALENDAR_URL's "Pick a time
              for your call" link was on step three; the confirmation is now
              four fixed things and it is gone — Ben, 2026-10-14.) */}
          <ContactForm
            centerPhones={centerPhones}
            video={FIRST_VISIT_VIDEO}
          />
        </div>
      </section>
    </div>
  );
}
