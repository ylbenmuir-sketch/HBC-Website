import { Fragment } from "react";
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
 */

/**
 * The separator these crumbs were hand-written with: a space, then
 * `&nbsp;/&nbsp;`, then a space. Written as escapes so the two
 * non-breaking spaces stay visible in source and survive reformatting.
 */
const SEPARATOR = " \u00a0/\u00a0 ";

export default function Breadcrumbs({ trail }: { trail: readonly Crumb[] }) {
  return (
    <>
      <JsonLd data={breadcrumbSchema(trail)} />
      <div className="wrap crumb">
        {trail.map((c, i) => (
          <Fragment key={`${i}-${c.label}`}>
            {i > 0 && SEPARATOR}
            {c.href ? <Link href={c.href}>{c.label}</Link> : c.label}
          </Fragment>
        ))}
      </div>
    </>
  );
}
