/**
 * Shared types for the site assistant's retrieval layer (phase-8-chatbot.md §2).
 *
 * A Passage is a unit of *published* site copy. The assistant answers from
 * these and from nothing else — no model knowledge, no inference past what the
 * passage says — so the two rules that matter here are:
 *
 * 1. `text` is copy that ships. Anything still behind a Verifiable or carrying
 *    a [bracketed] note is excluded when the index is built, in every
 *    environment. A page can render an unverified value behind a gold
 *    [CONFIRM] tag; a conversation has nowhere to put one, so the assistant
 *    simply does not know those facts. See lib/chat/content-index.ts.
 * 2. `href` is the page an answer drawing on this passage should offer (§2).
 *    Usually the page the copy is published on; for homepage copy it is the
 *    deeper page the homepage itself points at, because handing someone the
 *    homepage answers nothing. Null only for copy that belongs to no single
 *    page — the footer disclaimer.
 */

export type PassageKind =
  | "concern"
  | "concern-faq"
  | "faq"
  | "location"
  | "page"
  | "policy";

export type Passage = {
  /** Stable id, `kind:subject:part` — used for dedupe and for logging. */
  id: string;
  kind: PassageKind;
  /** Human label for the subject, e.g. "Sleep difficulties". */
  title: string;
  /** Page to offer alongside an answer; null for sitewide copy. */
  href: string | null;
  /** The visitor-facing question this passage answers, when it is a Q&A. */
  question?: string;
  /**
   * Routing hints — words a visitor is likely to use that the copy itself does
   * not contain ("price" for copy that says "cost", "address" for a page that
   * just prints one). They are matched against, never shown to a visitor and
   * never quoted back as content.
   */
  keywords?: string[];
  /** Published copy, plain text. Never paraphrased. */
  text: string;
};
