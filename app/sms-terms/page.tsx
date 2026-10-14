import type { Metadata } from "next";
import Link from "next/link";
import FinalCTA from "@/components/FinalCTA";
import Breadcrumbs from "@/components/Breadcrumbs";
import ScannerText from "@/components/ScannerText";
import PageSchema from "@/components/PageSchema";
import { formatArticleDate } from "@/lib/resources";
import { getStaticPage, hubTrail, pageMetadata } from "@/lib/pages";
import {
  DBA_NAME,
  PRIVACY_PATH,
  SMS_FREQUENCY,
  SMS_HELP_STOP,
  SMS_PROGRAM_DESCRIPTION,
  SMS_RATES,
} from "@/lib/sms-consent";
import {
  DBA_SENTENCE,
  LEGAL_ENTITY,
  REGISTERED_ADDRESS,
  SUPPORT_PHONE,
} from "@/lib/sms-identity";

// Title, description and the page's content date live in lib/pages.ts.
export const metadata: Metadata = pageMetadata("/sms-terms");

/**
 * The text-message program's terms — the page every opt-in links to.
 *
 * ## Who reads this
 *
 * A carrier reviewer deciding the A2P 10DLC resubmission (lib/sms-consent.ts
 * has the rejection codes), with no account and possibly no JavaScript, who
 * needs to find: the program and what it sends, frequency, rates, HELP, STOP,
 * the carrier disclaimer, the privacy link, and the registered identity — and
 * a parent who ticked the box and wants to know what she agreed to. It is
 * written for the second and checked against the first.
 *
 * ## Rules
 *
 * - **Server-rendered, no `.rv`.** Nothing here waits on a script or an
 *   observer to be visible. (`.rv` is already safe without JS — it only hides
 *   under `html.js` — but a reviewer's screenshot tool runs JS and may not
 *   scroll, and this page has no reason to animate.)
 * - **The carrier phrases are the shared constants**, not retyped, so the
 *   page, the checkbox and the chat question say them identically. HELP and
 *   STOP are written out in sentences of their own here because this is where
 *   someone looks for what they do.
 * - **Indexed and in the sitemap** (lib/pages.ts). Never noindex it.
 * - **Every phrase a scanner matches is one text node**, built as a single
 *   template string: JSX that joins a constant to other text puts a
 *   `<!-- -->` between them in the HTML, and "Nashville, TN 37211" with
 *   comments inside it is not "Nashville, TN 37211" to a byte match. The
 *   lines carrying "&" go through ScannerText for the same reason.
 */
export default function SmsTermsPage() {
  const trail = hubTrail("/sms-terms");
  const updated = getStaticPage("/sms-terms").dateModified;
  const phoneLink = (
    <a href={`tel:${SUPPORT_PHONE.tel}`}>{SUPPORT_PHONE.display}</a>
  );

  return (
    <>
      <PageSchema path="/sms-terms" breadcrumb={trail} />
      <Breadcrumbs trail={trail} />
      <section className="page-hero center">
        <div className="wrap">
          <div className="eyebrow">Text messages</div>
          <h1>What our texts are, and how to stop them.</h1>
          <p className="sub" style={{ maxWidth: "58ch" }}>
            If you say yes, {DBA_NAME} will text you about the call you asked
            for and the appointments that follow. These are the terms of that,
            in plain words.
          </p>
        </div>
      </section>

      <section className="sec-tight">
        <div className="wrap article policy">
          <div className="meta">
            Last updated <time dateTime={updated}>{formatArticleDate(updated)}</time>
          </div>

          {/* The short version: all four carrier phrases, verbatim, in one
              line — what a reviewer is scanning for, before the detail. */}
          <p className="lede">
            <ScannerText text={`${SMS_FREQUENCY} ${SMS_RATES} ${SMS_HELP_STOP}`} />
          </p>

          <h2>The program</h2>
          <p>
            <b>{`${DBA_NAME} ${SMS_PROGRAM_DESCRIPTION}.`}</b>{" "}
            Texts from the center you chose: confirming we got your request,
            arranging the time of your call, details about your appointments,
            and answers to questions you&rsquo;ve asked us. That is the whole
            program &mdash; no promotions and no newsletters.
          </p>

          <h2>Who is texting you</h2>
          <address className="sms-identity">
            {DBA_SENTENCE}
            <br />
            {`${LEGAL_ENTITY}, doing business as ${DBA_NAME}`}
            <br />
            {REGISTERED_ADDRESS.street}
            <br />
            {`${REGISTERED_ADDRESS.locality}, ${REGISTERED_ADDRESS.region} ${REGISTERED_ADDRESS.postalCode}`}
            <br />
            Support: {phoneLink}
          </address>
          <p>
            The texts come from one of our centers&rsquo; phone lines, and a
            person at that center reads what you send back.
          </p>

          <h2>How you sign up</h2>
          <p>
            Only by asking. On the <Link href="/contact">contact form</Link>{" "}
            it&rsquo;s a box you tick, and it starts unticked. In the assistant
            on this site it&rsquo;s a question you answer yes to. Saying no
            changes nothing &mdash; we call you either way. Agreeing to texts is
            never a condition of a call, a visit, or anything you buy from us.
          </p>

          <h2>How often</h2>
          <p>
            {`${SMS_FREQUENCY} Usually that’s one text confirming your request, then whatever your call and your appointments need. We don’t text on a schedule.`}
          </p>

          <h2>What it costs</h2>
          <p>
            <ScannerText
              text={`We don’t charge for texts. ${SMS_RATES} Those are your mobile carrier’s normal charges, under your own plan.`}
            />
          </p>

          <h2>Getting help</h2>
          <p>
            Reply <b>HELP</b> to any of our texts for help, or call us at{" "}
            {phoneLink}.
          </p>

          <h2>Stopping the texts</h2>
          <p>
            Reply <b>STOP</b> to any of our texts to cancel. That ends our texts
            to that number; you may get one last text confirming it, and nothing
            after that. Stopping texts doesn&rsquo;t cancel your call or your
            appointments &mdash; if you still want those, we&rsquo;ll phone
            instead.
          </p>

          <h2>Carriers</h2>
          <p>Carriers are not liable for delayed or undelivered messages.</p>

          <h2>Your number and your privacy</h2>
          <p>
            Your phone number and your yes to texts are used for these messages
            and nothing else. We don&rsquo;t sell them, and we don&rsquo;t share
            them with anyone for their own marketing. The texts go out through
            Dialpad, the phone service our centers use. The rest is in our{" "}
            <Link href={PRIVACY_PATH}>Privacy Policy</Link>.
          </p>

          <h2>Changes to these terms</h2>
          <p>
            If these terms change, this page changes, and the date at the top
            changes with it.
          </p>
        </div>
      </section>

      <FinalCTA />
    </>
  );
}
