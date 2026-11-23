"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { REQUEST_ANCHOR } from "@/lib/murfreesboro";

/**
 * /murfreesboro's request form, as a dialog (Ben, 2026-11-23). The page's
 * one button is a plain link to `#request`, and this is `#request`.
 *
 * Without JavaScript it is an ordinary section at the foot of the page —
 * the link jumps to it and the whole form is there. With JavaScript
 * (`html.js`, set in the root layout before first paint) the section is
 * hidden until the button is pressed, then shown over the page: a centered
 * card on a desktop, the full screen on a phone (app/globals.css →
 * .mb-request). So there is one form in the HTML, not two, and the
 * text-message wording is in the server's HTML either way.
 *
 * The usual dialog manners: the first field takes the cursor, Tab stays
 * inside, Escape and the backdrop close it, the page behind does not
 * scroll, and focus returns to the button that opened it. The form keeps
 * its state while closed — a half-typed name is still there on reopening.
 */

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([type="hidden"]):not([tabindex="-1"]), select, textarea, [tabindex]:not([tabindex="-1"])';

export default function RequestDialog({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  // role/aria-modal only once the script runs: without it this is plain page content.
  const [enhanced, setEnhanced] = useState(false);
  const card = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    opener.current?.focus();
  }, []);

  // Any link to #request on the page opens the dialog instead of jumping.
  useEffect(() => {
    setEnhanced(true);
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.(`a[href="#${REQUEST_ANCHOR}"]`);
      if (!link) return;
      // Capture phase, and the click stops here: the site's own handlers for
      // in-page links (smooth scrolling) must not also act on this one.
      e.preventDefault();
      e.stopPropagation();
      opener.current = link as HTMLElement;
      setOpen(true);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    const visible = () =>
      [...(card.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])].filter((el) => el.getClientRects().length > 0);
    // The first field, not the close button.
    (visible().find((el) => el.tagName === "INPUT") ?? card.current)?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const items = visible();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (!card.current?.contains(active)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      root.style.overflow = before;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  return (
    <section id={REQUEST_ANCHOR} className={`mb-request${open ? " mb-request-open" : ""}`}>
      <div className="mb-request-backdrop" onClick={close} aria-hidden="true" />
      <div
        ref={card}
        className="mb-request-card"
        tabIndex={-1}
        {...(enhanced ? { role: "dialog", "aria-modal": true, "aria-label": label } : {})}
      >
        <button type="button" className="mb-request-close" onClick={close} aria-label="Close">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        {children}
      </div>
    </section>
  );
}
