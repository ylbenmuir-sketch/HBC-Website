/**
 * The ten giveaway emails (GIVEAWAY-PLAN.md §4), built on the shared
 * template's pieces (lib/email/templates.ts: page, section, footer, buttons)
 * so they are the same design as every other email the site sends. Words
 * come from lib/giveaway/copy.ts ([DRAFT] until approved); facts (prizes,
 * times, the offer) come from lib/giveaway/config.ts and are passed in.
 *
 * Marketing emails (It's live, the Monday reminder, the daily afternoon,
 * the thank-you) carry the unsubscribe link and the registered identity line
 * (CAN-SPAM). Transactional ones (verifications, You're in, winner) carry
 * the identity line and a "why you got this" line. Staff emails carry
 * neither.
 *
 * Each builder returns the subject, the HTML and the plain-text twin. Pure:
 * no environment reads, no network; the sender (Phase 3) adds headers.
 * scripts/render-email-previews.mjs renders every one at 390 and 640.
 */

import { escapeHtml as esc, formatCentral } from "../email/format";
import { C, SANS, buttons, factGrid, footer, page, section, textOf, type Rendered } from "../email/templates";
import { EMAILS, SHARED } from "./copy";
import {
  OFFER,
  REFERRAL,
  formatCentralLabel,
  partnerFor,
  prizeFor,
  prizeName,
  prizeVersionFor,
  type Drawing,
  type PrizeVersion,
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
      marketing && f.unsubscribeUrl ? ` <a href="${esc(f.unsubscribeUrl)}" style="color:${C.slate};">${esc(SHARED.unsubscribe)}</a>` : ""
    }`,
  ];
  return footer(lines);
}

function visitorFooterText(f: Footing, marketing: boolean): string[] {
  const why = marketing ? SHARED.whyYouGotThis : SHARED.whyYouGotThisTransactional;
  return [f.identityLine, `${why} ${host(f.siteUrl)}.`, marketing && f.unsubscribeUrl ? `${SHARED.unsubscribe}: ${f.unsubscribeUrl}` : null].filter((l): l is string => Boolean(l));
}

/** The prize line for a drawing, for this person's version, with the
 *  partner prize only when the partner is named. */
export function prizeLineFor(d: Drawing, version: PrizeVersion): { name: string; partner: string | null } {
  const partner = partnerFor(d.slot);
  return { name: prizeName(prizeFor(d.slot, version)), partner: partner ? SHARED.partnerLine(partner.name!, partner.prize) : null };
}

const spokenDate = (at: Date) => {
  const label = formatCentralLabel(at); // "Sat Dec 5, 11:59 PM CT"
  return label.replace(/,.*$/, "").replace(/^\w+ /, ""); // "Dec 5"
};

/** The offer panel shared by "You're in" and the thank-you. */
function offerPanel(input: { code: string; isExistingClient: boolean }): { html: string; text: string[] } {
  const line = SHARED.offerLine(spokenDate(OFFER.bookBy.at), spokenDate(OFFER.visitBy.at));
  const bonus = SHARED.offerBonus(OFFER.packageSessions);
  const html = panel(
    `${panelTitle(EMAILS.youreIn.offerHeading)}<div class="hbc-text" style="font-family:${SANS};font-size:14px;line-height:1.45;color:${C.ink};">${esc(line)} ${esc(bonus)}</div><div class="hbc-muted" style="font-family:${SANS};font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${C.slate};padding-top:8px;">${esc(SHARED.yourCode)}</div>${code(input.code)}${
      input.isExistingClient ? `<div class="hbc-text" style="font-family:${SANS};font-size:13px;line-height:1.45;color:${C.ink};padding-top:6px;">${esc(SHARED.existingClientForward)}</div>` : ""
    }`
  );
  const text = [EMAILS.youreIn.offerHeading, line, bonus, `${SHARED.yourCode}: ${input.code}`, input.isExistingClient ? SHARED.existingClientForward : null].filter((l): l is string => Boolean(l));
  return { html, text };
}

/* ------------------------------------------------------------------ */
/* 1. Notify-me verification                                           */
/* ------------------------------------------------------------------ */

export function notifyVerifyEmail(input: { firstName: string; verifyUrl: string; footing: Footing }): Email {
  const c = EMAILS.notifyVerify;
  const heading = c.heading(input.firstName);
  const rows = [
    section(`${h1(heading)}${p(c.body)}`, "18px 20px 0"),
    section(buttons([[c.button, input.verifyUrl]]), "16px 20px 0"),
    section(small(c.small), "8px 20px 0"),
    gap(16),
    visitorFooter(input.footing, false),
  ];
  return {
    subject: c.subject,
    preheader: c.preheader,
    html: page({ title: c.subject, preheader: c.preheader, rows }),
    text: textOf([heading, c.body, "", `${c.button}: ${input.verifyUrl}`, "", c.small, "", ...visitorFooterText(input.footing, false)]),
  };
}

/* ------------------------------------------------------------------ */
/* 2. "It's live" — one-tap entry                                      */
/* ------------------------------------------------------------------ */

export function itsLiveEmail(input: { firstName: string; isExistingClient: boolean; enterUrl: string; firstDrawing: Drawing; footing: Footing }): Email {
  const c = EMAILS.itsLive;
  const prize = prizeLineFor(input.firstDrawing, prizeVersionFor(input.isExistingClient));
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

export function mondayReminderEmail(input: { firstName: string; isExistingClient: boolean; enterUrl: string; firstDrawing: Drawing; footing: Footing }): Email {
  const c = EMAILS.mondayReminder;
  const prize = prizeLineFor(input.firstDrawing, prizeVersionFor(input.isExistingClient));
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
/* 4. Entry verification                                               */
/* ------------------------------------------------------------------ */

export function entryVerifyEmail(input: { firstName: string; verifyUrl: string; footing: Footing }): Email {
  const c = EMAILS.entryVerify;
  const heading = c.heading(input.firstName);
  const rows = [
    section(`${h1(heading)}${p(c.body)}`, "18px 20px 0"),
    section(buttons([[c.button, input.verifyUrl]]), "16px 20px 0"),
    section(small(c.small), "8px 20px 0"),
    gap(16),
    visitorFooter(input.footing, false),
  ];
  return {
    subject: c.subject,
    preheader: c.preheader,
    html: page({ title: c.subject, preheader: c.preheader, rows }),
    text: textOf([heading, c.body, "", `${c.button}: ${input.verifyUrl}`, "", c.small, "", ...visitorFooterText(input.footing, false)]),
  };
}

/* ------------------------------------------------------------------ */
/* 5. "You're in"                                                       */
/* ------------------------------------------------------------------ */

export function youreInEmail(input: {
  firstName: string;
  isExistingClient: boolean;
  /** Came in through a friend's link (+1). */
  referredBonus: boolean;
  nextDrawing: Drawing | null;
  referralUrl: string;
  offerCode: string;
  bookUrl: string;
  footing: Footing;
}): Email {
  const c = EMAILS.youreIn;
  const version = prizeVersionFor(input.isExistingClient);
  const prize = input.nextDrawing ? prizeLineFor(input.nextDrawing, version) : null;
  const heading = c.heading(input.firstName);
  const body = c.body(input.nextDrawing, prize?.name ?? null);
  const share = c.shareBody(REFERRAL.referrerBonus, REFERRAL.referredBonus, REFERRAL.friendCap);
  const offer = offerPanel({ code: input.offerCode, isExistingClient: input.isExistingClient });
  const rows = [
    section(`${h1(heading)}${p(body)}${prize?.partner ? p(prize.partner) : ""}${input.referredBonus ? small(c.referredBonus) : ""}`, "18px 20px 0"),
    section(panel(`${panelTitle(c.shareHeading)}<div class="hbc-text" style="font-family:${SANS};font-size:14px;line-height:1.45;color:${C.ink};">${esc(share)}</div><div style="padding-top:8px;">${buttons([[c.shareButton, input.referralUrl]])}</div><div class="hbc-muted" style="font-family:${SANS};font-size:12px;color:${C.slate};padding-top:6px;word-break:break-all;">${esc(input.referralUrl)}</div>`), "14px 20px 0"),
    section(offer.html, "10px 20px 0"),
    section(buttons([[c.offerButton, input.bookUrl]]), "12px 20px 0"),
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
      ...offer.text,
      `${c.offerButton}: ${input.bookUrl}`,
      "",
      ...visitorFooterText(input.footing, false),
    ]),
  };
}

/* ------------------------------------------------------------------ */
/* 6. Daily afternoon (simplified)                                     */
/* ------------------------------------------------------------------ */

export function dailyAfternoonEmail(input: { isExistingClient: boolean; nextDrawing: Drawing | null; entries: number; referralUrl: string; footing: Footing }): Email {
  const c = EMAILS.dailyAfternoon;
  const prize = input.nextDrawing ? prizeLineFor(input.nextDrawing, prizeVersionFor(input.isExistingClient)) : null;
  const subject = c.subject(input.nextDrawing, prize?.name ?? null);
  const body = c.body(input.nextDrawing, prize?.name ?? null);
  const entries = c.entries(input.entries);
  const rows = [
    section(`${h1(c.heading)}${p(body)}${prize?.partner ? p(prize.partner) : ""}${p(entries)}`, "18px 20px 0"),
    section(buttons([[c.button, input.referralUrl]]), "16px 20px 0"),
    gap(16),
    visitorFooter(input.footing, true),
  ];
  return {
    subject,
    preheader: c.preheader,
    html: page({ title: subject, preheader: c.preheader, rows }),
    text: textOf([c.heading, body, prize?.partner ?? null, entries, "", `${c.button}: ${input.referralUrl}`, "", ...visitorFooterText(input.footing, true)]),
  };
}

/* ------------------------------------------------------------------ */
/* 7. Winner                                                           */
/* ------------------------------------------------------------------ */

export function winnerEmail(input: { firstName: string; drawing: Drawing; version: PrizeVersion; claimUrl: string; claimDeadline: Date; taxFormRequired: boolean; footing: Footing }): Email {
  const c = EMAILS.winner;
  const prize = prizeLineFor(input.drawing, input.version);
  const subject = c.subject(input.drawing.dayName);
  const heading = c.heading(input.firstName);
  const body = c.body(prize.name);
  const deadline = formatCentral(input.claimDeadline);
  const callLine = c.callLine(deadline);
  const rows = [
    section(`${h1(heading)}${p(body)}${prize.partner ? p(prize.partner) : ""}${small(SHARED.chairNote)}`, "18px 20px 0"),
    section(`${p(callLine, "padding-top:0;")}${input.taxFormRequired ? small(c.taxLine) : ""}${small(c.publicLine)}`, "12px 20px 0"),
    section(buttons([[c.button, input.claimUrl]]), "14px 20px 0"),
    gap(16),
    visitorFooter(input.footing, false),
  ];
  return {
    subject,
    preheader: c.preheader,
    html: page({ title: subject, preheader: c.preheader, rows }),
    text: textOf([heading, body, prize.partner, SHARED.chairNote, "", callLine, input.taxFormRequired ? c.taxLine : null, c.publicLine, "", `${c.button}: ${input.claimUrl}`, "", ...visitorFooterText(input.footing, false)]),
  };
}

/* ------------------------------------------------------------------ */
/* 8. Non-winner thank-you + offer                                     */
/* ------------------------------------------------------------------ */

export function thankYouEmail(input: { firstName: string; isExistingClient: boolean; offerCode: string; bookUrl: string; footing: Footing }): Email {
  const c = EMAILS.thankYou;
  const heading = c.heading(input.firstName);
  const offer = offerPanel({ code: input.offerCode, isExistingClient: input.isExistingClient });
  const rows = [
    section(`${h1(heading)}${p(c.body)}`, "18px 20px 0"),
    section(offer.html, "14px 20px 0"),
    section(buttons([[c.button, input.bookUrl]]), "12px 20px 0"),
    gap(16),
    visitorFooter(input.footing, true),
  ];
  return {
    subject: c.subject,
    preheader: c.preheader,
    html: page({ title: c.subject, preheader: c.preheader, rows }),
    text: textOf([heading, c.body, "", ...offer.text, `${c.button}: ${input.bookUrl}`, "", ...visitorFooterText(input.footing, true)]),
  };
}

/* ------------------------------------------------------------------ */
/* 9. Staff: winner drawn                                              */
/* ------------------------------------------------------------------ */

export type StaffWinner = {
  name: string;
  email: string;
  zip: string;
  city: string | null;
  isExistingClient: boolean;
};

export function staffWinnerAlertEmail(input: { drawing: Drawing; winner: StaffWinner; version: PrizeVersion; claimDeadline: Date; taxFormRequired: boolean; adminUrl: string; now: Date }): Email {
  const c = EMAILS.staffWinnerAlert;
  const prize = prizeLineFor(input.drawing, input.version);
  const subject = c.subject(input.drawing.dayName, input.drawing.kind, input.winner.name);
  const heading = c.heading(input.drawing.dayName, input.drawing.kind);
  const deadline = formatCentral(input.claimDeadline);
  const where = [input.winner.city, input.winner.zip].filter(Boolean).join(" ");
  const versionLabel = input.version === "current_client" ? "Current client" : "New client";
  const rows = [
    section(`<div style="font-family:${SANS};font-size:13px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:${C.slate};line-height:1.6;" class="hbc-muted">${esc(heading)}</div>`, "14px 20px 0"),
    section(
      `<div class="hbc-name" style="font-family:${SANS};font-size:24px;font-weight:700;color:${C.navy};line-height:1.2;">${esc(input.winner.name)}</div><div class="hbc-text" style="font-family:${SANS};font-size:15px;color:${C.ink};line-height:1.4;padding-top:3px;"><a href="mailto:${esc(input.winner.email)}" style="color:${C.ink};text-decoration:none;">${esc(input.winner.email)}</a> <span style="color:${C.slate};">&middot;</span> ${esc(where)}</div>`,
      "8px 20px 0"
    ),
    section(
      factGrid([
        [c.prize, esc(prize.name)],
        [c.version, esc(versionLabel)],
        [c.callBy, `<b>${esc(deadline)}</b>`],
        [c.taxForm, input.taxFormRequired ? `<b class="hbc-no" style="color:${C.alert};">${esc(c.taxYes)}</b>` : esc(c.taxNo)],
        ...(prize.partner ? ([[c.partner, esc(prize.partner)]] as Array<[string, string]>) : []),
      ]),
      "14px 20px 0"
    ),
    section(buttons([[c.button, input.adminUrl]]), "4px 20px 0"),
    gap(14),
    footer([esc(c.footer), `Drawn ${esc(formatCentral(input.now))}`]),
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
      `${c.prize}:      ${prize.name}`,
      `${c.version}:    ${versionLabel}`,
      `${c.callBy}:    ${deadline}`,
      `${c.taxForm}:   ${input.taxFormRequired ? c.taxYes : c.taxNo}`,
      prize.partner ? `${c.partner}: ${prize.partner}` : null,
      "",
      `${c.button}: ${input.adminUrl}`,
      c.footer,
      `Drawn ${formatCentral(input.now)}`,
    ]),
  };
}

/* ------------------------------------------------------------------ */
/* 10. Staff: Tuesday "call today"                                     */
/* ------------------------------------------------------------------ */

export function tuesdayCallTodayEmail(input: { winner: StaffWinner; version: PrizeVersion; claimDeadline: Date; adminUrl: string; now: Date; drawing: Drawing }): Email {
  const c = EMAILS.tuesdayCallToday;
  const prize = prizeLineFor(input.drawing, input.version);
  const subject = c.subject(input.winner.name);
  const deadline = formatCentral(input.claimDeadline);
  const where = [input.winner.city, input.winner.zip].filter(Boolean).join(" ");
  const rows = [
    section(`<div style="font-family:${SANS};font-size:13px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:${C.alert};line-height:1.6;">${esc(c.heading)}</div>`, "14px 20px 0"),
    section(
      `<div class="hbc-name" style="font-family:${SANS};font-size:24px;font-weight:700;color:${C.navy};line-height:1.2;">${esc(input.winner.name)}</div><div class="hbc-text" style="font-family:${SANS};font-size:15px;color:${C.ink};line-height:1.4;padding-top:3px;"><a href="mailto:${esc(input.winner.email)}" style="color:${C.ink};text-decoration:none;">${esc(input.winner.email)}</a> <span style="color:${C.slate};">&middot;</span> ${esc(where)}</div>${p(c.body)}`,
      "8px 20px 0"
    ),
    section(factGrid([[EMAILS.staffWinnerAlert.prize, esc(prize.name)], [EMAILS.staffWinnerAlert.callBy, `<b>${esc(deadline)}</b>`]]), "12px 20px 0"),
    section(buttons([[c.button, input.adminUrl]]), "4px 20px 0"),
    gap(14),
    footer([`Sent ${esc(formatCentral(input.now))}`]),
  ];
  return {
    subject,
    preheader: `${input.winner.name} · ${deadline}`,
    html: page({ title: subject, preheader: `${input.winner.name} · ${deadline}`, rows }),
    text: textOf([c.heading.toUpperCase(), "", input.winner.name, `${input.winner.email} · ${where}`, c.body, "", `${EMAILS.staffWinnerAlert.prize}: ${prize.name}`, `${EMAILS.staffWinnerAlert.callBy}: ${deadline}`, "", `${c.button}: ${input.adminUrl}`, `Sent ${formatCentral(input.now)}`]),
  };
}
