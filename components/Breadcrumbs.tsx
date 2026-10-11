import Link from "next/link";
import JsonLd from "./JsonLd";
import { breadcrumbSchema, type Crumb } from "@/lib/schema";

/**
 * The visible breadcrumb and its BreadcrumbList markup, from one array.
 *
 * They are deliberately not separable: Google checks that breadcrumb markup
 * matches what the page shows, and the surest way to keep them matching is to
 * give them no way to disagree. Adding a rung, renaming one, or reordering
 * them lands on both at once.
 *
 * The trail starts at the section hub, not at Home — that is what the crumb
 * has always displayed, and the markup mirrors the page rather than
 * embellishing it. The last rung is the current page and carries no href,
 * which is both the existing visual treatment and valid BreadcrumbList.
 *
 * Markup: `<nav aria-label="Breadcrumb"><ol>` with `aria-current="page"` on
 * the last rung, which is the pattern assistive technology announces as a
 * breadcrumb rather than as a run of links (SEO-AUDIT-3 §6). The separator
 * is drawn by CSS (`.crumb li + li::before`), so it is not read aloud and
 * not part of the link text. Links are underlined — see the `.crumb` rules.
 */
export default function Breadcrumbs({ trail }: { trail: readonly Crumb[] }) {
  return (
    <>
      <JsonLd data={breadcrumbSchema(trail)} />
      <nav aria-label="Breadcrumb" className="wrap crumb">
        <ol>
          {trail.map((c, i) => {
            const last = i === trail.length - 1;
            return (
              <li key={`${i}-${c.label}`} aria-current={last ? "page" : undefined}>
                {c.href && !last ? <Link href={c.href}>{c.label}</Link> : c.label}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
