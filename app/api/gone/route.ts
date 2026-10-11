/**
 * 410 Gone, for legacy WordPress URLs the redirect map retires on purpose.
 *
 * `redirects()` in next.config.ts can only answer 301/302/307/308, so the
 * rows QUERY-TO-PAGE-MAP.md marks "410 Gone" (`/vibro-acoustic-chair/`,
 * approved by Ben, Aug 2026) are *rewritten* here instead — the visitor's
 * URL stays what they typed and the status says the page is deliberately
 * gone, which Google drops from the index faster than a 404 it reads as a
 * mistake. The body is a plain sentence, not the site chrome: a page that
 * says "gone" and then offers forty links is a 404 with a different number.
 *
 * `/api/` is disallowed in robots.txt; that is fine — this path is never the
 * public URL, only the rewrite's internal destination.
 */
export const dynamic = "force-static";

export function GET() {
  return new Response(
    "This page has been removed and is not coming back. Harmonized Brain Centers: https://harmonizedbraincenterstn.com/\n",
    {
      status: 410,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Robots-Tag": "noindex",
      },
    }
  );
}
