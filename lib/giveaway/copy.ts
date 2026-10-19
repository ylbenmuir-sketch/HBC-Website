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
 * — "Today at noon", "Monday's winner still needs a call", "Thank you", the
 * next drawing's day name in the daily subject; scripts/check-giveaway.mjs
 * — "Send me my entry link", "Enter me", "Forward this to a friend", "friend's
 * link", "with N entries", "You won Monday", "10 years — Monday winner",
 * "GRAND PRIZE", "tax form", "congratulations", "Monday's winner: claimed",
 * "already" (unsubscribe), "You're in." (subject).
 */

import { spokenCentral, type Drawing } from "./config";

export const COPY_IS_DRAFT = true;

/** The draft marker. Remove per string as Ben approves it. */
export const D = (s: string): string => (COPY_IS_DRAFT ? `[DRAFT] ${s}` : s);

export const BRAND = "Harmonized Brain Centers";
export const CAMPAIGN = "10 Years of Harmonized Brain Centers";

/** "Monday at noon", "Saturday at 5:00 pm" — read off the drawing, never typed. */
const when = (d: Drawing) => spokenCentral(d.at);

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
  chairNote: D("Every session includes the vibro chair."),
  partnerLine: (partner: string, prize: string | null) => D(prize ? `Plus from ${partner}: ${prize}.` : `Plus a prize from ${partner}.`),
  /** The offer, in one line. Sits under the "Your first visit is on us" heading, so it doesn't repeat it. */
  offerLine: (bookBySpoken: string, visitBySpoken: string) => D(`A free Brain Map and consultation. Book by ${bookBySpoken}; come in any day through ${visitBySpoken}.`),
  offerBonus: (packageSessions: number) => D(`Start the in-center ${packageSessions}-session package at that visit and the ${packageSessions + 1}th session is free.`),
  offerConcierge: D("Concierge visits: the first visit is free too. The travel fee still applies, and the package bonus is in-center only."),
  yourCode: D("Your code"),
};

/* ------------------------------------------------------------------ */
/* Emails                                                              */
/* ------------------------------------------------------------------ */

/** "Monday's prize: Brain Map + 2 sessions" / "Saturday's grand prize: …" */
const drawingPrize = (d: Drawing, prizeName: string) => `${d.dayName}'s ${d.kind === "grand" ? "grand prize" : "prize"}: ${prizeName}`;

export const EMAILS = {
  /** 1. Notify-me verification. */
  notifyVerify: {
    subject: D("Confirm your email — the 10-year giveaway"),
    preheader: D("One tap and you're on the list."),
    heading: (firstName: string) => D(`${firstName ? `${firstName}, you're` : "You're"} almost on the list.`),
    body: D("Tap the button to confirm it's you. Then, the moment entries open, you get one email with one button — and that button is your entry."),
    button: D("Confirm my email"),
    small: D("Didn't sign up? Ignore this and nothing happens."),
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

  /** 4. Entry verification (double opt-in). */
  entryVerify: {
    subject: D("Confirm your entry — the 10-year giveaway"),
    preheader: D("Tap to confirm and you're in."),
    heading: (firstName: string) => D(`${firstName ? `${firstName}, one` : "One"} more tap.`),
    body: D("Tap the button and your entry counts in every drawing still to come. Unconfirmed entries can't be drawn."),
    button: D("Confirm my entry"),
    small: D("Didn't enter? Ignore this and nothing happens."),
  },

  /** 5. "You're in" — referral link + offer (+ forward line). */
  youreIn: {
    subject: D("You're in. Here's your share link and your free first visit."),
    preheader: D("The next drawing, your share link, your free first visit."),
    heading: (firstName: string) => D(`${firstName ? `${firstName}, you` : "You"}'re in.`),
    body: (next: Drawing | null, prizeName: string | null) => D(next && prizeName ? `Next drawing: ${when(next)} — ${prizeName}. Your entry counts in it and every one after.` : "Your entry counts in every drawing still to come."),
    referredBonus: D("A friend's link brought you here, so you start with a bonus entry."),
    shareHeading: D("Add entries"),
    shareBody: (referrerBonus: number, referredBonus: number, cap: number) => D(`Share your link. Each friend who enters and confirms adds ${referrerBonus} entries for you and ${referredBonus} for them, up to ${cap} friends.`),
    shareButton: D("Share my link"),
    offerHeading: D("Your first visit is on us"),
    offerButton: D("Book my free first visit"),
  },

  /** 6. Daily afternoon (simplified, decision 15). */
  dailyAfternoon: {
    subject: (next: Drawing | null, prizeName: string | null) => D(next && prizeName ? drawingPrize(next, prizeName) : "That was the last drawing"),
    preheader: D("Today's drawing is done. Here's what's next."),
    heading: D("Today's drawing is done and the winner is being called."),
    body: (next: Drawing | null, prizeName: string | null) => D(next && prizeName ? `Next drawing: ${when(next)} — ${prizeName}.` : "That was the last drawing. Thank you for a wonderful week."),
    entries: (n: number) => D(`You have ${n} ${n === 1 ? "entry" : "entries"}. Share your link to add more.`),
    button: D("Share my link"),
  },

  /** 7. Winner. */
  winner: {
    subject: (dayName: string) => D(`You won ${dayName}'s drawing`),
    preheader: D("We'll call you. Tap to give us the best number."),
    heading: (firstName: string) => D(`${firstName ? `${firstName}, you` : "You"} won.`),
    body: (prizeName: string) => D(`Your prize: ${prizeName}.`),
    callLine: (deadlineLabel: string) => D(`We'll call to set it up. Tap below and give us the best number by ${deadlineLabel} — after that, the prize is redrawn.`),
    publicLine: D("On the call we'll ask whether we may post your first name, last initial and city on the winners list. Saying no is fine."),
    taxLine: D("Because of this prize's value, a short tax form is part of claiming it. We'll walk you through it on the call."),
    button: D("Claim my prize"),
  },

  /** 8. Non-winner thank-you + offer. */
  thankYou: {
    subject: D("Thank you — and your first visit is on us"),
    preheader: D("A free Brain Map and consultation, with your code."),
    heading: (firstName: string) => D(`${firstName ? `${firstName}, thank` : "Thank"} you.`),
    body: D("Ten years in, and this week was one of our favorites. Your name wasn't drawn, and we'd still like to meet you — so your first visit is on us."),
    button: D("Book my free first visit"),
  },

  /** 9. Staff: winner drawn. */
  staffWinnerAlert: {
    subject: (dayName: string, kind: "daily" | "grand", name: string) => D(`10 years — ${dayName} ${kind === "grand" ? "GRAND PRIZE" : "winner"} — ${name}`),
    heading: (dayName: string, kind: "daily" | "grand") => D(`${dayName}'s ${kind === "grand" ? "grand prize" : ""} winner`.replace(/\s+/g, " ")),
    callBy: D("Call by"),
    prize: D("Prize"),
    version: D("Version"),
    taxForm: D("Tax form"),
    /** The threshold lives in config (TAX_FORM_THRESHOLD_USD), so it is not typed here. */
    taxYes: D("Required — mark received in admin"),
    taxNo: D("Not required"),
    partner: D("Partner prize"),
    button: D("Open in admin"),
    footer: D("Three call attempts, one per day, voicemail each time. Mark contacted in admin after the first conversation."),
  },

  /** 10. Staff: Tuesday "call today" for Monday's winner. */
  tuesdayCallToday: {
    subject: (name: string) => D(`10 years — Monday's winner still needs a call — ${name}`),
    heading: D("Call today: Monday's winner"),
    body: D("Monday's winner hasn't been marked contacted yet. Please call this morning, then mark the row in admin."),
    button: D("Open in admin"),
  },
} as const;

/* ------------------------------------------------------------------ */
/* Pages and messages (Phases 1–3)                                      */
/* ------------------------------------------------------------------ */

export const PAGES = {
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
  nonTennesseeZip: D("Thanks for wanting in — this one's for Tennessee residents. If that's you and we got the ZIP wrong, check the five digits and try again."),

  /** /10years in its four modes: the hero, the form card, the prizes row, three questions. */
  tenYears: {
    eyebrow: D("Celebrating 10 years"),
    /** The hero, every mode. */
    heading: D("10 years. A week of giving back."),
    /** The count is the number of drawings in config. */
    sub: (drawings: number) => D(`${countWord(drawings)} drawings. One entry counts in every one.`),
    /** The span is the first to the last drawing, from config. */
    meta: (span: string) => D(`${span} · Middle Tennessee`),
    closedSub: D("Entries are closed. Thank you, Tennessee."),
    thankYouSub: D("Here's who won our anniversary week."),
    /** The form card — notify-me (Nov 9–15). */
    notifyFormTitle: D("Get your one-tap entry."),
    notifyFormLine: (entriesOpenSpoken: string) => D(`Entries open ${entriesOpenSpoken}. We'll email your link.`),
    notifyButton: D("Send me my entry link"),
    /** The form card — live (Nov 15–21). */
    liveFormTitle: D("Enter the giveaway"),
    liveFormLine: (nextSpoken: string) => D(`Next drawing: ${nextSpoken}`),
    liveButton: D("Enter me"),
    refNote: D("A friend sent you. You'll both get bonus entries."),
    /** The card after a submit, both modes. */
    sentTitle: D("Check your inbox."),
    notifySent: D("Tap the link we just sent to confirm your email. Your entry link follows when entries open."),
    liveSent: D("Tap the link we just sent to confirm your entry. Unconfirmed entries can't be drawn."),
    alreadyNotifyTitle: D("You're on the list."),
    notifyAlready: D("You're already signed up. Watch for your entry link when entries open."),
    alreadyLiveTitle: D("You're already in."),
    liveAlready: D("Watch your inbox each afternoon for the next drawing."),
    /** The card after the email link (verify) or the one tap. */
    onListTitle: D("You're on the list."),
    inTitle: D("You're in."),
    notYetTitle: D("Not yet."),
    shareLabel: D("Your share link"),
    shareLine: (referrer: number, referred: number) => D(`Each friend who enters through it adds ${referrer} entries for you and ${referred} for them.`),
    copy: D("Copy"),
    copied: D("Copied"),
    backToForm: D("Back to the form"),
    /** The card in closed and thank-you modes. */
    closedCardLine: (visitBySpoken: string) => D(`Every entrant has a free first visit waiting, any day through ${visitBySpoken}.`),
    talk: D("Talk with our team"),
    /** The form. */
    firstName: D("First name"),
    lastName: D("Last name"),
    email: D("Email"),
    zip: D("Tennessee ZIP"),
    /** One box for both (age and rules); the link sits on "Official Rules". */
    ageRules: D("I'm 18+ and agree to the"),
    rulesLink: D("Official Rules"),
    existingClient: D("I'm already an HBC client"),
    marketing: D("Email me HBC news after the giveaway"),
    honeypot: D("Website"),
    errors: {
      invalid_name: D("Please add your first and last name."),
      invalid_email: D("That email address doesn't look right."),
      invalid_zip: D("Please add your five-digit ZIP code."),
      age: D("Please confirm you're 18 or older and agree to the Official Rules."),
      rules: D("Please confirm you're 18 or older and agree to the Official Rules."),
      rate_limited: D("Too many tries from this connection. Please wait a little and try again."),
      send_failed: D("We couldn't send the confirmation email just now. Please try again in a minute."),
      unavailable: D("The giveaway isn't available right now. Please try again shortly."),
    },
    /** The prizes row. */
    prizesTitle: D("What you could win"),
    newClients: D("New clients"),
    currentClients: D("Current clients"),
    grandEyebrow: (dayName: string) => D(`${dayName} · Grand prize`),
    /** Under the grand prize; which clauses show follows the prize in config. */
    grandExtras: (device: boolean, partners: boolean) => D(device && partners ? "Plus a Hoolest device to keep and a gift from every partner." : device ? "Plus a Hoolest device to keep." : partners ? "Plus a gift from every partner." : ""),
    sessionsUnit: D("sessions"),
    keychain: D("+ Hoolest keychain"),
    nextTag: (time: string) => D(`Next · ${time}`),
    drawnTag: D("Drawn"),
    prizesNote: D("Every session includes the vibro chair. New-client prizes include a Brain Map."),
    prizesLink: D("Prize details & drawing times"),
    /** /10years/rules: the full table and every question. */
    detailsTitle: D("Prize details & drawing times"),
    newClient: D("New client"),
    currentClient: D("Current client"),
    partnerPrefix: D("Plus from"),
    qaTitle: D("Giveaway questions"),
    allQuestions: D("All giveaway questions"),
    /** Q&A (decision 14). The page shows enter, more and win; /10years/rules shows all five. */
    qa: {
      enterQ: D("How do I enter?"),
      enterA: D("Fill in the form, then tap the link in the email we send you. That's your entry, and it counts in every drawing still to come. Free to enter, nothing to buy. One entry per person; Tennessee residents 18 and over."),
      moreQ: D("How do bonus entries work?"),
      moreA: (referrer: number, referred: number, cap: number) => D(`Share your personal link. Each friend who enters and confirms gives you ${referrer} more entries and gives them ${referred}, up to ${cap} friends.`),
      whenQ: D("When are the drawings?"),
      whenA: (dailyList: string, grandSpoken: string) => D(`Daily drawings at noon Central: ${dailyList}. The grand prize is drawn ${grandSpoken}, from every entry of the week.`),
      winQ: D("How will I know if I won?"),
      winA: (hours: number) => D(`We email you the moment you're drawn, then call to arrange your prize. You have ${hours} hours to get back to us (a little longer over the weekend); after that, we draw again.`),
      offerQ: D("What's the thank-you offer?"),
      offerA: (bookBySpoken: string, visitBySpoken: string, packageSessions: number) => D(`Everyone who enters gets a free first visit — a Brain Map and consultation — booked by ${bookBySpoken} for any day through ${visitBySpoken}. Start the in-center ${packageSessions}-session package at that visit and the ${packageSessions + 1}th session is free.`),
    },
    /** Winners list, the three states (decision 7). */
    winnersTitle: D("This week's winners"),
    winnerNamed: (day: string, label: string) => D(`${day}: ${label}`),
    winnerClaimed: (day: string) => D(`${day}'s winner: claimed ✓`),
    winnerReaching: (day: string) => D(`${day}'s winner has been drawn — we're reaching them now`),
    winnerPending: (day: string, spoken: string) => D(`${day}: drawing ${spoken}`),
    /** The verification click. */
    verifiedNotify: D("When entries open, you'll get one email with one button. That button is your entry."),
    verifiedEntry: (entries: number) => D(`Confirmed, with ${entries} ${entries === 1 ? "entry" : "entries"}. Your thank-you code is in your inbox.`),
    verifyInvalid: D("That link isn't valid or has expired. Enter again below and we'll send a fresh one."),
    /** The one-tap page. */
    tapped: (earlyBird: boolean) => D(earlyBird ? "Confirmed, with an early-bird bonus entry. Your thank-you code is in your inbox." : "Confirmed. Your thank-you code is in your inbox."),
    tapNotOpen: D("Entries aren't open yet — this link works the moment they do."),
    tapClosed: D("Entries have closed — thank you for wanting in."),
    /** The claim page. */
    claimHeading: (firstName: string) => D(`${firstName}, congratulations.`),
    claimBody: (prizeName: string, deadlineLabel: string) => D(`Your prize: ${prizeName}. Give us the best number to call by ${deadlineLabel} and we'll set it up.`),
    claimPhone: D("Best number to call"),
    claimButton: D("That's my number"),
    claimDone: D("Got it. We'll call you from the center. On the call we'll ask whether we may post your first name, last initial and city."),
    claimTax: D("Because of this prize's value, a short tax form is part of claiming it — we'll walk you through it on the call."),
    claimExpired: D("The claim window for this prize has passed and the prize has been redrawn. Thank you for entering."),
    claimInvalid: D("That claim link isn't valid."),
  },
} as const;
