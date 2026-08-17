"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  GUIDE_DOWNLOAD_NAME,
  GUIDE_PATH,
  GUIDE_SUBTITLE,
  GUIDE_TITLE,
} from "@/lib/site-config";

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
 *
 * ## Delivery is the download, not an email
 *
 * The guide is a static file in `public/`, and the success state hands it
 * over on the spot. That is deliberate and not a stopgap ranking below a
 * "real" email send: the download needs no provider, no API key, and no
 * verified sending domain, so it cannot half-work. Emailing her a copy needs
 * DNS records this project does not have yet (see lib/lead-notification.ts),
 * and a form that trades an address for a file we cannot send is a form that
 * takes something and gives nothing back.
 *
 * So nothing here promises an email. If the emailed copy is added later it is
 * an extra on top of a download that already worked — and this copy changes
 * only once that send actually delivers to her, not when the code exists.
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
      setErrorMessage("Please add an email address to get the guide.");
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
            Get <em className="sage">{GUIDE_TITLE}</em>.
          </h2>
          <p className="sub">{GUIDE_SUBTITLE} &mdash; what to do in the ten
            minutes when everything has already gone sideways.</p>
        </div>

        {status === "success" ? (
          /* The file is right here. `download` keeps her on the page and
             writes a self-explanatory name into her downloads, rather than
             navigating away into the browser's PDF viewer. */
          <div className="note-sage rv" role="status">
            <p style={{ marginBottom: 18 }}>
              Thank you &mdash; here it is. The download starts when you tap
              the button.
            </p>
            <a
              className="btn btn-outline"
              href={GUIDE_PATH}
              download={GUIDE_DOWNLOAD_NAME}
            >
              Download the guide (PDF)
            </a>
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
                  {status === "submitting" ? "One moment…" : "Get the guide"}
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
