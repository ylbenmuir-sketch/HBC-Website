import type { Metadata } from "next";
import { giveawayNow } from "@/lib/giveaway/clock";
import FAQAccordion from "@/components/FAQAccordion";
import { giveawayQuestions } from "@/components/giveaway/TenYearsView";
import { DEVICES, DRAWINGS, RULES_VERSION, breakdownSumUsd, giftRevealed, pageMode, prizeBreakdown, prizeFor, prizeRetailUsd, prizeTotalUsd, type PrizePart, type PrizeSpec } from "@/lib/giveaway/config";
import { PAGES } from "@/lib/giveaway/copy";
import { NO_PURCHASE_LINE, rulesSections } from "@/lib/giveaway/rules";
import { locationPhone, locations } from "@/lib/locations";
import { assistantSuppressedByGiveaway } from "@/lib/giveaway/assistant";
import { showcaseActive, tenYearsPublic } from "@/lib/giveaway/showcase";
import AssistantOff from "@/components/giveaway/AssistantOff";
import { EMAIL_ADDRESS, SITE_URL } from "@/lib/site-config";
import { LEGAL_ENTITY } from "@/lib/sms-identity";

/**
 * /10years/rules — the prize table, the giveaway questions, then the
 * Official Rules at #rules (fix list rev 2, P0-1). The form links to #rules
 * and records RULES_VERSION on acceptance.
 *
 * Ben approves the rules himself. Their words live in lib/giveaway/rules.ts
 * and every fact in them comes from lib/giveaway/config.ts. The prize table
 * is prizeBreakdown() — the same parts and values the ladder's popovers
 * show, so the two cannot drift; every total is the sum of its priced lines
 * (config test), and the pocket device and partner prizes read TBD.
 *
 * Before the gift reveal (Sat Nov 21, 7 PM CT, on the REAL clock) neither
 * the questions nor §13 name the thank-you gift (P0-2). Indexed on the same
 * clock as /10years (P0-6).
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const DESCRIPTION = "Official Rules and prize details for the Harmonized Brain Centers 10-year giveaway: who may enter, how entries and drawings work, each prize and its value, and how winners are notified.";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Official Rules and prize details — 10-year giveaway",
    description: DESCRIPTION,
    alternates: { canonical: "/10years/rules" },
    robots: tenYearsPublic() ? { index: true, follow: true } : { index: false, follow: true },
  };
}

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;

export default function RulesPage() {
  // Linked from /10years, which is open from the engine's turn-on (showcase or the real page, Ben 2026-11-07); noindex until Nov 9.
  // The assistant is off here in the showcase and before Nov 9, as on /10years.
  const showcase = showcaseActive() || pageMode(giveawayNow()) === "hidden";
  const revealed = giftRevealed(giveawayNow());
  const t = PAGES.tenYears;
  const q = giveawayQuestions();
  const siteHost = SITE_URL.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const sections = rulesSections({
    legalEntity: LEGAL_ENTITY,
    // The open centers, their confirmed addresses and lines (lib/locations.ts).
    centers: locations
      .filter((l) => !l.comingSoon)
      .map((l) => ({ name: l.name, address: `${l.address.streetAddress}, ${l.address.addressLocality}, ${l.address.addressRegion} ${l.address.postalCode}`, phone: locationPhone(l)?.display ?? null })),
    siteHost,
    contactEmail: EMAIL_ADDRESS,
    privacyUrl: `${SITE_URL.replace(/\/$/, "")}/privacy-policy`,
    giftRevealed: revealed,
  });
  return (
    <section className="page-hero ty-details">
      {(showcase || assistantSuppressedByGiveaway()) && <AssistantOff />}
      <div className="wrap article policy" style={{ maxWidth: 760 }}>
        <p className="ty-eyebrow">{t.eyebrow}</p>
        <h1 id="prizes" style={{ fontSize: 36 }}>
          {t.detailsTitle}
        </h1>
        <table className="ty-table" data-prizes>
          <thead>
            <tr>
              <th scope="col">Drawing</th>
              <th scope="col">{t.prizeHead}</th>
            </tr>
          </thead>
          <tbody>
            {DRAWINGS.map((d) => (
              <tr key={d.slot} data-slot={d.slot}>
                <td>
                  <b>
                    {d.dayName}
                    {d.kind === "grand" ? " — grand prize" : ""}
                  </b>
                  <span>{d.ct}</span>
                </td>
                <td>
                  <PrizeCell p={prizeFor(d.slot)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="micro" data-prize-total={prizeTotalUsd()}>
          All six prizes: {usd(prizeTotalUsd())}. {t.prizesNote}
        </p>
        <h2 id="questions">{t.qaTitle}</h2>
        <FAQAccordion items={revealed ? [q.enter, q.more, q.when, q.win, q.offer] : [q.enter, q.more, q.when, q.win]} className="faq-list ty-details-qa" />
        <h2 id="rules">Official Rules</h2>
        <p className="sub">Rules version {RULES_VERSION}.</p>
        <p>
          <strong>{NO_PURCHASE_LINE}</strong>
        </p>
        {sections.map((s) => (
          <div key={s.id} id={`rule-${s.id}`} data-rule={s.n}>
            <h3>
              {s.n}. {s.title}
            </h3>
            {s.blocks.map((b, i) =>
              "p" in b ? (
                <p key={i}>{b.p}</p>
              ) : "strong" in b ? (
                <p key={i}>
                  <strong>{b.strong}</strong>
                </p>
              ) : "link" in b ? (
                <p key={i}>
                  {b.link.before} <a href={b.link.href}>{b.link.label}</a>.
                </p>
              ) : (
                <ul key={i}>
                  {b.ul.map((li) => (
                    <li key={li}>{li}</li>
                  ))}
                </ul>
              )
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/** One prize: every part with its value, then the total (the sum of the lines). */
function PrizeCell({ p }: { p: PrizeSpec }) {
  const parts = prizeBreakdown(p);
  const total = breakdownSumUsd(parts);
  // The config test holds this; a mismatch here would mean the page and the seed disagree.
  if (total !== prizeRetailUsd(p)) throw new Error(`rules table: ${p.slot} breakdown ${total} ≠ ARV ${prizeRetailUsd(p)}`);
  return (
    <ul className="ty-rules-bd" data-arv={total.toFixed(2)}>
      {parts.map((part) => (
        <li key={`${part.kind}-${part.partner?.id ?? part.device ?? ""}`}>
          <span>
            {partLabel(part)}
            {part.kind === "partner" && (
              <small className="ty-rules-note">
                {PAGES.tenYears.breakdown.partnerNote(part.partner!.validThrough ? new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", year: "numeric" }).format(part.partner!.validThrough) : null)}
                {part.partner!.terms ? `. ${part.partner!.terms}` : ""}
              </small>
            )}
          </span>{" "}
          <b>{usd(part.usd)}</b>
        </li>
      ))}
      <li className="ty-rules-total">
        <span>{PAGES.tenYears.breakdown.total}</span> <b>{usd(total)}</b>
      </li>
    </ul>
  );
}

function partLabel(part: PrizePart): string {
  const b = PAGES.tenYears.breakdown;
  switch (part.kind) {
    case "brainMap":
      return b.brainMap;
    case "sessions":
      return b.sessions(part.count);
    case "chair":
      return b.chair(part.count, part.unitUsd);
    case "brainMd":
      return b.brainMd(part.count, usd(part.unitUsd));
    case "hoolest":
      return DEVICES[part.device!].name;
    case "partner":
      return b.partnerGift(part.partner!.gift, part.count, usd(part.unitUsd));
  }
}
