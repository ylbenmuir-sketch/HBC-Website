import Link from "next/link";
import {
  PHONE_DISPLAY,
  RESPONSE_TIME_NOTE,
  RESPONSE_TIME_TAG,
} from "@/lib/site-config";

const DEFAULT_HEADING = "The next step is a conversation, not a commitment.";
const DEFAULT_SUB =
  "Tell us what’s going on. We’ll listen, answer honestly, and help you decide whether LENS is a fit — free, and with no obligation.";

/** The navy end-of-page band. Heading/sub vary per mockup; everything else is fixed. */
export default function FinalCTA({
  heading = DEFAULT_HEADING,
  sub = DEFAULT_SUB,
}: {
  heading?: string;
  sub?: string;
}) {
  return (
    <section className="final">
      <div className="wrap rv">
        <div className="eyebrow">Talk with our team</div>
        <h2>{heading}</h2>
        <p className="sub">{sub}</p>
        <div className="row">
          <Link className="btn btn-invert" href="/contact">
            Talk With Our Team
          </Link>
          <div className="tel">
            or call <b>{PHONE_DISPLAY}</b>
          </div>
        </div>
        <p className="after">
          {RESPONSE_TIME_NOTE}{" "}
          <span style={{ letterSpacing: ".1em" }}>{RESPONSE_TIME_TAG}</span>{" "}
          &middot; Consultations are free &middot; No referral needed
        </p>
      </div>
    </section>
  );
}
