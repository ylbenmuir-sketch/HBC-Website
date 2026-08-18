"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  GUIDE_DOWNLOAD_NAME,
  GUIDE_HTML_PATH,
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
 * ## Delivery is reading it, not an email
 *
 * The guide is two static files in `public/`, and the success state opens the
 * readable one on the spot. That is deliberate and not a stopgap ranking
 * below a "real" email send: static files need no provider, no API key, and
 * no verified sending domain, so delivery cannot half-work. Emailing her a
 * copy needs DNS records this project does not have yet (see
 * lib/lead-notification.ts), and a form that trades an address for something
 * we cannot hand over is a form that takes and gives nothing back.
 *
 * The HTML leads and the PDF follows, because most of these submits happen on
 * a phone. A web page opens and is readable; a downloaded PDF becomes a file
 * in a folder to be found later, which is a different and worse promise. The
 * PDF stays for the parent who wants to keep or print it.
 *
 * So nothing here promises an email. If the emailed copy is added later it is
 * an extra on top of delivery that already worked — and this copy changes
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
          <p className="sub">{GUIDE_SUBTITLE} &mdash; in adults and in children.</p>
        </div>

        {status === "success" ? (
          /* Both files are already here, so the confirmation is the delivery.
             Reading leads: the HTML opens in a new tab rather than replacing
             the page she was on, since the guide is a standalone document
             with no way back into the site's nav. The PDF stays second, for
             keeping and printing, and `download` names it for her folder
             instead of dropping her into a viewer. */
          <div className="note-sage rv" role="status">
            <p style={{ marginBottom: 20 }}>
              Thank you &mdash; you can read it right now.
            </p>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 20,
              }}
            >
              <a
                className="btn btn-primary"
                href={GUIDE_HTML_PATH}
                target="_blank"
                rel="noopener"
              >
                Read the guide
              </a>
              <a
                className="btn btn-ghost"
                href={GUIDE_PATH}
                download={GUIDE_DOWNLOAD_NAME}
              >
                Or save the PDF
              </a>
            </div>
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
