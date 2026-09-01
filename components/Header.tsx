"use client";

import ChromeLink from "./ChromeLink";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogoMark, LogoName } from "./Logo";
import { PHONE_DISPLAY, PHONE_TEL, SHOW_PHONE } from "@/lib/site-config";

const megaAdults = [
  { label: "Anxiety & stress", href: "/concerns/anxiety" },
  { label: "Focus & ADHD", href: "/concerns/focus-adhd" },
  { label: "Sleep", href: "/concerns/sleep" },
  { label: "Brain fog & memory", href: "/concerns/brain-fog" },
  { label: "Emotional regulation", href: "/concerns/emotional-regulation" },
  { label: "Concussion & TBI", href: "/concerns/concussion" },
];

const megaChildren = [
  { label: "Focus & school difficulties", href: "/concerns/focus-adhd" },
  { label: "Emotional regulation", href: "/concerns/emotional-regulation" },
  { label: "Sleep", href: "/concerns/sleep" },
  { label: "Transitions & sensory overwhelm", href: "/concerns/children-school" },
];

const topLinks = [
  { label: "How LENS Works", href: "/how-lens-works" },
  { label: "Your First Visit", href: "/first-visit" },
  { label: "About", href: "/about" },
  { label: "Locations", href: "/locations" },
  { label: "Resources", href: "/resources" },
];

function isHelpActive(pathname: string) {
  return (
    pathname.startsWith("/what-we-help-with") ||
    pathname.startsWith("/concerns") ||
    pathname === "/adults" ||
    pathname === "/children-families"
  );
}

export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // Hide-on-scroll (phones/tablets via CSS): slides away while reading down,
  // returns on the first scroll up. Never hides while the drawer is open or
  // focus is inside the header.
  const [hidden, setHidden] = useState(false);
  // Escape has to beat the CSS. The panel opens on :hover and :focus-within,
  // which means the trigger Escape returns focus to is itself enough to hold
  // it open — so dismissing needs a state the CSS can see, not just a blur.
  // Cleared the moment the pointer leaves the wrapper or focus moves out of
  // it, so the next hover or Tab opens the panel normally.
  const [megaDismissed, setMegaDismissed] = useState(false);
  const lastY = useRef(0);
  const headerRef = useRef<HTMLElement>(null);
  const helpTriggerRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    setOpen(false);
    setMegaDismissed(false);
  }, [pathname]);
  useEffect(() => {
    // The scroll lock goes on <html>, never on <body>. An overflow that isn't
    // `visible` makes an element a scroll container, and this header is a
    // `position: sticky` child of <body> — locking <body> re-anchored it to a
    // box that never scrolls, so it dropped out of the viewport and rendered
    // inline at its static position at the top of the document. The drawer is
    // `position: fixed` against the header (the header's backdrop-filter makes
    // it the containing block), so the open menu went with it: below the fold,
    // tapping the burger froze the page and showed nothing. <html>'s overflow
    // propagates to the viewport instead, which stops the scroll without
    // making anything in the document a scroll container.
    document.documentElement.style.overflow = open ? "hidden" : "";
    // Signals the sticky mobile CTA (globals.css) to retire while the menu is up.
    if (open) document.body.setAttribute("data-menu-open", "");
    else document.body.removeAttribute("data-menu-open");
    return () => {
      document.documentElement.style.overflow = "";
      document.body.removeAttribute("data-menu-open");
    };
  }, [open]);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 8);
      const goingDown = y > lastY.current;
      const focusInHeader = headerRef.current?.contains(document.activeElement);
      if (y < 160 || !goingDown || focusInHeader) setHidden(false);
      else if (goingDown && y - lastY.current > 2) setHidden(true);
      lastY.current = y;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const active = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header
      ref={headerRef}
      className={`site${scrolled ? " scrolled" : ""}${
        hidden && !open ? " tucked" : ""
      }`}
    >
      <div className="nav">
        <ChromeLink className="logo" href="/">
          <LogoMark />
          <LogoName />
        </ChromeLink>
        <nav className="nav-links" aria-label="Primary">
          <div
            data-mega-dismissed={megaDismissed ? "" : undefined}
            onKeyDown={(e) => {
              if (e.key !== "Escape") return;
              setMegaDismissed(true);
              // Focus first, while the panel is still displayed: hiding it
              // out from under a focused link would drop focus to <body>.
              helpTriggerRef.current?.focus();
            }}
            onMouseLeave={() => setMegaDismissed(false)}
            onBlur={(e) => {
              // focusout bubbles; relatedTarget is where focus went. Escape's
              // own move to the trigger stays inside, so it must not clear.
              if (!e.currentTarget.contains(e.relatedTarget)) {
                setMegaDismissed(false);
              }
            }}
          >
            <ChromeLink
              ref={helpTriggerRef}
              className={`top${isHelpActive(pathname) ? " active" : ""}`}
              href="/what-we-help-with"
            >
              What We Help With
            </ChromeLink>
            <div className="mega">
              <div className="col">
                <h5>Adults</h5>
                {megaAdults.map((l) => (
                  <ChromeLink key={l.label} href={l.href}>
                    {l.label}
                  </ChromeLink>
                ))}
                <ChromeLink href="/adults">All adult concerns →</ChromeLink>
              </div>
              <div className="col">
                <h5>Children &amp; families</h5>
                {megaChildren.map((l) => (
                  <ChromeLink key={l.label} href={l.href}>
                    {l.label}
                  </ChromeLink>
                ))}
                <ChromeLink href="/children-families">All children&apos;s concerns →</ChromeLink>
              </div>
            </div>
          </div>
          {topLinks.map((l) => (
            <div key={l.href}>
              <ChromeLink
                className={`top${active(l.href) ? " active" : ""}`}
                href={l.href}
              >
                {l.label}
              </ChromeLink>
            </div>
          ))}
        </nav>
        {SHOW_PHONE && (
          <a className="nav-tel" href={`tel:${PHONE_TEL}`}>
            {PHONE_DISPLAY}
          </a>
        )}
        <ChromeLink className="nav-cta" href="/contact">
          Get a Free Call Today
        </ChromeLink>
        <button
          className={`nav-burger${open ? " is-open" : ""}`}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-drawer"
          onClick={() => setOpen(!open)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
      <div id="mobile-drawer" className={`drawer${open ? " open" : ""}`}>
        <div className="d-inner">
          <nav className="d-nav" aria-label="Mobile">
            <ChromeLink className="d-top" href="/what-we-help-with">
              What We Help With
            </ChromeLink>
            <div className="d-group">
              <h5>Adults</h5>
              {megaAdults.map((l) => (
                <ChromeLink key={l.label} href={l.href}>
                  {l.label}
                </ChromeLink>
              ))}
              <ChromeLink href="/adults">All adult concerns →</ChromeLink>
              <h5>Children &amp; families</h5>
              {megaChildren.map((l) => (
                <ChromeLink key={l.label} href={l.href}>
                  {l.label}
                </ChromeLink>
              ))}
              <ChromeLink href="/children-families">All children&apos;s concerns →</ChromeLink>
            </div>
            {topLinks.map((l) => (
              <ChromeLink key={l.href} className="d-top" href={l.href}>
                {l.label}
              </ChromeLink>
            ))}
          </nav>
          <div className="d-cta">
            <ChromeLink className="nav-cta" href="/contact">
              Get a Free Call Today
            </ChromeLink>
            {SHOW_PHONE && (
              <a className="nav-tel" href={`tel:${PHONE_TEL}`}>
                or call <b>{PHONE_DISPLAY}</b>
              </a>
            )}
            <span className="d-note">
              Nashville &middot; Murfreesboro &middot; Franklin (coming soon)
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
