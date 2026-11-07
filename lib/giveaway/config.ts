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

/** "November 16–21" (or "November 30 – December 5") — a span of Central dates; `short` gives "Nov 16–21". */
export function spokenCentralRange(from: Date, to: Date, style: "long" | "short" = "long"): string {
  const month = (d: Date) => new Intl.DateTimeFormat("en-US", { timeZone: CENTRAL_TZ, month: style }).format(d);
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
  /** The Saturday-morning countdown email (Ben, 2026-11-04): the sixth
   *  drawing-week email, after the Mon–Fri 4 pm ones. */
  saturdayMorning: instant(centralToUtc(2026, 11, 21, 9, 0), "Sat Nov 21, 9:00 AM CT", "Countdown email to every verified, subscribed entrant"),
  /** Entries close at the grand drawing. */
  entriesClose: instant(centralToUtc(2026, 11, 21, 17, 0), "Sat Nov 21, 5:00 PM CT", "Entries close; the grand prize is drawn"),
  /** The thank-you gift is revealed (fix list rev 2, P0-2/P0-10): before
   *  this instant no public surface or email names it; from it the page and
   *  the reveal email do. Ben, 2026-11-03: Saturday evening, so the clinics'
   *  Monday and Tuesday of Thanksgiving week are two full call days. */
  giftReveal: instant(centralToUtc(2026, 11, 21, 19, 0), "Sat Nov 21, 7:00 PM CT", "Thank-you gift revealed on the page"),
  /** The reveal email: every verified, subscribed entrant, winners included. */
  thankYouSend: instant(centralToUtc(2026, 11, 21, 19, 0), "Sat Nov 21, 7:00 PM CT", "Thank-you + gift reveal email to every verified, subscribed entrant"),
  /** Offer reminder — built after Nov 21. My call: 10 am CT. */
  /** Gift reminder, with the live "X of N left" (fix list rev 2, P1-4). */
  offerReminder: instant(centralToUtc(2026, 12, 1, 9, 0), "Tue Dec 1, 9:00 AM CT", "Gift reminder to verified, subscribed, unredeemed entrants"),
  /** Last call: booking closes Saturday (P1-4). */
  offerLastCall: instant(centralToUtc(2026, 12, 3, 9, 0), "Thu Dec 3, 9:00 AM CT", "Gift last call to verified, subscribed, unredeemed entrants"),
  /** The offer and every code switch off. */
  offerEnd: instant(centralToUtc(2026, 12, 5, 23, 59, 59), "Sat Dec 5, 11:59 PM CT", "Offer window closes; codes stop working; chat returns to /10years"),
  /** The last day to ask for the winners list (Official Rules §20, Grok's draft). */
  winnersListRequestBy: instant(centralToUtc(2027, 1, 31, 23, 59, 59), "Sun Jan 31, 11:59 PM CT", "Last day to request the winners list"),
  /** A free first visit may be any date through Dec 31. */
  visitBy: instant(centralToUtc(2026, 12, 31, 23, 59, 59), "Thu Dec 31, 11:59 PM CT", "Last day for the free first visit"),
} as const;

/** The instant the thank-you gift may be named in public (P0-2). */
export const GIFT_REVEAL_AT = SCHEDULE.giftReveal.at;

/** True from the reveal on. Ask with giveawayNow(), never a showcase's
 *  representative "now": a ?mode=closed preview before Saturday night must
 *  not show the gift. */
export function giftRevealed(now: Date): boolean {
  return now.getTime() >= GIFT_REVEAL_AT.getTime();
}

/** The clinic days right after the reveal (Ben, 2026-11-03): open Monday
 *  and Tuesday of Thanksgiving week. The reveal email names them. */
export const CLINIC_DAYS_AFTER_REVEAL = [centralToUtc(2026, 11, 23, 9, 0), centralToUtc(2026, 11, 24, 9, 0)] as const;

/** The Mon–Fri countdown email hour (Ben, 2026-11-04: lib/giveaway/emails.ts hypeEmail). */
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
/* Rates — retail values are COMPUTED from these (Ben, 2026-11-03)     */
/* ------------------------------------------------------------------ */

/** A dollar amount. Sums are done in cents (usdSum) so $44.95 adds exactly. */
export type Rate = { usd: number; note?: string };

export const RATES = {
  brainMap: { usd: 150 } as Rate,
  session: { usd: 125, note: "a LENS session" } as Rate,
  /** Per use — the grand prize's twelve sessions each include the chair. */
  vibroChair: { usd: 40 } as Rate,
  /** One bottle of a BrainMD supplement, at BrainMD's retail price. */
  brainMdBottle: { usd: 44.95, note: "BrainMD retail" } as Rate,
  hoolestMini: { usd: 99, note: "Hoolest's price" } as Rate,
  hoolestVeRelief: { usd: 199, note: "Hoolest's price" } as Rate,
  /** Admin cost view only. Per session or map. */
  practitionerCostPerUnit: { usd: 35 } as Rate,
} as const;

/** Exact dollar sums: every amount to cents first. */
export function usdSum(amounts: readonly number[]): number {
  return amounts.reduce((t, x) => t + Math.round(x * 100), 0) / 100;
}

/**
 * The products, by what they are: display names used on the page, in the
 * emails and in the rules. Never by what they do.
 */
export const DEVICES = {
  mini: { name: "Hoolest Mini vagus nerve stimulator", short: "Hoolest Mini" },
  veRelief: { name: "Hoolest VeRelief vagus nerve stimulator", short: "Hoolest VeRelief" },
  brainMd: { name: "BrainMD supplement bottle", short: "BrainMD bottle" },
} as const;

/** At or over this total retail value of HBC prizes in a year, a person
 *  needs a tax form (fix list rev 2, P0-11): $2,000 for 2026, up from $600.
 *  Aggregated per PERSON, not per prize — a daily winner who also wins the
 *  grand prize is judged on both. */
export const TAX_FORM_THRESHOLD_USD = 2000;
/** False until HBC's accountant confirms the threshold; while false the
 *  rules add "Accountant to confirm." after the tax line. */
export const TAX_THRESHOLD_CONFIRMED = false;

/** Whether a person whose HBC prizes this year total `totalUsd` needs a tax form. */
export function taxFormRequiredForTotal(totalUsd: number): boolean {
  return totalUsd >= TAX_FORM_THRESHOLD_USD;
}

/** The last day a prize's sessions and Brain Map can be used. UNCONFIRMED
 *  (my default, 2026-11-03): six months after the drawings. Ben confirms or
 *  changes it at the copy freeze; the rules read it from here. */
export const PRIZE_USE_BY = { at: centralToUtc(2027, 5, 31, 23, 59, 59), ct: "Mon May 31, 2027, 11:59 PM CT", confirmed: false } as const;

/* ------------------------------------------------------------------ */
/* Partners — gifts redeemed directly with the partner (Ben, 2026-11-03) */
/* ------------------------------------------------------------------ */

export type PartnerGift = {
  id: "skye" | "amabel" | "envision";
  /** "Skye Chiropractic" */
  partner: string;
  /** What the gift is, in plain words. */
  gift: string;
  /** The short form for a one-line phone row. */
  short: string;
  /** How many (the lymphatic sessions come in threes). */
  count: number;
  unitUsd: number;
  /** The last day the partner honours it. null = Ben has not supplied it yet ("TBD"). */
  validThrough: Date | null;
  /** A line of terms the page and the rules show under the gift, if any. */
  terms?: string;
};

export const PARTNER_GIFTS: Record<PartnerGift["id"], PartnerGift> = {
  skye: { id: "skye", partner: "Skye Chiropractic", gift: "Skye Chiropractic gift", short: "Skye Chiropractic gift", count: 1, unitUsd: 250, validThrough: null },
  amabel: {
    id: "amabel",
    partner: "Be Well with Amabel",
    gift: "90-minute one-to-one Women's Health & Life Coaching session with Amabel Luers of Be Well with Amabel",
    short: "coaching session with Amabel Luers",
    count: 1,
    unitUsd: 250,
    validThrough: null,
    terms: "The winner may gift this session to a woman of their choice.",
  },
  envision: {
    id: "envision",
    partner: "Envision Thermography & Wellness",
    gift: "Assisted Lymphatic Therapy sessions with Victoria Bailey of Envision Thermography & Wellness",
    short: "3 lymphatic therapy sessions",
    count: 3,
    unitUsd: 125,
    validThrough: null,
  },
};

/* ------------------------------------------------------------------ */
/* Prizes — one per drawing (Ben, 2026-11-03)                          */
/* ------------------------------------------------------------------ */

/**
 * One prize per drawing. There is no separate current-client version: a
 * current client gets the same prize, with a Brain Map gift certificate to
 * give to someone new in place of their own Brain Map (GIFT_CODES), worth
 * the same. The site never decides who is a current client — staff ask on
 * the winner call.
 */
export type PrizeSpec = {
  slot: Slot;
  brainMap: boolean;
  sessions: number;
  /** Sessions that include the vibro chair (the grand prize: all twelve). */
  vibroSessions: number;
  brainMdBottles: number;
  hoolest: "mini" | "veRelief" | null;
  partners: PartnerGift["id"][];
};

const prize = (slot: Slot, p: Omit<PrizeSpec, "slot" | "brainMap">): PrizeSpec => ({ slot, brainMap: true, ...p });

/** In drawing order, Monday to the Saturday grand prize. */
export const PRIZES: readonly PrizeSpec[] = [
  prize("mon", { sessions: 0, vibroSessions: 0, brainMdBottles: 1, hoolest: null, partners: [] }),
  prize("tue", { sessions: 0, vibroSessions: 0, brainMdBottles: 1, hoolest: null, partners: ["skye"] }),
  prize("wed", { sessions: 3, vibroSessions: 0, brainMdBottles: 1, hoolest: null, partners: [] }),
  prize("thu", { sessions: 3, vibroSessions: 0, brainMdBottles: 1, hoolest: "mini", partners: [] }),
  prize("fri", { sessions: 3, vibroSessions: 0, brainMdBottles: 1, hoolest: null, partners: ["amabel"] }),
  prize("grand", { sessions: 12, vibroSessions: 12, brainMdBottles: 3, hoolest: "veRelief", partners: ["envision"] }),
];

export function prizeFor(slot: Slot): PrizeSpec {
  const p = PRIZES.find((x) => x.slot === slot);
  if (!p) throw new Error(`no prize for ${slot}`);
  return p;
}

/** giveaway_prizes / giveaway_winners keep 0010's version column (its check
 *  allows new_client | current_client). There is one prize per drawing now:
 *  every winner row is written with this, and both seeded rows per slot hold
 *  the same prize. */
export const STANDARD_PRIZE_VERSION = "new_client" as const;

/** The one gift-certificate code per day: a current-client winner's Brain Map, given to someone new. */
export const GIFT_CODES: Record<Slot, string> = { mon: "GIFT-MON", tue: "GIFT-TUE", wed: "GIFT-WED", thu: "GIFT-THU", fri: "GIFT-FRI", grand: "GIFT-SAT" };

export function giftCodeSlot(code: string | null | undefined): Slot | null {
  const c = (code ?? "").trim().toUpperCase();
  return (Object.entries(GIFT_CODES).find(([, v]) => v === c)?.[0] as Slot | undefined) ?? null;
}

/** One line of a prize, with its value. */
export type PrizePart = {
  kind: "brainMap" | "sessions" | "chair" | "brainMd" | "hoolest" | "partner";
  count: number;
  unitUsd: number;
  usd: number;
  partner?: PartnerGift;
  device?: "mini" | "veRelief";
};

export function prizeBreakdown(p: PrizeSpec, rates = RATES): PrizePart[] {
  const parts: PrizePart[] = [];
  if (p.brainMap) parts.push({ kind: "brainMap", count: 1, unitUsd: rates.brainMap.usd, usd: rates.brainMap.usd });
  if (p.sessions) parts.push({ kind: "sessions", count: p.sessions, unitUsd: rates.session.usd, usd: usdSum(Array(p.sessions).fill(rates.session.usd)) });
  if (p.hoolest) {
    const r = p.hoolest === "mini" ? rates.hoolestMini : rates.hoolestVeRelief;
    parts.push({ kind: "hoolest", count: 1, unitUsd: r.usd, usd: r.usd, device: p.hoolest });
  }
  if (p.vibroSessions) parts.push({ kind: "chair", count: p.vibroSessions, unitUsd: rates.vibroChair.usd, usd: usdSum(Array(p.vibroSessions).fill(rates.vibroChair.usd)) });
  for (const id of p.partners) {
    const g = PARTNER_GIFTS[id];
    parts.push({ kind: "partner", count: g.count, unitUsd: g.unitUsd, usd: usdSum(Array(g.count).fill(g.unitUsd)), partner: g });
  }
  if (p.brainMdBottles) parts.push({ kind: "brainMd", count: p.brainMdBottles, unitUsd: rates.brainMdBottle.usd, usd: usdSum(Array(p.brainMdBottles).fill(rates.brainMdBottle.usd)) });
  return parts;
}

/** The sum of a breakdown's lines. */
export function breakdownSumUsd(parts: readonly PrizePart[]): number {
  return usdSum(parts.map((x) => x.usd));
}

/** Computed retail value — never hand-typed. */
export function prizeRetailUsd(p: PrizeSpec, rates = RATES): number {
  return breakdownSumUsd(prizeBreakdown(p, rates));
}

/** The grand-prize photo in the drawing-week countdown emails (Ben,
 *  2026-11-04): an absolute https URL, about 1072 px wide (shown at 536).
 *  null = no photo yet, and the email shows a "PRIZE PHOTO" placeholder box.
 *  Set it, or remove the slot, before the engine is turned on. */
export const HYPE_PRIZE_PHOTO_URL: string | null = null;

/** The six prizes together: $5,537.60. */
export function prizeTotalUsd(rates = RATES): number {
  return usdSum(PRIZES.map((p) => prizeRetailUsd(p, rates)));
}

/** The headline: the total rounded DOWN to the nearest $500 ("Over $5,500 in prizes"). */
export function prizeTotalFloorUsd(rates = RATES): number {
  return Math.floor(prizeTotalUsd(rates) / 500) * 500;
}

/** Practitioner cost (admin cost view only): $35 per session and per map. */
export function prizePractitionerCostUsd(p: PrizeSpec, rates = RATES): number {
  return (p.sessions + (p.brainMap ? 1 : 0)) * rates.practitionerCostPerUnit.usd;
}

/** Whether this prize ALONE reaches the tax-form threshold (the seed's
 *  per-prize flag). A winner's own flag is aggregated per person —
 *  taxFormRequiredForTotal(), lib/giveaway/drawings.ts. */
export function prizeTaxFormRequired(p: PrizeSpec, rates = RATES): boolean {
  return taxFormRequiredForTotal(prizeRetailUsd(p, rates));
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** The prize in words: "Brain Map + 3 LENS sessions + Hoolest Mini + 1 BrainMD bottle". */
export function prizeName(p: PrizeSpec): string {
  const items: string[] = [];
  if (p.brainMap) items.push("Brain Map");
  if (p.sessions) items.push(plural(p.sessions, "LENS session"));
  if (p.hoolest) items.push(DEVICES[p.hoolest].short);
  if (p.vibroSessions) items.push(`a vibro chair session with each of the ${p.vibroSessions} sessions`);
  for (const id of p.partners) items.push(PARTNER_GIFTS[id].count > 1 ? `${PARTNER_GIFTS[id].count} ${PARTNER_GIFTS[id].gift}` : PARTNER_GIFTS[id].gift);
  if (p.brainMdBottles) items.push(plural(p.brainMdBottles, "BrainMD bottle"));
  return items.join(" + ");
}

/** The sentence form, for the seed's description column. */
export function prizeDescription(p: PrizeSpec): string {
  const items = prizeName(p).split(" + ");
  return items.length === 1 ? items[0] : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/* ------------------------------------------------------------------ */
/* Reaching a winner (Ben, 2026-11-03)                                  */
/* ------------------------------------------------------------------ */

/**
 * No automated email to winners. Staff get the alert at the draw and
 * contact the winner by phone and email themselves. Official Rules: "If
 * the winner doesn't respond within 72 hours of our first attempt, a new
 * winner may be drawn." The window runs from staff's first attempt, which
 * the system does not see, so a redraw is Ben's call (/admin/10years →
 * Drawings → Redraw, with a reason); nothing redraws on its own.
 */
export const RESPONSE_WINDOW_MS = 72 * 60 * 60_000;

/**
 * The soonest a redraw could be considered: 72 hours after the draw, as if
 * the first attempt came the minute the winner was drawn. Written to
 * giveaway_winners.claim_deadline_at (0010: not null) for the backup admin
 * screen; never shown to the public or to a winner.
 */
export function earliestRedrawAt(drawnAt: Date): Date {
  return new Date(drawnAt.getTime() + RESPONSE_WINDOW_MS);
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

/** No per-center caps and no fallback gift (Ben, 2026-11-03): every
 *  entrant's free first visit is good until the booking deadline; urgency
 *  comes from that date alone. Never "limited spots" or "X of N left". */

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

/** The early-bird bonus (decision 13): a notify-me signup who taps the
 *  one-tap entry link before the first drawing gets this many extra
 *  entries. lib/giveaway/people.ts and the Official Rules read it here. */
export const EARLY_BIRD = { bonusEntries: 1, before: DRAWINGS[0] } as const;

/* ------------------------------------------------------------------ */
/* Eligibility: Tennessee and its neighbours (Ben, 2026-10-19)          */
/* ------------------------------------------------------------------ */

/** Who may enter: residents of these states, 18+. ONE list — the ZIP
 *  check (lib/giveaway/zip.ts), the page, the rules and the deck all read
 *  it. Tennessee first; then its bordering states, clockwise from the north. */
export const ELIGIBLE_STATES = [
  { code: "TN", name: "Tennessee" },
  { code: "KY", name: "Kentucky" },
  { code: "VA", name: "Virginia" },
  { code: "NC", name: "North Carolina" },
  { code: "GA", name: "Georgia" },
  { code: "AL", name: "Alabama" },
  { code: "MS", name: "Mississippi" },
  { code: "AR", name: "Arkansas" },
  { code: "MO", name: "Missouri" },
] as const;

export type EligibleStateCode = (typeof ELIGIBLE_STATES)[number]["code"];

export const ELIGIBLE_STATE_CODES: readonly EligibleStateCode[] = ELIGIBLE_STATES.map((s) => s.code);

export function isEligibleStateCode(code: string | null | undefined): code is EligibleStateCode {
  return (ELIGIBLE_STATE_CODES as readonly string[]).includes(code ?? "");
}

export function eligibleStateName(code: EligibleStateCode): string {
  return ELIGIBLE_STATES.find((s) => s.code === code)!.name;
}

/** "KY, VA, NC, GA, AL, MS, AR, MO" — the neighbours, for a parenthesis. */
export function neighbourCodes(): string {
  return ELIGIBLE_STATES.filter((s) => s.code !== "TN").map((s) => s.code).join(", ");
}

/** "Tennessee and neighboring states (KY, VA, NC, GA, AL, MS, AR, MO)" — the eligibility, in prose. */
export function eligibilityPhrase(): string {
  return `Tennessee and neighboring states (${neighbourCodes()})`;
}

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

/**
 * What the real /10years (and its verify, one-tap and rules pages) shows
 * with the engine ON (Ben, 2026-11-07): before notify-me start it is
 * already the real notify-me page, open to anyone with the URL. Only the
 * public signals wait for notifyMeStart — robots.txt, the sitemap, the meta
 * robots (tenYearsPublic) and the site banner (lib/giveaway/banner.ts).
 */
export function entryPageMode(now: Date): Exclude<PageMode, "hidden"> {
  const m = pageMode(now);
  return m === "hidden" ? "notify_me" : m;
}

/** The chat assistant stays off /10years from notify-me start to offer end. */
export const CHAT_SUPPRESSION_WINDOW = { from: SCHEDULE.notifyMeStart.at, to: SCHEDULE.offerEnd.at } as const;

export function chatSuppressedOn10Years(now: Date): boolean {
  return now.getTime() >= CHAT_SUPPRESSION_WINDOW.from.getTime() && now.getTime() <= CHAT_SUPPRESSION_WINDOW.to.getTime();
}

/** The current rules text version recorded on every acceptance. */
export const RULES_VERSION = "2026-11-03";
