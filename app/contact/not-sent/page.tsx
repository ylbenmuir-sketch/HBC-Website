import type { Metadata } from "next";
import Link from "next/link";
import { PHONE_DISPLAY, PHONE_TEL } from "@/lib/site-config";

/**
 * Where a contact-form post without JavaScript lands when the route refused
 * it or could not save it (app/api/consultation/route.ts → reply). The
 * scripted form shows the exact reason inline; without scripting there is
 * no inline, so this page says what the form needs and gives the number.
 * Not indexed, not in the sitemap.
 */
export const metadata: Metadata = {
  title: "Request not sent",
  robots: { index: false, follow: false },
};

export default function ContactNotSentPage() {
  return (
    <div className="desk-compact">
      <section className="page-hero center compact">
        <div className="wrap">
          <div className="eyebrow">Talk with our team</div>
          <h1>We couldn&rsquo;t send that.</h1>
          <p className="sub" style={{ maxWidth: "60ch" }}>
            Please check that you added your name and a phone number or an
            email, then try again &mdash; or call us and we&rsquo;ll take it
            down over the phone.
          </p>
        </div>
      </section>
      <section className="sec sec-form">
        <div className="wrap form-solo">
          <div className="form-card form-done" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 4, padding: "30px 40px" }}>
            <p className="done-line">
              <Link className="btn btn-primary" href="/contact#send-a-message">Back to the form</Link>
            </p>
            <p className="done-line done-phones" data-link-location="confirmation">
              Or call <a href={`tel:${PHONE_TEL}`}>{PHONE_DISPLAY}</a>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
