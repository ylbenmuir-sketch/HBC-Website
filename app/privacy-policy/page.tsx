import type { Metadata } from "next";
import Link from "next/link";
import FinalCTA from "@/components/FinalCTA";
import { formatArticleDate } from "@/lib/resources";
import {
  EMAIL_ADDRESS,
  FEATURE_ASSISTANT,
  INFORMATION_SHARING,
  PHONE_DISPLAY,
  PHONE_TEL,
  PRIVACY_ACCESS_REQUESTS,
  PRIVACY_EFFECTIVE_DATE,
  PRIVACY_RETENTION,
  SHOW_PHONE,
  SITE_NAME,
  verifiedOr,
} from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "What the Harmonized Brain Centers website collects, what happens to it, and who else sees it. Nothing you tell us goes anywhere unless you ask us to send it.",
};

/**
 * The approved access sentence with the address inside it made tappable.
 *
 * The copy stays one string in lib/site-config.ts — this does not compose a
 * sentence out of fragments, it finds the address in a sentence somebody
 * approved and wraps that substring in a `mailto:`. Two consequences worth
 * knowing: a build where EMAIL is unverified renders the phone-and-form
 * fallback, which contains no address, so `parts` is length 1 and the sentence
 * passes through untouched; and if the address is ever reformatted inside the
 * copy it degrades to plain text rather than breaking.
 *
 * The `<wbr>` after the "@" is not decoration. The address is one 32-character
 * word in a 272px column at 320px, and `check:layout` caught it running past
 * the viewport and being clipped; this offers the line a break at the one place
 * a reader would put it. `<wbr>` adds no character, so the address still copies
 * and still dials as itself.
 */
function withMailto(text: string) {
  const parts = text.split(EMAIL_ADDRESS);
  if (parts.length === 1) return text;
  const [mailbox, domain] = EMAIL_ADDRESS.split("@");
  return parts.flatMap((part, i) =>
    i === 0
      ? [part]
      : [
          <a key={i} href={`mailto:${EMAIL_ADDRESS}`}>
            {mailbox}@<wbr />
            {domain}
          </a>,
          part,
        ]
  );
}

/**
 * The privacy notice — a trust floor for a site that collects a name, a phone
 * number and an email into a database, and the destination for the legacy
 * site's `/privacy-policy/`, which will otherwise 404 on cutover
 * (SEO-AUDIT-2.md §2.5, §2.6).
 *
 * ## What this page is allowed to say
 *
 * Two rules, and between them they decided every sentence below.
 *
 * **Everything descriptive is read off the code.** The list of fields is the
 * contact form's own inputs and the columns in
 * supabase/migrations/0001_consultation_requests.sql. The "who else sees it"
 * section names the services those rows actually pass through. The cookies
 * paragraph says there are none because there are none — no analytics tag, no
 * advertising pixel, no `document.cookie`, no `localStorage`, and the fonts
 * are self-hosted by `next/font` rather than fetched from Google. Any of that
 * changing makes this page wrong, which is the point of writing it from the
 * code rather than from a template.
 *
 * **Everything promissory is gated.** Retention and the access/deletion
 * commitment are `Verifiable` values in lib/site-config.ts. Both are confirmed
 * now and both paragraphs render; the gates stay, because they are what keeps
 * this page unable to publish a promise nobody made. They are the two
 * sentences here a person could hold the practice to, and they shipped only
 * once somebody had actually decided them.
 *
 * Neither is implemented in code — there is no deletion job and no expiry on
 * the Supabase table. They describe a practice a person carries out. If that
 * changes, the constant and the mechanism move together.
 *
 * The access paragraph promises **no response time**: "within X days" is the
 * natural next clause and nobody has agreed to it. It now names three routes —
 * the email address Ben supplied, the phone, and the contact form — and the
 * address in it is **the only one this site publishes anywhere**; see the notes
 * on EMAIL and PRIVACY_ACCESS_REQUESTS before putting it in a second place.
 *
 * ## What it deliberately does not mention
 *
 * HIPAA, "compliance", and the practice's regulatory status — none of it,
 * anywhere, exactly as the note on INFORMATION_SHARING says. That framing is a
 * separate question Ben is reviewing, and a website privacy notice is not
 * where it gets settled by implication.
 */
export default function PrivacyPolicyPage() {
  const retention = verifiedOr(PRIVACY_RETENTION);
  const accessRequests = verifiedOr(PRIVACY_ACCESS_REQUESTS);

  return (
    <>
      <section className="page-hero center">
        <div className="wrap rv">
          <div className="eyebrow">Privacy</div>
          <h1>What happens to what you tell us.</h1>
          <p className="sub" style={{ maxWidth: "58ch" }}>
            {INFORMATION_SHARING}
          </p>
        </div>
      </section>

      <section className="sec-tight">
        <div className="wrap article policy">
          <div className="rv above-fold">
            <div className="meta">
              Last updated{" "}
              <time dateTime={PRIVACY_EFFECTIVE_DATE}>
                {formatArticleDate(PRIVACY_EFFECTIVE_DATE)}
              </time>
            </div>
            <p className="lede">
              This page is about the {SITE_NAME} website — what it collects when
              you fill something in, what we do with it, and who else can see
              it. It is written to be read, not to be survived.
            </p>
          </div>

          <div className="rv">
            <h2>What we collect</h2>
            <p>
              Nothing at all until you send it. There is no account to make and
              nothing to sign in to, and simply reading a page here leaves us
              with nothing about you.
            </p>
            <p>
              <b>If you use the contact form</b>, we receive your first name,
              phone number, and email address if you give one, along with who
              you&rsquo;re asking about, the concerns you tapped, which center
              you&rsquo;d prefer, when you&rsquo;d rather be called, anything
              you typed in the note, and which page you were on when you sent
              it.
            </p>
            <p>
              <b>If you ask for the guide</b>, we receive your email address and
              nothing else.
            </p>
            {FEATURE_ASSISTANT && (
              <p>
                <b>If you use the assistant</b>, what you type is sent to the
                service that produces the answer and is used for that. We do
                not keep a copy of the conversation.
              </p>
            )}
            <p>
              We never ask for payment details on this site, and there is
              nowhere here to enter them.
            </p>

            {/* THIS SECTION IS A CLAIM ABOUT THE BUILD, AND IT IS TRUE ONLY
                FOR AS LONG AS THE BUILD KEEPS IT TRUE.

                Adding an analytics tag, a Search Console verification script,
                an advertising pixel, a chat widget from a third party, a
                map embed, or any font, script or image loaded from another
                origin falsifies it. `SEO-AUDIT-2.md` §8.2 C9 asks for GA4 or a
                privacy-friendly equivalent, so this is a change somebody is
                going to make.

                Whoever makes it edits this section in the SAME COMMIT. Not the
                next one, not the follow-up ticket — a privacy notice that
                says "there are none" while a tag is live is worse than having
                had no privacy notice at all, and the gap between the two
                commits is exactly when it would be wrong. */}
            <h2>Cookies, analytics and tracking</h2>
            <p>
              There are none. This site sets no cookies, stores nothing in your
              browser, runs no analytics or advertising tags, and loads no
              fonts, scripts or images from anybody else&rsquo;s servers. There
              is no pixel here reporting your visit to a third party, because
              there is no third party involved in your visit.
            </p>

            <h2>What we do with it</h2>
            <p>
              We call you back, or we send you the guide. That is the whole
              purpose &mdash; the form exists so a person can get in touch with
              you about the thing you asked about.
            </p>
            <p>{INFORMATION_SHARING}</p>
            <p>
              Two of those are different promises and it is worth keeping them
              apart. Passing your information to another provider &mdash; a
              doctor, a therapist, anyone &mdash; happens only when you ask us
              to. Selling it does not happen at all. And being added to anything
              we send out later takes your say-so first.
            </p>

            <h2>Who else sees it</h2>
            <p>
              The people at Harmonized who would be calling you, and the
              services this website runs on. Submissions are stored in a
              database hosted by Supabase that only our own server can read,
              and an alert that a request has arrived may be sent to us by
              email. That alert carries no details &mdash; not your name, your
              phone number, your concerns or your note &mdash; only that
              something came in and where to look at it.
            </p>
            <p>
              Those services hold the information in order to run; they are not
              given it to use for anything of their own.
            </p>

            {retention && (
              <>
                <h2>How long we keep it</h2>
                <p>{retention}</p>
              </>
            )}

            <h2>If you tell us about your child</h2>
            <p>
              Parents are usually the ones filling the form in, and what you say
              about your child is handled exactly like anything else here: it
              goes nowhere unless you ask us to send it, it is never sold, and
              it is not used to market to anyone. This site is written for
              parents and adults, and is not directed at children.
            </p>

            {accessRequests && (
              <>
                <h2>Asking us about your information</h2>
                <p>{withMailto(accessRequests)}</p>
              </>
            )}

            {/* This section supplies the number and says who is on the other
                end. It deliberately does NOT restate the three routes — the
                approved access copy directly above already names them, and
                saying it twice in adjacent paragraphs is how a page starts
                reading like boilerplate. The email address in particular stays
                in that one paragraph: repeating it here would double the
                site's published-address count for a reader who has just read
                it one line up. */}
            <h2>Reaching a person about this</h2>
            <p>
              {SHOW_PHONE ? (
                <>
                  The number is{" "}
                  <b>
                    <a href={`tel:${PHONE_TEL}`}>{PHONE_DISPLAY}</a>
                  </b>
                  , and the <Link href="/contact">contact form</Link> reaches
                  the same people.
                </>
              ) : (
                <>
                  The <Link href="/contact">contact form</Link> reaches us.
                </>
              )}{" "}
              Either way a person reads it &mdash; there is nothing automated
              on the other end of this.
            </p>

            <h2>Changes to this page</h2>
            <p>
              If what we do changes, this page changes with it, and the date at
              the top changes too. It is the honest way to tell whether a notice
              like this has been looked at since it was written.
            </p>
          </div>
        </div>
      </section>

      <FinalCTA />
    </>
  );
}
