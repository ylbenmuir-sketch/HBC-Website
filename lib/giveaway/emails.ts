/**
 * The giveaway emails (GIVEAWAY-PLAN.md §4; winners get none of their own —
 * Ben, 2026-11-03), built on the shared
 * template's pieces (lib/email/templates.ts: page, section, footer, buttons)
 * so they are the same design as every other email the site sends. Words
 * come from lib/giveaway/copy.ts ([DRAFT] until approved); facts (prizes,
 * times, the offer) come from lib/giveaway/config.ts and are passed in.
 *
 * Marketing emails (It's live, the Monday reminder, the daily afternoon,
 * the thank-you) carry the unsubscribe link and the registered identity line
 * (CAN-SPAM). Transactional ones (verifications, You're in) carry
 * the identity line and a "why you got this" line. Staff emails carry
 * neither.
 *
 * Each builder returns the subject, the HTML and the plain-text twin. Pure:
 * no environment reads, no network; the sender (Phase 3) adds headers.
 * scripts/render-email-previews.mjs renders every one at 390 and 640.
 */

import { escapeHtml as esc, formatCentral, telHref } from "../email/format";
import { C, SANS, SERIF, buttons, factGrid, footer, page, section, textOf, type Rendered } from "../email/templates";
import { EMAILS, SHARED } from "./copy";
import {
  CLINIC_DAYS_AFTER_REVEAL,
  DEVICES,
  DRAWINGS,
  GIFT_REVEAL_AT,
  HYPE_PRIZE_PHOTO_URL,
  SCHEDULE,
  spokenCentralDateTime,
  centralParts,
  drawing,
  drawingAfter,
  prizeRetailUsd,
  shortCentralTime,
  type PrizeSpec,
  OFFER,
  REFERRAL,
  formatCentralLabel,
  GIFT_CODES,
  PARTNER_GIFTS,
  RESPONSE_WINDOW_MS,
  prizeFor,
  prizeName,
  type Drawing,
} from "./config";

export type Email = Rendered & { subject: string; preheader: string };

/** What every visitor email needs that is about us, not about them. */
export type Footing = {
  /** "Harmonized Brain Centers · 197 Thompson Ln, Suite S, Nashville, TN 37211" */
  identityLine: string;
  siteUrl: string;
  /** Marketing emails only: the signed /unsubscribe link for this person. */
  unsubscribeUrl?: string | null;
};

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

const h1 = (text: string) => `<div class="hbc-name" style="font-family:${SANS};font-size:22px;font-weight:700;color:${C.navy};line-height:1.25;">${esc(text)}</div>`;
const p = (text: string, extra = "") => `<div class="hbc-text" style="font-family:${SANS};font-size:16px;color:${C.ink};line-height:1.45;padding-top:6px;${extra}">${esc(text)}</div>`;
const small = (text: string) => `<div class="hbc-muted" style="font-family:${SANS};font-size:13px;color:${C.slate};line-height:1.45;padding-top:6px;">${esc(text)}</div>`;
const panelTitle = (text: string) => `<div class="hbc-panel-title" style="font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${C.sageDeep};padding-bottom:4px;">${esc(text)}</div>`;
const panel = (inner: string) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="hbc-panel" style="background:${C.ivory};border:1px solid ${C.line};border-radius:6px;padding:10px 12px;" bgcolor="${C.ivory}">${inner}</td></tr></table>`;
const code = (text: string) => `<div style="font-family:${SANS};font-size:20px;font-weight:700;letter-spacing:0.08em;color:${C.navy};padding-top:2px;" class="hbc-name">${esc(text)}</div>`;
const gap = (px: number) => `<tr><td style="height:${px}px;font-size:0;line-height:0;">&nbsp;</td></tr>`;
const host = (url: string) => url.replace(/^https?:\/\//, "").replace(/\/$/, "");

function visitorFooter(f: Footing, marketing: boolean): string {
  const why = marketing ? SHARED.whyYouGotThis : SHARED.whyYouGotThisTransactional;
  const lines = [
    esc(f.identityLine),
    `${esc(why)} <a href="${esc(f.siteUrl)}" style="color:${C.slate};">${esc(host(f.siteUrl))}</a>.${
      f.unsubscribeUrl ? ` <a href="${esc(f.unsubscribeUrl)}" style="color:${C.slate};">${esc(SHARED.unsubscribe)}</a>` : ""
    }`,
  ];
  return footer(lines);
}

function visitorFooterText(f: Footing, marketing: boolean): string[] {
  const why = marketing ? SHARED.whyYouGotThis : SHARED.whyYouGotThisTransactional;
  return [f.identityLine, `${why} ${host(f.siteUrl)}.`, f.unsubscribeUrl ? `${SHARED.unsubscribe}: ${f.unsubscribeUrl}` : null].filter((l): l is string => Boolean(l));
}

/** The prize line for a drawing (one prize per drawing — Ben, 2026-11-03),
 *  and, when it has a partner gift, how that gift is redeemed. */
export function prizeLineFor(d: Drawing): { name: string; partner: string | null } {
  const p = prizeFor(d.slot);
  const notes = p.partners.map((id) => {
    const g = PARTNER_GIFTS[id];
    return SHARED.partnerLine(g.partner, g.validThrough ? spokenDate(g.validThrough) : null, g.terms ?? null);
  });
  return { name: prizeName(p), partner: notes.length ? notes.join(" ") : null };
}

const spokenDate = (at: Date) => {
  const label = formatCentralLabel(at); // "Sat Dec 5, 11:59 PM CT"
  return label.replace(/,.*$/, "").replace(/^\w+ /, ""); // "Dec 5"
};

/** "Sat, Nov 21 at 7 PM" — the reveal, for the You're-in tease. */
const revealSpoken = () => {
  const d = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", weekday: "short", month: "short", day: "numeric" }).format(GIFT_REVEAL_AT);
  const t = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", hour: "numeric", minute: "2-digit", hour12: true }).format(GIFT_REVEAL_AT).replace(":00", "");
  return `${d} at ${t}`;
};

/** "Mon, Nov 23 and Tue, Nov 24" — the clinic days after the reveal. */
const openDaysSpoken = () =>
  CLINIC_DAYS_AFTER_REVEAL.map((d) => new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", weekday: "short", month: "short", day: "numeric" }).format(d)).join(" and ");

/** The offer panel — the reveal email only (fix list rev 2, P0-2: nothing before it names the gift). */
function offerPanel(input: { code: string }): { html: string; text: string[] } {
  const line = SHARED.offerLine(spokenDate(OFFER.bookBy.at), spokenDate(OFFER.visitBy.at));
  const bonus = SHARED.offerBonus(OFFER.packageSessions);
  const html = panel(
    `${panelTitle(EMAILS.youreIn.offerHeading)}<div class="hbc-text" style="font-family:${SANS};font-size:14px;line-height:1.45;color:${C.ink};">${esc(line)} ${esc(bonus)}</div><div class="hbc-muted" style="font-family:${SANS};font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${C.slate};padding-top:8px;">${esc(SHARED.yourCode)}</div>${code(input.code)}${
      `<div class="hbc-text" style="font-family:${SANS};font-size:13px;line-height:1.45;color:${C.ink};padding-top:6px;">${esc(SHARED.existingClientForward)}</div>`
    }`
  );
  const text = [EMAILS.youreIn.offerHeading, line, bonus, `${SHARED.yourCode}: ${input.code}`, SHARED.existingClientForward].filter((l): l is string => Boolean(l));
  return { html, text };
}

/* ------------------------------------------------------------------ */
/* 1. Notify-me: you're on the list                                    */
/* ------------------------------------------------------------------ */

/** The follow-up to a notify-me submit (Ben, 2026-11-08): the submit put
 *  them on the list; this only says so. The button is a link back to the
 *  page, never a condition. */
export function notifyOnListEmail(input: { firstName: string; pageUrl: string; footing: Footing }): Email {
  const c = EMAILS.notifyOnList;
  const heading = c.heading(input.firstName);
  const body = c.body(spokenCentralDateTime(SCHEDULE.entriesOpen.at));
  const rows = [
    section(`${h1(heading)}${p(body)}`, "18px 20px 0"),
    section(buttons([[c.button, input.pageUrl]]), "16px 20px 0"),
    section(small(c.small), "8px 20px 0"),
    gap(16),
    visitorFooter(input.footing, false),
  ];
  return {
    subject: c.subject,
    preheader: c.preheader,
    html: page({ title: c.subject, preheader: c.preheader, rows }),
    text: textOf([heading, body, "", `${c.button}: ${input.pageUrl}`, "", c.small, "", ...visitorFooterText(input.footing, false)]),
  };
}

/* ------------------------------------------------------------------ */
/* 2. "It's live" — one-tap entry                                      */
/* ------------------------------------------------------------------ */

export function itsLiveEmail(input: { firstName: string; enterUrl: string; firstDrawing: Drawing; footing: Footing }): Email {
  const c = EMAILS.itsLive;
  const prize = prizeLineFor(input.firstDrawing);
  const heading = c.heading(input.firstName);
  const body = c.body(input.firstDrawing, prize.name);
  const subject = c.subject(prize.name);
  const rows = [
    section(`${h1(heading)}${p(body)}${prize.partner ? p(prize.partner) : ""}${small(c.earlyBird)}`, "18px 20px 0"),
    section(buttons([[c.button, input.enterUrl]]), "16px 20px 0"),
    section(small(c.small), "8px 20px 0"),
    gap(16),
    visitorFooter(input.footing, true),
  ];
  return {
    subject,
    preheader: c.preheader,
    html: page({ title: subject, preheader: c.preheader, rows }),
    text: textOf([heading, body, prize.partner, c.earlyBird, "", `${c.button}: ${input.enterUrl}`, "", c.small, "", ...visitorFooterText(input.footing, true)]),
  };
}

/* ------------------------------------------------------------------ */
/* 3. Monday reminder                                                  */
/* ------------------------------------------------------------------ */

export function mondayReminderEmail(input: { firstName: string; enterUrl: string; firstDrawing: Drawing; footing: Footing }): Email {
  const c = EMAILS.mondayReminder;
  const prize = prizeLineFor(input.firstDrawing);
  const heading = c.heading(input.firstName);
  const body = c.body(input.firstDrawing, prize.name);
  const subject = c.subject(prize.name);
  const rows = [
    section(`${h1(heading)}${p(body)}${prize.partner ? p(prize.partner) : ""}`, "18px 20px 0"),
    section(buttons([[c.button, input.enterUrl]]), "16px 20px 0"),
    gap(16),
    visitorFooter(input.footing, true),
  ];
  return {
    subject,
    preheader: c.preheader,
    html: page({ title: subject, preheader: c.preheader, rows }),
    text: textOf([heading, body, prize.partner, "", `${c.button}: ${input.enterUrl}`, "", ...visitorFooterText(input.footing, true)]),
  };
}

/* ------------------------------------------------------------------ */
/* 5. "You're in"                                                       */
/* ------------------------------------------------------------------ */

export function youreInEmail(input: {
  firstName: string;
  /** Came in through a friend's link (+1). */
  referredBonus: boolean;
  nextDrawing: Drawing | null;
  referralUrl: string;
  footing: Footing;
}): Email {
  const c = EMAILS.youreIn;
  const prize = input.nextDrawing ? prizeLineFor(input.nextDrawing) : null;
  const heading = c.heading(input.firstName);
  const body = c.body(input.nextDrawing, prize?.name ?? null);
  const share = c.shareBody(REFERRAL.referrerBonus, REFERRAL.referredBonus, REFERRAL.friendCap);
  const tease = c.giftTease(revealSpoken());
  const rows = [
    section(`${h1(heading)}${p(body)}${prize?.partner ? p(prize.partner) : ""}${input.referredBonus ? small(c.referredBonus) : ""}`, "18px 20px 0"),
    section(panel(`${panelTitle(c.shareHeading)}<div class="hbc-text" style="font-family:${SANS};font-size:14px;line-height:1.45;color:${C.ink};">${esc(share)}</div><div style="padding-top:8px;">${buttons([[c.shareButton, input.referralUrl]])}</div><div class="hbc-muted" style="font-family:${SANS};font-size:12px;color:${C.slate};padding-top:6px;word-break:break-all;">${esc(input.referralUrl)}</div>`), "14px 20px 0"),
    section(p(tease, "padding-top:0;"), "14px 20px 0"),
    gap(16),
    visitorFooter(input.footing, false),
  ];
  return {
    subject: c.subject,
    preheader: c.preheader,
    html: page({ title: c.subject, preheader: c.preheader, rows }),
    text: textOf([
      heading,
      body,
      prize?.partner ?? null,
      input.referredBonus ? c.referredBonus : null,
      "",
      c.shareHeading,
      share,
      `${c.shareButton}: ${input.referralUrl}`,
      "",
      tease,
      "",
      ...visitorFooterText(input.footing, false),
    ]),
  };
}

/* ------------------------------------------------------------------ */
/* 6. Drawing-week countdown: Mon–Fri 4 pm + Sat 9 am (Ben, 2026-11-04) */
/* ------------------------------------------------------------------ */

/** The six countdown emails, keyed by the day they go out. */
export type HypeDay = "mon" | "tue" | "wed" | "thu" | "fri" | "sat";
export const HYPE_DAYS: readonly HypeDay[] = ["mon", "tue", "wed", "thu", "fri", "sat"];

/** When each countdown email goes out (the daily slots' 4 pm, Saturday 9 am). */
export function hypeSendAt(day: HypeDay): Date {
  if (day === "sat") return SCHEDULE.saturdayMorning.at;
  const at = drawing(day).dailyEmailAt;
  if (!at) throw new Error(`${day} has no email time`);
  return at;
}

/** Calendar days (Central) from the send to the grand drawing: Mon 5 … Sat 0. */
export function hypeDaysLeft(day: HypeDay): number {
  const dayNo = (d: Date) => {
    const p = centralParts(d);
    return Date.UTC(p.year, p.month - 1, p.day) / 86_400_000;
  };
  return dayNo(drawing("grand").at) - dayNo(hypeSendAt(day));
}

/** The grand prize as five short bullets, built from its PrizeSpec:
 *  "Brain Map", "12 LENS sessions + vibro chair", "Hoolest VeRelief",
 *  "3 lymphatic therapy sessions", "3 BrainMD bottles". */
export function grandPrizeBullets(p: PrizeSpec = prizeFor("grand")): string[] {
  const out: string[] = [];
  if (p.brainMap) out.push("Brain Map");
  if (p.sessions) out.push(`${p.sessions} LENS sessions${p.vibroSessions ? " + vibro chair" : ""}`);
  if (p.hoolest) out.push(DEVICES[p.hoolest].short);
  for (const id of p.partners) out.push(PARTNER_GIFTS[id].short);
  if (p.brainMdBottles) out.push(`${p.brainMdBottles} BrainMD ${p.brainMdBottles === 1 ? "bottle" : "bottles"}`);
  return out;
}

/** A daily prize in one short line: "Brain Map + 3 LENS + BrainMD". */
export function shortPrizeName(p: PrizeSpec): string {
  const out: string[] = [];
  if (p.brainMap) out.push("Brain Map");
  if (p.sessions) out.push(`${p.sessions} LENS`);
  if (p.hoolest) out.push(DEVICES[p.hoolest].short);
  for (const id of p.partners) out.push(EMAILS.hype.partnerTiny[id] ?? PARTNER_GIFTS[id].short);
  if (p.brainMdBottles) out.push(p.brainMdBottles === 1 ? "BrainMD" : `${p.brainMdBottles} BrainMD`);
  return out.join(" + ");
}

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
/** "5 PM", "7 PM", "noon". */
const clock = (d: Date) => shortCentralTime(d).replace(/\b(am|pm)\b/, (m) => m.toUpperCase());

/* The countdown email's own look (Ben's mockup, 2026-11-04): one ivory
 * column, centered wordmark, thin gold rules, no card. Email-safe: 600px
 * max, single column, tables, inline styles, system fonts; the <style>
 * block only tightens phones (≤ 480px) and handles dark mode, and the
 * email reads correctly where a client drops it. */
const HYPE = { bg: C.ivory, rule: "#dccfae", photo: "#ece4d4", gold: C.goldInk, ink: C.navy, body: C.ink, muted: C.slate } as const;

function hypePage(input: { title: string; preheader: string; rows: string[] }): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(input.title)}</title>
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  /* Phone sizes are inline (every client honours them); wider screens
     scale up here. A client that drops <style> shows the phone layout,
     which still reads well in a 600px column. */
  @media (min-width: 481px) {
    .hy-pad { padding-left: 32px !important; padding-right: 32px !important; }
    .hy-word { font-size: 32px !important; }
    .hy-value { font-size: 52px !important; }
    .hy-when { font-size: 19px !important; }
    .hy-head { padding-top: 26px !important; padding-bottom: 20px !important; }
    .hy-top { padding-top: 28px !important; }
    .hy-photo-pad { padding-top: 22px !important; }
    .hy-photo { height: 190px !important; }
    .hy-gap { padding-top: 26px !important; }
    .hy-open { font-size: 23px !important; }
    .hy-li { font-size: 19px !important; padding-top: 4px !important; padding-bottom: 4px !important; }
    .hy-tpad { padding-top: 18px !important; }
    .hy-trow { padding-top: 12px !important; padding-bottom: 12px !important; }
    .hy-tname { font-size: 19px !important; }
    .hy-tval { font-size: 21px !important; }
    .hy-cpad { padding-top: 18px !important; }
    .hy-count { font-size: 20px !important; }
    .hy-btn a { font-size: 20px !important; padding: 18px 12px !important; }
    .hy-hint { font-size: 17px !important; }
  }
  @media (prefers-color-scheme: dark) {
    .hbc-bg { background: #11181f !important; }
    .hbc-word, .hbc-name, .hbc-text { color: #f1ece2 !important; }
    .hbc-sub, .hy-gold { color: #d2b77c !important; }
    .hbc-muted { color: #a9b2ba !important; }
    .hy-rule { border-color: #3a4753 !important; }
    .hy-photo { background: #212c36 !important; }
    .hbc-btn { background: #f1ece2 !important; border-color: #f1ece2 !important; }
    .hbc-btn a { color: #1c2b3a !important; }
    .hbc-foot a, .hbc-foot div { color: #a9b2ba !important; }
  }
</style>
</head>
<body class="hbc-bg" style="margin:0;padding:0;background:${HYPE.bg};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${esc(input.preheader)}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" class="hbc-bg" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${HYPE.bg};" bgcolor="${HYPE.bg}">
<tr><td align="center" style="padding:0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
${input.rows.join("\n")}
</table>
</td></tr>
</table>
</body>
</html>`;
}

export function hypeEmail(input: { day: HypeDay; entries: number; referralUrl: string; footing: Footing }): Email {
  const c = EMAILS.hype;
  const grand = drawing("grand");
  const daysLeft = hypeDaysLeft(input.day);
  const value = usd(prizeRetailUsd(prizeFor("grand")));
  const grandTime = clock(grand.at);
  const sendAt = hypeSendAt(input.day);
  const facts = { entries: input.entries, grandDay: grand.dayName, grandTime, drawingsLeft: DRAWINGS.filter((d) => d.at > sendAt).length };
  const subject = c.subject(daysLeft, value, grandTime);
  const preheader = c.preheader[input.day](facts);
  const label = c.countdown(daysLeft);
  const when = c.prizeWhen(grand.dayName, grandTime);
  const opener = c.opener[input.day];
  const bullets = grandPrizeBullets();
  // Mon–Thu: the next daily drawing (Friday's next is the grand prize itself).
  const next = input.day === "sat" ? null : drawingAfter(input.day);
  const tomorrow = next && next.kind === "daily" ? { label: c.tomorrowLabel(clock(next.at)), name: shortPrizeName(prizeFor(next.slot)), value: usd(prizeRetailUsd(prizeFor(next.slot))) } : null;
  const button = c.button(REFERRAL.referrerBonus);
  const hint =
    input.day === "sat" ? c.hint.sat(grandTime, clock(GIFT_REVEAL_AT)) : input.day === "fri" ? c.hint.fri(grandTime) : c.hint.daily(REFERRAL.referrerBonus);
  const count = c.entriesCount(input.entries);

  // Footer: the registered identity, split for the centered three lines.
  const [orgName, ...addressParts] = input.footing.identityLine.split(" · ");
  const address = addressParts.join(" · ");
  const unsub = input.footing.unsubscribeUrl;

  const F = SANS;
  const rule = `<tr><td class="hy-pad" style="padding:0 20px;"><div class="hy-rule" style="border-top:1px solid ${HYPE.rule};font-size:0;line-height:0;height:0;">&nbsp;</div></td></tr>`;
  const rows = [
    // Wordmark
    `<tr><td align="center" style="padding:18px 20px 14px;text-align:center;border-bottom:1px solid ${HYPE.rule};" class="hy-rule hy-head"><div class="hbc-word hy-word" style="font-family:${SERIF};font-size:28px;color:${HYPE.ink};line-height:1.1;">Harmonized</div><div class="hbc-sub" style="font-family:${F};font-size:12px;font-weight:700;letter-spacing:0.3em;color:${HYPE.gold};line-height:1;padding-top:8px;padding-left:0.3em;">BRAIN CENTERS</div></td></tr>`,
    // Countdown + value + when
    `<tr><td align="center" class="hy-pad hy-top" style="padding:18px 20px 0;text-align:center;"><div class="hy-gold" style="font-family:${F};font-size:14px;font-weight:700;letter-spacing:0.2em;color:${HYPE.gold};line-height:1;padding-left:0.2em;">${esc(label)}</div><div class="hbc-name hy-value" style="font-family:${F};font-size:44px;font-weight:800;color:${HYPE.ink};line-height:1.05;letter-spacing:-0.02em;padding-top:12px;">${esc(value)}</div><div class="hbc-text hy-when" style="font-family:${F};font-size:17px;color:${HYPE.body};line-height:1.3;padding-top:8px;">${esc(when)}</div></td></tr>`,
    // Photo slot (a placeholder until there is a photo: HYPE_PRIZE_PHOTO_URL)
    `<tr><td class="hy-pad hy-photo-pad" style="padding:16px 20px 0;">${
      HYPE_PRIZE_PHOTO_URL
        ? `<img src="${esc(HYPE_PRIZE_PHOTO_URL)}" width="536" alt="${esc(c.photoAlt)}" style="display:block;width:100%;max-width:536px;height:auto;border:0;">`
        : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="hy-photo" align="center" valign="middle" height="104" bgcolor="${HYPE.photo}" style="height:104px;background:${HYPE.photo};text-align:center;font-family:${F};font-size:14px;letter-spacing:0.12em;color:${HYPE.gold};"><span class="hy-gold">${esc(c.photoPlaceholder)}</span></td></tr></table>`
    }</td></tr>`,
    // Opener + bullets
    `<tr><td class="hy-pad hy-gap" style="padding:18px 20px 0;"><div class="hbc-name hy-open" style="font-family:${F};font-size:20px;font-weight:700;color:${HYPE.ink};line-height:1.3;">${esc(opener)}</div><table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:10px;">${bullets
      .map((b) => `<tr><td valign="top" class="hbc-text hy-li" style="font-family:${F};font-size:17px;color:${HYPE.body};line-height:1.35;padding:2px 14px 2px 4px;">&bull;</td><td class="hbc-text hy-li" style="font-family:${F};font-size:17px;color:${HYPE.body};line-height:1.35;padding:2px 0;">${esc(b)}</td></tr>`)
      .join("")}</table></td></tr>`,
    // Tomorrow · Noon (Mon–Thu), between thin gold rules
    tomorrow
      ? `<tr><td class="hy-pad hy-tpad" style="padding:14px 20px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="hy-rule hy-trow" style="border-top:1px solid ${HYPE.rule};border-bottom:1px solid ${HYPE.rule};padding:10px 0 10px;"><div class="hy-gold" style="font-family:${F};font-size:14px;font-weight:700;letter-spacing:0.12em;color:${HYPE.gold};line-height:1.3;">${esc(tomorrow.label)}</div><div class="hbc-text hy-tname" style="font-family:${F};font-size:17px;color:${HYPE.body};line-height:1.35;padding-top:4px;">${esc(tomorrow.name)}</div><div class="hbc-name hy-tval" style="font-family:${F};font-size:19px;font-weight:700;color:${HYPE.ink};line-height:1.3;padding-top:2px;">${esc(tomorrow.value)}</div></td></tr></table></td></tr>`
      : `<tr><td class="hy-pad hy-tpad" style="padding:14px 20px 0;"><div class="hy-rule" style="border-top:1px solid ${HYPE.rule};font-size:0;line-height:0;height:0;">&nbsp;</div></td></tr>`,
    // Entries, button, hint
    `<tr><td class="hy-pad hy-cpad" align="center" style="padding:14px 20px 0;text-align:center;"><div class="hbc-text hy-count" style="font-family:${F};font-size:18px;color:${HYPE.body};line-height:1.3;">${esc(c.entriesLead)} <strong class="hbc-name" style="color:${HYPE.ink};font-weight:700;">${esc(count)}</strong></div></td></tr>`,
    `<tr><td class="hy-pad" style="padding:12px 20px 0;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="hbc-btn hy-btn" align="center" bgcolor="${C.navy}" style="background:${C.navy};border:1px solid ${C.navy};border-radius:6px;"><a href="${esc(input.referralUrl)}" style="display:block;padding:16px 10px;font-family:${F};font-size:18px;font-weight:700;color:${C.white};text-decoration:none;line-height:1.2;text-align:center;">${esc(button)}</a></td></tr></table></td></tr>`,
    `<tr><td class="hy-pad" align="center" style="padding:12px 20px 24px;text-align:center;"><div class="hbc-muted hy-hint" style="font-family:${F};font-size:15px;color:${HYPE.muted};line-height:1.4;">${esc(hint)}</div></td></tr>`,
    rule,
    // Centered footer: name, address, Unsubscribe (CAN-SPAM: identity + opt-out)
    `<tr><td class="hbc-foot hy-pad" align="center" style="padding:18px 20px 28px;text-align:center;"><div style="font-family:${F};font-size:15px;line-height:1.6;color:${HYPE.muted};">${esc(orgName)}</div>${
      address ? `<div style="font-family:${F};font-size:15px;line-height:1.6;color:${HYPE.muted};">${esc(address)}</div>` : ""
    }${unsub ? `<div style="font-family:${F};font-size:15px;line-height:1.6;"><a href="${esc(unsub)}" style="color:${HYPE.muted};text-decoration:underline;">${esc(SHARED.unsubscribe)}</a></div>` : ""}</td></tr>`,
  ];

  const text = textOf([
    label,
    value,
    when,
    "",
    opener,
    ...bullets.map((b) => `• ${b}`),
    "",
    tomorrow ? `${tomorrow.label}: ${tomorrow.name} — ${tomorrow.value}` : null,
    tomorrow ? "" : null,
    `${c.entriesLead} ${count}`,
    `${button}: ${input.referralUrl}`,
    hint,
    "",
    ...visitorFooterText(input.footing, true),
  ]);
  return { subject, preheader, html: hypePage({ title: subject, preheader, rows }), text };
}

/* ------------------------------------------------------------------ */
/* 8. The reveal: thank-you + gift, to every entrant (winners too)      */
/* ------------------------------------------------------------------ */

export function thankYouEmail(input: { firstName: string; offerCode: string; bookUrl: string; footing: Footing }): Email {
  const c = EMAILS.thankYou;
  const heading = c.heading(input.firstName);
  const offer = offerPanel({ code: input.offerCode });
  const open = c.openDays(openDaysSpoken());
  const rows = [
    section(`${h1(heading)}${p(c.body)}`, "18px 20px 0"),
    section(offer.html, "14px 20px 0"),
    section(small(open), "10px 20px 0"),
    section(buttons([[c.button, input.bookUrl]]), "12px 20px 0"),
    gap(16),
    visitorFooter(input.footing, true),
  ];
  return {
    subject: c.subject,
    preheader: c.preheader,
    html: page({ title: c.subject, preheader: c.preheader, rows }),
    text: textOf([heading, c.body, "", ...offer.text, open, `${c.button}: ${input.bookUrl}`, "", ...visitorFooterText(input.footing, true)]),
  };
}

/* ------------------------------------------------------------------ */
/* 8b. Gift reminder (Dec 1) and last call (Dec 3) — P1-4               */
/* ------------------------------------------------------------------ */

/** For entrants who have not booked: the code again and the Dec 5 deadline — the only urgency (Ben, 2026-11-03). */
export function giftReminderEmail(input: { kind: "reminder" | "last_call"; firstName: string; offerCode: string; bookUrl: string; footing: Footing }): Email {
  const c = input.kind === "reminder" ? EMAILS.giftReminder : EMAILS.giftLastCall;
  const bookBy = spokenDate(OFFER.bookBy.at);
  const visitBy = spokenDate(OFFER.visitBy.at);
  const subject = typeof c.subject === "function" ? c.subject(`Sat, ${bookBy}`) : c.subject;
  const heading = c.heading(input.firstName);
  const body = c.body(`Sat, ${bookBy}`, visitBy);
  const offer = offerPanel({ code: input.offerCode });
  const rows = [
    section(`${h1(heading)}${p(body)}`, "18px 20px 0"),
    section(offer.html, "14px 20px 0"),
    section(buttons([[c.button, input.bookUrl]]), "12px 20px 0"),
    gap(16),
    visitorFooter(input.footing, true),
  ];
  return {
    subject,
    preheader: c.preheader,
    html: page({ title: subject, preheader: c.preheader, rows }),
    text: textOf([heading, body, "", ...offer.text, `${c.button}: ${input.bookUrl}`, "", ...visitorFooterText(input.footing, true)]),
  };
}

/* ------------------------------------------------------------------ */
/* 9. Staff: winner drawn                                              */
/* ------------------------------------------------------------------ */

/** What staff see about a winner (P1-8): who and where — never their
 *  new/current status. The prize VERSION is passed separately, because
 *  fulfilling the prize needs it. */
export type StaffWinner = {
  name: string;
  email: string;
  zip: string;
  city: string | null;
  /** "Best phone if you win" from the entry form, or null (left blank, or
   *  entered through notify-me, whose form has no phone). */
  phone: string | null;
};

export function staffWinnerAlertEmail(input: { drawing: Drawing; winner: StaffWinner; taxFormRequired: boolean; now: Date }): Email {
  const c = EMAILS.staffWinnerAlert;
  const prize = prizeLineFor(input.drawing);
  const subject = c.subject(input.drawing.dayName, input.drawing.kind, input.winner.name);
  const heading = c.heading(input.drawing.dayName, input.drawing.kind);
  const where = [input.winner.city, input.winner.zip].filter(Boolean).join(" ");
  // Current client? Staff ask on the call; their Brain Map becomes this day's gift certificate.
  const giftLine = c.giftCodeLine(GIFT_CODES[input.drawing.slot]);
  const noAnswer = c.noAnswerLine(Math.round(RESPONSE_WINDOW_MS / 3_600_000));
  const spec = prizeFor(input.drawing.slot);
  const hasPickup = spec.brainMdBottles > 0 || spec.hoolest !== null;
  // "Email the winner": staff's own mail app, To the winner, a subject to start from.
  const mailto = `mailto:${encodeURIComponent(input.winner.email)}?subject=${encodeURIComponent(c.mailSubject)}`;
  const rows = [
    section(`<div style="font-family:${SANS};font-size:13px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:${C.slate};line-height:1.6;" class="hbc-muted">${esc(heading)}</div>`, "14px 20px 0"),
    section(
      `<div class="hbc-name" style="font-family:${SANS};font-size:24px;font-weight:700;color:${C.navy};line-height:1.2;">${esc(input.winner.name)}</div><div class="hbc-text" style="font-family:${SANS};font-size:15px;color:${C.ink};line-height:1.4;padding-top:3px;"><a href="mailto:${esc(input.winner.email)}" style="color:${C.ink};text-decoration:none;">${esc(input.winner.email)}</a> <span style="color:${C.slate};">&middot;</span> ${esc(where)}</div>`,
      "8px 20px 0"
    ),
    section(
      factGrid([
        [c.prize, esc(prize.name)],
        [c.reach, `<b>${esc(c.reachLine)}</b>`],
        [c.phone, input.winner.phone ? `<b><a href="${esc(telHref(input.winner.phone))}" style="color:${C.ink};text-decoration:none;">${esc(input.winner.phone)}</a></b>` : esc(c.phoneNone)],
        [c.noAnswer, esc(noAnswer)],
        [c.giftCode, esc(giftLine)],
        [c.taxForm, input.taxFormRequired ? `<b class="hbc-no" style="color:${C.alert};">${esc(c.taxYes)}</b>` : esc(c.taxNo)],
        ...(hasPickup ? ([[c.pickup, esc(c.pickupLine)]] as Array<[string, string]>) : []),
        ...(prize.partner ? ([[c.partner, esc(prize.partner)]] as Array<[string, string]>) : []),
      ]),
      "14px 20px 0"
    ),
    section(buttons([[c.button, mailto]]), "4px 20px 0"),
    section(p(c.footer), "10px 20px 0"),
    gap(14),
    footer([`Drawn ${esc(formatCentral(input.now))}`]),
  ];
  return {
    subject,
    preheader: `${input.winner.name} · ${prize.name}`,
    html: page({ title: subject, preheader: `${input.winner.name} · ${prize.name}`, rows }),
    text: textOf([
      heading.toUpperCase(),
      "",
      input.winner.name,
      `${input.winner.email} · ${where}`,
      "",
      `${c.prize}: ${prize.name}`,
      `${c.reach}: ${c.reachLine}`,
      `${c.phone}: ${input.winner.phone ?? c.phoneNone}`,
      `${c.noAnswer} ${noAnswer}`,
      `${c.giftCode} ${giftLine}`,
      `${c.taxForm}: ${input.taxFormRequired ? c.taxYes : c.taxNo}`,
      hasPickup ? `${c.pickup}: ${c.pickupLine}` : null,
      prize.partner ? `${c.partner}: ${prize.partner}` : null,
      "",
      c.footer,
      `Drawn ${formatCentral(input.now)}`,
    ]),
  };
}
