"use client";

import type { ReactNode } from "react";
import { reviewLinkEvent, trackEvent, type ReviewCenter } from "@/lib/analytics";

/**
 * One of /review's two buttons: a plain link to the center's Google
 * "write a review" page, in a new tab, that reports review_link_click with
 * the center on the way out (lib/analytics.ts). The link is a link —
 * measurement never gates it.
 */
export default function ReviewLinkButton({
  href,
  center,
  children,
}: {
  href: string;
  center: ReviewCenter;
  children: ReactNode;
}) {
  return (
    <a
      className="btn btn-primary review-btn"
      href={href}
      target="_blank"
      rel="noopener"
      onClick={() => trackEvent(reviewLinkEvent(center))}
    >
      {children}
    </a>
  );
}
