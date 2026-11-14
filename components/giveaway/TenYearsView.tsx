import Image from "next/image";
import type { ReactNode } from "react";
import FAQAccordion from "@/components/FAQAccordion";
import AssistantOff from "./AssistantOff";
import CalendarMenu from "./CalendarMenu";
import Countdown from "./Countdown";
import EntryBar from "./EntryBar";
import FormGuard from "./FormGuard";
import Ladder from "./Ladder";
import PhoneField from "./PhoneField";
import Seal from "./Seal";
import SharePanel from "./SharePanel";
import UtmCapture from "./UtmCapture";
import { UTM_FIELDS, type UtmField } from "@/lib/giveaway/channel";
import { assistantSuppressedByGiveaway } from "@/lib/giveaway/assistant";
import {
  RESPONSE_WINDOW_MS,
  DEVICES,
  DRAWINGS,
  GIFT_REVEAL_AT,
  OFFER,
  REFERRAL,
  SCHEDULE,
  centralParts,
  eligibilityPhrase,
  nextDrawing,
  prizeBreakdown,
  prizeFor,
  prizeRetailUsd,
  prizeTotalFloorUsd,
  shortCentralTime,
  spokenCentral,
  spokenCentralDateTime,
  spokenCentralRange,
  type Drawing,
  type PageMode,
  type PrizePart,
  type PrizeSpec,
} from "@/lib/giveaway/config";
import { CALENDAR_PATHS, SITE_CALENDAR_UTM } from "@/lib/giveaway/calendar";
import { PAGES } from "@/lib/giveaway/copy";
import { emailShareUrl, facebookShareUrl, shareText } from "@/lib/giveaway/share";
import type { PublicWinner, TapPrefill } from "@/lib/giveaway/web";
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
 *
 * Third brief (Ben, 2026-10-20): "10 years." leads the hero; a "Which one
 * are you?" picker under the lines sets the visit's new/current choice
 * (PathProvider) that the form's required choice and the ladder's toggle
 * share; the ladder is a vertical list on phones with a gold bar per day;
 * a slim entry bar follows the visitor once the form is off screen.
 *
 * BEFORE ENTRIES OPEN the page is a hype page, not a form (Ben,
 * 2026-11-10): the old notify-me form looked like an entry form. Its hero
 * has no form — the gold COMING SOON label, the headline, the countdown,
 * the prize line, one "Add to my calendar" button and a link down to the
 * prizes — then the ladder, how it works, the photos, a light reminder
 * strip (an email, an optional first name, "Just a reminder."), and the
 * questions. Live, closed and thank-you are laid out as before.
 */

const t = PAGES.tenYears;

type ViewMode = Exclude<PageMode, "hidden">;

const WEEK_YEAR = centralParts(DRAWINGS[0].at).year;
const headingLines = t.heading.split(/(?<=[.!])\s+/);
const YEARS = WEEK_YEAR - ESTABLISHED_YEAR.value;

/* When entries open, in the shapes the notify-me copy uses (Ben, 2026-11-09), all from config. */
const OPENS = SCHEDULE.entriesOpen.at;
const opensTime = shortCentralTime(OPENS).replace(/\b(am|pm)$/, (m) => m.toUpperCase());
/** "Sunday" */
const opensDay = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", weekday: "long" }).format(OPENS);
/** "Sun, Nov 15 at 6 PM" — the gold label. */
const opensShort = `${new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", weekday: "short", month: "short", day: "numeric" }).format(OPENS)} at ${opensTime}`;
/** "Sunday at 6 PM" — step 1. */
const opensDayTime = `${opensDay} at ${opensTime}`;

/** The two calendar links, tagged as coming from the page. */
const CALENDAR = {
  google: { label: t.calendarGoogle, href: `${CALENDAR_PATHS.google}?${SITE_CALENDAR_UTM}` },
  ics: { label: t.calendarIcs, href: `${CALENDAR_PATHS.ics}?${SITE_CALENDAR_UTM}` },
};

/** `card` is the form or message card — in the hero, or (before entries open) the reminder strip near the foot.
 *  `notice` is a message for the hero before entries open: an old verify link's or an early one-tap's answer. */
export default function TenYearsView({ mode, now, card, notice = null, winners = [], assistantOff = false }: { mode: ViewMode; now: Date; card: ReactNode; notice?: ReactNode; winners?: PublicWinner[]; assistantOff?: boolean }) {
  const total = prizeTotalFloorUsd();
  const open = mode === "notify_me" || mode === "live";
  const next = nextDrawing(now);
  const countdownTarget = mode === "notify_me" ? SCHEDULE.entriesOpen.at : mode === "live" && next ? next.at : null;
  const notify = mode === "notify_me";
  const countdown = countdownTarget && <Countdown targetIso={countdownTarget.toISOString()} nowIso={now.toISOString()} label={notify ? t.countdownNotify : t.countdownLive} units={t.countdownUnits} />;
  const span = spokenCentralRange(DRAWINGS[0].at, DRAWINGS[DRAWINGS.length - 1].at, "short");
  const sub = mode === "closed" ? t.closedSub : mode === "thank_you" ? t.thankYouSub : t.sub(DRAWINGS.length, span);
  const heading = (
    <h1>
      {/* "Celebrating 10 Years!" is the focal point (Ben, 2026-11-06; was "10 years.", 2026-10-20), the second sentence under it. Every mode. "10 Years!" never splits, so desktop breaks after "Celebrating". */}
      {/* A draft build's "[DRAFT] " tag sits on its own small line, so the headline keeps its one phone line. */}
      {headingLines[0].startsWith("[DRAFT] ") && <span className="ty-h1-draft">[DRAFT]</span>}
      <span className="ty-h1-years">{headingLines[0].replace(/^\[DRAFT\] /, "").replace(/(\d+) (?=\S+$)/, "$1\u00a0")}</span>
      {headingLines.length > 1 && <span className="ty-h1-rest">{headingLines.slice(1).join(" ")}</span>}
    </h1>
  );
  const seal = <Seal number={YEARS} years={t.sealYears(YEARS)} span={t.sealSpan(ESTABLISHED_YEAR.value, WEEK_YEAR)} />;
  // The assistant is off this route inside the window — decided here, from the giveaway clock (lib/giveaway/assistant.ts) — and always in the showcase.
  const assistant = (assistantOff || assistantSuppressedByGiveaway(now)) && <AssistantOff />;

  if (notify) {
    return (
      <div className="ty" data-mode={mode}>
        {assistant}
        {/* The hype hero (Ben, 2026-11-10): no form. Nothing here can be taken for an entry. */}
        <section className="ty-hero ty-hype">
          <div className="wrap ty-hype-inner">
            {seal}
            <p className="ty-soon" data-coming-soon>
              {t.comingSoon(opensShort)}
            </p>
            {heading}
            {countdown}
            {/* One line on a wide screen; on a phone each half takes its own line and the dot between them steps aside. */}
            <p className="ty-value" data-hype-value>
              {t.valueLineNotify(total, DRAWINGS.length, span).split(" · ").map((part, i) => (
                <span key={part} className="ty-value-part">
                  {i > 0 && <span className="ty-value-dot"> · </span>}
                  {part}
                </span>
              ))}
            </p>
            {/* What the ad names (Ben, 2026-11-13): the grand prize, on the first screen. Count and value from config. */}
            <p className="ty-grand" data-hype-grand>
              {t.grandLineNotify(prizeFor("grand").sessions, usd(prizeRetailUsd(prizeFor("grand"))))}
            </p>
            {notice && <div className="ty-card ty-hype-notice">{notice}</div>}
            <div className="ty-hype-cta" id="ty-cal-hero">
              <CalendarMenu label={t.calendarButton} google={CALENDAR.google} ics={CALENDAR.ics} fallback={t.calendarFallback} />
            </div>
            {/* The backup (Ben, 2026-11-13): a text link to the reminder strip, which sits far down the page. Not a second button. */}
            <a className="ty-textlink ty-hype-remind" href="#enter" data-remind-link>
              {t.remindLink}
            </a>
            <a className="ty-textlink ty-hype-prizes" href="#ty-prizes" data-see-prizes>
              {t.seePrizes}
            </a>
            {/* The mystery gift (fix list rev 2, P0-4): one quiet line, never named here. On phones too since 2026-11-13. */}
            <p className="ty-gift-tease" data-gift-tease>{t.giftTeaseHero}</p>
            <p className="ty-proof">{t.proofLine(YEARS, STAT_SESSIONS.value)}</p>
          </div>
        </section>
        <PrizeLadder mode={mode} now={now} winners={winners} />
        <HowItWorks mode={mode} now={now} />
        <PhotoStrip />
        {/* The light reminder: a strip, not a form card. `#enter` is where the signup route sends its answer. */}
        <section className="ty-remind" id="enter" data-reminder>
          <div className="wrap">
            <div className="ty-remind-inner">{card}</div>
          </div>
        </section>
        <QuestionsRow mode={mode} />
        <EntryBar watchId="ty-cal-hero">
          <CalendarMenu label={t.entryBarNotify} google={CALENDAR.google} ics={CALENDAR.ics} fallback={t.calendarFallback} variant="bar" />
        </EntryBar>
      </div>
    );
  }

  return (
    <>
      <div className="ty" data-mode={mode}>
        {assistant}
        <section className="ty-hero">
          <div className="wrap ty-hero-grid">
            <div className="ty-hero-text">
              {seal}
              {heading}
              <p className="ty-value">{open ? t.valueLine(total) : t.valueLinePast(total)}</p>
              {/* The mystery gift (fix list rev 2, P0-4): named only after the reveal, never here. */}
              {open && <p className="ty-gift-tease" data-gift-tease>{t.giftTeaseHero}</p>}
              <p className="ty-sub">{sub}</p>
              {countdown}
              <p className="ty-proof">{t.proofLine(YEARS, STAT_SESSIONS.value)}</p>
            </div>
            <div className="ty-card" id="enter">
              {card}
            </div>
          </div>
        </section>
        <HowItWorks mode={mode} now={now} />
        <PrizeLadder mode={mode} now={now} winners={winners} />
        <PhotoStrip />
        <QuestionsRow mode={mode} />
        {mode === "live" && <EntryBar label={t.entryBarLive} />}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* The cards                                                           */
/* ------------------------------------------------------------------ */

/** The hidden fields, the spam guard and the honeypot every /10years form carries. */
function FormPlumbing({ refCode = "", utm }: { refCode?: string; utm: Partial<Record<UtmField, string>> }) {
  return (
    <>
      <input type="hidden" name="ref" defaultValue={refCode} />
      <input type="hidden" name="source_page" value="/10years" />
      {/* First-touch tags (P1-6): this request's own, replaced by the stored first touch in the browser. */}
      {UTM_FIELDS.map((f) => (
        <input key={f} type="hidden" name={f} defaultValue={utm[f] ?? ""} />
      ))}
      <UtmCapture formId="ty-entry-form" />
      {/* The spam guard (Ben, 2026-11-09): the page token goes here, filled by FormGuard on submit. */}
      <input type="hidden" name="form_token" defaultValue="" />
      <FormGuard formId="ty-entry-form" sending={t.sending} />
      {/* The honeypot — a field no person sees or fills. Same pattern as the contact form. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
        <label htmlFor="website">{t.honeypot}</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
    </>
  );
}

const signupAction = (showcase: string | null) => (showcase ? `/10years/signup?mode=${encodeURIComponent(showcase)}` : "/10years/signup");

/**
 * The entry form (live mode). Phone is required (Ben, 2026-11-10), after
 * Email, only ever used to reach a winner. `tap` is the one-tap link's
 * form: the same form, opened with what the reminder holds (`prefill`) and
 * carrying the link's token, so the entry is tied to that reminder.
 * `showcase` is the ?mode= value while the page is the showcase
 * (lib/giveaway/showcase.ts): the submit then carries it, so the success
 * message lands on the same stage.
 */
export function FormCard({ now, refCode, error, errorCode = null, showcase = null, utm = {}, prefill = null, tap = null }: { now: Date; refCode: string; error: string | null; errorCode?: string | null; showcase?: string | null; utm?: Partial<Record<UtmField, string>>; prefill?: TapPrefill | null; tap?: string | null }) {
  const next = nextDrawing(now) ?? DRAWINGS[0];
  const phoneError = errorCode === "invalid_phone";
  return (
    <>
      <h2 className="ty-card-title">{tap ? t.tapFormTitle : t.liveFormTitle}</h2>
      <p className="ty-card-line">{tap ? t.tapFormLine : t.liveFormLine(spokenCentral(next.at))}</p>
      {/* A phone refusal is said under the phone field instead. */}
      {error && !phoneError && (
        <p className="ty-error" role="alert">
          {error}
        </p>
      )}
      <form id="ty-entry-form" method="post" action={signupAction(showcase)} className="form ty-form" data-entry-form={tap ? "tap" : "live"}>
        <FormPlumbing refCode={refCode} utm={utm} />
        {tap && <input type="hidden" name="tap" value={tap} />}
        <div className="ty-fields ty-fields-live">
          <div>
            <label htmlFor="first_name">{t.firstName}</label>
            <input id="first_name" name="first_name" autoComplete="given-name" required maxLength={60} defaultValue={prefill?.firstName ?? ""} />
          </div>
          <div>
            <label htmlFor="last_name">{t.lastName}</label>
            <input id="last_name" name="last_name" autoComplete="family-name" required maxLength={60} defaultValue={prefill?.lastName ?? ""} />
          </div>
          <div>
            <label htmlFor="email">{t.email}</label>
            <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} defaultValue={prefill?.email ?? ""} />
          </div>
          <PhoneField label={t.phone} help={t.phoneHelp} invalid={t.errors.invalid_phone} initialError={phoneError} />
          <div>
            <label htmlFor="zip">{t.zip}</label>
            <input id="zip" name="zip" inputMode="numeric" autoComplete="postal-code" pattern="[0-9]{5}" required maxLength={5} defaultValue={prefill?.zip ?? ""} />
          </div>
        </div>
        <div className="ty-checks">
          <label className="ty-check">
            <input type="checkbox" name="age_rules" required />
            <span>
              {t.ageRules} <a href="/10years/rules#rules">{t.rulesLink}</a>
            </span>
          </label>
        </div>
        {refCode && <p className="ty-ref">{t.refNote}</p>}
        <p className="ty-gift-card" data-gift-tease>{t.giftTeaseCard(revealShort())}</p>
        <button type="submit" className="btn btn-primary ty-submit">
          {t.liveButton}
        </button>
        <label className="ty-optin">
          <input type="checkbox" name="marketing" defaultChecked={prefill?.marketing ?? false} />
          <span>{t.marketing}</span>
        </label>
      </form>
    </>
  );
}

/**
 * The light reminder, before entries open (Ben, 2026-11-10): an email
 * address, an optional first name, "Remind me", and a line that says it is
 * only a reminder. No last name, ZIP, phone or rules box — nothing an entry
 * form has — so it cannot be taken for one. Same route, spam guard and
 * confirmation email as before.
 */
export function ReminderCard({ error, showcase = null, utm = {} }: { error: string | null; showcase?: string | null; utm?: Partial<Record<UtmField, string>> }) {
  return (
    <>
      <h2 className="ty-remind-title">{t.notifyFormTitle}</h2>
      {error && (
        <p className="ty-error" role="alert">
          {error}
        </p>
      )}
      <form id="ty-entry-form" method="post" action={signupAction(showcase)} className="form ty-form ty-remind-form" data-entry-form="reminder">
        <FormPlumbing utm={utm} />
        <div className="ty-fields ty-remind-fields">
          <div>
            <label htmlFor="email">{t.email}</label>
            <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} />
          </div>
          <div>
            <label htmlFor="first_name">{t.firstNameOptional}</label>
            <input id="first_name" name="first_name" autoComplete="given-name" maxLength={60} />
          </div>
          <button type="submit" className="btn btn-primary ty-submit">
            {t.notifyButton}
          </button>
        </div>
        <p className="ty-not-entry" data-not-entry>
          {t.notifyNotEntry(opensDay)}
        </p>
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

/**
 * A confirmed entry. With a share link (Ben, 2026-11-14) the card leads with
 * the share block: "You're in." as a small line, the big headline, the link
 * with "Copy link", the small Facebook and Email buttons, then the entry's
 * own line. Without one it is the plain "You're in" card.
 */
export function YoureInCard({ message, shareUrl, back = false }: { message: string; shareUrl?: string; back?: boolean }) {
  return (
    <div className={`ty-message${shareUrl ? " ty-in" : ""}`} role="status" data-ok="1">
      {shareUrl ? (
        <>
          <p className="ty-in-kicker">{t.inTitle}</p>
          <h2 className="ty-card-title ty-share-head">{t.shareHeadline(REFERRAL.referrerBonus)}</h2>
          <p className="ty-share-sub">{t.shareSub(REFERRAL.friendCap)}</p>
          <SharePanel
            url={shareUrl}
            text={shareText(shareUrl)}
            facebookHref={facebookShareUrl(shareUrl)}
            emailHref={emailShareUrl(shareUrl)}
            emailSubject={t.shareEmailSubject}
            labels={{ link: t.shareLabel, copy: t.copy, copied: t.copied, facebook: t.shareFacebook, email: t.shareEmail, phone: t.sharePhone }}
          />
          <p className="ty-small ty-share-friend">{t.shareFriendLine}</p>
          <p className="ty-card-line ty-in-line">{message}</p>
        </>
      ) : (
        <>
          <h2 className="ty-card-title">{t.inTitle}</h2>
          <p className="ty-card-line">{message}</p>
        </>
      )}
      {/* After a submit the URL carries ?sent=1; someone it is forwarded to still needs a way to the form. */}
      {back && (
        <a className="ty-textlink" href="/10years#enter">
          {t.backToForm}
        </a>
      )}
    </div>
  );
}

/** "Sat, Nov 21" — the reveal date, for the form card's tease. */
const revealShort = () => new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", weekday: "short", month: "short", day: "numeric" }).format(GIFT_REVEAL_AT);

/** "7 PM" — the reveal time. */
const revealTime = () => shortCentralTime(GIFT_REVEAL_AT).replace(/\b(am|pm)$/, (m) => m.toUpperCase());

/**
 * Closed and thank-you modes. `revealed` comes from the REAL giveaway clock
 * (giftRevealed(giveawayNow())), never a showcase's representative now, so
 * a ?mode=closed preview before Saturday 7 pm never names the gift (P0-2).
 *
 * P1-3: closed + revealed → the gift FIRST (title, the line, "Claim my
 * gift" to /contact?from=10years — with the code when the visitor arrived
 * with one — and the book-by dates), then this week's winners. Closed
 * before the reveal → the winners and "arrives tonight at 7". Thank-you
 * mode (after Dec 5, booking closed) → the winners and a plain thank-you.
 */
export function WinnersCard({ winners, notice, revealed, mode = "closed", code = null }: { winners: PublicWinner[]; notice: string | null; revealed: boolean; mode?: "closed" | "thank_you"; code?: string | null }) {
  const md = (d: Date) => new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", month: "long", day: "numeric" }).format(d);
  const bookBy = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", weekday: "short", month: "short", day: "numeric" }).format(OFFER.bookBy.at);
  const giftFirst = mode === "closed" && revealed;
  const list = (
    <ul className="ty-winners" data-winners>
      {winners.map((w) => (
        <li key={w.slot} data-state={w.state}>
          {w.line}
        </li>
      ))}
    </ul>
  );
  return (
    <>
      {notice && (
        <p className="ty-error" role="status">
          {notice}
        </p>
      )}
      {giftFirst ? (
        <>
          <div className="ty-gift-first" data-gift-first>
            <h2 className="ty-card-title">{t.giftTitle}</h2>
            <p className="ty-card-line">{t.closedCardLine(md(OFFER.visitBy.at))}</p>
            <a href={`/contact?from=10years${code ? `&code=${encodeURIComponent(code)}` : ""}`} className="btn btn-primary ty-submit" data-claim-gift>
              {t.claimGift}
            </a>
            <p className="ty-small">{t.giftBookBy(bookBy, md(OFFER.visitBy.at))}</p>
          </div>
          <h3 className="ty-winners-title">{t.winnersTitle}</h3>
          {list}
        </>
      ) : (
        <>
          <h2 className="ty-card-title">{t.winnersTitle}</h2>
          {list}
          <p className="ty-card-line">{mode === "thank_you" ? t.thanksCardLine : t.giftComing(revealTime())}</p>
          <a href="/contact" className="btn btn-primary ty-submit">
            {t.talk}
          </a>
        </>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* How it works: three steps, one quiet strip                          */
/* ------------------------------------------------------------------ */

/** "5 PM", "noon" — the short time with AM/PM in capitals. */
const shortTime = (d: Drawing) => shortCentralTime(d.at).replace(/\b(am|pm)$/, (m) => m.toUpperCase());

function HowItWorks({ mode, now }: { mode: ViewMode; now: Date }) {
  const h = t.how;
  const daily = DRAWINGS.filter((d) => d.kind === "daily");
  const grand = DRAWINGS.find((d) => d.kind === "grand") ?? DRAWINGS[DRAWINGS.length - 1];
  const next = mode === "live" ? nextDrawing(now) : null;
  const step3 = !next
    ? h.step3Line(shortTime(daily[0]), `${daily[0].dayName.slice(0, 3)}–${daily[daily.length - 1].dayName.slice(0, 3)}`, grand.dayName, shortTime(grand))
    : next.kind === "grand"
      ? h.step3LineGrandNext(grand.dayName, shortTime(grand))
      : h.step3LineLive(`${next.dayName.slice(0, 3)} at ${shortTime(next)}`, grand.dayName, shortTime(grand));
  const steps = [
    mode === "notify_me" ? [h.step1TitleNotify, h.step1LineNotify(opensDayTime)] : [h.step1Title, h.step1Line],
    [h.step2Title, h.step2Line(REFERRAL.referrerBonus)],
    [h.step3Title, step3],
  ];
  return (
    <section className="ty-how" aria-label={h.title}>
      <div className="wrap">
        <ol className="ty-how-steps" data-how>
          {steps.map(([title, line], i) => (
            <li key={title}>
              <span className="ty-how-n" aria-hidden="true">
                {i + 1}
              </span>
              <span className="ty-how-text">
                <b>{title}</b> {line}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* The prize ladder: six cards climbing Monday to Saturday             */
/* ------------------------------------------------------------------ */

/** "Mon · noon", "Sat · 5 PM". */
const cardTime = (d: Drawing) => t.cardTime(d.dayName.slice(0, 3), shortCentralTime(d.at).replace(/\b(am|pm)$/, (m) => m.toUpperCase()));

/** Card values in whole dollars, rounded (Ben, 2026-11-09): "$45", "$2,839". The rules page keeps the cents. */
const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;


/** The short words for one part — the card's "+" lines and the phone row. */
function partWords(part: PrizePart): string {
  switch (part.kind) {
    case "brainMap":
      return t.breakdown.brainMap;
    case "sessions":
      return t.breakdown.sessions(part.count);
    case "chair":
      return t.breakdown.chairShort;
    case "hoolest":
      return DEVICES[part.device!].short;
    case "partner":
      return part.partner!.short;
    case "brainMd":
      return part.count === 1 ? "1 BrainMD bottle" : `${part.count} BrainMD bottles`;
  }
}

/** The prize in plain words: the main line, then "+" lines (Ben's order, from config).
 *  The grand prize, collapsed, shows its first "+" line and "+ N more" (Ben, 2026-11-09). */
function PrizeWords({ p }: { p: PrizeSpec }) {
  const parts = prizeBreakdown(p);
  const main = parts.filter((x) => x.kind === "brainMap" || x.kind === "sessions").map(partWords).join(" + ");
  const rest = parts.filter((x) => x.kind !== "brainMap" && x.kind !== "sessions");
  const shown = p.slot === "grand" && rest.length > 2 ? rest.slice(0, 1) : rest;
  return (
    <>
      <span className="ty-prize-main">{main}</span>
      {shown.map((x) => (
        <span key={`${x.kind}-${x.partner?.id ?? x.device ?? ""}`} className="ty-prize-line">
          {t.plusLine(partWords(x))}
        </span>
      ))}
      {shown.length < rest.length && <span className="ty-prize-line">{t.plusLine(t.breakdown.card.more(rest.length - shown.length))}</span>}
    </>
  );
}

const valueBig = (p: PrizeSpec) => t.valueBig(Math.round(prizeRetailUsd(p)));

/** The phone row's line: "Brain Map + 3 LENS sessions + Hoolest Mini + 1 BrainMD bottle".
 *  The grand prize: "Brain Map + 12 LENS sessions + Hoolest VeRelief + 3 more" (Ben, 2026-11-09). */
function rowWords(p: PrizeSpec): string {
  const words = prizeBreakdown(p).map(partWords);
  if (p.slot === "grand" && words.length > 4) return [...words.slice(0, 3), t.breakdown.card.more(words.length - 3)].join(" + ");
  return words.join(" + ");
}

/** The gold bar: this day's value as a share of the grand prize's. */
function barShare(p: PrizeSpec): number {
  const grand = prizeRetailUsd(prizeFor("grand"));
  return grand > 0 ? Math.max(6, Math.round((prizeRetailUsd(p) / grand) * 100)) : 100;
}

/** One row of the expanded card: a short name, the partner (or what a device is) on a small gray
 *  second line, and the value. No unit math, no "valid through" (Ben, 2026-11-09; the rules keep both). */
function PartRow({ part, thumb }: { part: PrizePart; thumb: boolean }) {
  const b = t.breakdown;
  const c = b.card;
  const partner = part.kind === "partner" ? c.partner[part.partner!.id] : null;
  const label =
    part.kind === "brainMap" ? b.brainMap
    : part.kind === "sessions" ? b.sessions(part.count)
    : part.kind === "chair" ? c.chair
    : part.kind === "brainMd" ? c.brainMd(part.count)
    : partner ? partner.name(part.count)
    : DEVICES[part.device!].short;
  const sub = part.kind === "hoolest" ? c.deviceSub : partner ? partner.sub : null;
  return (
    <li className="ty-bd-row" data-part={part.kind}>
      <span className="ty-bd-label">
        {part.kind === "hoolest" && thumb && (
          <span className="ty-bd-thumb" aria-hidden="true">
            <Image src="/images/hoolest-handheld.webp" alt="" width={40} height={40} />
          </span>
        )}
        <span>
          {label}
          {sub && <small className="ty-bd-sub">{sub}</small>}
        </span>
      </span>
      <span className="ty-bd-usd">{usd(part.usd)}</span>
    </li>
  );
}

/** The expanded card: every part and its value, then the total (the sum of the lines — config test). */
function Breakdown({ p, thumb }: { p: PrizeSpec; thumb: boolean }) {
  return (
    <ul className="ty-bd">
      {prizeBreakdown(p).map((part) => (
        <PartRow key={`${part.kind}-${part.partner?.id ?? part.device ?? ""}`} part={part} thumb={thumb} />
      ))}
      <li className="ty-bd-row ty-bd-total">
        <span className="ty-bd-label">{t.breakdown.total}</span>
        <span className="ty-bd-usd">{valueBig(p)}</span>
      </li>
    </ul>
  );
}

function stateOf(d: Drawing, mode: ViewMode, now: Date): "next" | "drawn" | "upcoming" {
  if (mode === "notify_me") return "upcoming";
  if (d.at.getTime() <= now.getTime()) return "drawn";
  return nextDrawing(now)?.slot === d.slot ? "next" : "upcoming";
}

/** One prize per drawing (Ben, 2026-11-03): no new/current toggle. */
function PrizeLadder({ mode, now, winners }: { mode: ViewMode; now: Date; winners: PublicWinner[] }) {
  const cards = DRAWINGS.map((d) => {
    const p = prizeFor(d.slot);
    const state = stateOf(d, mode, now);
    const grand = d.kind === "grand";
    // Live mode: a drawn day shows its winner (three public states) in place of the prize words.
    const winner = mode === "live" && state === "drawn" ? winners.find((w) => w.slot === d.slot && w.state !== "pending") : undefined;
    const winnerLine = winner ? (winner.state === "named" ? winner.label : winner.state === "claimed" ? t.cardWinnerClaimed : t.cardWinnerReaching) : null;
    const head = (
      <>
        <span className="ty-step-time">
          {cardTime(d)}
          {state === "next" && <span className="ty-tag ty-tag-next">{t.nextTag}</span>}
          {state === "drawn" && !winner && <span className="ty-tag">{t.drawnTag}</span>}
        </span>
        {grand && <span className="ty-step-label">{t.grandLabel}</span>}
        <span className="ty-step-value">
          <span className="ty-step-amount">{valueBig(p)}</span>
          <span className="ty-step-valueword">{t.valueWord}</span>
        </span>
        {winner ? (
          <span className="ty-step-winner" data-winner-state={winner.state}>
            <span className="ty-step-label">{t.winnerLabel}</span>
            <span className="ty-step-winner-line">{winnerLine}</span>
          </span>
        ) : (
          <span className="ty-step-prize">
            <PrizeWords p={p} />
          </span>
        )}
      </>
    );
    // The phone row: day · time and the value on the first line, the prize
    // in plain words under them wrapping to a second line when it must
    // (never cut — Ben, 2026-10-20), then the bar.
    const row = (
      <>
        <span className="ty-row-top">
          <span className="ty-row-time">
            {cardTime(d)}
            {grand && <span className="ty-row-label">{t.grandLabel}</span>}
            {state === "next" && <span className="ty-tag ty-tag-next">{t.nextTag}</span>}
            {state === "drawn" && !winner && <span className="ty-tag">{t.drawnTag}</span>}
          </span>
          <span className="ty-row-usd">{valueBig(p)}</span>
        </span>
        <span className="ty-row-main">
          {winner ? (
            <span className="ty-row-words ty-row-winner" data-winner-state={winner.state}>
              {t.winnerLabel}: {winnerLine}
            </span>
          ) : (
            <span className="ty-row-words">{rowWords(p)}</span>
          )}
        </span>
        <span className="ty-row-bar" aria-hidden="true">
          <span className="ty-row-fill" style={{ width: `${barShare(p)}%` }} />
        </span>
      </>
    );
    const panel = (
      <>
        <Breakdown p={p} thumb={grand} />
        <a className="ty-bd-link" href="/brain-map" target="_blank" rel="noopener">
          {t.breakdown.whatsBrainMap}
        </a>
      </>
    );
    return { slot: d.slot, className: grand ? "ty-step ty-step-grand" : "ty-step", state, head, row, panel };
  });
  return (
    <section className="ty-prizes" id="ty-prizes" aria-labelledby="ty-prizes-h">
      <div className="wrap">
        <div className="ty-prizes-head">
          <h2 id="ty-prizes-h">{t.prizesTitle}</h2>
        </div>
        <Ladder cards={cards} />
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
              <div className="ty-photo" style={{ position: "relative" }}>
                <Image src="/images/recline.jpg" alt={t.photoChairAlt} fill sizes={sizes} />
              </div>
              <figcaption>{t.photoChair}</figcaption>
            </figure>
          </li>
          <li>
            <figure>
              <div className="ty-photo" style={{ position: "relative" }}>
                <Image src="/images/session-room.jpg" alt="" fill sizes={sizes} />
              </div>
              <figcaption>{t.photoRoom}</figcaption>
            </figure>
          </li>
          <li>
            <figure>
              <div className="ty-photo ty-photo-map" style={{ position: "relative" }}>
                <Image src="/images/brain-map-heat.png" alt="" fill sizes={sizes} />
              </div>
              <figcaption>{t.photoBrainMap}</figcaption>
            </figure>
          </li>
          <li>
            <figure>
              {/* The product shot is square on a light ground: contained, not cropped, on the same ground. */}
              <div className="ty-photo ty-photo-device" style={{ position: "relative" }}>
                <Image src="/images/hoolest-handheld.webp" alt="" fill sizes={sizes} />
              </div>
              <figcaption>{t.photoDevice("Hoolest")}</figcaption>
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

/** `mode` is /10years' own: notify-me swaps in the reminder answer (Ben, 2026-11-09). The rules page passes nothing and keeps the entry answer. */
export function giveawayQuestions(mode?: ViewMode) {
  return {
    enter: { q: t.qa.enterQ, a: mode === "notify_me" ? t.qa.enterANotify(spokenCentralDateTime(OPENS)) : t.qa.enterA(eligibilityPhrase()) },
    more: { q: t.qa.moreQ, a: t.qa.moreA(REFERRAL.referrerBonus, REFERRAL.referredBonus, REFERRAL.friendCap) },
    when: { q: t.qa.whenQ, a: t.qa.whenA(DRAWINGS.filter((d) => d.kind === "daily").map((d) => d.dayName).join(", "), spokenCentral(DRAWINGS[DRAWINGS.length - 1].at)) },
    win: { q: t.qa.winQ, a: t.qa.winA(Math.round(RESPONSE_WINDOW_MS / 3_600_000)) },
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

function QuestionsRow({ mode }: { mode: ViewMode }) {
  const q = giveawayQuestions(mode);
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
