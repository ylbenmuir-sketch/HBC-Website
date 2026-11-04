/**
 * The Official Rules of the 10-year giveaway (fix list rev 2, P0-1): the
 * wording of Grok's official-rules-draft.md (Ben, 2026-11-03), twenty
 * numbered sections. Ben approves them himself (no counsel). Every value —
 * times, counts, caps, prices, states, the use-by date, the tax line, the
 * sponsor's addresses and phones — is read from lib/giveaway/config.ts (or
 * lib/locations.ts / lib/sms-identity.ts via the page), never typed, so the
 * rules cannot drift from the page, the emails or the drawing engine. The
 * per-drawing prize table on /10years/rules is prizeBreakdown(), not text.
 *
 * Where the draft and the config disagreed, the config wins and the
 * wording follows the code; the list is in the commit that merged the draft.
 *
 * Section 13 is the thank-you gift: the draft's neutral wording before
 * GIFT_REVEAL_AT (it never names the gift — P0-2), the gift's terms after.
 *
 * The draft's "This is a template, not legal advice." line is kept out of
 * the public page on purpose (fix list P0-1).
 *
 * Pure: no environment reads.
 */

import {
  RESPONSE_WINDOW_MS,
  DEVICES,
  PARTNER_GIFTS,
  DRAWINGS,
  EARLY_BIRD,
  ELIGIBLE_STATES,
  OFFER,
  PRIZE_USE_BY,
  RATES,
  REFERRAL,
  SCHEDULE,
  TAX_FORM_THRESHOLD_USD,
  TAX_THRESHOLD_CONFIRMED,
  centralParts,
  prizeTotalUsd,
} from "./config";

export type RulesBlock = { p: string } | { ul: string[] } | { strong: string } | { link: { before: string; label: string; href: string } };
export type RulesSection = { n: number; id: string; title: string; blocks: RulesBlock[] };

export type SponsorCenter = { name: string; address: string; phone: string | null };

export type RulesInput = {
  legalEntity: string;
  centers: SponsorCenter[];
  siteHost: string;
  contactEmail: string;
  privacyUrl: string;
  /** giftRevealed(giveawayNow()) — the real clock, never a showcase stage. */
  giftRevealed: boolean;
};

/** The all-caps line the draft opens with, above §1. */
export const NO_PURCHASE_LINE = "NO PURCHASE NECESSARY TO ENTER OR WIN. A PURCHASE OR PAYMENT OF ANY KIND WILL NOT IMPROVE YOUR CHANCES OF WINNING. VOID WHERE PROHIBITED.";

const usd = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 })}`;
const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", ...o }).format(d);
/** "Mon Nov 9, 2026, 12:00 AM" */
const ctFull = (d: Date) => `${fmt(d, { weekday: "short", month: "short", day: "numeric", year: "numeric" })}, ${fmt(d, { hour: "numeric", minute: "2-digit", hour12: true })}`;
/** "Mon Nov 16" */
const ctDay = (d: Date) => fmt(d, { weekday: "short", month: "short", day: "numeric" });
/** "12:00 PM" */
const ctTime = (d: Date) => fmt(d, { hour: "numeric", minute: "2-digit", hour12: true });
/** "May 31, 2027" */
const longDate = (d: Date) => fmt(d, { month: "long", day: "numeric", year: "numeric" });
const listOf = (items: string[], joiner = "and") => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} ${joiner} ${items[items.length - 1]}`);

/** The most entries one person can hold: base + early bird + arriving by a friend's link + the referral cap. */
export function maxEntriesPerPerson(): number {
  return 1 + EARLY_BIRD.bonusEntries + REFERRAL.referredBonus + REFERRAL.referrerBonus * REFERRAL.friendCap;
}

/** The six prizes' total ARV (one prize per drawing — Ben, 2026-11-03). */
export function totalArv(): number {
  return prizeTotalUsd();
}

/** Ben's sentence, verbatim (2026-11-03). */
export const CURRENT_CLIENT_RULE = "Current clients receive a Brain Map gift certificate to give to someone new in place of their own Brain Map.";

export function rulesSections(input: RulesInput): RulesSection[] {
  const daily = DRAWINGS.filter((d) => d.kind === "daily");
  const grand = DRAWINGS[DRAWINGS.length - 1];
  const hours = Math.round(RESPONSE_WINDOW_MS / 3_600_000);
  const year = centralParts(grand.at).year;
  const total = totalArv();
  const vd = (d: Date | null) => (d ? longDate(d) : "TBD");
  const extraWord = EARLY_BIRD.bonusEntries === 1 ? "extra entry" : "extra entries";
  const sections: Omit<RulesSection, "n">[] = [
    {
      id: "sponsor",
      title: "Sponsor",
      blocks: [
        { p: `${input.legalEntity}, doing business as Harmonized Brain Centers ("HBC" or "Sponsor"):` },
        { ul: input.centers.map((c) => `${c.name}: ${c.address}${c.phone ? `, ${c.phone}` : ""}`) },
        { p: `Questions: ${input.contactEmail}` },
      ],
    },
    {
      id: "eligibility",
      title: "Who can enter",
      blocks: [
        { p: `You can enter if you are 18 or older when you enter and a legal resident of ${listOf(ELIGIBLE_STATES.map((s) => s.name), "or")}.` },
        { p: "You can't enter if you are an employee or contractor of the Sponsor, or a member of the immediate family (spouse, parent, child, sibling) or household of one." },
        { p: "Current HBC clients can enter. The giveaway is void outside the states listed above and wherever prohibited." },
      ],
    },
    {
      id: "dates",
      title: "Dates (all times Central)",
      blocks: [
        {
          ul: [
            `Notify-me sign-ups: ${ctFull(SCHEDULE.notifyMeStart.at)} through ${ctFull(SCHEDULE.entriesOpen.at)}. Signing up here is a reminder only. It becomes an entry when you tap the entry link we email you.`,
            `Entry period: ${ctFull(SCHEDULE.entriesOpen.at)} through ${ctFull(SCHEDULE.entriesClose.at)}.`,
            `Drawings: ${ctDay(daily[0].at)} through ${ctDay(daily[daily.length - 1].at)}, at ${ctTime(daily[0].at)}${ctTime(daily[0].at) === "12:00 PM" ? " (noon)" : ""} each day. The grand prize drawing is ${ctDay(grand.at)} at ${ctTime(grand.at)}.`,
            "The Sponsor's computer clock is the official clock for this giveaway.",
          ],
        },
      ],
    },
    {
      id: "how-to-enter",
      title: "How to enter (free)",
      blocks: [
        {
          ul: [
            `Go to ${input.siteHost}/10years.`,
            "Fill in your first and last name, email and ZIP code, and agree to these rules.",
            "Tap the confirmation link in the email we send you. Your entry counts once you confirm.",
          ],
        },
        { p: "Entering is free. This online form is the free way to enter. No purchase, payment, visit or appointment is needed, and buying something will not improve your chances." },
        { p: "One person, one email address. Entries from extra email addresses, fake identities, scripts or bots are void." },
      ],
    },
    {
      id: "bonus-entries",
      title: "Bonus entries",
      blocks: [
        { p: "Your confirmed entry counts in every drawing held after you confirm, for as long as you are still eligible. Bonus entries count only in drawings held after they are added to your total." },
        {
          ul: [
            `Early-bird bonus: If you signed up for notify-me before entries opened and you confirm your entry by tapping the entry link before ${ctFull(EARLY_BIRD.before.at)}, you get ${EARLY_BIRD.bonusEntries} ${extraWord}.`,
            `Referral bonus: After you confirm, you get a personal link. Each friend who enters through your link and confirms gives you ${REFERRAL.referrerBonus} extra entries. This counts for up to ${REFERRAL.friendCap} friends, so ${REFERRAL.referrerBonus * REFERRAL.friendCap} extra entries at most.`,
            `Referred bonus: A friend who enters through your link and confirms gets ${REFERRAL.referredBonus} extra ${REFERRAL.referredBonus === 1 ? "entry" : "entries"}.`,
            "Sharing is optional. You don't have to share, post or tag anyone to enter or to win. Referring yourself, or using fake or duplicate entries, voids the bonus and may disqualify you.",
          ],
        },
        { p: `No one can hold more than ${maxEntriesPerPerson()} entries.` },
      ],
    },
    {
      id: "prizes",
      title: "Prizes and approximate retail values (ARV)",
      blocks: [
        { p: "How the values are figured:" },
        {
          ul: [
            `Brain Map: ${usd(RATES.brainMap.usd)}`,
            `LENS session: ${usd(RATES.session.usd)} each`,
            `Vibro-acoustic chair: ${usd(RATES.vibroChair.usd)} per session (with each of the grand prize's sessions)`,
            `BrainMD supplement bottle: ${usd(RATES.brainMdBottle.usd)} each (BrainMD's retail price)`,
            `${DEVICES.mini.name}: ${usd(RATES.hoolestMini.usd)}`,
            `${DEVICES.veRelief.name}: ${usd(RATES.hoolestVeRelief.usd)}`,
            ...Object.values(PARTNER_GIFTS).map((g) => `${g.gift}: ${usd(g.unitUsd)}${g.count > 1 ? " each" : ""}`),
          ],
        },
        { p: "Each drawing has one prize. The prize table at the top of this page lists every part of every prize and its value." },
        { p: `Total ARV of all six prizes: ${usd(total)}.` },
        { p: CURRENT_CLIENT_RULE },
        { strong: "Prize terms:" },
        {
          ul: [
            `Sessions and Brain Maps are for the winner's own use at an HBC center, except a Brain Map gift certificate, which is for someone new. They must be scheduled by ${longDate(PRIZE_USE_BY.at)}. They cannot be transferred.`,
            "Hoolest devices and BrainMD bottles are picked up at an HBC center (Nashville or Murfreesboro). They are not shipped. They carry only the manufacturer's warranty.",
            ...Object.values(PARTNER_GIFTS).map((g) => `${g.gift}: provided by ${g.partner} and redeemed directly with ${g.partner}, under its terms, valid through ${vd(g.validThrough)}.${g.terms ? ` ${g.terms}` : ""}`),
            "HBC is a wellness practice, not a medical clinic. Prizes are wellness services and products and are not meant to diagnose, treat, cure or prevent any condition.",
          ],
        },
      ],
    },
    {
      id: "drawings",
      title: "How winners are picked",
      blocks: [
        {
          ul: [
            "Each drawing is a random drawing run by the Sponsor's automated system at the time listed above.",
            "It draws from all eligible entries received before that drawing, and every entry has an equal chance.",
            "A daily winner can't win a later daily drawing, but stays in for the grand prize.",
            "The grand prize is drawn from all eligible entries received during the entry period.",
            "The Sponsor's decisions are final.",
          ],
        },
      ],
    },
    {
      id: "odds",
      title: "Odds",
      blocks: [{ p: "Your odds depend on how many eligible entries are received for each drawing. In any one drawing, your chance equals your entries divided by the total eligible entries in that drawing." }],
    },
    {
      id: "winners",
      title: "Notifying winners and redraws",
      blocks: [
        {
          ul: [
            // Ben's wording, verbatim (2026-11-03). Winners get no automated email.
            `HBC staff will contact the winner by phone and email. If the winner doesn't respond within ${hours} hours of our first attempt, a new winner may be drawn.`,
            "We may ask for proof of age, identity and residency.",
            "If a winner isn't eligible or declines, the prize is forfeited and a new winner may be drawn from the same pool, under the same rules.",
            "We're not responsible for emails caught by spam filters or sent to a mistyped address.",
          ],
        },
      ],
    },
    {
      id: "taxes",
      title: "Taxes",
      blocks: [
        {
          p: `Winners pay any taxes on their prizes. For prizes awarded in ${year}, the Sponsor will issue IRS Form 1099-MISC to any winner whose total prize value from the Sponsor in ${year} is ${usd(TAX_FORM_THRESHOLD_USD)} or more. That winner must complete Form W-9 before receiving the prize.${TAX_THRESHOLD_CONFIRMED ? "" : ` (Accountant to confirm the ${usd(TAX_FORM_THRESHOLD_USD)} threshold.)`}`,
        },
      ],
    },
    {
      id: "publicity",
      title: "Publicity (only with consent)",
      blocks: [{ p: "We publish a winner's first name, last initial and city only if the winner agrees when we reach them. Photos, video, testimonials and reviews need separate written consent. Winning never requires consent to publicity." }],
    },
    {
      id: "no-cash",
      title: "No cash substitution",
      blocks: [
        {
          ul: [
            "Prizes can't be exchanged for cash.",
            "Prizes can't be substituted, assigned or transferred, except by the Sponsor.",
            "If a prize becomes unavailable, the Sponsor may substitute one of equal or greater value.",
          ],
        },
      ],
    },
    giftSection(input.giftRevealed),
    {
      id: "cancel",
      title: "Right to cancel or change",
      blocks: [
        { p: "The Sponsor may cancel, suspend or change this giveaway if any of these get in the way of running it fairly:" },
        { ul: ["fraud", "technical failure", "tampering", "anything else beyond its control"] },
        { p: "If it is cancelled, the Sponsor may draw winners from eligible entries received before the cancellation. Changes will be posted on this page with a new rules version date." },
      ],
    },
    {
      id: "disqualification",
      title: "Disqualification",
      blocks: [{ p: "The Sponsor may disqualify anyone who:" }, { ul: ["tampers with entries", "uses automated entries, bots or multiple identities", "breaks these rules"] }],
    },
    {
      id: "liability",
      title: "Limitation of liability and release",
      blocks: [
        { p: "By entering, you release the Sponsor, its partners, and their owners, employees and agents from any claim arising from your entry or from accepting or using a prize, to the fullest extent the law allows." },
        { p: "The Sponsor is not responsible for:" },
        { ul: ["entries that are lost, late, incomplete or misdirected", "email or technical failures", "errors in these rules or in giveaway materials"] },
        { p: "Nothing here limits any liability that can't be limited by law." },
      ],
    },
    {
      id: "privacy",
      title: "Privacy",
      blocks: [
        { p: "We use the information you give us to run the giveaway and to send your entry, drawing and thank-you gift emails. We send HBC news only if you opt in. We don't sell your information. You can unsubscribe at any time." },
        { link: { before: "Full details:", label: "Privacy Policy", href: input.privacyUrl } },
      ],
    },
    {
      id: "social",
      title: "Social media",
      blocks: [{ p: "This promotion is in no way sponsored, endorsed or administered by, or associated with, Meta (Facebook, Instagram), Google or any other platform. You release those platforms from any liability connected with the giveaway." }],
    },
    {
      id: "law",
      title: "Governing law",
      blocks: [{ p: "Tennessee law governs these rules. Any dispute will be handled in the state or federal courts in Davidson County, Tennessee." }],
    },
    {
      id: "winners-list",
      title: "Winners list",
      blocks: [
        {
          p: `For a list of prizes awarded, email ${input.contactEmail} with the subject "HBC 10-Year Winners", or write to the ${input.centers[0]?.name ?? "Nashville"} address above, by ${longDate(SCHEDULE.winnersListRequestBy.at)}. The list includes each winner's city, plus the first name and last initial of winners who agreed to publicity.`,
        },
      ],
    },
  ];
  return sections.map((s, i) => ({ ...s, n: i + 1 }));
}

/** §13. The draft's neutral wording until the reveal; the gift's terms after it. */
function giftSection(revealed: boolean): Omit<RulesSection, "n"> {
  const neutral = "Separately from this giveaway, the Sponsor plans to send a thank-you gift to verified entrants after the final drawing. It is not a prize, doesn't depend on winning, and has no effect on the odds. Details come by email.";
  if (!revealed) return { id: "thank-you-gift", title: "Thank-you gift", blocks: [{ p: neutral }] };
  const date = (d: Date) => fmt(d, { month: "long", day: "numeric" });
  return {
    id: "thank-you-gift",
    title: "Thank-you gift",
    blocks: [
      { p: neutral },
      {
        p: `The gift is a free first visit — a Brain Map and consultation, normally ${usd(OFFER.normallyUsd)} — booked with the entrant's code by ${date(OFFER.bookBy.at)} for a visit on any day through ${date(OFFER.visitBy.at)}. One code per entrant, used once. Starting the in-center ${OFFER.packageSessions}-session package at that visit adds a ${OFFER.packageSessions + 1}th session free; Concierge visits are free too, but the travel fee still applies and the package bonus is in-center only. Visits are subject to appointment availability at each center.`,
      },
    ],
  };
}

/** Every word of the rules as plain text (tests, previews). */
export function rulesText(sections: RulesSection[]): string {
  return sections
    .map((s) => [`${s.n}. ${s.title}`, ...s.blocks.map((b) => ("p" in b ? b.p : "strong" in b ? b.strong : "link" in b ? `${b.link.before} ${b.link.label} (${b.link.href})` : b.ul.join("\n")))].join("\n"))
    .join("\n\n");
}
