"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PHONE_DISPLAY } from "@/lib/site-config";
import { trackEvent } from "@/lib/analytics";
import { firstName } from "@/lib/first-name";
import { FORM_CONSENT_PARTS, FORM_CONSENT_TEXT } from "@/lib/sms-consent";
import type { Video } from "@/lib/videos";
import VideoEmbed from "./VideoEmbed";
import ScannerText from "./ScannerText";

/**
 * The contact form, in three steps.
 *
 *   1. **Request your free call** — name (first and last, one field), phone,
 *      email, preferred center, best time. All but the time are required.
 *      Submit saves the row and sends the lead email at once. That email is
 *      the lead; nothing after this step is needed for the office to make
 *      the call.
 *   2. **Context** — who the call is for, what's bringing them in, a note.
 *      PATCHes the row step one created (one lead, one record). Presented
 *      as part of the process, not as something skippable: no "these are
 *      optional" panel, no ghost button. The exit is a quiet "Skip for now"
 *      text link under the save button — someone who will not answer must
 *      still be able to leave, they are just not invited to (Ben,
 *      2026-10-13). Both exits land on step three.
 *   3. **The video** — "while you wait for our call, here's what a first
 *      visit looks like", with the confirmation, the what-happens-next
 *      steps, what is helpful to have ready, and both centers' numbers
 *      beneath it. The page has no second column; this card is the page.
 *
 * The order is the point. The old single form asked "who are we helping?"
 * and "what's bringing you in?" before it asked for a phone number, so a
 * parent who got as far as the chips and stopped left nothing behind. Now
 * the ask is first and short, and everything else is asked of someone whose
 * call is already requested.
 *
 * ## The name
 *
 * One field, first and last, stored whole (the `first_name` column and wire
 * key predate the change and still carry it). Every greeting — the step-two
 * headline, the step-three thank-you, the confirmation text — uses the first
 * word only (lib/first-name.ts): "Hi Ben," not "Hi Ben Muir,".
 *
 * ## Texts are opt-in
 *
 * Step one carries the one consent point for texts on the form: a checkbox
 * under the phone and email row, unchecked, with every disclosure the carriers require in its own label
 * (lib/sms-consent.ts) and the request going through whether or not it is
 * ticked. Unticked means no text at all — not even the confirmation. The
 * route records the wording shown and, on a yes, the time.
 *
 * ## Step two never shows before the row exists
 *
 * Step one's response carries the row id. Without one — the row failed to
 * save but the email or the platform took the lead, so the visitor still
 * hears "received" — there is no row to add to, and the form goes straight
 * to step three. The context questions are not worth a second insert.
 *
 * ## The reveal gate
 *
 * Steps two and three mount after the observer that reveals `.rv` elements
 * ran for this route. components/RevealOnScroll.tsx watches the DOM for
 * exactly this (the MutationObserver there), so a late-mounting panel is
 * observed when it arrives rather than staying at opacity 0 — the bug that
 * once made the guide form's success state invisible. Each panel also
 * scrolls itself into view and takes focus on its heading: the viewport may
 * be sitting at the bottom of the form that just vanished, and a screen
 * reader needs to be told where the page went.
 */

const HELPING_OPTIONS = ["Myself", "My child", "Someone else"];
const CONCERN_OPTIONS = [
  "Focus & ADHD",
  "Anxiety & stress",
  "Sleep",
  "Emotional regulation",
  "School struggles",
  "Brain fog",
  "Something else",
];
// "Not sure yet" leads the list and is the default, so a visitor who skips the
// question is not silently filed under Nashville — unsure leads go to the
// default inbox and text from the default line (lib/center-routing.ts).
// Location pages override the default via ?center= (see CENTER_BY_SLUG).
//
// No Franklin option (Ben, 2026-10-13). There was a "Franklin waitlist" entry;
// it is gone because someone interested in Franklin should book Nashville or
// Murfreesboro now, not wait — a Franklin line here cost a booking today. The
// Franklin page says the same and sends its visitors to this form with no
// center preselected. Do not add it back as a waitlist, a "notify me", or an
// email capture; it returns as a plain center the day the doors open.
const CENTER_OPTIONS = [
  "Not sure yet",
  "Nashville",
  "Murfreesboro",
  "Concierge / at home",
];
// "Any time" first and default: the question is optional, and an answer that
// says so is better than a window the visitor did not actually choose.
const TIME_OPTIONS = ["Any time", "Mornings", "Afternoons", "Evenings"];

/**
 * `?center=<slug>` → the matching option. Location pages link here with their
 * own slug so a visitor who came from /locations/murfreesboro sees
 * Murfreesboro preselected instead of "Not sure yet" — and the lead then
 * routes to the Murfreesboro inbox (lib/lead-routing.ts). Unknown or
 * absent values leave the default alone.
 */
const CENTER_BY_SLUG: Record<string, string> = {
  nashville: "Nashville",
  murfreesboro: "Murfreesboro",
  concierge: "Concierge / at home",
};

export type CenterPhone = { name: string; phone: { display: string; tel: string } };

const CARD_STYLE = {
  background: "#fff",
  border: "1px solid var(--line)",
  borderRadius: 4,
  padding: "30px 40px",
} as const;

const OPTIONAL_STYLE = {
  color: "var(--slate)",
  textTransform: "none",
  letterSpacing: 0,
  fontWeight: 400,
} as const;

/**
 * The "what happens next" steps (contact.html), under the thank-you on step
 * three. The page used to repeat them in a second column beside the form;
 * that column is gone (Ben, 2026-10-13), so this is now the one place they
 * appear, under step three's H3 — hence the H4 default. The prop stays so a
 * future caller at a different depth does not produce a heading skip.
 */
function WhatHappensNext({
  headingLevel: H = "h4",
}: {
  headingLevel?: "h3" | "h4";
}) {
  return (
    <div className="lens-seq" style={{ marginTop: 22 }}>
      <div className="row">
        <div className="n">1</div>
        <div>
          <H>We call you</H>
          <p>
            A real person from your nearest center, at the time you chose.
          </p>
        </div>
      </div>
      <div className="row">
        <div className="n">2</div>
        <div>
          <H>We listen, then answer</H>
          <p>
            What&rsquo;s going on, what you&rsquo;ve tried, and every question
            you have — including the skeptical ones.
          </p>
        </div>
      </div>
      <div className="row">
        <div className="n">3</div>
        <div>
          <H>You decide</H>
          <p>
            Book your Brain Map, think it over, or decide it&rsquo;s not for
            you. The call is free either way.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * A step panel that announces itself. Mounts, scrolls to its own top (under
 * the sticky header — see `.form-step` in globals.css) and moves focus to its
 * heading, so a keyboard or screen-reader user lands on the new step and a
 * sighted one is not left looking at the space below where the form was.
 *
 * The heading is an H2: the card sits directly under the page's H1, and an
 * H3 here was a heading-order skip (axe, Lighthouse). Sized to the H3 scale
 * by hand so the card does not shout.
 */
function StepPanel({
  eyebrow,
  heading,
  children,
  className = "",
}: {
  eyebrow: string;
  heading: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    panel.current?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
    title.current?.focus({ preventScroll: true });
  }, []);
  return (
    <div ref={panel} className={`rv form-card form-step ${className}`.trim()} style={CARD_STYLE}>
      <div className="eyebrow">{eyebrow}</div>
      <h2
        ref={title}
        tabIndex={-1}
        style={{ margin: "18px 0 10px", fontSize: 26, fontWeight: 600, lineHeight: 1.2 }}
      >
        {heading}
      </h2>
      {children}
    </div>
  );
}

export default function ContactForm({
  bookingUrl = null,
  centerPhones = [],
  video,
}: {
  /**
   * A self-scheduling page (Google Calendar appointment schedule) where she
   * can pick her own callback slot. Shown on step three only; the form itself
   * stays the one ask. Comes from the server page, which reads
   * BOOKING_CALENDAR_URL — unset means the link does not render.
   */
  bookingUrl?: string | null;
  /** Both open centers' own lines, from the server page (lib/locations.ts). */
  centerPhones?: CenterPhone[];
  /** The first-visit video for step three (lib/videos.ts). */
  video: Video;
}) {
  const pathname = usePathname();

  // Step one.
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [preferredCenter, setPreferredCenter] = useState(CENTER_OPTIONS[0]);
  const [bestTime, setBestTime] = useState(TIME_OPTIONS[0]);
  // Unchecked by default, and never required (lib/sms-consent.ts).
  const [smsConsent, setSmsConsent] = useState(false);
  // The honeypot. Real visitors never see this field and so always submit it
  // empty; scripted spam fills every input it finds. The value is passed
  // straight through to the platform, which classifies it — nothing on the
  // site rejects a submission because of it.
  const [website, setWebsite] = useState("");

  // Step two. Nothing pre-selected: an answer the visitor did not give is not
  // an answer, and "My child" as a default was filing adults under it.
  const [helpingWho, setHelpingWho] = useState<string | null>(null);
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const [step, setStep] = useState<"one" | "two" | "three">("one");
  const [rowId, setRowId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  // Step two failed to save: said once on step three, quietly — the call is
  // requested either way, and that is the sentence that matters.
  const [detailsFailed, setDetailsFailed] = useState(false);

  // Read on mount (not via useSearchParams) so the form still prerenders.
  useEffect(() => {
    const slug = new URLSearchParams(window.location.search)
      .get("center")
      ?.trim()
      .toLowerCase();
    const match = slug ? CENTER_BY_SLUG[slug] : undefined;
    if (match) setPreferredCenter(match);
  }, []);

  const toggleConcern = (c: string) =>
    setSelectedConcerns((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );

  /* ── Step one: save the callback, send the lead ─────────────────────── */
  async function requestCall(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !email.trim()) {
      setErrorMessage("Please add your name, phone number and email so we can reach you.");
      setStatus("error");
      return;
    }
    // The same loose shape the route checks — a sanity check, not RFC 5322.
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setErrorMessage("That email address doesn't look right — please check it.");
      setStatus("error");
      return;
    }
    setStatus("submitting");
    setErrorMessage("");
    // Read at submit time (not via useSearchParams) so the form prerenders.
    const from = new URLSearchParams(window.location.search).get("from");
    try {
      const res = await fetch("/api/consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // The whole name. The key is the column's name, from before the
          // field asked for first and last together.
          first_name: fullName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          preferred_center: preferredCenter,
          best_time: bestTime,
          website,
          source_page: from || pathname,
          sms_consent: smsConsent,
          // The wording beside the box, sent ticked or not — the row keeps
          // what she was offered, not only what she said.
          sms_consent_text: FORM_CONSENT_TEXT,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; id?: string | null; error?: string }
        | null;
      if (!res.ok) throw new Error(data?.error ?? "Something went wrong.");

      // The conversion event — the coarse choices and the page, never the
      // name, phone or email. A no-op until GA4 is configured. Fires here,
      // when the lead exists, not after the optional step.
      trackEvent({
        name: "generate_lead",
        params: {
          form: "consultation",
          source_page: from || pathname,
          preferred_center: preferredCenter,
        },
      });

      setStatus("idle");
      // The lead landed. Step two needs a row to add to; without an id (the
      // row did not save but another destination took the request) there is
      // nothing to PATCH, and she goes straight to the video.
      if (typeof data?.id === "string" && data.id) {
        setRowId(data.id);
        setStep("two");
      } else {
        setStep("three");
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error && err.message !== "Failed to fetch"
          ? err.message
          : "We couldn't send your request. Please try again, or call us."
      );
      setStatus("error");
    }
  }

  /* ── Step two: add to the saved row, or don't ──────────────────────── */
  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    const trimmedNote = note.trim();
    const nothingToSave = !helpingWho && selectedConcerns.length === 0 && !trimmedNote;
    if (nothingToSave || !rowId) {
      setStep("three");
      return;
    }
    setStatus("submitting");
    try {
      const res = await fetch(`/api/consultation/${rowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(helpingWho ? { helping_who: helpingWho } : {}),
          ...(selectedConcerns.length > 0 ? { concerns: selectedConcerns } : {}),
          ...(trimmedNote ? { note: trimmedNote } : {}),
        }),
      });
      if (!res.ok) setDetailsFailed(true);
    } catch {
      setDetailsFailed(true);
    }
    // Either way: the call is requested, and the next thing she sees says so.
    setStatus("idle");
    setStep("three");
  }

  // For greetings only — "Hi Ben," never "Hi Ben Muir,".
  const name = firstName(fullName);

  /* ── Step three ─────────────────────────────────────────────────────── */
  if (step === "three") {
    return (
      <StepPanel
        eyebrow="Your call is requested"
        heading={
          <>
            While you wait for our call — here&rsquo;s what a first visit
            actually looks like.
          </>
        }
      >
        <p className="video-lead" style={{ color: "var(--slate)", fontSize: 15.5 }}>
          Nothing to decide yet. This is the visit itself, as it happens.
        </p>
        <VideoEmbed video={video} sizes="(max-width: 1060px) calc(100vw - 48px), 600px" />

        <div style={{ marginTop: 34 }}>
          <h3 style={{ margin: "0 0 6px", fontFamily: "var(--sans)", fontSize: 16.5, fontWeight: 600, lineHeight: 1.65, color: "var(--navy)" }}>
            Thank you{name ? `, ${name}` : ""}. Here&rsquo;s what happens next.
          </h3>
          {detailsFailed && (
            <p className="micro" style={{ marginTop: 4 }}>
              We couldn&rsquo;t save the extra details just now, but your call
              is already requested — we&rsquo;ll ask when we talk.
            </p>
          )}
          <WhatHappensNext headingLevel="h4" />
          {/* Not a duplicate of the steps: the one thing the old second
              column said that nothing else on the page did. It makes the
              call better, so it stays (Ben, 2026-10-13). */}
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

        {bookingUrl && (
          <div style={{ marginTop: 30 }}>
            <a
              className="btn btn-primary"
              href={bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ width: "100%" }}
            >
              Pick a time for your call
            </a>
            <p className="micro" style={{ textAlign: "center" }}>
              Optional — choose the slot that suits you and we&rsquo;ll call
              then. Otherwise we&rsquo;ll reach out at the time you picked.
            </p>
          </div>
        )}

        <div className="note-sage" style={{ marginTop: 30 }}>
          Prefer to talk sooner? Call the center closer to you &mdash; a real
          person answers during business hours.
          <div style={{ marginTop: 8 }}>
            {centerPhones.length > 0 ? (
              centerPhones.map(({ name: center, phone: line }) => (
                <div key={center}>
                  {center} &mdash;{" "}
                  <a href={`tel:${line.tel}`}>
                    <b>{line.display}</b>
                  </a>
                </div>
              ))
            ) : (
              <b>{PHONE_DISPLAY}</b>
            )}
          </div>
        </div>
      </StepPanel>
    );
  }

  /* ── Step two ───────────────────────────────────────────────────────── */
  if (step === "two") {
    return (
      <StepPanel
        eyebrow="Request received"
        heading={
          <>
            {name ? `Hi ${name}, your` : "Your"} call is requested. A few
            questions help us prepare for it.
          </>
        }
      >
        {/* No "these questions are optional" panel here, on purpose: the
            lead is already saved and delivered before this renders, but the
            questions should read as part of the process. The exit is the
            quiet link under the button, not an invitation. */}
        <form className="form" onSubmit={saveDetails} noValidate>
          <label id="helping-label">Who are we helping?</label>
          <div className="chips" role="radiogroup" aria-labelledby="helping-label">
            {HELPING_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                role="radio"
                aria-checked={helpingWho === opt}
                className={`chip${helpingWho === opt ? " on" : ""}`}
                onClick={() => setHelpingWho(opt)}
              >
                {opt}
              </button>
            ))}
          </div>

          <label id="concerns-label">
            What&rsquo;s bringing you in?{" "}
            <span style={OPTIONAL_STYLE}>(choose any)</span>
          </label>
          <div className="chips" aria-labelledby="concerns-label">
            {CONCERN_OPTIONS.map((opt) => (
              <button
                key={opt}
                type="button"
                aria-pressed={selectedConcerns.includes(opt)}
                className={`chip${selectedConcerns.includes(opt) ? " on" : ""}`}
                onClick={() => toggleConcern(opt)}
              >
                {opt}
              </button>
            ))}
          </div>

          <label htmlFor="note">In your own words</label>
          <textarea
            id="note"
            placeholder="Mornings are hard, homework is a battle, and he's starting to say he's 'just bad at school'…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            aria-describedby="note-hint"
          />
          <p id="note-hint" className="micro" style={{ marginTop: 8 }}>
            Please avoid sharing detailed medical information here.
          </p>

          <div className="form-exits">
            <button
              className="btn btn-primary"
              type="submit"
              disabled={status === "submitting"}
            >
              {status === "submitting" ? "Saving…" : "Save these details"}
            </button>
            {/* The exit. Small and low-contrast by design — present for
                the person who will not answer, not offered to everyone. */}
            <button
              className="form-skip"
              type="button"
              onClick={() => setStep("three")}
              disabled={status === "submitting"}
            >
              Skip for now
            </button>
          </div>
        </form>
      </StepPanel>
    );
  }

  /* ── Step one ───────────────────────────────────────────────────────── */
  return (
    <form
      className="form form-compact rv form-card"
      style={CARD_STYLE}
      onSubmit={requestCall}
      noValidate
    >
      <div className="eyebrow">Request your free call</div>

      {/* One name field, first and last, on its own row: a full name needs
          the width, and phone and email pair naturally beneath it. */}
      <label htmlFor="name">Your name</label>
      <input
        id="name"
        name="name"
        placeholder="Sarah Mitchell"
        autoComplete="name"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        required
      />

      <div className="two">
        <div>
          <label htmlFor="phone">Phone</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            placeholder="(615) 555-0134"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="sarah@example.com"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
      </div>

      {/* Text-message consent, directly under the phone number it is about —
          compliance scanners weight how close the consent sits to the number
          input, and a reader should not have to connect the two across the
          center and time row. Everything a carrier reviewer looks for is in
          the label itself; the links are to the full terms, not to the
          disclosures. They open a new tab so a half-filled form is not lost
          to reading them. Server-rendered with the rest of step one, so it is
          in the raw HTML a scanner fetches. */}
      <div className="sms-consent">
        <input
          id="sms-consent"
          name="sms_consent"
          type="checkbox"
          checked={smsConsent}
          onChange={(e) => setSmsConsent(e.target.checked)}
        />
        <label htmlFor="sms-consent">
          {FORM_CONSENT_PARTS.map((part, i) =>
            // ScannerText: the "&" in "Msg & data rates" reaches the raw
            // HTML as itself, for scanners that match bytes.
            typeof part === "string" ? (
              <ScannerText key={i} text={part} />
            ) : (
              <a key={i} href={part.href} target="_blank" rel="noopener">
                {part.label}
              </a>
            )
          )}
        </label>
      </div>

      <div className="two">
        <div>
          <label htmlFor="preferred-center">Preferred center</label>
          <select
            id="preferred-center"
            value={preferredCenter}
            onChange={(e) => setPreferredCenter(e.target.value)}
          >
            {CENTER_OPTIONS.map((opt) => (
              <option key={opt}>{opt}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="best-time">
            Best time to call <span style={OPTIONAL_STYLE}>(optional)</span>
          </label>
          <select
            id="best-time"
            value={bestTime}
            onChange={(e) => setBestTime(e.target.value)}
          >
            {TIME_OPTIONS.map((opt) => (
              <option key={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      {/*
        Hidden from real users three ways, because one is not reliable:
        off-screen (not display:none, which some bots skip), out of the tab
        order, and hidden from assistive tech. Left in the DOM and left
        submitting, because a honeypot only works if a bot can find it.
      */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          clipPath: "inset(50%)",
          whiteSpace: "nowrap",
        }}
      >
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {status === "error" && (
        <p
          role="alert"
          style={{ color: "#9a3b2e", fontSize: 14.5, marginTop: 16 }}
        >
          {errorMessage}
        </p>
      )}

      <button
        className="btn btn-primary"
        style={{ width: "100%", marginTop: 16 }}
        type="submit"
        disabled={status === "submitting"}
      >
        {status === "submitting" ? "Sending…" : "Request my free call"}
      </button>
      {/* The privacy link sits here, on the sentence that is already about
          what happens to what she sends us, rather than in a separate line of
          fine print. This is the one form on the site that collects a name
          and a phone number, so it is the one place a person might reasonably
          want to check before pressing the button — and the footer is a long
          way from a submit button. */}
      <p className="micro" style={{ textAlign: "center" }}>
        No payment details, no intake forms today. We never share your
        information, and there&rsquo;s no obligation after we talk.{" "}
        <Link href="/privacy-policy">What happens to what you tell us</Link>.
      </p>
    </form>
  );
}

export { WhatHappensNext };
