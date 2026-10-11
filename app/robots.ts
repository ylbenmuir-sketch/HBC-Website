import type { MetadataRoute } from "next";
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
 * training crawlers (GPTBot, CCBot, Bytespider, anthropic-ai) are the open
 * question: being in the model is a marketing outcome for a practice whose
 * content is marketing, and that is the default taken here (SEO-AUDIT-3
 * §5.1, A11, P8). **This is a default, not Ben's decision** — he has not
 * said yes or no to the training half. To say no, move those four names to
 * a rule of their own with `disallow: "/"`.
 */
const DISALLOW = ["/api/", "/guides/"];

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

/** Training-only crawlers. Allowed by default — see the note above. */
const TRAINING_AGENTS = ["GPTBot", "CCBot", "Bytespider", "anthropic-ai"];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      { userAgent: SEARCH_AND_ANSWER_AGENTS, allow: "/", disallow: DISALLOW },
      { userAgent: TRAINING_AGENTS, allow: "/", disallow: DISALLOW },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
