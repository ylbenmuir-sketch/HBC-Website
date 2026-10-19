import Image from "next/image";
import type { ReactNode } from "react";
import FAQAccordion from "@/components/FAQAccordion";
import Countdown from "./Countdown";
import CopyLink from "./CopyLink";
import Seal from "./Seal";
import {
  CLAIM_WINDOW_MS,
  DRAWINGS,
  OFFER,
  REFERRAL,
  SCHEDULE,
  centralParts,
  nextDrawing,
  partnerFor,
  prizeFor,
  prizeRetailUsd,
  prizeTotalFloorUsd,
  prizeValueIsFloor,
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
import { ESTABLISHED_YEAR, STAT_SESSIONS } from "@/lib/site-config";

/**
 * /10years (Ben, 2026-10-19, second brief): an anniversary page, not a
 * sign-up form. The hero — seal, headline, the week's value, a countdown,
 * the form card — fits the first 1440×900 screen; the prize ladder is the
 * first thing a visitor scrolls into, six cards climbing Monday to
 * Saturday; then the photos and three questions. The verify and one-tap
 * pages render the same view with a different card, so a confirmation
 * lands where the form was.
 *
 * Every prize, value, time and count is read from lib/giveaway/config.ts
 * (and the session count from lib/site-config.ts); every word from
 * lib/giveaway/copy.ts. Styles are the `.ty-` block in app/globals.css.
 */

const t = PAGES.tenYears;

type ViewMode = Exclude<PageMode, "hidden">;

const WEEK_YEAR = centralParts(DRAWINGS[0].at).year;
const headingLines = t.heading.split(/(?<=\.)\s+/);
const YEARS = WEEK_YEAR - ESTABLISHED_YEAR.value;

export default function TenYearsView({ mode, now, card, winners = [] }: { mode: ViewMode; now: Date; card: ReactNode; winners?: PublicWinner[] }) {
  const total = prizeTotalFloorUsd("new_client");
  const open = mode === "notify_me" || mode === "live";
  const next = nextDrawing(now);
  const countdownTarget = mode === "notify_me" ? SCHEDULE.entriesOpen.at : mode === "live" && next ? next.at : null;
  const sub = mode === "closed" ? t.closedSub : mode === "thank_you" ? t.thankYouSub : t.sub(DRAWINGS.length, spokenCentralRange(DRAWINGS[0].at, DRAWINGS[DRAWINGS.length - 1].at, "short"));
  return (
    <div className="ty" data-mode={mode}>
      <section className="ty-hero">
        <div className="wrap ty-hero-grid">
          <div className="ty-hero-text">
            <Seal number={YEARS} years={t.sealYears(YEARS)} span={t.sealSpan(ESTABLISHED_YEAR.value, WEEK_YEAR)} />
            <h1>
              {/* Break after the first sentence, so the headline never splits as "10 / years." */}
              {headingLines[0]}
              {headingLines.length > 1 && (
                <>
                  <br />
                  {headingLines.slice(1).join(" ")}
                </>
              )}
            </h1>
            <p className="ty-value">{open ? t.valueLine(total) : t.valueLinePast(total)}</p>
            <p className="ty-sub">{sub}</p>
            {countdownTarget && <Countdown targetIso={countdownTarget.toISOString()} nowIso={now.toISOString()} label={mode === "notify_me" ? t.countdownNotify : t.countdownLive} units={t.countdownUnits} />}
            <p className="ty-proof">{t.proofLine(YEARS, STAT_SESSIONS.value)}</p>
          </div>
          <div className="ty-card" id="enter">
            {card}
          </div>
        </div>
      </section>
      <PrizeLadder mode={mode} now={now} winners={winners} />
      <PhotoStrip />
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
/* The prize ladder: six cards climbing Monday to Saturday             */
/* ------------------------------------------------------------------ */

/** Both versions of a value; CSS shows the one the toggle picks. */
function Both({ n, c }: { n: ReactNode; c: ReactNode }) {
  return (
    <>
      <span className="v-new">{n}</span>
      <span className="v-cur">{c}</span>
    </>
  );
}

/** "Mon · noon", "Sat · 5 PM". */
const cardTime = (d: Drawing) => t.cardTime(d.dayName.slice(0, 3), shortCentralTime(d.at).replace(/\b(am|pm)$/, (m) => m.toUpperCase()));

/** The prize in plain words, one line per part. */
function PrizeWords({ p }: { p: PrizeSpec }) {
  return (
    <>
      <span className="ty-prize-main">{t.prizeWords(p.brainMap, p.sessions)}</span>
      {p.hoolestKeychain && <span className="ty-prize-line">{t.keychainLine}</span>}
      {p.hoolestHandheld && <span className="ty-prize-line">{t.handheldLine}</span>}
      {p.partnerServices && <span className="ty-prize-line">{t.partnersLine}</span>}
    </>
  );
}

const valueTag = (p: PrizeSpec) => t.valueTag(prizeRetailUsd(p), prizeValueIsFloor(p));

function stateOf(d: Drawing, mode: ViewMode, now: Date): "next" | "drawn" | "upcoming" {
  if (mode === "notify_me") return "upcoming";
  if (d.at.getTime() <= now.getTime()) return "drawn";
  return nextDrawing(now)?.slot === d.slot ? "next" : "upcoming";
}

function PrizeLadder({ mode, now, winners }: { mode: ViewMode; now: Date; winners: PublicWinner[] }) {
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
        <ol className="ty-ladder" data-prizes>
          {DRAWINGS.map((d) => {
            const pN = prizeFor(d.slot, "new_client");
            const pC = prizeFor(d.slot, "current_client");
            const state = stateOf(d, mode, now);
            const partner = partnerFor(d.slot);
            // Live mode: a drawn day shows its winner (three public states) in place of the prize.
            const winner = mode === "live" && state === "drawn" ? winners.find((w) => w.slot === d.slot && w.state !== "pending") : undefined;
            return (
              <li key={d.slot} className={d.kind === "grand" ? "ty-step ty-step-grand" : "ty-step"} data-state={state} data-slot={d.slot}>
                <p className="ty-step-time">
                  {cardTime(d)}
                  {state === "next" && <span className="ty-tag ty-tag-next">{t.nextTag}</span>}
                  {state === "drawn" && !winner && <span className="ty-tag">{t.drawnTag}</span>}
                </p>
                {d.kind === "grand" && <p className="ty-step-label">{t.grandLabel}</p>}
                {winner ? (
                  <div className="ty-step-winner" data-winner-state={winner.state}>
                    <span className="ty-step-label">{t.winnerLabel}</span>
                    <span className="ty-step-winner-line">{winner.state === "named" ? winner.label : winner.state === "claimed" ? t.cardWinnerClaimed : t.cardWinnerReaching}</span>
                  </div>
                ) : (
                  <>
                    <p className="ty-step-prize">
                      <Both n={<PrizeWords p={pN} />} c={<PrizeWords p={pC} />} />
                    </p>
                    {partner && <p className="ty-step-partner">{`${t.partnerPrefix} ${partner.name}${partner.prize ? `: ${partner.prize}` : ""}`}</p>}
                    <p className="ty-step-value">
                      <Both n={valueTag(pN)} c={valueTag(pC)} />
                    </p>
                  </>
                )}
              </li>
            );
          })}
        </ol>
        <p className="ty-prizes-note">{t.prizesNote}</p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Photos                                                              */
/* ------------------------------------------------------------------ */

function PhotoStrip() {
  const sizes = "(max-width: 760px) 50vw, 25vw";
  return (
    <section className="ty-photos" aria-label="Photos">
      <div className="wrap">
        <ul className="ty-photo-grid">
          <li>
            <figure>
              <div className="ty-photo">
                <Image src="/images/recline.jpg" alt="" fill sizes={sizes} />
              </div>
              <figcaption>{t.photoRecline}</figcaption>
            </figure>
          </li>
          <li>
            <figure>
              <div className="ty-photo">
                <Image src="/images/session-room.jpg" alt="" fill sizes={sizes} />
              </div>
              <figcaption>{t.photoRoom}</figcaption>
            </figure>
          </li>
          <li>
            <figure>
              <div className="ty-photo ty-photo-map">
                <Image src="/images/brain-map-heat.png" alt="" fill sizes={sizes} />
              </div>
              <figcaption>{t.photoBrainMap}</figcaption>
            </figure>
          </li>
          <li>
            <figure>
              {/* TODO: real Hoolest product photo — a neutral plate holds the slot until then. */}
              <div className="ty-photo ty-photo-placeholder" aria-hidden="true">
                <svg viewBox="0 0 80 80" width="56" height="56" fill="none" stroke="currentColor" strokeWidth="1.2">
                  <rect x="26" y="8" width="28" height="64" rx="10" />
                  <circle cx="40" cy="30" r="7" />
                  <path d="M40 44v18" strokeLinecap="round" />
                </svg>
              </div>
              <figcaption>{t.photoHoolest}</figcaption>
            </figure>
          </li>
        </ul>
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
