import Link from "next/link";
import CheckIcon from "@/components/CheckIcon";
import {
  BRAIN_MAP_PRICE,
  FULL_COURSE,
  HSA_FSA_ACCEPTED,
  PACKAGE_PRICE,
  PACKAGE_SESSIONS,
  SESSION_LENGTH,
  SESSION_MINUTES,
} from "@/lib/site-config";

/**
 * The cost section — "Time, cost & what to expect" (Ben, design-refs/
 * pricing-section.png, 2026-10-16). Replaces the three-card "What it takes".
 * On the homepage after "How it works", and on /first-visit under the hero.
 *
 * Two columns: a left column that sets expectations (one display headline,
 * a subline, and two icon rows), and a dark navy card that states the first
 * step and the price. A full-width strip under both carries the honest-call
 * line and the route to the full pricing answer on /faq.
 *
 * Every figure is read from lib/site-config.ts, so nothing here can drift
 * from the FAQ or /first-visit's cost card. The duration row is gated on
 * SESSION_LENGTH.verified and the "full course" sub-line on FULL_COURSE —
 * an unverified figure drops its line rather than printing it. *
 * Sits in the standard `.wrap`, like the sections around it, at 0.8 of the
 * reference's size on desktop (Ben, 2026-10-16) — see `--k` in globals.css.
 */
function ClockIcon() {
  return (
    <svg
      viewBox="2.4 2.4 19.2 19.2"
      fill="none"
      stroke="var(--sage-deep)"
      strokeWidth="0.95"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.2v5l3.4 2" />
    </svg>
  );
}

/**
 * The brand wave — the logo mark's line (components/Logo.tsx) drawn as one
 * long, calm period, the way the reference draws it at icon size; the
 * logo's own four quick wiggles read as a squiggle this small.
 */
function WaveIcon() {
  return (
    <svg className="cost-wave" viewBox="0 0 60 24" fill="none">
      <path
        d="M2 19 C 9 5, 19 2, 29.5 11.5 C 39 20.5, 50 22, 58 7"
        stroke="var(--sage-deep)"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

type Row = { icon: React.ReactElement; title: string; sub: string | null };

export default function WhatItTakes({ className = "" }: { className?: string }) {
  const rows = [
    SESSION_LENGTH.verified && {
      icon: <ClockIcon />,
      title: `${SESSION_MINUTES} minutes per visit`,
      sub: FULL_COURSE.verified
        ? `${FULL_COURSE.value.sessions} sessions for a full course.`
        : null,
    },
    {
      icon: <WaveIcon />,
      title: "Simply settle in",
      sub: "Sit, rest or read during your session.",
    },
  ].filter((r): r is Row => !!r);

  return (
    <section
      className={`sec-tight cost-sec ${className}`.trim()}
      aria-labelledby="cost-heading"
    >
      <div className="wrap">
        <div className="cost-grid">
          {/* LEFT — time & what to expect */}
          <div className="cost-copy rv">
            <div className="eyebrow">Time, cost &amp; what to expect</div>
            <h2 id="cost-heading" className="cost-head">
              A clear path.
              <br />
              At your pace.
            </h2>
            <p className="cost-subline">
              Know what to expect before you begin.
            </p>
            <ul className="cost-rows">
              {rows.map((r) => (
                <li className="cost-row" key={r.title}>
                  <span className="cost-icon" aria-hidden="true">
                    {r.icon}
                  </span>
                  <span className="cost-row-text">
                    <span className="cost-row-title">{r.title}</span>
                    {r.sub && <span className="cost-row-sub">{r.sub}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* RIGHT — the first step, priced */}
          <div className="cost-card rv">
            <div className="eyebrow cost-card-eyebrow">Your first step</div>
            <div className="cost-card-name">Brain Map</div>
            <p className="cost-price">
              {BRAIN_MAP_PRICE}
              <span className="cost-price-tail">to get started.</span>
            </p>
            {/* Directly under the price, solid gold, not the outline pill it
                was below the package row (Ben, 2026-10-16: visitors — and a
                long-time referral partner — were missing it). */}
            <span className="cost-badge">
              <CheckIcon className="cost-badge-check" />
              {HSA_FSA_ACCEPTED}
            </span>
            <div className="cost-card-divider" aria-hidden="true" />
            <div className="cost-package">
              <span>{PACKAGE_SESSIONS}-session package</span>
              <span className="cost-package-price">{PACKAGE_PRICE}</span>
            </div>
            <Link href="/contact" className="btn btn-invert cost-cta">
              See If It&rsquo;s a Fit <span className="arrow">&rarr;</span>
            </Link>
            <p className="cost-fit">Let&rsquo;s see if we&rsquo;re a good fit.</p>
          </div>
        </div>

        {/* BOTTOM strip — full width, thin top rule */}
        <div className="cost-strip rv">
          <span className="cost-strip-left">
            An honest conversation before you pay anything.
          </span>
          <Link href="/faq#what-does-it-cost" className="cost-strip-link">
            See full pricing <span className="arrow">&rarr;</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
