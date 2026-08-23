import type { Metadata } from "next";
import Link from "next/link";
import FinalCTA from "@/components/FinalCTA";
import { Btn } from "@/components/Buttons";

export const metadata: Metadata = {
  title: "Page not found",
  // No description. There is nothing here to summarise for a search result,
  // and the page is noindex anyway — Next emits that for not-found routes.
};

/**
 * The 404.
 *
 * Next's default already renders inside the site chrome and already emits
 * `noindex`, so this is not fixing a correctness problem. It matters because
 * of what is about to land on it: roughly 108 legacy WordPress URLs, only four
 * of which share a path with this build, arriving the moment DNS moves
 * (SEO-AUDIT-2.md §2.6). Until every redirect in that map is in place, this
 * page is what a person following a two-year-old link from their doctor's
 * email actually sees — and a bare "404" is where that person stops.
 *
 * So it is a routing page, not an apology. The four destinations below are the
 * ones the legacy URL set mostly maps onto: a concern, a service explanation,
 * a location, and the way to reach a human.
 */
export default function NotFound() {
  return (
    <>
      <section className="page-hero center">
        <div className="wrap rv">
          <div className="eyebrow">Page not found</div>
          <h1>That page isn&rsquo;t here.</h1>
          <p className="sub" style={{ maxWidth: "54ch" }}>
            The link may be old, or the address may have a typo in it.
            Here&rsquo;s where most people are heading.
          </p>
          <div
            className="hero-ctas"
            style={{ marginTop: 34, justifyContent: "center" }}
          >
            <Btn href="/what-we-help-with" variant="ghost" arrow>
              What we help with
            </Btn>
            <Btn href="/lens-neurofeedback" variant="ghost" arrow>
              What LENS is
            </Btn>
            <Btn href="/locations" variant="ghost" arrow>
              Our locations
            </Btn>
            <Btn href="/contact" variant="ghost" arrow>
              Talk to us
            </Btn>
          </div>
          <p className="micro">
            Or start from the <Link href="/">homepage</Link>.
          </p>
        </div>
      </section>

      <FinalCTA />
    </>
  );
}
