"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PHONE_DISPLAY, PHONE_TEL } from "@/lib/site-config";
import { CONTACT_METHOD_LABELS, type ContactMethod } from "@/lib/contact-method";
import {
  consultationSaved,
  trackFunnel,
  trackLeadSaved,
  type Step1ErrorReason,
  type Step2SkipMethod,
} from "@/lib/analytics";
import { firstName } from "@/lib/first-name";
import { capitalizeName } from "@/lib/name-case";
import { FORM_CONSENT_PARTS, FORM_CONSENT_TEXT } from "@/lib/sms-consent";
import {
  HEARD_ABOUT_OPTIONS,
  TIME_OPTIONS,
  isReferral,
  looksLikeEmail,
  looksLikeUsPhone,
} from "@/lib/lead-options";
import type { Video } from "@/lib/videos";
import VideoEmbed from "./VideoEmbed";
import ScannerText from "./ScannerText";

/**
 * The contact form, in three steps.
 *
 *   1. **The request** (Ben, 2026-10-26) — first name, a phone OR an email
 *      (either one; the phone in any common US format), the center
 *      (Nashville · Murfreesboro · Not sure, nothing preselected), and two
 *      optional lines: "Who referred you?" and "Anything we should know?".
 *      Nothing else is asked before the lead exists. "Send My Request" saves
 *      the row and starts the office's email (held so it can carry step two —
 *      lib/held-notification.ts: it goes on Save, on Skip, or at two
 *      minutes, whichever is first).
 *
 *      Why this short: leads fell ~75% after launch. The old WordPress form
 *      took a name, a phone or an email, a location, "How did you hear about
 *      us?" and an optional message; the new one asked for a full name, a
 *      phone AND an email and a Call/Text/Email choice before anything was
 *      saved. About three in four old leads were referrals (doctors,
 *      providers, friends) who typed who sent them, so the referral line is
 *      on step one.
 *   2. **Optional details** — "Got it — we'll reach out soon. A few optional
 *      details help us prepare:" who it's for, what's going on, best time,
 *      best way to reach them, the text-message consent (only when a phone
 *      was given), and how they heard about us — with "Who referred you?"
 *      again when a referral is chosen and step one's line was blank. PATCHes
 *      the same row. "Skip for now" releases the held email at once.
 *   3. **The confirmation** — "Thanks, Ben. We'll reach out soon.", the
 *      first-visit video, "Free call, no obligation." and both centers'
 *      numbers. It has to fit a 390×844 phone screen without scrolling.
 *
 * ## Texts are opt-in
 *
 * The one consent point for texts on the form is the step-two checkbox,
 * shown only when a phone was given: unchecked, the wording unchanged
 * (lib/sms-consent.ts), and nothing is texted unless it is ticked — not even
 * the confirmation. The route records the wording shown and, on a yes, the
 * time; the confirmation text goes on that yes.
 *
 * ## The funnel
 *
 * contact_view (mount), form_start (first focus in step one),
 * step1_submit_attempt, step1_success (+ the Key event submit_lead_form and
 * generate_lead), step1_error {reason}, step2_success, step2_skipped
 * {method} — lib/analytics.ts. Fired here, so any page that embeds the form
 * reports the same steps.
 *
 * ## The reveal gate
 *
 * Steps two and three mount after the observer that reveals `.rv` elements
 * ran for this route. components/RevealOnScroll.tsx watches the DOM for
 * exactly this (the MutationObserver there), so a late-mounting panel is
 * observed when it arrives rather than staying at opacity 0. Each panel also
 * scrolls itself into view and takes focus on its heading.
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

/**
 * The centers, as chips. Required, nothing preselected (Ben, 2026-10-26).
 * "Not sure" saves as "Not sure yet" — the value the chat and the router
 * already use for unsure (lib/consultation.ts → CENTER_UNSPECIFIED).
 *
 * No Franklin option (Ben, 2026-10-13): someone interested in Franklin should
 * book Nashville or Murfreesboro now, not wait. It returns as a plain center
 * the day the doors open.
 */
type CenterChoice = { id: string; label: string; value: string };
const CENTER_CHOICES: CenterChoice[] = [
  { id: "nashville", label: "Nashville", value: "Nashville" },
  { id: "murfreesboro", label: "Murfreesboro", value: "Murfreesboro" },
  { id: "not-sure", label: "Not sure", value: "Not sure yet" },
];
/** Shown only when the concierge page sends a visitor here, so a home-visit
 *  request still routes to the concierge inbox. */
const CONCIERGE_CHOICE: CenterChoice = { id: "concierge", label: "Concierge / at home", value: "Concierge / at home" };

/**
 * `?center=<slug>` → that center preselected. Location pages link here with
 * their own slug; the lead then routes to that center's inbox
 * (lib/lead-routing.ts). Unknown or absent values leave nothing chosen.
 */
const CENTER_BY_SLUG: Record<string, CenterChoice> = {
  nashville: CENTER_CHOICES[0],
  murfreesboro: CENTER_CHOICES[1],
  concierge: CONCIERGE_CHOICE,
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
 * A step panel that announces itself. Mounts, scrolls to its own top (under
 * the sticky header — see `.form-step` in globals.css) and moves focus to its
 * heading, so a keyboard or screen-reader user lands on the new step and a
 * sighted one is not left looking at the space below where the form was.
 *
 * The heading is an H2: the card sits directly under the page's H1.
 */
function StepPanel({
  eyebrow,
  heading,
  children,
  className = "",
}: {
  eyebrow?: string;
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
      {eyebrow && <div className="eyebrow">{eyebrow}</div>}
      <h2
        ref={title}
        tabIndex={-1}
        style={{
          margin: eyebrow ? "18px 0 10px" : "0 0 18px",
          fontSize: 26,
          fontWeight: 600,
          lineHeight: 1.2,
        }}
      >
        {heading}
      </h2>
      {children}
    </div>
  );
}

/** A row of single-choice chips (role=radio buttons). */
function ChoiceChips<T extends string>({
  labelId,
  idPrefix,
  options,
  value,
  onChange,
  required = false,
}: {
  labelId: string;
  idPrefix: string;
  options: Array<{ id: string; label: string; value: T }>;
  value: T | null;
  onChange: (v: T) => void;
  required?: boolean;
}) {
  return (
    <div
      className="chips reach-chips"
      role="radiogroup"
      aria-labelledby={labelId}
      aria-required={required || undefined}
    >
      {options.map((o) => (
        <button
          key={o.id}
          id={`${idPrefix}-${o.id}`}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={`chip${value === o.value ? " on" : ""}`}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function ContactForm({
  centerPhones = [],
  video,
}: {
  /** Both open centers' own lines, from the server page (lib/locations.ts). */
  centerPhones?: CenterPhone[];
  /** The first-visit video for step three (lib/videos.ts). */
  video: Video;
}) {
  const pathname = usePathname();

  // Step one.
  const [givenName, setGivenName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [preferredCenter, setPreferredCenter] = useState<string | null>(null);
  const [showConcierge, setShowConcierge] = useState(false);
  const [referredBy, setReferredBy] = useState("");
  const [note, setNote] = useState("");
  // The honeypot. Real visitors never see this field and so always submit it
  // empty; scripted spam fills every input it finds. Passed straight through
  // to the platform, which classifies it — nothing here rejects on it.
  const [website, setWebsite] = useState("");

  // Step two. Nothing preselected: an answer the visitor did not give is not
  // an answer.
  const [helpingWho, setHelpingWho] = useState<string | null>(null);
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);
  const [bestTime, setBestTime] = useState<string | null>(null);
  const [contactMethod, setContactMethod] = useState<ContactMethod | null>(null);
  // Unchecked by default, and never required (lib/sms-consent.ts).
  const [smsConsent, setSmsConsent] = useState(false);
  const [heardAbout, setHeardAbout] = useState("");
  const [laterReferral, setLaterReferral] = useState("");

  const [step, setStep] = useState<"one" | "two" | "three">("one");
  const [rowId, setRowId] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [invalidField, setInvalidField] = useState<string | null>(null);

  // What step one actually sent, for step two's choices.
  const sentPhone = useRef(false);
  const sentEmail = useRef(false);
  const sentReferral = useRef(false);

  // Funnel bookkeeping: form_start once, step two's outcome once.
  const started = useRef(false);
  const stepTwoDone = useRef(false);
  const stepRef = useRef(step);
  stepRef.current = step;

  useEffect(() => {
    trackFunnel("contact_view", window.location.pathname);
    // Read on mount (not via useSearchParams) so the form still prerenders.
    const slug = new URLSearchParams(window.location.search).get("center")?.trim().toLowerCase();
    const match = slug ? CENTER_BY_SLUG[slug] : undefined;
    if (match) {
      setPreferredCenter(match.value);
      if (match === CONCIERGE_CHOICE) setShowConcierge(true);
    }
  }, []);

  // Leaving the page with step two open and unanswered is a skip too. The
  // held email goes at two minutes regardless (lib/held-notification.ts).
  useEffect(() => {
    const onHide = () => {
      if (stepRef.current === "two" && !stepTwoDone.current) {
        stepTwoDone.current = true;
        trackFunnel("step2_skipped", window.location.pathname, { method: "left_page" });
      }
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, []);

  const toggleConcern = (c: string) =>
    setSelectedConcerns((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  function onFirstFocus() {
    if (started.current) return;
    started.current = true;
    trackFunnel("form_start", pathname);
  }

  function refuse(reason: Step1ErrorReason, message: string, field: string | null) {
    trackFunnel("step1_error", pathname, { reason });
    setErrorMessage(message);
    setInvalidField(field);
    setStatus("error");
    if (field) document.getElementById(field)?.focus();
  }

  /* ── Step one: save the request, start the lead ────────────────────── */
  async function sendRequest(e: React.FormEvent) {
    e.preventDefault();
    trackFunnel("step1_submit_attempt", pathname);
    const name = givenName.trim();
    const tel = phone.trim();
    const mail = email.trim();
    if (!name) return refuse("missing_name", "Please add your first name.", "first-name");
    if (!tel && !mail) {
      return refuse("missing_contact", "Please add a phone number or an email so we can reach you.", "phone");
    }
    if (tel && !looksLikeUsPhone(tel)) {
      return refuse("bad_phone", "That phone number doesn't look right — please check it, or leave it blank and use email.", "phone");
    }
    if (mail && !looksLikeEmail(mail)) {
      return refuse("bad_email", "That email address doesn't look right — please check it.", "email");
    }
    if (!preferredCenter) {
      return refuse("missing_center", "Please choose a center — or Not sure.", `center-${CENTER_CHOICES[0].id}`);
    }
    setStatus("submitting");
    setErrorMessage("");
    setInvalidField(null);
    // Read at submit time (not via useSearchParams) so the form prerenders.
    const params = new URLSearchParams(window.location.search);
    const from = params.get("from");
    // A 10-year giveaway offer code (?from=10years&code=…): the request is
    // a giveaway booking and the route validates the code.
    const offerCode = from === "10years" ? params.get("code")?.trim().toUpperCase() ?? null : null;
    try {
      const res = await fetch("/api/consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(offerCode ? { source: "giveaway", offer_code: offerCode } : {}),
          // The key is the column's name, from before the form asked for the
          // first name alone.
          first_name: name,
          ...(tel ? { phone: tel } : {}),
          ...(mail ? { email: mail } : {}),
          preferred_center: preferredCenter,
          ...(referredBy.trim() ? { referred_by: referredBy.trim() } : {}),
          ...(note.trim() ? { note: note.trim() } : {}),
          website,
          source_page: from || pathname,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; id?: string | null; error?: string }
        | null;
      if (!res.ok) {
        trackFunnel("step1_error", pathname, { reason: res.status >= 500 ? "server_error" : "server_rejected" });
        setErrorMessage(data?.error ?? `We couldn't send your request. Please try again, or call us at ${PHONE_DISPLAY}.`);
        setStatus("error");
        return;
      }

      // The Key event (submit_lead_form + generate_lead) on the route's own
      // "saved" — which center and which page, never anything typed.
      if (consultationSaved(res.ok, data)) {
        trackFunnel("step1_success", pathname, { center: preferredCenter });
        trackLeadSaved({ source: "form", center: preferredCenter, pagePath: pathname });
      }

      sentPhone.current = Boolean(tel);
      sentEmail.current = Boolean(mail);
      sentReferral.current = Boolean(referredBy.trim());
      setStatus("idle");
      // Step two needs a row to add to; without an id there is nothing to
      // PATCH, and she goes straight to the confirmation.
      if (typeof data?.id === "string" && data.id) {
        setRowId(data.id);
        setStep("two");
      } else {
        setStep("three");
      }
    } catch {
      trackFunnel("step1_error", pathname, { reason: "network" });
      setErrorMessage(`We couldn't send your request. Please try again, or call us at ${PHONE_DISPLAY}.`);
      setStatus("error");
    }
  }

  const askLaterReferral = isReferral(heardAbout) && !sentReferral.current;

  /* ── Step two: add to the saved row, or don't ──────────────────────── */
  async function saveDetails(e: React.FormEvent) {
    e.preventDefault();
    const referral = askLaterReferral ? laterReferral.trim() : "";
    const body: Record<string, unknown> = {
      ...(helpingWho ? { helping_who: helpingWho } : {}),
      ...(selectedConcerns.length > 0 ? { concerns: selectedConcerns } : {}),
      ...(bestTime ? { best_time: bestTime } : {}),
      ...(contactMethod ? { contact_method: contactMethod } : {}),
      // Only a tick is sent, with the wording she was shown.
      ...(sentPhone.current && smsConsent ? { sms_consent: true, sms_consent_text: FORM_CONSENT_TEXT } : {}),
      ...(heardAbout ? { heard_about: heardAbout } : {}),
      ...(referral ? { referred_by: referral } : {}),
    };
    if (Object.keys(body).length === 0 || !rowId) {
      skip("empty_submit");
      return;
    }
    setStatus("submitting");
    let saved = false;
    try {
      const res = await fetch(`/api/consultation/${rowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      saved = res.ok;
      if (!res.ok) console.warn(`[contact] step two not saved (${res.status})`);
    } catch {
      console.warn("[contact] step two not saved (network)");
    }
    stepTwoDone.current = true;
    if (saved) trackFunnel("step2_success", pathname);
    // Either way: the request is in, and the next thing she sees says so.
    // A failed step two is not mentioned — the answers were optional, and
    // the office asks on the phone. (The held email still goes at two
    // minutes with step one's answers.)
    setStatus("idle");
    setStep("three");
  }

  /* ── Skip: send the held staff email now, then the confirmation ────── */
  // Fire-and-forget with keepalive: the visitor never waits on it, and if it
  // never arrives the release job sends it at two minutes anyway.
  function skip(method: Step2SkipMethod) {
    if (!stepTwoDone.current) {
      stepTwoDone.current = true;
      trackFunnel("step2_skipped", pathname, { method });
    }
    if (rowId) {
      fetch(`/api/consultation/${rowId}/release`, { method: "POST", keepalive: true }).catch(() => {
        console.warn("[contact] skip not reported (network) — the office is emailed at two minutes");
      });
    }
    setStep("three");
  }

  // For greetings only. Capitalized the way the route saves it.
  const name = firstName(capitalizeName(givenName));

  /* ── Step three ─────────────────────────────────────────────────────── */
  // Exactly four things (Ben, 2026-10-14): the headline, the video, one line
  // about the call, one line with both numbers. It must fit 390×844.
  if (step === "three") {
    const lines = centerPhones.length > 0
      ? centerPhones
      : [{ name: "", phone: { display: PHONE_DISPLAY, tel: PHONE_TEL } }];
    return (
      // Keyed, so this mounts as a new element rather than React reusing
      // step two's (which would keep its scroll and lose RevealOnScroll's
      // `in` class — invisible at opacity 0).
      <StepPanel
        key="three"
        className="form-done"
        heading={<>Thanks{name ? `, ${name}` : ""}. We&rsquo;ll reach out soon.</>}
      >
        <VideoEmbed video={video} sizes="(max-width: 1060px) calc(100vw - 48px), 600px" />
        <p className="done-line">Free call, no obligation.</p>
        <p className="done-line done-phones" data-link-location="confirmation">
          Want to talk now?{" "}
          {lines.map(({ name: center, phone: line }, i) => (
            <span key={center || line.tel}>
              {i > 0 && " · "}
              {center ? `${center} ` : ""}
              <a href={`tel:${line.tel}`}>{line.display}</a>
            </span>
          ))}
        </p>
      </StepPanel>
    );
  }

  /* ── Step two ───────────────────────────────────────────────────────── */
  if (step === "two") {
    const reachOptions = (["call", "text", "email"] as const)
      .filter((m) => (m === "email" ? sentEmail.current : sentPhone.current))
      .map((m) => ({ id: m, label: CONTACT_METHOD_LABELS[m], value: m }));
    return (
      <StepPanel key="two" heading={<>Got it &mdash; we&rsquo;ll reach out soon.</>}>
        <p className="step-two-lead">A few optional details help us prepare:</p>
        <form className="form form-compact" onSubmit={saveDetails} noValidate>
          <label id="helping-label">Who is this for?</label>
          <ChoiceChips
            labelId="helping-label"
            idPrefix="helping"
            options={HELPING_OPTIONS.map((o) => ({ id: o.toLowerCase().replace(/\s+/g, "-"), label: o, value: o }))}
            value={helpingWho}
            onChange={setHelpingWho}
          />

          <label id="concerns-label">
            What&rsquo;s going on? <span style={OPTIONAL_STYLE}>(choose any)</span>
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

          <label id="time-label">Best time to reach you</label>
          <ChoiceChips
            labelId="time-label"
            idPrefix="time"
            options={TIME_OPTIONS.map((o) => ({ id: o.toLowerCase().replace(/\s+/g, "-"), label: o, value: o as string }))}
            value={bestTime}
            onChange={setBestTime}
          />

          {reachOptions.length > 1 && (
            <>
              <label id="reach-label">Best way to reach you</label>
              <ChoiceChips
                labelId="reach-label"
                idPrefix="reach"
                options={reachOptions}
                value={contactMethod}
                onChange={setContactMethod}
              />
            </>
          )}

          {/* Text-message consent — only when there is a number to text.
              Everything a carrier reviewer looks for is in the label; the
              links open a new tab so the half-filled step is not lost. */}
          {sentPhone.current && (
            <>
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
              {contactMethod === "text" && !smsConsent && (
                <p className="micro reach-note">To text you, we need the box above ticked.</p>
              )}
            </>
          )}

          <label htmlFor="heard-about">How did you hear about us?</label>
          <select id="heard-about" value={heardAbout} onChange={(e) => setHeardAbout(e.target.value)}>
            <option value="">Choose one</option>
            {HEARD_ABOUT_OPTIONS.map((opt) => (
              <option key={opt}>{opt}</option>
            ))}
          </select>

          {askLaterReferral && (
            <>
              <label htmlFor="later-referral">Who referred you?</label>
              <input
                id="later-referral"
                name="referred_by"
                autoComplete="off"
                maxLength={200}
                placeholder="A doctor, a practice, a friend…"
                value={laterReferral}
                onChange={(e) => setLaterReferral(e.target.value)}
              />
            </>
          )}

          <div className="form-exits">
            <button className="btn btn-primary" type="submit" disabled={status === "submitting"}>
              {status === "submitting" ? "Sending…" : "Send These Details"}
            </button>
            <button
              className="form-skip"
              type="button"
              onClick={() => skip("skip_link")}
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
  const centerOptions = showConcierge ? [...CENTER_CHOICES, CONCIERGE_CHOICE] : CENTER_CHOICES;
  const invalid = (id: string) => (invalidField === id ? true : undefined);
  return (
    <form
      className="form form-compact rv form-card"
      style={CARD_STYLE}
      onSubmit={sendRequest}
      onFocus={onFirstFocus}
      noValidate
    >
      <div className="eyebrow">Request your free call</div>

      <label htmlFor="first-name">First name</label>
      <input
        id="first-name"
        name="first_name"
        placeholder="Sarah"
        autoComplete="given-name"
        autoCapitalize="words"
        value={givenName}
        onChange={(e) => setGivenName(e.target.value)}
        aria-invalid={invalid("first-name")}
        required
      />

      <p className="micro either-note" id="reach-either">
        A phone number or an email &mdash; either one is fine.
      </p>
      <div className="two">
        <div>
          <label htmlFor="phone">Phone</label>
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            placeholder="(615) 555-0134"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            aria-describedby="reach-either"
            aria-invalid={invalid("phone")}
          />
        </div>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            placeholder="sarah@example.com"
            autoComplete="email"
            autoCapitalize="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-describedby="reach-either"
            aria-invalid={invalid("email")}
          />
        </div>
      </div>

      <label id="center-label">Which center?</label>
      <ChoiceChips
        labelId="center-label"
        idPrefix="center"
        options={centerOptions}
        value={preferredCenter}
        onChange={(v) => setPreferredCenter(v)}
        required
      />

      <label htmlFor="referred-by">
        Who referred you? <span style={OPTIONAL_STYLE}>(optional)</span>
      </label>
      <input
        id="referred-by"
        name="referred_by"
        autoComplete="off"
        maxLength={200}
        placeholder="A doctor, a practice, a friend…"
        value={referredBy}
        onChange={(e) => setReferredBy(e.target.value)}
      />

      <label htmlFor="note">
        Anything we should know? <span style={OPTIONAL_STYLE}>(optional)</span>
      </label>
      <input
        id="note"
        name="note"
        autoComplete="off"
        maxLength={500}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

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
        <p role="alert" style={{ color: "#9a3b2e", fontSize: 14.5, marginTop: 16 }}>
          {errorMessage}
        </p>
      )}

      <button
        className="btn btn-primary"
        style={{ width: "100%", marginTop: 16 }}
        type="submit"
        disabled={status === "submitting"}
      >
        {status === "submitting" ? "Sending…" : "Send My Request"}
      </button>
      <p className="micro" style={{ textAlign: "center" }}>
        No payment details, no intake forms today. We never share your
        information, and there&rsquo;s no obligation after we talk.{" "}
        <Link href="/privacy-policy">What happens to what you tell us</Link>.
      </p>
    </form>
  );
}
