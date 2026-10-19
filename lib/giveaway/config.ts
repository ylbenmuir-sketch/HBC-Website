/**
 * The 10-year giveaway's one source of truth for TIME, PRIZES, RATES and
 * RULES (GIVEAWAY-PLAN.md §1, §3, §4; Ben's decisions 4, 5, 8, 15–20).
 *
 * Every timestamp is a UTC instant with its Central label beside it. The
 * whole window is CST (UTC−6: US daylight saving ends Sun Nov 1, 2026), so
 * noon CT = 18:00 UTC, 4 pm = 22:00, 5 pm = 23:00, 6 pm = 00:00 next day.
 * lib/giveaway/config.test.mjs formats every instant in America/Chicago and
 * fails if the label beside it is wrong.
 *
 * The migration seed for giveaway_prizes and giveaway_drawings is generated
 * from this file (lib/giveaway/seed-sql.ts); the test fails if
 * supabase/migrations/0010_giveaway.sql drifts from it. The page, the
 * emails, the drawing engine and assistantSuppressedOn() all read from here,
 * so a time or a prize can only be wrong in one place.
 *
 * Pure: no environment reads, no imports from the rest of the site.
 */

/* ------------------------------------------------------------------ */
/* Central time helpers                                                */
/* ------------------------------------------------------------------ */

export const CENTRAL_TZ = "America/Chicago";

/** A Central wall-clock time as a UTC instant, DST-correct for any date. */
export function centralToUtc(year: number, month: number, day: number, hour: number, minute = 0, second = 0): Date {
  // Guess CST, then correct by the offset the zone actually has at that moment.
  let guess = Date.UTC(year, month - 1, day, hour + 6, minute, second);
  for (let i = 0; i < 2; i++) {
    const offset = centralOffsetMinutes(new Date(guess));
    const corrected = Date.UTC(year, month - 1, day, hour, minute, second) - offset * 60_000;
    if (corrected === guess) break;
    guess = corrected;
  }
  return new Date(guess);
}

/** Minutes east of UTC for Central time at `date` (−360 CST, −300 CDT). */
export function centralOffsetMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CENTRAL_TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return Math.round((asUtc - date.getTime()) / 60_000);
}

/** The Central calendar parts of an instant. weekday: 0 = Sunday. */
export function centralParts(date: Date): { year: number; month: number; day: number; hour: number; minute: number; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CENTRAL_TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    weekday: "short",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { year: Number(get("year")), month: Number(get("month")), day: Number(get("day")), hour: Number(get("hour")), minute: Number(get("minute")), weekday };
}

/** "Mon Nov 16, 12:00 PM CT" — the same shape as lib/email/format.ts. */
export function formatCentralLabel(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CENTRAL_TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("weekday")} ${get("month")} ${get("day")}, ${get("hour")}:${get("minute")} ${get("dayPeriod").toUpperCase()} CT`;
}

/** "Monday at noon", "Saturday at 5:00 pm" — for prose. */
export function spokenCentral(date: Date): string {
  const { weekday, hour, minute } = centralParts(date);
  const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][weekday];
  if (hour === 12 && minute === 0) return `${dayName} at noon`;
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  const mm = String(minute).padStart(2, "0");
  return `${dayName} at ${h12}:${mm} ${hour < 12 ? "am" : "pm"}`;
}

/** "noon", "5 pm", "6:30 pm" — the time alone, for small labels. */
export function shortCentralTime(date: Date): string {
  const { hour, minute } = centralParts(date);
  if (hour === 12 && minute === 0) return "noon";
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${h12}${minute ? `:${String(minute).padStart(2, "0")}` : ""} ${hour < 12 ? "am" : "pm"}`;
}

/** "Sunday, Nov 15 at 6 PM" — a date and time, for one-line notices. */
export function spokenCentralDateTime(date: Date): string {
  const { weekday, hour, minute } = centralParts(date);
  const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][weekday];
  const monthDay = new Intl.DateTimeFormat("en-US", { timeZone: CENTRAL_TZ, month: "short", day: "numeric" }).format(date);
  if (hour === 12 && minute === 0) return `${dayName}, ${monthDay} at noon`;
  const h12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${dayName}, ${monthDay} at ${h12}${minute ? `:${String(minute).padStart(2, "0")}` : ""} ${hour < 12 ? "AM" : "PM"}`;
}

/** "November 16–21" (or "November 30 – December 5") — a span of Central dates. */
export function spokenCentralRange(from: Date, to: Date): string {
  const month = (d: Date) => new Intl.DateTimeFormat("en-US", { timeZone: CENTRAL_TZ, month: "long" }).format(d);
  const a = centralParts(from);
  const b = centralParts(to);
  return a.month === b.month ? `${month(from)} ${a.day}–${b.day}` : `${month(from)} ${a.day} – ${month(to)} ${b.day}`;
}

/* ------------------------------------------------------------------ */
/* The calendar (§1)                                                   */
/* ------------------------------------------------------------------ */

export type Instant = { at: Date; ct: string; what: string };

const instant = (at: Date, ct: string, what: string): Instant => ({ at, ct, what });

export const SCHEDULE = {
  /** /10years switches from 404 to notify-me mode. */
  notifyMeStart: instant(centralToUtc(2026, 11, 9, 0, 0), "Mon Nov 9, 12:00 AM CT", "/10years live in notify-me mode; chat hidden on /10years"),
  /** Entries open; the "It's live" email goes out. */
  entriesOpen: instant(centralToUtc(2026, 11, 15, 18, 0), "Sun Nov 15, 6:00 PM CT", "Entries open; 'It's live' email to verified notify-me signups"),
  /** One reminder to notify-me signups who have not tapped. */
  mondayReminder: instant(centralToUtc(2026, 11, 16, 9, 0), "Mon Nov 16, 9:00 AM CT", "Reminder to notify-me signups who have not tapped"),
  /** The Tuesday staff re-send for Monday's winner, skipped if contacted. */
  tuesdayCallToday: instant(centralToUtc(2026, 11, 17, 8, 30), "Tue Nov 17, 8:30 AM CT", "Staff 'call today' for Monday's winner (skipped if contacted)"),
  /** Entries close at the grand drawing. */
  entriesClose: instant(centralToUtc(2026, 11, 21, 17, 0), "Sat Nov 21, 5:00 PM CT", "Entries close; the grand prize is drawn"),
  /** Thank-you + offer to everyone who did not win. My call: 10 am CT. */
  thankYouSend: instant(centralToUtc(2026, 11, 22, 10, 0), "Sun Nov 22, 10:00 AM CT", "Thank-you + offer email to non-winners"),
  /** Offer reminder — built after Nov 21. My call: 10 am CT. */
  offerReminder: instant(centralToUtc(2026, 12, 1, 10, 0), "Tue Dec 1, 10:00 AM CT", "Offer reminder (built after Nov 21)"),
  /** The offer and every code switch off. */
  offerEnd: instant(centralToUtc(2026, 12, 5, 23, 59, 59), "Sat Dec 5, 11:59 PM CT", "Offer window closes; codes stop working; chat returns to /10years"),
  /** A free first visit may be any date through Dec 31. */
  visitBy: instant(centralToUtc(2026, 12, 31, 23, 59, 59), "Thu Dec 31, 11:59 PM CT", "Last day for the free first visit"),
} as const;

/** The daily afternoon email, Mon–Fri (decision 15: simplified). */
export const DAILY_EMAIL_HOUR_CT = 16;

/* ------------------------------------------------------------------ */
/* Drawings (decisions 4, 17): five daily + one grand                  */
/* ------------------------------------------------------------------ */

export type Slot = "mon" | "tue" | "wed" | "thu" | "fri" | "grand";
export type DrawingKind = "daily" | "grand";

export type Drawing = {
  slot: Slot;
  kind: DrawingKind;
  /** When it is drawn. */
  at: Date;
  ct: string;
  /** "Monday", …, "Saturday". */
  dayName: string;
  /** The daily afternoon email for this day (null for the grand drawing:
   *  Friday's email names Saturday's prize; the thank-you follows Sunday). */
  dailyEmailAt: Date | null;
  /** Which partner slot (1–6). */
  partner: 1 | 2 | 3 | 4 | 5 | 6;
};

export const DRAWINGS: readonly Drawing[] = [
  { slot: "mon", kind: "daily", at: centralToUtc(2026, 11, 16, 12), ct: "Mon Nov 16, 12:00 PM CT", dayName: "Monday", dailyEmailAt: centralToUtc(2026, 11, 16, DAILY_EMAIL_HOUR_CT), partner: 1 },
  { slot: "tue", kind: "daily", at: centralToUtc(2026, 11, 17, 12), ct: "Tue Nov 17, 12:00 PM CT", dayName: "Tuesday", dailyEmailAt: centralToUtc(2026, 11, 17, DAILY_EMAIL_HOUR_CT), partner: 2 },
  { slot: "wed", kind: "daily", at: centralToUtc(2026, 11, 18, 12), ct: "Wed Nov 18, 12:00 PM CT", dayName: "Wednesday", dailyEmailAt: centralToUtc(2026, 11, 18, DAILY_EMAIL_HOUR_CT), partner: 3 },
  { slot: "thu", kind: "daily", at: centralToUtc(2026, 11, 19, 12), ct: "Thu Nov 19, 12:00 PM CT", dayName: "Thursday", dailyEmailAt: centralToUtc(2026, 11, 19, DAILY_EMAIL_HOUR_CT), partner: 4 },
  { slot: "fri", kind: "daily", at: centralToUtc(2026, 11, 20, 12), ct: "Fri Nov 20, 12:00 PM CT", dayName: "Friday", dailyEmailAt: centralToUtc(2026, 11, 20, DAILY_EMAIL_HOUR_CT), partner: 5 },
  { slot: "grand", kind: "grand", at: centralToUtc(2026, 11, 21, 17), ct: "Sat Nov 21, 5:00 PM CT", dayName: "Saturday", dailyEmailAt: null, partner: 6 },
];

export const DAILY_EMAIL_CT_LABELS: Record<Exclude<Slot, "grand">, string> = {
  mon: "Mon Nov 16, 4:00 PM CT",
  tue: "Tue Nov 17, 4:00 PM CT",
  wed: "Wed Nov 18, 4:00 PM CT",
  thu: "Thu Nov 19, 4:00 PM CT",
  fri: "Fri Nov 20, 4:00 PM CT",
};

export function drawing(slot: Slot): Drawing {
  const d = DRAWINGS.find((x) => x.slot === slot);
  if (!d) throw new Error(`no drawing for slot ${slot}`);
  return d;
}

/** The first drawing still to come at `now` (null after the grand). */
export function nextDrawing(now: Date): Drawing | null {
  return DRAWINGS.find((d) => d.at.getTime() > now.getTime()) ?? null;
}

/** The drawing after this one (null after the grand). */
export function drawingAfter(slot: Slot): Drawing | null {
  const i = DRAWINGS.findIndex((d) => d.slot === slot);
  return DRAWINGS[i + 1] ?? null;
}

/* ------------------------------------------------------------------ */
/* Rates (decision 16) — retail values are COMPUTED from these         */
/* ------------------------------------------------------------------ */

/** A dollar amount Ben has or has not confirmed. An unconfirmed null
 *  counts as $0 in sums and is listed as unconfirmed wherever it shows. */
export type Rate = { usd: number | null; confirmed: boolean; note?: string };

export const RATES = {
  brainMap: { usd: 150, confirmed: true } as Rate,
  session: { usd: 125, confirmed: true } as Rate,
  /** Per use; every prize session includes the chair. */
  vibroChair: { usd: 40, confirmed: true } as Rate,
  hoolestHandheld: { usd: 429, confirmed: false, note: "UNCONFIRMED — Ben to confirm the Hoolest handheld retail price" } as Rate,
  hoolestKeychain: { usd: null, confirmed: false, note: "UNCONFIRMED — Hoolest keychain retail price not yet supplied; counted as $0" } as Rate,
  /** Admin cost view only. Per session or map. */
  practitionerCostPerUnit: { usd: 35, confirmed: true } as Rate,
} as const;

/** Over this computed retail value a winner needs a tax form (decision 16). */
export const TAX_FORM_THRESHOLD_USD = 600;

/* ------------------------------------------------------------------ */
/* Prizes (decision 16)                                                */
/* ------------------------------------------------------------------ */

export type PrizeVersion = "new_client" | "current_client";

export type PrizeSpec = {
  slot: Slot;
  version: PrizeVersion;
  brainMap: boolean;
  sessions: number;
  /** Every prize session includes the chair. */
  vibroChair: boolean;
  hoolestKeychain: boolean;
  hoolestHandheld: boolean;
  /** "one service from every partner" — the grand prize only. */
  partnerServices: boolean;
};

const prize = (slot: Slot, version: PrizeVersion, sessions: number, extras: Partial<Pick<PrizeSpec, "hoolestKeychain" | "hoolestHandheld" | "partnerServices">> = {}): PrizeSpec => ({
  slot,
  version,
  brainMap: version === "new_client",
  sessions,
  vibroChair: true,
  hoolestKeychain: false,
  hoolestHandheld: false,
  partnerServices: false,
  ...extras,
});

/** Both versions for every drawing, in drawing order. */
export const PRIZES: readonly PrizeSpec[] = [
  prize("mon", "new_client", 2),
  prize("mon", "current_client", 2),
  prize("tue", "new_client", 3),
  prize("tue", "current_client", 3),
  prize("wed", "new_client", 4, { hoolestKeychain: true }),
  prize("wed", "current_client", 4, { hoolestKeychain: true }),
  prize("thu", "new_client", 5, { hoolestKeychain: true }),
  prize("thu", "current_client", 5, { hoolestKeychain: true }),
  prize("fri", "new_client", 7, { hoolestKeychain: true }),
  prize("fri", "current_client", 7, { hoolestKeychain: true }),
  prize("grand", "new_client", 12, { hoolestHandheld: true, partnerServices: true }),
  prize("grand", "current_client", 13, { hoolestHandheld: true, partnerServices: true }),
];

export function prizeFor(slot: Slot, version: PrizeVersion): PrizeSpec {
  const p = PRIZES.find((x) => x.slot === slot && x.version === version);
  if (!p) throw new Error(`no prize for ${slot}/${version}`);
  return p;
}

/** The version a person's "I'm already an HBC client" box picks. */
export function prizeVersionFor(isExistingClient: boolean): PrizeVersion {
  return isExistingClient ? "current_client" : "new_client";
}

const usdOf = (r: Rate) => r.usd ?? 0;

/** Computed retail value — never hand-typed. Unconfirmed rates count as
 *  their stated number, or $0 when none has been supplied. */
export function prizeRetailUsd(p: PrizeSpec, rates = RATES): number {
  let total = 0;
  if (p.brainMap) total += usdOf(rates.brainMap);
  total += p.sessions * (usdOf(rates.session) + (p.vibroChair ? usdOf(rates.vibroChair) : 0));
  if (p.hoolestKeychain) total += usdOf(rates.hoolestKeychain);
  if (p.hoolestHandheld) total += usdOf(rates.hoolestHandheld);
  return total;
}

/** Practitioner cost (admin cost view only): $35 per session and per map. */
export function prizePractitionerCostUsd(p: PrizeSpec, rates = RATES): number {
  return (p.sessions + (p.brainMap ? 1 : 0)) * usdOf(rates.practitionerCostPerUnit);
}

/** Whether the retail value is over the tax-form threshold. */
export function prizeTaxFormRequired(p: PrizeSpec, rates = RATES): boolean {
  return prizeRetailUsd(p, rates) > TAX_FORM_THRESHOLD_USD;
}

/** Which rates in a prize are unconfirmed (for the admin and the plan). */
export function prizeUnconfirmedRates(p: PrizeSpec, rates = RATES): string[] {
  const out: string[] = [];
  if (p.brainMap && !rates.brainMap.confirmed) out.push("brainMap");
  if (!rates.session.confirmed) out.push("session");
  if (p.vibroChair && !rates.vibroChair.confirmed) out.push("vibroChair");
  if (p.hoolestKeychain && !rates.hoolestKeychain.confirmed) out.push("hoolestKeychain");
  if (p.hoolestHandheld && !rates.hoolestHandheld.confirmed) out.push("hoolestHandheld");
  return out;
}

/** The HBC prize in words: "Brain Map + 4 sessions + Hoolest keychain".
 *  The chair is a clause, not an item, so the list reads as Ben wrote it. */
export function prizeName(p: PrizeSpec): string {
  const items: string[] = [];
  if (p.brainMap) items.push("Brain Map");
  items.push(`${p.sessions} sessions`);
  if (p.hoolestKeychain) items.push("Hoolest keychain");
  if (p.hoolestHandheld) items.push("Hoolest handheld vagus nerve stimulator (to keep)");
  if (p.partnerServices) items.push("one service from every partner");
  return items.join(" + ");
}

/** The sentence under the name: "a Brain Map, 4 LENS sessions and a Hoolest
 *  keychain (every session includes the vibro chair)". */
export function prizeDescription(p: PrizeSpec): string {
  const items: string[] = [];
  if (p.brainMap) items.push("a Brain Map");
  items.push(`${p.sessions} LENS sessions`);
  if (p.hoolestKeychain) items.push("a Hoolest keychain");
  if (p.hoolestHandheld) items.push("a Hoolest handheld vagus nerve stimulator to keep");
  if (p.partnerServices) items.push("one service from every partner");
  const list = items.length === 1 ? items[0] : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
  return p.vibroChair ? `${list} (every session includes the vibro chair)` : list;
}

/* ------------------------------------------------------------------ */
/* Partner prizes — six slots, shown only once named (decision 16)      */
/* ------------------------------------------------------------------ */

export type Partner = {
  number: 1 | 2 | 3 | 4 | 5 | 6;
  slot: Slot;
  /** null = TBD = not shown anywhere public. */
  name: string | null;
  prize: string | null;
  retailUsd: number | null;
};

export const PARTNERS: readonly Partner[] = [
  { number: 1, slot: "mon", name: null, prize: null, retailUsd: null },
  { number: 2, slot: "tue", name: null, prize: null, retailUsd: null },
  { number: 3, slot: "wed", name: null, prize: null, retailUsd: null },
  { number: 4, slot: "thu", name: null, prize: null, retailUsd: null },
  { number: 5, slot: "fri", name: null, prize: null, retailUsd: null },
  { number: 6, slot: "grand", name: null, prize: null, retailUsd: null },
];

/** The partner for a drawing, only when its name is set. */
export function partnerFor(slot: Slot): Partner | null {
  const p = PARTNERS.find((x) => x.slot === slot);
  return p && p.name ? p : null;
}

/* ------------------------------------------------------------------ */
/* Claim deadline (decisions 6, 18)                                    */
/* ------------------------------------------------------------------ */

export const CLAIM_WINDOW_MS = 72 * 60 * 60_000;
export const CLAIM_MOVED_DEADLINE_HOUR_CT = 17;

/**
 * 72 hours from the draw — unless that lands on a Sunday or a Monday
 * (Central), in which case the following Tuesday at 5:00 pm CT.
 */
export function claimDeadline(drawnAt: Date): Date {
  const plain = new Date(drawnAt.getTime() + CLAIM_WINDOW_MS);
  const { year, month, day, weekday } = centralParts(plain);
  if (weekday !== 0 && weekday !== 1) return plain;
  const daysToTuesday = weekday === 0 ? 2 : 1;
  // Day arithmetic in UTC on the Central calendar date, then back to a
  // Central wall-clock time (DST-correct via centralToUtc).
  const tuesday = new Date(Date.UTC(year, month - 1, day + daysToTuesday));
  return centralToUtc(tuesday.getUTCFullYear(), tuesday.getUTCMonth() + 1, tuesday.getUTCDate(), CLAIM_MOVED_DEADLINE_HOUR_CT, 0);
}

/* ------------------------------------------------------------------ */
/* The thank-you offer (decisions 8, 19, 20)                           */
/* ------------------------------------------------------------------ */

export const OFFER = {
  kind: "free_first_visit" as const,
  /** What is free: a Brain Map + consultation, normally this much. */
  normallyUsd: 150,
  bookBy: SCHEDULE.offerEnd,
  visitBy: SCHEDULE.visitBy,
  /** Start the in-center 12-session package at the first visit → a 13th
   *  session free. Not for Concierge bookings (decision 19). */
  packageSessions: 12,
  bonusSessionUsd: 125,
  /** Concierge: the visit is free, the travel fee still applies, no bonus. */
  conciergeTravelFeeUsd: 100,
} as const;

/** Whether an offer code still works at `now`. */
export function offerOpen(now: Date): boolean {
  return now.getTime() <= OFFER.bookBy.at.getTime();
}

/* ------------------------------------------------------------------ */
/* Referrals and limits (decisions 1–3)                                */
/* ------------------------------------------------------------------ */

export const REFERRAL = {
  /** Entries the referrer gets per verified friend. */
  referrerBonus: 3,
  /** Entries the friend gets for entering via a link. */
  referredBonus: 1,
  /** Credited friends per referrer; the eleventh credits nothing. */
  friendCap: 10,
} as const;

/* ------------------------------------------------------------------ */
/* Page modes and the chat window (decisions 11, 14)                   */
/* ------------------------------------------------------------------ */

export type PageMode = "hidden" | "notify_me" | "live" | "closed" | "thank_you";

/** What /10years is at `now`. "hidden" answers 404. */
export function pageMode(now: Date): PageMode {
  const t = now.getTime();
  if (t < SCHEDULE.notifyMeStart.at.getTime()) return "hidden";
  if (t < SCHEDULE.entriesOpen.at.getTime()) return "notify_me";
  if (t < SCHEDULE.entriesClose.at.getTime()) return "live";
  if (t <= SCHEDULE.offerEnd.at.getTime()) return "closed";
  return "thank_you";
}

/** The chat assistant stays off /10years from notify-me start to offer end. */
export const CHAT_SUPPRESSION_WINDOW = { from: SCHEDULE.notifyMeStart.at, to: SCHEDULE.offerEnd.at } as const;

export function chatSuppressedOn10Years(now: Date): boolean {
  return now.getTime() >= CHAT_SUPPRESSION_WINDOW.from.getTime() && now.getTime() <= CHAT_SUPPRESSION_WINDOW.to.getTime();
}

/** The current rules text version recorded on every acceptance. */
export const RULES_VERSION = "2026-10-18-draft";
