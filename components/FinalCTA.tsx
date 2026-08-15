import Link from "next/link";
import ConfirmTag from "./ConfirmTag";
import {
  PHONE_DISPLAY,
  SAME_DAY_CALLBACK,
  SHOW_PHONE,
  verifiedOr,
} from "@/lib/site-config";

const DEFAULT_HEADING = "The next step is a conversation, not a commitment.";
const DEFAULT_SUB =
  "Tell us what’s going on. We’ll listen, answer honestly, and tell you plainly whether LENS is a fit — on the phone, before you book anything.";

/** The navy end-of-page band. Heading/sub vary per mockup; everything else is fixed. */
export default function FinalCTA({
  heading = DEFAULT_HEADING,
  sub = DEFAULT_SUB,
}: {
  heading?: string;
  sub?: string;
}) {
  // The same-day promise replaces the older response-time wording here; both
  // describe the callback, and the two would contradict each other side by
  // side. Still gated, so production drops it until it is confirmed.
  const sameDayCallback = verifiedOr(SAME_DAY_CALLBACK);
  return (
    <section className="final">
      <div className="wrap rv">
        <div className="eyebrow">Talk with our team</div>
        <h2>{heading}</h2>
        <p className="sub">{sub}</p>
        <div className="row">
          <Link className="btn btn-invert" href="/contact">
            Get a Free Call Today
          </Link>
          {SHOW_PHONE && (
            <div className="tel">
              or call <b>{PHONE_DISPLAY}</b>
            </div>
          )}
        </div>
        <p className="after">
          The call is free &middot; No referral needed
          {sameDayCallback && (
            <>
              {" "}
              &middot; {sameDayCallback}{" "}
              <ConfirmTag>{SAME_DAY_CALLBACK.note!}</ConfirmTag>
            </>
          )}
        </p>
      </div>
    </section>
  );
}
