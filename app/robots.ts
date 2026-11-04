import type { MetadataRoute } from "next";
import { tenYearsPublic } from "@/lib/giveaway/showcase";
import { SITE_URL } from "@/lib/site-config";

/**
 * `/guides/` is disallowed, and the HTML guide carries `noindex` of its own.
 *
 * public/guides/ holds the lead magnet — 1,778 words of chrome-less copy plus
 * the PDF, at a public path, linked from nowhere and absent from the sitemap.
 * An indexed copy would compete with the concern pages it was written to
 * support and would give away the thing GuideCta's email gate exists to trade
 * for. The two measures cover different halves: the meta tag is what a crawler
 * that already has the URL obeys, and this line is what stops it fetching the
 * PDF, which cannot carry a meta tag at all.
 *
 * ## AI crawlers — allowed, all of them, by default rather than by decision
 *
 * The named agents below get the same answer as everyone else: the whole
 * site except /api/ and /guides/. They are named so the policy is a policy —
 * a robots.txt that says nothing about GPTBot admits it by omission, and the
 * next person to read this file should see that somebody chose.
 *
 * Two groups, deliberately both allowed. The search and answer agents
 * (OAI-SearchBot, ChatGPT-User, PerplexityBot, ClaudeBot, Claude-SearchBot,
 * Google-Extended, Applebot-Extended, Amazonbot, Meta-ExternalAgent) are how
 * "neurofeedback near Nashville" gets answered in ChatGPT, Perplexity, Gemini
 * grounding and the rest; blocking them is leaving the room. The pure
 * training crawlers (GPTBot, CCBot, Bytespider, anthropic-ai) are allowed
 * too: being in the model is a marketing outcome for a practice whose
 * content is marketing (SEO-AUDIT-3 §5.1, A11, P8). **Confirmed by Ben,
 * Oct 2026** — this is a decision, not a default. To reverse it, move
 * those four names to a rule of their own with `disallow: "/"`.
 */
/** `/admin/` (2026-10-18): the giveaway's staff screens, behind a login and
 *  `noindex`; nothing there is for a crawler. `/unsubscribe` is NOT listed:
 *  it is noindex via header and absent from the sitemap, and a disallow
 *  would only hide the noindex from the crawler that already has the URL. */
/** `/10years` (2026-10-19): the giveaway page is live as a HIDDEN page —
 *  anyone with the link sees it, nobody finds it. Disallowed here as a
 *  prefix (the sub-routes go with it) UNTIL tenYearsPublic(): the engine on
 *  and the clock at Nov 9 (fix list rev 2, P0-6). From then /10years and
 *  /10years/rules are crawlable and every token route stays disallowed,
 *  listed one by one. `/unsubscribe` stays off the list for the reason
 *  above. */
const BASE_DISALLOW = ["/api/", "/guides/", "/admin/", "/about/founder/draft"];
export const TEN_YEARS_TOKEN_ROUTES = ["/10years/enter/", "/10years/verify", "/10years/signup"];

/** Answered per request, so the flip at Mon Nov 9 12:00 AM CT is exact and
 *  needs no deploy (and the giveaway's fake clock moves it in a test run). */
export const dynamic = "force-dynamic";

export function disallowFor(now?: Date, env?: Record<string, string | undefined>): string[] {
  return tenYearsPublic(now, env) ? [...BASE_DISALLOW, ...TEN_YEARS_TOKEN_ROUTES] : [...BASE_DISALLOW, "/10years"];
}

const SEARCH_AND_ANSWER_AGENTS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "Google-Extended",
  "Applebot-Extended",
  "Amazonbot",
  "Meta-ExternalAgent",
];

/** Training-only crawlers. Allowed — Ben's decision, Oct 2026; see above. */
const TRAINING_AGENTS = ["GPTBot", "CCBot", "Bytespider", "anthropic-ai"];

export default function robots(): MetadataRoute.Robots {
  const DISALLOW = disallowFor();
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      { userAgent: SEARCH_AND_ANSWER_AGENTS, allow: "/", disallow: DISALLOW },
      { userAgent: TRAINING_AGENTS, allow: "/", disallow: DISALLOW },
    ],
    // The video sitemap (2026-10-20) lists each watch page with its video;
    // sitemap.xml lists the same pages as pages.
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/video-sitemap.xml`],
  };
}
