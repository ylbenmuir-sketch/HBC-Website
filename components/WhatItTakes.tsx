import Link from "next/link";
import { Fragment } from "react";
import {
  BRAIN_MAP_PRICE,
  FULL_COURSE,
  PACKAGE_PRICE,
  PACKAGE_SESSIONS,
  SESSION_LENGTH,
  SESSION_MINUTES,
} from "@/lib/site-config";

/**
 * "What it takes" — time, money, effort (Ben, 2026-10-15, after Donald
 * Miller's "is this worth the time, money and effort?"). On the homepage
 * after "How it works", and on /first-visit under the hero.
 *
 * Three equal cards, each led by one figure in the display serif with a line
 * or two beneath it (Ben, second build of 2026-10-15: the first version read
 * like a price list). The fine print about the Brain Map sitting outside the
 * package is gone from here by Ben's call — FAQ "What does it cost?", the
 * link at the foot, carries it.
 *
 * Every figure is read from lib/site-config.ts, so nothing here can drift
 * from the FAQ or the cost card. A Verifiable that is not verified takes its
 * claim out rather than printing it: the time card goes if SESSION_LENGTH
 * does, the full-course clause if FULL_COURSE does.
 */
type Card = { big: string; lines: string[] };

export default function WhatItTakes({ className = "" }: { className?: string }) {
  const cards = [
    SESSION_LENGTH.verified && {
      big: `${SESSION_MINUTES} min`,
      lines: [
        FULL_COURSE.verified
          ? `per visit · ${FULL_COURSE.value.sessions} sessions for a full course`
          : "per visit",
      ],
    },
    {
      big: BRAIN_MAP_PRICE,
      lines: [
        "to start, with your Brain Map",
        `${PACKAGE_SESSIONS}-session package ${PACKAGE_PRICE} · HSA/FSA accepted`,
      ],
    },
    {
      big: "Nothing",
      lines: ["to do. Sit, rest or read."],
    },
  ].filter((c): c is Card => !!c);

  return (
    <section className={`sec-tight what-it-takes ${className}`.trim()} aria-labelledby="what-it-takes">
      <div className="wrap">
        <div className="eyebrow rv" id="what-it-takes">
          What it takes
        </div>
        <ul className="wit-grid rv">
          {cards.map((c) => (
            <li className="wit-card" key={c.big}>
              <p className="wit-big">{c.big}</p>
              {/* Each "·" segment holds together, so a line breaks between
                  facts ("HSA/FSA accepted"), never inside one. */}
              {c.lines.map((l) => (
                <p className="wit-line" key={l}>
                  {l.split(" · ").map((seg, i) => (
                    <Fragment key={seg}>
                      {i > 0 && " · "}
                      <span className="wit-seg">{seg}</span>
                    </Fragment>
                  ))}
                </p>
              ))}
            </li>
          ))}
        </ul>
        <p className="wit-foot rv">
          Free call first &mdash; we&rsquo;ll tell you honestly whether it&rsquo;s a
          fit before you pay anything.{" "}
          <Link href="/faq#what-does-it-cost">See full pricing &rarr;</Link>
        </p>
      </div>
    </section>
  );
}
