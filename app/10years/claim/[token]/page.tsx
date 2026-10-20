import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { giveawayNow } from "@/lib/giveaway/clock";
import { giveawayEngineEnabled } from "@/lib/giveaway/engine";
import { formatCentralLabel, pageMode, prizeName, prizeFor } from "@/lib/giveaway/config";
import { PAGES } from "@/lib/giveaway/copy";
import { drawingById, winnerByToken } from "@/lib/giveaway/drawings";
import type { PersonRow } from "@/lib/giveaway/rows";
import { giveawayStore } from "@/lib/giveaway/store";

/**
 * The winner's claim page (GIVEAWAY-PLAN.md §4): one phone field, the
 * deadline, the tax-form line when required, the public-OK note. The link
 * carries the raw claim code; the row holds its hash.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = { title: "Claim your prize", robots: { index: false, follow: false } };

export default async function ClaimPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ done?: string; error?: string }> }) {
  // Not a page at all while the engine is off (lib/giveaway/engine.ts).
  if (!giveawayEngineEnabled()) notFound();
  const now = giveawayNow();
  if (pageMode(now) === "hidden") notFound();
  const { token } = await params;
  const sp = await searchParams;
  const t = PAGES.tenYears;
  const store = giveawayStore();
  const winner = store ? await winnerByToken(store, decodeURIComponent(token)) : null;
  const drawing = winner && store ? await drawingById(store, winner.drawing_id) : null;
  const person = winner && store ? ((await store.select("giveaway_people", "*").eq("id", winner.person_id).single()).data as PersonRow) : null;

  let body: React.ReactNode;
  if (!winner || !drawing || !person) {
    body = <p className="sub">{t.claimInvalid}</p>;
  } else if (winner.status === "redrawn" || winner.status === "ineligible" || winner.status === "declined" || (winner.status === "unreachable" && new Date(winner.claim_deadline_at) < now)) {
    body = <p className="sub">{t.claimExpired}</p>;
  } else {
    const prize = prizeName(prizeFor(drawing.slot, winner.prize_version));
    body = (
      <>
        <h1 style={{ fontSize: 34 }}>{t.claimHeading(person.first_name)}</h1>
        <p className="sub">{t.claimBody(prize, formatCentralLabel(new Date(winner.claim_deadline_at)))}</p>
        {winner.tax_form_required && <p className="sub">{t.claimTax}</p>}
        {sp.done || winner.phone ? (
          <p className="sub" role="status" data-claimed="1" style={{ color: "var(--sage-deep)" }}>
            {t.claimDone}
          </p>
        ) : (
          <form method="post" action={`/10years/claim/${encodeURIComponent(token)}/submit`} className="form" style={{ maxWidth: 420 }}>
            {sp.error && (
              <p className="sub" role="alert" style={{ color: "var(--alert, #9a3b2e)" }}>
                Please add a phone number we can call.
              </p>
            )}
            <label htmlFor="phone">{t.claimPhone}</label>
            <input id="phone" name="phone" type="tel" autoComplete="tel" required maxLength={40} />
            <div style={{ marginTop: 20 }}>
              <button type="submit" className="btn btn-primary">
                {t.claimButton}
              </button>
            </div>
          </form>
        )}
      </>
    );
  }
  return (
    <section className="page-hero">
      <div className="wrap" style={{ maxWidth: 720 }}>
        <div className="eyebrow">{t.eyebrow}</div>
        {body}
      </div>
    </section>
  );
}
