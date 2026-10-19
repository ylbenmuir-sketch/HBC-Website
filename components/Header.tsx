"use client";

import ChromeLink from "./ChromeLink";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import { LogoMark, LogoName } from "./Logo";
import { PHONE_DISPLAY, PHONE_TEL, SHOW_PHONE, SHOW_TEAM } from "@/lib/site-config";

/**
 * The column labels in the mega-menu and the drawer are `<p class="h5">`,
 * not `<h5>`. They were headings for the design system's sake and they put
 * four H5s ahead of every page's H1 — Lighthouse `heading-order` failed on
 * every template (SEO-AUDIT-3 §2.3). The class keeps the styling; the
 * element keeps the outline honest. Same change in FooterGroup.
 */
const megaAdults = [
  { label: "Anxiety & stress", href: "/concerns/anxiety" },
  { label: "Focus & ADHD", href: "/concerns/focus-adhd" },
  { label: "Sleep", href: "/concerns/sleep" },
  { label: "Brain fog & memory", href: "/concerns/brain-fog" },
  { label: "Emotional regulation", href: "/concerns/emotional-regulation" },
  { label: "Performance & focus under pressure", href: "/concerns/performance" },
  { label: "Concussion & TBI", href: "/concerns/concussion" },
];

const megaChildren = [
  { label: "Focus & school difficulties", href: "/concerns/focus-adhd" },
  { label: "Emotional regulation", href: "/concerns/emotional-regulation" },
  { label: "Sleep", href: "/concerns/sleep" },
  { label: "Transitions & sensory overwhelm", href: "/concerns/children-school" },
];

/**
 * Resources left the top bar (Ben, 2026-10-15: five labels, more air) and
 * lives in About's menu — About had no menu, so it got a small one; the
 * articles sit better beside the people who stand behind them than inside a
 * page about the method. It stays in the footer, and in the drawer below,
 * where a phone has room for it.
 */
const aboutLinks = [
  { label: "About Harmonized", href: "/about" },
  { label: "Our founder", href: "/about/founder" },
  // Off with the team pages while SHOW_TEAM is (lib/site-config.ts).
  ...(SHOW_TEAM ? [{ label: "Our team", href: "/about/team" }] : []),
  { label: "Resources", href: "/resources" },
];

const topLinks: { label: string; href: string; menu?: typeof aboutLinks }[] = [
  { label: "How LENS Works", href: "/how-lens-works" },
  { label: "Your First Visit", href: "/first-visit" },
  { label: "About", href: "/about", menu: aboutLinks },
  { label: "Locations", href: "/locations" },
];

const drawerLinks = [...topLinks, { label: "Resources", href: "/resources" }];

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
  // it, so the next hover or Tab opens the panel normally. Keyed by menu
  // ("help", or a top link's href), so dismissing one leaves the other alone.
  const [dismissed, setDismissed] = useState<string | null>(null);
  const lastY = useRef(0);
  const headerRef = useRef<HTMLElement>(null);
  const triggerRefs = useRef<Record<string, HTMLAnchorElement | null>>({});

  useEffect(() => {
    setOpen(false);
    setDismissed(null);
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
  // About is lit on /resources too, now that Resources lives in its menu.
  const topActive = (l: (typeof topLinks)[number]) =>
    active(l.href) || !!l.menu?.some((m) => active(m.href));

  // The hover/focus wrapper of a menu: Escape closes it and returns focus to
  // its trigger; leaving it (pointer or focus) re-arms it.
  const menuProps = (key: string) => ({
    "data-mega-dismissed": dismissed === key ? "" : undefined,
    onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== "Escape") return;
      setDismissed(key);
      // Focus first, while the panel is still displayed: hiding it
      // out from under a focused link would drop focus to <body>.
      triggerRefs.current[key]?.focus();
    },
    onMouseLeave: () => setDismissed(null),
    onBlur: (e: FocusEvent<HTMLDivElement>) => {
      // focusout bubbles; relatedTarget is where focus went. Escape's
      // own move to the trigger stays inside, so it must not clear.
      if (!e.currentTarget.contains(e.relatedTarget)) setDismissed(null);
    },
  });

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
          <div {...menuProps("help")}>
            <ChromeLink
              ref={(el) => {
                triggerRefs.current.help = el;
              }}
              className={`top${isHelpActive(pathname) ? " active" : ""}`}
              href="/what-we-help-with"
            >
              What We Help With
            </ChromeLink>
            <div className="mega">
              <div className="col">
                <p className="h5">Adults</p>
                {megaAdults.map((l) => (
                  <ChromeLink key={l.label} href={l.href}>
                    {l.label}
                  </ChromeLink>
                ))}
                <ChromeLink href="/adults">All adult concerns →</ChromeLink>
              </div>
              <div className="col">
                <p className="h5">Children &amp; families</p>
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
            <div key={l.href} {...(l.menu ? menuProps(l.href) : {})}>
              <ChromeLink
                ref={(el) => {
                  triggerRefs.current[l.href] = el;
                }}
                className={`top${topActive(l) ? " active" : ""}`}
                href={l.href}
              >
                {l.label}
              </ChromeLink>
              {l.menu && (
                <div className="mega mega-sm">
                  <div className="col">
                    {l.menu.map((m) => (
                      <ChromeLink key={m.href} href={m.href}>
                        {m.label}
                      </ChromeLink>
                    ))}
                  </div>
                </div>
              )}
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
              <p className="h5">Adults</p>
              {megaAdults.map((l) => (
                <ChromeLink key={l.label} href={l.href}>
                  {l.label}
                </ChromeLink>
              ))}
              <ChromeLink href="/adults">All adult concerns →</ChromeLink>
              <p className="h5">Children &amp; families</p>
              {megaChildren.map((l) => (
                <ChromeLink key={l.label} href={l.href}>
                  {l.label}
                </ChromeLink>
              ))}
              <ChromeLink href="/children-families">All children&apos;s concerns →</ChromeLink>
            </div>
            {drawerLinks.map((l) => (
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
