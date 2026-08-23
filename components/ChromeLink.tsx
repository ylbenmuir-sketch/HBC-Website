import Link from "next/link";
import type { ComponentProps } from "react";

/**
 * A `<Link>` for the header and footer, with viewport prefetching off.
 *
 * Next prefetches every `<Link>` that enters the viewport, and this site's
 * chrome puts 36 of them on every page — a mega-menu with 27 entries plus a
 * 21-link footer. The homepage fired **13 `?_rsc=` prefetches totalling about
 * 80 kB** between 2,336 ms and 2,829 ms, on a throttled mobile connection,
 * competing with the render of the page the visitor is actually on
 * (SEO-AUDIT-2.md §2.1).
 *
 * `prefetch={false}` turns off the *viewport* prefetch, not the hover one:
 * pointing at a nav link still warms it, so the navigation a visitor is about
 * to make is as fast as it was. What stops is downloading 27 routes nobody
 * asked for because a menu happened to be on screen.
 *
 * In-content links keep their prefetch. Those are the links a reader is
 * actually choosing between, there are a handful per page, and they are the
 * ones this site wants to feel instant.
 */
export default function ChromeLink(props: ComponentProps<typeof Link>) {
  return <Link prefetch={false} {...props} />;
}
