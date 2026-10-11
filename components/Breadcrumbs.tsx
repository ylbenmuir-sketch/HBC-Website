import Link from "next/link";
import type { Crumb } from "@/lib/schema";

/**
 * The visible breadcrumb. Its BreadcrumbList markup is built by <PageSchema>
 * from the SAME `trail` array the page passes here — one constant in the
 * page file, two consumers — so the two cannot disagree, which is the thing
 * Google checks for. Adding a rung, renaming one, or reordering them lands
 * on both at once.
 *
 * Hub pages one level deep start at Home ("Home / Locations"); section pages
 * start at their hub ("What We Help With / Sleep difficulties"), which is
 * what the crumb has always displayed there. The last rung is the current
 * page and carries no href.
 *
 * Markup: `<nav aria-label="Breadcrumb"><ol>` with `aria-current="page"` on
 * the last rung, which is the pattern assistive technology announces as a
 * breadcrumb rather than as a run of links (SEO-AUDIT-3 §6). The separator
 * is drawn by CSS (`.crumb li + li::before`), so it is not read aloud and
 * not part of the link text. Links are underlined — see the `.crumb` rules.
 */
export default function Breadcrumbs({ trail }: { trail: readonly Crumb[] }) {
  return (
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
  );
}
