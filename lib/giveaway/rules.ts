/**
 * The Official Rules of the 10-year giveaway, as numbered sections (fix
 * list rev 2, P0-1). Ben approves these words himself (no counsel — Ben,
 * 2026-11-03). Every fact in them — times, counts, caps, prices, states,
 * the use-by date, the tax line — is read from lib/giveaway/config.ts, so
 * the rules cannot drift from the page, the emails or the drawing engine.
 * The prize table on /10years/rules is built from the same config
 * (prizeBreakdown), not from this file.
 *
 * Section 13 is the thank-you gift. Before GIFT_REVEAL_AT it is one neutral
 * line that never names the gift (P0-2); from the reveal on it carries the
 * gift's terms.
 *
 * Pure: no environment reads. The page passes the identity strings and
 * whether the gift is revealed.
 */

import {
  CLAIM_MOVED_DEADLINE_HOUR_CT,
  CLAIM_WINDOW_MS,
  DEVICES,
  DRAWINGS,
  ELIGIBLE_STATES,
  GIFT_REVEAL_AT,
  OFFER,
  PRIZES,
  PRIZE_USE_BY,
  RATES,
  REFERRAL,
  SCHEDULE,
  TAX_FORM_THRESHOLD_USD,
  TAX_THRESHOLD_CONFIRMED,
  prizeRetailUsd,
  spokenCentralDateTime,
} from "./config";

export type RulesSection = { n: number; id: string; title: string; paras: string[]; list?: string[] };

export type RulesInput = {
  legalEntity: string;
  dbaSentence: string;
  addressLine: string;
  siteHost: string;
  contactEmail: string;
  /** giftRevealed(giveawayNow()) — the real clock, never a showcase stage. */
  giftRevealed: boolean;
};

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;
const longDate = (d: Date) => new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(d);
const listOf = (items: string[]) => (items.length < 2 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`);

/** The most entries one person can hold: base + early bird + arriving by a friend's link + the referral cap. */
export function maxEntriesPerPerson(): number {
  return 1 + 1 + REFERRAL.referredBonus + REFERRAL.referrerBonus * REFERRAL.friendCap;
}

/** The week's total ARV, smallest (all current-client versions) and largest (all new-client). */
export function arvRange(): { min: number; max: number } {
  const sum = (v: "new_client" | "current_client") => PRIZES.filter((p) => p.version === v).reduce((t, p) => t + prizeRetailUsd(p), 0);
  return { min: sum("current_client"), max: sum("new_client") };
}

export function rulesSections(input: RulesInput): RulesSection[] {
  const first = DRAWINGS[0];
  const grand = DRAWINGS[DRAWINGS.length - 1];
  const states = listOf(ELIGIBLE_STATES.map((s) => s.name));
  const hours = Math.round(CLAIM_WINDOW_MS / 3_600_000);
  const moved = `${CLAIM_MOVED_DEADLINE_HOUR_CT % 12 || 12}:00 ${CLAIM_MOVED_DEADLINE_HOUR_CT < 12 ? "AM" : "PM"} CT`;
  const { min, max } = arvRange();
  const keychainPriced = RATES.hoolestKeychain.usd != null;
  const sections: Omit<RulesSection, "n">[] = [
    {
      id: "sponsor",
      title: "Sponsor",
      paras: [`The giveaway is sponsored by ${input.legalEntity}, doing business as Harmonized Brain Centers ("Sponsor"), ${input.addressLine}. ${input.dbaSentence}`],
    },
    {
      id: "no-purchase",
      title: "No purchase necessary",
      paras: ["No purchase or payment of any kind is necessary to enter or win. A purchase or payment will not improve your chances of winning. Void where prohibited."],
    },
    {
      id: "eligibility",
      title: "Who may enter",
      paras: [
        `Open to legal residents of ${states} who are 18 or older when they enter. The ZIP code you give must be in one of those states.`,
        "Employees and contractors of Sponsor, and the members of their immediate families and households, may not enter. Current clients of Sponsor may enter; they are eligible for the current-client version of each prize.",
      ],
    },
    {
      id: "entry-period",
      title: "Entry period",
      paras: [
        `Sign-ups from ${SCHEDULE.notifyMeStart.ct} until entries open are requests to be emailed an entry link; they are not entries.`,
        `Entries open ${SCHEDULE.entriesOpen.ct} and close ${SCHEDULE.entriesClose.ct}. Sponsor's computer clock is the official clock.`,
      ],
    },
    {
      id: "how-to-enter",
      title: "How to enter",
      paras: [
        `Fill in the form at ${input.siteHost}/10years with your name, email address and ZIP code, say whether you are a new or current client, and confirm you are 18 or older and agree to these rules. Then tap the link in the email we send you. An entry counts only once its email address is confirmed.`,
        "One person, one email address. Entries made with more than one email address, by automated means, or with false information are void.",
      ],
    },
    {
      id: "bonus-entries",
      title: "Bonus entries",
      paras: [
        `Early bird: confirm your entry before the first drawing (${first.ct}) and you receive one bonus entry.`,
        `Friends: each confirmed entrant gets a personal share link. Each friend who enters through your link and confirms adds ${REFERRAL.referrerBonus} entries for you and ${REFERRAL.referredBonus} for them. Bonus entries for friends stop after ${REFERRAL.friendCap} friends, so no one can hold more than ${maxEntriesPerPerson()} entries. Referring yourself, or entries made up to collect bonuses, voids the bonus entries involved.`,
      ],
    },
    {
      id: "drawings",
      title: "Drawings and odds",
      paras: [
        `Sponsor holds ${DRAWINGS.length} drawings, all times Central:`,
        `Each winner is chosen at random by computer from every eligible, confirmed entry received before that drawing. The selection is recorded so it can be re-checked. A person who wins a daily drawing is not eligible for later daily drawings but stays eligible for the grand prize, which is drawn from every eligible entry of the week. The odds of winning depend on the number of eligible entries.`,
      ],
      list: DRAWINGS.map((d) => `${d.dayName}${d.kind === "grand" ? " (grand prize)" : ""}: ${d.ct}`),
    },
    {
      id: "prizes",
      title: "Prizes and their value",
      paras: [
        "The table above lists each drawing's prize in both versions, with every part and its approximate retail value (ARV). The version a winner receives follows the new-or-current-client answer given at entry; Sponsor may check it against its records.",
        `Values: a Brain Map is ${usd(RATES.brainMap.usd ?? 0)}, a LENS session is ${usd(RATES.session.usd ?? 0)}, and every prize session includes the vibro chair at ${usd(RATES.vibroChair.usd ?? 0)} per session — Sponsor's standard prices. The ${DEVICES.handheld.name.toLowerCase()} by ${DEVICES.handheld.by} is ${usd(RATES.hoolestHandheld.usd ?? 0)}, ${DEVICES.handheld.by}'s published retail price.${keychainPriced ? "" : ` The ${DEVICES.keychain.name.toLowerCase()} by ${DEVICES.keychain.by}'s value is to be determined and is not counted in any total.`}`,
        `The total ARV of the six prizes is ${usd(min)} if every winner is a current client and ${usd(max)} if every winner is new. Partner prizes are to be determined; if one is added, these rules will be updated with its description and value before its drawing, and partner prizes are not counted in any total.`,
      ],
    },
    {
      id: "prize-conditions",
      title: "Prize conditions",
      paras: [
        `Brain Maps and sessions are provided at Sponsor's Nashville or Murfreesboro center, by appointment, and must be used by ${longDate(PRIZE_USE_BY.at)}. Anything unused by then is forfeited.`,
        "Prizes cannot be transferred, sold or exchanged for cash. Sponsor may substitute a prize of equal or greater value if a prize becomes unavailable. Sessions are subject to Sponsor's standard intake. Prizes are described by what they contain; Sponsor makes no claim about any health outcome.",
      ],
    },
    {
      id: "winners",
      title: "Winner notification and claim",
      paras: [
        `Winners are notified by email, at the address used to enter. To claim, a winner taps the link in that email and gives the best phone number to reach them within ${hours} hours of the drawing; a deadline that would fall on a Sunday or Monday moves to the following Tuesday at ${moved}. Sponsor then calls to arrange the prize.`,
        "A winner who does not respond by the deadline, cannot be reached, or is found ineligible forfeits the prize, and an alternate winner is drawn from the same drawing's entries.",
      ],
    },
    {
      id: "taxes",
      title: "Taxes",
      paras: [
        `Winners are responsible for any taxes on their prizes. If the prizes Sponsor awards one person in ${grand.at.getUTCFullYear()} total ${usd(TAX_FORM_THRESHOLD_USD)} or more in ARV, that person must complete IRS Form W-9 before the prize is provided, and Sponsor will issue IRS Form 1099.${TAX_THRESHOLD_CONFIRMED ? "" : " Accountant to confirm."}`,
      ],
    },
    {
      id: "publicity",
      title: "Publicity",
      paras: ["Sponsor publishes a winner's first name, last initial and city only with the winner's consent, asked on the claim call. Saying no does not affect the prize."],
    },
    giftSection(input.giftRevealed),
    {
      id: "privacy",
      title: "Your information",
      paras: [
        `Sponsor uses the information you give to run the giveaway: to confirm your entry, email you about the drawings, and reach you if you win. Sponsor emails you about other news only if you tick the box asking for it, and never shares your information for anyone else's marketing. Every giveaway email has an unsubscribe link. See ${input.siteHost}/privacy-policy.`,
      ],
    },
    {
      id: "general",
      title: "General conditions",
      paras: [
        "Sponsor may disqualify anyone who tampers with the entry process or breaks these rules, and may cancel, pause or change the giveaway if fraud, a technical failure or anything else beyond its control affects it, awarding prizes from the eligible entries received before then. Sponsor is not responsible for entries or emails that are lost, late or misdirected.",
        "By entering, you agree to these rules and to Sponsor's decisions, which are final. By accepting a prize, a winner releases Sponsor from liability for any loss arising from the prize or the giveaway, except where the law does not allow it.",
        "These rules are governed by the laws of the State of Tennessee.",
      ],
    },
    {
      id: "winners-list",
      title: "Winners list",
      paras: [`The winners who agreed to it are listed at ${input.siteHost}/10years after the drawings. For the list, or with any question about these rules, email ${input.contactEmail}.`],
    },
  ];
  return sections.map((s, i) => ({ ...s, n: i + 1 }));
}

/** §13. Neutral until the reveal; the gift's terms after it. */
function giftSection(revealed: boolean): Omit<RulesSection, "n"> {
  const neutral = `Every entrant whose entry is confirmed also receives a 10-year thank-you gift from Sponsor, announced by email ${spokenCentralDateTime(GIFT_REVEAL_AT)} CT. The gift is not a prize: it is not awarded by chance and does not affect anyone's chance of winning.`;
  if (!revealed) return { id: "thank-you-gift", title: "Thank-you gift", paras: [neutral] };
  const date = (d: Date) => new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", month: "long", day: "numeric" }).format(d);
  return {
    id: "thank-you-gift",
    title: "Thank-you gift",
    paras: [
      neutral,
      `The gift is a free first visit — a Brain Map and consultation, normally ${usd(OFFER.normallyUsd)} — booked with the entrant's code by ${date(OFFER.bookBy.at)} for a visit on any day through ${date(OFFER.visitBy.at)}. One code per entrant, used once. Starting the in-center ${OFFER.packageSessions}-session package at that visit adds a ${OFFER.packageSessions + 1}th session free; Concierge visits are free too, but the travel fee still applies and the package bonus is in-center only. Visits are subject to appointment availability at each center.`,
    ],
  };
}
