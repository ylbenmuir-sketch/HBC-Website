import type { Metadata } from "next";
import ContactForm from "@/components/ContactForm";
import StartChips from "@/components/StartChips";
import { getVideo } from "@/lib/videos";
import { locationPhone, locations } from "@/lib/locations";
import { PHONE_DISPLAY, PHONE_TEL, PROOF_LINE_SHORT, SHOW_PHONE, SITE_NAME } from "@/lib/site-config";

/**
 * /start — the Instagram landing page (Ben, 2026-11-09; Instagram referral
 * sessions went from 2 to 18 in a week). The bio link is
 *
 *   https://harmonizedbraincenterstn.com/start?utm_source=instagram&utm_medium=social&utm_campaign=bio
 *
 * One short, phone-first page: the headline, two sentences, the proof line,
 * then the contact form's step one — the same component /contact renders,
 * same route, same funnel events and Key event — in its "start" variant
 * (no referral field), so step one sits as high on a 390×844 screen as the
 * headline allows. Call and Text and three concern chips come after the
 * form, not before it. The lead saves with lead_source "instagram" and the
 * utm tags of the first page (lib/attribution.ts, migration 0019), whether
 * the form is sent here or later on /contact.
 *
 * Hidden from search the way /review is: noindex here and by header
 * (next.config.ts), not in the sitemap, in no menu — it exists for one
 * link. Not disallowed in robots.txt (see /review). The phone action bar and
 * the assistant stay off it, like /contact (lib/site-config.ts): the page
 * is the form. No JSON-LD: not indexable.
 */
export const metadata: Metadata = {
  title: "Feel like yourself again",
  description: `Tell ${SITE_NAME} what's going on and we'll reach out. LENS neurofeedback in Nashville & Murfreesboro.`,
  robots: { index: false, follow: false, nocache: true },
};

/** The first-visit video the form shows once the call is requested. */
const FIRST_VISIT_VIDEO = getVideo("FCUyUqzE3Dk");

export default function StartPage() {
  const centerPhones = locations
    .filter((l) => !l.comingSoon)
    .flatMap((l) => {
      const phone = locationPhone(l);
      return phone ? [{ name: l.name, phone }] : [];
    });
  return (
    <div className="desk-compact start-page">
      <section className="page-hero center compact">
        <div className="wrap rv">
          <h1>Feel like yourself again</h1>
          <p className="sub" style={{ maxWidth: "52ch" }}>
            LENS neurofeedback is passive and brief &mdash; nothing to
            practice, nothing a child has to get right. Tell us what&rsquo;s
            going on and a real person reaches out.
          </p>
          <p className="proof-line start-proof">{PROOF_LINE_SHORT}</p>
        </div>
      </section>

      <section className="sec sec-form" id="send-a-message">
        <div className="wrap form-solo">
          <ContactForm centerPhones={centerPhones} video={FIRST_VISIT_VIDEO} variant="start" />
          {/* Call and Text, the /contact row, under the form (location
              local_page for contact_link_click and the tap log). */}
          {SHOW_PHONE && (
            <div className="start-ways" data-link-location="local_page">
              <p className="contact-ways-line">Rather talk now?</p>
              <div className="contact-ways">
                <a className="contact-way" href={`tel:${PHONE_TEL}`} aria-label={`Call ${PHONE_DISPLAY}`}>
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M5 4h4l2 5-2.5 1.5a12 12 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="contact-way-title">Call us</span>
                </a>
                <a className="contact-way" href={`sms:${PHONE_TEL}`} aria-label={`Text ${PHONE_DISPLAY}`}>
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v9a1.5 1.5 0 0 1-1.5 1.5H9l-4.5 4v-4A1.5 1.5 0 0 1 4 14.5v-9z"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="contact-way-title">Text us</span>
                </a>
              </div>
            </div>
          )}
          <StartChips />
        </div>
      </section>
    </div>
  );
}
