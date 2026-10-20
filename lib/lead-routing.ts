// Lead routing — which inbox a lead goes to, who is copied, what the subject
// says, and which address it comes from. The ONE place these rules live
// (Ben, 2026-10-14). lib/lead-notification.ts sends; this decides.
//
// ── THE RULES ──────────────────────────────────────────────────────────────
// First match wins:
//
//   guide download                              → LEADS_GUIDE
//   "more information" (not ready to book)      → LEADS_MORE_INFO
//   ready to book, Concierge / at home          → LEADS_CONCIERGE
//   ready to book, Nashville                    → LEADS_NASHVILLE
//   ready to book, Murfreesboro                 → LEADS_MURFREESBORO
//   anything else — Franklin, "Not sure yet",
//   no center, a center typed that matches none → LEADS_FALLBACK
//
// Form and chat assistant leads follow the same center rules (Ben,
// 2026-10-14; chat leads all went to LEADS_FALLBACK before that). The row
// keeps source = chat, and the subject says "(via chat)".
//
// Each variable holds a comma-separated list: the FIRST address is the To,
// the rest are CC.
//
// ── NOTHING IS EVER UNROUTED ───────────────────────────────────────────────
// A route whose variable is missing or empty uses LEADS_FALLBACK; a missing
// LEADS_FALLBACK uses LEADS_NOTIFY_EMAIL (the single inbox from before these
// rules). Every step down logs a warning naming the variable that was
// missing, every time — a fallback that fires quietly is a misrouted lead
// nobody notices. Only when all three are empty is there nobody to send to,
// and that is logged as an error by the sender.
//
// No address is written in code. Recipients come only from the environment
// (Vercel → Settings → Environment Variables); the sender's DOMAIN is fixed
// because it is the one verified in Resend, and LEADS_NOTIFY_FROM may name
// the mailbox on it.
//
// Deliberately import-free so lib/lead-routing.test.mjs can run it under
// plain `node --test` (Node strips the types) with no test framework.

export type RouteName =
  | "guide"
  | "more_info"
  | "concierge"
  | "nashville"
  | "murfreesboro"
  | "fallback";

/** The variable each route reads. */
export const ROUTE_ENV: Record<RouteName, string> = {
  guide: "LEADS_GUIDE",
  more_info: "LEADS_MORE_INFO",
  concierge: "LEADS_CONCIERGE",
  nashville: "LEADS_NASHVILLE",
  murfreesboro: "LEADS_MURFREESBORO",
  fallback: "LEADS_FALLBACK",
};

/** The last resort: the one inbox every lead went to before routing. */
export const LEGACY_ENV = "LEADS_NOTIFY_EMAIL";

/** The domain verified in Resend. Every notification is sent from it. */
export const SENDING_DOMAIN = "harmonizedbraincenterstn.com";

/** Where a lead came from: the form, the chat, or the form with a 10-year
 *  giveaway offer code (GIVEAWAY-PLAN.md §4; the subject says so). */
export type LeadSource = "form" | "chat" | "giveaway";

export type LeadForRouting = {
  type: "consultation" | "guide";
  source: LeadSource;
  /** "book" unless a form says the visitor is not ready to book. */
  intent?: "book" | "more_info" | null;
  /** As submitted: "Nashville", "Concierge / at home", "Not sure yet", a
   *  center typed into the chat, or null. */
  preferredCenter: string | null;
};

/** Which rule a lead falls under. Pure — reads no environment. */
export function routeFor(lead: LeadForRouting): RouteName {
  if (lead.type === "guide") return "guide";
  if (lead.intent === "more_info") return "more_info";
  const center = lead.preferredCenter ?? "";
  // "at home" / "in home" too: the chat keeps a center it doesn't recognise
  // in the visitor's own words (lib/chat/booking.ts → resolveCenter).
  if (/concierge|\b(at|in)[- ]home\b/i.test(center)) return "concierge";
  if (/nashville/i.test(center)) return "nashville";
  if (/murfreesboro/i.test(center)) return "murfreesboro";
  return "fallback";
}

/** Loose on purpose — catches a typo'd entry, not RFC 5322. */
const ADDRESS = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;

/** "a@x.com, b@y.com" → ["a@x.com", "b@y.com"]. Semicolons tolerated, since
 *  the value is typed by hand into a dashboard; entries that are not an
 *  address are dropped, and so are repeats. */
export function parseAddressList(value: string | undefined): {
  addresses: string[];
  ignored: number;
} {
  const entries = (value ?? "")
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const addresses: string[] = [];
  for (const entry of entries) {
    if (!ADDRESS.test(entry)) continue;
    if (!addresses.some((a) => a.toLowerCase() === entry.toLowerCase())) addresses.push(entry);
  }
  return { addresses, ignored: entries.filter((e) => !ADDRESS.test(e)).length };
}

export type Recipients = {
  route: RouteName;
  /** The variable the addresses actually came from — the route's own, or a
   *  fallback. Null when every variable in the chain was empty. */
  envVar: string | null;
  to: string | null;
  cc: string[];
  /** One line per step down the chain, already logged. */
  warnings: string[];
};

type Env = Record<string, string | undefined>;
type Warn = (message: string) => void;

/**
 * The To and CC for a route, following the fallback chain. `env` and `warn`
 * are injectable for the unit test; in the app they are process.env and
 * console.warn.
 */
export function recipientsFor(
  route: RouteName,
  env: Env = process.env,
  warn: Warn = console.warn
): Recipients {
  const chain = [ROUTE_ENV[route]];
  if (route !== "fallback") chain.push(ROUTE_ENV.fallback);
  chain.push(LEGACY_ENV);

  const warnings: string[] = [];
  for (let i = 0; i < chain.length; i++) {
    const name = chain[i];
    const { addresses, ignored } = parseAddressList(env[name]);
    if (ignored > 0) {
      const line = `[lead-routing] ${name}: ${ignored} entr${ignored === 1 ? "y is" : "ies are"} not an email address and ${ignored === 1 ? "was" : "were"} skipped.`;
      warnings.push(line);
      warn(line);
    }
    if (addresses.length > 0) {
      return { route, envVar: name, to: addresses[0], cc: addresses.slice(1), warnings };
    }
    const next = chain[i + 1];
    const line = next
      ? `[lead-routing] ${name} is not set (route "${route}") — using ${next}.`
      : `[lead-routing] ${name} is not set (route "${route}") — no fallback left.`;
    warnings.push(line);
    warn(line);
  }
  return { route, envVar: null, to: null, cc: [], warnings };
}

/** routeFor + recipientsFor. */
export function routeLead(
  lead: LeadForRouting,
  env: Env = process.env,
  warn: Warn = console.warn
): Recipients {
  return recipientsFor(routeFor(lead), env, warn);
}

/* ------------------------------------------------------------------ */
/* Subject and sender                                                  */
/* ------------------------------------------------------------------ */

/** What the subject calls each form. */
const FORM_LABEL: Record<RouteName, string> = {
  guide: "guide download",
  more_info: "more-information request",
  concierge: "free call request",
  nashville: "free call request",
  murfreesboro: "free call request",
  fallback: "free call request",
};

/**
 * "New free call request — Nashville — Jane Doe" ("free call request (via
 * chat)" for the assistant). The form, the center, the person, so the inbox
 * can be triaged without opening anything. A name that
 * starts with "TEST" (case as typed) puts "TEST — " in front, so a test
 * submission can never be mistaken for a parent. A guide signup has no name
 * or center; its address stands in for the name.
 */
export function notificationSubject(input: {
  route: RouteName;
  source: LeadSource;
  preferredCenter: string | null;
  name: string | null;
  email: string | null;
}): string {
  const form =
    input.source === "chat" && input.route !== "guide"
      ? `${FORM_LABEL[input.route]} (via chat)`
      : input.source === "giveaway" && input.route !== "guide"
        ? `${FORM_LABEL[input.route]} (10 years)`
        : FORM_LABEL[input.route];
  const center =
    input.route === "guide" ? "No center" : input.preferredCenter?.trim() || "No center chosen";
  const who = input.name?.trim() || input.email?.trim() || "No name given";
  const subject = `New ${form} — ${center} — ${who}`;
  // Collapse whitespace: a newline in a subject is a header-injection vector,
  // and the name is typed by the visitor.
  const flat = (who.startsWith("TEST") ? `TEST — ${subject}` : subject)
    .replace(/\s+/g, " ")
    .trim();
  return flat.slice(0, 150);
}

/** The display name on every email (Ben, 2026-10-14). Same string as
 *  FROM_NAME in lib/email/format.ts — repeated, not imported, because this
 *  file stays import-free for its unit test. */
const FROM_NAME = "Harmonized Brain Centers";

/**
 * The From header: always `Harmonized Brain Centers <address>`. The address
 * is LEADS_NOTIFY_FROM's when it is on SENDING_DOMAIN — set either bare or as
 * "Some Name <box@domain>"; only the address is used, so the display name is
 * never doubled ("Harmonized Brain Centers <Harmonized Brain Centers <…>>")
 * and never something else. Otherwise leads@SENDING_DOMAIN. Anything on
 * another domain — Resend's shared resend.dev sender included — is refused
 * with a warning, because Resend only delivers for the verified domain and a
 * lead email that bounces is a lost lead.
 */
export function senderAddress(env: Env = process.env, warn: Warn = console.warn): string {
  const fallback = `${FROM_NAME} <leads@${SENDING_DOMAIN}>`;
  const configured = env.LEADS_NOTIFY_FROM?.trim();
  if (!configured) return fallback;
  const address = (/<([^>]+)>\s*$/.exec(configured)?.[1] ?? configured).trim();
  const domain = address.split("@")[1]?.trim().toLowerCase();
  if (ADDRESS.test(address) && domain === SENDING_DOMAIN) return `${FROM_NAME} <${address}>`;
  warn(
    `[lead-routing] LEADS_NOTIFY_FROM is not an address on ${SENDING_DOMAIN} — ignored; sending from leads@${SENDING_DOMAIN}.`
  );
  return fallback;
}
