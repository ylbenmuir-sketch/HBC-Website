/**
 * Resources / learning center (resources.html). The homework-battles article
 * is seeded from article.html; the other five carry [Draft…] placeholder
 * bodies until written — every card keeps its exact mockup copy.
 */

export type ArticleBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "blockquote"; text: string }
  | { type: "note"; text: string };

export type Resource = {
  slug: string;
  tag: string;
  title: string;
  crumbLabel: string;
  excerpt: string;
  image?: { src: string; position: string };
  plateSpec?: string;
  readTime: string;
  byline: string;
  lede: string;
  body: ArticleBlock[];
  finalHeading: string;
  finalSub: string;
  metaDescription: string;
};

const STANDARD_NOTE =
  "This article is educational and isn't medical advice. LENS is a wellness service and doesn't diagnose or treat any condition. If you're concerned about your child, talk with their pediatrician.";

const ADULT_NOTE =
  "This article is educational and isn't medical advice. LENS is a wellness service and doesn't diagnose or treat any condition. If you have health concerns, talk with your doctor.";

const DRAFT_FINAL_SUB =
  "Tell us what’s going on. We’ll listen, answer honestly, and help you decide whether LENS is a fit — free, and with no obligation.";

export const resources: Resource[] = [
  {
    slug: "homework-battles",
    tag: "For parents",
    title: "Homework battles: what's really happening in a stuck brain",
    crumbLabel: "Homework battles",
    excerpt: "Why “try harder” backfires — and what helps instead.",
    image: { src: "/images/child-session.jpg", position: "60% 30%" },
    readTime: "6 min read",
    byline:
      "By [Practitioner name] · Reviewed by Sheri [Last name], Clinical Director · [Month Year]",
    lede: "Your child is bright. You know it, their teacher knows it — and yet a worksheet that should take twenty minutes just consumed the whole evening and everyone's patience. Here's what's often happening underneath, and why “try harder” tends to make it worse.",
    body: [
      { type: "h2", text: "It usually isn't a motivation problem" },
      {
        type: "p",
        text: "[Body copy — 2–3 paragraphs in plain, non-clinical language. Cite sources where claims are made; keep the no-hype standard.]",
      },
      {
        type: "blockquote",
        text: "A brain stuck in high alert can't also be a brain that plans, sequences, and follows through. Those systems take turns.",
      },
      { type: "h2", text: "What tends to help" },
      {
        type: "p",
        text: "[Body copy — practical guidance first, LENS mentioned honestly as one gentle option among several, with the standard wellness disclaimer.]",
      },
      { type: "note", text: STANDARD_NOTE },
    ],
    finalHeading: "Wondering whether this describes your child? Ask us.",
    finalSub:
      "A free conversation with a practitioner — honest answers, no pressure, and a plain “not a fit” if that’s the truth.",
    metaDescription:
      "Why “try harder” backfires for bright kids stuck in homework battles — and what helps instead. A plain-language guide for parents.",
  },
  {
    slug: "exhausted-after-eight-hours",
    tag: "Sleep",
    title: "Why you're exhausted after eight hours of sleep",
    crumbLabel: "Exhausted after eight hours",
    excerpt:
      "Sleep quantity isn't sleep quality. A plain-language look at a wired-but-tired nervous system.",
    image: { src: "/images/relax.jpg", position: "center 40%" },
    readTime: "5 min read",
    byline:
      "By [Practitioner name] · Reviewed by Sheri [Last name], Clinical Director · [Month Year]",
    lede: "[Draft lede — sleep quantity isn't sleep quality; what a wired-but-tired nervous system looks like from the inside.]",
    body: [
      {
        type: "p",
        text: "[Draft article — plain, non-clinical language. Cite sources where claims are made; keep the no-hype standard.]",
      },
      { type: "note", text: ADULT_NOTE },
    ],
    finalHeading: "The next step is a conversation, not a commitment.",
    finalSub: DRAFT_FINAL_SUB,
    metaDescription:
      "Sleep quantity isn't sleep quality. A plain-language look at a wired-but-tired nervous system.",
  },
  {
    slug: "lens-vs-traditional-neurofeedback",
    tag: "How it works",
    title: "LENS vs. traditional neurofeedback: an honest comparison",
    crumbLabel: "LENS vs. traditional neurofeedback",
    excerpt: "Active training vs. passive feedback — and who tends to prefer which.",
    image: { src: "/images/glass-head.jpg", position: "center 40%" },
    readTime: "6 min read",
    byline:
      "By [Practitioner name] · Reviewed by Sheri [Last name], Clinical Director · [Month Year]",
    lede: "[Draft lede — active training vs. passive feedback, explained without jargon or salesmanship.]",
    body: [
      {
        type: "p",
        text: "[Draft article — an honest comparison; keep the no-hype standard and note where each approach tends to fit.]",
      },
      { type: "note", text: ADULT_NOTE },
    ],
    finalHeading: "The next step is a conversation, not a commitment.",
    finalSub: DRAFT_FINAL_SUB,
    metaDescription:
      "Active training vs. passive feedback — an honest comparison of LENS and traditional neurofeedback.",
  },
  {
    slug: "bad-at-school",
    tag: "For parents",
    title: "When a bright kid starts saying “I'm just bad at school”",
    crumbLabel: "“Bad at school”",
    excerpt: "The self-story problem — and how to interrupt it early.",
    plateSpec: "Parent and teen talking at kitchen table — candid",
    readTime: "5 min read",
    byline:
      "By [Practitioner name] · Reviewed by Sheri [Last name], Clinical Director · [Month Year]",
    lede: "[Draft lede — the self-story problem: what happens when effort stops paying off and a child starts narrating themselves as the problem.]",
    body: [
      {
        type: "p",
        text: "[Draft article — practical guidance for parents; keep the no-hype standard.]",
      },
      { type: "note", text: STANDARD_NOTE },
    ],
    finalHeading: "Wondering whether this describes your child? Ask us.",
    finalSub:
      "A free conversation with a practitioner — honest answers, no pressure, and a plain “not a fit” if that’s the truth.",
    metaDescription:
      "The self-story problem — what to do when a bright kid starts saying “I'm just bad at school,” and how to interrupt it early.",
  },
  {
    slug: "brain-fog-after-55",
    tag: "Adults 55+",
    title: "Brain fog after 55: what's normal, what's worth attention",
    crumbLabel: "Brain fog after 55",
    excerpt:
      "A calm, non-alarmist guide to cognitive change — and when to talk to your doctor.",
    image: { src: "/images/ear-clip-senior.jpg", position: "center 45%" },
    readTime: "7 min read",
    byline:
      "By [Practitioner name] · Reviewed by Sheri [Last name], Clinical Director · [Month Year]",
    lede: "[Draft lede — a calm, non-alarmist guide to cognitive change after 55, and when it's worth a conversation with your doctor.]",
    body: [
      {
        type: "p",
        text: "[Draft article — non-alarmist, sourced, and clear about when to seek medical evaluation. Keep the no-hype standard.]",
      },
      { type: "note", text: ADULT_NOTE },
    ],
    finalHeading: "The next step is a conversation, not a commitment.",
    finalSub: DRAFT_FINAL_SUB,
    metaDescription:
      "A calm, non-alarmist guide to brain fog after 55 — what's normal, what's worth attention, and when to talk to your doctor.",
  },
  {
    slug: "what-the-equipment-does",
    tag: "How it works",
    title: "What the equipment actually does (and doesn't do)",
    crumbLabel: "The equipment",
    excerpt: "A tour of the LENS system — sensors, signals, and safety.",
    image: { src: "/images/lens-device.jpg", position: "center" },
    readTime: "5 min read",
    byline:
      "By [Practitioner name] · Reviewed by Sheri [Last name], Clinical Director · [Month Year]",
    lede: "[Draft lede — a plain tour of the LENS system: what the sensors read, what the feedback signal is, and what the equipment never does.]",
    body: [
      {
        type: "p",
        text: "[Draft article — sensors, signals, and safety, explained without jargon. Keep the no-hype standard.]",
      },
      { type: "note", text: ADULT_NOTE },
    ],
    finalHeading: "The best way to understand LENS is to talk with someone who does it every day.",
    finalSub: DRAFT_FINAL_SUB,
    metaDescription:
      "A tour of the LENS system — what the sensors read, what the feedback signal is, and what the equipment never does.",
  },
];

export function getResource(slug: string): Resource | undefined {
  return resources.find((r) => r.slug === slug);
}
