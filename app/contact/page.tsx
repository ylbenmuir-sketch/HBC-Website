import type { Metadata } from "next";
import ContactForm, { WhatHappensNext } from "@/components/ContactForm";
import ConfirmTag from "@/components/ConfirmTag";
import { CONTACT_RESPONSE_TAG, PHONE_DISPLAY } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Talk With Our Team",
  description:
    "Tell us what's going on. A free, no-pressure conversation with a real person from your nearest center — usually within one business day.",
};

export default function ContactPage() {
  return (
    <>
      <section className="page-hero center">
        <div className="wrap rv">
          <div className="eyebrow">Talk with our team</div>
          <h1>Tell us what&rsquo;s going on. We&rsquo;ll take it from there.</h1>
          <p className="sub" style={{ maxWidth: "56ch" }}>
            A free, no-pressure conversation with a real person from your
            nearest center &mdash; usually within one business day.{" "}
            <ConfirmTag>{CONTACT_RESPONSE_TAG}</ConfirmTag>
          </p>
        </div>
      </section>

      <section className="sec">
        <div className="wrap duo-form">
          <ContactForm />
          <div className="rv">
            <div className="eyebrow">What happens next</div>
            <WhatHappensNext />
            <div className="note-sage" style={{ marginTop: 34 }}>
              Prefer to talk now? Call <b>{PHONE_DISPLAY}</b> &mdash; a real
              person answers during business hours.
            </div>
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
