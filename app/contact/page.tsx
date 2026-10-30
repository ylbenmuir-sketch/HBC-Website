import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";
import { getVideo } from "@/lib/videos";
import { locationPhone, locations } from "@/lib/locations";
import { EMAIL_ADDRESS, PHONE_DISPLAY, PHONE_TEL, SHOW_EMAIL, SHOW_PHONE } from "@/lib/site-config";
import { hubTrail, pageMetadata } from "@/lib/pages";
import Breadcrumbs from "@/components/Breadcrumbs";
import PageSchema from "@/components/PageSchema";

// Title, description and the page's content date live in lib/pages.ts.
export const metadata: Metadata = pageMetadata("/contact");

/** The first-visit video the form shows once the call is requested — step
 *  three of components/ContactForm.tsx. No VideoObject here (2026-10-20):
 *  the video appears only after a submit, so a crawler never sees it on
 *  this page, and its watch page (/videos/your-first-appointment) is the
 *  one URL its markup lives on. */
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

  // "Whatever's easiest… Or email …" — rendered twice, one copy per
  // breakpoint (desktop: under the three cards; phone: under the form).
  const waysLine = (
    <>
      Whatever&rsquo;s easiest for you. A real person&nbsp;answers.
      {SHOW_EMAIL && (
        <>
          {" "}
          <span className="contact-ways-email">
            Or email <a href={`mailto:${EMAIL_ADDRESS}`}>{EMAIL_ADDRESS}</a>.
          </span>
        </>
      )}
    </>
  );

  return (
    // `desk-compact`: this page keeps the ~90% desktop scale the rest of the
    // site gave back (Ben, 2026-10-15) — see the end of globals.css.
    <div className="desk-compact">
      <PageSchema path="/contact" breadcrumb={trail} />
      <Breadcrumbs trail={trail} />
      {/* `compact`: the form's first step has to sit above the fold on a
          desktop, so this hero and the section below it run tighter than the
          site default — see the contact block in globals.css. */}
      <section className="page-hero center compact">
        <div className="wrap rv">
          <div className="eyebrow">Talk with our team</div>
          {/* Ben, 2026-10-26: the short step one asks for a name and a way
              to reach her, so the H1 and the line under it say exactly that. */}
          <h1>Let&rsquo;s get you started</h1>
          <p className="sub" style={{ maxWidth: "60ch" }}>
            Send your name and number. We&rsquo;ll reach out to answer your
            questions and find a time that works.
          </p>
        </div>
      </section>

      {/* Three ways in, side by side, before the form (Ben, 2026-10-19): text,
          call, or the form. On phones (Ben, 2026-10-30) only Text and Call
          remain, as one compact row, the form card starts right under them
          (the form IS the third way), and the "Or email" line moves below the
          form — so the Name field is on the first screen at 390×844. The
          desktop layout is unchanged; globals.css → `.contact-way-form`. The main line for both
          — the center lines stay on step three. The sms: link is a real link
          everywhere; on a desktop, where sms: mostly does nothing, the card
          shows the number with "Text this number" (CSS swaps the hint).
          Every tap here reports contact_link_click with location
          "contact options" (components/Analytics.tsx). */}
      {SHOW_PHONE && (
        <section className="contact-ways-sec">
          <div className="wrap form-solo" data-link-location="contact options">
            <div className="contact-ways">
              <a className="contact-way" href={`sms:${PHONE_TEL}`}>
                <span className="contact-way-title">Text us</span>
                <span className="contact-way-detail">{PHONE_DISPLAY}</span>
                <span className="contact-way-hint contact-way-hint-desk">Text this number</span>
                <span className="contact-way-hint contact-way-hint-touch">Opens your messages</span>
              </a>
              <a className="contact-way" href={`tel:${PHONE_TEL}`}>
                <span className="contact-way-title">Call us</span>
                <span className="contact-way-detail">{PHONE_DISPLAY}</span>
                <span className="contact-way-hint">Tap to call</span>
              </a>
              <a className="contact-way contact-way-form" href="#send-a-message">
                <span className="contact-way-title">Send a message</span>
                <span className="contact-way-detail">The form below</span>
                <span className="contact-way-hint">We reach out to you</span>
              </a>
            </div>
            <p className="contact-ways-line contact-ways-line-desk">{waysLine}</p>
          </div>
        </section>
      )}

      <section className="sec sec-form" id="send-a-message">
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
          {/* Phones only: the same line, under the form (Ben, 2026-10-30). */}
          {SHOW_PHONE && (
            <p className="contact-ways-line contact-ways-line-phone" data-link-location="contact options">
              {waysLine}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
