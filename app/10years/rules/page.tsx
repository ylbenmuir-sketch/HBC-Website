import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { giveawayNow } from "@/lib/giveaway/clock";
import FAQAccordion from "@/components/FAQAccordion";
import { giveawayQuestions } from "@/components/giveaway/TenYearsView";
import { DEVICES, DRAWINGS, RULES_VERSION, breakdownSumUsd, giftRevealed, pageMode, prizeBreakdown, prizeFor, prizeRetailUsd, type PrizePart, type PrizeSpec } from "@/lib/giveaway/config";
import { PAGES } from "@/lib/giveaway/copy";
import { rulesSections } from "@/lib/giveaway/rules";
import { assistantSuppressedByGiveaway } from "@/lib/giveaway/assistant";
import { showcaseActive, tenYearsPublic } from "@/lib/giveaway/showcase";
import AssistantOff from "@/components/giveaway/AssistantOff";
import { EMAIL_ADDRESS, SITE_URL } from "@/lib/site-config";
import { DBA_SENTENCE, LEGAL_ENTITY, REGISTERED_ADDRESS_LINE } from "@/lib/sms-identity";

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

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

export default function RulesPage() {
  // The /10years page links here, so the showcase (lib/giveaway/showcase.ts) needs it too.
  const showcase = showcaseActive();
  if (!showcase && pageMode(giveawayNow()) === "hidden") notFound();
  const revealed = giftRevealed(giveawayNow());
  const t = PAGES.tenYears;
  const q = giveawayQuestions();
  const sections = rulesSections({
    legalEntity: LEGAL_ENTITY,
    dbaSentence: DBA_SENTENCE,
    addressLine: REGISTERED_ADDRESS_LINE,
    siteHost: SITE_URL.replace(/^https?:\/\//, "").replace(/\/$/, ""),
    contactEmail: EMAIL_ADDRESS,
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
              <th scope="col">{t.newClient}</th>
              <th scope="col">{t.currentClient}</th>
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
                <td data-label={t.newClient}>
                  <PrizeCell p={prizeFor(d.slot, "new_client")} />
                </td>
                <td data-label={t.currentClient}>
                  <PrizeCell p={prizeFor(d.slot, "current_client")} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="micro">{t.prizesNote}</p>
        <h2 id="questions">{t.qaTitle}</h2>
        <FAQAccordion items={revealed ? [q.enter, q.more, q.when, q.win, q.offer] : [q.enter, q.more, q.when, q.win]} className="faq-list ty-details-qa" />
        <h2 id="rules">Official Rules</h2>
        <p className="sub">Rules version {RULES_VERSION}.</p>
        {sections.map((s) => (
          <div key={s.id} id={`rule-${s.id}`} data-rule={s.n}>
            <h3>
              {s.n}. {s.title}
            </h3>
            {s.paras.slice(0, s.list ? 1 : undefined).map((para) => (
              <p key={para}>{para}</p>
            ))}
            {s.list && (
              <>
                <ul>
                  {s.list.map((li) => (
                    <li key={li}>{li}</li>
                  ))}
                </ul>
                {s.paras.slice(1).map((para) => (
                  <p key={para}>{para}</p>
                ))}
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/** One prize, one version: every part with its value, then the total (the sum of the priced lines). */
function PrizeCell({ p }: { p: PrizeSpec }) {
  const parts = prizeBreakdown(p);
  const total = breakdownSumUsd(parts);
  // The config test holds this; a mismatch here would mean the page and the seed disagree.
  if (total !== prizeRetailUsd(p)) throw new Error(`rules table: ${p.slot}/${p.version} breakdown ${total} ≠ ARV ${prizeRetailUsd(p)}`);
  return (
    <ul className="ty-rules-bd" data-arv={total}>
      {parts.map((part) => (
        <li key={part.kind}>
          <span>{partLabel(part)}</span> <b>{partValue(part)}</b>
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
      return b.chair(part.count, part.unitUsd ?? null);
    case "keychain":
      return `${DEVICES.keychain.name} by ${DEVICES.keychain.by}`;
    case "handheld":
      return `${DEVICES.handheld.name} by ${DEVICES.handheld.by} (${DEVICES.handheld.keep})`;
    case "partner":
      return b.partner(part.partner?.name ?? null);
  }
}

function partValue(part: PrizePart): string {
  const b = PAGES.tenYears.breakdown;
  if (part.usd != null) return usd(part.usd);
  return part.kind === "partner" ? b.partnerTbd : b.unpriced;
}
