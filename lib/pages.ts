import type { Metadata } from "next";
import type { Crumb } from "./schema";
import { FOUNDER_DISPLAY_NAME, STAT_SESSIONS, verifiedOr } from "./site-config";

/**
 * The static pages, as records — the way lib/concerns.ts, lib/locations.ts
 * and lib/resources.ts already hold the dynamic ones.
 *
 * Four readers, one source: each page's `metadata` (via `pageMetadata`),
 * the WebPage node in its JSON-LD graph (components/PageSchema.tsx), the
 * sitemap's `lastmod` (app/sitemap.ts), and /llms.txt. Before this, the
 * title and description lived in sixteen page files and the sitemap stamped
 * thirty URLs with one constant date (SEO-AUDIT-3 §2.4, A10).
 *
 * ## `dateModified` is a content date, bumped by hand
 *
 * The day the page's *copy* last changed — not the day the code did, and
 * never the build date. Google uses `lastmod` only while it stays
 * "consistently and verifiably accurate", so a date that moves when nothing
 * a reader can see has moved is worse than none. The initial values were
 * taken from git: the last commit that touched the page, or the data file
 * it renders, whichever is later. **When you edit a page's words, bump its
 * date here in the same commit.** The dynamic records carry their own —
 * `dateModified` on each concern and location, `lastChanged()` on articles.
 *
 * ## Titles
 *
 * `title` is what the root template wraps (" — Harmonized Brain Centers")
 * unless `absoluteTitle` is set, in which case it is the whole <title>. The
 * reasoning that used to sit beside each title in its page file is kept
 * beside it here.
 */

export type PageType =
  | "WebPage"
  | "AboutPage"
  | "ContactPage"
  | "CollectionPage"
  | "FAQPage"
  | "ProfilePage";

export type StaticPage = {
  path: string;
  /** The <title>, or the part the template wraps — see `absoluteTitle`. */
  title: string;
  /** True when `title` is the whole <title>, brand suffix and all. */
  absoluteTitle?: boolean;
  description: string;
  /** ISO date the copy on this page last changed. Bump it by hand. */
  dateModified: string;
  /** schema.org type of the page's WebPage node. */
  type: PageType;
  /** Breadcrumb label, for the routes that render a trail. */
  crumb: string;
};

const sessionCount = verifiedOr(STAT_SESSIONS);

export const staticPages: StaticPage[] = [
  {
    path: "/",
    // Category + geography first — the exact `neurofeedback therapy` target
    // and both city names, 53 characters. The H1 is a conversion asset and
    // it isn't the title's job to match it. "Therapy" stays by Ben's
    // decision (Oct 2026): it is the head term and names the modality, not
    // the practice; the FAQ answer was reworded to agree (lib/faq.ts).
    title: "Neurofeedback Therapy in Nashville & Murfreesboro, TN",
    absoluteTitle: true,
    description:
      "Help for anxiety, focus, and sleep without medication — gentle LENS neurofeedback for adults and kids across Middle Tennessee.",
    dateModified: "2026-10-10",
    type: "WebPage",
    crumb: "Home",
  },
  {
    path: "/what-we-help-with",
    title: "What We Help With",
    description:
      "The concerns that most often bring adults and children to Harmonized Brain Centers — described the way real families describe them. No diagnosis needed.",
    dateModified: "2026-10-10",
    type: "CollectionPage",
    crumb: "What We Help With",
  },
  {
    path: "/adults",
    title: "Neurofeedback for Adults",
    // 156 chars. "and resilience" is what went: the list was running past
    // 160, and /concerns/stress-resilience is the page that owns that word.
    description:
      "Gentle LENS neurofeedback for adults — anxiety and stress, focus, sleep, brain fog, and emotional regulation. Short sessions, nothing to practice, no homework.",
    dateModified: "2026-10-10",
    type: "CollectionPage",
    crumb: "For adults",
  },
  {
    path: "/children-families",
    // Absolute, like the concern and location templates: the title opens
    // "Neurofeedback for …" and identifies itself, og:site_name carries the
    // brand, and the 27-character suffix was the only thing putting it over
    // 60. 34 chars.
    title: "Neurofeedback for Children & Teens",
    absoluteTitle: true,
    // 150 chars. "children and teens" keeps it distinct from
    // /concerns/children-school.
    description:
      "Gentle LENS neurofeedback for children and teens — homework battles, meltdowns, hard transitions, sensory overwhelm. Nothing a child has to get right.",
    dateModified: "2026-10-10",
    type: "CollectionPage",
    crumb: "Children & families",
  },
  {
    path: "/lens-neurofeedback",
    title: "LENS Neurofeedback",
    description:
      "LENS — the Low Energy Neurofeedback System — a gentle, passive wellness service at our Nashville and Murfreesboro centers. What it is, and who it's for.",
    dateModified: "2026-10-10",
    type: "WebPage",
    crumb: "LENS neurofeedback",
  },
  {
    path: "/how-lens-works",
    title: "How LENS Neurofeedback Works",
    description:
      "LENS stands for Low Energy Neurofeedback System. The whole idea without the jargon — and exactly what a session feels like from the chair.",
    dateModified: "2026-08-23",
    type: "WebPage",
    crumb: "How LENS works",
  },
  {
    path: "/first-visit",
    title: "Your First Visit",
    description:
      "No clipboard queue, no waiting-room limbo, no surprises. The first visit at Harmonized Brain Centers, minute by minute, for adults and for children.",
    dateModified: "2026-10-10",
    type: "WebPage",
    crumb: "Your first visit",
  },
  {
    path: "/about",
    title: "About",
    // 154 chars with the count. The brand name is not led with — the title
    // template already carries it. The count interpolates, gated: an
    // unverified figure drops the clause, not the sentence.
    description:
      "A team of trained LENS practitioners serving adults, children, and families across Middle Tennessee — one care model, multiple centers" +
      (sessionCount ? `, ${sessionCount} sessions.` : "."),
    dateModified: "2026-10-10",
    type: "AboutPage",
    crumb: "About",
  },
  {
    path: "/about/founder",
    title: "Our Founder",
    description: `${FOUNDER_DISPLAY_NAME}, Founder & Clinical Director — the clinical standard behind every Harmonized practitioner, and the reason we ask how you actually feel.`,
    dateModified: "2026-09-01",
    type: "ProfilePage",
    crumb: "Our founder",
  },
  {
    path: "/about/team",
    title: "Our Team",
    description:
      "Every Harmonized practitioner completes the same LENS training and works from the same care model. Here's who you'll meet.",
    dateModified: "2026-09-01",
    type: "CollectionPage",
    crumb: "Our team",
  },
  {
    path: "/locations",
    title: "Locations",
    description:
      "Every Harmonized center runs the same care model, the same training, and the same honest policies. Nashville, Murfreesboro, and Franklin (coming soon).",
    dateModified: "2026-09-01",
    type: "CollectionPage",
    crumb: "Locations",
  },
  {
    path: "/stories",
    title: "Client Stories",
    description:
      "No miracle stories — just the specific, daily-life changes clients report at check-in. Individual experiences vary, and we'd rather understate than oversell.",
    dateModified: "2026-09-01",
    type: "WebPage",
    crumb: "Client stories",
  },
  {
    path: "/faq",
    title: "FAQ",
    // 149 chars: the topics the fourteen answers actually cover.
    description:
      "Every question about LENS neurofeedback, answered plainly — cost, sessions, safety, children, insurance, and the ones people are hesitant to ask.",
    dateModified: "2026-10-10",
    type: "FAQPage",
    crumb: "FAQ",
  },
  {
    path: "/contact",
    title: "Talk With Our Team",
    // 148 chars: the two centers and the no-referral fact.
    description:
      "Tell us what's going on. A free, no-pressure conversation with a real person from your nearest center — Nashville or Murfreesboro. No referral needed.",
    dateModified: "2026-10-10",
    type: "ContactPage",
    crumb: "Contact",
  },
  {
    path: "/resources",
    title: "Resources",
    description:
      "Plain-language guides for parents and adults — written by our practitioners, reviewed against our no-hype standard.",
    dateModified: "2026-08-23",
    type: "CollectionPage",
    crumb: "Resources",
  },
  {
    path: "/privacy-policy",
    title: "Privacy",
    description:
      "What the Harmonized Brain Centers website collects, what happens to it, and who else sees it. Nothing you tell us goes anywhere unless you ask us to send it.",
    dateModified: "2026-08-24",
    type: "WebPage",
    crumb: "Privacy",
  },
];

/**
 * The breadcrumb for a hub or utility page one level deep: "Home / Locations".
 * Eleven such routes rendered no crumb at all, visible or marked up — the
 * SERP's URL slot shows a breadcrumb where one exists (SEO-AUDIT-3 §3.3).
 */
export function hubTrail(path: string): Crumb[] {
  return [{ label: "Home", href: "/" }, { label: getStaticPage(path).crumb }];
}

export function getStaticPage(path: string): StaticPage {
  const page = staticPages.find((p) => p.path === path);
  if (!page) throw new Error(`lib/pages.ts has no record for ${path}`);
  return page;
}

/**
 * A page's `metadata` export, from its record. Title and description only —
 * the canonical and Open Graph set come from the root layout, and a route
 * that needs more (an article's `openGraph.type`) spreads this and adds it.
 */
export function pageMetadata(path: string): Metadata {
  const page = getStaticPage(path);
  return {
    title: page.absoluteTitle ? { absolute: page.title } : page.title,
    description: page.description,
  };
}

/** The <title> as the browser shows it, for the WebPage node's `name`. */
export function renderedTitle(page: StaticPage, siteName: string): string {
  return page.absoluteTitle ? page.title : `${page.title} — ${siteName}`;
}
