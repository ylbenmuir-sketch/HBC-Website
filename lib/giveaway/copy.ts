/**
 * EVERY word the giveaway says — emails, pages, messages — in one file,
 * all of it [DRAFT] placeholder text until Ben supplies the final copy
 * (GIVEAWAY-PLAN.md §4; Ben, 2026-10-18: "Put ALL copy in one file as
 * clearly marked [DRAFT] placeholder text — I will supply final copy").
 *
 * Every string passes through `D()`, which prefixes "[DRAFT] ". That is
 * deliberate and visible: a preview, a test send or (if it ever happened) a
 * real send of unapproved words is unmistakable, and lib/site-config.ts's
 * `isDraftText()` (any "[") can refuse it. When Ben approves a string,
 * replace `D("…")` with the plain string; when every D() is gone, set
 * COPY_IS_DRAFT to false. GIVEAWAY-COPY.md is the readable deck of the
 * same words.
 *
 * Voice: the visitor is the hero, HBC is the guide. Plain, warm, punchy.
 * Lead with the prize and the next drawing; one clear button per email;
 * honest urgency (entering earlier = more drawings). No health outcomes, no
 * "treats/cures": prizes are described by what they contain, never by what
 * they will do for anyone.
 *
 * Facts (prizes, times, the offer) come from lib/giveaway/config.ts and are
 * passed in — nothing here hand-types a number or a date. Where a drawing
 * is in hand, its time is spoken from the config (`spokenCentral`), never
 * typed. A few plain strings still name a day ("Monday's prize") because
 * their callers pass no drawing; GIVEAWAY-COPY.md lists each one.
 *
 * Phrases other code matches on (keep them): lib/giveaway/engine.test.mjs
 * — "Today at noon", "Thank you", "grand prize" in the countdown subject; scripts/check-giveaway.mjs
 * — "Put me on the list", "Enter me", "Forward this to a friend", "friend's
 * link", "with N entries", "10 years — Monday winner",
 * "GRAND PRIZE", "W-9", "Monday's winner: claimed",
 * "already" (unsubscribe), "You're in." (subject).
 */

import { spokenCentral, type Drawing } from "./config";
import { hideDraftTags } from "./draft";

/** Draft until Ben approves the copy: ON unless the env var COPY_IS_DRAFT is
 *  exactly "false" (Ben, 2026-11-07 — he sets it in Vercel at turn-on).
 *  While on: every string carries "[DRAFT] " (shown unless hidden, see
 *  lib/giveaway/draft.ts) and lib/giveaway/send.ts refuses every send
 *  outside a testing env. Off: the strings below ship exactly as written. */
export const copyIsDraft = (env: Record<string, string | undefined> = process.env): boolean => env.COPY_IS_DRAFT?.trim() !== "false";
export const COPY_IS_DRAFT = copyIsDraft();

/** The draft marker. Remove per string as Ben approves it. The prefix can
 *  be hidden on screen (GIVEAWAY_HIDE_DRAFT_TAGS=1, never in production —
 *  lib/giveaway/draft.ts); that changes what is shown, not what may be sent. */
export const D = (s: string): string => (COPY_IS_DRAFT && !hideDraftTags() ? `[DRAFT] ${s}` : s);

export const BRAND = "Harmonized Brain Centers";
export const CAMPAIGN = "10 Years of Harmonized Brain Centers";

/** "Monday at noon", "Saturday at 5:00 pm" — read off the drawing, never typed. */
const when = (d: Drawing) => spokenCentral(d.at);

/** What the countdown email's preview line may say (lib/giveaway/emails.ts hypeEmail). */
export type HypeFacts = { entries: number; grandDay: string; grandTime: string; drawingsLeft: number };
const numberWord = (n: number) => ["zero", "one", "two", "three", "four", "five", "six"][n] ?? String(n);

/** 6 → "Six". Counts come from config; this only spells them. */
const countWord = (n: number) => ["Zero", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve"][n] ?? String(n);

/* ------------------------------------------------------------------ */
/* Shared fragments                                                    */
/* ------------------------------------------------------------------ */

export const SHARED = {
  /** The forward line for existing clients (decision 15) — Ben's words, verbatim. */
  existingClientForward: D("Already a client? Forward this to a friend — the code works for whoever books with it."),
  /** Under every marketing email. */
  whyYouGotThis: D("You're getting this because you signed up for the 10-year giveaway at"),
  unsubscribe: D("Unsubscribe"),
  /** Under every transactional email. */
  whyYouGotThisTransactional: D("You're getting this because you entered the 10-year giveaway at"),
  /** The chair clause, when a prize is listed. */
  /** One prize per drawing (Ben, 2026-11-03): a current client's Brain Map becomes a certificate for someone new. */
  /** "Redeemed directly with Skye Chiropractic, valid through TBD." — the date from config (PARTNER_GIFTS). */
  partnerLine: (partner: string, validThrough: string | null, terms: string | null) => D(`Redeemed directly with ${partner}, valid through ${validThrough ?? "TBD"}.${terms ? ` ${terms}` : ""}`),
  /** The offer, in one line. Sits under the "Your first visit is on us" heading, so it doesn't repeat it. */
  offerLine: (bookBySpoken: string, visitBySpoken: string) => D(`A free Brain Map and consultation. Book by ${bookBySpoken}; come in any day through ${visitBySpoken}.`),
  offerBonus: (packageSessions: number) => D(`Start the in-center ${packageSessions}-session package at that visit and the ${packageSessions + 1}th session is free.`),
  offerConcierge: D("Concierge visits: the first visit is free too. The travel fee still applies, and the package bonus is in-center only."),
  yourCode: D("Your code"),
};

/* ------------------------------------------------------------------ */
/* Emails                                                              */
/* ------------------------------------------------------------------ */

export const EMAILS = {
  /** 1. Notify-me follow-up (Ben, 2026-11-08): the form put them on the
   *  list; this email only confirms it. Nothing in it is required. */
  notifyOnList: {
    subject: D("You're on the list — the 10-year giveaway"),
    preheader: D("Entries open Sunday evening. Here's what happens next."),
    heading: (firstName: string) => D(`${firstName ? `${firstName}, you're` : "You're"} on the list.`),
    body: (entriesOpenSpoken: string) => D(`Entries open ${entriesOpenSpoken} Central. Enter on the giveaway page then. We'll also email you a one-tap entry button to make it quicker.`),
    button: D("See the prizes"),
    small: D("Didn't sign up? Ignore this email. Every reminder after it has an unsubscribe link."),
  },

  /** 2. "It's live" — the one-tap entry. */
  itsLive: {
    subject: (firstPrize: string) => D(`It's live. Monday's prize: ${firstPrize}`),
    preheader: D("One tap enters you in every drawing this week."),
    heading: (firstName: string) => D(`${firstName ? `${firstName}, it` : "It"}'s live.`),
    body: (first: Drawing, firstPrize: string) => D(`One tap and you're in every drawing this week. First up, ${when(first)}: ${firstPrize}.`),
    earlyBird: D("Tap before that first drawing and you get a bonus entry."),
    button: D("Enter me — one tap"),
    small: D("Nothing to fill in — your details are already on file from your signup."),
  },

  /** 3. Monday 9 am reminder to signups who have not tapped. */
  mondayReminder: {
    subject: (prize: string) => D(`Today at noon: ${prize}. You're not in yet.`),
    preheader: D("One tap and you're in today's drawing."),
    heading: (firstName: string) => D(`${firstName ? `${firstName}, you` : "You"}'re not in yet.`),
    body: (first: Drawing, firstPrize: string) => D(`${first.dayName}'s drawing is today at noon — ${firstPrize}. One tap puts you in it, and in every drawing after.`),
    button: D("Enter me — one tap"),
  },

  /** 5. "You're in" — referral link + offer (+ forward line). */
  youreIn: {
    subject: D("You're in. Here's your share link."),
    preheader: D("The next drawing, your share link, and a thank-you gift on the way."),
    heading: (firstName: string) => D(`${firstName ? `${firstName}, you` : "You"}'re in.`),
    body: (next: Drawing | null, prizeName: string | null) => D(next && prizeName ? `Next drawing: ${when(next)} — ${prizeName}. Your entry counts in it and every one after.` : "Your entry counts in every drawing still to come."),
    referredBonus: D("A friend's link brought you here, so you start with a bonus entry."),
    shareHeading: D("Add entries"),
    shareBody: (referrerBonus: number, referredBonus: number, cap: number) => D(`Share your link. Each friend who enters through it adds ${referrerBonus} entries for you and ${referredBonus} for them, up to ${cap} friends.`),
    shareButton: D("Share my link"),
    /** The gift is NOT named before the reveal (fix list rev 2, P0-2). */
    giftTease: (revealSpoken: string) => D(`Plus a thank-you gift for every entrant, revealed by email ${revealSpoken}.`),
    /** The offer panel's heading — the reveal email only. */
    offerHeading: D("Your first visit is on us"),
    offerButton: D("Book my free first visit"),
  },

  /** 6. Drawing-week countdown (Ben, 2026-11-04): replaces the old daily
   *  afternoon email Mon–Fri at 4 pm, plus Saturday at 9 am. The body is
   *  ONLY: countdown label + grand-prize value + "Grand prize · Saturday
   *  5 PM", the photo slot, one bold opener, the grand prize as five
   *  bullets, a "Tomorrow · Noon" row (Mon–Thu), the entry count, the
   *  button and one hint. The countdown, values, times and the bullets
   *  come from config (lib/giveaway/emails.ts hypeEmail). */
  hype: {
    /** "4 days to the $2,838.85 grand prize" / "Tomorrow at 5 PM: …" / "Today at 5 PM: …". */
    subject: (daysLeft: number, value: string, time: string) =>
      D(daysLeft === 0 ? `Today at ${time}: the ${value} grand prize` : daysLeft === 1 ? `Tomorrow at ${time}: the ${value} grand prize` : `${daysLeft} days to the ${value} grand prize`),
    /** The countdown label over the value. */
    countdown: (daysLeft: number) => (daysLeft === 0 ? "TODAY" : daysLeft === 1 ? "TOMORROW" : `${daysLeft} DAYS`),
    /** "Grand prize · Saturday 5 PM" */
    prizeWhen: (dayName: string, time: string) => `Grand prize · ${dayName} ${time}`,
    /** c: the entrant's entries, the grand drawing's day and time, and how
     *  many drawings a friend who joins now is still in. */
    preheader: {
      mon: (c: HypeFacts) => D(`You're entered. It's drawn ${c.grandDay} at ${c.grandTime}.`),
      tue: (c: HypeFacts) => D(`A friend who joins today is in ${numberWord(c.drawingsLeft)} drawings.`),
      wed: () => D("Halfway through the week, and you're entered."),
      thu: (c: HypeFacts) => D(`One daily drawing left, then ${c.grandDay}.`),
      fri: (c: HypeFacts) => D(`Friends can still get in before ${c.grandTime} tomorrow.`),
      sat: (c: HypeFacts) => D(`You're entered with ${c.entries} ${c.entries === 1 ? "entry" : "entries"}.`),
    },
    /** One bold line, 8 words at most (lib/giveaway/hype.test.mjs). */
    opener: {
      mon: D("Day one is drawn. You're still in."),
      tue: D("Two drawings down. You're still in."),
      wed: D("Halfway through the week. Still in."),
      thu: D("One daily drawing left before Saturday."),
      fri: D("Daily drawings done. Tomorrow's the big one."),
      sat: D("Today's the day. You're entered."),
    },
    photoPlaceholder: "PRIZE PHOTO",
    photoAlt: "The grand prize",
    /** "Tomorrow · Noon" — the next daily drawing's time is from config. */
    tomorrowLabel: (time: string) => `Tomorrow · ${time.charAt(0).toUpperCase()}${time.slice(1)}`,
    /** The short partner names for the one-line "Tomorrow" prize. */
    partnerTiny: { skye: "Skye Chiropractic gift", amabel: "Amabel coaching", envision: "3 lymphatic" } as Record<string, string>,
    /** Split so the count can be bold: "You have" + "4 entries". */
    entriesLead: "You have",
    entriesCount: (n: number) => `${n} ${n === 1 ? "entry" : "entries"}`,
    button: (bonus: number) => D(`Share and get ${bonus} more entries`),
    hint: {
      daily: (bonus: number) => D(`Each friend who enters adds ${bonus} to yours.`),
      fri: (closeTime: string) => D(`Friends must enter by ${closeTime} tomorrow.`),
      sat: (closeTime: string, revealTime: string) => D(`Friends can enter until ${closeTime}. Thank-you gift arrives at ${revealTime}.`),
    },
  },

  /** 8. The reveal: thank-you + gift, to every verified, subscribed entrant (winners too). */
  thankYou: {
    subject: D("Your 10-year thank-you gift: your first visit is on us"),
    preheader: D("A free Brain Map and consultation, with your code."),
    heading: (firstName: string) => D(`${firstName ? `${firstName}, thank` : "Thank"} you.`),
    body: D("Whether or not your name was drawn, thank you for celebrating ten years with us. Here's the gift we promised: your first visit is on us."),
    /** "Our centers are open Mon, Nov 23 and Tue, Nov 24" — the days from config. */
    openDays: (days: string) => D(`Our centers are open ${days}, so you can book this week.`),
    button: D("Book my free first visit"),
  },

  /** 8b. The gift reminder (Tue Dec 1) and last call (Thu Dec 3) — P1-4. Unredeemed entrants only. */
  giftReminder: {
    subject: (bookBy: string) => D(`Your free first visit: book by ${bookBy}`),
    preheader: D("Your 10-year thank-you gift is still waiting."),
    heading: (firstName: string) => D(`${firstName ? `${firstName}, your` : "Your"} first visit is still on us.`),
    body: (bookBy: string, visitBy: string) => D(`A reminder: your free Brain Map and consultation is waiting. Book by ${bookBy}, for any day through ${visitBy}.`),
    button: D("Book my free first visit"),
  },
  giftLastCall: {
    subject: D("Booking closes Saturday — your free first visit"),
    preheader: D("Last call for your 10-year thank-you gift."),
    heading: (firstName: string) => D(`${firstName ? `${firstName}, booking` : "Booking"} closes Saturday.`),
    body: (bookBy: string, visitBy: string) => D(`Your free first visit — a Brain Map and consultation — must be booked by ${bookBy}. The visit itself can be any day through ${visitBy}.`),
    button: D("Book my free first visit"),
  },

  /** 9. Staff: winner drawn. Winners get no email of their own (Ben,
   *  2026-11-03): this alert is how a winner is reached. Staff have no
   *  admin screen; they work from this email and reply to it. */
  staffWinnerAlert: {
    subject: (dayName: string, kind: "daily" | "grand", name: string) => D(`10 years — ${dayName} ${kind === "grand" ? "GRAND PRIZE" : "winner"} — ${name}`),
    heading: (dayName: string, kind: "daily" | "grand") => D(`${dayName}'s ${kind === "grand" ? "grand prize" : ""} winner`.replace(/\s+/g, " ")),
    prize: D("Prize"),
    reach: D("Reach them"),
    reachLine: D("Today, by phone and email. They haven't been told they won. Note the time of your first attempt."),
    phone: D("Phone"),
    /** The entry form's optional "Best phone if you win" was left blank (Ben, 2026-11-06). */
    phoneNone: D("No phone given, email first."),
    noAnswer: D("No answer?"),
    /** The hours come from config (RESPONSE_WINDOW_MS). */
    noAnswerLine: (hours: number) => D(`${hours} hours after your first attempt, a new winner may be drawn. Reply to this email and Ben decides.`),
    /** The day's gift code, for a current-client winner (asked on the call). */
    giftCode: D("Current client?"),
    giftCodeLine: (code: string) => D(`Ask on the call. If so, their Brain Map becomes gift certificate ${code}, to give to someone new.`),
    taxForm: D("Tax form"),
    /** The threshold lives in config (TAX_FORM_THRESHOLD_USD), so it is not typed here. */
    taxYes: D("Required: they complete a W-9 before receiving the prize"),
    taxNo: D("Not required"),
    partner: D("Partner prize"),
    pickup: D("Pickup"),
    pickupLine: D("BrainMD bottles and Hoolest devices are picked up at a center. Nothing is shipped."),
    button: D("Email the winner"),
    /** The mailto subject staff start from. */
    mailSubject: D("You won! Harmonized Brain Centers 10-year giveaway"),
    footer: D("Reply all to this email with how it went: reached or not, accepted or declined, current client or not, and whether we may post their first name, last initial and city."),
  },
} as const;

/* ------------------------------------------------------------------ */
/* Pages and messages (Phases 1–3)                                      */
/* ------------------------------------------------------------------ */

export const PAGES = {
  /** The site-wide banner (fix list rev 2, P0-7). Never mentions the gift: non-entrants can't claim it. */
  banner: {
    label: D("10-year giveaway"),
    /** Notify-week clarity (Ben, 2026-11-09): the date entries open, and "Get reminded", never "enter". */
    notify: D("HBC turns 10! A week of prizes. Entries open Sun, Nov 15. Get reminded →"),
    live: D("HBC turns 10! Entries are open. Enter now →"),
    closed: D("Thank you for 10 years — see this week's winners →"),
    dismiss: D("Dismiss the 10-year giveaway banner"),
  },
  unsubscribe: {
    title: D("You're unsubscribed"),
    done: D("You won't get any more giveaway emails from us. If you win a drawing you've already entered, we'll still reach you about that."),
    already: D("You were already unsubscribed. Nothing more to do."),
    invalid: D("This unsubscribe link isn't valid. It may have been cut short by your email app — try copying the whole link, or reply to any of our emails and we'll take care of it."),
    unavailable: D("Unsubscribing isn't available right now. Please try again in a few minutes, or reply to any of our emails and we'll take care of it."),
    back: D("Back to the site"),
  },
  admin: {
    title: D("10-year giveaway — admin"),
    signIn: D("Sign in"),
    emailLabel: D("Work email"),
    sendCode: D("Email me a code"),
    codeSentTo: (email: string) => D(`We emailed a six-digit code to ${email}. It works for ten minutes.`),
    codeLabel: D("Code"),
    verify: D("Sign in"),
    notAllowed: D("That address isn't on the admin list."),
    badCode: D("That code didn't work. Check it and try again, or request a new one."),
    rateLimited: D("Too many tries. Wait a few minutes and try again."),
    notConfigured: D("Admin sign-in isn't configured on this deployment (GIVEAWAY_ADMINS is not set)."),
    signedInAs: D("Signed in as"),
    signOut: D("Sign out"),
    shellTitle: D("Dashboard"),
    shellBody: D("Screens arrive in Phase 3: drawings, winners, entries, exports."),
    migrationOk: D("Migration 0010 is applied: the giveaway tables answer."),
    migrationMissing: D("Migration 0010 is NOT applied yet: the giveaway tables do not answer. Paste supabase/migrations/0010_giveaway.sql into the Supabase SQL editor and run it."),
    environment: D("Environment"),
    schedule: D("Schedule (from config)"),
  },
  /** A ZIP outside ELIGIBLE_STATES (config). */
  notEligibleZip: D("Thanks for wanting in! This one's for neighbors within driving distance of our centers. If we got your ZIP wrong, check the five digits and try again."),

  /** /10years in its four modes: the hero, the form card, the prize ladder, the photos, three questions. */
  tenYears: {
    eyebrow: D("Celebrating 10 years"),
    /** The seal: "10 YEARS" over "2016–2026" (years from config and site-config). */
    sealYears: (years: number) => D(`${years} years`),
    sealSpan: (from: number, to: number) => D(`${from}–${to}`),
    /** The hero, every mode: "Celebrating 10 Years!" is the focal line, the
     *  second sentence under it (Ben, 2026-11-06). */
    heading: D("Celebrating 10 Years! A week of prizes."),
    /** Notify-me only (Ben, 2026-11-09): the gold label over the headline. "Sun, Nov 15 at 6 PM" from config. */
    comingSoon: (entriesOpenShort: string) => D(`COMING SOON · Entries open ${entriesOpenShort}`),
    /** The total is the six prizes' retail value, floored to $500 (config): "Over $5,500". */
    valueLine: (totalUsd: number) => D(`Over $${totalUsd.toLocaleString("en-US")} in prizes. One entry.`),
    valueLinePast: (totalUsd: number) => D(`Over $${totalUsd.toLocaleString("en-US")} in prizes.`),
    /** Notify-me only (Ben, 2026-11-09): "Over $5,500 in prizes, starting Sunday." The day is config's. */
    valueLineNotify: (totalUsd: number, entriesOpenDay: string) => D(`Over $${totalUsd.toLocaleString("en-US")} in prizes, starting ${entriesOpenDay}.`),
    /** The mystery-gift tease (fix list rev 2, P0-4): notify and live only. "Gift", never "prize"; never names the visit. */
    giftTeaseHero: D("Every entrant receives a 10-year thank-you gift, revealed Saturday night."),
    giftTeaseCard: (revealShort: string) => D(`Plus a thank-you gift for every entrant, revealed ${revealShort}.`),
    /** The count and the dates come from config. */
    sub: (drawings: number, span: string) => D(`${countWord(drawings)} drawings, ${span}. Enter once and you're in every one.`),
    closedSub: D("Entries are closed. Thank you, neighbors."),
    thankYouSub: D("Here's who won our anniversary week."),
    /** The slim bottom bar on phones once the form is off screen. */
    entryBarNotify: D("Remind me"),
    entryBarLive: D("Enter the giveaway"),
    /** The share preview (Open Graph). Dates and the total come from config. */
    og: {
      title: D("10 Years. A Week of Prizes."),
      description: (drawings: number, span: string) => D(`${countWord(drawings)} drawings ${span}, and a thank-you gift for every entrant.`),
      tease: D("+ a thank-you gift for every entrant"),
      /** The card's footer line: short, so it never meets the brand name. */
      foot: (drawings: number, span: string) => D(`${countWord(drawings)} drawings · ${span}`),
      years: (years: number) => D(`${years} Years`),
      value: (totalUsd: number) => D(`Over $${totalUsd.toLocaleString("en-US")} in prizes`),
    },
    /** The countdown. */
    countdownNotify: D("until entries open"),
    countdownLive: D("until the next drawing"),
    countdownUnits: { days: D("days"), hours: D("hrs"), minutes: D("min"), seconds: D("sec") },
    /** "10 years · 140,000+ sessions · Nashville & Murfreesboro" — the count is STAT_SESSIONS. */
    proofLine: (years: number, sessions: string) => D(`${years} years · ${sessions} sessions · Nashville & Murfreesboro`),
    /** The form card — notify-me (Nov 9–15). */
    /** Notify-week clarity (Ben, 2026-11-09): a reminder, plainly not the entry. */
    notifyFormTitle: D("Get reminded when it opens"),
    notifyFormLine: (entriesOpenSpoken: string) => D(`We'll email you ${entriesOpenSpoken} when entries open.`),
    notifyButton: D("Remind me when entries open"),
    /** Under the notify-me button. The day name is config's. */
    notifyNotEntry: (entriesOpenDay: string) => D(`This isn't your entry yet. Entries open ${entriesOpenDay}.`),
    /** The form card — live (Nov 15–21). */
    liveFormTitle: D("Enter the giveaway"),
    liveFormLine: (nextSpoken: string) => D(`Next drawing: ${nextSpoken}`),
    liveButton: D("Enter me"),
    refNote: D("A friend sent you. You'll both get bonus entries."),
    /** The card after a submit (Ben, 2026-11-08: the submit IS the signup or
     *  the entry; the email that follows is a copy, not a step). */
    notifySent: (entriesOpenSpoken: string) => D(`Entries open ${entriesOpenSpoken}. Come back then to enter. We'll also email you a reminder with a one-tap entry button.`),
    liveSent: D("You're entered in every drawing still to come. We've emailed you a copy with your share link."),
    liveSentEarlyBird: D("You're entered in every drawing still to come, with an early-bird bonus entry. We've emailed you a copy with your share link."),
    alreadyNotifyTitle: D("You're on the list."),
    notifyAlready: D("You're already signed up. When entries open, enter here or with the one-tap button we email you."),
    alreadyLiveTitle: D("You're already in."),
    liveAlready: D("Watch your inbox each afternoon for the next drawing."),
    /** The card after a submit, an old email link (verify) or the one tap. */
    onListTitle: D("You're on the list."),
    inTitle: D("You're in."),
    notYetTitle: D("Not yet."),
    shareLabel: D("Your share link"),
    shareLine: (referrer: number, referred: number) => D(`Each friend who enters through it adds ${referrer} entries for you and ${referred} for them.`),
    copy: D("Copy"),
    copied: D("Copied"),
    backToForm: D("Back to the form"),
    /** The card in closed and thank-you modes. */
    /** After the reveal only (P0-2): the gift, named. */
    closedCardLine: (visitBySpoken: string) => D(`Every entrant has a free first visit waiting, any day through ${visitBySpoken}.`),
    /** P1-3, closed mode after the reveal: the card leads with the gift. */
    giftTitle: D("Your 10-year thank-you gift"),
    claimGift: D("Claim my gift"),
    giftBookBy: (bookBy: string, visitBy: string) => D(`Book by ${bookBy} for a visit any day through ${visitBy}.`),
    /** After Dec 5 (thank-you mode): booking has closed, so no gift line. */
    thanksCardLine: D("Thank you for celebrating ten years with us."),
    /** Between the grand drawing and the reveal: the gift is coming, unnamed. */
    giftComing: (revealTime: string) => D(`Your thank-you gift arrives by email tonight at ${revealTime}.`),
    talk: D("Talk with our team"),
    /** The form. */
    firstName: D("First name"),
    lastName: D("Last name"),
    email: D("Email"),
    zip: D("ZIP code"),
    /** The live entry form only, optional (Ben, 2026-11-06). Never on notify-me. */
    phone: D("Best phone if you win"),
    phoneHint: D("Optional"),
    /** One box for both (age and rules); the link sits on "Official Rules". */
    ageRules: D("I'm 18+ and agree to the"),
    rulesLink: D("Official Rules"),
    marketing: D("Email me HBC news after the giveaway"),
    honeypot: D("Website"),
    errors: {
      invalid_name: D("Please add your first and last name."),
      invalid_email: D("That email address doesn't look right."),
      invalid_zip: D("Please add your five-digit ZIP code."),
      invalid_phone: D("That phone number doesn't look right. Check it, or leave it blank."),
      age: D("Please confirm you're 18 or older and agree to the Official Rules."),
      rules: D("Please confirm you're 18 or older and agree to the Official Rules."),
      rate_limited: D("Too many tries from this connection. Please wait a little and try again."),
      unavailable: D("The giveaway isn't available right now. Please try again shortly."),
      /** A submit the spam guard refused (Ben, 2026-11-09). A real visitor only sees this if the page's script never ran. */
      not_sent: D("We couldn't send that just now. Please refresh the page and try again."),
    },
    /** The button while the form waits out the spam guard's 3 seconds. */
    sending: D("Sending…"),
    /** "How it works": three steps between the hero and the ladder. Counts, days and times from config. */
    how: {
      title: D("How it works"),
      step1Title: D("Enter once."),
      step1Line: D("Fill in the form one time. You're in every drawing."),
      /** Notify-me only (Ben, 2026-11-09). "Sunday at 6 PM" from config. */
      step1TitleNotify: D("Get reminded."),
      step1LineNotify: (entriesOpenDayTime: string) => D(`Join the list now. We'll email you when entries open ${entriesOpenDayTime}.`),
      step2Title: D("Share your link."),
      step2Line: (referrerBonus: number) => D(`Each friend who enters adds ${referrerBonus} entries for you.`),
      step3Title: D("Win."),
      /** "Drawings at noon, Mon–Fri. Grand prize Saturday at 5 PM. We'll call and email you." (Ben, 2026-11-06: matches the FAQ.) */
      step3Line: (dailyTime: string, dailySpan: string, grandDay: string, grandTime: string) => D(`Drawings at ${dailyTime}, ${dailySpan}. Grand prize ${grandDay} at ${grandTime}. We'll call and email you.`),
      /** Live, a daily drawing next: "Next drawing: Tue at noon. Grand prize Saturday at 5 PM. We'll call and email you." */
      step3LineLive: (nextShort: string, grandDay: string, grandTime: string) => D(`Next drawing: ${nextShort}. Grand prize ${grandDay} at ${grandTime}. We'll call and email you.`),
      /** Live, the grand drawing next. */
      step3LineGrandNext: (grandDay: string, grandTime: string) => D(`Next: the grand prize, ${grandDay} at ${grandTime}. We'll call and email you.`),
    },
    /** The prize ladder. */
    prizesTitle: D("The prize ladder"),
    /** "Mon · noon", "Sat · 5 PM" — day and time from config. */
    cardTime: (dayAbbr: string, time: string) => D(`${dayAbbr} · ${time}`),
    grandLabel: D("Grand prize"),
    /** A card's extra lines: "+ Hoolest Mini", "+ 1 BrainMD bottle". */
    plusLine: (words: string) => D(`+ ${words}`),
    /** The value, first and largest: exactly the sum of the breakdown's lines ("$194.95"). */
    valueBig: (usd: number) => D(`$${usd.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(usd) ? 0 : 2, maximumFractionDigits: 2 })}`),
    valueWord: D("value"),
    /** The expanded card: one line per part, from config's prizeBreakdown. */
    breakdown: {
      open: D("See the value"),
      close: D("Close"),
      brainMap: D("Brain Map"),
      sessions: (n: number) => D(`${n} LENS ${n === 1 ? "session" : "sessions"}`),
      /** "Vibro chair with each session (12 × $40)" — the count and rate from config. */
      chair: (n: number, unitUsd: number) => D(`Vibro chair with each session (${n}\u00a0×\u00a0$${unitUsd})`),
      /** The card's and the phone row's short form. */
      chairShort: D("vibro chair with each session"),
      /** "3 BrainMD supplement bottles ($44.95 each)" */
      brainMd: (n: number, unitUsd: string) => D(n === 1 ? "1 BrainMD supplement bottle" : `${n} BrainMD supplement bottles (${unitUsd} each)`),
      /** "3 Assisted Lymphatic Therapy sessions… ($125 each)" */
      partnerGift: (gift: string, n: number, unitUsd: string) => D(n === 1 ? gift : `${n} ${gift} (${unitUsd} each)`),
      partnerNote: (validThrough: string | null) => D(`Redeemed directly with the partner · valid through ${validThrough ?? "TBD"}`),
      total: D("Total"),
      whatsBrainMap: D("What's a Brain Map?"),
      /** The /10years cards' expanded list (Ben, 2026-11-09): short names, the partner on a small gray
       *  second line, no "(12 × $40)" math, no "valid through". The rules page keeps the long forms above. */
      card: {
        chair: D("Vibro chair with each session"),
        brainMd: (n: number) => D(n === 1 ? "BrainMD supplement bottle" : `${n} BrainMD supplement bottles`),
        deviceSub: D("Vagus nerve stimulator"),
        partner: {
          envision: { name: (n: number) => D(`${n} lymphatic therapy sessions`), sub: D("Victoria Bailey, Envision Thermography & Wellness") as string | null },
          amabel: { name: () => D("Women's health coaching session"), sub: D("90 minutes with Amabel Luers, Be Well with Amabel. Giftable to a woman of your choice.") as string | null },
          skye: { name: () => D("Skye Chiropractic gift"), sub: null as string | null },
        },
        /** The collapsed grand card (Ben, 2026-11-09): "+ 3 more" in place of the last lines. */
        more: (n: number) => D(`${n} more`),
      },
    },
    nextTag: D("Next"),
    drawnTag: D("Drawn"),
    /** A drawn day's card, in the three public states (decision 7). */
    winnerLabel: D("Winner"),
    cardWinnerClaimed: D("Claimed ✓"),
    cardWinnerReaching: D("Drawn, we're reaching them now"),
    /** Under the ladder and the rules table (Ben, 2026-11-03). */
    prizesNote: D("Partner gifts are redeemed directly with the partner. Current clients receive a Brain Map gift certificate to give to someone new in place of their own Brain Map."),
    /** The photo strip. */
    /** recline.jpg shows the vibro-acoustic chair (Ben: our chairs don't recline). */
    photoChair: D("The vibro-acoustic chair"),
    photoChairAlt: D("A client relaxing in the vibro-acoustic chair"),
    photoRoom: D("Our Nashville center"),
    photoBrainMap: D("Your Brain Map"),
    /** "Vagus nerve stimulator by Hoolest" — the maker from config. */
    photoDevice: (by: string) => D(`Vagus nerve stimulator by ${by}`),
    /** /10years/rules: the full table and every question. */
    detailsTitle: D("Prize details & drawing times"),
    prizeHead: D("Prize"),
    valueHead: D("Value"),
    qaTitle: D("Giveaway questions"),
    allQuestions: D("All giveaway questions"),
    /** Q&A (decision 14). The page shows enter, more and win; /10years/rules shows all five. */
    qa: {
      enterQ: D("How do I enter?"),
      /** The eligibility is config's eligibilityPhrase(): "Tennessee and neighboring states (KY, …)". */
      enterA: (eligibility: string) => D(`Fill in the form and submit it. That's your entry, and it counts in every drawing still to come. We email you a copy, but you don't need to open it. Free to enter, nothing to buy. One entry per person; residents of ${eligibility}, 18 and over.`),
      /** Notify-me only, on /10years (Ben, 2026-11-09). "Sunday, Nov 15 at 6 PM" from config. The rules page keeps enterA. */
      enterANotify: (entriesOpenSpoken: string) => D(`Entries open ${entriesOpenSpoken}. The form on this page gets you a reminder email, it isn't your entry yet. Once entries open, fill in the form and submit it. That's your entry.`),
      moreQ: D("How do bonus entries work?"),
      moreA: (referrer: number, referred: number, cap: number) => D(`Share your personal link. Each friend who enters through it gives you ${referrer} more entries and gives them ${referred}, up to ${cap} friends.`),
      whenQ: D("When are the drawings?"),
      whenA: (dailyList: string, grandSpoken: string) => D(`Daily drawings at noon Central: ${dailyList}. The grand prize is drawn ${grandSpoken}, from every entry of the week.`),
      winQ: D("How will I know if I won?"),
      /** Ben's wording, verbatim (2026-11-04). The rules keep the staff sentence. */
      winA: (hours: number) => D(`Our team will reach out by email and phone soon after the drawing. If we don't hear back within ${hours} hours of our first attempt, a new winner may be drawn.`),
      /** After the reveal only (P0-2). */
      offerQ: D("What's my thank-you gift?"),
      offerA: (bookBySpoken: string, visitBySpoken: string, packageSessions: number) => D(`Everyone who enters gets a free first visit — a Brain Map and consultation — booked by ${bookBySpoken} for any day through ${visitBySpoken}. Start the in-center ${packageSessions}-session package at that visit and the ${packageSessions + 1}th session is free.`),
    },
    /** Winners list, the three states (decision 7). */
    winnersTitle: D("This week's winners"),
    winnerNamed: (day: string, label: string) => D(`${day}: ${label}`),
    winnerClaimed: (day: string) => D(`${day}'s winner: claimed ✓`),
    winnerReaching: (day: string) => D(`${day}'s winner has been drawn — we're reaching them now`),
    winnerPending: (day: string, spoken: string) => D(`${day}: drawing ${spoken}`),
    /** An old verification link (emails sent before 2026-11-08). */
    verifiedNotify: D("When entries open, enter on this page or with the one-tap button we email you."),
    verifiedEntry: (entries: number) => D(`Confirmed, with ${entries} ${entries === 1 ? "entry" : "entries"}. Your thank-you gift arrives by email Saturday night.`),
    verifyInvalid: D("That link isn't valid or has expired. You can sign up or enter with the form."),
    /** The one-tap page. */
    tapped: (earlyBird: boolean) => D(earlyBird ? "Confirmed, with an early-bird bonus entry. Your thank-you gift arrives by email Saturday night." : "Confirmed. Your thank-you gift arrives by email Saturday night."),
    tapNotOpen: D("Entries aren't open yet — this link works the moment they do."),
    tapClosed: D("Entries have closed — thank you for wanting in."),
  },
} as const;
