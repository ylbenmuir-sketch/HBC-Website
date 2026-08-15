"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { PHONE_DISPLAY } from "@/lib/site-config";

const HELPING_OPTIONS = ["My child", "Myself", "Someone else"];
const CONCERN_OPTIONS = [
  "Focus & ADHD",
  "Anxiety & stress",
  "Sleep",
  "Emotional regulation",
  "School struggles",
  "Brain fog",
  "Something else",
];
const CENTER_OPTIONS = [
  "Nashville",
  "Murfreesboro",
  "Franklin waitlist",
  "Concierge / at home",
];
const TIME_OPTIONS = ["Mornings", "Afternoons", "Evenings"];

/**
 * The "what happens next" steps (contact.html) — also the confirmation state.
 *
 * The step heading level is a prop because the block appears at two different
 * depths: on /contact it sits under the page's "What happens next" H2, and in
 * the confirmation card it sits under that card's H3. Hard-coding either one
 * produces a heading skip in the other place.
 */
function WhatHappensNext({
  headingLevel: H = "h3",
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

export default function ContactForm() {
  const pathname = usePathname();

  const [helpingWho, setHelpingWho] = useState("My child");
  const [selectedConcerns, setSelectedConcerns] = useState<string[]>([]);
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [preferredCenter, setPreferredCenter] = useState(CENTER_OPTIONS[0]);
  const [bestTime, setBestTime] = useState(TIME_OPTIONS[0]);
  const [note, setNote] = useState("");
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const toggleConcern = (c: string) =>
    setSelectedConcerns((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !phone.trim()) {
      setErrorMessage("Please add your first name and phone number so we can reach you.");
      setStatus("error");
      return;
    }
    setStatus("submitting");
    setErrorMessage("");
    try {
      // read at submit time (not via useSearchParams) so the form prerenders
      const from = new URLSearchParams(window.location.search).get("from");
      const res = await fetch("/api/consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          helping_who: helpingWho,
          concerns: selectedConcerns,
          first_name: firstName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          preferred_center: preferredCenter,
          best_time: bestTime,
          note: note.trim(),
          source_page: from || pathname,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Something went wrong.");
      }
      setStatus("success");
    } catch (err) {
      setErrorMessage(
        err instanceof Error && err.message !== "Failed to fetch"
          ? err.message
          : "We couldn't send your request. Please try again, or call us."
      );
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div
        className="rv in form-card"
        style={{
          background: "#fff",
          border: "1px solid var(--line)",
          borderRadius: 4,
          padding: "48px 52px",
        }}
      >
        <div className="eyebrow">Request received</div>
        <h3 style={{ margin: "18px 0 10px" }}>
          Thank you, {firstName.trim()}. Here&rsquo;s what happens next.
        </h3>
        <WhatHappensNext headingLevel="h4" />
        <div className="note-sage" style={{ marginTop: 34 }}>
          Prefer to talk sooner? Call <b>{PHONE_DISPLAY}</b> — a real person
          answers during business hours.
        </div>
      </div>
    );
  }

  return (
    <form
      className="form rv form-card"
      style={{
        background: "#fff",
        border: "1px solid var(--line)",
        borderRadius: 4,
        padding: "48px 52px",
      }}
      onSubmit={handleSubmit}
      noValidate
    >
      <div className="eyebrow">Request a conversation</div>

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
        <span
          style={{
            color: "var(--slate)",
            textTransform: "none",
            letterSpacing: 0,
            fontWeight: 400,
          }}
        >
          (choose any)
        </span>
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

      <div className="two">
        <div>
          <label htmlFor="first-name">Your first name</label>
          <input
            id="first-name"
            name="firstName"
            placeholder="Sarah"
            autoComplete="given-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
        </div>
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
      </div>

      <label htmlFor="email">
        Email{" "}
        <span
          style={{
            color: "var(--slate)",
            textTransform: "none",
            letterSpacing: 0,
            fontWeight: 400,
          }}
        >
          (optional)
        </span>
      </label>
      <input
        id="email"
        name="email"
        type="email"
        placeholder="sarah@example.com"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

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
          <label htmlFor="best-time">Best time to call</label>
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

      <label htmlFor="note">
        In your own words{" "}
        <span
          style={{
            color: "var(--slate)",
            textTransform: "none",
            letterSpacing: 0,
            fontWeight: 400,
          }}
        >
          (optional)
        </span>
      </label>
      <textarea
        id="note"
        placeholder="Mornings are hard, homework is a battle, and he's starting to say he's 'just bad at school'…"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

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
        style={{ width: "100%", marginTop: 28 }}
        type="submit"
        disabled={status === "submitting"}
      >
        {status === "submitting" ? "Sending…" : "Request my conversation"}
      </button>
      <p className="micro" style={{ textAlign: "center" }}>
        No payment details, no intake forms today. We never share your
        information, and there&rsquo;s no obligation after we talk.
      </p>
    </form>
  );
}

export { WhatHappensNext };
