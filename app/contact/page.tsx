import type { Metadata } from "next";
import ContactForm, { WhatHappensNext } from "@/components/ContactForm";
import ConfirmTag from "@/components/ConfirmTag";
import { locationPhone, locations } from "@/lib/locations";
import { CONTACT_RESPONSE_TAG, SHOW_DRAFT_CONTENT } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Talk With Our Team",
  description:
    "Tell us what's going on. A free, no-pressure conversation with a real person from your nearest center.",
};

export default function ContactPage() {
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
    <>
      <section className="page-hero center">
        <div className="wrap rv">
          <div className="eyebrow">Talk with our team</div>
          <h1>Tell us what&rsquo;s going on. We&rsquo;ll take it from there.</h1>
          <p className="sub" style={{ maxWidth: "56ch" }}>
            A free, no-pressure conversation with a real person from your
            nearest center
            {SHOW_DRAFT_CONTENT && <> &mdash; usually within one business day</>}
            .{" "}
            <ConfirmTag>{CONTACT_RESPONSE_TAG}</ConfirmTag>
          </p>
        </div>
      </section>

      <section className="sec">
        <div className="wrap duo-form">
          <ContactForm />
          <div className="rv">
            {/* A real H2: /contact went H1 -> H4 with nothing in between.
                The .eyebrow class carries the styling, so this renders
                exactly as the div it replaces. */}
            <h2 className="eyebrow">What happens next</h2>
            <WhatHappensNext />
            {centerPhones.length > 0 && (
              <div className="note-sage" style={{ marginTop: 34 }}>
                Prefer to talk now? Call the center closer to you &mdash; a
                real person answers during business hours.
                <div style={{ marginTop: 8 }}>
                  {centerPhones.map(({ name, phone }) => (
                    <div key={name}>
                      {name} &mdash;{" "}
                      <a href={`tel:${phone.tel}`}>
                        <b>{phone.display}</b>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div
              style={{
                marginTop: 26,
                fontSize: 14,
                color: "var(--slate)",
                lineHeight: 1.8,
              }}
            >
              <b style={{ color: "var(--ink)" }}>
                Helpful to have ready (not required):
              </b>
              <br />
              What a typical hard day looks like &middot; what you&rsquo;ve
              already tried &middot; your schedule for a first visit
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
