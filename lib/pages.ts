import type { Metadata } from "next";
import type { Crumb } from "./schema";
import {
  CONCIERGE_SURCHARGE_USD,
  FOUNDER_DISPLAY_NAME,
  STAT_SESSIONS,
  usd,
  verifiedOr,
} from "./site-config";

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
      "LENS neurofeedback in Nashville & Murfreesboro: help for anxiety, focus, and sleep — without medication. Your first visit starts with a Brain Map.",
    dateModified: "2026-10-19",
    type: "WebPage",
    crumb: "Home",
  },
  {
    path: "/what-we-help-with",
    title: "What We Help With",
    description:
      "The concerns that most often bring adults and children to Harmonized Brain Centers — described the way real families describe them. No diagnosis needed.",
    dateModified: "2026-10-11",
    type: "CollectionPage",
    crumb: "What We Help With",
  },
  {
    path: "/adults",
    title: "Neurofeedback for Adults",
    // 156 chars. "and resilience" is what went: the list was running past
    // 160, and /concerns/stress-resilience is the page that owns that word.
    description:
      "LENS neurofeedback for adults — anxiety and stress, focus, sleep, brain fog, and emotional regulation. Short sessions, nothing to practice, no homework.",
    dateModified: "2026-10-12",
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
      "LENS neurofeedback for children and teens — homework battles, meltdowns, hard transitions, sensory overwhelm. Nothing a child has to get right.",
    dateModified: "2026-10-20",
    type: "CollectionPage",
    crumb: "Children & families",
  },
  {
    path: "/lens-neurofeedback",
    title: "LENS Neurofeedback",
    description:
      "LENS — the Low Energy Neurofeedback System — passive, brief sessions with nothing to practice, at our Nashville and Murfreesboro centers. What it is, and who it's for.",
    dateModified: "2026-10-20",
    type: "WebPage",
    crumb: "LENS neurofeedback",
  },
  {
    path: "/how-lens-works",
    title: "How LENS Neurofeedback Works",
    description:
      "LENS stands for Low Energy Neurofeedback System. The whole idea without the jargon — and exactly what a session feels like from the chair.",
    // New opening (shift gears / stuck / where LENS fits) and the sample
    // brain map in the photo row, 2026-10-16.
    dateModified: "2026-10-20",
    type: "WebPage",
    crumb: "How LENS works",
  },
  {
    path: "/brain-map",
    // Absolute, like the concern titles: the brand suffix would put it past
    // 60, and a title that opens on the category identifies itself. "Brain
    // Map" and "EEG Recording" are the two phrasings the cluster searches
    // with (brain map / qEEG / EEG — QUERY-TO-PAGE-MAP.md); "qEEG" stays in
    // the body, as a word people search rather than a thing we call ours.
    // 57 chars.
    title: "Brain Map & EEG Recording in Nashville & Murfreesboro, TN",
    absoluteTitle: true,
    // 158 chars. The boundary leads — "a recording, not a test" is the rule
    // the page is written under, and the one sentence that must survive
    // truncation.
    description:
      "The Harmonized Brain Map is a 21-point recording of brain activity — a recording that guides a plan, not a test. What it involves, what it costs, and what it can't tell you.",
    dateModified: "2026-10-13",
    type: "WebPage",
    crumb: "The Brain Map",
  },
  {
    path: "/first-visit",
    title: "Your First Visit",
    description:
      "No clipboard queue, no waiting-room limbo, no surprises. The first visit at Harmonized Brain Centers, minute by minute, for adults and for children.",
    dateModified: "2026-10-20",
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
    // The concierge band links to /concierge now.
    dateModified: "2026-10-13",
    type: "CollectionPage",
    crumb: "Locations",
  },
  {
    path: "/concierge",
    // The three queries the page is built to own — mobile, in-home,
    // neurofeedback — and the service's name. Absolute; 60 chars exactly.
    title: "Concierge LENS: In-Home & Mobile Neurofeedback, Nashville TN",
    absoluteTitle: true,
    // The founder, the price rule, the family framing. Interpolates the
    // surcharge so the description cannot disagree with the page.
    description: `Our founder brings LENS neurofeedback to your home or business — center rates plus ${usd(CONCIERGE_SURCHARGE_USD)} per person, per session, for one person or the whole family in one visit.`,
    dateModified: "2026-10-11",
    type: "WebPage",
    crumb: "Concierge",
  },
  {
    path: "/stories",
    title: "Client Stories",
    description:
      "No miracle stories — just the specific, daily-life changes clients report at check-in. Individual experiences vary, and we'd rather understate than oversell.",
    dateModified: "2026-10-20",
    type: "WebPage",
    crumb: "Client stories",
  },
  {
    path: "/faq",
    title: "FAQ",
    // 149 chars: the topics the fourteen answers actually cover.
    description:
      "Every question about LENS neurofeedback, answered plainly — cost, sessions, safety, children, insurance, and the ones people are hesitant to ask.",
    dateModified: "2026-10-20",
    type: "FAQPage",
    crumb: "FAQ",
  },
  {
    path: "/is-lens-safe",
    // The skepticism cluster's own words — safe, legit, worth it — as the
    // question the page answers. Absolute: the brand suffix would put it
    // past 60. 57 chars.
    title: "Is LENS Neurofeedback Safe, Legit, or Worth It? Middle TN",
    absoluteTitle: true,
    // 157 chars. The four sections, in order, and the posture: disclosure.
    description:
      "What we can and can't tell you about LENS: what the signal is, what a session feels like, what this site refuses to claim, and where the public Google reviews are.",
    dateModified: "2026-10-11",
    type: "FAQPage",
    crumb: "Is LENS safe?",
  },
  {
    path: "/contact",
    title: "Talk With Our Team",
    // The H1's ask, the two centers and the no-referral fact (2026-10-26).
    description:
      "Let’s get you started. Send your name and a phone number or email, and someone from our Nashville or Murfreesboro center reaches out. No referral needed.",
    dateModified: "2026-10-26",
    type: "ContactPage",
    crumb: "Contact",
  },
  {
    path: "/resources",
    title: "Resources",
    description:
      "Plain-language guides for parents and adults — written by our practitioners, reviewed against our no-hype standard.",
    dateModified: "2026-10-20",
    type: "CollectionPage",
    crumb: "Resources",
  },
  {
    // The video hub (VIDEO-MAP.md). Each video's own page is
    // /videos/<slug>, built from lib/videos.ts, and dated there.
    path: "/videos",
    title: "Videos: LENS Neurofeedback, Explained",
    description:
      "Client stories, short answers about LENS neurofeedback, and The Hopeful Brain conversations — videos from Harmonized Brain Centers in Nashville & Murfreesboro.",
    dateModified: "2026-10-20",
    type: "CollectionPage",
    crumb: "Videos",
  },
  {
    path: "/privacy-policy",
    title: "Privacy",
    description:
      "We don’t sell what you tell us, and we never share it with anyone for their marketing. Your phone number and text-message consent are never shared with third parties.",
    // 2026-10-15: rewritten from the code — every field, every service, the
    // emails, the assistant's session, YouTube, the two carrier sentences.
    // 2026-10-18: every consent-conditioned sharing clause removed (Dialpad's
    // A2P scan rejects them; see INFORMATION_SHARING).
    dateModified: "2026-10-18",
    type: "WebPage",
    crumb: "Privacy",
  },
  {
    // The 10-year giveaway (GIVEAWAY-PLAN.md). A HIDDEN page (Ben,
    // 2026-10-19): noindex, disallowed in robots.txt, never in the sitemap
    // (app/sitemap.ts), linked from nowhere. Registered here for its title,
    // description and WebPage node only.
    path: "/10years",
    title: "Ten Years of Harmonized Brain Centers",
    description:
      "Ten years of Harmonized Brain Centers: a week of drawings for Tennessee residents, one tap to enter them all, and a free first visit for everyone who enters.",
    dateModified: "2026-10-18",
    type: "WebPage",
    crumb: "Ten years",
  },
  {
    // The text-message program's terms — what a carrier reviewer follows from
    // every opt-in (lib/sms-consent.ts). Indexed and in the sitemap on
    // purpose: a reviewer with no account has to be able to find it.
    path: "/sms-terms",
    title: "Text Message Terms",
    description:
      "How Harmonized Brain Centers texts you about your call and appointments: what the messages are, how often, what they cost, and how to get help or stop them.",
    dateModified: "2026-10-14",
    type: "WebPage",
    crumb: "Text message terms",
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
