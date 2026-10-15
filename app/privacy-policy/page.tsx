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
import { hubTrail, pageMetadata } from "@/lib/pages";
import {
  SMS_NO_SHARING_SENTENCE,
  SMS_OPT_IN_DATA_SENTENCE,
  SMS_TERMS_PATH,
} from "@/lib/sms-consent";
import { ANALYTICS_ENABLED } from "@/lib/analytics";
import Breadcrumbs from "@/components/Breadcrumbs";
import PageSchema from "@/components/PageSchema";

// Title, description and the page's content date live in lib/pages.ts.
export const metadata: Metadata = pageMetadata("/privacy-policy");

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
 * **Everything descriptive is read off the code** (rewritten from it
 * 2026-10-15, for the carriers' A2P review). The list of fields is the
 * contact form's two pages and the chat's booking steps; the emails are the
 * four in lib/lead-notification.ts; "Who else sees it" names every service
 * the code sends personal data to. The cookies paragraph follows the code:
 * no `document.cookie` or browser storage of the site's own, fonts
 * self-hosted by `next/font`, GA4 only while ANALYTICS_ENABLED, and YouTube
 * only after a click on the facade. Any of that changing makes this page
 * wrong, which is the point of writing it from the code rather than from a
 * template.
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
  const trail = hubTrail("/privacy-policy");
  const retention = verifiedOr(PRIVACY_RETENTION);
  const accessRequests = verifiedOr(PRIVACY_ACCESS_REQUESTS);

  return (
    <>
      <PageSchema path="/privacy-policy" breadcrumb={trail} />
      <Breadcrumbs trail={trail} />
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
              nothing to sign in to. Reading a page leaves us nothing about you
              beyond the ordinary technical record any web host keeps (see
              &ldquo;Who else sees it&rdquo;).
            </p>
            <p>
              <b>If you use the contact form</b>, the first page takes your full
              name, phone number and email address (all three required), which
              center you&rsquo;d prefer, when you&rsquo;d rather be called,
              whether you agree to texts &mdash; and if you do, the exact wording
              you agreed to and when &mdash; and the page you came from. The
              second page is up to you: who the call is for, the concerns you
              tap, anything you write in your own words, and who referred you.
            </p>
            <p>
              <b>If you ask for the guide</b>, we receive your email address and
              the page you were on. The guide opens right there on the page; we
              don&rsquo;t email it to you.
            </p>
            {FEATURE_ASSISTANT && (
              <p>
                <b>If you use the assistant</b> to ask for a call, it asks for
                the same things the form does: your name, phone number, email,
                center, who the call is for and what&rsquo;s going on, the best
                time, and whether we may text you. While a conversation is open,
                our server keeps its progress &mdash; your answers so far and
                where you are in it &mdash; in our database, and deletes it
                about an hour after your last message. A finished request is
                saved like a form request. Questions you ask outside of booking
                are sent to Anthropic, the company whose AI writes the
                assistant&rsquo;s answers, together with passages from this
                website, so it can answer them. The words of a conversation are
                not written to our logs.
              </p>
            )}
            <p>
              We never ask for payment details on this site, and there is
              nowhere here to enter them.
            </p>

            {/* Read off lib/lead-notification.ts and lib/email/templates.ts:
                four emails, and only these. */}
            <h2>Emails we send</h2>
            <p>
              <b>To you:</b> when you ask for a call and give an email address,
              one email confirming we got it, who will call, a link to a short
              video of what a first visit looks like, and our number. Asking
              for the guide sends you nothing.
            </p>
            <p>
              <b>To our team:</b> one email with your request, so the person who
              will call you has it &mdash; and, if you add details on the
              form&rsquo;s second page after that email has gone, one short
              follow-up with those details. A guide request sends our team your
              email address and the page you were on.
            </p>

            {/* THIS SECTION IS A CLAIM ABOUT THE BUILD, AND IT IS TRUE ONLY
                FOR AS LONG AS THE BUILD KEEPS IT TRUE.

                The analytics paragraph follows ANALYTICS_ENABLED (lib/
                analytics.ts) — the same constant that decides whether the
                GA4 tag renders — so the two cannot disagree. The video
                paragraph describes components/VideoEmbed.tsx: a poster from
                this origin, and youtube-nocookie.com only on a click. The
                browser-storage sentence follows FEATURE_ASSISTANT: the ask
                bar's one-time cue (components/StickyAskBar.tsx → CUE_KEY)
                is the site's only use of localStorage.

                Adding any other tag, pixel, widget, embed, or font, script or
                image from another origin falsifies it. Whoever does that edits
                this section in the SAME COMMIT. */}
            <h2>Cookies, analytics and video</h2>
            <p>
              This site itself sets no cookies. Its fonts and images are served
              from this site.
              {FEATURE_ASSISTANT
                ? " The one thing it stores in your browser is a note that you have already seen the “Ask us” nudge, so it is not shown again — it stays on your device and is never sent to us."
                : " It stores nothing in your browser."}
            </p>
            {ANALYTICS_ENABLED ? (
              <p>
                We use Google Analytics to count visits and see which pages
                people find useful. It sets cookies, and it sends Google the
                pages you view and general details about your browser and
                device. It never receives what you type into a form. There are
                no advertising tags or pixels here.
              </p>
            ) : (
              <p>
                There are no analytics or advertising tags here, and no pixel
                reporting your visit to anyone.
              </p>
            )}
            <p>
              Pages with a video show a still picture served from this site,
              and nothing loads from YouTube until you press play. Then the
              player loads from youtube-nocookie.com, YouTube&rsquo;s
              privacy-enhanced mode, and the video and its images come from
              YouTube (Google). From that moment YouTube may set cookies and
              note that the video was watched, under Google&rsquo;s own privacy
              policy. &ldquo;Get directions&rdquo; links open Google Maps on
              Google&rsquo;s own site.
            </p>

            <h2>What we do with it</h2>
            <p>
              We call you back about what you asked. That is the whole purpose
              &mdash; the form exists so a person can get in touch with you. A
              guide request tells us which guide was opened, and nothing
              follows from it.
            </p>
            <p>{INFORMATION_SHARING}</p>
            <p>
              Two of those are different promises and it is worth keeping them
              apart. Passing your information to another provider &mdash; a
              doctor, a therapist, anyone &mdash; happens only when you ask us
              to. Selling it does not happen at all. And being added to anything
              we send out later takes your say-so first.
            </p>

            {/* Read off the code like the rest: the consent columns are
                supabase/migrations/0005_sms_consent.sql, the sender is
                lib/sms-confirmation.ts. The two carrier sentences are single
                constants in lib/sms-consent.ts, each rendered as ONE JSX
                expression so each reaches the raw HTML unbroken (check:contact
                and the no-JavaScript fetch in the build log verify it). */}
            <h2>Text messages</h2>
            <p>
              We text you only if you agree to it &mdash; a box on the contact
              form, or a yes in the assistant &mdash; and we keep that yes, the
              exact wording you agreed to, and when you agreed. Texts are sent
              through Dialpad, the phone service our centers use. Reply STOP to
              any text to cancel, or HELP for help; the rest is in our{" "}
              <Link href={SMS_TERMS_PATH}>text message terms</Link>.
            </p>
            <p>{SMS_NO_SHARING_SENTENCE}</p>
            <p>{SMS_OPT_IN_DATA_SENTENCE}</p>

            {/* Every service lib/ and app/api send personal data to, by name:
                Vercel (hosting — app), Supabase (lib/consultation.ts,
                lib/chat/session.ts), Resend (lib/lead-notification.ts),
                Dialpad (lib/sms-confirmation.ts), Anthropic (lib/chat/
                answer.ts, assistant on only), Google (Analytics when on;
                YouTube on play), and the clinic's own system
                (lib/inquiry-intake.ts, only while it is switched on). */}
            <h2>Who else sees it</h2>
            <p>
              The people at Harmonized who would be calling you, and the
              services this website runs on:
            </p>
            <ul>
              <li>
                <b>Vercel</b> hosts the website. Every visit passes through its
                servers, which keep a standard technical record &mdash; your IP
                address, your browser, the page &mdash; for a limited time.
              </li>
              <li>
                <b>Supabase</b> stores what you send us, in a database only our
                own server can read.
              </li>
              <li>
                <b>Resend</b> delivers the emails above &mdash; the one to you
                and the ones to our team &mdash; so it handles what is in them.
              </li>
              <li>
                <b>Dialpad</b> sends text messages, only if you agreed to them.
              </li>
              {FEATURE_ASSISTANT && (
                <li>
                  <b>Anthropic</b> receives the questions you type into the
                  assistant, to write its answers.
                </li>
              )}
              {ANALYTICS_ENABLED && (
                <li>
                  <b>Google</b> receives page views through Google Analytics.
                </li>
              )}
              <li>
                <b>YouTube</b> (Google), only when you play a video.
              </li>
              <li>
                Our own front-desk system, when it is connected, receives a copy
                of a call request so the team can follow up from it.
              </li>
            </ul>
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
