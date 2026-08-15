"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Transitional CTA — the ask for the majority who are not calling today.
 *
 * Deliberately subordinate to the primary CTA: it sits below the FinalCTA
 * band, asks for one field, and uses an outline button so it never reads as
 * the main action. Posts to the same /api/consultation route with a
 * `type: "guide"` discriminator and lands in the same table; there is no
 * second system.
 *
 * Appears on /, /resources, and every /concerns/[slug] page.
 */
export default function GuideCta() {
  const pathname = usePathname();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMessage("Please add an email address so we know where to send it.");
      setStatus("error");
      return;
    }
    setStatus("submitting");
    setErrorMessage("");
    try {
      const res = await fetch("/api/consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "guide",
          email: email.trim(),
          source_page: pathname,
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
          : "We couldn't sign you up. Please try again."
      );
      setStatus("error");
    }
  }

  return (
    <section className="sec sec-ivory2 home-guide">
      <div className="wrap" style={{ maxWidth: 720 }}>
        <div className="sec-head rv" style={{ marginBottom: 30 }}>
          <div className="eyebrow">Not ready to call?</div>
          <h2>
            Get <em className="sage">The Parent&rsquo;s Guide to Homework Battles</em>.
          </h2>
          <p className="sub">
            A plain-language look at what&rsquo;s happening in a stuck brain,
            and what actually helps.
          </p>
        </div>

        {status === "success" ? (
          <div className="note-sage rv" role="status">
            {/* The guide does not exist yet — the address is captured and
                stored; see the TODO in app/api/consultation/route.ts. */}
            Thank you &mdash; we&rsquo;ll email it to you shortly.
          </div>
        ) : (
          <form className="form rv" onSubmit={handleSubmit} noValidate>
            <div className="two" style={{ alignItems: "flex-end" }}>
              <div>
                <label htmlFor="guide-email">Email</label>
                <input
                  id="guide-email"
                  name="email"
                  type="email"
                  placeholder="sarah@example.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div style={{ flex: "none" }}>
                <button
                  className="btn btn-outline"
                  type="submit"
                  disabled={status === "submitting"}
                >
                  {status === "submitting" ? "Sending…" : "Send it to me"}
                </button>
              </div>
            </div>
            {status === "error" && (
              <p
                role="alert"
                style={{ color: "#9a3b2e", fontSize: 14.5, marginTop: 16 }}
              >
                {errorMessage}
              </p>
            )}
          </form>
        )}
      </div>
    </section>
  );
}
