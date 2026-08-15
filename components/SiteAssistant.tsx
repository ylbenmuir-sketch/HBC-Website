"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * The site assistant widget (phase-8-chatbot.md §6; appearance per phase 11).
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
 * - **Never covers the mobile CTA bar.** At ≤760px the two never share the
 *   screen: MobileCtaBar marks `body[data-cta-bar]` while it is showing, and
 *   the launcher yields to it (globals.css). Opening the panel marks
 *   `body[data-assistant-open]`, which retires the bar for the duration. One
 *   floating affordance at a time, and the CTA bar always wins the tie.
 * - **Respects prefers-reduced-motion.** Every transition is disabled by the
 *   gate in globals.css, alongside the site's existing ones.
 * - **Must not block or degrade LCP.** The launcher does not render on the
 *   server and does not render on mount either — it waits for the browser to
 *   go idle and then a further beat, so nothing here competes with the hero
 *   image for the main thread and nothing appears while the visitor is still
 *   taking the page in. The panel's markup does not exist until it is opened.
 *
 * It introduces no CTA. The launcher says "Questions?", not "Get a Free Call
 * Today" — the assistant is an addition to the contact form, and a second
 * button making the primary ask would be exactly the competing CTA the README
 * forbids. It is deliberately the quieter object on screen: a soft sage pill
 * against the navy of TalkCta.
 */

/** The beat after idle before the launcher arrives — §11.2's "on the page a moment". */
const ARRIVAL_DELAY_MS = 1400;

/**
 * §2: the first message must disclose what this is. Hard-coded, not
 * model-generated — a disclosure that a model composes is a disclosure that
 * can come out differently on a bad day.
 *
 * PROPOSED COPY (phase 11 §1) — pending Ben's approval. Same three
 * disclosures as the line it replaces, in a front-desk voice rather than a
 * product one, and the free call is named rather than implied. The previous
 * wording, for a one-line revert:
 *
 *   "Hi — I’m an assistant for Harmonized Brain Centers. I can answer
 *   questions about LENS, our centers, and what a first visit looks like.
 *   I’m not a person and I can’t give medical advice, but I can get you a
 *   call with someone who can help."
 *
 * Rendered as two paragraphs in one bubble: the disclosure sits on its own
 * line instead of trailing a sentence about what the assistant can do.
 */
const GREETING = [
  "Hi — I’m the assistant here at Harmonized Brain Centers. Ask me about LENS, our centers, or what a first visit is like.",
  "I’m not a person and I can’t give medical advice — but if you’d rather talk to someone, I can set up a free call.",
].join("\n\n");

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

/**
 * The brand mark, doing the job a robot glyph would otherwise do. Same
 * geometry as components/Logo.tsx — a gold ring around the sage waveform —
 * on a sage-soft ground so it reads as an avatar at 34px.
 *
 * Hex literals rather than var(): Logo.tsx sets the precedent, and CSS
 * variables in SVG presentation attributes are the one place this palette
 * cannot be relied on to resolve.
 */
function AssistantAvatar() {
  return (
    <svg width="34" height="34" viewBox="0 0 40 40" fill="none" aria-hidden="true">
      <circle cx="20" cy="20" r="19" fill="#E6EBE2" />
      <circle cx="20" cy="20" r="19" stroke="#A9853F" strokeWidth="0.9" />
      <path
        d="M6 22 C10 22, 11 14, 14 17 S 18 27, 21 21 S 26 17, 29 20 S 33 21, 34 20"
        stroke="#5E7360"
        strokeWidth="1.9"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** The same waveform, cropped out of its ring, for the launcher pill. */
function AssistantWave() {
  return (
    <svg
      className="assistant-wave"
      width="24"
      height="12"
      viewBox="5 13 30 15"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 22 C10 22, 11 14, 14 17 S 18 27, 21 21 S 26 17, 29 20 S 33 21, 34 20"
        stroke="#5E7360"
        strokeWidth="1.9"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Blank-line-separated text becomes paragraphs, so a reply reads as prose. */
function paragraphs(text: string) {
  return text.split(/\n{2,}/).filter((p) => p.trim().length > 0);
}

export default function SiteAssistant() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);
  const [parked, setParked] = useState(false);
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
  const panelRef = useRef<HTMLDivElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const titleId = useId();

  // Defer past first paint so the launcher never competes with LCP, then wait
  // a further beat so it arrives after the visitor has settled rather than
  // alongside the hero.
  useEffect(() => {
    let delay: number | undefined;
    const arm = () => {
      delay = window.setTimeout(() => setMounted(true), ARRIVAL_DELAY_MS);
    };
    const idle =
      typeof window.requestIdleCallback === "function"
        ? window.requestIdleCallback(arm, { timeout: 3000 })
        : window.setTimeout(arm, 1200);
    return () => {
      if (typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idle as number);
      } else {
        window.clearTimeout(idle as number);
      }
      window.clearTimeout(delay);
    };
  }, []);

  // The single entrance: one frame after the widget exists, flip the class
  // that transitions it in. A class transition rather than a keyframe
  // animation on purpose — the launcher also fades when it yields to the CTA
  // bar, and an animation with a fill mode would win over that transition.
  useEffect(() => {
    if (!mounted) return;
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [mounted]);

  // The launcher retires as the footer arrives, the way MobileCtaBar retires
  // at the end-of-page CTA band. A fixed pill in the bottom-right corner
  // otherwise sits on top of the last line of the footer disclaimer at phone
  // widths, and that text is not something a widget gets to cover.
  useEffect(() => {
    if (!mounted) return;
    const footer = document.querySelector("footer.site");
    if (!footer || typeof IntersectionObserver !== "function") return;
    const io = new IntersectionObserver(
      ([entry]) => setParked(entry.isIntersecting),
      // Root extended past the bottom of the viewport, so the pill is already
      // gone by the time the footer's top edge actually appears.
      { rootMargin: "0px 0px 120px 0px" }
    );
    io.observe(footer);
    return () => io.disconnect();
  }, [mounted]);

  const close = useCallback(() => {
    setOpen(false);
    // Focus returns to the launcher, unless it is hidden — stood down for the
    // CTA bar on a phone (already hidden, so the computed style says so), or
    // parked at the footer (hidden by the very render this call triggers, so
    // only the state says so). Focusing a hidden element drops focus to the
    // body without reporting it, which is worse than not moving focus at all.
    const launcher = launcherRef.current;
    if (!launcher || parked) return;
    const cs = getComputedStyle(launcher);
    if (cs.visibility !== "hidden" && cs.display !== "none") launcher.focus();
  }, [parked]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [messages, sending]);

  // While the panel is open the CTA bar stands down (globals.css reads this),
  // so the two are never on screen together at any width.
  useEffect(() => {
    if (!open) return;
    document.body.dataset.assistantOpen = "on";
    return () => {
      delete document.body.dataset.assistantOpen;
    };
  }, [open]);

  // Phones: the panel is a full-height sheet, so the page behind it must not
  // scroll. `position: fixed` on the body rather than `overflow: hidden`,
  // which iOS Safari ignores; the scroll offset is parked in `top` and
  // restored on close so the page does not jump back to the top.
  useEffect(() => {
    if (!open) return;
    if (!window.matchMedia("(max-width: 760px)").matches) return;
    const body = document.body;
    const y = window.scrollY;
    const prev = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
    };
    body.style.position = "fixed";
    body.style.top = `-${y}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.left = prev.left;
      body.style.right = prev.right;
      body.style.width = prev.width;
      window.scrollTo(0, y);
    };
  }, [open]);

  // The sheet is sized to the *visual* viewport, not the layout viewport, so
  // the composer stays above the on-screen keyboard instead of underneath it.
  // 100dvh is the fallback in CSS; dvh does not track the keyboard.
  useEffect(() => {
    if (!open) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    const apply = () => {
      root.style.setProperty("--assistant-vh", `${vv.height}px`);
    };
    apply();
    vv.addEventListener("resize", apply);
    vv.addEventListener("scroll", apply);
    return () => {
      vv.removeEventListener("resize", apply);
      vv.removeEventListener("scroll", apply);
      root.style.removeProperty("--assistant-vh");
    };
  }, [open]);

  // Escape closes, like the site's menu drawer, and Tab cycles inside the
  // panel rather than walking off into the page behind it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const panel = panelRef.current;
      if (!panel) return;
      // Queried per keystroke: the send button disables itself while a reply
      // is in flight, so the tabbable set changes during the conversation.
      const focusable = panel.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const outside = !active || !panel.contains(active);
      if (e.shiftKey && (active === first || outside)) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || outside)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

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
    <div
      className={`assistant${entered ? " entered" : ""}${open ? " is-open" : ""}${
        parked && !open ? " is-parked" : ""
      }`}
    >
      {open && (
        <div
          className="assistant-panel"
          id={panelId}
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div className="assistant-head">
            <span className="assistant-avatar">
              <AssistantAvatar />
            </span>
            <div className="assistant-ident">
              <div className="assistant-title" id={titleId}>
                Assistant
              </div>
              <div className="assistant-sub">Not a person · No medical advice</div>
            </div>
            <button
              type="button"
              className="assistant-close"
              onClick={close}
              aria-label="Close the assistant"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="assistant-log" ref={logRef} aria-live="polite">
            {/* `from-` prefix, not the bare author name: `assistant` is the
                widget root's own class, so `assistant-msg assistant` made every
                reply match `.assistant` — position: fixed, bottom right — and
                render pinned across the viewport instead of inside the panel. */}
            {messages.map((m, i) => (
              <div key={i} className={`assistant-msg from-${m.from}`}>
                {paragraphs(m.text).map((p, j) => (
                  <p key={j}>{m.from === "assistant" ? withLinks(p) : p}</p>
                ))}
              </div>
            ))}
            {sending && (
              <div className="assistant-msg from-assistant assistant-typing" aria-label="Typing">
                <span />
                <span />
                <span />
              </div>
            )}
          </div>

          {ended ? (
            <p className="assistant-ended">
              Whenever you’re ready, <Link href="/contact">the contact page</Link> will
              reach the team.
            </p>
          ) : (
            <form className="assistant-compose" onSubmit={send}>
              {/* The placeholder was "Ask about LENS, visits, or our centers…",
                  which measures 283px against the 235px of field a 384px panel
                  leaves — it rendered ellipsed at every width. This one fits
                  from 384px up; below 360px it still clips a little. */}
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Ask about LENS or a first visit…"
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
        ref={launcherRef}
        onClick={() => (open ? close() : setOpen(true))}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
      >
        <AssistantWave />
        {open ? "Close" : "Questions?"}
      </button>
    </div>
  );
}
