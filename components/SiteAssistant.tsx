"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * The site assistant widget (phase-8-chatbot.md §6).
 *
 * Rendered only when NEXT_PUBLIC_FEATURE_ASSISTANT is true — app/layout.tsx
 * makes that decision, so nothing here is reachable while the flag is off.
 *
 * §6's placement rules, and how each is met:
 *
 * - **Bottom right, closed by default.** `open` starts false and is only ever
 *   set by a click. There is no timer, no scroll trigger, and no
 *   exit-intent hook anywhere in this file — §6 forbids an auto-opening popup,
 *   and the way to keep that true is to have nothing that could open it.
 * - **Never covers the mobile CTA bar.** Both the launcher and the open panel
 *   sit above it at ≤760px (see globals.css). The panel is shorter as a
 *   result; the CTA bar is the primary conversion path and wins.
 * - **Respects prefers-reduced-motion.** Every transition is disabled by the
 *   gate in globals.css, alongside the site's existing ones.
 * - **Must not block or degrade LCP.** The launcher does not render on the
 *   server and does not render on mount either — it waits for the browser to
 *   go idle, so nothing here competes with the hero image for the main thread.
 *   The panel's markup does not exist until the widget is opened.
 *
 * It introduces no CTA. The launcher says "Ask a question", not "Get a Free
 * Call Today" — the assistant is an addition to the contact form, and a second
 * button making the primary ask would be exactly the competing CTA the README
 * forbids.
 */

/**
 * §2: the first message must disclose what this is. Hard-coded, not
 * model-generated — a disclosure that a model composes is a disclosure that
 * can come out differently on a bad day.
 */
const GREETING =
  "Hi — I’m an assistant for Harmonized Brain Centers. I can answer questions about LENS, our centers, and what a first visit looks like. I’m not a person and I can’t give medical advice, but I can get you a call with someone who can help.";

type Message = { from: "assistant" | "visitor"; text: string };

/** Renders the site paths the assistant returns as real links. */
function withLinks(text: string) {
  return text.split(/(\/[a-z0-9-]+(?:\/[a-z0-9-]+)*)/g).map((part, i) =>
    /^\/[a-z0-9-]/.test(part) ? (
      <Link key={i} href={part}>
        {part}
      </Link>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default function SiteAssistant() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { from: "assistant", text: GREETING },
  ]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [ended, setEnded] = useState(false);
  const sessionId = useRef<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelId = useId();

  // Defer past first paint so the launcher never competes with LCP.
  useEffect(() => {
    const idle =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(() => setMounted(true), { timeout: 3000 })
        : window.setTimeout(() => setMounted(true), 1200);
    return () => {
      if (typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idle as number);
      } else {
        window.clearTimeout(idle as number);
      }
    };
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages, sending]);

  // Escape closes the panel, like the site's menu drawer.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending || ended) return;

    setMessages((prev) => [...prev, { from: "visitor", text }]);
    setDraft("");
    setSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          sessionId: sessionId.current,
          page: pathname,
        }),
      });
      const body = await response.json().catch(() => null);

      if (!response.ok || !body?.reply) {
        setMessages((prev) => [
          ...prev,
          {
            from: "assistant",
            text:
              body?.error ??
              "Something went wrong on my end. The contact page will always reach us: /contact",
          },
        ]);
        return;
      }

      if (body.sessionId) sessionId.current = body.sessionId;
      setMessages((prev) => [...prev, { from: "assistant", text: body.reply }]);
      // §4.1: the turn ends. The composer closes rather than inviting another
      // message straight after a crisis response.
      if (body.ended) setEnded(true);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          from: "assistant",
          text: "I couldn’t reach the server. The contact page will always reach us: /contact",
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  if (!mounted) return null;

  return (
    <div className="assistant">
      {open && (
        <div className="assistant-panel" id={panelId} role="dialog" aria-label="Site assistant">
          <div className="assistant-head">
            <div>
              <div className="assistant-title">Assistant</div>
              <div className="assistant-sub">Not a person · No medical advice</div>
            </div>
            <button
              type="button"
              className="assistant-close"
              onClick={() => setOpen(false)}
              aria-label="Close the assistant"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </button>
          </div>

          <div className="assistant-log" ref={logRef} aria-live="polite">
            {/* `from-` prefix, not the bare author name: `assistant` is the
                widget root's own class, so `assistant-msg assistant` made every
                reply match `.assistant` — position: fixed, bottom right — and
                render pinned across the viewport instead of inside the panel. */}
            {messages.map((m, i) => (
              <p key={i} className={`assistant-msg from-${m.from}`}>
                {m.from === "assistant" ? withLinks(m.text) : m.text}
              </p>
            ))}
            {sending && (
              <p className="assistant-msg from-assistant typing" aria-label="Typing">
                <span />
                <span />
                <span />
              </p>
            )}
          </div>

          {ended ? (
            <p className="assistant-ended">
              Whenever you’re ready, <Link href="/contact">the contact page</Link> will
              reach the team.
            </p>
          ) : (
            <form className="assistant-compose" onSubmit={send}>
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask about LENS, visits, or our centers…"
                aria-label="Your question"
                maxLength={2000}
                disabled={sending}
              />
              <button type="submit" disabled={sending || draft.trim().length === 0}>
                Send
              </button>
            </form>
          )}
        </div>
      )}

      <button
        type="button"
        className="assistant-launcher"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
      >
        {open ? "Close" : "Ask a question"}
      </button>
    </div>
  );
}
