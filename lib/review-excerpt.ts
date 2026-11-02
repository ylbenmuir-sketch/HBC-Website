/**
 * The short excerpt of a review for the compact card at the top of a concern
 * page (Ben, 2026-11-02; components/CompactReview.tsx): the first one or two
 * sentences of the full quote, never more than MAX_EXCERPT characters, cut
 * only at a sentence boundary, the words exactly as written. When the
 * excerpt stops short of the whole quote it ends in "…" (a closing full stop
 * gives way to it; "!" and "?" stay). A quote that already opens with "…"
 * keeps it — that is how the review was supplied.
 */
export const MAX_EXCERPT = 160;
export const MAX_EXCERPT_SENTENCES = 2;

/** Split on the whitespace after a full stop, "!" or "?". */
export function splitSentences(text: string): string[] {
  return text
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);
}

export function reviewExcerpt(
  text: string,
  max = MAX_EXCERPT,
  maxSentences = MAX_EXCERPT_SENTENCES,
): string {
  const sentences = splitSentences(text);
  const taken: string[] = [];
  for (const s of sentences) {
    if (taken.length >= maxSentences) break;
    const candidate = [...taken, s].join(" ");
    if (taken.length > 0 && candidate.length > max) break;
    taken.push(s);
  }
  const excerpt = taken.join(" ");
  if (excerpt === text.trim()) return excerpt;
  return excerpt.replace(/\.$/, "") + "…";
}
