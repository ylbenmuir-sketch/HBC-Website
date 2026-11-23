import Link from "next/link";
import {
  HSA_FSA_ACCEPTED,
  PHONE_DISPLAY,
  PHONE_TEL,
  RISK_REVERSAL,
  SHOW_PHONE,
} from "@/lib/site-config";

const DEFAULT_HEADING = "Talk to us first. No commitment.";
const DEFAULT_SUB =
  "Tell us what’s going on. We’ll listen, answer honestly, and tell you plainly whether LENS is a fit — on the phone, before you book anything.";

/** The navy end-of-page band. Heading/sub vary per mockup; everything else is fixed. */
export default function FinalCTA({
  heading = DEFAULT_HEADING,
  sub = DEFAULT_SUB,
  href = "/contact",
  contactLinks = false,
}: {
  heading?: string;
  sub?: string;
  /** Location pages pass `/contact?center=<slug>` to preselect their center. */
  href?: string;
  /**
   * The homepage's closing band (Ben, 2026-11-22): the number is a call link
   * with a text link beside it, reporting contact_link_click with location
   * "home_final". Everywhere else the number stays plain text, as it was.
   */
  contactLinks?: boolean;
}) {
  return (
    <section className="final">
      <div className="wrap rv">
        <div className="eyebrow">Talk with our team</div>
        <h2>{heading}</h2>
        <p className="sub">{sub}</p>
        <div className="row">
          <Link className="btn btn-invert" href={href}>
            Get Started
          </Link>
          {SHOW_PHONE &&
            (contactLinks ? (
              <div className="tel tel-links" data-link-location="home_final">
                or call <a href={`tel:${PHONE_TEL}`}>{PHONE_DISPLAY}</a>
                {" · "}
                <a href={`sms:${PHONE_TEL}`}>text us</a>
              </div>
            ) : (
              <div className="tel">
                or call <b>{PHONE_DISPLAY}</b>
              </div>
            ))}
        </div>
        <p className="after">{RISK_REVERSAL}</p>
        <p className="after" style={{ marginTop: 10 }}>
          {/* The third item was "A real person calls you back soon" until
              Ben swapped it for HSA/FSA (2026-10-16). */}
          The call is free &middot; No referral needed &middot;{" "}
          {/* One unit when the strip wraps on phones. */}
          <span style={{ whiteSpace: "nowrap" }}>{HSA_FSA_ACCEPTED}</span>
        </p>
      </div>
    </section>
  );
}
