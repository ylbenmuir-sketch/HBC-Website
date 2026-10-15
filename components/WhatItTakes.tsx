import Link from "next/link";
import {
  BRAIN_MAP_PRICE,
  FIRST_VISIT_DURATION,
  FULL_COURSE,
  PACKAGE_NOTE,
  PACKAGE_PRICE,
  PACKAGE_SESSIONS,
  SESSION_LENGTH,
} from "@/lib/site-config";

/**
 * "What it takes" — time, money, effort, in three columns (Ben, 2026-10-15,
 * after Donald Miller's "is this worth the time, money and effort?").
 * On the homepage after "How it works", and on /first-visit under the hero.
 *
 * Every figure is read from lib/site-config.ts — nothing typed here can
 * drift from the FAQ or the cost card. A figure that is not verified drops
 * out of its line rather than printing (SESSION_LENGTH and FULL_COURSE are
 * Verifiables). PACKAGE_NOTE rides the package price, as Ben's rule says it
 * must wherever that price appears. The insurance line is INSURANCE_POLICY
 * shortened, saying the same three things.
 */
export default function WhatItTakes({ className = "" }: { className?: string }) {
  const visit = SESSION_LENGTH.verified ? `${capitalize(SESSION_LENGTH.value)} a visit` : null;
  const course = FULL_COURSE.verified ? `A full course is ${FULL_COURSE.value.sessions} sessions` : null;
  const columns = [
    {
      h: "Time",
      lines: [
        visit,
        course,
        `First visit (the Brain Map): ${FIRST_VISIT_DURATION}`,
      ],
    },
    {
      h: "Money",
      lines: [
        `Brain Map ${BRAIN_MAP_PRICE} · ${PACKAGE_SESSIONS}-session package ${PACKAGE_PRICE}`,
        "HSA/FSA accepted",
        "We don’t bill insurance (superbill available)",
      ],
      note: PACKAGE_NOTE,
    },
    {
      h: "Effort",
      lines: ["Nothing to do — sit, rest or read."],
    },
  ];
  return (
    <section className={`sec-tight what-it-takes ${className}`.trim()} aria-labelledby="what-it-takes">
      <div className="wrap">
        <div className="eyebrow rv" id="what-it-takes">
          What it takes
        </div>
        <div className="wit-grid rv">
          {columns.map((c) => (
            <div className="wit-col" key={c.h}>
              <h3>{c.h}</h3>
              <ul>
                {c.lines.filter(Boolean).map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
              {c.note && <p className="wit-note">{c.note}</p>}
            </div>
          ))}
        </div>
        <p className="wit-foot rv">
          Free call first &mdash; we&rsquo;ll tell you honestly whether it&rsquo;s a
          fit before you pay anything.{" "}
          <Link href="/faq#what-does-it-cost">See full pricing &rarr;</Link>
        </p>
      </div>
    </section>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
