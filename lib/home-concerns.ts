import type { ConcernChip } from "./analytics";
import { getConcern } from "./concerns";

/**
 * The homepage's "What brings you in?" cards (Ben, 2026-11-22): two tabs,
 * each a short list of concern cards linking to the existing concern pages.
 *
 * Nothing on a card is written here. The name is the concern's own `title`
 * and the one line under it is cut from that page's own intro (`heroSub` in
 * lib/concerns.ts), so a card cannot say something its page does not:
 *
 * - `full`     the whole intro sentence
 * - `toDash`   the intro up to its first em dash, closed with a full stop
 * - `two`      the intro's first two sentences (depression, whose intro is
 *              a paragraph)
 *
 * In every case the intro's opening "LENS neurofeedback for …" is read as
 * "For …" — six cards in a row cannot each open on the same three words.
 * lib/home-concerns.test.mjs holds every line to its source.
 *
 * `chip` is the fixed label `concern_chip_click` reports (lib/analytics.ts
 * → CONCERN_CHIPS): the cards took the hero chips' place and keep their
 * event and their values.
 */
type Take = "full" | "toDash" | "two";
export type HomeConcernIcon =
  | "anxiety"
  | "stress"
  | "mood"
  | "focus"
  | "sleep"
  | "fog"
  | "school"
  | "regulation";

type Entry = { slug: string; take: Take; chip: ConcernChip; icon: HomeConcernIcon };

const ENTRIES = {
  anxiety: { slug: "anxiety", take: "toDash", chip: "Anxiety", icon: "anxiety" },
  stress: { slug: "stress-resilience", take: "full", chip: "Stress", icon: "stress" },
  depression: { slug: "depression", take: "two", chip: "Depression", icon: "mood" },
  focus: { slug: "focus-adhd", take: "toDash", chip: "Focus & ADHD", icon: "focus" },
  sleep: { slug: "sleep", take: "full", chip: "Sleep", icon: "sleep" },
  brainFog: { slug: "brain-fog", take: "full", chip: "Brain fog", icon: "fog" },
  school: { slug: "children-school", take: "toDash", chip: "Children & school", icon: "school" },
  regulation: { slug: "emotional-regulation", take: "toDash", chip: "Emotional regulation", icon: "regulation" },
} as const satisfies Record<string, Entry>;

const LEAD = "LENS neurofeedback for ";

/** The card's one line, cut from the concern page's own intro. */
export function concernCardLine(heroSub: string, take: Take): string {
  const text = heroSub.startsWith(LEAD) ? `For ${heroSub.slice(LEAD.length)}` : heroSub;
  if (take === "toDash") {
    const cut = text.split(" — ")[0];
    return /[.!?]$/.test(cut) ? cut : `${cut}.`;
  }
  if (take === "two") {
    const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
    return sentences.slice(0, 2).join("").trim();
  }
  return text;
}

export type HomeConcernCard = {
  slug: string;
  title: string;
  href: string;
  line: string;
  chip: ConcernChip;
  icon: HomeConcernIcon;
};

function card(entry: Entry): HomeConcernCard {
  const concern = getConcern(entry.slug);
  if (!concern) throw new Error(`home concern card: no concern "${entry.slug}"`);
  return {
    slug: concern.slug,
    title: concern.title,
    href: `/concerns/${concern.slug}`,
    line: concernCardLine(concern.heroSub, entry.take),
    chip: entry.chip,
    icon: entry.icon,
  };
}

export type HomeConcernGroup = {
  id: "adults" | "children";
  label: string;
  photo: { src: string; alt: string; position: string };
  cards: HomeConcernCard[];
  /** One plain link under the group's cards, to the page for that audience. */
  link?: { href: string; label: string };
};

export const HOME_CONCERN_GROUPS: HomeConcernGroup[] = [
  {
    id: "adults",
    label: "For adults",
    // The photo and its alt as /first-visit carries them.
    photo: {
      src: "/images/checkin.jpg",
      alt: "A warm check-in conversation at a Harmonized center",
      position: "74% 30%",
    },
    cards: [
      ENTRIES.anxiety,
      ENTRIES.stress,
      ENTRIES.depression,
      ENTRIES.focus,
      ENTRIES.sleep,
      ENTRIES.brainFog,
    ].map(card),
  },
  {
    id: "children",
    label: "For children & families",
    // The photo and its alt as the homepage's family row carried them.
    photo: {
      src: "/images/child-session.jpg",
      alt: "A child relaxing during a LENS session",
      position: "60% 30%",
    },
    cards: [ENTRIES.school, ENTRIES.focus, ENTRIES.regulation, ENTRIES.sleep].map(card),
    // The live homepage's link to the children's page, in its own words
    // (Ben, 2026-11-23): the restructure had dropped it from the body.
    link: { href: "/children-families", label: "How we work with children" },
  },
];

/**
 * The "More we help with" row under the tabs (Ben, 2026-11-22): the four
 * concern pages that have no card, so each keeps a link from the homepage
 * body. A link's words are that concern's own short name (`shortTitle` in
 * lib/concerns.ts — the name the footer and the menus use), never typed
 * here. `chip` is the label concern_chip_click reports, as for the cards.
 */
export type HomeConcernLink = { slug: string; label: string; href: string; chip: ConcernChip };

const MORE: { slug: string; chip: ConcernChip }[] = [
  { slug: "concussion", chip: "Concussion" },
  { slug: "migraines", chip: "Migraines" },
  { slug: "trauma", chip: "Trauma-related stress" },
  { slug: "performance", chip: "Performance" },
];

export const HOME_MORE_CONCERNS: HomeConcernLink[] = MORE.map(({ slug, chip }) => {
  const concern = getConcern(slug);
  if (!concern) throw new Error(`home concern link: no concern "${slug}"`);
  return { slug: concern.slug, label: concern.shortTitle, href: `/concerns/${concern.slug}`, chip };
});
