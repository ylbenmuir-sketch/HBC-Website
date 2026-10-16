import Link from "next/link";
import {
  HSA_FSA_ACCEPTED,
  PHONE_DISPLAY,
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
}: {
  heading?: string;
  sub?: string;
  /** Location pages pass `/contact?center=<slug>` to preselect their center. */
  href?: string;
}) {
  return (
    <section className="final">
      <div className="wrap rv">
        <div className="eyebrow">Talk with our team</div>
        <h2>{heading}</h2>
        <p className="sub">{sub}</p>
        <div className="row">
          <Link className="btn btn-invert" href={href}>
            Get a Free Call Today
          </Link>
          {SHOW_PHONE && (
            <div className="tel">
              or call <b>{PHONE_DISPLAY}</b>
            </div>
          )}
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
