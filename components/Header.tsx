"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { LogoMark, LogoName } from "./Logo";
import { PHONE_DISPLAY, PHONE_TEL } from "@/lib/site-config";

const megaAdults = [
  { label: "Anxiety & stress", href: "/concerns/anxiety" },
  { label: "Focus & ADHD", href: "/concerns/focus-adhd" },
  { label: "Sleep", href: "/concerns/sleep" },
  { label: "Brain fog & memory", href: "/concerns/brain-fog" },
  { label: "Emotional regulation", href: "/concerns/emotional-regulation" },
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

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const active = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="site">
      <div className="nav">
        <Link className="logo" href="/">
          <LogoMark />
          <LogoName />
        </Link>
        <nav className="nav-links">
          <div>
            <Link
              className={`top${isHelpActive(pathname) ? " active" : ""}`}
              href="/what-we-help-with"
            >
              What We Help With
            </Link>
            <div className="mega">
              <div className="col">
                <h5>Adults</h5>
                {megaAdults.map((l) => (
                  <Link key={l.label} href={l.href}>
                    {l.label}
                  </Link>
                ))}
                <Link href="/adults">All adult concerns →</Link>
              </div>
              <div className="col">
                <h5>Children &amp; families</h5>
                {megaChildren.map((l) => (
                  <Link key={l.label} href={l.href}>
                    {l.label}
                  </Link>
                ))}
                <Link href="/children-families">All children&apos;s concerns →</Link>
              </div>
            </div>
          </div>
          {topLinks.map((l) => (
            <div key={l.href}>
              <Link
                className={`top${active(l.href) ? " active" : ""}`}
                href={l.href}
              >
                {l.label}
              </Link>
            </div>
          ))}
        </nav>
        <a className="nav-tel" href={`tel:${PHONE_TEL}`}>
          {PHONE_DISPLAY}
        </a>
        <Link className="nav-cta" href="/contact">
          Talk With Our Team
        </Link>
        <button
          className="nav-burger"
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
        <Link className="d-top" href="/what-we-help-with">
          What We Help With
        </Link>
        <div className="d-group">
          <h5>Adults</h5>
          {megaAdults.map((l) => (
            <Link key={l.label} href={l.href}>
              {l.label}
            </Link>
          ))}
          <Link href="/adults">All adult concerns →</Link>
          <h5>Children &amp; families</h5>
          {megaChildren.map((l) => (
            <Link key={l.label} href={l.href}>
              {l.label}
            </Link>
          ))}
          <Link href="/children-families">All children&apos;s concerns →</Link>
        </div>
        {topLinks.map((l) => (
          <Link key={l.href} className="d-top" href={l.href}>
            {l.label}
          </Link>
        ))}
        <div className="d-cta">
          <Link className="nav-cta" href="/contact">
            Talk With Our Team
          </Link>
          <a className="nav-tel" href={`tel:${PHONE_TEL}`}>
            or call <b>{PHONE_DISPLAY}</b>
          </a>
        </div>
      </div>
    </header>
  );
}
