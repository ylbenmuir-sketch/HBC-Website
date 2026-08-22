"use client";

import { useEffect, useRef, useState } from "react";
import { useBottomBar } from "./BottomBarContext";

/**
 * The sticky ask bar — a full-width field at the bottom of every page that
 * opens the site assistant.
 *
 * It replaces the floating "Have a question?" launcher pill. The pill asked a
 * question and offered a button; this offers the thing a visitor actually
 * wants, which is somewhere to put the question they already have. It is
 * deliberately quieter than the hero's "Get a Free Call Today": cream ground,
 * sage accents, no navy fill and no gold. Gold is the primary-CTA accent and
 * does not appear here — the one exception is the sitewide focus ring, which
 * is a site-wide accessibility convention rather than an accent, and is worth
 * more as a consistent ring than as a colour kept pure.
 *
 * It renders its own layer inside BottomBarDock's shared footprint and shows
 * only when the controller says `active === "ask"`. It never decides that for
 * itself — see BottomBarContext.
 *
 * **What a press does depends on the input device, not the screen size.** A
 * touch has no caret and no keyboard of its own, so tapping the bar goes
 * straight to the panel and the panel's composer takes the focus — one caret,
 * one keyboard, in the place the conversation actually happens. A mouse has
 * both, so clicking the bar puts a caret in *this* field and typing stays
 * here until Enter (or the arrow) sends it. See `pressIsCoarse` below for how
 * that is decided; it is a pointer question and it is asked as one.
 *
 * No PHI. This is an anonymous marketing-site entry point: the field is a
 * plain unnamed text input with autocomplete off, nothing is stored here, and
 * whatever is typed goes to /api/chat exactly as a message typed into the
 * assistant's own composer would.
 */

/**
 * The rotation. Four questions a visitor arrives with, in the order they tend
 * to arrive in — "does this actually work" is the first thing anyone thinks
 * about neurofeedback, so it is index 0 and it is always what a cold page
 * load shows. The rotation only ever starts from there.
 */
const PROMPTS = [
  "Does this actually work?",
  "How is this different from medication?",
  "Will it help my 9-year-old?",
  "What happens in a session?",
];

const ROTATE_MS = 4000;

/**
 * "Is the thing pressing this bar a finger?"
 *
 * Asked as a pointer question, never as a width one — a 1280px touchscreen
 * and a 390px window on a laptop both exist, and a breakpoint gets each of
 * them backwards. Two signals, in order of how much they actually know:
 *
 * 1. `event.pointerType` on the press itself. This is the only signal that is
 *    right on a hybrid device, where the primary pointer is a mouse and the
 *    press was still a finger.
 * 2. `(pointer: coarse)` for the browsers and synthetic events that leave
 *    pointerType empty. It describes the device's *primary* pointer, which is
 *    the best available guess when the event will not say.
 *
 * A stylus counts as coarse. It is precise, but it comes with a touchscreen
 * and no keyboard, so the panel's composer is still where its owner wants the
 * caret to end up.
 */
const COARSE_QUERY = "(pointer: coarse)";

/** The launcher's waveform, cropped out of its ring. Same path as Logo.tsx. */
function AskWave() {
  return (
    <svg
      className="askbar-wave"
      width="24"
      height="12"
      viewBox="5 13 30 15"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 22 C10 22, 11 14, 14 17 S 18 27, 21 21 S 26 17, 29 20 S 33 21, 34 20"
        stroke="currentColor"
        strokeWidth="1.9"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function StickyAskBar({ active }: { active: boolean }) {
  const { openAssistant, assistantOpen } = useBottomBar();
  const [index, setIndex] = useState(0);
  const [draft, setDraft] = useState("");
  /** One-way. Once the visitor has typed, the placeholder stops moving for good. */
  const [typed, setTyped] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  /**
   * Whether the open that is currently in flight came from the keyboard. Only
   * a keyboard open gets focus handed back when the panel closes — doing it
   * after a tap would pop the on-screen keyboard at a visitor who just
   * dismissed a sheet.
   */
  const openedByKeyboard = useRef(false);
  const wasAssistantOpen = useRef(false);
  /** The fallback half of pressIsCoarse — see COARSE_QUERY. */
  const coarsePrimary = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // A ref, not state: nothing renders differently for a coarse pointer, and a
  // laptop that has a touchscreen plugged in mid-session should not re-render
  // the bar to find out.
  useEffect(() => {
    const mq = window.matchMedia(COARSE_QUERY);
    const apply = () => {
      coarsePrimary.current = mq.matches;
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  /**
   * The rotation, and everything that stops it.
   *
   * - `reduced`: no rotation at all. A placeholder that changes under you is
   *   motion, and the first prompt says enough on its own.
   * - `typed`: permanent. The field now holds the visitor's words and the
   *   placeholder is not coming back over them.
   * - hover / focus: paused while they are on it, because a prompt that
   *   changes the moment you go to read it is the worst version of this.
   * - `!active`: the CTA bar has the footprint; nothing to rotate.
   *
   * The interval is re-armed rather than resumed when a pause ends, so a
   * visitor who hovers for three seconds gets a fresh four rather than one.
   */
  useEffect(() => {
    if (reduced || typed || hovered || focused || !active) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % PROMPTS.length),
      ROTATE_MS
    );
    return () => window.clearInterval(id);
  }, [reduced, typed, hovered, focused, active]);

  /**
   * Focus comes home after a keyboard-initiated conversation ends. The
   * assistant's own close() cannot do this any more: it restored focus to the
   * launcher pill, and the pill is gone.
   */
  useEffect(() => {
    if (assistantOpen) {
      wasAssistantOpen.current = true;
      return;
    }
    if (!wasAssistantOpen.current) return;
    wasAssistantOpen.current = false;
    if (!openedByKeyboard.current) return;
    openedByKeyboard.current = false;
    if (active) inputRef.current?.focus();
  }, [assistantOpen, active]);

  /**
   * The one way in. `draft` rides along as the assistant's first visitor
   * message — see BottomBarContext.openAssistant and SiteAssistant's
   * request effect. The field is emptied because the question has moved: it
   * now lives in the panel's transcript, and leaving a copy behind under the
   * sheet would mean two places showing the same unsent question.
   */
  function open(viaKeyboard: boolean) {
    if (!active) return;
    openedByKeyboard.current = viaKeyboard;
    openAssistant(draft);
    setDraft("");
  }

  /** See COARSE_QUERY. Event first, media query only where the event is silent. */
  function pressIsCoarse(e: React.PointerEvent) {
    if (e.pointerType === "mouse") return false;
    if (e.pointerType === "touch" || e.pointerType === "pen") return true;
    return coarsePrimary.current;
  }

  /**
   * One press handler, two behaviours, chosen by what did the pressing.
   *
   * **Coarse (finger, stylus).** Straight to the panel. The default is
   * prevented so this field never takes the caret on the way: the panel
   * focuses its own composer in a layout effect, inside the same gesture, and
   * two focus moves in one tap is two keyboard flashes on iOS. Tapping
   * anywhere counts — at a glance the bar is one object, and an object with a
   * dead zone reads as broken.
   *
   * **Fine (mouse, trackpad).** A caret, here. Clicking the field itself is
   * left entirely alone so the caret lands where the click did; clicking the
   * cream either side of it focuses the field, because the strip *is* the
   * field as far as anyone looking at it is concerned. Nothing opens until
   * Enter — the one exception being the arrow, which reads as "send" and has
   * to keep meaning it.
   *
   * Keyboard users touch none of this. They arrive by Tab, which fires no
   * pointer event at all, and leave by Enter.
   */
  function onPress(e: React.PointerEvent) {
    if (!active) return;

    if (pressIsCoarse(e)) {
      e.preventDefault();
      open(false);
      return;
    }

    const target = e.target as HTMLElement | null;
    if (target?.closest(".askbar-go")) {
      e.preventDefault();
      open(false);
      return;
    }
    if (target === inputRef.current) return;
    e.preventDefault();
    inputRef.current?.focus();
  }

  return (
    <div
      className="bottombar-layer askbar-layer"
      data-on={active}
      onPointerDown={onPress}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <form
        className="askbar"
        onSubmit={(e) => {
          e.preventDefault();
          open(true);
        }}
      >
        <span className="askbar-mark" aria-hidden="true">
          <AskWave />
        </span>
        <input
          ref={inputRef}
          className="askbar-input"
          type="text"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (e.target.value.length > 0) setTyped(true);
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          // Reduced motion gets the first prompt and only the first prompt.
          placeholder={reduced ? PROMPTS[0] : PROMPTS[index]}
          aria-label="Ask a question about LENS neurofeedback"
          maxLength={2000}
          autoComplete="off"
          // Hidden by `visibility` while the CTA bar has the footprint, which
          // already takes it out of the tab order; stated anyway so the answer
          // does not depend on a stylesheet having loaded.
          tabIndex={active ? 0 : -1}
          enterKeyHint="send"
        />
        {/* Decorative, deliberately: `aria-hidden` and not a button. Enter is
            the keyboard path and it is on the form, so a second tab stop here
            would add a control without adding a capability. onPress gives it
            its click back for mouse users, who are the only ones who would
            aim at it. */}
        <span className="askbar-go" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path
              d="M5 12h13M12 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </form>
    </div>
  );
}
