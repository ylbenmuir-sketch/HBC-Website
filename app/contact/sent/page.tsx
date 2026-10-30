import type { Metadata } from "next";
import Link from "next/link";
import { PHONE_DISPLAY, PHONE_TEL } from "@/lib/site-config";

/**
 * Where a contact-form post without JavaScript lands (app/api/consultation/
 * route.ts → reply). The scripted form shows its own step three instead;
 * this page exists so a browser that never ran the bundle still sees that
 * the request went through. Not indexed, not in the sitemap.
 */
export const metadata: Metadata = {
  title: "Request sent",
  robots: { index: false, follow: false },
};

export default function ContactSentPage() {
  return (
    <div className="desk-compact">
      <section className="page-hero center compact">
        <div className="wrap">
          <div className="eyebrow">Talk with our team</div>
          <h1>Thanks. We&rsquo;ll reach out soon.</h1>
          <p className="sub" style={{ maxWidth: "60ch" }}>
            Your request is in. A real person from our team will be in touch.
          </p>
        </div>
      </section>
      <section className="sec sec-form">
        <div className="wrap form-solo">
          <div className="form-card form-done" style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 4, padding: "30px 40px" }}>
            <p className="done-line">Free call, no obligation.</p>
            <p className="done-line done-phones" data-link-location="confirmation">
              Want to talk now? <a href={`tel:${PHONE_TEL}`}>{PHONE_DISPLAY}</a>
            </p>
            <p className="micro" style={{ textAlign: "center" }}>
              <Link href="/">Back to the home page</Link>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
