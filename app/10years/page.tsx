import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Breadcrumbs from "@/components/Breadcrumbs";
import PageSchema from "@/components/PageSchema";
import FAQAccordion from "@/components/FAQAccordion";
import { Btn } from "@/components/Buttons";
import { giveawayNow } from "@/lib/giveaway/clock";
import { CLAIM_WINDOW_MS, DRAWINGS, OFFER, REFERRAL, SCHEDULE, nextDrawing, partnerFor, pageMode, prizeFor, prizeName, spokenCentral } from "@/lib/giveaway/config";
import { PAGES } from "@/lib/giveaway/copy";
import { giveawayStore } from "@/lib/giveaway/store";
import { publicWinners } from "@/lib/giveaway/web";
import { hubTrail, pageMetadata } from "@/lib/pages";

/**
 * /10years — the anniversary giveaway page (GIVEAWAY-PLAN.md §4, §6).
 *
 * Four modes, switched by the config clock, never by a deploy:
 *   hidden     before Nov 9      → 404 (this route does not exist yet)
 *   notify_me  Nov 9 – Nov 15    → the message, the prizes, the full form
 *                                  (so the Sunday email can be one tap)
 *   live       Nov 15 – Nov 21   → the same form, now entering; winners list
 *   closed     Nov 21 – Dec 5    → thank-you + winners; no form
 *   thank_you  after Dec 5       → the permanent thank-you page
 *
 * Plain HTML forms (POST to /10years/signup, redirect back with a query)
 * so it works without JavaScript and the check can drive it with fetch.
 * Every time and prize comes from lib/giveaway/config.ts. The assistant is
 * off this route for the whole window (lib/site-config.ts). Copy is [DRAFT]
 * (lib/giveaway/copy.ts).
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = pageMetadata("/10years");

type Search = { sent?: string; already?: string; error?: string; ref?: string; done?: string };

function spokenDate(at: Date): string {
  return new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", month: "long", day: "numeric" }).format(at);
}

export default async function TenYearsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const now = giveawayNow();
  const mode = pageMode(now);
  if (mode === "hidden") notFound();
  const sp = await searchParams;
  const t = PAGES.tenYears;
  const trail = hubTrail("/10years");
  const next = nextDrawing(now) ?? DRAWINGS[0];
  const firstPrize = prizeName(prizeFor("mon", "new_client"));
  const nextPrize = prizeName(prizeFor(next.slot, "new_client"));
  const store = giveawayStore();
  const winners = store && mode !== "notify_me" ? await publicWinners(store).catch(() => []) : [];
  const showForm = mode === "notify_me" || mode === "live";
  const ref = (sp.ref ?? "").toUpperCase().slice(0, 20);

  const heading = mode === "notify_me" ? t.notifyHeading : mode === "live" ? t.liveHeading : mode === "closed" ? t.closedHeading : t.thankYouHeading;
  const sub =
    mode === "notify_me"
      ? t.notifySub(spokenCentral(SCHEDULE.entriesOpen.at), firstPrize)
      : mode === "live"
        ? t.liveSub(spokenCentral(next.at), nextPrize)
        : mode === "closed"
          ? t.closedSub(spokenDate(OFFER.visitBy.at))
          : t.thankYouSub;

  const notice =
    sp.sent ? (mode === "notify_me" ? t.notifySent("your inbox") : t.liveSent("your inbox")) : sp.already ? (mode === "notify_me" ? t.notifyAlready : t.liveAlready) : sp.error ? errorText(sp.error) : null;

  const qa = [
    { q: t.qa.enterQ, a: t.qa.enterA },
    { q: t.qa.moreQ, a: t.qa.moreA(REFERRAL.referrerBonus, REFERRAL.referredBonus, REFERRAL.friendCap) },
    { q: t.qa.whenQ, a: t.qa.whenA(DRAWINGS.filter((d) => d.kind === "daily").map((d) => d.dayName).join(", "), spokenCentral(DRAWINGS[5].at)) },
    { q: t.qa.winQ, a: t.qa.winA(Math.round(CLAIM_WINDOW_MS / 3_600_000)) },
    { q: t.qa.offerQ, a: t.qa.offerA(spokenDate(OFFER.bookBy.at), spokenDate(OFFER.visitBy.at), OFFER.packageSessions) },
  ];

  return (
    <>
      <PageSchema path="/10years" breadcrumb={trail} />
      <Breadcrumbs trail={trail} />
      <section className="page-hero">
        <div className="wrap">
          <div className="eyebrow">{t.eyebrow}</div>
          <h1 style={{ maxWidth: "24ch" }}>{heading}</h1>
          <p className="sub" style={{ maxWidth: "60ch" }}>
            {sub}
          </p>
          {!showForm && (
            <div className="hero-ctas" style={{ marginTop: 28 }}>
              <Btn href="/contact">{t.talk}</Btn>
            </div>
          )}
        </div>
      </section>

      {showForm && (
        <section className="sec-tight" id="enter" style={{ paddingTop: 56, paddingBottom: 56 }}>
          <div className="wrap" style={{ maxWidth: 720 }}>
            <h2 style={{ fontSize: 30, margin: "0 0 8px" }}>{mode === "notify_me" ? t.notifyFormTitle : t.liveFormTitle}</h2>
            {ref && mode === "live" && <p className="sub">{t.refNote}</p>}
            {notice && (
              <p className="sub" role="status" style={{ color: sp.error ? "var(--alert, #9a3b2e)" : "var(--sage-deep)" }}>
                {notice}
              </p>
            )}
            <form method="post" action="/10years/signup" className="form" noValidate={false}>
              <input type="hidden" name="ref" value={ref} />
              <input type="hidden" name="source_page" value="/10years" />
              <div className="two">
                <div>
                  <label htmlFor="first_name">{t.firstName}</label>
                  <input id="first_name" name="first_name" autoComplete="given-name" required maxLength={60} />
                </div>
                <div>
                  <label htmlFor="last_name">{t.lastName}</label>
                  <input id="last_name" name="last_name" autoComplete="family-name" required maxLength={60} />
                </div>
              </div>
              <div className="two">
                <div>
                  <label htmlFor="email">{t.email}</label>
                  <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} />
                </div>
                <div>
                  <label htmlFor="zip">{t.zip}</label>
                  <input id="zip" name="zip" inputMode="numeric" autoComplete="postal-code" pattern="[0-9]{5}" required maxLength={5} />
                </div>
              </div>
              {/* The honeypot — a field no person sees or fills. Same pattern as the contact form. */}
              <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
                <label htmlFor="website">{t.honeypot}</label>
                <input id="website" name="website" tabIndex={-1} autoComplete="off" />
              </div>
              <div style={{ marginTop: 22, display: "grid", gap: 10 }}>
                <Check name="age" label={t.age} required />
                <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 15, lineHeight: 1.5, textTransform: "none", letterSpacing: 0, color: "var(--ink)", margin: 0 }}>
                  <input type="checkbox" name="rules" required style={{ width: 18, height: 18, marginTop: 3 }} />
                  <span>
                    {t.rules} (<a href="/10years/rules">{t.rulesLink}</a>)
                  </span>
                </label>
                <Check name="existing_client" label={t.existingClient} />
                <Check name="marketing" label={t.marketing} />
              </div>
              <div style={{ marginTop: 24 }}>
                <button type="submit" className="btn btn-primary">
                  {mode === "notify_me" ? t.notifyButton : t.liveButton}
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      {!showForm && notice && (
        <section className="sec-tight" style={{ paddingTop: 24, paddingBottom: 0 }}>
          <div className="wrap" style={{ maxWidth: 720 }}>
            <p className="sub">{notice}</p>
          </div>
        </section>
      )}

      {winners.length > 0 && (
        <section className="sec-tight" style={{ paddingTop: 40, paddingBottom: 40 }}>
          <div className="wrap" style={{ maxWidth: 720 }}>
            <h2 style={{ fontSize: 30, margin: "0 0 14px" }}>{t.winnersTitle}</h2>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }} data-winners>
              {winners.map((w) => (
                <li key={w.slot} data-state={w.state} style={{ fontSize: 17, lineHeight: 1.5 }}>
                  {w.line}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      <section className="sec-tight" style={{ paddingTop: 40, paddingBottom: 40 }}>
        <div className="wrap" style={{ maxWidth: 820 }}>
          <h2 style={{ fontSize: 30, margin: "0 0 10px" }}>{t.prizesTitle}</h2>
          <p className="sub" style={{ maxWidth: "70ch" }}>
            {t.prizesIntro}
          </p>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 16 }} data-prizes>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--slate)", fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                <th style={{ padding: "8px 12px 8px 0" }}>Drawing</th>
                <th style={{ padding: "8px 12px 8px 0" }}>{t.newClient}</th>
                <th style={{ padding: "8px 0" }}>{t.currentClient}</th>
              </tr>
            </thead>
            <tbody>
              {DRAWINGS.map((d) => {
                const partner = partnerFor(d.slot);
                return (
                  <tr key={d.slot} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={{ padding: "10px 12px 10px 0", verticalAlign: "top", fontWeight: 600 }}>
                      {d.dayName}
                      {d.kind === "grand" ? " — grand prize" : ""}
                      <div style={{ fontWeight: 400, color: "var(--slate)", fontSize: 14 }}>{d.ct}</div>
                    </td>
                    <td style={{ padding: "10px 12px 10px 0", verticalAlign: "top" }}>
                      {prizeName(prizeFor(d.slot, "new_client"))}
                      {partner ? <div style={{ color: "var(--slate)", fontSize: 14 }}>{`${t.partnerPrefix} ${partner.name}${partner.prize ? `: ${partner.prize}` : ""}`}</div> : null}
                    </td>
                    <td style={{ padding: "10px 0", verticalAlign: "top" }}>{prizeName(prizeFor(d.slot, "current_client"))}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="sec-tight" style={{ paddingTop: 40, paddingBottom: 80 }}>
        <div className="wrap" style={{ maxWidth: 820 }}>
          <h2 style={{ fontSize: 30, margin: "0 0 10px" }}>{t.qaTitle}</h2>
          <FAQAccordion items={qa} className="faq-list" />
        </div>
      </section>
    </>
  );
}

function Check({ name, label, required = false }: { name: string; label: string; required?: boolean }) {
  return (
    <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 15, lineHeight: 1.5, textTransform: "none", letterSpacing: 0, color: "var(--ink)", margin: 0 }}>
      <input type="checkbox" name={name} required={required} style={{ width: 18, height: 18, marginTop: 3 }} />
      <span>{label}</span>
    </label>
  );
}

function errorText(code: string): string {
  const e = PAGES.tenYears.errors as Record<string, string>;
  if (code === "not_tennessee") return PAGES.nonTennesseeZip;
  if (code === "closed") return PAGES.tenYears.tapClosed;
  return e[code] ?? e.unavailable;
}
