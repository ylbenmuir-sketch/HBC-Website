import type { ReactNode } from "react";
import FAQAccordion from "@/components/FAQAccordion";
import CopyLink from "./CopyLink";
import {
  CLAIM_WINDOW_MS,
  DRAWINGS,
  OFFER,
  REFERRAL,
  SCHEDULE,
  nextDrawing,
  prizeFor,
  shortCentralTime,
  spokenCentral,
  spokenCentralDateTime,
  spokenCentralRange,
  type Drawing,
  type PageMode,
  type PrizeSpec,
} from "@/lib/giveaway/config";
import { PAGES } from "@/lib/giveaway/copy";
import type { PublicWinner } from "@/lib/giveaway/web";

/**
 * /10years, laid out to fit one 1440×900 screen (Ben, 2026-10-19): a
 * two-column hero (the words left, the form card right — the only card
 * with an edge on the page), one row of prizes, three questions. The verify
 * and one-tap pages render the same view with a different card, so a
 * confirmation lands where the form was.
 *
 * Every time and prize is read from lib/giveaway/config.ts; every word from
 * lib/giveaway/copy.ts. Styles are the `.ty-` block in app/globals.css.
 */

const t = PAGES.tenYears;

type ViewMode = Exclude<PageMode, "hidden">;

export default function TenYearsView({ mode, now, card }: { mode: ViewMode; now: Date; card: ReactNode }) {
  const sub = mode === "closed" ? t.closedSub : mode === "thank_you" ? t.thankYouSub : t.sub(DRAWINGS.length);
  return (
    <div className="ty" data-mode={mode}>
      <section className="ty-hero">
        <div className="wrap ty-hero-grid">
          <div className="ty-hero-text">
            <span className="ty-ten" aria-hidden="true">
              10
            </span>
            <p className="ty-eyebrow">{t.eyebrow}</p>
            <h1>{t.heading}</h1>
            <p className="ty-sub">{sub}</p>
            <p className="ty-meta">{t.meta(spokenCentralRange(DRAWINGS[0].at, DRAWINGS[DRAWINGS.length - 1].at))}</p>
          </div>
          <div className="ty-card" id="enter">
            {card}
          </div>
        </div>
      </section>
      <PrizesRow mode={mode} now={now} />
      <QuestionsRow />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The cards                                                           */
/* ------------------------------------------------------------------ */

export function FormCard({ mode, now, refCode, error }: { mode: "notify_me" | "live"; now: Date; refCode: string; error: string | null }) {
  const next = nextDrawing(now) ?? DRAWINGS[0];
  return (
    <>
      <h2 className="ty-card-title">{mode === "notify_me" ? t.notifyFormTitle : t.liveFormTitle}</h2>
      <p className="ty-card-line">{mode === "notify_me" ? t.notifyFormLine(spokenCentralDateTime(SCHEDULE.entriesOpen.at)) : t.liveFormLine(spokenCentral(next.at))}</p>
      {error && (
        <p className="ty-error" role="alert">
          {error}
        </p>
      )}
      <form method="post" action="/10years/signup" className="form ty-form">
        <input type="hidden" name="ref" value={refCode} />
        <input type="hidden" name="source_page" value="/10years" />
        <div className="ty-fields">
          <div>
            <label htmlFor="first_name">{t.firstName}</label>
            <input id="first_name" name="first_name" autoComplete="given-name" required maxLength={60} />
          </div>
          <div>
            <label htmlFor="last_name">{t.lastName}</label>
            <input id="last_name" name="last_name" autoComplete="family-name" required maxLength={60} />
          </div>
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
        <div className="ty-checks">
          <label className="ty-check">
            <input type="checkbox" name="age_rules" required />
            <span>
              {t.ageRules} <a href="/10years/rules#rules">{t.rulesLink}</a>
            </span>
          </label>
          <label className="ty-check">
            <input type="checkbox" name="existing_client" />
            <span>{t.existingClient}</span>
          </label>
        </div>
        {refCode && mode === "live" && <p className="ty-ref">{t.refNote}</p>}
        <button type="submit" className="btn btn-primary ty-submit">
          {mode === "notify_me" ? t.notifyButton : t.liveButton}
        </button>
        <label className="ty-optin">
          <input type="checkbox" name="marketing" />
          <span>{t.marketing}</span>
        </label>
      </form>
    </>
  );
}

/** A title and one line — after a submit, or a verify/tap that needs no share link. */
export function MessageCard({ title, message, ok, back = false }: { title: string; message: string; ok?: boolean; back?: boolean }) {
  return (
    <div className="ty-message" role="status" data-ok={ok === undefined ? undefined : ok ? "1" : "0"}>
      <h2 className="ty-card-title">{title}</h2>
      <p className="ty-card-line">{message}</p>
      {back && (
        <a className="ty-textlink" href="/10years#enter">
          {t.backToForm}
        </a>
      )}
    </div>
  );
}

/** A confirmed entry: "You're in", the count, the share link with a copy button. */
export function YoureInCard({ message, shareUrl }: { message: string; shareUrl?: string }) {
  return (
    <div className="ty-message" role="status" data-ok="1">
      <h2 className="ty-card-title">{t.inTitle}</h2>
      <p className="ty-card-line">{message}</p>
      {shareUrl && (
        <>
          <CopyLink url={shareUrl} label={t.shareLabel} copy={t.copy} copied={t.copied} />
          <p className="ty-small">{t.shareLine(REFERRAL.referrerBonus, REFERRAL.referredBonus)}</p>
        </>
      )}
    </div>
  );
}

/** Closed and thank-you modes: the winners list in its three states, and the one call button on the page. */
export function WinnersCard({ winners, notice }: { winners: PublicWinner[]; notice: string | null }) {
  const visitBy = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", month: "long", day: "numeric" }).format(OFFER.visitBy.at);
  return (
    <>
      <h2 className="ty-card-title">{t.winnersTitle}</h2>
      {notice && (
        <p className="ty-error" role="status">
          {notice}
        </p>
      )}
      <ul className="ty-winners" data-winners>
        {winners.map((w) => (
          <li key={w.slot} data-state={w.state}>
            {w.line}
          </li>
        ))}
      </ul>
      <p className="ty-card-line">{t.closedCardLine(visitBy)}</p>
      <a href="/contact" className="btn btn-primary ty-submit">
        {t.talk}
      </a>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Prizes: the grand prize block, then Mon–Fri as one divided row      */
/* ------------------------------------------------------------------ */

/** Both versions of a value; CSS shows the one the toggle picks. Equal values render once. */
function Both({ n, c }: { n: ReactNode; c: ReactNode }) {
  if (n === c) return <>{n}</>;
  return (
    <>
      <span className="v-new">{n}</span>
      <span className="v-cur">{c}</span>
    </>
  );
}

const grandShort = (p: PrizeSpec) => `${p.brainMap ? "Brain Map + " : ""}${p.sessions} sessions`;

function stateOf(d: Drawing, mode: ViewMode, now: Date): "next" | "drawn" | "upcoming" {
  if (mode === "notify_me") return "upcoming";
  if (d.at.getTime() <= now.getTime()) return "drawn";
  return nextDrawing(now)?.slot === d.slot ? "next" : "upcoming";
}

function Tag({ state, d }: { state: "next" | "drawn" | "upcoming"; d: Drawing }) {
  if (state === "next") return <span className="ty-tag">{t.nextTag(shortCentralTime(d.at))}</span>;
  if (state === "drawn") return <span className="ty-tag">{t.drawnTag}</span>;
  return null;
}

function PrizesRow({ mode, now }: { mode: ViewMode; now: Date }) {
  const grand = DRAWINGS.find((d) => d.kind === "grand")!;
  const daily = DRAWINGS.filter((d) => d.kind === "daily");
  const gN = prizeFor(grand.slot, "new_client");
  const gC = prizeFor(grand.slot, "current_client");
  const grandState = stateOf(grand, mode, now);
  return (
    <section className="ty-prizes" aria-labelledby="ty-prizes-h">
      {/* The toggle is two radios ahead of the row; CSS swaps every .v-new for its .v-cur. No script. */}
      <input type="radio" name="ty-version" id="ty-v-new" className="ty-v" defaultChecked />
      <input type="radio" name="ty-version" id="ty-v-cur" className="ty-v" />
      <div className="wrap">
        <div className="ty-prizes-head">
          <h2 id="ty-prizes-h">{t.prizesTitle}</h2>
          <div className="ty-pill">
            <label htmlFor="ty-v-new">{t.newClients}</label>
            <label htmlFor="ty-v-cur">{t.currentClients}</label>
          </div>
        </div>
        <div className="ty-prize-row" data-prizes>
          <div className="ty-grand" data-state={grandState}>
            <p className="ty-grand-eyebrow">
              {t.grandEyebrow(grand.dayName)}
              <Tag state={grandState} d={grand} />
            </p>
            <p className="ty-grand-prize">
              <Both n={grandShort(gN)} c={grandShort(gC)} />
            </p>
            <p className="ty-grand-extra">{t.grandExtras(gN.hoolestHandheld, gN.partnerServices)}</p>
          </div>
          <ol className="ty-days">
            {daily.map((d) => {
              const pN = prizeFor(d.slot, "new_client");
              const pC = prizeFor(d.slot, "current_client");
              const state = stateOf(d, mode, now);
              return (
                <li key={d.slot} data-state={state}>
                  <span className="ty-day">
                    <abbr title={d.dayName}>{d.dayName.slice(0, 3)}</abbr>
                  </span>
                  <span className="ty-num">
                    <Both n={pN.sessions} c={pC.sessions} />
                  </span>
                  <span className="ty-unit">{t.sessionsUnit}</span>
                  <span className="ty-extra">
                    <Both n={pN.hoolestKeychain ? t.keychain : null} c={pC.hoolestKeychain ? t.keychain : null} />
                  </span>
                  <Tag state={state} d={d} />
                </li>
              );
            })}
          </ol>
        </div>
        <p className="ty-prizes-note">
          {t.prizesNote}{" "}
          <a className="ty-textlink" href="/10years/rules#prizes">
            {t.prizesLink}
          </a>
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Three questions                                                     */
/* ------------------------------------------------------------------ */

export function giveawayQuestions() {
  return {
    enter: { q: t.qa.enterQ, a: t.qa.enterA },
    more: { q: t.qa.moreQ, a: t.qa.moreA(REFERRAL.referrerBonus, REFERRAL.referredBonus, REFERRAL.friendCap) },
    when: { q: t.qa.whenQ, a: t.qa.whenA(DRAWINGS.filter((d) => d.kind === "daily").map((d) => d.dayName).join(", "), spokenCentral(DRAWINGS[DRAWINGS.length - 1].at)) },
    win: { q: t.qa.winQ, a: t.qa.winA(Math.round(CLAIM_WINDOW_MS / 3_600_000)) },
    offer: {
      q: t.qa.offerQ,
      a: t.qa.offerA(
        new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", month: "long", day: "numeric" }).format(OFFER.bookBy.at),
        new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", month: "long", day: "numeric" }).format(OFFER.visitBy.at),
        OFFER.packageSessions,
      ),
    },
  };
}

function QuestionsRow() {
  const q = giveawayQuestions();
  return (
    <section className="ty-qa">
      <div className="wrap">
        <div className="ty-qa-row">
          <FAQAccordion items={[q.enter, q.more, q.win]} className="ty-qa-list" />
          <a className="ty-textlink" href="/10years/rules#questions">
            {t.allQuestions}
          </a>
        </div>
      </div>
    </section>
  );
}
