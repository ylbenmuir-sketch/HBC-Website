import AssistantOff from "./AssistantOff";
import Seal from "./Seal";
import { DRAWINGS, centralParts } from "@/lib/giveaway/config";
import { CLOSED_COPY } from "@/lib/giveaway/engine";
import { PAGES } from "@/lib/giveaway/copy";
import { ESTABLISHED_YEAR } from "@/lib/site-config";

/**
 * The giveaway is closed (Ben, 2026-11-23; lib/giveaway/engine.ts →
 * giveawayClosed): every free Brain Map has been given away. One message in
 * the /10years hero's own design — the seal, the heading, the body, one
 * button to /contact — and nothing else: no form, no countdown, no prize
 * ladder, no booking button. Shown by /10years and every page under it
 * except the rules, and by /contact?from=10years.
 */
export default function ClosedView() {
  const weekYear = centralParts(DRAWINGS[0].at).year;
  const years = weekYear - ESTABLISHED_YEAR.value;
  const t = PAGES.tenYears;
  return (
    <div className="ty" data-mode="given-away" data-giveaway-closed>
      <AssistantOff />
      <section className="ty-hero ty-hype ty-given">
        <div className="wrap ty-hype-inner">
          <Seal number={years} years={t.sealYears(years).replace(/^\[DRAFT\] /, "")} span={t.sealSpan(ESTABLISHED_YEAR.value, weekYear).replace(/^\[DRAFT\] /, "")} />
          <h1 className="ty-given-h1">{CLOSED_COPY.heading}</h1>
          <p className="ty-given-body">{CLOSED_COPY.body}</p>
          <a href={CLOSED_COPY.href} className="btn btn-primary ty-given-btn" data-closed-book>
            {CLOSED_COPY.button}
          </a>
        </div>
      </section>
    </div>
  );
}
