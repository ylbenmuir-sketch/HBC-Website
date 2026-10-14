/**
 * Every email the site sends, in one design (Ben, 2026-10-14): the staff
 * notification, the page-two update, the visitor's confirmation and the guide
 * download notification. Each builder returns the HTML and a plain-text
 * version of the same content; ../lead-notification.ts sends them.
 *
 * ## Built for Gmail and Apple Mail
 *
 * Tables for layout and inline styles on every element — Gmail drops <style>
 * on many clients and ignores flex and grid everywhere. One <style> block
 * remains, for Apple Mail and iOS Mail's dark mode only (`color-scheme`
 * plus a prefers-color-scheme override); clients that strip it keep the
 * light design, and Gmail's own dark-mode inversion reads solid fills and
 * plain text well. No images: the wordmark is text, so nothing is blocked
 * and nothing needs hosting. System fonts, Georgia for the wordmark.
 *
 * ## One phone screen
 *
 * A typical lead fits 390×844 without scrolling: compact spacing, labels in
 * small caps, two-column facts, no explanatory paragraphs.
 * scripts/render-email-previews.mjs renders every message with realistic
 * data, screenshots it at 390 and 640 wide, and measures it.
 *
 * Pure: no environment reads, no network, `now` passed in.
 */

import {
  displayPhone,
  escapeHtml as esc,
  formatCentral,
  telHref,
} from "./format";

/* ------------------------------------------------------------------ */
/* Brand                                                               */
/* ------------------------------------------------------------------ */

/** The site's tokens (app/globals.css :root). */
const C = {
  navy: "#1c2b3a",
  ink: "#243240",
  slate: "#5d6873",
  ivory: "#fbf8f1",
  ivory2: "#f4eee1",
  line: "#e6dfd0",
  sageSoft: "#e6ebe2",
  sageDeep: "#596e5b",
  gold: "#a9853f",
  goldInk: "#7a5d24",
  white: "#ffffff",
  alert: "#9a3b2e",
};

const SANS =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";

/** The four center badges (and the two others), by what the badge says. */
export type BadgeKind =
  | "Nashville"
  | "Murfreesboro"
  | "Concierge"
  | "Not sure"
  | "via chat"
  | "Guide download"
  | "Details added";

const BADGE: Record<BadgeKind, { bg: string; fg: string }> = {
  Nashville: { bg: C.navy, fg: C.white },
  Murfreesboro: { bg: C.sageDeep, fg: C.white },
  Concierge: { bg: C.goldInk, fg: C.white },
  "Not sure": { bg: "#e4e1d9", fg: C.ink },
  "via chat": { bg: C.ivory2, fg: C.goldInk },
  "Guide download": { bg: C.sageSoft, fg: C.sageDeep },
  "Details added": { bg: C.sageSoft, fg: C.sageDeep },
};

/**
 * The badge for a lead's center. `route` is lib/lead-routing.ts's rule, so
 * the badge and the inbox can never disagree: "Concierge / at home" and the
 * chat's "Concierge" are both Concierge; anything unrouted is "Not sure".
 */
export function centerBadge(route: string): BadgeKind {
  if (route === "nashville") return "Nashville";
  if (route === "murfreesboro") return "Murfreesboro";
  if (route === "concierge") return "Concierge";
  return "Not sure";
}

/* ------------------------------------------------------------------ */
/* Pieces                                                              */
/* ------------------------------------------------------------------ */

function badge(kind: BadgeKind): string {
  const { bg, fg } = BADGE[kind];
  const slug = kind.toLowerCase().replace(/[^a-z]+/g, "-");
  return `<span class="hbc-badge hbc-b-${slug}" style="display:inline-block;background:${bg};color:${fg};font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;line-height:1;padding:5px 8px;border-radius:4px;margin:0 0 0 6px;vertical-align:2px;">${esc(kind)}</span>`;
}

/** A bulletproof button: a table cell carries the fill, so it renders even
 *  where padding on <a> does not. `quiet` is the outlined footer style. */
function button(label: string, href: string, { quiet = false } = {}): string {
  const bg = quiet ? C.white : C.navy;
  const fg = quiet ? C.navy : C.white;
  const border = quiet ? `1px solid ${C.line}` : `1px solid ${C.navy}`;
  return `<td class="${quiet ? "hbc-btn-quiet" : "hbc-btn"}" style="background:${bg};border:${border};border-radius:6px;" bgcolor="${bg}"><a href="${esc(href)}" style="display:inline-block;padding:${quiet ? "7px 12px" : "10px 22px"};font-family:${SANS};font-size:${quiet ? 13 : 15}px;font-weight:600;color:${fg};text-decoration:none;line-height:1.2;">${esc(label)}</a></td>`;
}

function buttons(list: Array<[string, string]>, opts: { quiet?: boolean } = {}): string {
  if (list.length === 0) return "";
  const cells = list
    .map(([label, href], i) => `${i > 0 ? `<td style="width:8px;font-size:0;">&nbsp;</td>` : ""}${button(label, href, opts)}`)
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate;"><tr>${cells}</tr></table>`;
}

/** Small caps label over a value. */
function fact(label: string, valueHtml: string): string {
  return `<td class="hbc-fact" valign="top" width="50%" style="padding:0 8px 10px 0;width:50%;"><div style="font-family:${SANS};font-size:11px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;color:${C.slate};line-height:1.3;">${esc(label)}</div><div class="hbc-text" style="font-family:${SANS};font-size:15px;color:${C.ink};line-height:1.35;padding-top:2px;">${valueHtml}</div></td>`;
}

/** Two columns of facts, two to a row. */
function factGrid(items: Array<[string, string]>): string {
  const rows: string[] = [];
  for (let i = 0; i < items.length; i += 2) {
    const [a, b] = [items[i], items[i + 1]];
    rows.push(`<tr>${fact(a[0], a[1])}${b ? fact(b[0], b[1]) : `<td width="50%" style="width:50%;"></td>`}</tr>`);
  }
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rows.join("")}</table>`;
}

/** The "What they told us" panel: label: value lines, the note as a quote. */
function toldUs(title: string, details: Details): string {
  const lines: string[] = [];
  const row = (label: string, value: string) =>
    lines.push(`<div style="font-family:${SANS};font-size:14px;line-height:1.45;color:${C.ink};padding:2px 0;" class="hbc-text"><span class="hbc-muted" style="color:${C.slate};">${esc(label)}</span> ${value}</div>`);
  if (details.helpingWho) row("For:", esc(details.helpingWho));
  if (details.concerns.length) row("Concerns:", esc(details.concerns.join(", ")));
  if (details.note) {
    lines.push(`<div class="hbc-text" style="font-family:${SANS};font-size:14px;line-height:1.45;color:${C.ink};padding:4px 0 2px;"><span class="hbc-muted" style="color:${C.slate};">In their own words:</span><br>&ldquo;${esc(details.note).replace(/\n/g, "<br>")}&rdquo;</div>`);
  }
  if (details.referredBy) row("Referred by:", esc(details.referredBy));
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:4px;"><tr><td class="hbc-panel" style="background:${C.ivory};border:1px solid ${C.line};border-radius:6px;padding:10px 12px;" bgcolor="${C.ivory}"><div class="hbc-panel-title" style="font-family:${SANS};font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${C.sageDeep};padding-bottom:4px;">${esc(title)}</div>${lines.join("")}</td></tr></table>`;
}

function hasDetails(d: Details): boolean {
  return Boolean(d.helpingWho || d.concerns.length || d.note || d.referredBy);
}

/** A row of the card. */
function section(inner: string, padding = "14px 20px 0"): string {
  return `<tr><td style="padding:${padding};">${inner}</td></tr>`;
}

/** The gray footer: an optional quiet button, then small lines. */
function footer(lines: string[], action?: [string, string]): string {
  const body = lines
    .filter(Boolean)
    .map((l) => `<div style="font-family:${SANS};font-size:12px;line-height:1.5;color:${C.slate};">${l}</div>`)
    .join("");
  return `<tr><td class="hbc-foot" style="padding:12px 20px 14px;background:${C.ivory};border-top:1px solid ${C.line};border-radius:0 0 8px 8px;" bgcolor="${C.ivory}">${action ? `<div style="padding-bottom:8px;">${buttons([action], { quiet: true })}</div>` : ""}${body}</td></tr>`;
}

/**
 * The page around the card: wordmark, the card's rows, the hidden preheader
 * (the inbox's preview line), and the dark-mode overrides for Apple Mail.
 */
function page({ title, preheader, rows }: { title: string; preheader: string; rows: string[] }): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<title>${esc(title)}</title>
<style>
  :root { color-scheme: light dark; supported-color-schemes: light dark; }
  @media (prefers-color-scheme: dark) {
    .hbc-bg { background: #11181f !important; }
    .hbc-card { background: #1a232c !important; border-color: #2c3843 !important; }
    .hbc-head { border-color: #2c3843 !important; }
    .hbc-word, .hbc-name, .hbc-text, .hbc-text a { color: #f1ece2 !important; }
    .hbc-sub { color: #d2b77c !important; }
    .hbc-muted, .hbc-fact div:first-child { color: #a9b2ba !important; }
    .hbc-panel, .hbc-foot { background: #212c36 !important; border-color: #2c3843 !important; }
    .hbc-btn { background: #f1ece2 !important; border-color: #f1ece2 !important; }
    .hbc-btn a { color: #1c2b3a !important; }
    .hbc-btn-quiet { background: #1a232c !important; border-color: #3a4753 !important; }
    .hbc-btn-quiet a { color: #f1ece2 !important; }
    .hbc-b-nashville { background: #3d5670 !important; color: #ffffff !important; }
    .hbc-b-murfreesboro { background: #4f6a52 !important; color: #ffffff !important; }
    .hbc-b-concierge { background: #8a6a2f !important; color: #ffffff !important; }
    .hbc-b-not-sure { background: #3a4550 !important; color: #f1ece2 !important; }
    .hbc-b-via-chat, .hbc-b-guide-download, .hbc-b-details-added { background: #2c3843 !important; color: #e3cf9f !important; }
    .hbc-yes, .hbc-panel-title { color: #a7c9a8 !important; }
    .hbc-foot div { color: #a9b2ba !important; }
    .hbc-no { color: #f2a99d !important; }
  }
</style>
</head>
<body class="hbc-bg" style="margin:0;padding:0;background:${C.ivory2};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${esc(preheader)}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" class="hbc-bg" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.ivory2};" bgcolor="${C.ivory2}">
<tr><td align="center" style="padding:12px 10px;">
<table role="presentation" class="hbc-card" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:${C.white};border:1px solid ${C.line};border-radius:8px;" bgcolor="${C.white}">
<tr><td class="hbc-head" style="padding:12px 20px 10px;border-bottom:1px solid ${C.line};">
<span class="hbc-word" style="font-family:${SERIF};font-size:19px;color:${C.navy};line-height:1;">Harmonized</span>
<span class="hbc-sub" style="font-family:${SANS};font-size:10px;font-weight:600;letter-spacing:0.22em;color:${C.gold};line-height:1;padding-left:4px;">BRAIN CENTERS</span>
</td></tr>
${rows.join("\n")}
</table>
</td></tr>
</table>
</body>
</html>`;
}

/** Plain-text twin: lines, blank lines collapsed, trailing space trimmed. */
function textOf(lines: Array<string | null | false | undefined>): string {
  return lines
    .filter((l): l is string => typeof l === "string")
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function textLabel(label: string, value: string): string {
  return `${label.padEnd(13)}${value}`;
}

/* ------------------------------------------------------------------ */
/* Shared inputs                                                       */
/* ------------------------------------------------------------------ */

/** What the form's page two (or the chat) told us. */
export type Details = {
  helpingWho: string | null;
  concerns: string[];
  note: string | null;
  referredBy: string | null;
};

export type Rendered = { html: string; text: string };

/** Where the saved row lives, for the footer's button. */
export type SavedLink = { rowId: string; url: string } | null;

const ROUTED = (envVar: string | null, route: string) =>
  `Routed by ${envVar ?? "nothing set"} (rule: ${route})`;

/** The rescue copy's top line: the row did not save; this email is the lead. */
function notSavedBanner(): string {
  return section(
    `<div style="background:#fbecea;border:1px solid #e9c3bd;border-radius:6px;padding:8px 10px;font-family:${SANS};font-size:13px;line-height:1.4;color:${C.alert};"><b>NOT SAVED</b> — this email is the only copy of this lead. They were shown an error and asked to call; please reach out either way.</div>`,
    "12px 20px 0"
  );
}
const NOT_SAVED_TEXT =
  "!! NOT SAVED — this email is the only copy of this lead. They were shown an error and asked to call; please reach out either way.";

/** The name block: big name, the number and address, then the buttons. */
function personBlock(p: { name: string; phone: string | null; email: string | null }): string {
  const contact = [
    p.phone ? `<a href="${esc(telHref(p.phone))}" style="color:${C.ink};text-decoration:none;">${esc(displayPhone(p.phone))}</a>` : null,
    p.email ? `<a href="mailto:${esc(p.email)}" style="color:${C.ink};text-decoration:none;">${esc(p.email)}</a>` : null,
  ].filter(Boolean);
  const actions: Array<[string, string]> = [];
  if (p.phone) actions.push(["Call", telHref(p.phone)]);
  if (p.email) actions.push(["Reply", `mailto:${p.email}`]);
  return `<div class="hbc-name" style="font-family:${SANS};font-size:24px;font-weight:700;color:${C.navy};line-height:1.2;">${esc(p.name)}</div>${
    contact.length ? `<div class="hbc-text" style="font-family:${SANS};font-size:15px;color:${C.ink};line-height:1.4;padding-top:3px;">${contact.join(` <span style="color:${C.slate};">&middot;</span> `)}</div>` : ""
  }${actions.length ? `<div style="padding-top:10px;">${buttons(actions)}</div>` : ""}`;
}

function heading(label: string, badges: BadgeKind[]): string {
  return `<div style="font-family:${SANS};font-size:13px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;color:${C.slate};line-height:1.6;" class="hbc-muted">${esc(label)}${badges.map(badge).join("")}</div>`;
}

/* ------------------------------------------------------------------ */
/* 1. Staff notification                                               */
/* ------------------------------------------------------------------ */

export type StaffLead = {
  source: "form" | "chat";
  intent: "book" | "more_info";
  name: string;
  phone: string | null;
  email: string | null;
  /** As stored ("Concierge / at home", "Not sure yet"…) — shown in the grid. */
  preferredCenter: string | null;
  bestTime: string | null;
  smsConsent: boolean;
  sourcePage: string | null;
  details: Details;
  honeypotFilled: boolean;
};

export function staffNotification(input: {
  lead: StaffLead;
  route: string;
  envVar: string | null;
  saved: SavedLink;
  now: Date;
}): Rendered {
  const { lead, route, envVar, saved, now } = input;
  const center = centerBadge(route);
  const title = lead.intent === "more_info" ? "New information request" : "New call request";
  const badges: BadgeKind[] = [center, ...(lead.source === "chat" ? (["via chat"] as BadgeKind[]) : [])];
  const textsOk = lead.smsConsent ? "Yes" : "No — call or email only";
  const centerShown = lead.preferredCenter?.trim() || "Not given";
  const bestTime = lead.bestTime?.trim() || "Not given";
  const cameFrom = lead.sourcePage?.trim() || "Not recorded";

  const rows = [
    saved ? null : notSavedBanner(),
    section(heading(title, badges), "14px 20px 0"),
    lead.honeypotFilled
      ? section(`<div style="font-family:${SANS};font-size:12px;color:${C.alert};">Spam check: the hidden field was filled in — probably a bot.</div>`, "4px 20px 0")
      : null,
    section(personBlock(lead), "8px 20px 0"),
    section(
      factGrid([
        ["Center", esc(centerShown)],
        ["Best time", esc(bestTime)],
        ["Texts OK?", `<b class="${lead.smsConsent ? "hbc-yes" : "hbc-no"}" style="color:${lead.smsConsent ? C.sageDeep : C.alert};">${esc(lead.smsConsent ? "Yes" : "No")}</b>`],
        ["Came from", esc(cameFrom)],
      ]),
      "14px 20px 0"
    ),
    hasDetails(lead.details) ? section(toldUs("What they told us", lead.details), "2px 20px 0") : null,
    `<tr><td style="height:14px;font-size:0;line-height:0;">&nbsp;</td></tr>`,
    footer(
      [
        `Received ${esc(formatCentral(now))}`,
        esc(ROUTED(envVar, route)),
        saved ? `Request ${esc(saved.rowId)}` : "",
      ],
      saved ? ["Open saved request", saved.url] : undefined
    ),
  ].filter((r): r is string => Boolean(r));

  const d = lead.details;
  const text = textOf([
    saved ? null : NOT_SAVED_TEXT,
    saved ? null : "",
    `${title.toUpperCase()} · ${badges.join(" · ")}`,
    lead.honeypotFilled ? "Spam check: the hidden field was filled in — probably a bot." : null,
    "",
    lead.name,
    [lead.phone ? displayPhone(lead.phone) : null, lead.email].filter(Boolean).join(" · ") || null,
    "",
    textLabel("Center:", centerShown),
    textLabel("Best time:", bestTime),
    textLabel("Texts OK?:", textsOk),
    textLabel("Came from:", cameFrom),
    hasDetails(d) ? "" : null,
    hasDetails(d) ? "What they told us" : null,
    d.helpingWho ? textLabel("For:", d.helpingWho) : null,
    d.concerns.length ? textLabel("Concerns:", d.concerns.join(", ")) : null,
    d.note ? `In their own words:\n${d.note}` : null,
    d.referredBy ? textLabel("Referred by:", d.referredBy) : null,
    "",
    saved ? `Saved request: ${saved.rowId}\n${saved.url}` : null,
    `Received ${formatCentral(now)}`,
    ROUTED(envVar, route),
  ]);

  return {
    html: page({ title, preheader: `${lead.name} · ${center}${lead.source === "chat" ? " · via chat" : ""}`, rows }),
    text,
  };
}

/* ------------------------------------------------------------------ */
/* 2. Page-two update                                                  */
/* ------------------------------------------------------------------ */

export function detailsUpdate(input: {
  lead: StaffLead;
  route: string;
  envVar: string | null;
  saved: SavedLink;
  now: Date;
  /** The original notification went out. When it did not, this email is
   *  the only one the office has, so it carries the whole lead too. */
  originalSent: boolean;
}): Rendered {
  const { lead, route, envVar, saved, now, originalSent } = input;
  const center = centerBadge(route);
  const d = lead.details;
  const rows = [
    section(heading("Details added", [center]), "14px 20px 0"),
    section(
      originalSent
        ? `<div class="hbc-name" style="font-family:${SANS};font-size:20px;font-weight:700;color:${C.navy};line-height:1.25;">${esc(lead.name)}</div><div class="hbc-muted" style="font-family:${SANS};font-size:13px;color:${C.slate};padding-top:2px;">Added to the call request above, from the contact form&rsquo;s second page.</div>`
        : personBlock(lead),
      "8px 20px 0"
    ),
    originalSent
      ? null
      : section(
          factGrid([
            ["Center", esc(lead.preferredCenter?.trim() || "Not given")],
            ["Best time", esc(lead.bestTime?.trim() || "Not given")],
            ["Texts OK?", `<b class="${lead.smsConsent ? "hbc-yes" : "hbc-no"}" style="color:${lead.smsConsent ? C.sageDeep : C.alert};">${lead.smsConsent ? "Yes" : "No"}</b>`],
            ["Came from", esc(lead.sourcePage?.trim() || "Not recorded")],
          ]),
          "14px 20px 0"
        ),
    section(toldUs("What they told us", d), "12px 20px 0"),
    `<tr><td style="height:14px;font-size:0;line-height:0;">&nbsp;</td></tr>`,
    footer(
      [
        `Received ${esc(formatCentral(now))}`,
        esc(ROUTED(envVar, route)),
        originalSent ? "" : "The first notification for this lead did not send — this is the only email.",
        saved ? `Request ${esc(saved.rowId)}` : "",
      ],
      saved ? ["Open saved request", saved.url] : undefined
    ),
  ].filter((r): r is string => Boolean(r));

  const text = textOf([
    `DETAILS ADDED · ${center}`,
    "",
    lead.name,
    originalSent ? "Added to the call request above, from the contact form's second page." : [lead.phone ? displayPhone(lead.phone) : null, lead.email].filter(Boolean).join(" · "),
    originalSent ? null : "",
    originalSent ? null : textLabel("Center:", lead.preferredCenter?.trim() || "Not given"),
    originalSent ? null : textLabel("Best time:", lead.bestTime?.trim() || "Not given"),
    originalSent ? null : textLabel("Texts OK?:", lead.smsConsent ? "Yes" : "No — call or email only"),
    originalSent ? null : textLabel("Came from:", lead.sourcePage?.trim() || "Not recorded"),
    "",
    "What they told us",
    d.helpingWho ? textLabel("For:", d.helpingWho) : null,
    d.concerns.length ? textLabel("Concerns:", d.concerns.join(", ")) : null,
    d.note ? `In their own words:\n${d.note}` : null,
    d.referredBy ? textLabel("Referred by:", d.referredBy) : null,
    "",
    saved ? `Saved request: ${saved.rowId}\n${saved.url}` : null,
    `Received ${formatCentral(now)}`,
    ROUTED(envVar, route),
    originalSent ? null : "The first notification for this lead did not send — this is the only email.",
  ]);

  return { html: page({ title: "Details added", preheader: `${lead.name} added details`, rows }), text };
}

/* ------------------------------------------------------------------ */
/* 3. Visitor confirmation                                             */
/* ------------------------------------------------------------------ */

export const VISITOR_SUBJECT = "We got your request — Harmonized Brain Centers";

/** "Someone from our Nashville center will call you soon." — or "our team"
 *  for Concierge and Not sure. The same sentence the chat closes with. */
export function callSoonLine(route: string): string {
  const c = centerBadge(route);
  return c === "Nashville" || c === "Murfreesboro"
    ? `Someone from our ${c} center will call you soon.`
    : "Someone from our team will call you soon.";
}

export function visitorConfirmation(input: {
  firstName: string;
  route: string;
  /** The center's own line; Nashville's for Concierge and Not sure. */
  centerPhone: { label: string; display: string; tel: string };
  video: { title: string; url: string; duration: string | null };
  /** "Harmonized Brain Centers · 197 Thompson Ln, Suite S, Nashville, TN 37211" */
  identityLine: string;
  siteUrl: string;
}): Rendered {
  const { firstName, route, centerPhone, video, identityLine, siteUrl } = input;
  const greet = firstName ? `Thanks, ${firstName}.` : "Thanks.";
  const line = callSoonLine(route);
  const rows = [
    section(
      `<div class="hbc-name" style="font-family:${SANS};font-size:22px;font-weight:700;color:${C.navy};line-height:1.25;">${esc(greet)}</div><div class="hbc-text" style="font-family:${SANS};font-size:16px;color:${C.ink};line-height:1.45;padding-top:6px;">${esc(line)}</div>`,
      "18px 20px 0"
    ),
    section(
      `<div class="hbc-muted" style="font-family:${SANS};font-size:14px;color:${C.slate};line-height:1.45;padding-bottom:8px;">Want to talk now?</div>${buttons([[`Call ${centerPhone.label} ${centerPhone.display}`, centerPhone.tel]])}`,
      "14px 20px 0"
    ),
    section(
      `<div class="hbc-text" style="font-family:${SANS};font-size:15px;color:${C.ink};line-height:1.45;">While you wait: <a href="${esc(video.url)}" style="color:${C.sageDeep};font-weight:600;">Watch &ldquo;${esc(video.title)}&rdquo;</a>${video.duration ? ` <span class="hbc-muted" style="color:${C.slate};">(${esc(video.duration)})</span>` : ""}</div><div class="hbc-muted" style="font-family:${SANS};font-size:14px;color:${C.slate};line-height:1.45;padding-top:6px;">Questions before we call? Just reply to this email.</div>`,
      "16px 20px 0"
    ),
    `<tr><td style="height:16px;font-size:0;line-height:0;">&nbsp;</td></tr>`,
    footer([
      esc(identityLine),
      `You&rsquo;re getting this because you asked us to call you at <a href="${esc(siteUrl)}" style="color:${C.slate};">${esc(siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, ""))}</a>. Free call, no obligation.`,
    ]),
  ];
  const text = textOf([
    greet,
    line,
    "",
    `Want to talk now? Call ${centerPhone.label}: ${centerPhone.display}`,
    "",
    `While you wait: "${video.title}"${video.duration ? ` (${video.duration})` : ""}`,
    video.url,
    "",
    "Questions before we call? Just reply to this email.",
    "",
    identityLine,
    `You're getting this because you asked us to call you at ${siteUrl.replace(/\/$/, "")}. Free call, no obligation.`,
  ]);
  return { html: page({ title: VISITOR_SUBJECT, preheader: line, rows }), text };
}

/* ------------------------------------------------------------------ */
/* 4. Guide download notification                                      */
/* ------------------------------------------------------------------ */

export function guideNotification(input: {
  email: string;
  guideTitle: string;
  sourcePage: string | null;
  envVar: string | null;
  route: string;
  saved: SavedLink;
  now: Date;
}): Rendered {
  const { email, guideTitle, sourcePage, envVar, route, saved, now } = input;
  const pageShown = sourcePage?.trim() || "Not recorded";
  const rows = [
    saved ? null : notSavedBanner(),
    section(heading("Guide download", ["Guide download"]), "14px 20px 0"),
    section(
      `<div class="hbc-name" style="font-family:${SANS};font-size:20px;font-weight:700;line-height:1.25;"><a href="mailto:${esc(email)}" style="color:${C.navy};text-decoration:none;">${esc(email)}</a></div><div class="hbc-muted" style="font-family:${SANS};font-size:13px;color:${C.slate};padding-top:3px;">A download, not a call request — nobody is expecting a call.</div>`,
      "8px 20px 0"
    ),
    section(
      factGrid([
        ["Guide", esc(guideTitle)],
        ["Came from", esc(pageShown)],
      ]),
      "14px 20px 0"
    ),
    `<tr><td style="height:4px;font-size:0;line-height:0;">&nbsp;</td></tr>`,
    footer(
      [`Received ${esc(formatCentral(now))}`, esc(ROUTED(envVar, route)), saved ? `Request ${esc(saved.rowId)}` : ""],
      saved ? ["Open saved request", saved.url] : undefined
    ),
  ].filter((r): r is string => Boolean(r));
  const text = textOf([
    saved ? null : NOT_SAVED_TEXT,
    saved ? null : "",
    "GUIDE DOWNLOAD",
    "",
    email,
    "A download, not a call request — nobody is expecting a call.",
    "",
    textLabel("Guide:", guideTitle),
    textLabel("Came from:", pageShown),
    "",
    saved ? `Saved request: ${saved.rowId}\n${saved.url}` : null,
    `Received ${formatCentral(now)}`,
    ROUTED(envVar, route),
  ]);
  return { html: page({ title: "Guide download", preheader: `${email} downloaded ${guideTitle}`, rows }), text };
}
